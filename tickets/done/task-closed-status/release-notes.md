# Release Notes — Cancelled Task Status (Not Needed / Won't Do)

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Added
- Tasks have a fourth status, **Cancelled**, meaning the Task was dropped as not needed and was not completed. Before this release, an unneeded Task had to be marked Done, which wrongly recorded it as finished, or left in To Do.
- Agents cancel a Task with `create_or_update_task` (`status: "CANCELLED"`), for example when you ask in chat. Cancelling stops the Task's delegated agents and teams exactly as Done does.
- An agent can reopen a Cancelled Task by setting it back to To Do or In Progress. Reopening starts nothing; the agent that assigned the work can then continue with its earlier copy, as after Done.
- `list_project_tasks` can filter by `CANCELLED`. The agent-facing tool descriptions explain what Cancelled means.

## In the app
- On the Project board, Cancelled Tasks stay out of To Do, In Progress and Done and are hidden by default. A small **Cancelled (N)** button beside Refresh shows them as a fourth column after Done and hides them again. The button is absent when no Task is cancelled.
- The Task page and the right-panel Task detail show a muted **Cancelled** label, distinct from Done's green.
- Temp tasks behave the same way: a Cancelled Temp task is neither Open nor Done, the same toggle shows it in a Cancelled column after Done, and the Temp tasks count leaves it out.
- A Project's open-Task count now counts only To Do and In Progress.

## Unchanged
- Only agents change a Task's status. The app still has no status button, picker or drag-and-drop.
- Done works as before. Existing Tasks load unchanged, with no migration or reset.

## Notes
- An older app version may not show a Task stored as Cancelled. The Task stays on disk and shows again after you upgrade.
- The separate Project Task Manager agent does not yet know about Cancelled, so it may not suggest cancelling on its own.
