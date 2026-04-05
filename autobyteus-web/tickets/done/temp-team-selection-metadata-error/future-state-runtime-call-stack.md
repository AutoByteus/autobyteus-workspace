# Future-State Runtime Call Stack

- Ticket: `temp-team-selection-metadata-error`
- Last Updated: `2026-04-05`

## Primary Use Case

- `UC-001`: User clicks a draft temp team row or a draft temp team member before the first message is sent.

## Entry A: Team Row Click

1. `WorkspaceHistoryWorkspaceSection.vue`
   - user clicks `actions.onSelectTeam(team)`
2. `useWorkspaceHistorySelectionActions.ts:onSelectTeam(team)`
   - expand the team row
   - resolve the target member from `focusedMemberName`, else first member
   - delegate to `runHistoryStore.selectTreeRun(targetMember)`
3. `runHistorySelectionActions.ts:selectTreeRun(row)`
   - identify `row` as a team-member selection
   - load `localTeamContext = agentTeamContextsStore.getTeamContextById(row.teamRunId)`
   - evaluate authority:
     - if local team context exists and is subscribed/live -> use local path
     - if local team context exists and `row.teamRunId` is `temp-team-*` -> use local path
     - otherwise -> use persisted-history reopen path
4. Local path behavior
   - `agentTeamContextsStore.setFocusedMember(row.memberRouteKey)`
   - `agentSelectionStore.selectRun(row.teamRunId, 'team')`
   - update `runHistoryStore.selectedTeamRunId`
   - update `runHistoryStore.selectedTeamMemberRouteKey`
   - clear buffered agent/team config stores
5. Control returns to `onSelectTeam(team)`
   - select the team row in `agentSelectionStore`
   - emit run-selected event
6. Result
   - no backend metadata request occurs for draft temp teams
   - workspace remains focused on the correct local team/member context

## Entry B: Team Member Click

1. `WorkspaceHistoryWorkspaceSection.vue`
   - user clicks `actions.onSelectTeamMember(member)`
2. `useWorkspaceHistorySelectionActions.ts:onSelectTeamMember(member)`
   - expand the team row
   - call `runHistoryStore.selectTreeRun(member)`
3. `runHistorySelectionActions.ts:selectTreeRun(row)`
   - same authority decision as Entry A
4. Result
   - draft temp member selections reuse the local team context
   - subscribed/live member selections reuse the local team context
   - persisted inactive non-temp member selections reopen through history hydration

## Persisted-History Reopen Path (Must Remain For Non-Temp Inactive Teams)

1. `runHistorySelectionActions.ts:selectTreeRun(row)`
   - no authoritative local live/draft context qualifies
   - call `store.openTeamMemberRun(row.teamRunId, row.memberRouteKey)`
2. `runHistorySelectionActions.ts:openTeamMemberRunFromHistory(...)`
   - call `openTeamRun(...)`
3. `teamRunOpenCoordinator.ts:openTeamRun(...)`
   - load resume config + metadata + member projections from persisted history
   - rebuild/hydrate the team context
4. Result
   - persisted inactive historical teams still open through the backend-backed source of truth

## Key Boundary Rule

Only two team states are authoritative enough for direct local reuse during selection:

- subscribed/live local teams
- draft temp local teams

All other team selections must continue to use the persisted-history reopen path.
