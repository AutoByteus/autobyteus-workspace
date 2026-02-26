# Implementation Plan

## Scope

Fix team history selection semantics so the left tree highlights only the focused team member (not all members), and ensure member focus switching works consistently for both temporary and permanent team contexts.
Also align center team workspace header with focused team member context (default coordinator/member focus), not just static team definition name.

## Tasks

1. Update `TeamRunsSection` selection predicate to include both `teamId` and `memberRouteKey`.
2. Expose selected member route key from `WorkspaceAgentRunsTreePanel` and wire it into `TeamRunsSection`.
3. Update `runTreeStore` selection state to track `selectedTeamMemberRouteKey` and clear/set it on selection transitions.
4. Ensure `selectTreeRun` uses existing local team context (temporary and permanent) for focus switching instead of unnecessarily reopening history.
5. Add/update unit tests for member-level highlight and focus behavior.
6. Update `TeamWorkspaceView` header title derivation to resolve focused member display name with safe fallbacks.
7. Add a focused unit test that asserts the center header reflects focused member context.

## Verification

- `components/workspace/history/__tests__/TeamRunsSection.spec.ts`
- `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- `stores/__tests__/runTreeStore.spec.ts`
- `composables/workspace/history/__tests__/useRunTreeActions.spec.ts`
- `tests/integration/workspace-history-draft-send.integration.test.ts`
- `components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
