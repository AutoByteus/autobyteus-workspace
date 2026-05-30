# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Analyze the first implementation ticket for simplifying and migrating task-management tools out of runtime-local `BaseTool` implementations into server-owned cross-runtime task orchestration. The simplified model should keep only the essential model-facing task tools: `delegate_tasks` for coordinator-to-member work delegation and `update_task_status` for worker reporting. Internally, the system still needs an authoritative delegation ledger/task-state store, but that internal state should not be exposed as a model-facing task-plan polling workflow. Status visibility and coordinator updates should be framework-driven events/notifications rather than a coordinator polling tool. Legacy single-task/query/status tools such as `create_task`, `get_my_tasks`, and model-facing `get_task_plan_status` should not be part of the new happy-path tool surface. The immediate goal is **not** to expose these tools through a general HTTP/streamable MCP endpoint yet. The immediate goal is to establish one authoritative server-side task-delegation command boundary that current and future runtimes can reuse.

The desired orchestration behavior is: a coordinator delegates one or more tasks through `delegate_tasks`; the internal delegation ledger/orchestrator activates a task-agent instance from the target logical member when the member has runnable work; the activation message itself carries the task work packet so the task agent never needs a `get_my_tasks` tool in the normal framework model; the task agent updates task status as it works; when the task agent completes/fails the task, the framework records the status message and reference files when provided, notifies the coordinator with the completion result, and then automatically settles/exits that task-agent instance after its current turn is idle without terminating the whole team or the reusable logical member.

Refined concurrency model: a team member name in `delegate_tasks` identifies a logical member/template, not necessarily one long-lived runtime instance. Runnable delegated tasks should start task-scoped agent instances of that logical member. If multiple independent runnable tasks are delegated to the same logical member, the framework may start multiple task-agent instances of that member in parallel, subject to configured concurrency limits. Each task-agent instance receives its own work packet, reports status for its own task identity, and exits after its terminal task is accepted and its own turn is idle. The logical team member remains available for future task-agent instances.

## Investigation Findings

Current-code investigation shows a split architecture:

- Browser tools already use a server-owned manifest/service/projection pattern under `autobyteus-server-ts/src/agent-tools/browser/*`.
- `send_message_to` has server-side Codex/Claude projections and shared delivery-request helpers, but still has an older local AutoByteus `BaseTool` implementation.
- Task-management tools remain local `autobyteus-ts` `BaseTool`s under `autobyteus-ts/src/task-management/tools/task-tools/*`, mutate `context.customData.teamContext.state.taskPlan`, and are filtered out for mixed AutoByteus standalone team members because they are not cross-runtime-safe. The current set also has avoidable tool-surface duplication: `create_task` is a single-item form of `create_tasks`, and `get_my_tasks` is unnecessary if activation carries the work packet.
- Native AutoByteus task notification already has the core event-driven shape: task creation/status events -> runnable task detection -> mark tasks `QUEUED` -> activate the target member with a system message.
- Current team-manager abstractions have `interruptMember` and team-level `terminate`, but no explicit cross-runtime `terminateMember`/`settleMemberWhenIdle` boundary. Auto-exit should not be performed inline inside `update_task_status`, because doing so could kill the active tool-call turn before the tool result and status events are delivered.
- Downstream implementation/validation inspection on 2026-05-29 found that server-managed Codex/Claude/Mixed paths now have a per-member settlement boundary, while native AutoByteus pure-team settlement currently returns `UNSUPPORTED_RUNTIME_COMMAND`. The requirement decision is that unsupported task-agent/per-member settlement is acceptable only for a backend where task delegation is not exposed/claimed as supported; no supported delegation path may leave a task-agent instance alive after its terminal delegated task.
- Additional code inspection shows the current implementation is still mostly one active runtime per member route key: server-managed managers store member runs in `Map<memberRouteKey, AgentRun>`, and the current activation coordinator groups runnable records by assignee route. The refined task-agent model requires a separate instance identity below the logical member route key so parallel tasks for the same logical member do not collapse into one runtime/session.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + Refactor / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Missing Lifecycle Invariant / Duplicated Runtime Projection Risk
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed if implementation proceeds
- Evidence basis: Task tools are still runtime-local and context-bound; mixed teams filter task-management tools; native task notification has useful activation logic but it is not available as a server-owned task orchestration service across server-managed runtimes; no task-agent instance lifecycle boundary exists.
- Requirement or scope impact: First ticket should create the task-tool server boundary and task-agent instance lifecycle abstraction before any general MCP hosting work.

