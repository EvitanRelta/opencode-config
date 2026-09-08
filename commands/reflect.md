---
description: Reflect on conversation to extract preferences
---

Do not call any tools. This is a retrospective to collect learning points for updating AGENTS.md/instructions/system-reminder.

# Audit
Review our full conversation for these:
- Compare your behavior thus far with my corrections, decisions, and approvals. Identify where my demonstrated preferences differed from your initial behavior or were not adequately conveyed by the existing AGENTS.md/instructions/system-reminder.
- Retroactively identify frequent drifts from existing AGENTS.md/instructions/system-reminder in your behavior. This isn't meant to penalize you, but rather to figure out how we can better encourage adherence from future agents.
- Critique on the performance of the subagent tiers. Did `junior` subagent performed better/worse than what your instructions suggested? Could some of the work given to `general` have been given to a `junior` instead? Should some work have been escalated to a `general` or `senior-general` from the start? How could the instructions be updated to better align future orchestrators' expectations to your experience with said subagents?

## Filter and prioritize
List learning points, rank them by importance and return no more than 10. Omit anything already adequately covered, combine overlapping points, and avoid points that are too specific to a project/task.

Generalize preferences into portable rules that apply across projects and tasks. Recommend durable preferences and repository conventions. DO NOT encode one-off implementation details or transient project details.

## Recommendations
Tell me your critique of subagent performance first, then list the learning points.

For each point, provide:
1. **Instruction to update** — Whether recommendation is for AGENTS.md, instructions or system-reminder.
2. **Learning point** — what you learned about my preference, your behavior or the subagents.
3. **Existing instruction** — the relevant current wording, or `None`.
4. **Gap** — one concise sentence explaining what is missing or ineffective.
5. **Recommended text** — a concise, paste-ready addition or replacement using authoritative, all-caps wording such as `DO NOT`, similar to the existing instructions.

When existing wording is partially correct, recommend a replacement rather than adding another overlapping rule. Be candid, concise, and specific.
