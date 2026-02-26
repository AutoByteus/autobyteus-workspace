# Implementation Progress

## Completed

- `components/workspace/history/TeamRunsSection.vue`
  - Member selection now keyed by `(teamId, memberRouteKey)`.
- `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - Passes `selectedTeamMemberRouteKey` to `TeamRunsSection`.
  - Resolves focused member from active team context first.
- `stores/runTreeStore.ts`
  - Added `selectedTeamMemberRouteKey` state.
  - Clears/sets member key on team/agent selection transitions.
  - `selectTreeRun` now uses local team context for permanent teams as well.
- Tests updated:
  - `components/workspace/history/__tests__/TeamRunsSection.spec.ts`
  - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
  - `stores/__tests__/runTreeStore.spec.ts`
- `components/workspace/team/TeamWorkspaceView.vue`
  - Header now reflects focused member display name (default coordinator/member focus) with fallback to team name.
- Tests added:
  - `components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`

## Verification

Command:
`pnpm exec vitest --run components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/history/__tests__/TeamRunsSection.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/runTreeStore.spec.ts`

Result:
- `4 files passed`
- `42 tests passed`
