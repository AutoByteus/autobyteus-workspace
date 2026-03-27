# Investigation Notes

Use one canonical file:
- `tickets/in-progress/gateway-dead-code-investigation/investigation-notes.md`

Purpose:
- capture durable investigation evidence in enough detail that later stages can reuse the work without repeating the same major searches unless facts have changed
- keep the artifact readable with short synthesis sections, but preserve concrete evidence, source paths, commands, and observations

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale: `autobyteus-message-gateway` has `81` source files and several provider adapters, but the runtime still converges through one composition root and a small number of queue/HTTP boundaries, so the dead-code investigation is cross-cutting without being architecture-scale.
- Investigation Goal: determine whether the current gateway still contains dead code, legacy leftovers, or weakly justified branches, starting from the Telegram flow and then widening into repo-wide usage analysis.
- Primary Questions To Resolve:
  - Is the Telegram flow actually wired end-to-end, or only partially implemented?
  - Which source files are runtime-reachable from the gateway entrypoint?
  - Which symbols are only referenced by tests or legacy docs?
  - Are any config/env fields parsed but no longer consumed by the live runtime?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Web`/`Command`/`Trace`/`Log`/`Data`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-03-26 | Code | `src/index.ts`, `src/bootstrap/start-gateway.ts`, `src/bootstrap/create-gateway-app.ts`, `src/bootstrap/gateway-runtime-lifecycle.ts` | Find the true runtime entrypoint and composition root | Runtime starts at `src/index.ts`, builds config, composes adapters/workers/routes in `create-gateway-app.ts`, and starts queue workers + session supervisors in `gateway-runtime-lifecycle.ts` | No |
| 2026-03-26 | Code | `src/infrastructure/adapters/telegram-business/telegram-business-adapter.ts`, `src/infrastructure/adapters/telegram-business/telegram-bot-client.ts` | Trace Telegram inbound/outbound behavior | Telegram supports both polling and webhook ingress, records peer observations, and sends outbound chunks via Bot API | No |
| 2026-03-26 | Code | `src/http/routes/provider-webhook-route.ts`, `src/http/routes/channel-admin-route.ts`, `src/http/routes/server-callback-route.ts` | Confirm HTTP boundaries around Telegram and outbound delivery | Telegram webhook route is live, Telegram discovery route is live, and outbound callbacks now enqueue into the durable outbox directly | No |
| 2026-03-26 | Command | `rg --files src` | Establish source-file population before usage analysis | `81` TypeScript source files under `src/` | No |
| 2026-03-26 | Command | `pnpm dlx ts-prune -p tsconfig.build.json` | Find exported symbols unused by the production build graph | Confirmed runtime-unused exports include `CallbackIdempotencyService`, `IdempotencyService`, `OutboundChunkPlanner`, `InMemoryIdempotencyStore`, and `defaultRuntimeConfig`; most other hits were type exports or module-local exports | Yes |
| 2026-03-26 | Command | `rg -n "idempotencyTtlSeconds|callbackIdempotencyTtlSeconds|GATEWAY_IDEMPOTENCY_TTL_SECONDS|GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS" src tests` | Check whether old idempotency config is still consumed | Two env/config fields are parsed and tested but not used by any live source outside config parsing | No |
| 2026-03-26 | Command | `rg -n "OutboundMessageService|DeliveryStatusService|DeadLetterService|outbound-message-service|delivery-status-service|dead-letter-service" src tests` | Check whether older obvious legacy service names still exist in current source | No matches in current `src/` or `tests/`; those older services have already been removed from the live code | No |
| 2026-03-26 | Code | `tests/integration/bootstrap/create-gateway-app.integration.test.ts`, `tests/integration/http/routes/provider-webhook-route.integration.test.ts`, `tests/integration/http/routes/channel-admin-route.integration.test.ts`, `tests/unit/infrastructure/adapters/telegram-business/telegram-business-adapter.test.ts` | Verify that Telegram paths are not merely imported, but exercised by tests | Integration and unit tests cover Telegram polling lifecycle, webhook ingress, and peer discovery | No |
| 2026-03-27 | Command | `rg -n "callback-idempotency-service|idempotency-store|in-memory-idempotency-store|outbound-chunk-planner" src` | Re-check that dead-file candidates are not imported anywhere in gateway production source | Only self-contained imports remain inside the dead cluster; no live source file imports the callback-idempotency cluster or the chunk planner | No |
| 2026-03-27 | Command | `rg -n "IdempotencyService|buildInboundIdempotencyKey" src` | Re-check the partially live `idempotency-service.ts` file before cleanup | `buildInboundIdempotencyKey(...)` is still imported by `InboundInboxService`; `IdempotencyService` has no production-source caller | No |
| 2026-03-27 | Command | `rg -n "idempotencyTtlSeconds|callbackIdempotencyTtlSeconds|GATEWAY_IDEMPOTENCY_TTL_SECONDS|GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS" src` | Re-check whether gateway runtime code consumes the old idempotency TTL config | The old TTL fields appear only in `src/config/env.ts` and `src/config/runtime-config.ts`; no other gateway production file reads them | No |
| 2026-03-27 | Command | `rg -n "CallbackIdempotencyService|IdempotencyService|InMemoryIdempotencyStore|OutboundChunkPlanner|defaultRuntimeConfig|GATEWAY_IDEMPOTENCY_TTL_SECONDS|GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS" /Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Check for cross-repository callers before cleanup | No other repository imports the gateway dead-code candidates. `autobyteus-server-ts` still emits the old gateway idempotency env vars in managed runtime env setup, which is an upstream cleanup follow-up, not a gateway runtime dependency. | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `src/index.ts`
  - `src/http/routes/provider-webhook-route.ts`
  - `src/http/routes/server-callback-route.ts`
  - `src/http/routes/channel-admin-route.ts`
