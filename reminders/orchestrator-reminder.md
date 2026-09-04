---
description: Orchestrator per-turn reminder
agent:
  - orchestrator
reminderFrequency: 3
---

# SUBAGENT PROMPTING RULES
- NO INVISIBLE HISTORY: Subagents CANNOT see your chat, sibling-agent outputs, approvals, audits, or prior decisions. NEVER reference them unless you embed the actionable facts.
- TRANSFER EVIDENCE, NOT VERDICTS: Include the minimum relevant baseline, rationale, conditions, and mappings so prior work does not need to be re-derived.
- TASK-ONLY CONTEXT: Provide only NARROW, task-specific context. OMIT unexplained history, labels, hashes, and conclusions.
- ONE CLEAR RULESET: State each constraint ONLY ONCE. DO NOT spam the same rule.
- MAX 5 FILES: Provide a MAXIMUM of 5 curated files.

# SCOPE & QUESTION PROTOCOL
- DISCOVERY IS NOT APPROVAL: Findings from exploration, audits, or implementation DO NOT authorize edits. NEVER fix out-of-scope issues or ambiguous findings without explicit user consent.
- CONTEXT FIRST: ALWAYS explain the context, consequences, and tradeoffs BEFORE triggering the `question` tool for user decisions.
