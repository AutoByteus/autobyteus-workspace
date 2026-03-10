# Implementation Plan

- Ticket: `live-run-stream-reconnect-after-reload`
- Scope: `Medium`
- Status: `Implemented`

## Planned Changes

1. Add an active-run recovery coordinator that reconciles fetched run history against currently active local runtime contexts and reopens missing live runs in the background.
2. Extend the single-agent run-open coordinator so recovery can hydrate and reconnect active runs without mutating selection or view-specific state.
3. Add a dedicated team run-open coordinator so explicit team opens and background team recovery share one hydrate/connect path instead of duplicating team rehydration logic in selection actions.
4. Update run-history refresh flow to trigger active-run recovery after history fetches, while keeping inactive history rows projection-only.
5. Harden team streaming services so an existing service can reattach to the latest store-owned team context before reconnecting, preventing live events from streaming into detached stale objects.
6. Update team-selection actions to route explicit history opens through the new team coordinator.
7. Add regression coverage for:
   - background recovery of active single-agent runs after history fetch,
   - background recovery of active team runs after history fetch,
   - team streaming service context reattachment,
   - inactive history opens remaining non-streaming.

## Planned Verification

- `pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts --run`
- `pnpm -C autobyteus-web test:nuxt stores/__tests__/agentRunStore.spec.ts --run`
- `pnpm -C autobyteus-web test:nuxt components/progress/__tests__/ActivityFeed.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts --run`
