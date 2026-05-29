# Agent Team Runtime And Task Coordination

## 1. Scope

This document distinguishes the native `autobyteus-ts` team runtime from the
server-owned bounded task-delegation workflow implemented in
`autobyteus-server-ts`.

The native TypeScript runtime still owns team concurrency, message routing,
team event streaming, and an internal `TaskPlan` / `TaskNotificationMode`
subsystem. However, the old model-facing task-plan tools are no longer the
canonical task workflow. The removed tool names are:

- `assign_task_to`
- `create_task`
- `create_tasks`
- `get_my_tasks`
- `get_task_plan_status`
- the old local task-plan `update_task_status`

For server-managed team runs, bounded work delegation is now represented by the
server-owned tools `delegate_tasks` and `update_task_status`.

---

## 2. Native Runtime Coordination

AutoByteus agents run concurrently:

- each `Agent` and `TeamManager` has a serialized mailbox loop;
- messages are queued as events rather than direct object calls;
- the `TeamManager` lazily starts or wakes a target member before delivering a
  message;
- agent, team, sub-team, and native task-plan events are multiplexed into the
  team stream.

For conversational collaboration in native examples, coordinators should use
`send_message_to`. That tool delivers a concrete message to a teammate and may
include structured `reference_files`; it is not a task ledger or polling API.

---

## 3. Native Internal TaskPlan

`autobyteus-ts` still contains internal task-plan classes and optional
notification modes:

- `TaskNotificationMode.AGENT_MANUAL_NOTIFICATION`
- `TaskNotificationMode.SYSTEM_EVENT_DRIVEN`
- `TeamContextInitializationStep` initializes a native `TaskPlan` and bridges
  native task-plan events to the team notifier;
- `SystemEventDrivenAgentTaskNotifier` can observe native task-plan events,
  mark runnable tasks queued, and wake a member with a generic notification.

This subsystem is retained for native runtime compatibility and internal event
streams. It should not be exposed to models as a parallel task-plan tool
workflow. If application code directly mutates the native `TaskPlan`, it is
owning that native behavior explicitly; models should not be instructed to call
removed task-plan tools.

---

## 4. Server-Owned Task Delegation

The cross-runtime task workflow lives in `autobyteus-server-ts` and is owned by
`TaskDelegationService` plus the server tool manifest under
`src/agent-tools/task-delegation`.

### `delegate_tasks`

A coordinator/delegator creates one or more bounded tasks with a `tasks` array.
Each task includes:

- `task_name`
- `assignee_name` (member name or member route key)
- `description`
- optional `dependencies` by task name or task id
- optional `completion_criteria`
- optional `expected_deliverables`

The service creates internal ledger records, assigns stable ids such as
`task_0001`, activates only runnable assignees, and returns created task ids plus
activation results. A one-item `tasks` array is the single-task form; do not use
`create_task` or `assign_task_to`.

### Work packets instead of polling

Activated members receive a system work packet that contains the exact task
identity, details, dependency ids, expected deliverables, completion criteria,
and lifecycle instructions. The packet explicitly tells the member not to call
`get_my_tasks`; all necessary task details are pushed with the activation.

### `update_task_status`

The assignee reports status using the exact `task_id` from the work packet.
Allowed model-facing statuses are:

- `in_progress`
- `completed`
- `failed`

Terminal updates should include a summary and any deliverables. The service
validates assignee ownership, records deliverables, emits task-delegation events,
activates newly unblocked dependent tasks, and sends a framework-generated
completion notification to the delegator/coordinator.

---

## 5. Event And Settlement Semantics

Server-owned task delegation is event-driven rather than model-polled:

- accepted work-packet activations emit `TASK_DELEGATION_ACTIVATED`;
- accepted status mutations emit `TASK_DELEGATION_STATUS_UPDATED`;
- terminal completion/failure emits `TASK_DELEGATION_TERMINAL_STATUS` and posts
  a system notification to the delegator plus the coordinator when different.

After terminal status, the framework requests assignee settlement only after the
current tool call can finish. The settlement coordinator waits for the assignee
to become idle/offline, rechecks that no queued/in-progress/runnable delegated
work remains for that assignee, protects the coordinator by default, and calls
the team-run member-settlement boundary with the member route key and member run
id as a stale-route guard.

---

## 6. Developer Guidance

- Use `send_message_to` for free-form conversation and handoff messages.
- Use `delegate_tasks` / `update_task_status` for bounded server-managed work
  with ledger state, dependencies, deliverables, events, notifications, and safe
  settlement.
- Do not reintroduce `create_task`, `create_tasks`, `assign_task_to`,
  `get_my_tasks`, or `get_task_plan_status` as model-facing tools.
- If a future MCP transport is added, it should call the existing server-owned
  task-delegation service rather than duplicating task state or behavior.
