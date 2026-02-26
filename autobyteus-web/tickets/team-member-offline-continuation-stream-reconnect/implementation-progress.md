# Implementation Progress - team-member-offline-continuation-stream-reconnect

## 2026-02-16
- [x] Added `ensureTeamStreamSubscribed(teamId)` in team run store.
- [x] Fixed subscription ordering bug: non-temporary send now subscribes **after** successful `sendMessageToTeam` continuation mutation.
- [x] Kept temporary-team promotion path subscribed via permanent ID.
- [x] Fixed stale-disconnected stream handling: `isSubscribed` now requires healthy websocket state (`connected|connecting|reconnecting`) and forces reconnect for disconnected handles.
- [x] Added store regression tests for offline continuation + promotion flow.
- [x] Added integration test for offline history send re-subscribe behavior.

## Verification
- `pnpm -s vitest run stores/__tests__/agentTeamRunStore.spec.ts tests/integration/team-member-offline-send-resubscribe.integration.test.ts` -> pass (4 tests)
- `pnpm -s vitest run stores/__tests__/agentTeamRunStore.spec.ts tests/integration/team-member-offline-send-resubscribe.integration.test.ts stores/__tests__/runTreeStore.spec.ts tests/integration/workspace-history-draft-send.integration.test.ts` -> pass (25 tests)
- `pnpm -s vitest run stores/__tests__/agentTeamRunStore.spec.ts tests/integration/team-member-offline-send-resubscribe.integration.test.ts stores/__tests__/runTreeStore.spec.ts` -> pass (24 tests)
- `pnpm -s vitest run stores/__tests__/agentTeamRunStore.spec.ts tests/integration/team-member-offline-send-resubscribe.integration.test.ts stores/__tests__/runTreeStore.spec.ts tests/integration/workspace-history-draft-send.integration.test.ts` -> pass (26 tests)
- `pnpm -s vitest run tests/e2e/run-history/team-run-restore-lifecycle-graphql.e2e.test.ts tests/e2e/agent/team-tool-approval-websocket.e2e.test.ts` (backend) -> pass (2 tests)

## Post-Implementation Docs Sync
- No additional global `docs/` updates required; behavior and evidence captured in this ticket folder.
