# Release Notes — Closed Task Status (Not Needed / Won't Do)

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Added
- Tasks have a fourth status, **Closed**, meaning the Task was dropped as not needed and was not completed. Before this release, an unneeded Task had to be marked Done, which wrongly recorded it as finished, or left in To Do.
- Agents close a Task with `create_or_update_task` (`status: "CLOSED"`), for example when you ask in chat. Closing stops the Task's delegated agents and teams exactly as Done does.
- An agent can reopen a Closed Task by setting it back to To Do or In Progress. Reopening starts nothing; the agent that assigned the work can then continue with its earlier copy, as after Done.
- `list_project_tasks` can filter by `CLOSED`. The agent-facing tool descriptions explain what Closed means.

## In the app
- On the Project board, Closed Tasks stay out of To Do, In Progress and Done and are hidden by default. A small **Closed (N)** button beside Refresh shows them in a separate Closed lane and hides them again. The button is absent when nothing is closed.
- The Task page and the right-panel Task detail show a muted **Closed** label, distinct from Done's green.
- Temp tasks behave the same way: a Closed Temp task is neither Open nor Done, it is hidden behind the same Closed toggle, and the Temp tasks count leaves it out.
- A Project's open-Task count now counts only To Do and In Progress.

## Unchanged
- Only agents change a Task's status. The app still has no status button, picker or drag-and-drop.
- Done works as before. Existing Tasks load unchanged, with no migration or reset.

## Notes
- An older app version may not show a Task stored as Closed. The Task stays on disk and shows again after you upgrade.
- The separate Project Task Manager agent does not yet know about Closed, so it may not suggest closing on its own.
