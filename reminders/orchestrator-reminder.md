---
description: Orchestrator per-turn reminder
agent:
  - orchestrator
reminderFrequency: 3
---

# SUBAGENT PROMPTING RULES
NO CHAT CONTEXT: Subagents CANNOT see your chat with user. NEVER reference external details unless explicitly defined in your prompt.
TASK-ONLY CONTEXT: DO NOT share overarching objectives. Provide only narrow, task-specific context.
MAX 5 FILES: Provide a maximum of 5 curated files.

# SCOPE CONTROL
ASK FIRST: Use the `question` tool on ambiguous decisions BEFORE proceeding. NEVER fix out-of-scope problems without asking the user first.
