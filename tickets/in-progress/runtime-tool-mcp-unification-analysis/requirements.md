# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Analyze the first implementation ticket for simplifying and migrating task-management tools out of runtime-local `BaseTool` implementations into server-owned cross-runtime task orchestration. The simplified model should keep only explicit intent-focused model-facing task tools: `delegate_tasks` for authorized-agent-to-member work delegation, `mark_task_completed` / `mark_task_failed` for task-agent worker result reporting, and `accept_task` for original-delegator acceptance. Internally, the system still needs an authoritative delegation ledger/task-state store, but that internal state should not be exposed as a model-facing task-plan polling workflow. Status visibility and delegator/coordinator updates should be framework-driven events/notifications rather than a coordinator polling tool. Legacy single-task/query/status tools such as `create_task`, `create_tasks`, `get_my_tasks`, model-facing `get_task_plan_status`, and generic model-facing `update_task_status` should not be part of the new happy-path tool surface. The immediate goal is **not** to expose these tools through a general HTTP/streamable MCP endpoint yet. The immediate goal is to establish one authoritative server-side task-delegation command boundary that current and future runtimes can reuse.

The desired orchestration behavior is: any authorized active team agent can delegate one or more tasks through `delegate_tasks`; the internal delegation ledger/orchestrator records that exact delegator identity and activates a task-agent instance from the target logical member when the member has runnable work; the activation message itself carries the task work packet so the task agent never needs a `get_my_tasks` tool in the normal framework model; the framework derives internal active/running state from task-agent activation/runtime status events; when the task agent calls `mark_task_completed`, the framework records the completion message and reference files, marks the task as awaiting delegator acceptance, notifies the original delegator with the generated `task_id`, targetable `task_agent_id`, completion result details, and team/coordinator-visible event history, and keeps the task-agent instance addressable. If the task agent calls `mark_task_failed`, the framework records the failure message/reference files and notifies the original delegator with the same task/task-agent identity. If the delegator needs changes after completion, it can use the existing `send_message_to` path targeted at the `task_agent_id`. If the delegator accepts the result, it calls `accept_task` with the notification-provided `task_id`; only then does the framework settle/exit that task-agent instance after its current turn is idle without terminating the whole team or the reusable logical member.

Refined concurrency model: a team member name in `delegate_tasks` identifies a logical member/template, not necessarily one long-lived runtime instance. Runnable delegated tasks should start task-scoped agent instances of that logical member. If multiple independent runnable tasks are delegated to the same logical member, the framework may start multiple task-agent instances of that member in parallel, subject to configured concurrency limits. Each task-agent instance receives its own work packet, reports status for its own task identity, and exits after its worker-reported successful completion is accepted by the original delegator and its own turn is idle. The logical team member remains visible/available as a stable team member/template for future task-agent instances; active task-agent instances may appear as indented children underneath that logical member. After a task-agent instance settles, only the task/task-agent child disappears from active UI; the logical member/template parent can remain.

Frontend lifecycle refinement: in supported browser/frontend team-run UX, the preferred presentation is a stable logical member/template row with transient delegated-task/task-agent children indented under it. Concrete task-agent instances must be visible as transient sub-agent/task children while active and must disappear from active UI after settlement. The logical member/template parent may remain visible so users can see the team structure and future delegation targets, but it must not contain the task-agent's work packet/tool activity as its normal conversation and must not be presented as the completed task-agent execution entity. A standalone or ambiguous `worker • Offline` execution row that represents the completed task-agent is not acceptable task-agent exit presentation.

## Investigation Findings

Current-code investigation shows a split architecture:

