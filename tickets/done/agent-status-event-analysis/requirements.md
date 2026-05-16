# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved the consolidated systematic design direction on 2026-05-15: one backend-owned runtime status projection feeds first-load history, stream snapshots, and live `AGENT_STATUS` / `TEAM_STATUS` updates; canonical status is `offline/idle/running/error`; `can_interrupt` remains member/single-agent only; no backward compatibility.

## Goal / Problem Statement

The frontend can show stale or inaccurate agent status (for example an LLM phase such as “Awaiting LLM Response”) after the agent is no longer doing work. The status label also influences the user’s mental model for whether the current run can be interrupted. The system needs a single authoritative status source for frontend display and interrupt affordance across single-agent and team-agent contexts.

## Investigation Findings

- A dedicated status event already exists in the native `autobyteus-ts` runtime:
  - `autobyteus-ts/src/events/event-types.ts` defines `AGENT_STATUS_UPDATED = 'agent_status_updated'`.
  - `autobyteus-ts/src/agent/status/manager.ts` emits status updates through `AgentExternalEventNotifier.notifyStatusUpdated(...)`.
  - `autobyteus-ts/src/agent/status/status-deriver.ts` derives `uninitialized`, `bootstrapping`, `idle`, `processing_user_input`, `awaiting_llm_response`, `analyzing_llm_response`, `awaiting_tool_approval`, `tool_denied`, `executing_tool`, `processing_tool_result`, `interrupting`, `shutting_down`, `shutdown_complete`, and `error`.
- The server preserves this event as `AgentRunEventType.AGENT_STATUS` and forwards it over WebSocket as `ServerMessageType.AGENT_STATUS`:
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- The frontend consumes `AGENT_STATUS` in `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` and writes it to `context.state.currentStatus`; display components read that value.
- The problem is therefore not a complete absence of a status event. The current risk is that the status event is not yet an authoritative enough contract for all UI decisions and all stream lifecycle edges:
  - `context.isSending` is a separate UI flag set optimistically on send and cleared by `AGENT_STATUS idle/error/shutdown_complete`, but also cleared by `TURN_COMPLETED`, `TURN_INTERRUPTED`, `ASSISTANT_COMPLETE`, and `ERROR`. This creates two state sources for “working/interruptible”.
  - `TURN_COMPLETED` and `TURN_INTERRUPTED` do not update `currentStatus`; they only mark conversation completion and clear `isSending`. If the following `AGENT_STATUS idle` event is missed or arrives before subscription, the status chip can remain in the previous phase.
  - `AgentStreamHandler.connect(...)` sends a one-time status snapshot before binding the WebSocket session to live run events. That creates a race window where a terminal `AGENT_STATUS idle` can be missed between snapshot and subscription.
  - Team stream connection sends only a team status snapshot, not member status snapshots. Existing `TeamRuntimeStatusSnapshotService` can build member `AGENT_STATUS` snapshot messages, but it is currently unused by `AgentTeamStreamHandler`; team status payload and aggregate derivation also remain on the legacy `new_status` path.
  - Team run hydration creates active members with `AgentStatus.Uninitialized` unless live member statuses are supplied; the active-team discovery path passes `memberStatuses: []`, so member status can remain uninitialized until live events arrive.
- Cross-runtime Codex/Claude backends already synthesize `AGENT_STATUS` events (`RUNNING`/`IDLE`) around turn lifecycle events, so the target design should standardize the projection rather than add a separate frontend-only status source.
- Codex status is currently backed by `CodexThread.currentStatus` and synthesized `AGENT_STATUS` events, but `thread/status/changed` payload normalization and error-to-status transitions need to be made explicit.
- Claude status is currently a listener-derived `lastStatus` cache with no first-class initial status field; snapshots can be `null`, and errors/interruption semantics are not uniformly represented as status updates.
- Codex/Claude team run snapshots currently report the team active state as `IDLE` and do not send per-member status snapshots on connect, despite live team managers deriving member-driven processing state.
- First application load uses `ListWorkspaceRunHistory`, whose current rows expose `lastKnownStatus` and `isActive`; frontend sidebar/read-model code can infer display status from those legacy fields. After application restart, active runtime managers are empty, so non-active historical rows must be displayed as `offline`, not inferred as green `idle` from persisted `IDLE` metadata.
- Refined API-level design should use coarse canonical `AGENT_STATUS.status` values (`offline`, `idle`, `running`, `error`) plus `can_interrupt`; detailed runtime phases can remain internal or optional diagnostics.
- Post-implementation regression check on 2026-05-16 showed a selected Codex run whose live backend WebSocket snapshot correctly returned `AGENT_STATUS { status: "running", can_interrupt: true }`, while the frontend input still showed the blue send button. Current source evidence shows active history/recovery reconciliation paths can overwrite an existing active context's `state.canInterrupt` to `false` after the status handler has applied the backend snapshot. This means `can_interrupt` ownership is still duplicated in frontend reconciliation code.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue + Duplicated Policy Or Coordination
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis:
  - Status event exists, but frontend work/interrupt state is duplicated in `isSending` and lifecycle handlers.
  - Terminal turn events can clear sending without clearing `currentStatus`.
  - Server snapshot/subscription ordering can miss an authoritative terminal status event.
  - Team status snapshots for member agents are not sent on connect even though a snapshot service exists.
