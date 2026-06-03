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

## Server-Owned Task Delegation

The cross-runtime task workflow lives in `autobyteus-server-ts` and is owned by
`TaskDelegationService` plus the server tool manifest under
`src/agent-tools/task-delegation`. Native `autobyteus-ts` teams do not own this
model-facing workflow. Native AutoByteus pure-team agent configs currently gate
server-owned task-delegation tools because native task-agent/per-member
settlement is not available there yet; server-managed Codex, Claude, and mixed
team paths own the supported task-agent lifecycle.

### `delegate_tasks`

A coordinator/delegator creates one or more bounded ready-to-run tasks with a
`tasks` array. Each task item contains:

- `member_name`: the exact logical team member/template name from the current
  roster;
- `description`: the complete work-packet body, including objective, context,
  scope, constraints, done conditions, and expected output guidance;
- optional `reference_files`: file or artifact paths the task-agent should
  inspect.

The service creates internal ledger records, assigns stable ids such as
`task_0001`, and starts one concrete task-agent instance per accepted task. A
one-item `tasks` array is the single-task form; do not use `create_task` or
`assign_task_to`. Do not encode dependencies in task items; if task B depends on
task A, the coordinator waits for the framework terminal/completion
notification for task A and then calls `delegate_tasks` again for task B.

### Work packets instead of polling

Activated task-agent instances receive a system work packet that contains the
task label, logical member identity, task-agent instance/run identity, rich
description, reference files, and lifecycle instructions. The packet explicitly
tells the task-agent not to call `get_my_tasks`; all necessary task details are
pushed with the activation.

Server team streams preserve the same identity as explicit metadata on
task-agent status/activity payloads: `task_agent_instance_id`,
`task_agent_run_id`, `task_id`, logical `member_path` / `member_route_key`, and
canonical `source_path` / `source_route_key`. Frontend and integration clients
should use those fields for task-agent child projection and approval routing
instead of reconstructing identity from run-id naming conventions.

### Task-agent result and acceptance tools

For task-agent result reporting, the task-agent reports the outcome for the task
bound to its own task-agent instance. The task-agent model-facing calls take no
task selector and do not accept a generic `status` field:

- `mark_task_completed({ message, reference_files? })`
- `mark_task_failed({ message, reference_files? })`

Result reports record context, emit task-delegation events, and send a
framework-generated completion/failure notification to the delegator/coordinator.
Completed work moves to `awaiting_acceptance`; the task-agent child remains
addressable for rework/acceptance until the original delegator accepts the
result. For original-delegator acceptance, `accept_task` accepts the exact
framework-generated `task_id` from the completion notification and optional
`message`; this acceptance tool is not used by task-agent execution updates.

## Event And Settlement Semantics

Server-owned task delegation is event-driven rather than model-polled:

- accepted work-packet activations emit `TASK_DELEGATION_ACTIVATED`;
- accepted status mutations emit `TASK_DELEGATION_STATUS_UPDATED`;
- terminal completion/failure emits `TASK_DELEGATION_TERMINAL_STATUS` and posts
  a system notification to the delegator plus the coordinator when different;
- delegator acceptance emits `TASK_DELEGATION_STATUS_UPDATED` with accepted-work
  metadata before settlement is requested.

Completed status records result context and waits for the delegator to accept
the exact framework-generated `task_id`. Failed status remains a terminal
failure path. After acceptance, or after terminal failure, the framework
requests settlement for the concrete task-agent instance only after the current
tool call can finish. The settlement coordinator waits for the bound task-agent
run to become idle/offline, rechecks that no queued or in-progress delegated
work remains for that task-agent instance, protects the coordinator by default,
and calls the team-run
`settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, reason)`
boundary. The task-agent run id is the stale-route guard, so a later replacement
instance is not accidentally settled.

## Developer Guidance

- Use `send_message_to` for free-form conversation and handoff messages.
- Use `delegate_tasks`, `mark_task_completed`, `mark_task_failed`, and
  `accept_task` for bounded server-managed work with ledger state, result
  messages/reference files, events, notifications, and safe task-agent
  settlement on supported server team backends.
- Do not reintroduce `create_task`, `create_tasks`, `assign_task_to`,
  `get_my_tasks`, or `get_task_plan_status` as model-facing tools.
- If a future MCP transport is added, it should call the existing server-owned
  task-delegation service rather than duplicating task state or behavior.