## Recommendations

Proceed with a first ticket titled approximately: **Server-owned task delegation tools and task-agent instance lifecycle**.

Do not build streamable HTTP/stdio MCP in this ticket. Build reusable server-owned task-delegation command services plus runtime projections for current runtimes. The next ticket can expose those already-owned services through a general first-party MCP server.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: Coordinator creates a list of tasks in a team run using a task tool that is not tied to a single local runtime implementation.
- UC-002: The delegation service records delegated tasks and activates task-agent instances from target logical members across supported team backends.
- UC-003: Target task-agent instance receives task details directly in the activation message and can start work without any `get_my_tasks` model-facing tool.
- UC-004: Target task-agent instance updates task status and may include an optional status message plus reference files using the same server-owned task command semantics.
- UC-005: When a task-agent instance completes/fails its delegated task and has no remaining work bound to that same instance, the task-agent runtime automatically exits/settles after the current turn is safe to finish.
- UC-006: Multiple independent task items in one `delegate_tasks` call are recorded separately and activated according to task-agent concurrency policy.
- UC-007: Coordinator receives a framework-generated notification when a delegated task reaches a terminal status, including task identity, target member, status, optional message, and reference files.
- UC-008: Multiple independent runnable tasks delegated to the same logical member can run as separate task-agent instances, so each task can progress and exit independently.

## Out of Scope

- General first-party MCP server over HTTP/stdio/streamable MCP.
- One static MCP config/address for Antigravity/Kimi/other future runtimes.
- Reworking browser tools, media tools, or publish tools.
- Durable/persistent task-plan storage unless required by implementation feasibility.
- Killing/terminating the entire team run when one member finishes a task.
- Model-facing dependency authoring or dependent-task activation. A later ticket may design dependency semantics intentionally, but the first simplified schema does not expose `dependencies`.
- Model-facing task selectors on `update_task_status`; the caller's bound task-agent instance context identifies the task.
- Model-facing task names/titles as separate `delegate_tasks` fields. The server generates internal task identity and may derive a display label from the description when needed.

## Functional Requirements

