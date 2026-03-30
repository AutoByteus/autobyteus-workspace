# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/gateway-dead-code-investigation/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Medium/Large`: `tickets/in-progress/gateway-dead-code-investigation/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001` through `DS-005`
  - Ownership sections: `Ownership Map`, `Removal / Decommission Plan`, `Final File Responsibility Mapping`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | Gateway runtime composition | Requirement | R-001 | N/A | Preserve live Telegram runtime spine | Yes/Yes/Yes |
| UC-002 | DS-002 | Return-Event | Server callback route + outbox service | Requirement | R-002, R-006 | N/A | Remove callback-idempotency wrappers while keeping callback enqueue dedupe live | Yes/N/A/Yes |
| UC-003 | DS-003 | Bounded Local | Inbound inbox service | Requirement | R-003, R-006 | N/A | Trim `idempotency-service.ts` to the live inbound key helper | Yes/N/A/Yes |
| UC-004 | DS-004 | Bounded Local | Provider adapters | Requirement | R-004, R-006 | N/A | Remove centralized chunk planner and keep adapter-local chunk ownership | Yes/N/A/Yes |
| UC-005 | DS-005 | Bounded Local | Config bootstrap | Requirement | R-005, R-006 | N/A | Remove unused idempotency TTL config surface from gateway bootstrap | Yes/N/A/Yes |

## Transition Notes

- Any temporary migration behavior needed to reach target state: none
- Retirement plan for temporary logic (if any): none

## Use Case: UC-001 Preserve live Telegram runtime spine

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `createGatewayApp(...)` runtime composition
- Why This Use Case Matters To This Spine: the cleanup is valid only if it leaves the live Telegram ingress, queue, outbound, and discovery flow unchanged.

### Goal

Keep the current Telegram runtime behavior intact while removing unrelated dead abstractions.

### Preconditions

- Telegram is enabled in runtime config.
- Polling mode or webhook mode is configured.
- The gateway has already bootstrapped its routes, workers, and optional session supervisors.

### Expected Outcome

Telegram inbound handling, durable forwarding, outbound callback enqueue, outbound sending, and peer discovery continue to run through the existing runtime owners.

### Primary Runtime Call Stack

```text
[ENTRY] src/index.ts:main()
├── src/bootstrap/start-gateway.ts:startGateway() [STATE]
│   ├── src/config/env.ts:readEnv(...) [STATE]
│   ├── src/config/runtime-config.ts:buildRuntimeConfig(...) [STATE]
│   └── src/bootstrap/create-gateway-app.ts:createGatewayApp(...) [STATE]
│       ├── src/http/routes/provider-webhook-route.ts:registerProviderWebhookRoutes(...) [STATE]
│       ├── src/http/routes/server-callback-route.ts:registerServerCallbackRoutes(...) [STATE]
│       ├── src/http/routes/channel-admin-route.ts:registerChannelAdminRoutes(...) [STATE]
│       └── src/bootstrap/gateway-runtime-lifecycle.ts:createGatewayRuntimeLifecycle(...) [STATE]
├── src/http/routes/provider-webhook-route.ts:registerProviderWebhookRoutes(...) [ENTRY]
│   └── src/application/services/inbound-message-service.ts:handleInbound(...) [ASYNC]
│       └── src/application/services/inbound-inbox-service.ts:enqueue(...) [IO]
│           └── src/application/services/idempotency-service.ts:buildInboundIdempotencyKey(...) [STATE]
├── src/application/services/inbound-forwarder-worker.ts:runLoop(...) [ASYNC]
│   └── src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(...) [IO]
├── src/http/routes/server-callback-route.ts:registerServerCallbackRoutes(...) [ENTRY]
│   └── src/application/services/outbound-outbox-service.ts:enqueueOrGet(...) [IO]
└── src/application/services/outbound-sender-worker.ts:runLoop(...) [ASYNC]
    └── src/infrastructure/adapters/telegram-business/telegram-business-adapter.ts:sendOutbound(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] Telegram polling mode instead of webhook mode
src/bootstrap/create-gateway-app.ts:createGatewayApp(...)
└── src/infrastructure/adapters/session/session-supervisor-registry.ts:register(...)
    └── src/infrastructure/adapters/telegram-business/telegram-business-adapter.ts:start() [ASYNC]
```

```text
[ERROR] webhook or outbound validation fails
src/http/routes/provider-webhook-route.ts:registerProviderWebhookRoutes(...)
└── Fastify reply with provider validation error

src/http/routes/server-callback-route.ts:registerServerCallbackRoutes(...)
└── Fastify reply with callback signature or parse error
```

### State And Data Transformations

