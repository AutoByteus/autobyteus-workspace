# Cross-Node Message Roundtrip Coverage - Proposed-Design Runtime Call Stack

## Version
v2

## Use Case UC-1: Host member sends message to remote member and receives remote reply

### Primary Path
1. `tests/integration/distributed/cross-node-message-roundtrip.integration.test.ts:it(...)`
2. `src/distributed/routing/team-routing-port-adapter.ts:dispatchInterAgentMessageRequest(...)`
3. `src/distributed/routing/team-routing-port-adapter.ts:ensureRemoteNodeReadyForRun(...)`
4. `src/distributed/transport/internal-http/host-distributed-command-client.ts:sendCommand(...)`
5. `src/distributed/transport/internal-http/register-worker-distributed-command-routes.ts:POST /internal/distributed/v1/commands`
6. `src/distributed/node-bridge/worker-node-bridge-server.ts:handleCommand(...)`
7. Worker handler publishes reply via `src/distributed/transport/internal-http/worker-event-uplink-client.ts:publishRemoteEvent(...)`
8. `src/distributed/transport/internal-http/register-host-distributed-event-routes.ts:POST /internal/distributed/v1/events`
9. `src/distributed/event-aggregation/team-event-aggregator.ts:publishRemoteEvent(...)`
10. Integration assertion checks aggregated host event and worker-received envelope payloads.

### Error/Fallback Branch
- If command signature mismatches wire payload hash:
  - Step 4 throws HTTP 401 from step 5.
  - Adapter returns `{ accepted: false, errorCode: "DISPATCH_FAILED" }`.
- v2 design prevents this by signing normalized wire payload in steps 4 and 7.
