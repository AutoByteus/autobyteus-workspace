# Cross-Node Message Roundtrip Coverage - Proposed Design

## Scope
Small-scope design note for test + transport hardening.

## Current State
- Distributed tests validate parts of routing, transport, and rebroadcast separately.
- No single integration test asserts a full host-to-worker inter-agent dispatch and worker-to-host reply loop.
- Command/event HTTP clients sign in-memory objects before serialization, which can diverge from wire payload when optional fields are undefined.

## Target State
- Add one integration test that validates full roundtrip behavior in one scenario.
- Normalize payload to wire JSON before signing in:
  - `HostDistributedCommandClient`
  - `WorkerEventUplinkClient`

## Change Inventory
- Add:
  - `tests/integration/distributed/cross-node-message-roundtrip.integration.test.ts`
- Modify:
  - `src/distributed/transport/internal-http/host-distributed-command-client.ts`
  - `src/distributed/transport/internal-http/worker-event-uplink-client.ts`
- Remove: None

## Separation of Concerns
- Test file owns behavior verification for cross-node roundtrip.
- Transport clients own consistent signing of wire payloads.
- No orchestration/domain placement behavior is moved or expanded.
