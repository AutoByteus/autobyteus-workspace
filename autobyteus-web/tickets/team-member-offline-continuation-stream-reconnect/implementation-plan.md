# Implementation Plan - team-member-offline-continuation-stream-reconnect

## Small-Scope Solution Sketch
- Add a store-level `ensureTeamStreamSubscribed(teamId)` guard in `agentTeamRunStore`.
- For non-temporary team sends, ensure stream subscription before mutation dispatch.
- Reuse same subscription guard after temporary->permanent ID promotion.
- Add regression tests for offline historical team send path.

## Tasks
1. Update `stores/agentTeamRunStore.ts` with subscription guard and send-flow integration.
2. Extend `stores/__tests__/agentTeamRunStore.spec.ts` with offline-send and promotion coverage.
3. Add integration test for offline team-member send flow.
4. Run targeted frontend test suite.
5. Re-run backend continuation E2E to confirm end-to-end continuation assumptions remain valid.

## Verification Strategy
- Frontend unit: `stores/__tests__/agentTeamRunStore.spec.ts`
- Frontend integration: `tests/integration/team-member-offline-send-resubscribe.integration.test.ts`
- Frontend regression set: `stores/__tests__/runTreeStore.spec.ts`, `tests/integration/workspace-history-draft-send.integration.test.ts`
- Backend E2E continuation baseline: `tests/e2e/run-history/team-run-restore-lifecycle-graphql.e2e.test.ts`