- REQ-001: Provide one server-owned task-delegation service or command boundary that owns parsing, validation, delegation record creation, status mutation, result formatting, and event emission for the simplified model-facing surface.
- REQ-002: Maintain an internal authoritative delegation ledger/task-state store for correlation, activation, completion notification, optional status messages, reference files, audit/history, and auto-settlement decisions.
- REQ-003: Expose task tools to current supported runtime projections from the server-owned boundary rather than duplicating behavior per runtime.
- REQ-004: Bind every task tool call to an authoritative `teamRunId` and current member identity; reject calls without valid team/member context.
- REQ-005: Activation messages must include the delegated runnable task details as a work packet, so a task-agent instance can start work without any `get_my_tasks` tool call.
- REQ-006: The new model-facing task tool surface must omit `get_my_tasks`; any task-agent lookup/resend needed for activation/recovery must be internal framework/service behavior, not an exposed worker tool.
- REQ-007: The new model-facing task creation surface must omit `create_task`/`create_tasks`; single or multiple task delegation must use `delegate_tasks` with one or more task items.
- REQ-008: `update_task_status` must not expose a model-facing task selector. The service must resolve the task from the caller's bound task-agent instance/run identity, reject calls from contexts not bound to exactly one active delegated task, and record only the new status plus optional `message` and `reference_files`. `task_id` remains internal ledger/event metadata only; there is no model-facing `task_name` update selector.
- REQ-009: Delegating multiple tasks in one `delegate_tasks` call must create independent delegated task records and activate each runnable target member according to the task-agent concurrency policy. Model-facing dependency fields are out of scope for the simplified first ticket.
- REQ-010: Task completion/failure must trigger a framework-generated coordinator notification that includes the task identity, target member, terminal status, optional message, and reference files.
- REQ-011: Task-agent auto-exit must run only after the current task-agent turn/tool call can safely complete, and only when no queued/in-progress/runnable delegated work remains bound to that task-agent instance. In the default one-task-per-instance model, terminal completion/failure of that one task plus idle is sufficient.
- REQ-012: Task-agent auto-exit must not stop the coordinator/root logical member unless explicitly allowed by policy, and must never terminate the whole team run as a side effect of a single task completion.
- REQ-013: Delegated task-agent instances must receive general task-lifecycle protocol instructions in their runtime instructions/system/developer context and specific task details in each activation message/work packet.
- REQ-014: The design must decide whether `assign_task_to` is included in this ticket or deferred as a composite orchestration tool, because it mixes task creation and direct messaging; default recommendation is to omit/defer it from the simplified first-ticket surface.
- REQ-015: Every runtime/backend path that exposes `delegate_tasks`/`update_task_status` as a supported delegation workflow must support task-agent instance settlement and must settle/exit a task-agent instance after its terminal task once that instance is idle and has no work bound to it. A backend whose per-instance/per-member settlement returns unsupported must gate task-delegation exposure off or implement settlement before being considered supported.
- REQ-016: Runtime instructions, worker work packets, docs, and acceptance text for supported delegation paths must use mandatory wording (`must`/`will settle or exit`) rather than optional wording (`may settle`) for final-task worker settlement.
- REQ-017: The delegation model must distinguish a logical team member/template identity from task-agent instance identity. `member_name`/logical member route selects the template; each activated delegated task gets a stable task-agent instance/run identity.
- REQ-018: The default activation unit for delegated work is one runnable task -> one task-agent instance. Multiple runnable tasks assigned to the same logical member must not be forced into one shared worker runtime unless an explicit batching/concurrency policy says so.
- REQ-019: The team runtime must support, or explicitly gate off, multiple concurrent task-agent instances for the same logical member in supported delegation paths. Instance status, tool context, events, settlement, and cleanup must be keyed by task-agent instance identity, not only by logical member route key.
- REQ-020: `update_task_status` must validate that the calling task-agent instance is bound to the task being updated, so parallel instances of the same logical member cannot accidentally complete each other's tasks.
- REQ-021: Each `delegate_tasks` task item must keep the model-facing schema intentionally small. The only task-definition fields are `member_name`, required rich `description`, and optional `reference_files`. Each task item represents ready-to-run work for the target member; dependency/ordering semantics are not accepted in the schema. The server generates internal task identity and may derive any display label from the description; all detailed instructions, done conditions, expected output guidance, constraints, and context belong inside `description`.

## Acceptance Criteria

