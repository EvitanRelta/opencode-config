---
description: Same as the `general` agent, but less intelligent. Use this agent for simpler tasks.
model: openai/gpt-6-luna#high
mode: subagent
permissions:
    - action: todowrite
      resource: "*"
      effect: deny
---
