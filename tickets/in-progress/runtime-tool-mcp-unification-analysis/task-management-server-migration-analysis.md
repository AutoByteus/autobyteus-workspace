# Task Management Server Migration Analysis

## Recommendation

Yes: make this the first ticket, before HTTP/streamable MCP.

The first ticket should not be "MCP server for task tools." It should be "server-owned task-management tool service + current runtime projections + safe member auto-settlement." Once task tools have a canonical server owner, exposing them through a general MCP server in a later ticket becomes a transport/adaptor problem instead of a business-logic migration.

## Current State

### Existing local task tools

Task tools currently live in `autobyteus-ts/src/task-management/tools/task-tools/*`:

- `create_tasks`
- `create_task`
- `get_my_tasks`
- `get_task_plan_status`
- `update_task_status`
- `assign_task_to`

They are `BaseTool` implementations. For the new server-owned surface, `create_task` and `get_my_tasks` should be removed from the model-facing tool set: `create_task` duplicates `create_tasks`, and `get_my_tasks` is replaced by task details pushed in the activation message. They access task state through `context.customData.teamContext.state.taskPlan`, which makes them natural for native AutoByteus teams but not a good shared boundary for Codex, Claude, or future MCP-capable runtimes.

### Existing task activation flow

The native AutoByteus team already has the right conceptual loop:

1. `TaskPlan.addTasks(...)` creates `NOT_STARTED` tasks and emits `TASK_PLAN_TASKS_CREATED`.
2. `SystemEventDrivenAgentTaskNotifier` receives task-plan events.
3. It finds `getNextRunnableTasks()`.
4. It marks runnable tasks `QUEUED`.
5. `TaskActivator` ensures the assignee node is running and sends a system activation message.
6. Current local-tool behavior expects the assignee to use `get_my_tasks` and later `update_task_status`; the target design should remove that happy-path polling tool and replace it with a richer activation work packet.
7. Status updates emit `TASK_PLAN_STATUS_UPDATED`, allowing dependent tasks to become runnable.

This loop is valuable; the problem is placement and cross-runtime reach, not the basic algorithm.

### Existing server-runtime gap

Server-managed team backends already have `TeamRun`, `TeamManager`, member run contexts, inter-agent delivery, and runtime-specific member activation. They also have `interruptMember` and team-level `terminate`, but no canonical per-member `terminateMember`/`settleWhenIdle` API.

Mixed teams also intentionally filter local task-management tools from standalone AutoByteus members (`autobyteus-mixed-tool-exposure.ts`) because those tools are not cross-runtime-safe today.

## Target Shape For First Ticket

### 1. Server-owned task-plan command/query service

Add a server-owned service, likely under something like:

- `autobyteus-server-ts/src/agent-tools/task-management/task-tool-contract.ts`
- `autobyteus-server-ts/src/agent-tools/task-management/task-tool-manifest.ts`
- `autobyteus-server-ts/src/agent-tools/task-management/task-tool-service.ts`
- `autobyteus-server-ts/src/agent-tools/task-management/task-tool-input-parsers.ts`
- `autobyteus-server-ts/src/agent-tools/task-management/task-tool-serialization.ts`

This should mirror the browser tool pattern: canonical names/schema/parse/execute live in one manifest and delegate to one service.

### 2. Task-run context resolver

Every task tool call needs:

- `teamRunId`
- current member name / route key / run ID
- access to the active team run's task plan
- role/policy information: coordinator vs regular member, auto-exit policy, allowed task mutation scope

Do not let tool handlers accept arbitrary team IDs without authorization. The runtime projection should bind these values from the active member's run context.

### 3. Task lifecycle coordinator

Separate task mutation from runtime lifecycle.

`update_task_status` should only update task state and emit events. It should not directly kill the member runtime inline.

A separate lifecycle coordinator should observe task status changes and member status events, then request member settlement only when safe:

- status changed to `completed` or `failed`;
- the updater/member is the task assignee;
- no assigned `queued` or `in_progress` tasks remain;
- no assigned `not_started` tasks are currently runnable;
- current member is not protected by policy (for example coordinator/root, unless configured);
- member's current turn/tool call has become idle or completed.

### 4. Per-member settlement API

Add a cross-runtime member lifecycle boundary, e.g.:

- `TeamManager.terminateMember(targetMemberRouteKey, targetMemberRunId?)`
- or `TeamManager.requestMemberSettlement(target, reason)`
- exposed through `TeamRun` as well.

The implementation should use backend-specific member run termination/cleanup. Do not use team-level `terminate()`, and do not rely on `interruptMember` as a substitute for exit.

### 5. Runtime projections

Project the same task manifest/service into current runtimes:

- AutoByteus/native wrapper if still needed;
- Codex dynamic tools;
- Claude SDK in-process MCP tools;
- mixed team member contexts.

General external MCP remains a later adapter around the same service.


## Simplified Model-Facing Tool Surface

For the first ticket, the cleanest model-facing surface is:

1. `delegate_tasks` — coordinator/authorized creator delegates one or more tasks to team members. A one-item list covers single-task delegation.
2. `update_task_status` — assignee reports `in_progress`, `completed`, `failed`, and deliverables by stable task identity.

Do not expose `get_my_tasks` to activated workers. Do not expose `get_task_plan_status` as a normal coordinator polling tool in the simplified first ticket. The framework should push task work packets to assignees and push terminal task updates back to the coordinator. Global task-plan status can remain an internal/UI/debug API if needed.

## Tool Inclusion Decision

Recommended first-ticket model-facing set:

- Include: `delegate_tasks`, `update_task_status`.
- Keep internal/UI/debug only if needed: task-plan status query.
- Remove from new model-facing surface: `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`.
- Defer or omit: `assign_task_to`.

Reason: `create_task`/`create_tasks` describe internal record creation, while `delegate_tasks` describes coordinator intent; `get_my_tasks` is unnecessary when activation pushes the work packet; `assign_task_to` is not a pure task-plan command. It performs task creation and then sends a direct inter-agent message. That is useful, but it composes two subsystems: TaskPlan and TeamCommunication. It should either be deferred or implemented as a separate orchestration tool that delegates to both canonical services.


## Activation Message As Work Packet

The activation message should carry enough task detail for the assignee to begin immediately:

- stable `task_id` and `task_name`;
- description / expected outcome;
- dependency summary, including the completed prerequisites that made the task runnable;
- expected deliverables, if any;
- status-update instruction with the exact task identity to pass back to `update_task_status`;
- guidance that no task-fetch tool is needed; the framework will reactivate/resend work if recovery is required.

This makes task orchestration feel like delegation rather than polling. The framework activates the member with a concrete assignment, the member performs it, reports completion, and then exits if no more work remains. Removing `get_my_tasks` from the model-facing surface is consistent with this design.



## Coordinator Tool Naming

If the tool merely inserts task records, `create_tasks` is accurate. In the simplified delegation model, however, the coordinator is not just creating records; it is delegating work to named assignees and expecting framework-managed activation plus completion notification.

Recommended naming options:

- `delegate_tasks`: best semantic fit for coordinator intent; implies assignment and framework follow-up.
- `assign_tasks`: clear and concrete; emphasizes assignee binding.
- `create_tasks`: acceptable if we want implementation-neutral wording, but less expressive for the new push-based orchestration model.

Design preference: use `delegate_tasks` or `assign_tasks` as the model-facing name, while the internal service can still perform task creation in the task plan.


## Internal State: Delegation Ledger, Not Model-Facing Task Plan

Even with a delegation-first API, the framework still needs internal state. It does not need to be exposed as a task-plan polling tool, but it does need to exist as an authoritative ledger.

Reasons the internal ledger is still needed:

- correlate `update_task_status` calls to the delegated work by stable `task_id`;
- know which coordinator/delegator should receive completion notifications;
- track assignee, status, deliverables, terminal result, timestamps, and audit history;
- evaluate dependencies and activate downstream work when prerequisites complete;
- prevent duplicate activation/completion handling;
- decide whether the assignee has remaining queued/in-progress/runnable work before auto-exit;
- support UI/history/debug visibility without asking agents to poll.

So the architectural shift is not "no task state." It is: hide the task plan from agents, rename the model-facing operation to delegation, and put the internal task state behind a `TaskDelegationService`/ledger owner.

For the first ticket, the existing `TaskPlan` implementation can probably be reused internally to reduce migration risk, but it should be wrapped by the server-owned delegation service so future code depends on delegation semantics, not direct task-plan manipulation.

## Coordinator Completion Notification

The coordinator should not have to poll `get_task_plan_status` to discover completion. Terminal task status updates should create a framework-owned notification back to the coordinator when a live coordinator exists.

Recommended notification payload:

- `task_id` and `task_name`;
- assignee name/route/run ID;
- terminal status: `completed` or `failed`;
- deliverables submitted through `update_task_status`;
- short completion/failure summary if provided;
- downstream tasks activated as a result, if any.

This notification can be emitted as a team event for UI/history and also delivered as a system/inter-agent message to the coordinator member when the coordinator is active or should be resumed. This preserves the delegation loop: coordinator assigns; worker completes; framework reports back; worker exits.

## Auto-Exit Semantics

Use the word "exit" carefully.

Correct behavior:

- the member stops/settles after completing the current work;
- the team remains active;
- the member can be reactivated later if new runnable tasks or messages arrive;
- completion result and task-plan events are preserved.

Incorrect behavior:

- terminating the whole team;
- interrupting the active completion tool call before the result is returned;
- exiting after one task while the same member has more queued/in-progress work;
- keeping a member running forever after it has no work.

Implementation-wise, auto-exit should be a delayed/safe lifecycle decision, not a side effect inside the task mutation method.

## Suggested Flow

1. Coordinator calls `delegate_tasks`.
2. Server task-delegation service validates the request and records internal delegation/task-state entries.
3. Delegation/task-state event triggers activation coordinator.
4. Runnable tasks are marked `QUEUED`.
5. Target member runtime is started/restored and receives an activation input that includes the full task work packet.
6. Target member starts from that activation message without needing to call `get_my_tasks`.
7. Target member calls `update_task_status(..., in_progress)` when beginning, if the workflow wants explicit in-progress state.
8. Target member does the work.
9. Target member calls `update_task_status(..., completed, deliverables)`.
10. Task-delegation service updates state and emits terminal/update events.
11. Activation coordinator enqueues dependent work if now runnable.
12. Lifecycle coordinator records a pending auto-settlement for the completed member if it has no remaining current work.
13. When the member run reports idle/current turn settled, lifecycle coordinator terminates/settles that member only.

There should be no model-facing `get_my_tasks` in the simplified surface. If recovery needs member-task lookup, keep it as an internal service query used by the framework to resend an activation packet.

## Why This Should Precede General MCP

If MCP is built first, the MCP server would need to know how to mutate in-memory task plans and stop member runtimes. That would make MCP the accidental owner of task orchestration.

If server-owned task tools are built first, future MCP support is simple:

- list task tool manifest entries;
- resolve MCP session to team/member context;
- call the same task service;
- return the same serialized result.

## Main Risks

1. **Turn-safety risk:** exiting inside `update_task_status` can drop the tool result or corrupt stream state.
2. **Context-binding risk:** task tools must never mutate an arbitrary team run; they must be bound to the caller's member context.
3. **Policy risk:** coordinator auto-exit may be undesirable; make it policy-controlled.
4. **State-placement risk:** live in-memory task plan is enough for first ticket, but future external MCP/restoration may require persistence.
5. **Composite-tool risk:** `assign_task_to` can blur task-plan and messaging ownership if added too early without a clean orchestration boundary.
