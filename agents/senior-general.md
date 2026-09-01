---
description: Same as the `general` agent, but more intelligent. Use this agent for harder, more nuanced tasks.
model: openai/gpt-5.6-sol#medium
mode: subagent
permissions:
    - action: todowrite
      resource: "*"
      effect: deny
---