- Execution boundaries:
  - HTTP ingress for provider webhooks and admin routes
  - durable inbox/outbox file stores under the reliability queue
  - background workers for inbound forwarding and outbound sending
  - provider adapters for transport-specific behavior
  - session supervisors for long-running polling/gateway clients
- Owning subsystems / capability areas:
  - `bootstrap/` owns runtime composition and lifecycle
  - `application/services/` owns queue semantics, classification, discovery, and session orchestration
  - `http/` owns transport exposure and request normalization
  - `infrastructure/adapters/` owns provider-specific ingress/egress behavior
  - `infrastructure/inbox`, `infrastructure/outbox`, `infrastructure/queue` own durability and runtime coordination
- Optional modules involved:
  - shared peer-discovery index abstractions under `infrastructure/adapters/shared`
  - session supervision under `infrastructure/adapters/session`
- Folder / file placement observations:
  - live runtime logic is generally well placed
  - the remaining cleanup candidates form a small legacy cluster rather than widespread structural drift

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `src/bootstrap/create-gateway-app.ts` | `createGatewayApp` | Composition root for adapters, workers, routes, and runtime services | Telegram is explicitly instantiated, registered for inbound routing, outbound routing, optional polling supervision, and admin discovery; this is live runtime wiring, not dead scaffolding | Keep as the central runtime composition boundary |
| `src/bootstrap/gateway-runtime-lifecycle.ts` | `createGatewayRuntimeLifecycle` | Queue lock lifecycle, worker start/stop, supervisor start/stop | Clean lifecycle orchestration with lock rollback and heartbeat failure handling | Healthy design; not a refactor target for dead-code cleanup |
| `src/http/routes/provider-webhook-route.ts` | `registerProviderWebhookRoutes` | Provider webhook ingress dispatch | Telegram webhook path is live through provider parsing, signature verification, and inbound service handoff | Confirms webhook-mode Telegram path is real |
| `src/http/routes/server-callback-route.ts` | `registerServerCallbackRoutes` | Accept server outbound callbacks and enqueue them | Callback delivery now deduplicates through `OutboundOutboxService.enqueueOrGet(...)`, not the old store-backed callback idempotency service | Old callback-idempotency service is superseded |
| `src/application/services/idempotency-service.ts` | `buildInboundIdempotencyKey(...)` plus `IdempotencyService` | Inbound ingress-key helper plus leftover service wrapper | `buildInboundIdempotencyKey(...)` is live; the `IdempotencyService` class is not used anywhere in production source | Split file contains one live helper plus one dead service abstraction |
| `src/application/services/callback-idempotency-service.ts`, `src/domain/models/idempotency-store.ts`, `src/infrastructure/idempotency/in-memory-idempotency-store.ts` | legacy idempotency abstraction cluster | Old store-backed dedupe boundary | Source files remain only for tests and stale design assumptions; no production-source imports them | Candidate delete cluster |
| `src/application/services/outbound-chunk-planner.ts` | `OutboundChunkPlanner` | Planned provider-safe outbound chunking | Production adapters do not use it; each adapter applies its own local chunk normalization or sequencing | Legacy abstraction left behind by later adapter-specific implementations |
| `src/config/env.ts` + `src/config/runtime-config.ts` | idempotency TTL fields | Parse env/config for old idempotency services | `GATEWAY_IDEMPOTENCY_TTL_SECONDS` and `GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS` are parsed and tested but unused by live runtime code | Dead config surface tied to removed/unused abstractions |
| `src/config/runtime-config.ts` | `defaultRuntimeConfig()` | Test-oriented convenience builder | Used only by gateway tests, not by runtime source or other repositories | Keep for this round; not a dead-runtime removal candidate |
| `tests/integration/bootstrap/create-gateway-app.integration.test.ts` | Telegram integration coverage | Bootstrapped app proof | Covers polling lifecycle and webhook discovery behavior, proving Telegram flow is intentionally wired | Strong evidence against classifying Telegram path as dead |