- AC-001: Code no longer requires task-management tools to be implemented only as local `autobyteus-ts` `BaseTool`s for team use; a server-owned task-delegation service/manifest boundary exists.
- AC-002: In a mixed/server-managed team, the coordinator can delegate tasks and target task-agent instances can be activated from internal delegation/task-state events.
- AC-003: Target task-agent instances receive activation messages containing the rich description, optional reference files, and status-update instructions, and can update status without a `get_my_tasks` tool being exposed.
- AC-004: `create_task`/`create_tasks` are not exposed in the new model-facing task surface; delegating one task is done through `delegate_tasks` with a one-item list.
- AC-005: Delegating multiple independent tasks in one call creates separate task records and activates the relevant task-agent instances without requiring separate `create_task` calls.
- AC-006: Completing or failing a task notifies the coordinator with task identity, target member, status, optional message, and reference files without requiring the coordinator to call `get_task_plan_status`.
- AC-007: A task-agent instance that finishes its bound task is automatically settled/exited after its current turn is idle/complete; the tool result is still delivered and task-delegation events/coordinator notifications still appear.
- AC-008: A task-agent instance with additional work explicitly bound to the same instance is not auto-exited after a single task completion; sibling task-agent instances of the same logical member are not settled as a side effect.
- AC-009: A logical member whose current task-agent instance exits remains available as a reusable template for future delegated tasks.
- AC-010: Invalid or unbound task tool calls fail clearly without mutating any internal delegation state, including `update_task_status` calls that try to pass task selectors such as `task_id` or `task_name`.
- AC-011: Worker activation includes both general lifecycle instructions and task-specific details, including the fact that `update_task_status` is bound to the current task-agent instance and does not require a task selector.
- AC-012: Tests cover task delegation, internal ledger correlation, runnable activation with work-packet content, status update, coordinator notification, multi-task activation, and auto-settlement gating.
- AC-013: If `assign_task_to` is deferred or omitted, the implementation records that task creation and direct message delivery remain separate canonical services.
- AC-014: Live mixed-runtime E2E coverage must assert that the Codex task-agent instance reaches an offline/settled/inactive state after terminal `update_task_status` completion, not only that the terminal notification reached the coordinator.
- AC-015: Native AutoByteus pure-team task delegation is either not exposed as a supported path until task-agent/per-member settlement exists, or its backend settlement support is implemented and validated. Exposing task delegation while settlement returns `UNSUPPORTED_RUNTIME_COMMAND` is a requirement gap.
- AC-016: Model-facing task-delegation instructions and durable docs do not say that the framework "may settle" the final task agent; for supported paths they say the framework "will" or "must" settle/exit the task-agent instance when the terminal-task and idle gates pass.
- AC-017: When two independent runnable tasks are delegated to the same logical member and concurrency policy allows two workers, the framework starts two distinct task-agent instances with distinct instance/run identities and task-specific packets.
- AC-018: Each parallel same-member task-agent instance can call `update_task_status` for its own task and settle/exit independently without settling the other active instance or the logical member template.
- AC-019: Team/member status and task-delegation events identify both the logical member and the task-agent instance so UI/history/debug output can distinguish parallel workers.
- AC-020: If a backend cannot support multiple same-member task-agent instances, that backend must expose a clear concurrency limit or gate the parallel task-agent feature rather than silently serializing/merging tasks in a way that violates the task-agent model.
- AC-021: `delegate_tasks` rejects any task item that lacks a non-empty rich `description`; a task with only `member_name` is invalid. Schemas/projections do not expose superseded fields such as `task_name`, `dependencies`, `completion_criteria`, and `expected_deliverables`, and the parser rejects stale calls that include them.
- AC-022: The task-agent activation packet preserves the delegated task's rich description and optional reference file details so the worker does not need to query another task plan before starting. Separate `dependencies`, `completion_criteria`, and `expected_deliverables` fields are not part of the model-facing schema; dependent follow-up work is delegated later after completion notification.

## Constraints / Dependencies

- Must fit the existing team-run manager/backends architecture in `autobyteus-server-ts/src/agent-team-execution/*`.
- Must preserve the existing native AutoByteus task plan/domain model unless an implementation blocker proves otherwise.
- Must not put business semantics into future MCP transport code.
- Must account for active tool-call/turn lifecycle so auto-exit does not interrupt the member while it is reporting completion.
- Must not expose the new model-facing delegation tools through a runtime/backend path that cannot satisfy the mandatory final-worker settlement lifecycle.
- Must avoid using logical `memberRouteKey` as the sole active-run key for task-agent runtimes once parallel same-member task instances are supported.

## Assumptions

- "Exit automatically" means task-agent runtime settlement/termination/going offline after safe completion of the current assigned work, not terminating the logical member template or the entire team run.
- A logical member can start new task-agent instances later if new runnable tasks arrive; normal member conversations can still be created/restored later if messages arrive, matching existing lazy member activation patterns.
- The first ticket can add server-owned task-tool projections without needing to solve external MCP config for future runtimes.
- The native AutoByteus pure-team backend may remain outside the supported delegation-surface set for this ticket only if the implementation gates/hides task delegation there; if it is exposed, pure-team task-agent/per-member settlement becomes in scope.
- Logical team members are reusable worker templates. A task-agent instance is the short-lived runtime/session created to execute one delegated task for that template.
- Parallel same-member task-agent instances may be constrained by a configurable concurrency limit, but the design must not collapse the identity model back to one active runtime per logical member.

