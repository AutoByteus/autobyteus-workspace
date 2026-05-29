# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Analyze the first implementation ticket for simplifying and migrating task-management tools out of runtime-local `BaseTool` implementations into server-owned cross-runtime task orchestration. The simplified model should keep only the essential model-facing task tools: `delegate_tasks` for coordinator-to-member work delegation and `update_task_status` for worker reporting. Internally, the system still needs an authoritative delegation ledger/task-state store, but that internal state should not be exposed as a model-facing task-plan polling workflow. Status visibility and coordinator updates should be framework-driven events/notifications rather than a coordinator polling tool. Legacy single-task/query/status tools such as `create_task`, `get_my_tasks`, and model-facing `get_task_plan_status` should not be part of the new happy-path tool surface. The immediate goal is **not** to expose these tools through a general HTTP/streamable MCP endpoint yet. The immediate goal is to establish one authoritative server-side task-delegation command boundary that current and future runtimes can reuse.

The desired orchestration behavior is: a coordinator delegates one or more tasks through `delegate_tasks`; the internal delegation ledger/orchestrator activates the target member when the member has runnable work; the activation message itself carries the task work packet so the member never needs a `get_my_tasks` tool in the normal framework model; the member updates task status as it works; when the member completes/fails the task, the framework records deliverables, notifies the coordinator with the completion result, and then automatically settles/exits that member when no runnable/queued/in-progress work remains for it without terminating the whole team.

## Investigation Findings

Current-code investigation shows a split architecture:

- Browser tools already use a server-owned manifest/service/projection pattern under `autobyteus-server-ts/src/agent-tools/browser/*`.
- `send_message_to` has server-side Codex/Claude projections and shared delivery-request helpers, but still has an older local AutoByteus `BaseTool` implementation.
- Task-management tools remain local `autobyteus-ts` `BaseTool`s under `autobyteus-ts/src/task-management/tools/task-tools/*`, mutate `context.customData.teamContext.state.taskPlan`, and are filtered out for mixed AutoByteus standalone team members because they are not cross-runtime-safe. The current set also has avoidable tool-surface duplication: `create_task` is a single-item form of `create_tasks`, and `get_my_tasks` is unnecessary if activation carries the work packet.
- Native AutoByteus task notification already has the core event-driven shape: task creation/status events -> runnable task detection -> mark tasks `QUEUED` -> activate assignee with a system message.
- Current team-manager abstractions have `interruptMember` and team-level `terminate`, but no explicit cross-runtime `terminateMember`/`settleMemberWhenIdle` boundary. Auto-exit should not be performed inline inside `update_task_status`, because doing so could kill the active tool-call turn before the tool result and status events are delivered.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + Refactor / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Missing Lifecycle Invariant / Duplicated Runtime Projection Risk
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed if implementation proceeds
- Evidence basis: Task tools are still runtime-local and context-bound; mixed teams filter task-management tools; native task notification has useful activation logic but it is not available as a server-owned task orchestration service across server-managed runtimes; no member auto-settlement boundary exists.
- Requirement or scope impact: First ticket should create the task-tool server boundary and member settlement lifecycle abstraction before any general MCP hosting work.

## Recommendations

Proceed with a first ticket titled approximately: **Server-owned task delegation tools and task member auto-settlement**.

Do not build streamable HTTP/stdio MCP in this ticket. Build reusable server-owned task-delegation command services plus runtime projections for current runtimes. The next ticket can expose those already-owned services through a general first-party MCP server.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: Coordinator creates a list of tasks in a team run using a task tool that is not tied to a single local runtime implementation.
- UC-002: Task plan evaluates runnable tasks and activates assigned members across supported team backends.
- UC-003: Target member receives task details directly in the activation message and can start work without any `get_my_tasks` model-facing tool.
- UC-004: Target member updates task status and optionally submits deliverables using the same server-owned task command semantics.
- UC-005: When a member completes/fails its last currently active assigned task and has no remaining queued/in-progress/runnable assigned work, the member runtime automatically exits/settles after the current turn is safe to finish.
- UC-006: Dependent tasks are activated when prerequisite tasks complete.
- UC-007: Coordinator receives a framework-generated notification when an assigned task reaches a terminal status, including task identity, assignee, status, summary, and deliverables.

## Out of Scope

- General first-party MCP server over HTTP/stdio/streamable MCP.
- One static MCP config/address for Antigravity/Kimi/other future runtimes.
- Reworking browser tools, media tools, or publish tools.
- Durable/persistent task-plan storage unless required by implementation feasibility.
- Killing/terminating the entire team run when one member finishes a task.

## Functional Requirements

- REQ-001: Provide one server-owned task-delegation service or command boundary that owns parsing, validation, delegation record creation, status mutation, result formatting, and event emission for the simplified model-facing surface.
- REQ-002: Maintain an internal authoritative delegation ledger/task-state store for correlation, dependency readiness, activation, completion notification, deliverables, audit/history, and auto-settlement decisions.
- REQ-003: Expose task tools to current supported runtime projections from the server-owned boundary rather than duplicating behavior per runtime.
- REQ-004: Bind every task tool call to an authoritative `teamRunId` and current member identity; reject calls without valid team/member context.
- REQ-005: Activation messages must include the assigned runnable task details as a work packet, so a member can start work without any `get_my_tasks` tool call.
- REQ-006: The new model-facing task tool surface must omit `get_my_tasks`; any member-task lookup needed for activation/recovery must be internal framework/service behavior, not an exposed worker tool.
- REQ-007: The new model-facing task creation surface must omit `create_task`/`create_tasks`; single or multiple task delegation must use `delegate_tasks` with one or more task items.
- REQ-008: `update_task_status` must be able to update status by stable task identity and/or unique task name, add deliverables safely, and emit canonical task-delegation events.
- REQ-009: Task completion/failure must trigger dependent-task activation checks.
- REQ-010: Task completion/failure must trigger a framework-generated coordinator notification that includes the task identity, assignee, terminal status, deliverables, and any completion summary/result payload.
- REQ-011: Member auto-exit must run only after the current member turn/tool call can safely complete, and only when no queued/in-progress/runnable assigned work remains for that member.
- REQ-012: Member auto-exit must not stop the coordinator/root member unless explicitly allowed by policy, and must never terminate the whole team run as a side effect of a single member task completion.
- REQ-013: Delegated-task members must receive general task-lifecycle protocol instructions in their runtime instructions/system/developer context and specific task details in each activation message/work packet.
- REQ-014: The design must decide whether `assign_task_to` is included in this ticket or deferred as a composite orchestration tool, because it mixes task creation and direct messaging; default recommendation is to omit/defer it from the simplified first-ticket surface.

