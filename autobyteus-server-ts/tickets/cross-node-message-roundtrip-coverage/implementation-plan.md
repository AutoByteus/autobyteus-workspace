# Cross-Node Message Roundtrip Coverage - Implementation Plan

## Strategy
Bottom-up, test-first for distributed transport path.

## Tasks
1. Add a dedicated distributed integration test validating:
   - host routing through `TeamRoutingPortAdapter`,
   - worker command receipt through HTTP command route,
   - worker reply uplink through HTTP event route,
   - host aggregation of remote reply event.
2. Run the new test and capture failures.
3. Apply minimal production fix required by failing behavior.
4. Re-run:
   - new test in isolation,
   - distributed integration suite,
   - targeted unit tests for modified transport modules.
5. Record outcomes in implementation progress.

## Verification Matrix
- UC-1 (roundtrip command + reply):
  - `tests/integration/distributed/cross-node-message-roundtrip.integration.test.ts`
- Transport safety for modified modules:
  - `tests/unit/distributed/host-distributed-command-client.test.ts`
  - `tests/unit/distributed/register-host-distributed-event-routes.test.ts`
  - `tests/unit/distributed/register-worker-distributed-command-routes.test.ts`
