# Requirements - team-member-status-binding-fix

## Goal / Problem
Fix incorrect team-member status display in workspace team view: the header shows focused member name but renders team aggregate status, causing misleading `Idle` state for all members.

## Scope Triage
- Size: `Small`
- Rationale: UI-layer binding bug in one component plus unit-test updates; no API/schema/storage changes.

## In-Scope Use Cases
1. When a team is selected and a member is focused, header status reflects that focused member's `AgentStatus`.
2. When focused member cannot be resolved, header status falls back to team status.
3. Existing member-name/title behavior remains unchanged.

## Acceptance Criteria
1. Header badge uses focused member status for focused-member views.
2. Fallback to team status is preserved when focused member context is absent.
3. Unit tests cover both focused-member path and fallback path.
4. Existing team header title tests still pass.

## Constraints / Dependencies
- Must preserve current selection model (`activeTeamContext`, `focusedMemberName`, `members` map).
- Must keep component concerns clear (title and status derived from same selected-member context).

## Assumptions
- Focused member status is sourced from `AgentContext.state.currentStatus`.
- Team status remains valid fallback for non-member-focused states.

## Open Questions / Risks
- None blocking for this small scope.
