# Handoff

- Ticket: `live-run-stream-reconnect-after-reload`
- Last Updated: `2026-03-10`
- Status: `Verified; repository finalization in progress`

## What Changed

- Active single-agent runs now recover in the background after each history fetch, reconnecting their live streams without requiring a new send action or selection change.
- Active team runs now recover through a shared team run-open coordinator, so reloaded teams rebuild store-owned member contexts and reconnect their live streams in the background.
- Explicit team history opens now reuse the same team coordinator instead of duplicating hydrate logic in selection actions.
- Existing team websocket services can now reattach to the latest store-owned team context, preventing live activity from continuing on the right side while the middle event monitor stays bound to a detached stale context.
- Recovery orchestration and recovery regression coverage were split into companion files to keep all touched source and test files under the Stage 8 file-size gate.

## Validation

- `pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts stores/__tests__/runHistoryStore.recovery.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentRunStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts components/progress/__tests__/ActivityFeed.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts --run`
  - Result: `8` files passed, `56` tests passed.

## Residual Risk

- Verification in this turn is targeted frontend regression coverage, not a live packaged-Electron repro loop.
- Recovery now ensures active runs are live in frontend state after history fetches, but the final product confirmation should still be a manual desktop check of reload behavior with one active agent run and one active team run.

## Release Notes

- `release-notes.md` is prepared for the desktop release flow because explicit user verification has now been received and Stage 10 repository finalization is being executed.
