# Investigation Notes

- Ticket: `temp-team-selection-metadata-error`
- Date: `2026-04-05`
- Stage: `1`

## Scope Triage

- Classification: `Small`
- Rationale:
  - The failure is isolated to frontend team selection behavior before first send.
  - Current evidence points to one incorrect local-vs-history branch plus regression tests.
  - No backend change is required unless later validation disproves the current analysis.

## Reproduction Summary

1. Create a new team run from the run configuration UI.
2. The frontend creates a local temporary team context such as `temp-team-1775...`.
3. Before sending any first message, click the team again or click its coordinator/member entry.
4. The UI surfaces `Team run metadata not found for 'temp-team-...'`.

## Evidence

### 1. Draft team runs are created locally before first send

- File: `autobyteus-web/stores/agentTeamContextsStore.ts`
- `createRunFromTemplate()` creates a local `teamRunId` with the `temp-team-...` prefix.
- It constructs member `AgentContext` instances locally, sets the focused member to the coordinator, stores the team in `teams`, and immediately selects it in `agentSelectionStore`.
- The created draft context starts with:
  - `isSubscribed: false`
  - `currentStatus: AgentTeamStatus.Idle`

Conclusion:
- Before the first message, the team already exists locally and should be selectable without persisted-history hydration.

### 2. Team-row selection routes through member selection

- File: `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts`
- `onSelectTeam(team)` resolves a target member from `focusedMemberName` or the first member.
- It then calls `runHistoryStore.selectTreeRun(targetMember)` before selecting the team row.

Conclusion:
- Clicking a team row is effectively a member-open request under the hood.

### 3. Member selection only trusts local teams when they are subscribed/live

- File: `autobyteus-web/stores/runHistorySelectionActions.ts`
- In `selectTreeRun(...)`, the team-member branch does:
  - read `localTeamContext = teamContextsStore.getTeamContextById(row.teamRunId)`
  - use the local fast path only when `localTeamContext?.isSubscribed` is true
  - otherwise call `store.openTeamMemberRun(row.teamRunId, row.memberRouteKey)`

Conclusion:
- Draft temp teams are local but unsubscribed, so they miss the local fast path and fall through to history hydration.

### 4. History hydration requires backend metadata and therefore fails for temp IDs

- Files:
  - `autobyteus-web/stores/runHistorySelectionActions.ts`
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - backend error source: `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `openTeamMemberRun(...)` eventually calls `openTeamRun(...)`, which loads team hydration payload from persisted history.
- Backend persisted-history services throw `Team run metadata not found for '<teamRunId>'` when no stored metadata exists.

Conclusion:
- The observed error is a predictable result of asking persisted-history hydration to open a not-yet-persisted draft team.

### 5. Single-agent draft behavior is different and already correct

- File: `autobyteus-web/stores/runHistorySelectionActions.ts`
- Agent selection distinguishes history rows with `row.source === 'history'`.
- Non-history agent rows reuse the local `agentContextsStore` context directly.

Conclusion:
- Team draft selection currently lacks the equivalent draft/local guard that agent draft selection already has.

### 6. Existing tests already encode the current persisted-team reopening behavior

- File: `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- Existing regression coverage expects:
  - subscribed live teams use the local fast path
  - non-subscribed persisted teams reopen through `openTeamMemberRun(...)`

Conclusion:
- The fix should be narrow:
  - preserve the persisted inactive team reopen path
  - add a local fast path for temp draft teams that exist in memory but are not yet subscribed

## Root Cause

The team selection code uses `isSubscribed` as the sole signal that a local team context is safe to reuse. That assumption is false for draft temp teams: they are intentionally local and unsubscribed before the first message, but they are still the authoritative context. Because temp team rows do not carry a separate `source: 'draft'` discriminator, the selection branch falls through into persisted-history hydration and requests backend metadata that cannot exist yet.

## Fix Direction

- Keep persisted inactive non-temp team behavior unchanged.
- Treat local `temp-team-*` contexts as authoritative during team/member selection even when `isSubscribed` is `false`.
- Add targeted regression tests for the draft temp-team member selection path and, if helpful, the team-row click path that routes through it.
