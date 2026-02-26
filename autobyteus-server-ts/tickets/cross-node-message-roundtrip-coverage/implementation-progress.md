# Cross-Node Message Roundtrip Coverage - Implementation Progress

## 2026-02-17
- Added `tests/integration/distributed/cross-node-message-roundtrip.integration.test.ts`.
- Initial run exposed real bug:
  - command dispatch failed with `INVALID_SIGNATURE` due signing mismatch on undefined fields.
- Implemented fix:
  - `src/distributed/transport/internal-http/host-distributed-command-client.ts`
  - `src/distributed/transport/internal-http/worker-event-uplink-client.ts`
  - both now sign normalized JSON payload exactly as transmitted.
- Verification:
  - `pnpm vitest run tests/integration/distributed/cross-node-message-roundtrip.integration.test.ts` passed.
  - `pnpm vitest run tests/integration/distributed` passed.
  - `pnpm vitest run tests/unit/distributed/host-distributed-command-client.test.ts tests/unit/distributed/worker-uplink-routing-adapter.test.ts tests/unit/distributed/register-worker-distributed-command-routes.test.ts tests/unit/distributed/register-host-distributed-event-routes.test.ts` passed.
  - Full suite `pnpm test -- --run` passed on rerun (`280 passed`, `3 skipped` files).
