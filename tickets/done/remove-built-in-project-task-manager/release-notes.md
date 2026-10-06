# Release Notes — Built-in Project Task Manager removed

## Changed

- **Only one "Project Task Manager" now appears.** AutoByteus no longer ships its own built-in Project Task Manager. Use the Project Task Manager from the agent repository, which comes with its `project-task-management` skill. It appears when that repository is configured as an agent package root. Projects and Tasks, and the Project tools, work as before with any agent that selects them.

## Upgrade Notes

- On the first start after upgrading, AutoByteus permanently deletes the old built-in copy at `agents/autobyteus-project-task-manager/` in app data. It makes no backup. Earlier versions rewrote that folder on every start, so it held no user edits.
- Nothing else is touched: run history, Projects, Tasks, other agents and package-root agents all stay as they were.
- Past conversations with the old built-in remain in history and can be read. They can no longer be continued, as with any deleted agent.
- If the folder cannot be deleted, for example because of permissions, startup continues normally. The deletion is retried on the next start.
