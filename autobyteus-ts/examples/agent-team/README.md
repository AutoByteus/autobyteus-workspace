# Agent Team Examples

The examples in this directory demonstrate native `autobyteus-ts` team startup,
member communication, and stream observation. Native teams no longer include an
internal team task-plan workflow or event-driven task notifier examples.

For bounded team work, use server-owned dedicated task delegation in
`autobyteus-server-ts`: `delegate_tasks`, `mark_task_completed`,
`mark_task_failed`, and `accept_task`.

Do not reintroduce the removed legacy team task tool names (`assign_task_to`,
`create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or the
old local team-task `update_task_status`). Personal ToDo examples should use the
ToDo tools only.
