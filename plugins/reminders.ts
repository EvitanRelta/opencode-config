import { Message } from "@opencode-ai/ai"
import { Plugin } from "@opencode-ai/plugin"
import type { SessionMessageInfo } from "@opencode-ai/client"
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

export default Plugin.define({
  id: "reminders",
  async setup(ctx) {
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
          agents: agents ? [...agents].sort() : null,
          frequency,
          body,
        }),
      )
      .digest("hex")
    reminders.push({ filename, body, agents, frequency, identity })
  }

    await ctx.session.hook("context", async (event) => {
      if (reminders.length === 0 || event.messages.length === 0) return

      const history: SessionMessageInfo[] = await ctx.session.context({ sessionID: event.sessionID })
      const firstSwitch = history.find(
        (entry): entry is Extract<SessionMessageInfo, { type: "agent-switched" }> =>
          entry.type === "agent-switched",
      )
      let activeAgent = firstSwitch?.previous ?? event.agent
      const activityCounts = new Map<string, number>()
      const deliveries: {
        boundaryID: string
        boundaryKind: "user" | "assistant"
        reminders: { reminder: Reminder; ordinal: number; activityAgent: string }[]
      }[] = []

      for (const boundary of history) {
        if (boundary.type === "agent-switched") {
          activeAgent = boundary.agent
          continue
        }

        let activityAgent: string | undefined
        let boundaryKind: "user" | "assistant" | undefined
        if (boundary.type === "user") {
          activityAgent = activeAgent
          boundaryKind = "user"
        } else if (boundary.type === "assistant") {
          const tools = boundary.content.filter((part) => part.type === "tool")
          if (
            boundary.finish !== undefined &&
            boundary.error === undefined &&
            boundary.retry === undefined &&
            tools.length > 0 &&
            tools.every((tool) => tool.state.status === "completed")
          ) {
            activityAgent = boundary.agent
            boundaryKind = "assistant"
          }
        }
        if (!activityAgent || !boundaryKind) continue

        const activityCount = (activityCounts.get(activityAgent) ?? 0) + 1
        activityCounts.set(activityAgent, activityCount)
        const due = reminders.flatMap((reminder) => {
          if (reminder.agents && !reminder.agents.has(activityAgent)) return []
          if (activityCount % reminder.frequency !== 0) return []
          return [{ reminder, ordinal: activityCount / reminder.frequency, activityAgent }]
        })
        if (due.length > 0) deliveries.push({ boundaryID: boundary.id, boundaryKind, reminders: due })
      }

      const positioned = deliveries.flatMap((delivery) => {
        let targetIndex = event.messages.findIndex((message) => message.id === delivery.boundaryID)
        if (targetIndex < 0) return []
        if (delivery.boundaryKind === "assistant") {
          while (event.messages[targetIndex + 1]?.role === "tool") targetIndex++
        }
        return [{ ...delivery, targetIndex }]
      })

      // Insert backwards so every durable-to-wire index remains valid during mutation.
      positioned.sort((left, right) => right.targetIndex - left.targetIndex)
      for (const delivery of positioned) {
        for (let index = delivery.reminders.length - 1; index >= 0; index--) {
          const { reminder, ordinal, activityAgent } = delivery.reminders[index]
          const digest = createHash("sha256")
            .update(
              JSON.stringify({
                sessionID: event.sessionID,
                boundaryID: delivery.boundaryID,
                boundaryKind: delivery.boundaryKind,
                reminder: reminder.identity,
                activityAgent,
                ordinal,
              }),
            )
            .digest("hex")
          const id = `reminder_${digest.slice(0, 26)}`
          if (event.messages.some((message) => message.id === id)) continue
          const wrapped =
            reminder.body.startsWith("<system-reminder>") && reminder.body.endsWith("</system-reminder>")
              ? reminder.body
              : `<system-reminder>\n${reminder.body}\n</system-reminder>`
          const message = {
            ...Message.user(wrapped),
            id,
            metadata: { reminder: reminder.identity, boundaryID: delivery.boundaryID, ordinal },
          }
          event.messages.splice(delivery.targetIndex + 1, 0, message)
        }
      }
    })
  },
})
