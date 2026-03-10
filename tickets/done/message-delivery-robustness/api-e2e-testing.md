# API / E2E Testing

- Ticket: `message-delivery-robustness`
- Status: `Pass`
- Last Updated: `2026-03-10`

## Boundary Note

- `AV-001` through `AV-004` use the strongest executable boundary available for server-originated assistant replies. The current server exposes no public mutation or admin endpoint that can synthesize an assistant reply or inspect callback outbox state directly, so these scenarios are accepted through the shared runtime integration path with real file-backed persistence and a live fake callback endpoint.
- `AV-005` and `AV-006` remain true GraphQL/runtime e2e coverage through the managed messaging gateway boundary.
- The full acceptance slice and the local Docker smoke were rerun after the `v3` managed gateway structural split and again after fast-forwarding `origin/personal`; no scenario behavior changed.
- The `origin/personal` merge introduced `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` as a managed-gateway runtime env prerequisite, so the recovery e2e now seeds the active server listen address before asserting restart behavior.

## Scenario Results

| Scenario ID | Covers | Execution | Result | Evidence |
| --- | --- | --- | --- | --- |
| AV-001 | AC-001, AC-005 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Pass | Runtime integration proved a queued callback stayed persisted while the callback target returned `503`, then delivered successfully after the target became available; outbox and delivery-event states remained separately inspectable |
| AV-002 | AC-002 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Pass | Runtime integration proved an expired `DISPATCHING` lease was reclaimed and delivered after worker-restart semantics, so in-flight work does not stay stuck permanently |
| AV-003 | AC-003, AC-005 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Pass | Runtime integration proved bounded retry exhaustion moved the callback to `DEAD_LETTER` with preserved attempt count and last error while the delivery event transitioned to `FAILED` |
| AV-004 | AC-004 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Pass | Runtime integration proved a duplicate callback idempotency key produced one durable outbox record and one downstream callback attempt |
| AV-005 | AC-006 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/messaging/managed-messaging-gateway-recovery.e2e.test.ts` | Pass | Real GraphQL/runtime e2e proved the server restarted the managed gateway after an unexpected child-process exit, and the same scenario still passed after the managed gateway `v3` file split and the later `origin/personal` merge once the recovery fixture seeded the internal server base URL |
| AV-006 | AC-007 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/messaging/managed-messaging-gateway-recovery.e2e.test.ts` | Pass | Real GraphQL/runtime e2e proved stale-heartbeat supervision triggered bounded recovery and returned a runtime with fresh reliability heartbeats; the same scenario still passed after the managed gateway `v3` file split and the later `origin/personal` merge once the recovery fixture seeded the internal server base URL |

## Supplementary Local Docker Validation

| Check ID | Execution | Result | Evidence |
| --- | --- | --- | --- |
| DV-001 | `./scripts/personal-docker.sh up --project msg-delivery-stage7 -r 0 --no-seed-test-fixtures --no-sync-remotes` | Pass | The merged `origin/personal` branch built the all-in-one image and started the containerized server+gateway stack successfully |
| DV-002 | `curl -s -X POST http://127.0.0.1:55974/graphql -H 'content-type: application/json' --data '{"query":"{ __typename }"}'` and `curl -s http://127.0.0.1:55978/health` | Pass | GraphQL returned `{"data":{"__typename":"Query"}}` and gateway `/health` returned `{"service":"autobyteus-message-gateway","status":"ok",...}` on the merged-branch stack |
| DV-003 | `docker exec msg-delivery-stage7-main-allinone-1 kill -9 24` then re-check `supervisorctl status message_gateway`, `pgrep -af 'autobyteus-message-gateway/dist/index.js'`, and `/health` | Pass | The rebuilt deployed stack recovered the gateway automatically after the merge; PID changed from `24` to `732` and `/health` returned `status":"ok"` after restart |

## Commands Run

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts

pnpm -C autobyteus-server-ts exec vitest run \
  tests/e2e/messaging/managed-messaging-gateway-recovery.e2e.test.ts

pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.test.ts \
  tests/e2e/messaging/managed-messaging-gateway-recovery.e2e.test.ts

pnpm -C autobyteus-server-ts exec vitest run --maxWorkers 1 --no-file-parallelism \
  tests/unit/external-channel/services/reply-callback-service.test.ts \
  tests/unit/external-channel/runtime/gateway-callback-dispatch-target-resolver.test.ts \
  tests/unit/external-channel/runtime/gateway-callback-outbox-store.test.ts \
  tests/unit/external-channel/runtime/gateway-callback-outbox-service.test.ts \
  tests/unit/external-channel/runtime/gateway-callback-dispatch-worker.test.ts \
  tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts \
  tests/unit/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.test.ts \
  tests/unit/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.delivery.test.ts \
  tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.test.ts \
  tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-health.test.ts \
  tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.test.ts \
  tests/unit/config/server-runtime-endpoints.test.ts \
  tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts \
  tests/e2e/messaging/managed-messaging-gateway-recovery.e2e.test.ts

./scripts/personal-docker.sh up --project msg-delivery-stage7 -r 0 --no-seed-test-fixtures --no-sync-remotes
curl -s -X POST http://127.0.0.1:55974/graphql -H 'content-type: application/json' --data '{"query":"{ __typename }"}'
curl -s http://127.0.0.1:55978/health
docker exec msg-delivery-stage7-main-allinone-1 supervisorctl status
docker exec msg-delivery-stage7-main-allinone-1 pgrep -af 'autobyteus-message-gateway/dist/index.js'
docker exec msg-delivery-stage7-main-allinone-1 kill -9 24
docker exec msg-delivery-stage7-main-allinone-1 supervisorctl status message_gateway
docker exec msg-delivery-stage7-main-allinone-1 pgrep -af 'autobyteus-message-gateway/dist/index.js'
curl -s http://127.0.0.1:55978/health
./scripts/personal-docker.sh down --project msg-delivery-stage7 --delete-state
```

## Gate Decision

- Stage 7 Result: `Pass`
- Re-entry needed: `Resolved Local Fix (Stage 10 merge validation -> 6 -> 7)`
- Blocking gap: `None`
