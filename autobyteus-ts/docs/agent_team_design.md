# Agent Team Design

The `agent-team` package owns native team lifecycle, team/member configuration,
member routing, scoped team communication, and team/agent/sub-team stream
rebroadcasting. It does not own team task state.

Server-managed bounded task delegation (`delegate_tasks`,
`mark_task_completed`, `mark_task_failed`, and `accept_task`) is owned in
`autobyteus-server-ts`. Personal ToDo tools remain local agent tools under
`src/task-management`.

## Runtime Bootstrap

Default native team bootstrap steps are:

1. `AgentConfigurationPreparationStep` — prepares final member agent configs,
   injects scoped `teamContext`, and attaches team-manifest prompt processing.
2. `CoordinatorInitializationStep` — starts/ensures the coordinator through
   `TeamManager`.

There is no task-plan bootstrap step, task-notification mode, or task notifier.

## Runtime State

`AgentTeamRuntimeState` tracks team status, final agent configs, the team
manager, queues, status/event helpers, and event stores. It intentionally does
not contain task-plan or task-notifier fields.

## Streaming

`AgentTeamExternalEventNotifier` publishes only:

- `TEAM` status events;
- `AGENT` member event rebroadcasts;
- `SUB_TEAM` nested team event rebroadcasts.

Native `TASK_PLAN` stream events have been removed. Dedicated task events are
server domain events and are exposed over the server WebSocket protocol as
`TASK_DELEGATION_EVENT`.

## Communication Boundary

`createScopedNativeTeamContext(...)` supplies native team communication through
`TeamManager`. `send_message_to` is not a task ledger and must not be used to
resurrect old task-plan semantics.

## Removed Legacy Task Tool Names

Do not expose or reintroduce the removed legacy team task tool names:
`assign_task_to`, `create_task`, `create_tasks`, `get_my_tasks`,
`get_task_plan_status`, or the old local team-task `update_task_status`.

Use server-managed dedicated task delegation for bounded team work and personal
ToDo tools (`create_todo_list`, `add_todo`, `get_todo_list`,
`update_todo_status`) for an individual agent's private checklist.