### Telegram Top-Down Flow

1. Process entry:
   - `src/index.ts` calls `startGateway()`.
   - `src/bootstrap/start-gateway.ts` reads env, builds runtime config, and calls `createGatewayApp(...)`.
2. Composition root:
   - `src/bootstrap/create-gateway-app.ts` constructs `TelegramPeerCandidateIndex`, `TelegramBusinessAdapter`, and `TelegramPeerDiscoveryService` when `config.telegramEnabled` is true.
   - The same file registers Telegram for:
     - inbound provider map,
     - outbound routing map,
     - polling supervision when polling mode is enabled,
     - channel-admin discovery endpoints.
3. Polling-mode inbound:
   - `SessionSupervisorRegistry` starts the Telegram adapter when polling is enabled.
   - `TelegramBusinessAdapter.start()` delegates to `TelegramBotClient.startPolling()`.
   - `TelegramBusinessAdapter.handleUpdate(...)` normalizes updates, records peer observations, and emits canonical envelopes into the bridge service.
4. Webhook-mode inbound:
   - `POST /webhooks/telegram` enters `src/http/routes/provider-webhook-route.ts`.
   - The route resolves the Telegram adapter, calls `verifyInboundSignature(...)`, and passes the request to `InboundMessageService.handleInbound(...)`.
   - `InboundMessageService` normalizes the payload and queues envelopes via `InboundInboxService.enqueue(...)`.
5. Durable inbound delivery:
   - `InboundInboxService.enqueue(...)` computes the ingress key with `buildInboundIdempotencyKey(...)` and upserts into the inbox store.
   - `InboundForwarderWorker` leases queued items and forwards them to `AutobyteusServerClient.forwardInbound(...)`.