- Requirement or scope impact: The change must tighten the status contract and lifecycle invariant, not merely rename labels. The authoritative status projection should include enough data for UI status and interrupt eligibility and be replayed/snapshotted safely on connect/reconnect.

## Recommendations

1. Treat the existing `AGENT_STATUS` event as the authoritative status event. Replace the old payload shape with the new coarse `{ status, can_interrupt }` contract; do not introduce a parallel status event name and do not preserve backward compatibility for old fields.
2. Make the frontend status store derive both display status and interrupt eligibility from `AGENT_STATUS`, not from `isSending` or turn-completion side effects.
3. Replace the status payload with exactly the required control fields:
   - `status` (`offline`, `idle`, `running`, or `error`)
   - `can_interrupt`
   - `agent_id` / `agent_name` only when needed for team-member routing
4. Ensure terminal transitions publish a final non-working status: completion/interruption settle to `idle`, runtime stop/shutdown/termination settle to `offline`, and errors settle to `error`.
5. Fix connection/hydration reliability:
   - Bind live listener before sending the initial status snapshot, or send a post-bind snapshot.
   - Use `TeamRuntimeStatusSnapshotService` (or equivalent) so team WebSocket connect sends member `AGENT_STATUS` snapshots as well as `TEAM_STATUS { status }`.
6. Treat the initial run-history/list API as a status snapshot surface: backend history rows should include normalized `status`, with active rows using runtime/team snapshots and inactive non-error history mapped to `offline`.
7. Remove duplicated frontend lifecycle policy after status becomes authoritative: lifecycle events can complete messages, but they should not be the owner of status/work/interrupt state.
8. Remove duplicated frontend reconciliation writes to interrupt/action state. History/recovery/open code may create a non-interruptible placeholder before a stream snapshot exists and may clear interrupt on offline/terminated/error cleanup, but it must not overwrite `canInterrupt` for an existing live subscribed context. Live `AGENT_STATUS.can_interrupt` is the owner.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Single-agent status chip reflects the current authoritative coarse run status after start, running work, completion, interruption, error, stop, reload, and reconnect.
- UC-002: Team member status chips reflect each member’s authoritative coarse status after start, running work, completion, interruption, error, stop, reload, and reconnect.
- UC-003: The input form shows the interrupt/stop affordance only while the selected single-agent run or team member/team run is interruptible.
- UC-004: Terminal lifecycle events do not leave transient phase labels such as `awaiting_llm_response` visible after work has ended.
- UC-005: Codex, Claude, and native AutoByteus runtimes continue to produce normalized status events over the same WebSocket message type.
- UC-006: On first application load, the workspace/sidebar history tree renders inactive historical single-agent runs, team runs, and team members as `offline`, while active runtimes use backend status snapshots.

## Out of Scope

- Visual redesign of the status chip or input button beyond state correctness.
- Reworking conversation segment rendering except for the parts that currently clear work state.
- Broad runtime event protocol redesign unrelated to status.
- Changing provider internals for LLM streaming unless missing terminal status emission is proven provider-specific.

## Functional Requirements

