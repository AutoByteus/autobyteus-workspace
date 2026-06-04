# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Create a follow-up refactoring/design-hardening ticket from the latest tracked `personal` branch after the completed runtime-tool MCP unification / task-delegation work. The completed feature is not being reopened. This ticket focuses on making the merged implementation easier to reason about and safer under task-agent streaming by enforcing explicit task-agent identity and by making frontend active-execution projection the authoritative boundary for UI execution targets.

The immediate problem is that the current frontend still needs generated-run-ID heuristics (`isTaskAgentRunId(...)`) to avoid an identity-less task-agent status event poisoning the logical worker context. That is a design smell: the server/runtime knows when an event came from a task-agent instance, so the stream contract should carry explicit task-agent identity instead of forcing the frontend to infer it from ID substrings. The same follow-up should also reduce file responsibility pressure in near-limit frontend files and explicitly preserve the current `TaskDelegationService` versus `TeamRun` separation of concerns.

## Investigation Findings

- The task was bootstrapped in a fresh dedicated worktree from the latest tracked `origin/personal` state: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor` at commit `66bdc6d7f6fdcda2b11d39e9f3b7db18478cd723`.
- The completed task-delegation ticket now lives under `tickets/done/runtime-tool-mcp-unification-analysis/` in the fresh worktree. Those artifacts are context only; current source inspection was performed against latest `personal`.
- Most server task-agent runtime events already carry explicit task-agent identity through `TeamRunAgentEventPayload.taskAgentInstance`, `ServerManagedTaskAgentInstanceRegistry`, `MixedAgentMemberHandle.bindEvents(...)`, `team-member-input-event-builder.ts`, and `team-run-event-websocket-message-mapper.ts`.
- A remaining identity gap exists in command-start/status overlay events: `TeamMemberCommandStatusInput` and `buildAgentMemberCommandStartStatusEvent(...)` have no task-agent identity field, while `MixedAgentMemberHandle.publishCommandStatus(...)` is used by task-agent handles. This can produce an `AGENT_STATUS` event whose `agent_id` is a task-agent run ID but whose payload lacks `task_agent_run_id`, `task_agent_instance_id`, and `task_id`.
- Frontend `TeamStreamingService.ts` currently imports `isTaskAgentRunId(...)` and uses it in context resolution to avoid treating task-agent-looking run IDs as logical member IDs. `teamActiveExecutionMembers.ts` also uses the same heuristic to hide logical members when their context has been polluted with a task-agent run ID.
- `TeamStreamingService.ts` is still near the source-size guard (`570` physical / `496` effective lines by a simple nonblank/non-comment count). `runHistoryTeamHelpers.ts` is also near the guard (`534` physical / `493` effective lines) and mixes team node aggregation with member projection hydration/building.
- Active execution projection is already used in several important paths (`agentTeamContextsStore` active-execution getters, `activeContextStore` team interrupt target, `agentTeamRunStore` send target, run-history row filtering/building), but some consumers still read raw `focusedMemberRouteKey` / raw `memberTree` for execution-adjacent behavior. `workspace.ts` active workspace metadata is a concrete bypass: it uses `teamContext.focusedMemberRouteKey` instead of active-execution focus.
- The current server ownership split is healthy and should be preserved: `TaskDelegationService` owns task lifecycle/policy/authorization/transitions and the decision to request settlement; `TeamRun` and backend managers own concrete runtime lifecycle commands such as start, settle, post, interrupt, and publish runtime events.
- Durable task-delegation persistence is not required by this follow-up because no recovery/history requirements were added.
- Historical `TASK_PLAN_EVENT` naming remains in server/frontend transport surfaces for task-delegation events. Renaming it is compatibility-sensitive and not required to fix the identity/projection problem.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / cleanup / design hardening.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant, boundary/ownership issue, duplicated routing policy, file responsibility drift, and legacy/compatibility pressure.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now for identity invariant and frontend resolver/projection ownership. Transport naming and durable repository work are deferred.
- Evidence basis: Current code shows explicit identity on most task-agent events, but not task-agent command-start/status overlay events; frontend relies on `isTaskAgentRunId(...)`; two frontend files remain near the line guard; at least one active workspace metadata path bypasses active-execution focus.
- Requirement or scope impact: This ticket should make the task-agent stream contract explicit, remove frontend run-ID substring heuristics, extract real frontend resolver/projection ownership, and protect existing server task-management/runtime boundaries.

## Recommendations

1. Enforce a server-side invariant: every task-agent-originated event that reaches the team stream must carry explicit task-agent identity (`task_agent_run_id`, `task_agent_instance_id`, `task_id`) plus the logical member route/path identity.
2. Extend the command-start/status overlay path to accept and propagate optional `TaskAgentInstanceIdentity`; task-agent handles must pass that identity when publishing initializing/error status.
3. Move frontend message-to-member/task-agent context resolution out of `TeamStreamingService.ts` into an owned resolver (`TeamStreamMemberContextResolver` or equivalent), remove `isTaskAgentRunId(...)`, and route task-agent messages only by explicit identity.
4. Tighten active-execution projection into the single boundary used by active UI, composer/send/interrupt, running sidebar, history selection/opening, workspace execution links, and active workspace metadata.
5. Split `runHistoryTeamHelpers.ts` by real ownership if implementation keeps it near the guard: team node aggregation should remain separate from team-member projection fetching/hydration/context shell building.
6. Preserve the server boundary: `TaskDelegationService` owns task state/policy; `TeamRun` and backend managers own runtime lifecycle only.
7. Defer durable task-delegation persistence and task-delegation-native transport renaming unless separate requirements explicitly request them.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

Rationale: The behavior change is narrow, but it spans server event identity, frontend streaming routing, active-execution projection consumers, tests, and file-responsibility refactoring.

## In-Scope Use Cases

### UC-001: Task-agent command status carries explicit identity

When a task-agent instance is started or receives a command in a server-managed runtime path, any initializing/error/status event emitted on behalf of that task-agent must include the task-agent run ID, task-agent instance ID, task ID, and logical member route/path. The frontend must not need to infer task-agent status from the shape of `agent_id`.

### UC-002: Frontend routes task-agent stream messages by explicit identity

When the frontend receives a task-agent stream message with explicit task-agent identity, it must create/update/remove the transient task-agent context/card under the logical member. When the identity is absent, it must treat the message as a logical-member message only when it passes strict logical identity rules; it must not use generated-run-ID substring heuristics.

### UC-003: Active execution projection governs execution targets and active display

Active UI display, focused execution target, send target, interrupt target, running sidebar rows, history open/selection, workspace execution links, and active workspace metadata must use the active-execution projection boundary rather than raw logical topology when the distinction matters.

### UC-004: Frontend large files are split by real owned concerns

`TeamStreamingService.ts` and `runHistoryTeamHelpers.ts` should no longer accumulate unrelated routing/projection/hydration concerns. If they remain near the line guard after implementing this ticket, the implementation must extract owned files rather than generic helpers.

### UC-005: Task delegation policy stays out of `TeamRun`

Task management policy must remain in `TaskDelegationService` and its owned collaborators. `TeamRun` and backend managers must remain concrete runtime lifecycle boundaries.

### UC-006: Compatibility-sensitive cleanup decisions are explicit

The ticket must explicitly defer durable task-delegation persistence and `TASK_PLAN_EVENT` transport renaming unless the implementation can prove the change is a clean, non-compatible-contract-breaking cleanup in this scope.

## Out of Scope

- Reopening the completed task-delegation tool/API semantics.
- Changing `delegate_tasks`, `mark_task_completed`, `mark_task_failed`, or `accept_task` user-facing schemas except as needed for tests or type references.
- General MCP / streamable MCP transport work.
- New durable task-delegation persistence, recovery, or replay requirements.
- Broad UI redesign unrelated to task-agent identity, active-execution projection, or file-responsibility hardening.
- Renaming `TASK_PLAN_EVENT` in a way that requires compatibility wrappers, dual-path clients, or history/replay migration.

## Functional Requirements

| Requirement ID | Requirement | Use Cases |
| --- | --- | --- |
| REQ-001 | Every server event originated by a task-agent runtime path and delivered to the team stream must include explicit task-agent identity: `task_agent_run_id`, `task_agent_instance_id`, `task_id`, logical `member_route_key`, logical `member_path`, `source_route_key`, and `source_path`. | UC-001, UC-002 |
| REQ-002 | The task-agent command-start/status overlay path must carry `TaskAgentInstanceIdentity` from the task-agent handle through `TeamCommandStatusOverlayStore`, `buildAgentMemberCommandStartStatusEvent(...)`, `AgentStatusPayload`, `TeamRunAgentEventPayload`, and websocket mapping. | UC-001 |
| REQ-003 | Logical-member command/status events must continue to work without task-agent fields. The new identity fields are mandatory only when the event is known to originate from a task-agent instance. | UC-001 |
| REQ-004 | Frontend task-agent routing must depend on explicit task-agent identity extraction, not on generated-run-ID marker detection. `isTaskAgentRunId(...)` and its imports must be removed or fully decommissioned from routing/projection code. | UC-002 |
| REQ-005 | For an identity-less stream message resolved to a logical member, the frontend must not overwrite an existing logical member run ID with a different `agent_id` unless the message is explicitly a logical-member lifecycle update. This is a strict identity guard, not a task-agent-name heuristic. | UC-002, UC-003 |
| REQ-006 | A dedicated frontend resolver must own team stream message-to-context resolution, including task-agent identity extraction, logical route/path resolution, and malformed/stale message handling. `TeamStreamingService.ts` must remain a websocket/dispatch facade. | UC-002, UC-004 |
| REQ-007 | Active-execution projection must be the authoritative frontend boundary for active display/focus/send/interrupt/history/open/workspace metadata. Raw `memberTree` and raw `focusedMemberRouteKey` may still be used for logical roster/configuration/history metadata where no execution target is being selected. | UC-003 |
| REQ-008 | `runHistoryTeamHelpers.ts` must be split by real ownership if implementation keeps it near the guard: node aggregation and member projection hydration/context building must not remain mixed in one near-limit file. | UC-004 |
| REQ-009 | `TeamRun` must not own or mutate task delegation business state. It may start/settle/post/interrupt/publish concrete logical member or task-agent runtimes. | UC-005 |
| REQ-010 | `TaskDelegationService` plus ledger/notifier/settlement coordinator must remain the task-management policy boundary: delegated task records, task IDs, original delegator identity, task-agent binding, status/acceptance transitions, authorization, completion/failure notifications, and settlement-request decisions. | UC-005 |
| REQ-011 | No durable task-delegation repository is added in this ticket unless a separate recovery/history requirement is introduced and the repository remains behind `TaskDelegationService`. | UC-006 |
| REQ-012 | `TASK_PLAN_EVENT` naming cleanup must be deferred or handled only as a clean-cut protocol migration with explicit compatibility analysis; no in-scope behavior may depend on dual-path transport compatibility wrappers. | UC-006 |
| REQ-013 | Durable tests must cover server identity propagation, frontend resolver behavior without run-ID heuristics, active-execution projection use, and the preserved `TeamRun`/task-delegation separation. | UC-001, UC-002, UC-003, UC-005 |

## Acceptance Criteria

| Acceptance Criteria ID | Criteria | Requirement(s) |
| --- | --- | --- |
| AC-001 | A task-agent initializing/status event from the mixed runtime path contains `task_agent_run_id`, `task_agent_instance_id`, `task_id`, `member_route_key`, `member_path`, `source_route_key`, and `source_path` in the websocket `AGENT_STATUS` payload. | REQ-001, REQ-002 |
| AC-002 | Existing logical-member initializing/error status events still emit and route correctly without task-agent fields. | REQ-003 |
| AC-003 | Frontend code no longer imports or calls `isTaskAgentRunId(...)`; the `taskAgentRunIdentity.ts` heuristic file is removed or left with no references pending deletion only if tests prove it is unused. | REQ-004 |
| AC-004 | A task-agent message with explicit identity creates/updates the transient task-agent context, and an offline terminal status with explicit identity removes the transient task-agent context/card without mutating the logical member run ID. | REQ-004, REQ-005, REQ-006 |
| AC-005 | An identity-less `AGENT_STATUS` carrying a mismatched `agent_id` for a routed logical member is treated as malformed/stale and does not overwrite the logical member run ID or attach task-agent conversation/status to the logical member. | REQ-005, REQ-006 |
| AC-006 | `TeamStreamingService.ts` delegates message context resolution to an owned resolver file and stays below the effective-line guard with routing policy no longer embedded in the facade. | REQ-006 |
| AC-007 | `runHistoryTeamHelpers.ts` is below the effective-line guard or its mixed concerns have been split into owned files for team node aggregation and team-member projection hydration/context building. | REQ-008 |
| AC-008 | Active workspace metadata, composer/send, interrupt target, running sidebar rows, history selection/opening, and workspace execution links use active-execution projection APIs where selecting the active execution subject matters. | REQ-007 |
| AC-009 | Code search confirms `TeamRun`/backend managers do not decide task acceptance/status rules, mutate task records, determine original-delegator authorization, or interpret delegated-task business state. | REQ-009, REQ-010 |
| AC-010 | No new durable task-delegation repository or transport renaming compatibility wrapper is introduced in this ticket. | REQ-011, REQ-012 |
| AC-011 | Server and frontend tests fail on the old identity-less task-agent status behavior and pass with explicit identity propagation and resolver hardening. | REQ-013 |

## Constraints / Dependencies

- Base branch is latest tracked `origin/personal` at bootstrap commit `66bdc6d7f6fdcda2b11d39e9f3b7db18478cd723`.
- Keep the completed task-delegation ticket artifacts as historical context only; current source on this worktree is authoritative.
- Preserve existing task-agent UI semantics accepted in the completed ticket: logical member rows may remain visible, while transient task-agent rows/cards appear under logical members while running and disappear after settlement.
- Avoid generic helpers. Any extracted file must own a concrete concern.
- Do not introduce backward-compatibility dual paths for in-scope replaced behavior.

## Assumptions

- The prior task-delegation feature has been merged into `personal` and should not be semantically redesigned here.
- Task-agent run IDs are generated and should be treated as opaque identifiers by the frontend.
- Logical member run IDs are not expected to be arbitrarily replaced by stream messages after the context is established; if that becomes necessary later, it should use an explicit logical-member lifecycle event rather than a generic routed payload side effect.

## Risks / Open Questions

- Some mobile or history paths may intentionally use raw logical topology for roster/history metadata. The implementation must distinguish these legitimate raw-topology consumers from active execution target consumers.
- Transport naming cleanup may be desirable but is deferred because changing `TASK_PLAN_EVENT` could affect clients, replay, or history unless a separate protocol migration is designed.
- Effective-line guard enforcement is review-driven rather than currently enforced by a visible script; implementation should still keep files comfortably below the guard where this ticket touches them.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-003, REQ-013 |
| UC-002 | REQ-001, REQ-004, REQ-005, REQ-006, REQ-013 |
| UC-003 | REQ-005, REQ-007, REQ-013 |
| UC-004 | REQ-006, REQ-008 |
| UC-005 | REQ-009, REQ-010, REQ-013 |
| UC-006 | REQ-011, REQ-012 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Proves the original identity gap is closed at the server transport boundary. |
| AC-002 | Prevents task-agent identity hardening from breaking normal logical-member runtime events. |
| AC-003 | Proves frontend routing no longer depends on generated-ID string markers. |
| AC-004 | Proves the intended transient task-agent UI lifecycle still works with explicit identity. |
| AC-005 | Proves malformed identity-less task-agent-like messages cannot poison logical member context. |
| AC-006 | Proves streaming facade/resolver ownership is separated. |
| AC-007 | Proves run-history helper responsibility drift is addressed. |
| AC-008 | Proves active-execution projection is authoritative for execution-facing consumers. |
| AC-009 | Proves task policy remains outside `TeamRun` and backend managers. |
| AC-010 | Proves deferred scope was not accidentally pulled into implementation. |
| AC-011 | Proves durable validation guards the exact design pressure behind this ticket. |

## Approval Status

Follow-up requested by code-review handoff on 2026-06-03 and continued by the user after an interruption. Requirements are marked Design-ready for architecture review with no blocking open requirement questions.
