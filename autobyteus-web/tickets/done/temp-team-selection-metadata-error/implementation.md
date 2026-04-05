# Implementation

- Ticket: `temp-team-selection-metadata-error`
- Scope: `Small`
- Last Updated: `2026-04-05`

## Solution Sketch

### Problem Summary

The team selection path currently decides whether to reuse local team state or reopen persisted team history using `isSubscribed` as the primary signal. That works for active live teams, but it is wrong for draft `temp-team-*` teams because draft teams are local, authoritative, and intentionally unsubscribed before first send.

As a result, clicking a draft team row or draft member row falls through into the persisted team reopen path and triggers a backend metadata lookup for a team run that has not been persisted yet.

### Chosen Design

Update the team-member branch in `autobyteus-web/stores/runHistorySelectionActions.ts` so it reuses the local team context when either of the following is true:

1. the local team is already subscribed/live, or
2. the selected team run ID is a draft temp team ID and a matching local team context exists.

When the local path is used, keep the current behavior:

- switch focused member through `agentTeamContextsStore.setFocusedMember(...)`
- select the team in `agentSelectionStore`
- update run-history selection bookkeeping
- clear buffered run/team configs

When neither condition is true, preserve the existing persisted-history reopen path through `openTeamMemberRun(...)`.

### Why This Is The Most Reasonable Boundary

- Draft temp teams are frontend-owned state until the first message creates/promotes the real run.
- Subscribed/live teams are also safe to reuse locally because the local context is already attached to the active runtime.
- Persisted inactive non-temp teams should still reopen from history so the UI reconstructs the correct stored state instead of trusting a potentially stale inactive in-memory copy.

### Files Expected To Change

- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- Possibly `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` if an interaction-level regression test adds useful coverage.

### Regression Cases To Prove

- Draft temp team member selection uses the local path even when `isSubscribed === false`.
- Draft temp team row selection no longer produces the metadata error because it routes through the corrected member-selection logic.
- Existing subscribed/live team local fast path remains unchanged.
- Existing persisted inactive team reopen path remains unchanged.

### Risk Notes

- The change must not broaden local reuse to every non-subscribed non-temp team context, because that would change the existing persisted inactive team reopen behavior.
- The change should remain selection-boundary only; no backend or run-creation flow changes are needed.

## Implementation Execution

### Applied Change

- Updated `autobyteus-web/stores/runHistorySelectionActions.ts` so team-member selection reuses the local team context when:
  - the local team is subscribed/live, or
  - the selected team run is a draft `temp-team-*` with a matching local context.

### Regression Coverage Added

- Added a store-level regression in `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` proving that a non-subscribed draft temp team stays on the local selection path and does not reopen through persisted history.

### Changed Files

- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`

### Delta / Placement Check

- Changed source implementation files remain well under the Stage 8 size limits.
- The fix stays in the existing selection-boundary owner (`runHistorySelectionActions.ts`) rather than leaking into unrelated hydration or backend layers.
- No backward-compatibility or legacy-retention branch was introduced.
