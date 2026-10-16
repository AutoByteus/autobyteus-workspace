## Improvements
- Agents now read collaboration instructions written for them, in one vocabulary and with each rule stated once. Standalone agents, team members, task agents and task agent teams each get the text for their role.
- An agent is no longer told its own address or a sender address that does not reach the sender. Replies go to the sender's run id, or to the sender address only where that address reaches it.
- An agent replies to a report only when the report asks for a reply. This stops report/acknowledgement loops between a delegator and its task agent.
- Tool descriptions, results and refusals for `send_message_to`, `delegate_task` and the Task tools use the same wording on every runtime, and every refusal is returned to the agent with guidance.

## Fixes
- The `@` mention note no longer suggests delegating to a teammate, which `delegate_task` refuses.
- Team prompts no longer describe nested teams.

## Upgrade Notes
- Messages and notes saved by earlier releases still display as before ("From <name>:" labels and `@` chips).
