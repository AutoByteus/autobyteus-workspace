# Task Management Server Migration Analysis

## Recommendation

Yes: make this the first ticket, before HTTP/streamable MCP.

The first ticket should not be "MCP server for task tools." It should be "server-owned task-management tool service + current runtime projections + mandatory safe task-agent instance lifecycle." Once task tools have a canonical server owner, exposing them through a general MCP server in a later ticket becomes a transport/adaptor problem instead of a business-logic migration.

2026-05-29 clarification: in the simplified delegation model, final-worker settlement is a hard sub-agent lifecycle invariant for every supported task-delegation runtime path. A delegated worker that completes/fails its last task and has no queued/in-progress/runnable delegated work must settle/exit after its current turn becomes idle. This is not optional "may settle" behavior.

2026-05-29 parallelism refinement: a logical team member should be treated as a reusable worker template. A delegated task should be able to start a task-scoped agent instance of that member. If two independent runnable tasks target the same logical member, the framework should be able to run two task-agent instances in parallel, subject to concurrency policy. Each task-agent instance exits independently after its own terminal task.

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
5. `TaskActivator` ensures the target member node is running and sends a system activation message.
6. Current local-tool behavior expects the target member to use `get_my_tasks` and later `update_task_status`; the target design should remove that happy-path polling tool and replace it with a richer activation work packet.
7. In the legacy task-plan model, status updates emit `TASK_PLAN_STATUS_UPDATED`, which can allow dependent tasks to become runnable. That dependency behavior is not part of the simplified first-ticket model-facing schema.

This loop is valuable; the problem is placement and cross-runtime reach, not the basic algorithm.

### Existing server-runtime gap

Server-managed team backends already have `TeamRun`, `TeamManager`, member run contexts, inter-agent delivery, and runtime-specific member activation. They also have `interruptMember` and team-level `terminate`, but no canonical task-agent/per-member `terminateMember`/`settleWhenIdle` API.

Mixed teams also intentionally filter local task-management tools from standalone AutoByteus members (`autobyteus-mixed-tool-exposure.ts`) because those tools are not cross-runtime-safe today.

There is also a deeper identity constraint: Codex/Claude managers currently keep active member runtimes in maps keyed by logical `memberRouteKey`, Mixed keeps one handle per route key, and the current task-delegation activation coordinator groups runnable tasks by assignee route. That design can run one logical member, but it cannot represent two task-agent instances of the same logical member. Parallel task agents require a concrete instance identity below the logical member route.

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

`update_task_status` should only update task state and emit events. It should not directly kill the task-agent runtime inline.

A separate lifecycle coordinator should observe task status changes and task-agent status events, then request task-agent settlement only when safe:

- status changed to `completed` or `failed`;
- the updater/member is the bound target member/task-agent instance;
- no assigned `queued` or `in_progress` tasks remain;
- no assigned `not_started` tasks are currently runnable;
- current member is not protected by policy (for example coordinator/root, unless configured);
- member's current turn/tool call has become idle or completed.

With the task-agent model, this coordinator should key pending settlement by concrete `taskAgentRunId`, not by logical `memberRouteKey`. For default one-task-per-instance activation, terminal status + idle is enough to settle that instance. It must not settle sibling task-agent instances of the same logical member.

### 3a. Task-agent instance identity and activation

Add a dynamic task-agent instance layer:

- `member_name` resolves to a logical team member/template;
- each selected runnable task gets a `taskAgentInstanceId` and concrete `taskAgentRunId`;
- task-agent work packets are single-task packets focused on the rich description/reference files; internal task identity and `taskAgentInstanceId` are bound in context/events;
- `update_task_status` resolves the task from caller instance identity and does not expose task selector fields;
- events/status expose logical member identity plus task-agent instance identity.

Do not use generic `TeamRun.postMessage` as the task-agent activation primitive. `postMessage` is correct for normal user messages and `send_message_to`, where one logical member conversation should receive a message. Task delegation needs an explicit `startTaskAgentInstance` boundary so multiple concrete runtimes can exist under one logical member.

### 4. Task-agent/per-member settlement API

Add a cross-runtime member lifecycle boundary, e.g.:

- `TeamManager.terminateMember(targetMemberRouteKey, targetMemberRunId?)`
- or `TeamManager.requestMemberSettlement(target, reason)`
- exposed through `TeamRun` as well.

The implementation should use backend-specific member run termination/cleanup. Do not use team-level `terminate()`, and do not rely on `interruptMember` as a substitute for exit.