- Telegram update payload -> canonical external message envelope
- Envelope -> inbox record keyed by ingress idempotency key
- Server callback payload -> outbox record keyed by callback idempotency key
- Outbox record -> adapter-local outbound send inputs

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Remove callback-idempotency wrappers while keeping callback enqueue dedupe live

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Return-Event`
- Governing Owner: server callback route and outbox service
- Why This Use Case Matters To This Spine: it proves the deleted callback-idempotency service/store cluster is not part of the live callback path anymore.

### Goal

Delete the old callback-idempotency wrapper path and leave callback dedupe owned solely by outbox enqueue.

### Preconditions

- A server callback request reaches `/api/server-callback/v1/messages`.
- The route can authenticate the request and parse the outbound envelope.

### Expected Outcome

The route enqueues through `OutboundOutboxService.enqueueOrGet(...)`, and no deleted callback-idempotency wrapper is part of the runtime path.

### Primary Runtime Call Stack

```text
[ENTRY] src/http/routes/server-callback-route.ts:registerServerCallbackRoutes(...)
├── src/http/middleware/verify-server-callback-signature.ts:verifyServerCallbackSignature(...) [STATE]
├── parseExternalOutboundEnvelope(...) [STATE]
└── src/application/services/outbound-outbox-service.ts:enqueueOrGet(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] callback signature invalid or payload invalid
src/http/routes/server-callback-route.ts:registerServerCallbackRoutes(...)
└── Fastify reply with 401 or 400 response
```

### State And Data Transformations

- Raw callback request -> authenticated request context
- Request body -> parsed outbound envelope
- Parsed envelope -> outbox record keyed by callback idempotency key

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Trim `idempotency-service.ts` to the live inbound key helper

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `InboundInboxService`
- Why This Use Case Matters To This Spine: it isolates the live portion of `idempotency-service.ts` and prevents over-deletion.

### Goal

Retain only `buildInboundIdempotencyKey(...)` and remove the dead `IdempotencyService` wrapper.

### Preconditions

- `InboundInboxService.enqueue(...)` receives a canonical message envelope.

### Expected Outcome

Ingress-key generation continues to work, and no store-backed idempotency wrapper remains in the file.

### Primary Runtime Call Stack

```text
[ENTRY] src/application/services/inbound-inbox-service.ts:enqueue(...)
├── src/application/services/idempotency-service.ts:buildInboundIdempotencyKey(...) [STATE]
└── src/domain/models/inbox-store.ts:InboxStore.upsertByIngressKey(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] malformed envelope content leads to invalid key input
src/application/services/idempotency-service.ts:buildInboundIdempotencyKey(...)
└── key components still normalize thread id to "_" when blank
```

### State And Data Transformations

- Envelope fields -> stable ingress key string
- Ingress key + payload -> inbox upsert input

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 Remove centralized chunk planner and keep adapter-local chunk ownership

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Bounded Local`
- Governing Owner: provider adapters
- Why This Use Case Matters To This Spine: it prevents the cleanup from reviving or depending on a dead shared planner abstraction.

### Goal

Delete `OutboundChunkPlanner` and keep outbound chunk normalization where the adapters already own it.

### Preconditions

- An outbound envelope reaches a provider adapter.

### Expected Outcome

Adapters continue to derive their outbound chunk lists locally before sending to transport clients.

### Primary Runtime Call Stack

```text
[ENTRY] src/application/services/outbound-sender-worker.ts:runLoop(...)
├── provider routing selection [STATE]
└── provider adapter sendOutbound(...) [ASYNC]
    ├── src/infrastructure/adapters/telegram-business/telegram-business-adapter.ts:resolveOutboundChunks(...) [STATE]
    ├── src/infrastructure/adapters/discord-business/discord-business-adapter.ts:resolveChunks(...) [STATE]
    ├── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:sendOutbound(...) [STATE]
    └── src/infrastructure/adapters/wechat-personal/wechat-personal-adapter.ts:sendOutbound(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] outbound payload has no usable text chunks
provider adapter sendOutbound(...)
└── throws provider-specific invalid outbound error
```

### State And Data Transformations

- Outbound envelope -> provider-local list of non-empty text chunks
- Text chunk list -> transport-client send sequence

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 Remove unused idempotency TTL config surface from gateway bootstrap

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Bounded Local`
- Governing Owner: config bootstrap
- Why This Use Case Matters To This Spine: it keeps `GatewayRuntimeConfig` aligned with live runtime consumers.

### Goal

Stop reading and exposing gateway-local idempotency TTL fields that no runtime owner consumes.

### Preconditions

- `startGateway()` builds config from environment input.

### Expected Outcome

`readEnv(...)` and `buildRuntimeConfig(...)` expose only live gateway config fields, and tests no longer assert the removed TTL fields.

### Primary Runtime Call Stack

```text
[ENTRY] src/bootstrap/start-gateway.ts:startGateway()
├── src/config/env.ts:readEnv(...) [STATE]
├── src/config/runtime-config.ts:buildRuntimeConfig(...) [STATE]
└── src/bootstrap/create-gateway-app.ts:createGatewayApp(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] invalid live numeric env values
src/config/runtime-config.ts:buildRuntimeConfig(...)
└── throws validation error for the affected live config key
```

### State And Data Transformations

- Process env -> normalized gateway env object
- Normalized env -> runtime config object stripped to live fields only

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