- Browser tools already use a server-owned manifest/service/projection pattern under `autobyteus-server-ts/src/agent-tools/browser/*`.
- `send_message_to` has server-side Codex/Claude projections and shared delivery-request helpers, but still has an older local AutoByteus `BaseTool` implementation.
- Task-management tools remain local `autobyteus-ts` `BaseTool`s under `autobyteus-ts/src/task-management/tools/task-tools/*`, mutate `context.customData.teamContext.state.taskPlan`, and are filtered out for mixed AutoByteus standalone team members because they are not cross-runtime-safe. The current set also has avoidable tool-surface duplication: `create_task` is a single-item form of `create_tasks`, and `get_my_tasks` is unnecessary if activation carries the work packet.
- Native AutoByteus task notification already has the core event-driven shape: task creation/status events -> runnable task detection -> mark tasks `QUEUED` -> activate the target member with a system message.
- Current team-manager abstractions have `interruptMember` and team-level `terminate`, but no explicit cross-runtime `terminateMember`/`settleMemberWhenIdle` boundary. Auto-exit should not be performed inline inside worker result or acceptance tool execution, because doing so could kill the active tool-call turn before the tool result and status events are delivered.
- Downstream implementation/validation inspection on 2026-05-29 found that server-managed Codex/Claude/Mixed paths now have a per-member settlement boundary, while native AutoByteus pure-team settlement currently returns `UNSUPPORTED_RUNTIME_COMMAND`. The requirement decision is that unsupported task-agent/per-member settlement is acceptable only for a backend where task delegation is not exposed/claimed as supported; no supported delegation path may leave a task-agent instance alive after accepted successful delegated work once the task-agent is idle.
- Additional code inspection shows the current implementation is still mostly one active runtime per member route key: server-managed managers store member runs in `Map<memberRouteKey, AgentRun>`, and the current activation coordinator groups runnable records by assignee route. The refined task-agent model requires a separate instance identity below the logical member route key so parallel tasks for the same logical member do not collapse into one runtime/session.
- API/E2E browser validation on 2026-05-30, user follow-up on 2026-05-31, and user confirmation on 2026-06-01 found/refined a frontend projection/semantics gap: backend task-agent identity and settlement can be present while the UI still shows only a `worker • Offline` row and/or embeds task-agent activity in the logical worker conversation. Supported frontend UX must consume task-agent identity, render the active task-agent as a transient child under the logical member/template parent, remove that child after settlement, and keep task-agent history separate from the logical member's normal conversation.

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

- UC-001: An authorized active team agent creates a list of tasks in a team run using a task tool that is not tied to a single local runtime implementation.
- UC-002: The delegation service records delegated tasks and activates task-agent instances from target logical members across supported team backends.
- UC-003: Target task-agent instance receives task details directly in the activation message and can start work without any `get_my_tasks` model-facing tool.
- UC-004: Target task-agent instance reports completion or failure and may include a required result message plus optional reference files using server-owned task command semantics.
- UC-005: When a task-agent instance's worker-reported successful completion is accepted by the original delegator and no remaining work is bound to that same instance, the task-agent runtime automatically exits/settles after the current turn is safe to finish. Failure settlement may follow the explicit failure policy without interrupting status delivery.
- UC-006: Multiple independent task items in one `delegate_tasks` call are recorded separately and activated according to task-agent concurrency policy.
- UC-007: The original delegator receives a framework-generated notification when a delegated task reports completion/failure, including task identity, target member, task-agent identity, status, optional message, and reference files; the result is also visible through team/coordinator event history.
- UC-008: Multiple independent runnable tasks delegated to the same logical member can run as separate task-agent instances, so each task can progress and exit independently.
- UC-009: Frontend users can see delegated task-agent instances as transient sub-agent entities while active, distinct from logical team member templates, and all task-delegation-only worker execution entities disappear from active UI after settlement while durable completed-task/task-agent history remains available.
- UC-010: A non-coordinator team member or task-agent instance that is authorized to use `delegate_tasks` can delegate work to another team member; the result routes back to that delegator identity rather than assuming the root coordinator initiated the task.

## Out of Scope

