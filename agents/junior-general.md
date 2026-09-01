---
description: Same as the `general` agent, but less intelligent. Use this agent for simpler tasks.
model: opencode-go/deepseek-v4-flash
mode: subagent
permissions:
    - action: todowrite
      resource: "*"
      effect: deny
---
