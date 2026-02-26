# Requirements - agent-team-member-node-hints-removal

## Goal / Problem
In Agent Team edit/create form, each member is chosen from a concrete source node (`homeNodeId`). The right-side Member Details still shows `Required Node` and `Preferred Node` selectors, which are redundant in this flow and can create conflicting placement hints.

## Scope Triage
- Size: `Small`
- Rationale: Single UI form concern + unit test updates; no backend schema change.

## In-Scope Use Cases
1. User selects a member in Team Canvas and edits details; node hint selectors are not shown.
2. Submitting create/edit payload from this form sends `requiredNodeId: null` and `preferredNodeId: null` for each member.
3. Editing existing teams with legacy node hints clears those hints when saved via this form.

## Acceptance Criteria
1. `Required Node` and `Preferred Node` controls are removed from `Member Details` UI.
2. Form submit payload always normalizes `requiredNodeId` and `preferredNodeId` to `null`.
3. Initial form hydration does not preserve node hint values into editable state.
4. Component tests cover removed controls and null normalization behavior.

## Constraints / Dependencies
- Keep existing `homeNodeId` behavior unchanged.
- Do not modify backend API contract in this task.

## Assumptions
- Team member source node is decided by library selection (`homeNodeId`) and is sufficient for current UX.

## Open Questions / Risks
- Other non-UI entrypoints can still set node hints; this task intentionally scopes to this form only.