- General first-party MCP server over HTTP/stdio/streamable MCP.
- One static MCP config/address for Antigravity/Kimi/other future runtimes.
- Reworking browser tools, media tools, or publish tools.
- Durable/persistent task-plan storage unless required by implementation feasibility.
- Killing/terminating the entire team run when one member finishes a task.
- Model-facing dependency authoring or dependent-task activation. A later ticket may design dependency semantics intentionally, but the first simplified schema does not expose `dependencies`.
- Model-facing task selectors on worker result tools; the caller's bound task-agent instance context identifies the task for `mark_task_completed` and `mark_task_failed`.
- Model-facing task names/titles as separate `delegate_tasks` fields. The server generates internal task identity and may derive a display label from the description when needed.
- Redesigning unrelated frontend team-layout modes beyond the task-agent lifecycle projection needed to avoid representing a settled task-agent as a lingering active/offline worker row.

## Functional Requirements

- REQ-001: Provide one server-owned task-delegation service or command boundary that owns parsing, validation, delegation record creation, worker result mutation, acceptance mutation, result formatting, and event emission for the simplified model-facing surface.
- REQ-002: Maintain an internal authoritative delegation ledger/task-state store for correlation, activation, completion notification, result messages, reference files, audit/history, and auto-settlement decisions.
- REQ-003: Expose task tools to current supported runtime projections from the server-owned boundary rather than duplicating behavior per runtime.
- REQ-004: Bind every task tool call to an authoritative `teamRunId` and current member identity; reject calls without valid team/member context.
- REQ-005: Activation messages must include the delegated runnable task details as a work packet, so a task-agent instance can start work without any `get_my_tasks` tool call.
- REQ-006: The new model-facing task tool surface must omit `get_my_tasks`; any task-agent lookup/resend needed for activation/recovery must be internal framework/service behavior, not an exposed worker tool.
- REQ-007: The new model-facing task creation surface must omit `create_task`/`create_tasks`; single or multiple task delegation must use `delegate_tasks` with one or more task items.
- REQ-008: The model-facing task result/acceptance tools must be intent-specific, not a generic status enum. `mark_task_completed` and `mark_task_failed` are task-agent-only worker report tools; the service must resolve the task from the caller's bound task-agent instance/run identity, reject model-facing task selectors, and accept only `message` plus optional `reference_files`. The system must mark internal activation/running state from framework lifecycle events rather than requiring the LLM to call an `in_progress` tool. `accept_task` is original-delegator-only; it accepts the system-generated `task_id` from the completion notification plus optional `message`, and authorization must prove that the caller is the original delegator for that task. There is no model-facing `task_name` update selector and no model-facing generic `status` field.
- REQ-009: Delegating multiple tasks in one `delegate_tasks` call must create independent delegated task records and activate each runnable target member according to the task-agent concurrency policy. Model-facing dependency fields are out of scope for the simplified first ticket.
- REQ-010: Task-agent self-reported completion/failure must trigger a framework-generated notification to the original delegator when reachable, plus a team/coordinator-visible event/history record. The notification/event must include the generated `task_id`, target logical member, targetable `task_agent_id`/task-agent run identity, reported status, optional message, and reference files.
- REQ-011: For self-reported completed work, task-agent auto-exit must not run merely because the task-agent calls `mark_task_completed`. The record enters an awaiting-acceptance state, and the task-agent remains addressable for `send_message_to` revisions. Auto-exit for successful work must run only after the original delegator accepts the task via `accept_task(task_id)` and after the current task-agent turn/tool call can safely complete. Failure handling after `mark_task_failed` may settle according to explicit failure policy, but must not interrupt active tool-result delivery.
- REQ-012: Task-agent auto-exit must not stop the coordinator/root logical member unless explicitly allowed by policy, and must never terminate the whole team run as a side effect of a single task completion.
- REQ-013: Delegated task-agent instances must receive general task-lifecycle protocol instructions in their runtime instructions/system/developer context and specific task details in each activation message/work packet.
- REQ-014: The design must decide whether `assign_task_to` is included in this ticket or deferred as a composite orchestration tool, because it mixes task creation and direct messaging; default recommendation is to omit/defer it from the simplified first-ticket surface.
- REQ-015: Every runtime/backend path that exposes `delegate_tasks` plus worker result/acceptance tools as a supported delegation workflow must support task-agent instance settlement and must settle/exit a task-agent instance after its task is accepted by the original delegator, once that instance is idle and has no work bound to it. A backend whose per-instance/per-member settlement returns unsupported must gate task-delegation exposure off or implement settlement before being considered supported.
- REQ-016: Runtime instructions, worker work packets, docs, and acceptance text for supported delegation paths must use mandatory wording (`must`/`will settle or exit`) rather than optional wording (`may settle`) for final-task worker settlement.
- REQ-017: The delegation model must distinguish a logical team member/template identity from task-agent instance identity. `member_name`/logical member route selects the template; each activated delegated task gets a stable task-agent instance/run identity.
- REQ-018: The default activation unit for delegated work is one runnable task -> one task-agent instance. Multiple runnable tasks assigned to the same logical member must not be forced into one shared worker runtime unless an explicit batching/concurrency policy says so.
- REQ-019: The team runtime must support, or explicitly gate off, multiple concurrent task-agent instances for the same logical member in supported delegation paths. Instance status, tool context, events, settlement, and cleanup must be keyed by task-agent instance identity, not only by logical member route key.
- REQ-020: `mark_task_completed` and `mark_task_failed` must validate that the calling task-agent instance is bound to the task being reported, so parallel instances of the same logical member cannot accidentally complete/fail each other's tasks.
- REQ-021: Each `delegate_tasks` task item must keep the model-facing schema intentionally small. The only task-definition fields are `member_name`, required rich `description`, and optional `reference_files`. Each task item represents ready-to-run work for the target member; dependency/ordering semantics are not accepted in the schema. The server generates internal task identity and may derive any display label from the description; all detailed instructions, done conditions, expected output guidance, constraints, and context belong inside `description`.
- REQ-022: Frontend team-run presentation for supported task-delegation paths must distinguish team-definition member templates from concrete execution entities. A task-agent instance must have its own transient frontend execution entity keyed by concrete task-agent identity (`task_agent_run_id`/`task_agent_instance_id`) and associated with the selected logical `member_name`/route.
- REQ-023: A frontend task-agent entity must appear in the active team/member presentation when the task-agent activation/status projection is observed, remain visible while the concrete instance is active/running/awaiting-acceptance/idle-before-settlement, and be removed from active member/agent lists after original-delegator acceptance plus backend settlement/offline cleanup for successful work.
- REQ-024: The frontend may keep the logical member/template visible as a stable parent row/card in the team view, and active delegated task-agent instances may be shown as indented children underneath that parent. After the final task-agent instance for task-delegation-only work settles, the task-agent/task child and any task-specific execution row/card/header must disappear from active UI. The remaining logical member parent must be visually/semantically distinguishable as a reusable member/template/available assignee, must not contain the task-agent packet/activity as its normal conversation, and must not be the visible representation of the completed task-agent.
- REQ-025: Task-agent work packets, streaming segments, tool calls, status updates, and completed-task history must be scoped in the frontend to the task-agent instance/completed task-agent history entity when task-agent identity is present. They must not be embedded into the logical member's normal conversation in a way that implies the sub-agent is still alive or that the logical worker row is the completed task-agent.
- REQ-026: Multiple concurrent task-agent instances for the same logical member must render as distinguishable transient frontend execution entities, and settling/removing one instance must not remove sibling active task-agent instances.
- REQ-027: A logical member may still appear as a normal conversation participant when it has been activated through user/direct messaging (`send_message_to` or equivalent non-task conversation). That normal conversation surface must be labeled separately from task-agent execution and must not inherit task-agent work packets/history unless the task-agent itself is being viewed through completed task-agent history.
- REQ-028: `delegate_tasks` must not be hard-coded as coordinator-only. Any active team agent context that has the tool exposed and passes authorization policy may delegate to an allowed target member. The ledger must store the exact delegator identity, including task-agent instance/run identity when the delegator is itself a task-agent, so completion/failure results can route back to the correct delegator and remain visible in team/coordinator history.
- REQ-029: The task-delegation workflow must avoid generic status-update/review tools. Worker result reporting is split into `mark_task_completed` and `mark_task_failed`; delegator acceptance uses explicit `accept_task`. If the delegator needs changes before acceptance, the existing `send_message_to` tool must be able to target the live task-agent identity supplied in the completion notification so the same task-agent can revise and call `mark_task_completed` again.

