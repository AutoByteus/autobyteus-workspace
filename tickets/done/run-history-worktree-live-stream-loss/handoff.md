# Handoff

- Ticket: `run-history-worktree-live-stream-loss`
- Last Updated: `2026-03-10`
- Status: `Ready for user verification`

## What Changed

- Historical team top-row clicks now hydrate through the existing member-open path instead of only mutating selection.
- Team expansion is now explicit state, so previously opened teams stay visible when another team is selected.
- Empty draft agent runs and empty draft team runs now have local remove flows that do not call persisted-history delete APIs.
- Focused regression coverage was added in a new companion panel spec plus a team-run store regression.

## Validation

- `pnpm -C autobyteus-web test:nuxt components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentRunStore.spec.ts stores/__tests__/runHistoryStore.spec.ts --run`
- `pnpm -C autobyteus-web test:nuxt components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/progress/__tests__/ActivityFeed.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts --run`

## Residual Risk

- Verification is targeted frontend regression coverage rather than a live Electron click-through. A manual desktop repro pass is still the best final confirmation for the original intermittent symptom.

## Release Notes

- Not required for this ticket at the current handoff stage.
