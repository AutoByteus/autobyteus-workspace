# Release Notes — Messages Between Agents Survive a Task Closing

Status: prepared before finalization. The user decided in advance to finalize and release a new beta.

## Fixed
- If a Task was marked done or cancelled while an agent's message to that Task's worker was being saved, the whole run (standalone agent, Team or Org) could stop with a persistence error and refuse further work. Now the run keeps working. The sending agent gets a readable "this Task is closed" answer, and the closed worker does not act on the message.
- The same readable answer now also replaces an internal error the sending agent could get when the Task closed just before the message was saved.

## Changed
- Internal: messages between agents, including messages to and from agents on a connected node, are now saved and delivered by one shared implementation for standalone agents, Teams and Orgs. This is not visible in the app. Saved conversation history, message IDs, results and error codes are unchanged.

## Notes
- Server-side change only. No settings, data migration or reset. Rolling back to an earlier version is possible.