## Acceptance Criteria

- AC-001: Code no longer requires task-management tools to be implemented only as local `autobyteus-ts` `BaseTool`s for team use; a server-owned task-delegation service/manifest boundary exists.
- AC-002: In a mixed/server-managed team, an authorized active team agent can delegate tasks and target task-agent instances can be activated from internal delegation/task-state events.
- AC-003: Target task-agent instances receive activation messages containing the rich description, optional reference files, and result-reporting instructions, and can report completion/failure without a `get_my_tasks` tool being exposed.
- AC-004: `create_task`/`create_tasks` are not exposed in the new model-facing task surface; delegating one task is done through `delegate_tasks` with a one-item list.
- AC-005: Delegating multiple independent tasks in one call creates separate task records and activates the relevant task-agent instances without requiring separate `create_task` calls.
- AC-006: Completing or failing a task notifies the original delegator when reachable, and records a team/coordinator-visible event with task identity, target member, status, optional message, and reference files, without requiring polling through `get_task_plan_status`.
- AC-007: A task-agent instance that calls `mark_task_completed` remains visible/addressable in an awaiting-acceptance state after its tool result is delivered and original-delegator notification appears; after the original delegator accepts that `task_id` through `accept_task`, the task-agent is settled/exited once idle.
- AC-008: A task-agent instance with additional work explicitly bound to the same instance is not auto-exited after a single task completion; sibling task-agent instances of the same logical member are not settled as a side effect.
- AC-009: A logical member whose current task-agent instance exits remains available as a reusable template for future delegated tasks.
- AC-010: Invalid or unbound task tool calls fail clearly without mutating any internal delegation state, including task-agent `mark_task_completed`/`mark_task_failed` calls from unbound contexts or with task selectors, and delegator `accept_task` calls whose `task_id` is missing, unknown, not awaiting acceptance, or not owned by that delegator. `task_name` selectors and generic `status` fields are never accepted.
- AC-011: Worker activation includes both general lifecycle instructions and task-specific details, including the fact that `mark_task_completed` / `mark_task_failed` are bound to the current task-agent instance and do not require a task selector.
- AC-012: Tests cover task delegation, internal ledger correlation, runnable activation with work-packet content, worker result reporting, original-delegator notification, acceptance, multi-task activation, and auto-settlement gating.
- AC-013: If `assign_task_to` is deferred or omitted, the implementation records that task creation and direct message delivery remain separate canonical services.
- AC-014: Live mixed-runtime E2E coverage must assert that the Codex task-agent instance remains addressable after self-reported completion, the original delegator receives a completion notification containing `task_id` and task-agent identity, and the task-agent reaches offline/settled/inactive only after the original delegator accepts the task.
- AC-015: Native AutoByteus pure-team task delegation is either not exposed as a supported path until task-agent/per-member settlement exists, or its backend settlement support is implemented and validated. Exposing task delegation while settlement returns `UNSUPPORTED_RUNTIME_COMMAND` is a requirement gap.
- AC-016: Model-facing task-delegation instructions and durable docs do not say that the framework "may settle" the final task agent; for supported paths they say the framework "will" or "must" settle/exit the task-agent instance when the accepted-successful-task and idle gates pass.
- AC-017: When two independent runnable tasks are delegated to the same logical member and concurrency policy allows two workers, the framework starts two distinct task-agent instances with distinct instance/run identities and task-specific packets.
- AC-018: Each parallel same-member task-agent instance can call `mark_task_completed` or `mark_task_failed` for its own task and settle/exit independently without settling the other active instance or the logical member template.
- AC-019: Team/member status and task-delegation events identify both the logical member and the task-agent instance so UI/history/debug output can distinguish parallel workers.
- AC-020: If a backend cannot support multiple same-member task-agent instances, that backend must expose a clear concurrency limit or gate the parallel task-agent feature rather than silently serializing/merging tasks in a way that violates the task-agent model.
- AC-021: `delegate_tasks` rejects any task item that lacks a non-empty rich `description`; a task with only `member_name` is invalid. Schemas/projections do not expose superseded fields such as `task_name`, `dependencies`, `completion_criteria`, and `expected_deliverables`, and the parser rejects stale calls that include them.
- AC-022: The task-agent activation packet preserves the delegated task's rich description and optional reference file details so the worker does not need to query another task plan before starting. Separate `dependencies`, `completion_criteria`, and `expected_deliverables` fields are not part of the model-facing schema; dependent follow-up work is delegated later after completion notification.
- AC-023: Browser/frontend validation for a supported task-delegation run shows the logical member/template as a stable parent/available member and shows a separate transient task-agent/task row/card/entity for the delegated worker while the task-agent instance is active, preferably indented under the logical member parent.
- AC-024: After delegator acceptance plus backend settlement/offline cleanup, the task-agent/task child row/card/entity and any task-specific worker execution row/card/header disappear from active team/member/running-agent UI. The logical member/template parent may remain visible as the stable member/available assignee. The completion result remains available through task-delegation activity/history/notification rather than as a lingering active/offline task-agent row.
- AC-025: Browser/frontend validation must not show `worker • Offline` or an equivalent row as the completed task-agent execution participant after a task-delegation-only worker settles. If a logical worker parent remains visible, it is labeled or structured as a member template/available assignee and does not contain the task-agent activation packet, tool activity, or completed-task conversation as a normal member conversation.
- AC-026: With two concurrent delegated tasks for the same logical member, frontend validation can distinguish two task-agent execution entities and observes that settling one removes only that entity while the sibling remains if still active.
- AC-027: If a logical worker also has a separate direct-message/member conversation, frontend validation labels that conversation separately from task-agent execution and preserves task-agent activity under task-agent/completed-task history rather than under the normal member conversation.
- AC-028: A non-coordinator member or task-agent instance with `delegate_tasks` access can delegate to another member; completion notification targets that original delegator identity and does not incorrectly assume the root coordinator is the delegator, while the result remains visible in team/coordinator history.
- AC-029: No generic review/status-update tool is exposed. The worker reports success with `mark_task_completed` and failure with `mark_task_failed`; the delegator accepts completed work through `accept_task(task_id)`. If the delegator requests changes instead, `send_message_to` can target the completion notification's task-agent identity, the same task-agent receives the revision request, and it can call `mark_task_completed` again.