Every backend path that exposes `delegate_tasks`/`update_task_status` as supported must implement this task-agent/per-member settlement contract. If a backend returns `UNSUPPORTED_RUNTIME_COMMAND` for settlement, task delegation must be gated off for that backend until settlement is implemented. In particular, native AutoByteus pure-team delegation cannot be claimed supported while pure-team settlement remains unsupported.

For server-managed Codex/Claude/Mixed backends, the lifecycle boundary should be instance-aware: `startTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, taskId, message)` and `settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, reason)`. Backend registries should keep normal conversation runs keyed by logical route separately from task-agent runs keyed by concrete run ID.

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
2. `update_task_status` — task agent reports `in_progress`, `completed`, or `failed`, plus optional message and reference files; the task is inferred from task-agent instance context.

`delegate_tasks` task items should be detailed work-packet envelopes, not name-only records, but the schema should stay simple for reliable model calls. The minimal and intended item is a logical `member_name`, a rich `description`, and optional `reference_files`. Do not add separate model-facing `task_name`, `dependencies`, `completion_criteria`, or `expected_deliverables` fields; the `description` field description should tell the model to include any success conditions, expected outputs, constraints, or context in prose. The server generates internal task identity and may derive a display label from the description when needed.

The tool description should say that each delegated task item is ready-to-run. If one task depends on another, the coordinator should wait for the completion notification and delegate the dependent follow-up task in a later call rather than encoding dependency references in the first call.

Do not expose `get_my_tasks` to activated workers. Do not expose `get_task_plan_status` as a normal coordinator polling tool in the simplified first ticket. The framework should push task work packets to task-agent instances and push terminal task updates back to the coordinator. Global task-plan status can remain an internal/UI/debug API if needed.

## Tool Inclusion Decision

Recommended first-ticket model-facing set:

- Include: `delegate_tasks`, `update_task_status`.
- Keep internal/UI/debug only if needed: task-plan status query.
- Remove from new model-facing surface: `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`.
- Defer or omit: `assign_task_to`.

Reason: `create_task`/`create_tasks` describe internal record creation, while `delegate_tasks` describes coordinator intent; `get_my_tasks` is unnecessary when activation pushes the work packet; `assign_task_to` is not a pure task-plan command. It performs task creation and then sends a direct inter-agent message. That is useful, but it composes two subsystems: TaskPlan and TeamCommunication. It should either be deferred or implemented as a separate orchestration tool that delegates to both canonical services.


## Activation Message As Work Packet

The activation message should carry enough task detail for the task agent to begin immediately:

- optional derived display label;
- rich description / expected outcome;
- optional reference files/artifacts;
- status-update instruction stating that `update_task_status` is bound to this task-agent instance and does not need a task selector;
- guidance that no task-fetch tool is needed; the framework will reactivate/resend work if recovery is required.

This makes task orchestration feel like delegation rather than polling. The framework activates a task-agent instance with a concrete assignment, the task agent performs it, reports completion, and then exits after terminal status and idle. Removing `get_my_tasks` from the model-facing surface is consistent with this design. Worker-facing instructions should say the framework will/must settle the final task-agent instance after the terminal-task/idle gates pass; they should not say the framework may settle the worker.

For same-member parallel tasks, each activation message should represent one task-agent instance, not a batch of several independent tasks. Batching may be a later explicit policy, but the default task-agent design is one runnable task -> one task-agent instance -> one terminal update -> one instance exit.



## Coordinator Tool Naming

If the tool merely inserts task records, `create_tasks` is accurate. In the simplified delegation model, however, the coordinator is not just creating records; it is delegating work to named team members and expecting framework-managed activation plus completion notification.

Recommended naming options:

- `delegate_tasks`: best semantic fit for coordinator intent; implies assignment and framework follow-up.
- `assign_tasks`: clear and concrete, but the selected schema uses `delegate_tasks` plus `member_name` to emphasize team-member targeting.
- `create_tasks`: acceptable if we want implementation-neutral wording, but less expressive for the new push-based orchestration model.

Design preference: use `delegate_tasks` or `assign_tasks` as the model-facing name, while the internal service can still perform task creation in the task plan.


## Internal State: Delegation Ledger, Not Model-Facing Task Plan

Even with a delegation-first API, the framework still needs internal state. It does not need to be exposed as a task-plan polling tool, but it does need to exist as an authoritative ledger.

Reasons the internal ledger is still needed:

- correlate `update_task_status` calls to the delegated work by caller task-agent instance identity and internal task ID;
- know which coordinator/delegator should receive completion notifications;
- track target member, status, optional message, reference files, terminal result, timestamps, and audit history;
- prevent duplicate activation/completion handling;
- decide whether the task-agent instance has remaining queued/in-progress/runnable work before auto-exit;
- support UI/history/debug visibility without asking agents to poll.

