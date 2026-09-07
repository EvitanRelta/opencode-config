---
description: Same as the `general` agent, but more intelligent. Use this agent for harder, more nuanced tasks.
model: openai/gpt-6-astra#medium
mode: subagent
permissions:
    - action: todowrite
      resource: "*"
      effect: deny
---
