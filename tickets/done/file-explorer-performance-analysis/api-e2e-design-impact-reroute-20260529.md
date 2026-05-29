# API/E2E Design-Impact Reroute Note

## Context

During API/E2E validation the user clarified that File Explorer live event delivery should not merely forward every raw/domain event immediately to the frontend. The user expects the backend File Explorer event boundary to deliberately batch, coalesce, and reconcile short-window filesystem bursts before sending updates to the frontend.

User intent, paraphrased:

- Backend should not send every raw or domain event immediately to the frontend thread.
- Multiple updates to the same node/path in a short period should be reconciled before delivery.
- Latency of one to three seconds is acceptable if it improves correctness and reduces frontend churn.
- There should be a deliberate event-merge/coalescing design instead of blindly forwarding two immediate change updates when one reconciled update is enough.

## Current State Observed In Validation

The reviewed implementation now has two distinct pieces of behavior:

1. **Frontend reconnect resync after fail-close is fixed.** API/E2E reran the original `VAL-FE-005` validation spec after code review round 3; it passed. The durable frontend regression test added by implementation also passed code review.
2. **Backend event coalescing is only simple composite batching today.** `EventBatcher` uses a `0.25s` batch window and creates one composite JSON event containing all collected `changes`. It bounds queue growth and can fail-close on overflow, but it does not define or implement semantic per-path/per-node reconciliation rules such as modify+modify collapse, create+delete cancellation, delete+add replacement, recursive subtree invalidation, or resync-required messages.

## Why This Is Design Impact

The reviewed requirements/design mention bounded/coalesced event delivery (`REQ-FE-PERF-007`, `DS-007`), but the concrete event semantics are not fully specified. The user clarification expands the remaining question from a bounded frontend callback fix to the backend event-boundary contract and correctness policy.

The missing design details include:

- fixed/adaptive batch window size and whether one to three seconds is acceptable by default or only under burst pressure;
- per-path/per-node coalescing rules;
- create+modify, modify+modify, create+delete, delete+add, rename/move, and recursive directory burst semantics;
- when to send granular events versus a folder/subtree invalidation or whole-tree resync-required signal;
- whether the backend should send a semantic `RESYNC_REQUIRED` / subtree-invalidation message before fail-close instead of relying only on WebSocket close behavior;
- how the existing parent authoritative tree and frontend snapshot refresh remain consistent under coalesced events.

This is larger than the already-fixed frontend reconnect callback because it may change event-delivery semantics and the API/WebSocket contract between backend and frontend.

## Current Evidence

- Stop-path E2E passed: real File Explorer WebSocket close on the large workspace no longer blocks Terminal.
- GraphQL abort passed.
- Frontend fail-close/reconnect/resync validation now passes after the round 3 fix:
  - Temporary original spec rerun log: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/validation-artifacts/api-e2e/frontend-reconnect-resync-validation-round2-20260529.log`
  - Durable reviewed test: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web/stores/__tests__/workspaceStore.reconnect-resync.spec.ts`
- Simple backend batching implementation observed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts/src/file-explorer/watcher/event-batcher.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts/tests/unit/file-explorer/watcher/event-batcher.test.ts`

## Recommended Design Questions

1. Define backend File Explorer event aggregation policy:
   - fixed or adaptive debounce/batch window;
   - max event count and max memory bound;
   - per-path/per-node collapse rules;
   - ordering guarantees.
2. Define semantic event outcomes:
   - granular file events;
   - folder/subtree invalidated;
   - whole-tree snapshot resync required;
   - stream fail-close.
3. Define frontend recovery protocol:
   - reconnect + full root snapshot refresh;
   - targeted folder refresh for subtree invalidation;
   - whether reconnect always refreshes or only refreshes after abnormal close/reconnect.
4. Define durable validation expectations:
   - backend coalescing unit tests for repeated same-path and mixed create/delete/rename sequences;
   - WebSocket/API tests for subtree invalidation or resync-required messages;
   - frontend tests proving abnormal reconnect and any new invalidation message trigger the correct snapshot refresh.

## Routing Recommendation

Classification: `Design Impact` with a possible `Requirement Gap` refinement.

Recommended recipient: `solution_designer`.

Reason: The user clarified a broader event-coalescing architecture expectation that is not fully specified by the current reviewed design. The already-reviewed local frontend reconnect fix is valid and passes API/E2E, but delivery should wait for solution design to decide whether semantic backend coalescing/invalidation is in scope for this ticket or must become a separately designed follow-up.
