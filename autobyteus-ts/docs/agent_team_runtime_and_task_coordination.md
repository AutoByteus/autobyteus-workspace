# Agent Team Runtime and Task Coordination

`autobyteus-ts` owns native team lifecycle, member routing, scoped team
communication, and team/agent/sub-team event streaming. It no longer owns a
native team task ledger.

Server-managed bounded task delegation (`delegate_tasks`,
`mark_task_completed`, `mark_task_failed`, and `accept_task`) is implemented in
`autobyteus-server-ts` and is the authoritative workflow for team tasks.
Personal ToDo tools remain local agent tools in `src/task-management` and keep
emitting normal `TODO_LIST_UPDATE` agent stream events.

## Removed Legacy Team Task Workflow

The old native team task-plan subsystem has been removed from active source:

- no `TaskPlan`, `BaseTaskPlan`, or `InMemoryTaskPlan` public API;
- no task-plan schemas, reports, deliverables, converters, or stream payloads;
- no task-plan bootstrap step or task-notification mode/env var;
- no native team stream source for task plans;
- no CLI task-plan panel.

Do not reintroduce legacy model-facing task tools such as `assign_task_to`,
`create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or the
old local team-task `update_task_status`. Server-managed bounded team work uses
the dedicated task-delegation tools above. Personal ToDo still uses
`create_todo_list`, `add_todo`, `get_todo_list`, and `update_todo_status`.

## Native Team Runtime Scope

Native teams now start through the runtime bootstrap path only:

1. prepare member agent configurations and scoped `teamContext` communication;
2. initialize the coordinator/member runtime via `TeamManager`;
3. publish team, agent, and sub-team stream events.

The native runtime does not create, persist, or mutate a team task list. Any
future team-task UI or ledger must be designed from server-owned dedicated task
delegation data, not from a native `autobyteus-ts` task plan.

## Streaming Boundary

`AgentTeamStreamEvent` supports these source categories only:

- `TEAM`
- `AGENT`
- `SUB_TEAM`

Agent-level events still include generic `SYSTEM_TASK_NOTIFICATION` and
`TODO_LIST_UPDATE` stream items where the agent runtime emits them. These are
not native team task-plan events.
