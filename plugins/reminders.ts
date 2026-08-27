import type { Plugin } from "@opencode-ai/plugin"
import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseDocument } from "yaml"

type Reminder = {
  filename: string
  body: string
  agents?: Set<string>
  frequency: number
  identity: string
}

const remindersPlugin: Plugin = async ({ client, directory }) => {
  let configDirectory: string
  if (process.env.OPENCODE_CONFIG_DIR) {
    configDirectory = path.resolve(process.env.OPENCODE_CONFIG_DIR)
  } else {
    try {
      configDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
    } catch {
      const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
      configDirectory = path.join(configHome, "opencode")
    }
  }

  const reminderDirectory = path.join(configDirectory, "reminders")
  let filenames: string[]
  try {
    filenames = (await readdir(reminderDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort()
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") filenames = []
    else {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`${reminderDirectory}: unable to discover reminders: ${reason}`)
    }
  }

  const reminders: Reminder[] = []
  for (const filename of filenames) {
    const filepath = path.join(reminderDirectory, filename)
    let source: string
    try {
      source = await readFile(filepath, "utf8")
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`${filepath}: unable to read reminder: ${reason}`)
    }

    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/)
    if (!match) throw new Error(`${filepath}: expected YAML frontmatter delimited by ---`)

    let frontmatter: unknown
    try {
      const document = parseDocument(match[1], { uniqueKeys: true })
      if (document.errors.length > 0) throw document.errors[0]
      if (document.warnings.length > 0) throw document.warnings[0]
      frontmatter = document.toJS()
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`${filepath}: invalid YAML frontmatter: ${reason}`)
    }

    if (frontmatter === null || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
      throw new Error(`${filepath}: frontmatter must be a mapping`)
    }
    const fields = frontmatter as Record<string, unknown>
    const unknown = Object.keys(fields).filter(
      (field) => !["description", "agent", "reminderFrequency"].includes(field),
    )
    if (unknown.length > 0) throw new Error(`${filepath}: unknown frontmatter field "${unknown[0]}"`)
    if (typeof fields.description !== "string" || fields.description.trim().length === 0) {
      throw new Error(`${filepath}: description must be a non-empty string`)
    }

    let agents: Set<string> | undefined
    if (fields.agent !== undefined) {
      if (
        !Array.isArray(fields.agent) ||
        fields.agent.length === 0 ||
        fields.agent.some((agent) => typeof agent !== "string" || agent.trim().length === 0)
      ) {
        throw new Error(`${filepath}: agent must be a non-empty list of non-empty strings`)
      }
      agents = new Set(fields.agent as string[])
      if (agents.size !== fields.agent.length) throw new Error(`${filepath}: agent contains a duplicate name`)
    }

    const frequency = fields.reminderFrequency ?? 1
    if (typeof frequency !== "number" || !Number.isInteger(frequency) || frequency < 1) {
      throw new Error(`${filepath}: reminderFrequency must be an integer greater than or equal to 1`)
    }

    const body = match[2].trim()
    if (body.length === 0) throw new Error(`${filepath}: markdown body must not be empty`)
    const identity = createHash("sha256")
      .update(
        JSON.stringify({
          filename,
          description: fields.description,
          agents: agents ? [...agents].sort() : null,
          frequency,
          body,
        }),
      )
      .digest("hex")
    reminders.push({ filename, body, agents, frequency, identity })
  }

  return {
    "experimental.chat.messages.transform": async (_input, output) => {
      if (reminders.length === 0 || output.messages.length === 0) return

      // Match MessageV2.latest(): compacted model history is not necessarily in chronological array order.
      let activeUser: Extract<(typeof output.messages)[number]["info"], { role: "user" }> | undefined
      for (const message of output.messages) {
        if (message.info.role !== "user") continue
        if (
          !activeUser ||
          message.info.time.created > activeUser.time.created ||
          (message.info.time.created === activeUser.time.created && message.info.id > activeUser.id)
        ) {
          activeUser = message.info
        }
      }
      if (!activeUser) return

      const sessionID = activeUser.sessionID
      const snapshotIDs = new Set(output.messages.map((message) => message.info.id))

      const response = await client.session.messages({
        path: { id: sessionID },
        query: { directory },
        throwOnError: true,
      })
      const history = response.data

      // Overflow compaction may replay the original prompt without a synthetic marker.
      const replayUsers = new Set<string>()
      for (let index = 1; index < history.length; index++) {
        const message = history[index]
        const previous = history[index - 1]
        if (message.info.role !== "user" || previous.info.role !== "assistant" || previous.info.summary !== true) {
          continue
        }
        const compaction = history.find((candidate) => candidate.info.id === previous.info.parentID)
        if (
          compaction?.info.role === "user" &&
          compaction.parts.some(
            (part) => part.type === "compaction" && "overflow" in part && part.overflow === true,
          )
        ) {
          replayUsers.add(message.info.id)
        }
      }

      const parentIndex = history.findIndex((message) => message.info.id === activeUser.id)
      if (parentIndex < 0) return
      const parent = history[parentIndex]
      if (
        parent.info.role !== "user" ||
        replayUsers.has(parent.info.id) ||
        parent.parts.some((part) => part.type === "compaction") ||
        !parent.parts.some((part) => !("synthetic" in part && part.synthetic === true))
      ) {
        return
      }

      // Normal inference persists a new assistant after taking the hook snapshot; compaction does not.
      const currentAgent = parent.info.agent
      const currentIndex = history.findLastIndex(
        (message, index) =>
          index > parentIndex &&
          !snapshotIDs.has(message.info.id) &&
          message.info.role === "assistant" &&
          message.info.parentID === parent.info.id &&
          message.info.mode === currentAgent &&
          message.info.time.completed === undefined &&
          message.info.summary !== true,
      )
      if (currentIndex < 0) return

      const current = history[currentIndex]
      if (current.info.role !== "assistant") return

      const boundedHistory = history.slice(0, currentIndex)
      const normalUsers = new Map<
        string,
        Extract<(typeof history)[number]["info"], { role: "user" }>
      >()
      for (const message of boundedHistory) {
        if (
          message.info.role === "user" &&
          !["compaction", "summary", "title"].includes(message.info.agent) &&
          !replayUsers.has(message.info.id) &&
          !message.parts.some((part) => part.type === "compaction") &&
          message.parts.some(
            (part) => part.type !== "subtask" && !("synthetic" in part && part.synthetic === true),
          )
        ) {
          normalUsers.set(message.info.id, message.info)
        }
      }

      const visibleBoundaryIDs = new Set(output.messages.map((message) => message.info.id))
      const activityCounts = new Map<string, number>()
      const activities: {
        boundary: (typeof boundedHistory)[number]
        activityAgent: string
        boundaryKind: "user" | "assistant"
        associatedUser: Extract<(typeof history)[number]["info"], { role: "user" }>
        boundaryTime: number
        due: { reminder: Reminder; ordinal: number }[]
      }[] = []
      for (const boundary of boundedHistory) {
        let activityAgent: string | undefined
        let boundaryKind: "user" | "assistant" | undefined
        let associatedUser: Extract<(typeof history)[number]["info"], { role: "user" }> | undefined
        let boundaryTime: number | undefined

        if (boundary.info.role === "user" && normalUsers.has(boundary.info.id)) {
          activityAgent = boundary.info.agent
          boundaryKind = "user"
          associatedUser = normalUsers.get(boundary.info.id)
          boundaryTime = boundary.info.time.created
        } else if (boundary.info.role === "assistant") {
          const candidateParent = normalUsers.get(boundary.info.parentID)
          if (
            candidateParent &&
            boundary.info.mode === candidateParent.agent &&
            boundary.info.time.completed !== undefined &&
            boundary.info.error === undefined &&
            boundary.info.summary !== true &&
            !["compaction", "summary", "title"].includes(boundary.info.mode) &&
            boundary.parts.some((part) => part.type === "step-finish") &&
            boundary.parts.some((part) => part.type === "tool")
          ) {
            activityAgent = candidateParent.agent
            boundaryKind = "assistant"
            associatedUser = candidateParent
            boundaryTime = boundary.info.time.completed
          }
        }

        if (!activityAgent || !boundaryKind || !associatedUser || boundaryTime === undefined) continue
        const activityCount = (activityCounts.get(activityAgent) ?? 0) + 1
        activityCounts.set(activityAgent, activityCount)

        const due = reminders.flatMap((reminder) => {
          if (reminder.agents && !reminder.agents.has(activityAgent)) return []
          if (activityCount % reminder.frequency !== 0) return []
          return [{ reminder, ordinal: activityCount / reminder.frequency }]
        })
        activities.push({
          boundary,
          activityAgent,
          boundaryKind,
          associatedUser,
          boundaryTime,
          due,
        })
      }

      const deliveries = new Map<
        string,
        {
          target: (typeof activities)[number]
          reminders: Map<
            string,
            {
              reminder: Reminder
              thresholds: { activityAgent: string; boundaryID: string; ordinal: number }[]
            }
          >
        }
      >()
      for (const activity of activities) {
        if (activity.due.length === 0) continue

        let delivery = deliveries.get(activity.boundary.info.id)
        if (!delivery) {
          delivery = { target: activity, reminders: new Map() }
          deliveries.set(activity.boundary.info.id, delivery)
        }
        for (const { reminder, ordinal } of activity.due) {
          let pending = delivery.reminders.get(reminder.identity)
          if (!pending) {
            pending = { reminder, thresholds: [] }
            delivery.reminders.set(reminder.identity, pending)
          }
          pending.thresholds.push({
            activityAgent: activity.activityAgent,
            boundaryID: activity.boundary.info.id,
            ordinal,
          })
        }
      }

      for (const { target: activity, reminders: pendingByReminder } of deliveries.values()) {
        const boundary = activity.boundary
        if (!visibleBoundaryIDs.has(boundary.info.id)) continue
        const pendingReminders = reminders.flatMap((reminder) => {
          const pending = pendingByReminder.get(reminder.identity)
          return pending ? [pending] : []
        })

        const targetIndex = output.messages.findIndex((message) => message.info.id === boundary.info.id)
        if (targetIndex < 0) continue

        if (activity.boundaryKind === "user") {
          const target = output.messages[targetIndex]
          for (const { reminder, thresholds } of pendingReminders) {
            const digest = createHash("sha256")
              .update(
                JSON.stringify({
                  sessionID,
                  boundaryID: boundary.info.id,
                  boundaryKind: activity.boundaryKind,
                  reminder: reminder.identity,
                  thresholds,
                }),
              )
              .digest("hex")
            const partID = `prt_${digest.slice(0, 26)}`
            if (target.parts.some((part) => part.id === partID)) continue
            const wrapped =
              reminder.body.startsWith("<system-reminder>") && reminder.body.endsWith("</system-reminder>")
                ? reminder.body
                : `<system-reminder>\n${reminder.body}\n</system-reminder>`
            target.parts.push({
              id: partID,
              sessionID,
              messageID: target.info.id,
              type: "text",
              text: wrapped,
              synthetic: true,
            })
          }
          continue
        }

        const messageDigest = createHash("sha256")
          .update(
            JSON.stringify({
              sessionID,
              boundaryID: boundary.info.id,
              boundaryKind: activity.boundaryKind,
              reminders: pendingReminders.map(({ reminder, thresholds }) => ({
                reminder: reminder.identity,
                thresholds,
              })),
            }),
          )
          .digest("hex")
        const messageID = `msg_${messageDigest.slice(0, 26)}`
        const existing = output.messages.find((message) => message.info.id === messageID)
        const synthetic: (typeof output.messages)[number] =
          existing ??
          ({
            info: {
              id: messageID,
              sessionID,
              role: "user" as const,
              time: { created: activity.boundaryTime },
              agent: activity.associatedUser.agent,
              model: activity.associatedUser.model,
            },
            parts: [],
          } satisfies (typeof output.messages)[number])

        for (const { reminder, thresholds } of pendingReminders) {
          const digest = createHash("sha256")
            .update(
              JSON.stringify({
                sessionID,
                boundaryID: boundary.info.id,
                boundaryKind: activity.boundaryKind,
                reminder: reminder.identity,
                thresholds,
              }),
            )
            .digest("hex")
          const partID = `prt_${digest.slice(0, 26)}`
          if (synthetic.parts.some((part) => part.id === partID)) continue
          const wrapped =
            reminder.body.startsWith("<system-reminder>") && reminder.body.endsWith("</system-reminder>")
              ? reminder.body
              : `<system-reminder>\n${reminder.body}\n</system-reminder>`
          synthetic.parts.push({
            id: partID,
            sessionID,
            messageID,
            type: "text",
            text: wrapped,
            synthetic: true,
          })
        }
        if (!existing) output.messages.splice(targetIndex + 1, 0, synthetic)
      }
    },
  }
}

export default remindersPlugin