## Acceptance Criteria

- AC-001: Code no longer requires task-management tools to be implemented only as local `autobyteus-ts` `BaseTool`s for team use; a server-owned task-delegation service/manifest boundary exists.
- AC-002: In a mixed/server-managed team, the coordinator can delegate tasks and target members can be activated from internal delegation/task-state events.
- AC-003: Target members receive activation messages containing task ID/name/description/dependency/deliverable details and can update status without a `get_my_tasks` tool being exposed.
- AC-004: `create_task`/`create_tasks` are not exposed in the new model-facing task surface; delegating one task is done through `delegate_tasks` with a one-item list.
- AC-005: Completing a task with downstream dependencies activates the next eligible assignee.
- AC-006: Completing or failing a task notifies the coordinator with task identity, assignee, status, and deliverables without requiring the coordinator to call `get_task_plan_status`.
- AC-007: A member that finishes its last current assigned work is automatically settled/exited after its current turn is idle/complete; the tool result is still delivered and task-delegation events/coordinator notifications still appear.
- AC-008: A member with additional queued or in-progress assigned work is not auto-exited after a single task completion.
- AC-009: A member with only future blocked/dependency-gated tasks may exit now and be reactivated later when those tasks become runnable.
- AC-010: Invalid or unbound task tool calls fail clearly without mutating any internal delegation state.
- AC-011: Worker activation includes both general lifecycle instructions and task-specific details, including the exact `task_id` to pass to `update_task_status` and the requirement to report a terminal status when done.
- AC-012: Tests cover task delegation, internal ledger correlation, runnable activation with work-packet content, status update, dependent activation, coordinator notification, and auto-settlement gating.
- AC-013: If `assign_task_to` is deferred or omitted, the implementation records that task creation and direct message delivery remain separate canonical services.

## Constraints / Dependencies

- Must fit the existing team-run manager/backends architecture in `autobyteus-server-ts/src/agent-team-execution/*`.
- Must preserve the existing native AutoByteus task plan/domain model unless an implementation blocker proves otherwise.
- Must not put business semantics into future MCP transport code.
- Must account for active tool-call/turn lifecycle so auto-exit does not interrupt the member while it is reporting completion.

## Assumptions

- "Exit automatically" means member-runtime settlement/termination/going offline after safe completion of the current assigned work, not terminating the entire team run.
- A member can be re-created/restored later if new runnable tasks or messages arrive, matching existing lazy member activation patterns.
- The first ticket can add server-owned task-tool projections without needing to solve external MCP config for future runtimes.

## Risks / Open Questions

- Exact naming of the member lifecycle API: `terminateMember`, `settleMemberWhenIdle`, or a policy-based `requestMemberAutoSettlement`.
- Whether the internal delegation ledger/task-state store should remain in live team-run memory for this ticket or be promoted to server-persisted state later.
- Whether an internal, non-model-facing member task lookup is needed for recovery/resend behavior after runtime restart; this should not reintroduce a worker-visible `get_my_tasks` tool.
- Whether coordinator notifications should be delivered as a direct system/inter-agent message to the coordinator member, a team event only, or both; default recommendation is both where a live coordinator exists.
- Whether the internal existing `TaskPlan` class should be renamed now to `DelegationLedger`/`TaskLedger`, or wrapped by a new `TaskDelegationService` first and renamed later. Default recommendation: keep storage migration minimal in first ticket but expose only delegation semantics above it.
- Whether `assign_task_to` should be shipped in the first task-tool migration or deferred because it composes task creation plus messaging. Default recommendation: omit/defer it for the simplified surface.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-003, REQ-004
- UC-002: REQ-002, REQ-005, REQ-009
- UC-003: REQ-001, REQ-004, REQ-005, REQ-006
- UC-004: REQ-001, REQ-004, REQ-008
- UC-005: REQ-011, REQ-012
- UC-006: REQ-002, REQ-009

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the server-owned task-delegation tool boundary.
- AC-002 validates coordinator-to-member task activation.
- AC-003 validates task-details-in-activation behavior and removal of worker-visible `get_my_tasks`.
- AC-004 validates removal of duplicate `create_task`.
- AC-005 validates dependency-driven continuation.
- AC-006 validates event-driven coordinator notification instead of polling.
- AC-007 through AC-009 validate safe auto-exit behavior.
- AC-010 validates context binding and safety.
- AC-011 validates activation instruction content.
- AC-012 validates durable executable coverage.
- AC-013 validates explicit handling of the composite assignment tool.

## Approval Status

Approved by user for architecture review on 2026-05-29. Revised scope: server-owned task-delegation tools (`delegate_tasks`, `update_task_status`), coordinator completion notification, internal delegation ledger, work-packet activation, and safe member auto-exit first; general MCP exposure later.