## Constraints / Dependencies

- Must fit the existing team-run manager/backends architecture in `autobyteus-server-ts/src/agent-team-execution/*`.
- Must preserve the existing native AutoByteus task plan/domain model unless an implementation blocker proves otherwise.
- Must not put business semantics into future MCP transport code.
- Must account for active tool-call/turn lifecycle so auto-exit does not interrupt the member while it is reporting completion.
- Must not expose the new model-facing delegation tools through a runtime/backend path that cannot satisfy the mandatory final-worker settlement lifecycle.
- Must avoid using logical `memberRouteKey` as the sole active-run key for task-agent runtimes once parallel same-member task instances are supported.
- Frontend active-run projection must avoid using logical `memberRouteKey` as the sole key for task-agent UI state; task-agent rows/cards and routed conversations must use concrete task-agent identity.

## Assumptions

- "Exit automatically" means task-agent runtime settlement/termination/going offline after the task-agent's self-reported completion is accepted by the original delegator and the current turn is safe to finish, not terminating the logical member template or the entire team run.
- A logical member can start new task-agent instances later if new runnable tasks arrive; normal member conversations can still be created/restored later if messages arrive, matching existing lazy member activation patterns.
- The first ticket can add server-owned task-tool projections without needing to solve external MCP config for future runtimes.
- The native AutoByteus pure-team backend may remain outside the supported delegation-surface set for this ticket only if the implementation gates/hides task delegation there; if it is exposed, pure-team task-agent/per-member settlement becomes in scope.
- Logical team members are reusable worker templates. A task-agent instance is the short-lived runtime/session created to execute one delegated task for that template.
- Parallel same-member task-agent instances may be constrained by a configurable concurrency limit, but the design must not collapse the identity model back to one active runtime per logical member.
- The frontend can still expose a static team roster/logical member list in a clearly labeled non-execution surface, but default active run views must present task-delegation-only workers through task-agent execution entities that disappear after settlement.

