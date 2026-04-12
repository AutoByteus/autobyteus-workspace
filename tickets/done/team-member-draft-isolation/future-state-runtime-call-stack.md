Status: Current

# UC-001 Focus Switch Preserves Member Draft Ownership

1. User clicks another member row in the workspace tree.
2. `runHistorySelectionActions.selectTreeRunFromHistory(...)` resolves the team-member selection path.
3. If the local team context is already live/temp, `agentTeamContextsStore.setFocusedMember(memberRouteKey)` updates only `focusedMemberName`.
4. The previously focused member keeps its own `requirement` and `contextFilePaths`.
5. The newly focused member displays its own stored draft state.

# UC-002 Inactive Reopen Preserves Local Draft State

1. User selects a member in an inactive persisted team run.
2. `runHistorySelectionActions.openTeamMemberRunFromHistory(...)` calls `openTeamRun(...)`.
3. `teamRunOpenCoordinator.openTeamRun(...)` hydrates persisted member config/conversation/status from history.
4. For each hydrated member that already exists locally, the coordinator updates runtime/projection fields in place and preserves local unsent draft fields (`requirement`, `contextFilePaths`).
5. The reopened team context focuses the requested member without clearing any other member's draft state.

# Boundary Notes

- Persisted history remains authoritative for conversation and config hydration.
- Local unsent draft fields remain authoritative for pre-send UI state.