## Risks / Open Questions

- Exact naming of the member lifecycle API: `terminateMember`, `settleMemberWhenIdle`, or a policy-based `requestMemberAutoSettlement`.
- Whether the internal delegation ledger/task-state store should remain in live team-run memory for this ticket or be promoted to server-persisted state later.
- Whether an internal, non-model-facing member task lookup is needed for recovery/resend behavior after runtime restart; this should not reintroduce a worker-visible `get_my_tasks` tool.
- Whether coordinator notifications should be delivered as a direct system/inter-agent message to the coordinator member, a team event only, or both; default recommendation is both where a live coordinator exists.
- Whether the internal existing `TaskPlan` class should be renamed now to `DelegationLedger`/`TaskLedger`, or wrapped by a new `TaskDelegationService` first and renamed later. Default recommendation: keep storage migration minimal in first ticket but expose only delegation semantics above it.
- Whether `assign_task_to` should be shipped in the first task-tool migration or deferred because it composes task creation plus messaging. Default recommendation: omit/defer it for the simplified surface.
- Resolved 2026-05-29 clarification: worker settlement is a hard sub-agent lifecycle invariant for supported delegation paths, not an optional optimization. API/E2E should treat missing final-worker offline/settled proof as a failing acceptance criterion.
- Resolved 2026-05-29 clarification: same-member parallel delegation should be represented as multiple task-agent instances of the same logical member/template. The open implementation question is the initial per-member concurrency default/limit, not whether instance identity exists.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-003, REQ-004
- UC-002: REQ-002, REQ-005, REQ-009
- UC-003: REQ-001, REQ-004, REQ-005, REQ-006
- UC-004: REQ-001, REQ-004, REQ-008
- UC-005: REQ-011, REQ-012, REQ-015, REQ-016
- UC-006: REQ-002, REQ-009
- UC-008: REQ-017, REQ-018, REQ-019, REQ-020

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the server-owned task-delegation tool boundary.
- AC-002 validates coordinator-to-member task activation.
- AC-003 validates task-details-in-activation behavior and removal of worker-visible `get_my_tasks`.
- AC-004 validates removal of duplicate `create_task`.
- AC-005 validates multi-task delegation without exposing legacy creation tools.
- AC-006 validates event-driven coordinator notification instead of polling.
- AC-007 through AC-009 validate safe auto-exit behavior.
- AC-010 validates context binding and safety.
- AC-011 validates activation instruction content.
- AC-012 validates durable executable coverage.
- AC-013 validates explicit handling of the composite assignment tool.
- AC-014 validates live mixed-runtime sub-agent exit semantics.
- AC-015 validates that unsupported native task-agent/per-member settlement is not silently presented as a supported delegation path.
- AC-016 validates mandatory worker-exit wording in runtime/docs instructions.
- AC-017 through AC-020 validate task-agent instance identity and parallel same-member delegation behavior.
- AC-021 and AC-022 validate that delegated tasks are real work packets, not name-only records, while keeping the model-facing schema minimal.

## Approval Status

Approved by user for architecture review on 2026-05-29. Revised scope: server-owned task-delegation tools (`delegate_tasks`, `update_task_status`), coordinator completion notification, internal delegation ledger, work-packet activation, and safe task-agent auto-exit first; general MCP exposure later. Downstream clarification on 2026-05-29: final task-agent settlement is mandatory for every supported delegation runtime path; unsupported native pure-team settlement must be gated or implemented before native pure-team delegation is claimed supported. Additional user refinement on 2026-05-29: logical members should behave as reusable task-agent templates, allowing multiple task-agent instances of the same member for parallel delegated tasks. Schema refinement on 2026-05-29: the `delegate_tasks` model-facing schema must remain minimal: `member_name`, rich `description`, and optional `reference_files`; no separate `task_name`, `dependencies`, `completion_criteria`, or `expected_deliverables` fields. `update_task_status` exposes no task selector and records only `status`, optional `message`, and optional `reference_files`; the current task is inferred from caller task-agent instance context. Dependent-task authoring/activation is deferred out of this first ticket.
