# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, investigation IF-15 | `autobyteus-server-ts/docs/modules/agent_team_execution.md` § Collaboration And Handoffs says "a first message to an available catalog address brings that one instance in", which contradicts `agent_communication.md` § Address resolution ("a message can never start an agent") | Both docs on `827f1e68d` | Docs inconsistency, not this feature | No | Correct agent_team_execution.md to the current address resolution rule | |
| FU-002 | Solution Designer, requirements DEC-003 (recommended) | Org-mounted Teams keep their own saved copy of members and handoffs and would not follow their Team definition | `agent-org-execution/domain/agent-org-run-execution-tree.ts:17,32` | Separate saved format; the user's cases are a standalone Team and a delegated Team copy | No | Let Teams mounted in an Org run follow their Team definition's members and rules, as standalone Team runs do | |
