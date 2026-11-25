---
description: Same as the `general` agent, but more intelligent. Use this agent for harder, more nuanced tasks.
model: claude-agent/opus#high
mode: subagent
permissions:
    - action: todowrite
      resource: "*"
      effect: deny
---
