# Release Notes — Teammate Messages Survive a Task Closing Mid-Save

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Fixed
- If a Task was marked done (or cancelled) at the moment an agent's message to that Task's worker was being saved, the whole run (standalone agent, Team or Org) could stop with a persistence error and refuse further work. Now the run keeps working. The sending agent is told the Task is closed, and the closed worker does not act on the message.

## Changed
- Internal: messages between agents are now delivered and saved by one shared implementation for standalone agents, Teams and Orgs, instead of three separate ones. This is not visible in the app. Saved conversation history, message IDs, results and error codes are unchanged.

## Notes
- Server-side change only. No settings, data migration or reset.