- REQ-001: The backend/runtime stream MUST provide an authoritative `AGENT_STATUS` message for every status transition relevant to frontend display and work/interrupt state.
- REQ-002: A status payload MUST include the current canonical coarse `status` (`offline`, `idle`, `running`, or `error`). Team-scoped messages MUST include `agent_id` or `agent_name` when the envelope does not otherwise identify the member.
- REQ-003: A status payload MUST include explicit `can_interrupt` so the frontend does not infer interrupt availability from `isSending` or runtime-specific labels.
- REQ-004: Completion, interruption, runtime stop, shutdown completion, termination, and error paths MUST publish or snapshot a final non-working status: `idle` for active runtime completion/interruption, `offline` for stopped/terminated/no-runtime history, and `error` for failures.
- REQ-005: Single-agent WebSocket connect/reconnect MUST not lose a terminal status transition between initial snapshot and live subscription.
- REQ-006: Team WebSocket connect/reconnect MUST provide initial status snapshots for both the team and each member agent.
- REQ-007: Frontend display status and interrupt affordance MUST be derived from the authoritative status projection for the selected active context.
- REQ-008: Lifecycle/turn events MAY mark messages complete, but MUST NOT be separate owners of agent work/interrupt state once status projection is authoritative.
- REQ-009: Historical/hydration paths MUST initialize active single-agent and team-member statuses from a live snapshot or neutral active placeholder that is replaced by a post-bind status snapshot.
- REQ-010: The implementation MUST remove the legacy `new_status`/`old_status` API payload contract and frontend `isSending` status ownership; no backward-compatibility dual path is allowed.
- REQ-011: `TEAM_STATUS` MUST use the coarse `{ status }` payload contract with `status` in `offline`, `idle`, `running`, or `error`; it MUST NOT use `new_status`/`old_status`.
- REQ-012: Live team managers and team snapshot/reconnect code MUST use one shared team aggregate status owner/helper; stream handlers and frontend code MUST NOT derive aggregate team status independently.
- REQ-013: Frontend hydration, active recovery, local termination, history/read-model mapping, status enums, status visuals, and team handlers MUST be migrated to the coarse status model without API-visible `uninitialized`, `processing`, `shutdown_complete`, or detailed phase statuses; inactive historical runs/teams MUST use `offline`.
- REQ-014: The status model MUST distinguish `offline` (no active runtime/session, historical or terminated) from `idle` (active runtime/session ready with no active turn).
- REQ-015: Initial run-history/list APIs MUST expose backend-normalized coarse status for agent rows, team rows, and team-member rows where shown; frontend history tree code MUST NOT derive display status from legacy `isActive`/`lastKnownStatus` alone.
- REQ-016: Frontend team-active reconciliation, hydration, recovery, local mark-active helpers, and read-model overlays MUST NOT fan out a team `active`/`running` aggregate status to all member rows. Member rows MUST use member-scoped backend statuses from history rows, WebSocket member `AGENT_STATUS` snapshots/events, or a safe non-working placeholder until that member-scoped status arrives.
- REQ-017: Frontend history refresh, active recovery, run-open, and hydration paths MUST NOT overwrite `canInterrupt` for an existing active subscribed single-agent or focused team-member context. They MAY set `canInterrupt=false` only for newly-created placeholders before the first backend status snapshot, inactive/offline contexts, explicit termination/close cleanup, or terminal error cleanup. Live `AGENT_STATUS.can_interrupt` MUST be the only source that grants or revokes interrupt permission during an active stream.

## Acceptance Criteria

- AC-001: A code path audit shows one canonical backend-to-frontend status path: runtime/backend status event → server `AGENT_STATUS` WebSocket message with `{ status, can_interrupt }` → frontend status store.
- AC-002: When a single-agent turn completes normally, the frontend ends with `currentStatus = idle` and interrupt unavailable, even if `TURN_COMPLETED` and `AGENT_STATUS` arrive in either order.
- AC-003: When a turn is interrupted, the frontend ends with `currentStatus = idle` (or explicit non-working interrupted/idle policy) and interrupt unavailable.
- AC-004: When a WebSocket connects or reconnects after the run has already become idle, the first effective status projection is idle/non-working, not a stale running phase.
- AC-005: When a team WebSocket connects or reconnects, each member gets a member-scoped `AGENT_STATUS` snapshot or equivalent status projection.
- AC-006: The input button uses authoritative `can_interrupt`; it does not show stop/interrupt merely because `isSending` was not cleared.
- AC-007: Unit or integration coverage exercises at least: normal completion, interruption, reconnect snapshot after completion, active team member status snapshot, and rejection/removal of the legacy `new_status`/`old_status` contract.
- AC-008: `TEAM_STATUS` live and snapshot messages use `{ status }`, and current frontend `teamHandler` reads only `payload.status`.
- AC-009: Codex, Claude, Mixed, and native team aggregate status paths use the same team aggregate helper/owner for live updates and snapshots.
- AC-010: Frontend active recovery/hydration/history paths only produce coarse statuses, inactive historical runs/teams show `offline`, and active placeholders use `running` with interrupt unavailable until the authoritative snapshot arrives.
- AC-011: After application restart, non-active historical agent runs and teams render as `offline` rather than green `idle`, while active runtime sessions with no turn render as `idle`.
- AC-012: On first application load, `ListWorkspaceRunHistory` (or its replacement read model) returns normalized `status` values: inactive non-error history as `offline`, inactive error history as `error`, and active runs from the same backend status snapshot/projector used by live streams.
- AC-013: For an active team after application restart, if only `solution_designer` has an active/running member runtime and the other members have no active member runtime/session, the backend `ListWorkspaceRunHistory` result, team WebSocket initial member snapshots, and frontend sidebar/tree rows all show `solution_designer = running` and the other members `offline`; no frontend refresh/reconcile cycle changes those offline members to running merely because the team aggregate is running.
- AC-014: For an active single-agent or focused team-member run, after the frontend receives `AGENT_STATUS { status: "running", can_interrupt: true }`, a subsequent run-history refresh/reconcile or active-recovery pass MUST preserve `canInterrupt=true` unless a later live `AGENT_STATUS` or explicit local termination/offline cleanup revokes it. The input form must continue showing the red stop/interrupt button through that refresh.

