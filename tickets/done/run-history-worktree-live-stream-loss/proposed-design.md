# Proposed Design

- Ticket: `run-history-worktree-live-stream-loss`
- Scope: `Medium`
- Date: `2026-03-10`

## Design Summary

Align team-row clicks in the work tree with the existing team member history open path, make team expansion state explicit/sticky once a team is selected, and add explicit local draft-removal flows for empty agent/team drafts. This keeps the work tree, team workspace, and activity/event surfaces on a real loaded team context instead of a bare selected ID, while also preventing temp runs from getting stranded in the tree.

## Current Failure Mode

1. A historical team top-row click toggles expansion and writes `selectionStore.selectRun(teamRunId, 'team')`.
2. No member hydration/open happens for that row click.
3. `activeTeamContext` becomes `null` when there is no loaded context for the selected team run ID.
4. The center team workspace and right-side activity/event surfaces lose the previously selected live team context.
5. The previously active team’s member list can collapse because expansion was implicit via selection instead of persisted state.
6. Empty draft agent/team runs have no local discard path because temp IDs are rejected by persisted-history delete handlers.

## Target Behavior

1. Team-row click resolves a concrete member target:
   - preferred: `team.focusedMemberName`,
   - fallback: first member row.
2. Team-row click delegates through `runHistoryStore.selectTreeRun(member)` so live and historical teams both use the same selection/hydration path.
3. The clicked team is explicitly marked expanded in local tree UI state.
4. Previously expanded teams stay expanded until the user explicitly toggles them closed.
5. Repeated click on the already selected team row can still act as an explicit expand/collapse toggle.
6. Empty draft agent and team runs expose explicit local remove actions that clear their in-memory contexts without calling persisted-history delete APIs.

## Design Changes

### 1. History Selection Composable

- File: `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts`
- Change:
  - Update `onSelectTeam` to accept a `TeamTreeNode`, not only `teamRunId`.
  - If the row is already the selected team, keep the click as an explicit expand/collapse toggle.
  - Otherwise:
    - mark the team expanded,
    - resolve the default/focused member row,
    - delegate to `runHistoryStore.selectTreeRun(member)` instead of blindly selecting a run ID.

### 2. Tree Expansion State

- File: `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`
- Change:
  - Add explicit `setTeamExpanded(teamRunId, expanded)` helper.
  - Keep `toggleTeam` for user-driven collapse/expand.
  - Use persisted expansion state for teams once selected/opened so selection changes do not implicitly collapse previously visible live teams.

### 3. History Section Contracts / Template Wiring

- Files:
  - `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts`
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- Change:
  - Pass `TeamTreeNode` through the action contract.
  - Wire top-row team click to the updated action.
  - Supply `setTeamExpanded` from the tree-state composable into the selection-action composable.

### 4. Draft Removal Flow

- Files:
  - `autobyteus-web/composables/useWorkspaceHistoryMutations.ts`
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - `autobyteus-web/stores/agentRunStore.ts`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
- Change:
  - Extend work-tree mutation orchestration with explicit local draft-removal handlers separate from persisted-history delete behavior.
  - Agent draft rows (`temp-*`, `source: 'draft'`) should surface a remove action that clears the local draft context directly instead of trying `runHistoryStore.deleteRun`.
  - Team draft rows (`temp-team-*`) should surface a remove action that clears the local team draft context directly instead of trying `runHistoryStore.deleteTeamRun`.
  - Persisted history rows keep the existing confirmation-driven permanent delete flow unchanged.

### 5. Regression Coverage

- Files:
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
  - `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- Change:
  - Replace the current top-row team-click expectation so it asserts hydration through `runHistoryStore.selectTreeRun`.
  - Add regression coverage for multi-team sticky expansion.
  - Add regression coverage for draft agent removal and draft team removal.
  - Add a focused store test for local team-draft discard behavior.

## Why This Fix Matches The Bug

- It removes the invalid state where a team is globally selected without any usable team context.
- It preserves visibility of previously opened live teams in the work tree while the user explores other historical teams.
- It keeps the center event monitor and right-side activity feed aligned with an actual loaded focused member context.
- It separates temp local-draft disposal from persisted-history deletion, which matches the actual lifecycle split already present in the stores.

## Verification Strategy

- Component regression tests for `WorkspaceAgentRunsTreePanel`:
  - team-row click uses `selectTreeRun` with the focused/default member,
  - selecting another team does not collapse a previously opened team section,
  - draft agent and draft team rows expose local remove flows instead of persisted delete.
- Store regression tests:
  - draft team removal clears local context without backend delete,
  - existing persisted delete behavior still rejects temp IDs through the history-delete path.
- Existing member-row selection tests should continue to pass unchanged.