## Risks / Open Questions

- Exact naming of the member lifecycle API: `terminateMember`, `settleMemberWhenIdle`, or a policy-based `requestMemberAutoSettlement`.
- Whether the internal delegation ledger/task-state store should remain in live team-run memory for this ticket or be promoted to server-persisted state later.
- Whether an internal, non-model-facing member task lookup is needed for recovery/resend behavior after runtime restart; this should not reintroduce a worker-visible `get_my_tasks` tool.
- Whether delegator notifications should be delivered as a direct system/inter-agent message to the original delegator, a team event only, or both; default recommendation is both where a live delegator exists, with team/coordinator history as durable fallback.
- Whether the internal existing `TaskPlan` class should be renamed now to `DelegationLedger`/`TaskLedger`, or wrapped by a new `TaskDelegationService` first and renamed later. Default recommendation: keep storage migration minimal in first ticket but expose only delegation semantics above it.
- Whether `assign_task_to` should be shipped in the first task-tool migration or deferred because it composes task creation plus messaging. Default recommendation: omit/defer it for the simplified surface.
- Resolved 2026-05-29 clarification, refined 2026-06-01: worker settlement is a hard sub-agent lifecycle invariant for supported delegation paths, not an optional optimization, but for successful completed work it occurs after original-delegator acceptance rather than immediately after worker self-reported completion.
- Resolved 2026-05-29 clarification: same-member parallel delegation should be represented as multiple task-agent instances of the same logical member/template. The open implementation question is the initial per-member concurrency default/limit, not whether instance identity exists.
- Resolved 2026-05-30 frontend clarification: the user-visible task-agent lifecycle must be sub-agent-like. A delegated task-agent instance must be rendered as a separate transient entity while active and disappear from active frontend member/agent UI after settlement; leaving only the logical worker row offline is not sufficient proof of task-agent exit.
- Resolved 2026-05-31 worker-row semantics clarification: the internal logical-member/template distinction is valid for team definition and future delegation. User-preferred UX keeps the logical member visible as a stable parent/template and shows active delegated tasks/task-agent instances as indented children underneath it; when a task finishes, only the task/task-agent child disappears.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-003, REQ-004
- UC-002: REQ-002, REQ-005, REQ-009
- UC-003: REQ-001, REQ-004, REQ-005, REQ-006
- UC-004: REQ-001, REQ-004, REQ-008
- UC-005: REQ-011, REQ-012, REQ-015, REQ-016
- UC-006: REQ-002, REQ-009
- UC-007: REQ-010
- UC-008: REQ-017, REQ-018, REQ-019, REQ-020
- UC-009: REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027
- UC-010: REQ-004, REQ-010, REQ-028, REQ-029

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the server-owned task-delegation tool boundary.
- AC-002 validates authorized-agent-to-member task activation.
- AC-003 validates task-details-in-activation behavior and removal of worker-visible `get_my_tasks`.
- AC-004 validates removal of duplicate `create_task`.
- AC-005 validates multi-task delegation without exposing legacy creation tools.
- AC-006 validates event-driven delegator notification instead of polling.
- AC-007 through AC-009 validate safe auto-exit behavior after delegator acceptance.
- AC-010 validates context binding and safety for selector-free worker result tools and task-id-based acceptance.
- AC-011 validates activation instruction content.
- AC-012 validates durable executable coverage.
- AC-013 validates explicit handling of the composite assignment tool.
- AC-014 validates live mixed-runtime sub-agent exit semantics.
- AC-015 validates that unsupported native task-agent/per-member settlement is not silently presented as a supported delegation path.
- AC-016 validates mandatory worker-exit wording in runtime/docs instructions.
- AC-017 through AC-020 validate task-agent instance identity and parallel same-member delegation behavior.
- AC-021 and AC-022 validate that delegated tasks are real work packets, not name-only records, while keeping the model-facing schema minimal.
- AC-023 through AC-027 validate the frontend sub-agent lifecycle projection: logical members remain visible as stable templates/parents when desired, task-agent execution entities appear as transient children while active, task/task-agent children disappear after settlement, and logical member/template or normal conversation surfaces stay distinct from task-agent history.
- AC-028 validates that delegation is not coordinator-only and that nested/non-coordinator delegation preserves the original delegator identity.
- AC-029 validates the explicit tool split: worker result tools are `mark_task_completed`/`mark_task_failed`, acceptance is `accept_task`, and revision requests use `send_message_to` targeted at the live task-agent identity.