## Constraints / Dependencies

- Must preserve existing `ServerMessageType.AGENT_STATUS` as the WebSocket message type, but no backward compatibility is required for the old payload shape.
- Must map native AutoByteus detailed internal statuses and Codex/Claude coarse runtime statuses into the API-level `offline/idle/running/error` contract.
- Must account for single-agent and team-member identity routing.
- Must avoid compatibility-only dual source-of-truth behavior for in-scope status decisions.

## Assumptions

- The screenshot reflects the current web/desktop frontend consuming the TypeScript backend stack.
- Existing tests can be extended around `AgentStreamHandler`, `AgentTeamStreamHandler`, and frontend streaming handlers.
- The target can strengthen the existing event contract rather than adding a second parallel status event.

## Risks / Open Questions

- Exact stale-status reproduction timing is not captured yet; investigation identifies plausible race and ownership issues from source.
- Adding `can_interrupt` requires per-runtime support for active-turn state and must be implemented in native AutoByteus, Codex, and Claude status projectors.
- Team runtime status snapshot service exists but may need dependency injection/wiring for member-runtime teams, not only native teams.
- Run-history metadata currently records coarse `ACTIVE`/`IDLE`; whether to persist fine-grained status is a follow-up decision unless needed for reload correctness.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases Covered |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-005 |
| REQ-002 | UC-001, UC-002, UC-005 |
| REQ-003 | UC-003, UC-004 |
| REQ-004 | UC-001, UC-002, UC-004 |
| REQ-005 | UC-001, UC-004 |
| REQ-006 | UC-002 |
| REQ-007 | UC-001, UC-002, UC-003 |
| REQ-008 | UC-003, UC-004 |
| REQ-009 | UC-001, UC-002, UC-004 |
| REQ-010 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| REQ-011 | UC-002 |
| REQ-012 | UC-002 |
| REQ-013 | UC-001, UC-002, UC-003, UC-004, UC-006 |
| REQ-014 | UC-001, UC-002, UC-004, UC-006 |
| REQ-015 | UC-001, UC-002, UC-006 |
| REQ-016 | UC-002, UC-006 |
| REQ-017 | UC-001, UC-002, UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Architectural source-of-truth audit |
| AC-002 | Normal single-agent completion |
| AC-003 | User interrupt / runtime interruption |
| AC-004 | Reconnect after completion/race window |
| AC-005 | Active team reconnect/member snapshot |
| AC-006 | Input button interrupt eligibility correctness |
| AC-007 | Executable validation coverage |
| AC-008 | Team status payload contract migration |
| AC-009 | Single team aggregate owner across live/snapshot |
| AC-010 | Frontend hydration/recovery/history coarse status migration |
| AC-011 | Offline versus active idle distinction after restart |
| AC-012 | First-load history API status projection correctness |
| AC-013 | Active team aggregate must not be fanned out to all member statuses |
| AC-014 | Active refresh/recovery must not revoke backend-granted interrupt permission |

## Approval Status

Approved by user on 2026-05-15 after consolidated comprehensive status-flow proposal. Ready for architecture review.
