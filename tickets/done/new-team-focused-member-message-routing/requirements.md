# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by user on 2026-06-12.

## Goal / Problem Statement

When a user opens a new/not-yet-started agent team run, focuses a non-coordinator member (for example `code_reviewer`), and sends the first user message, the first message must target that focused member. Current behavior routes the message to the team coordinator (`solution_designer`) because the composer/send path resolves through the frontend's "active execution" fallback rather than the visible roster focus.

## Investigation Findings

- This is primarily a frontend routing/selection bug, not a backend inability to target a non-coordinator.
- The visible team view can show the roster-focused member (`activeTeamContext.focusedMemberRouteKey`), while the shared composer and send action use `activeExecutionFocusedMemberRouteKey` through `activeContextStore.activeAgentContext` and `agentTeamRunStore.sendMessageToFocusedMember(...)`.
- `utils/teamActiveExecutionMembers.ts` excludes offline non-coordinator members from active-execution candidates; for an all-offline/new team it keeps the coordinator as active, then `resolveActiveExecutionFocusedMemberRouteKey(...)` falls back to the coordinator.
- Existing test coverage currently codifies this old behavior: an all-offline team focused on `delivery_engineer` resolves active execution to `solution_designer`.
- The backend WebSocket contract already accepts `target_member_route_key` for `SEND_MESSAGE`; if a valid non-coordinator target is sent, backend `TeamRun.postMessage(...)` preserves it and `MixedTeamManager.postMessage(...)` resolves/creates the target member handle.
- Existing project requirements for team grid/focus behavior state that the bottom composer sends only to the focused member, so the observed coordinator fallback violates already-documented UI semantics.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, bounded to frontend team target resolution and tests
- Evidence basis: `activeContextStore` and `agentTeamRunStore` use active-execution focus for composer/send; `teamActiveExecutionMembers` filters offline non-coordinator members; backend accepts explicit target route keys.
- Requirement or scope impact: Target selection must distinguish visible roster focus / user-intended initial recipient from active-execution display fallback. Coordinator fallback must remain only for missing/stale target cases, not valid focused-member first sends.

## Recommendations

- Add or revise a single frontend-owned team user-message target resolver so first-message routing uses the valid roster-focused member for a temporary/not-yet-started team.
- Keep the backend `SEND_MESSAGE` route-key contract unchanged unless implementation discovers a target rejection in runtime validation; current evidence shows it already supports explicit target member route keys.
- Update regression tests that currently assert coordinator fallback for all-offline valid focus, replacing that expectation for new/not-yet-started teams.
- Preserve active-run safety behavior for stale focus and existing active/execution contexts: if the focused route is invalid or points to a non-sendable subject, fallback/validation should remain explicit.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User focuses a valid non-coordinator leaf member in a temporary/not-yet-started team run and sends the first message.
- UC-002: User focuses the coordinator in a temporary/not-yet-started team run and sends the first message.
- UC-003: User has a stale/invalid focused member in a team run and attempts to send.
- UC-004: User sends a follow-up message in an already active team run where active-execution target safety already applies.

## Out of Scope

- Changing the configured coordinator role for a team.
- Changing inter-agent handoff semantics after a team member explicitly sends work to another member.
- Replacing the full active-execution display/filtering model for running teams.
- Backend protocol redesign beyond preserving the existing `target_member_route_key` send contract.

## Functional Requirements

- REQ-001: For a temporary/not-yet-started team run, the first user message must target the currently focused valid leaf member, including non-coordinator members.
- REQ-002: For a temporary/not-yet-started team run with the coordinator focused, the first user message must continue to target the coordinator.
- REQ-003: The composer-visible member, draft owner, optimistic user message, finalized context-file owner, and outbound WebSocket `target_member_route_key` must be the same member for first-message sends.
- REQ-004: Backend `SEND_MESSAGE` handling must continue to accept explicit `target_member_route_key` and must not silently replace a valid explicit target with the coordinator.
- REQ-005: Coordinator fallback may be used only when no valid focused send target exists, not when a valid non-coordinator member is focused in a new team.
- REQ-006: Active/running team safety semantics for stale focus or task-agent-only/internal active-execution cases must not regress.
- REQ-007: Existing reference/context-file attachment flow must still finalize and deliver files under the same target member that receives the message.

## Acceptance Criteria

- AC-001: Given a temporary/not-yet-started team run with `code_reviewer` focused and all members offline, when the user sends the first message, the frontend sends `target_member_route_key: "code_reviewer"` and the message appears under `code_reviewer`, not `solution_designer`.
- AC-002: Given a temporary/not-yet-started team run with `solution_designer` focused, when the user sends the first message, the frontend sends `target_member_route_key: "solution_designer"`.
- AC-003: Given a temporary/not-yet-started team run with a valid non-coordinator focused member and context attachments, when the user sends, draft/final context-file ownership uses that focused member route key.
- AC-004: Given a stale focused route key that is not present in the team member map, send does not invent an arbitrary non-coordinator target; it follows the explicit fallback/validation path.
- AC-005: Given an explicit backend `SEND_MESSAGE` target member route key, backend handling passes that target into `TeamRun.postMessage(...)` and does not trigger coordinator fallback.
- AC-006: Existing tests that currently expect all-offline valid non-coordinator focus to resolve to coordinator are updated or split so new/not-yet-started team sends assert focused-member targeting.

## Constraints / Dependencies

- Must fit the current Pinia/Nuxt frontend state model.
- Must preserve the existing backend WebSocket `SEND_MESSAGE` route-key shape.
- Must avoid compatibility-only dual paths that preserve the old coordinator-forcing behavior for the in-scope first-message path.
- Must keep stale/invalid target handling explicit so users do not accidentally send to a hidden or invalid member.

## Assumptions

- The focused member shown in the UI represents the user's intended recipient for a first message in a not-yet-started team run.
- A backend-created mixed team run can lazily start any valid leaf agent member when `target_member_route_key` points to that member.
- Coordinator fallback remains appropriate only when the user did not choose a valid target or the chosen target is stale.

## Risks / Open Questions

- OQ-001: Should the same focused-member-first behavior apply to restored inactive historical team runs, or only to temporary newly-created runs? Proposed scope: temporary/not-yet-started runs only unless user approves broader behavior.
- OQ-002: How should first-message targeting work when a nested subteam node, not a leaf agent, is focused? Proposed scope: preserve current subteam handling unless implementation shows the same bug affects it.
- OQ-003: Is there any UI copy that currently says the composer target is the active-execution member rather than the roster-focused member? If so, it must be aligned.

## Requirement-To-Use-Case Coverage

- REQ-001: UC-001
- REQ-002: UC-002
- REQ-003: UC-001, UC-002
- REQ-004: UC-001, UC-002
- REQ-005: UC-001, UC-003
- REQ-006: UC-003, UC-004
- REQ-007: UC-001, UC-002

## Acceptance-Criteria-To-Scenario Intent

- AC-001: Verifies the reported bug path.
- AC-002: Verifies coordinator remains valid when explicitly focused.
- AC-003: Protects context/reference-file ownership consistency.
- AC-004: Protects stale-focus safety.
- AC-005: Confirms backend does not override valid explicit targets.
- AC-006: Ensures durable regression coverage reflects the corrected product behavior.

## Approval Status

Approved by user on 2026-06-12 in conversation. Formal design spec produced for architecture review.