6. Outbound delivery back to Telegram:
   - `POST /api/server-callback/v1/messages` enters `src/http/routes/server-callback-route.ts`.
   - The route verifies the server signature and queues the outbound envelope in the durable outbox via `enqueueOrGet(...)`.
   - `OutboundSenderWorker` leases pending records and dispatches them to the adapter selected by `provider:transport`.
   - `TelegramBusinessAdapter.sendOutbound(...)` sends each outbound chunk through `TelegramBotClient.sendMessage(...)`.
7. Telegram peer discovery:
   - Both polling and webhook normalization record observations into `TelegramPeerCandidateIndex`.
   - `GET /api/channel-admin/v1/telegram/peer-candidates` returns that state through `TelegramPeerDiscoveryService`.

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-03-26 | Probe | `pnpm dlx ts-prune -p tsconfig.build.json` | Confirmed runtime-unused exports include the callback-idempotency service, `IdempotencyService`, the chunk planner, the in-memory store, and the test helper `defaultRuntimeConfig()` | Supports symbol-level cleanup inside otherwise live files |
| 2026-03-27 | Probe | `rg -n "callback-idempotency-service|idempotency-store|in-memory-idempotency-store|outbound-chunk-planner" src` | No live source file imports the dead callback-idempotency cluster or the chunk planner | Confirms those files are production-dead |
| 2026-03-27 | Probe | `rg -n "IdempotencyService|buildInboundIdempotencyKey" src` | `buildInboundIdempotencyKey(...)` remains on the live inbox path; `IdempotencyService` does not | Confirms partial file trim rather than full deletion |
| 2026-03-27 | Probe | `rg -n "idempotencyTtlSeconds|callbackIdempotencyTtlSeconds|GATEWAY_IDEMPOTENCY_TTL_SECONDS|GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS" src` | Old idempotency TTL fields remain only in config parsing/types | Safe gateway-local config cleanup candidate |
| 2026-03-27 | Test | `tests/integration/bootstrap/create-gateway-app.integration.test.ts` plus Telegram adapter/unit tests | Telegram bootstrap, polling lifecycle, webhook ingress, and discovery remain exercised | Strong guardrail against false-positive removal |

## External / Internet Findings

Not used for this investigation.

## Constraints

- The worktree may not support every compiler-based unused-local probe cleanly unless all workspace dependencies are present.
- `ts-prune` reports many exported type aliases and module-local exports; those were treated as low-signal until manually cross-checked with repo-wide search.
- Existing ticket docs under `tickets/` still describe older runtime shapes; they are useful historical context but are not evidence that current source is live.

## Unknowns / Open Questions

- Unknown: whether the team wants to clean up the upstream managed-runtime env generator in `autobyteus-server-ts` in the same broader refactor campaign.
- Why it matters: that repository still emits the two old gateway idempotency env vars even though gateway runtime code no longer uses them.
- Planned follow-up: note the upstream env emission as an external follow-up during handoff, but keep this implementation limited to the gateway repository.

## Implications

### Requirements Implications

- The next refactor round can safely target a narrow, high-confidence dead-code cluster instead of broad gateway surgery.
- Telegram polling, webhook ingress, peer discovery, and outbound send paths should be treated as live and protected by regression tests during cleanup.

### Design Implications

- The gateway’s current architecture is better than expected: one composition root, one durable inbound path, one durable outbound path, and provider-specific adapters at the edges.
- The remaining dead code mostly comes from superseded abstractions, not from a broken top-down design.

### Implementation / Placement Implications

- Preferred cleanup order:
  - remove the dead callback-idempotency abstraction cluster,
  - trim `idempotency-service.ts` to the live helper only,
  - delete `OutboundChunkPlanner`,
  - remove unused idempotency TTL env/config fields and their gateway tests,
  - leave `defaultRuntimeConfig()` in place for this round because it is still an intentional test helper.

## Re-Entry Additions

- 2026-03-27: Revalidation completed before cleanup. The dead-code list did not expand beyond the previously identified cluster, and the only newly relevant external fact was the upstream managed-runtime env emission in `autobyteus-server-ts`.
