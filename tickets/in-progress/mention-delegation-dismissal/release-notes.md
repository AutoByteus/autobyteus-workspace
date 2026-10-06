# Release Notes — `@` mentions delegate, and every delegated copy can be closed

## Changed

- **`@` mentioning an Agent or Team no longer adds it to your run directly.**
  - Your message still shows the `@` chip.
  - The agent you are talking to now delegates the work to the mentioned Agent or Team and follows up with it by run ID.
  - Rows no longer appear that you could not dismiss.
- **Any delegated copy can now be closed.**
  - When an agent delegates work by description alone, the work gets its own lightweight Task. You can ask the agent to mark it done.
  - Marking it done stops that copy and its sub-work, removes them from the run tree, and keeps them closed after a restart. The conversation history stays readable.
  - These Tasks do not show on the Projects page.
  - Permanently deleting the run deletes them too.
- Every agent that can delegate can also mark its delegated work done, on every runtime.

## Upgrade notes

- **Breaking change for tool callers:** to update a Task, `create_or_update_task` now takes `task_id` without `project_id`. Sending both is rejected. External agent packages that update Tasks with both fields need an update. One example is the agent repository's Project Task Manager skill.
- Existing runs with collaborators keep loading and working. No data migration is needed.
