# Investigation Notes - discovery-client-registration-recovery

## Sources Consulted
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-server-ts/src/discovery/services/discovery-registry-client-service.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-server-ts/src/api/rest/node-discovery.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-server-ts/tests/e2e/discovery/discovery-process-smoke.e2e.test.ts`

## Findings
1. Discovery client currently calls `registerToDiscoveryRegistry()` only once during `start()`.
2. If registry is not available during client startup, initial register fails and is swallowed.
3. Periodic loop only sends heartbeats/sync. It does not retry register explicitly.
4. Heartbeat endpoint returns HTTP 200 with `accepted=false` and `code=HEARTBEAT_UNKNOWN_NODE` for unknown clients; current client treats all 200 as success.
5. Current e2e only validates `registry-first` startup order, not `client-first`.

## Root Cause
Registration is not recovered after startup failure, and heartbeat unknown-node signals are ignored.

## Implication
Node discovery converges only when startup order is favorable; cross-node orchestration becomes brittle.
