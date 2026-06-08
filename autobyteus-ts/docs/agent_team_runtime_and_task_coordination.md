# Agent Team Runtime and Task Coordination

`autobyteus-ts` owns native team lifecycle, member routing, scoped team
communication, and team/agent/sub-team event streaming. It no longer owns a
native team task ledger.

Server-managed bounded task delegation (`delegate_tasks` and `accept_task`) is
implemented in `autobyteus-server-ts` and is the authoritative workflow for team
tasks.
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
model-facing workflow. Server-managed Codex, Claude, AutoByteus-in-server-team,
and mixed team paths own the supported task-agent lifecycle.

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
`task_0001`, exposes exact `target_agent_run_id` values for active task-agent
runs, and starts one concrete task-agent instance per accepted task. A one-item
`tasks` array is the single-task form; do not use `create_task` or
`assign_task_to`. Do not encode dependencies in task items; if task B depends on
task A, the coordinator waits for ordinary `send_message_to` reporting from task
A and then calls `delegate_tasks` again for task B.

### Work packets and communication

Activated task-agent instances receive a system work packet that contains the
task label, logical member identity, rich description, reference files, the
`target_agent_run_id` for exact feedback, and lifecycle instructions. The packet explicitly
tells the task-agent not to poll for tasks; all necessary task details are
pushed with the activation.

Task-agent progress, blockers, completion reports, revision feedback, and
revised completion reports use ordinary `send_message_to`. Delegators send
feedback to the task-agent's `target_agent_run_id` while it is active. The original delegator accepts
satisfactory work with `accept_task({ task_id, message? })`; this is the only
model-facing task-state transition after delegation.

Server team streams preserve explicit internal task-agent metadata on
status/activity payloads for UI projection and approval routing. Those concrete
runtime identities are transport metadata, not model-facing routing arguments.

## Event And Settlement Semantics

Server-owned task delegation is event-driven rather than model-polled:

- accepted work-packet activations emit `TASK_DELEGATION_ACTIVATED`;
- delegator acceptance emits `TASK_DELEGATION_STATUS_UPDATED` with accepted-work
  metadata before settlement is requested;
- ordinary task-agent reporting is visible through Team Communication events,
  which are committed only after recipient input acceptance.

After acceptance, the framework requests settlement for the concrete task-agent
instance only after the current tool call can finish. The settlement coordinator
waits for the bound task-agent run to become idle/offline, rechecks that no
active delegated child work remains for that task-agent instance, protects the
coordinator by default, and calls the team-run settlement boundary. The internal
task-agent run identity is the stale-route guard, so a later replacement
instance is not accidentally settled.

## Developer Guidance

- Use `send_message_to` for free-form conversation, handoff messages, task-agent
  progress, blockers, completion reports, revision feedback, and revised output.
- Use `delegate_tasks` and `accept_task` for bounded server-managed work with
  ledger state, activation/acceptance events, and safe task-agent settlement on
  supported server team backends.
- Do not reintroduce `create_task`, `create_tasks`, `assign_task_to`,
  `get_my_tasks`, or `get_task_plan_status` as model-facing tools.
- If a future MCP transport is added, it should call the existing server-owned
  task-delegation service rather than duplicating task state or behavior.
