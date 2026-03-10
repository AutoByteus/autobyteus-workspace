# Future-State Runtime Call Stack

- Ticket: `run-history-worktree-live-stream-loss`
- Date: `2026-03-10`

## UC-001 Historical team-row click opens a usable team context

1. User clicks a team top row in `WorkspaceHistoryWorkspaceSection.vue`.
2. `WorkspaceHistorySectionActions.onSelectTeam(team)` receives the full `TeamTreeNode`.
3. `useWorkspaceHistorySelectionActions.onSelectTeam` checks whether that team is already the selected team.
4. If not already selected:
   - it persists expansion state with `setTeamExpanded(team.teamRunId, true)`,
   - resolves the target member row using `team.focusedMemberName` or `team.members[0]`,
   - delegates to `runHistoryStore.selectTreeRun(targetMember)`.
5. `runHistoryStore.selectTreeRun` routes into `selectTreeRunFromHistory`.
6. `selectTreeRunFromHistory`:
   - reuses local team context if present, or
   - hydrates/open history through `openTeamMemberRun`.
7. `selectionStore.selectRun(teamRunId, 'team')` now points to a team run ID with a usable loaded `AgentTeamContext`.
8. `TeamWorkspaceView`, `AgentTeamEventMonitor`, and `ActivityFeed` render from a valid focused member context.

## UC-002 Switching to another team does not hide the previously opened live team section

1. User has already opened live team `A`.
2. `useWorkspaceHistorySelectionActions.onSelectTeam(teamA)` persisted `expandedTeams[teamA] = true`.
3. User clicks historical team `B`.
4. `useWorkspaceHistorySelectionActions.onSelectTeam(teamB)` persists `expandedTeams[teamB] = true`.
5. `useWorkspaceHistoryTreeState.isTeamExpanded(teamA)` still returns `true` because expansion is now explicit, not only implied by current selection.
6. Team `A` remains visible in the tree while team `B` becomes the active selection/opened context.

## UC-003 Re-clicking the already selected team keeps explicit user collapse behavior

1. User clicks the currently selected team top row.
2. `useWorkspaceHistorySelectionActions.onSelectTeam(team)` recognizes that the row is already selected.
3. It calls `toggleTeam(team.teamRunId)` and returns without changing selection/hydration.
4. Expand/collapse stays under explicit user control, but cross-team navigation no longer collapses prior teams implicitly.

## UC-004 Removing an empty draft agent run clears only local draft state

1. User creates a draft agent run and sends no first message.
2. `WorkspaceHistoryWorkspaceSection.vue` renders a draft-only remove action for the run row.
3. User clicks the remove action.
4. `useWorkspaceHistoryMutations.onDeleteRun(run)` recognizes the row as a local draft (`source === 'draft'` / temp ID).
5. It delegates to a local draft-removal handler instead of opening the persisted-history delete confirmation.
6. The local agent draft context is removed from the in-memory store.
7. The row disappears from the tree without calling the persisted-history delete API.

## UC-005 Removing an empty draft team run clears only local draft state

1. User creates a draft team run and sends no first message.
2. `WorkspaceHistoryWorkspaceSection.vue` renders a draft-only remove action for the team row.
3. User clicks the remove action.
4. `useWorkspaceHistoryMutations.onDeleteTeam(team)` recognizes the row as a temp local team draft.
5. It delegates to a local draft-team removal handler instead of opening the persisted-history delete confirmation.
6. The local team draft context is removed from the in-memory team store.
7. The row disappears from the tree without calling the persisted-history delete API.

## UC-006 Persisted history deletion remains unchanged

1. User clicks delete on a non-temp inactive agent or team history row.
2. `useWorkspaceHistoryMutations` still opens the existing delete confirmation flow.
3. `confirmDeleteRun()` delegates to the persisted-history delete handlers only for real non-temp IDs.
4. Success and error toast behavior remains unchanged for persisted history.

## Expected Invariants

- No team row is selected into the global workspace without a matching usable team context unless the row truly has no member target.
- Previously opened team sections stay expanded until explicitly collapsed.
- Team member row selection behavior remains the same because it already routes through `runHistoryStore.selectTreeRun`.
- Temp local drafts are removable without using persisted-history delete mutations.
- Persisted-history delete behavior remains unchanged for real run/team IDs.
