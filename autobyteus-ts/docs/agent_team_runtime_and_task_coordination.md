# Agent Team Runtime and Task Coordination

The native `autobyteus-ts` agent-team runtime has been decommissioned. Team
launch, restore, member routing, scoped team communication, task-agent
activation, and team stream projection are owned by `autobyteus-server-ts` via
the server stack:

`TeamRun -> MixedTeamManager -> AgentRunManager -> runtime AgentRun backend`

`autobyteus-ts` continues to own single-agent runtime primitives, local tools,
messages, memory, and LLM integration. It must not reintroduce a native team
lifecycle or native team task ledger.

Server-managed bounded task delegation (`delegate_tasks`, `submit_task_result`, and
`review_task_result`) is implemented in `autobyteus-server-ts` and is the
authoritative workflow for team tasks.
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

## Removed Native Team Runtime Scope

Native teams no longer start through an `autobyteus-ts` runtime bootstrap path.
The removed native surface included:

- member agent configuration preparation for native teams;
- native scoped `teamContext` communication;
- `TeamManager` coordinator/member runtime ownership;
- native team, agent, and sub-team stream rebroadcasting.

Server-created AutoByteus team members are ordinary `AgentRun`s configured by
the server with `MemberTeamContext`-derived instructions and primitive
`customData.teamContext` fields. Any future team-task UI or ledger must be
designed from server-owned task-delegation data, not from native
`autobyteus-ts` task state.

## Streaming Boundary

Native `AgentEventStream` records remain single-agent stream records. Server
team streams enrich child agent events, Team Communication messages, task-agent
status metadata, and reference-file entries under `autobyteus-server-ts`.
Agent-level events can still include generic `SYSTEM_TASK_NOTIFICATION` and
`TODO_LIST_UPDATE` stream items where the single-agent runtime emits them.
These are not native team task-plan events.

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
`task_0001`, and starts one concrete task-agent instance per accepted task. A
one-item `tasks` array is the single-task form; do not use `create_task` or
`assign_task_to`. Do not encode dependencies in task items; if task B depends on
task A, the coordinator reviews task A's submitted result and then calls
`delegate_tasks` again for task B.

### Result submission and review

Activated task-agent instances receive a system work packet that contains the
task label, logical member identity, rich description, reference files, concrete
runtime identity, and lifecycle instructions. The packet explicitly tells the
task-agent not to poll for tasks; all necessary task details are pushed with the
activation.

Task-agents submit reviewable output with `submit_task_result({ message,
reference_files? })`. The task is inferred from the bound task-agent context, so
the model must not pass task selectors such as `task_id`, `task_name`,
`member_name`, or status fields. Successful submission records a stable
submission id, moves the task to `awaiting_review`, and system-notifies the
original delegator.

Original delegators review the latest pending submission with
`review_task_result({ task_id, decision, message?, reference_files? })`.
`decision="request_revision"` requires a non-empty message and system-notifies
that same task-agent. `decision="accept"` marks the task accepted and requests
safe task-agent settlement. Every review records the reviewed submission id so
multi-cycle result/revision history is explicit.

`send_message_to` remains available for ordinary teammate communication and
handoffs. It is not the task result, revision, acceptance, or finalization
protocol.

## Event And Settlement Semantics

Server-owned task delegation is event-driven rather than model-polled:

- accepted work-packet activations emit `TASK_DELEGATION_ACTIVATED`;
- task-agent result submissions emit `TASK_DELEGATION_RESULT_SUBMITTED` and a
  status projection containing the pending submission id;
- delegator reviews emit `TASK_DELEGATION_RESULT_REVIEWED` and a status
  projection containing `reviewId` and `reviewedSubmissionId`;
- system notification delivery failure does not roll back valid lifecycle state;
  tool results return `notification_delivered` and deterministic `warnings[]`.

After acceptance, the framework requests settlement for the concrete task-agent
instance only after the current tool call can finish. The settlement coordinator
waits for the bound task-agent run to become idle/offline, rechecks that no
non-terminal work is assigned to that task-agent run and no non-terminal child
delegation is owned by that task-agent run, protects the coordinator by default,
and calls the team-run settlement boundary. The internal task-agent run identity
is the stale-route guard, so a later replacement instance is not accidentally
settled.

## Developer Guidance

- Use `send_message_to` for free-form conversation and handoff messages only; do
  not use it for task result submission, revision requests, acceptance, or
  finalization.
- Use `delegate_tasks`, `submit_task_result`, and `review_task_result` for
  bounded server-managed work with ledger state, result/review events, system
  notifications, and safe task-agent settlement on supported server team
  backends.
- Do not reintroduce `create_task`, `create_tasks`, `assign_task_to`,
  `get_my_tasks`, or `get_task_plan_status` as model-facing tools.
- If a future MCP transport is added, it should call the existing server-owned
  task-delegation service rather than duplicating task state or behavior.