## Approval Status

Approved by user for architecture review on 2026-05-29. Revised scope: server-owned task-delegation tools (`delegate_tasks`, `mark_task_completed`, `mark_task_failed`, `accept_task`), delegator/coordinator completion notification, internal delegation ledger, work-packet activation, and safe task-agent auto-exit first; general MCP exposure later. Downstream clarification on 2026-05-29: final task-agent settlement is mandatory for every supported delegation runtime path; unsupported native pure-team settlement must be gated or implemented before native pure-team delegation is claimed supported. Additional user refinement on 2026-05-29: logical members should behave as reusable task-agent templates, allowing multiple task-agent instances of the same member for parallel delegated tasks. Schema refinement on 2026-05-29: the `delegate_tasks` model-facing schema must remain minimal: `member_name`, rich `description`, and optional `reference_files`; no separate `task_name`, `dependencies`, `completion_criteria`, or `expected_deliverables` fields. Worker result tools expose no task selector; delegator acceptance uses `accept_task` with the system-generated `task_id` from the completion notification. Dependent-task authoring/activation is deferred out of this first ticket. Frontend UX clarification on 2026-05-30 and user confirmation on 2026-06-01: supported task delegation should show logical members as stable reusable templates/parents, show concrete task-agent instances as transient indented task children while active, and remove only the task/task-agent child after settlement; task-agent packets/activity/history must remain scoped to the task/completed-task entity rather than the logical member's normal conversation. Delegation-authority clarification on 2026-06-01: `delegate_tasks` is available to any authorized active team agent context, not hard-coded to the coordinator; the ledger records the exact original delegator identity and completion/failure results route back to that delegator with team/coordinator history visibility. Acceptance clarification on 2026-06-01 and tool-surface refinement on 2026-06-02: generic `update_task_status` is replaced by explicit intent tools; completion notifications include `task_id` and targetable task-agent identity, revision requests use `send_message_to(task_agent_id)`, and settlement occurs after `accept_task`.
