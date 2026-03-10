# Implementation Plan

- Ticket: `run-history-worktree-live-stream-loss`
- Scope: `Medium`
- Status: `Ready For Implementation`

## Planned Changes

1. Update team history row selection flow so top-row clicks receive the full `TeamTreeNode` and resolve through `runHistoryStore.selectTreeRun` using the focused/default member.
2. Add explicit `setTeamExpanded` support in the tree-state composable and use it to keep previously opened teams expanded across cross-team navigation.
3. Update work tree contracts/component wiring to use the new team-row action signature and explicit expansion setter.
4. Extend work tree mutation handling so draft agent/team rows use local removal handlers while persisted inactive history rows keep the existing confirmation-driven delete flow.
5. Add or update the underlying local-draft cleanup store APIs needed for team draft removal.
6. Extend `WorkspaceAgentRunsTreePanel` regression tests for:
   - historical team top-row selection hydrating through `selectTreeRun`,
   - previously opened team rows staying visible when another team is selected,
   - draft agent removal,
   - draft team removal.
7. Add a focused store regression test for local team-draft discard behavior.

## Planned Verification

- `cd autobyteus-web && pnpm test:nuxt components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts --run`
- `cd autobyteus-web && pnpm test:nuxt stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentRunStore.spec.ts stores/__tests__/runHistoryStore.spec.ts --run`
- `cd autobyteus-web && pnpm test:nuxt components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/progress/__tests__/ActivityFeed.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts --run`