So the architectural shift is not "no task state." It is: hide the task plan from agents, rename the model-facing operation to delegation, and put the internal task state behind a `TaskDelegationService`/ledger owner.

For the first ticket, the existing `TaskPlan` implementation can probably be reused internally to reduce migration risk, but it should be wrapped by the server-owned delegation service so future code depends on delegation semantics, not direct task-plan manipulation.

## Coordinator Completion Notification

The coordinator should not have to poll `get_task_plan_status` to discover completion. Terminal task status updates should create a framework-owned notification back to the coordinator when a live coordinator exists.

Recommended notification payload:

- internal task ID and derived display label;
- member name/route/run ID;
- terminal status: `completed` or `failed`;
- optional message provided through `update_task_status`;
- reference files provided through `update_task_status`.

This notification can be emitted as a team event for UI/history and also delivered as a system/inter-agent message to the coordinator member when the coordinator is active or should be resumed. This preserves the delegation loop: coordinator assigns; task agent completes; framework reports back; task agent exits.

## Auto-Exit Semantics

Use the word "exit" carefully.

Correct behavior:

- the task-agent instance stops/settles after completing its bound work;
- the team remains active;
- the logical member/template can start another task-agent instance later if new runnable tasks arrive;
- completion result and task-plan events are preserved.

Incorrect behavior:

- terminating the whole team;
- interrupting the active completion tool call before the result is returned;
- settling a sibling task-agent instance of the same logical member;
- keeping a task-agent instance running forever after it has no work.

Implementation-wise, auto-exit should be a delayed/safe lifecycle decision, not a side effect inside the task mutation method.

Validation-wise, a live mixed-runtime E2E should prove this lifecycle end state, not merely the task terminal event. The expected proof is: coordinator delegates; task-agent worker updates terminal status; coordinator receives terminal notification; task-agent worker reaches offline/settled/inactive after the idle settlement coordinator runs.

## Suggested Flow

1. Coordinator calls `delegate_tasks`.
2. Server task-delegation service validates the request and records internal delegation/task-state entries.
3. Delegation/task-state event triggers activation coordinator.
4. Runnable tasks are marked `QUEUED`.
5. Target task-agent runtime is started/restored from the logical member template and receives an activation input that includes the full task work packet.
6. Target task-agent starts from that activation message without needing to call `get_my_tasks`.
7. Target task-agent calls `update_task_status(..., in_progress)` when beginning, if the workflow wants explicit in-progress state.
8. Target task-agent does the work.
9. Target task-agent calls `update_task_status({ status: "completed", message, reference_files })`.
10. Task-delegation service updates state and emits terminal/update events.
11. Activation coordinator may activate other independent task records from the same delegation batch according to task-agent concurrency policy; dependent-task activation is deferred out of this simplified first ticket.
12. Lifecycle coordinator records a pending auto-settlement for the completed task-agent instance.
13. When that task-agent run reports idle/current turn settled, lifecycle coordinator terminates/settles that task-agent instance only.

There should be no model-facing `get_my_tasks` in the simplified surface. If recovery needs member-task lookup, keep it as an internal service query used by the framework to resend an activation packet.

## Why This Should Precede General MCP

If MCP is built first, the MCP server would need to know how to mutate in-memory task plans and stop task-agent/member runtimes. That would make MCP the accidental owner of task orchestration.

If server-owned task tools are built first, future MCP support is simple:

- list task tool manifest entries;
- resolve MCP session to team/member context;
- call the same task service;
- return the same serialized result.

## Main Risks

1. **Turn-safety risk:** exiting inside `update_task_status` can drop the tool result or corrupt stream state.
2. **Context-binding risk:** task tools must never mutate an arbitrary team run; they must be bound to the caller's member context.
3. **Backend capability risk:** a backend that cannot settle one member/task-agent instance must not expose supported task delegation, otherwise completed workers remain alive and violate the user's sub-agent model.
4. **Instance identity risk:** keeping runtime registries keyed only by logical `memberRouteKey` prevents parallel same-member task agents and makes settlement ambiguous.
5. **Policy risk:** coordinator auto-exit may be undesirable; make it policy-controlled.
6. **State-placement risk:** live in-memory task plan is enough for first ticket, but future external MCP/restoration may require persistence.
7. **Composite-tool risk:** `assign_task_to` can blur task-plan and messaging ownership if added too early without a clean orchestration boundary.
