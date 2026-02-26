# Messaging Gateway Design (autobyteus-message-gateway)

## Goal
Build an external channel gateway that accepts provider webhooks (WhatsApp, WeCom), normalizes them, forwards them to `autobyteus-server-ts`, and delivers outbound assistant messages back to the original channel.

## Scope
- In scope:
  - Inbound webhook ingestion for WhatsApp and WeCom.
  - WhatsApp personal-session ingestion (QR login + event bridge).
  - Message normalization into a common envelope.
  - Signed forwarding to `autobyteus-server-ts` ingress API.
  - Outbound message delivery from server callback payloads.
  - Delivery retry and idempotency.
- Out of scope:
  - Agent execution logic.
  - Conversation persistence.
  - Frontend UI.

## Separation-of-Concern Principles
1. Route files parse transport details only.
2. Application services own business orchestration.
3. Provider adapters translate provider-specific payloads.
4. Infrastructure clients handle network calls and persistence adapters.
5. Shared channel contracts come from `autobyteus-ts` (single source of truth).
6. WhatsApp business and personal session paths remain separate until normalized-envelope boundary.

## Runtime Flow (One Concrete Use Case)
Use case: WhatsApp user sends "fix parser bug", agent replies.

1. `POST /webhooks/whatsapp` hits gateway route.
2. WhatsApp Business adapter validates signature and parses payload.
3. Adapter emits normalized `ExternalMessageEnvelope`.
4. Inbound service deduplicates by `(provider, transport, accountId, externalMessageId)`.
5. Inbound service forwards signed request to `autobyteus-server-ts` ingress API.
6. Server runs agent and later calls gateway outbound callback endpoint.
7. Outbound service selects transport-specific WhatsApp adapter and sends response.
8. Delivery status is persisted and optionally posted back to server.

## Dual-Mode WhatsApp Strategy

Two WhatsApp transports are supported behind one provider concept:

1. `BUSINESS_API` mode
- Inbound via webhook route (`POST /webhooks/whatsapp`).
- Signature verification and payload parsing happen in webhook adapter.
- Outbound uses official API client.

2. `PERSONAL_SESSION` mode
- Inbound arrives from long-lived session events (no public webhook from WhatsApp personal app).
- Session lifecycle managed by admin APIs (start session, fetch QR, observe status, logout).
- Outbound uses session client send API.

Both modes emit the same `ExternalMessageEnvelope` with explicit `transport` and follow one downstream path:
- `idempotency -> mention policy -> forwardInbound(server)`.

## File-Level Design

### Bootstrap and Composition

#### `src/bootstrap/create-gateway-app.ts`
- Concern: Build the HTTP app and wire dependencies.
- Public APIs:
  - `createGatewayApp(config: GatewayRuntimeConfig): FastifyInstance`
- Depends on:
  - route registration modules
  - adapter registry
  - service constructors

#### `src/bootstrap/start-gateway.ts`
- Concern: Process startup, signal handling, graceful shutdown.
- Public APIs:
  - `startGateway(): Promise<void>`
- Depends on:
  - `createGatewayApp`
  - config loader

#### `src/index.ts`
- Concern: Entry-point only.
- Public APIs:
  - `main(): Promise<void>`

### Configuration

#### `src/config/env.ts`
- Concern: Raw environment parsing.
- Public APIs:
  - `readEnv(): GatewayEnv`

#### `src/config/runtime-config.ts`
- Concern: Validated runtime config with defaults.
- Public APIs:
  - `buildRuntimeConfig(env: GatewayEnv): GatewayRuntimeConfig`

Required policy config:
- `callbackIdempotencyTtlSeconds`
- `idempotencyTtlSeconds`
- `whatsappPersonalEnabled`
- `whatsappPersonalSessionStorePath`
- `whatsappPersonalQrTtlSeconds`
- `whatsappPersonalSessionHeartbeatSeconds`

### Shared Contracts (Imported, Not Duplicated)

Gateway imports canonical types/parsers from `autobyteus-ts`:
- `ExternalMessageEnvelope`
- `ExternalOutboundEnvelope`
- `ExternalDeliveryEvent`
- `ExternalChannelTransport`
- `parseExternalMessageEnvelope(...)`
- `parseExternalOutboundEnvelope(...)`
- `parseExternalDeliveryEvent(...)`

No gateway-local duplicate parsers for these canonical envelopes are created.

#### `src/domain/models/provider-adapter.ts`
- Concern: Webhook-based adapter contract.
- Public APIs:
  - `interface WebhookProviderAdapter`
    - `provider: ExternalChannelProvider`
    - `verifyInboundSignature(req: InboundHttpRequest, rawBody: string): SignatureResult`
    - `parseInbound(req: InboundHttpRequest): ExternalMessageEnvelope[]`
    - `sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>`

#### `src/domain/models/session-provider-adapter.ts`
- Concern: Session-based adapter contract for personal channels.
- Public APIs:
  - `interface SessionProviderAdapter`
    - `provider: ExternalChannelProvider`
    - `transport: ExternalChannelTransport`
    - `startSession(input: StartSessionInput): Promise<SessionStartResult>`
    - `stopSession(sessionId: string): Promise<void>`
    - `getSessionStatus(sessionId: string): Promise<SessionStatus>`
    - `subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): Unsubscribe`
    - `sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>`

### HTTP Transport

#### `src/http/routes/health-route.ts`
- Concern: Liveness/readiness endpoints.
- Public APIs:
  - `registerHealthRoutes(app: FastifyInstance): void`

#### `src/http/routes/provider-webhook-route.ts`
- Concern: Inbound provider webhook transport.
- Public APIs:
  - `registerProviderWebhookRoutes(app: FastifyInstance, deps: ProviderWebhookDeps): void`

#### `src/http/routes/server-callback-route.ts`
- Concern: Outbound callback endpoint called by server.
- Public APIs:
  - `registerServerCallbackRoutes(app: FastifyInstance, deps: ServerCallbackDeps): void`

#### `src/http/routes/channel-admin-route.ts`
- Concern: Admin-only transport/session lifecycle endpoints.
- Public APIs:
  - `registerChannelAdminRoutes(app: FastifyInstance, deps: ChannelAdminDeps): void`
- Endpoints:
  - `POST /api/channel-admin/v1/whatsapp/personal/sessions`
  - `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/qr`
  - `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/status`
  - `DELETE /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId`

#### `src/http/mappers/http-request-mapper.ts`
- Concern: Map framework request objects to internal `InboundHttpRequest`.
- Public APIs:
  - `toInboundHttpRequest(req: FastifyRequest): InboundHttpRequest`

#### `src/http/hooks/raw-body-capture.ts`
- Concern: Preserve raw request bytes for signature verification.
- Public APIs:
  - `registerRawBodyCaptureHook(app: FastifyInstance): void`

### Application Services

#### `src/application/services/inbound-message-service.ts`
- Concern: Inbound orchestration (dedupe, forward, ack policy).
- Public APIs:
  - `class InboundMessageService`
    - `handleInbound(provider: ExternalChannelProvider, req: InboundHttpRequest): Promise<InboundHandleResult>`
    - `handleNormalizedEnvelope(envelope: ExternalMessageEnvelope): Promise<InboundHandleResult>`

#### `src/application/services/outbound-message-service.ts`
- Concern: Outbound orchestration (adapter selection, retry, status publish).
- Public APIs:
  - `class OutboundMessageService`
    - `handleOutbound(payload: ExternalOutboundEnvelope): Promise<OutboundHandleResult>`
- Adapter selection policy:
  - resolve adapter by composite routing key `(provider, transport)` to avoid WhatsApp business/personal collisions.

#### `src/application/services/delivery-status-service.ts`
- Concern: Delivery event persistence and server notification.
- Public APIs:
  - `record(event: ExternalDeliveryEvent): Promise<void>`
  - `publishToServer(event: ExternalDeliveryEvent): Promise<void>`

#### `src/application/services/idempotency-service.ts`
- Concern: Idempotency lifecycle.
- Public APIs:
  - `checkAndMark(key: IdempotencyKey): Promise<{ duplicate: boolean }>`

#### `src/application/services/callback-idempotency-service.ts`
- Concern: Prevent duplicate outbound send when server callback is retried.
- Public APIs:
  - `checkAndMarkCallback(key: string, ttlSeconds: number): Promise<{ duplicate: boolean }>`

#### `src/application/services/channel-mention-policy-service.ts`
- Concern: Mention/allowlist policy evaluation for group chats.
- Public APIs:
  - `evaluateIfGroup(input: MentionPolicyInput): MentionPolicyDecision`

#### `src/application/services/dead-letter-service.ts`
- Concern: Capture permanently failed outbound messages.
- Public APIs:
  - `recordFailedOutbound(payload: ExternalOutboundEnvelope, error: Error): Promise<void>`
  - `listDeadLetters(filter: DeadLetterFilter): Promise<DeadLetterRecord[]>`

#### `src/application/services/whatsapp-personal-session-service.ts`
- Concern: Personal-session lifecycle orchestration and QR retrieval.
- Public APIs:
  - `startPersonalSession(accountLabel: string): Promise<{ sessionId: string }>`
  - `getPersonalSessionQr(sessionId: string): Promise<{ qr: string; expiresAt: string }>`
  - `getPersonalSessionStatus(sessionId: string): Promise<SessionStatus>`
  - `stopPersonalSession(sessionId: string): Promise<void>`

#### `src/application/services/session-inbound-bridge-service.ts`
- Concern: Bridge session inbound events into standard inbound flow.
- Public APIs:
  - `handleSessionEnvelope(envelope: ExternalMessageEnvelope): Promise<void>`

### Infrastructure

#### `src/infrastructure/server-api/autobyteus-server-client.ts`
- Concern: HTTP client for server ingress/callback endpoints.
- Public APIs:
  - `forwardInbound(payload: ExternalMessageEnvelope): Promise<ServerIngressResult>`
  - `postDeliveryEvent(payload: ExternalDeliveryEvent): Promise<void>`

#### `src/infrastructure/server-api/server-signature.ts`
- Concern: HMAC signature generation for outbound calls to server.
- Public APIs:
  - `createServerSignature(body: string, secret: string): string`

#### `src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts`
- Concern: WhatsApp Business webhook/API parsing and send implementation.
- Public APIs:
  - `class WhatsAppBusinessAdapter implements WebhookProviderAdapter`

#### `src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts`
- Concern: WhatsApp personal-session adapter implementation.
- Public APIs:
  - `class WhatsAppPersonalAdapter implements SessionProviderAdapter`

#### `src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts`
- Concern: Wrap session transport SDK client lifecycle and message send/listen APIs.
- Public APIs:
  - `createSessionClient(config): SessionClient`

#### `src/infrastructure/adapters/whatsapp-personal/session-credential-store.ts`
- Concern: Persist personal-session auth state and key material.
- Public APIs:
  - `loadSessionCredentials(sessionId: string): Promise<SessionCredentials | null>`
  - `saveSessionCredentials(sessionId: string, value: SessionCredentials): Promise<void>`
  - `deleteSessionCredentials(sessionId: string): Promise<void>`

#### `src/infrastructure/adapters/whatsapp-personal/session-event-listener.ts`
- Concern: Convert session SDK events into canonical envelopes for application service.
- Public APIs:
  - `startSessionEventListener(sessionId: string, onEnvelope): Promise<void>`

#### `src/infrastructure/adapters/wecom/wecom-adapter.ts`
- Concern: WeCom-specific parsing and send implementation.
- Public APIs:
  - `class WeComAdapter implements WebhookProviderAdapter`

#### `src/infrastructure/idempotency/in-memory-idempotency-store.ts`
- Concern: Initial idempotency backing store for local/dev.
- Public APIs:
  - `has(key: string): Promise<boolean>`
  - `set(key: string, ttlSeconds: number): Promise<void>`

#### `src/infrastructure/idempotency/sql-idempotency-store.ts`
- Concern: Durable and atomic idempotency storage for multi-instance deployment.
- Public APIs:
  - `checkAndSet(key: string, ttlSeconds: number): Promise<{ duplicate: boolean }>`

#### `src/infrastructure/retry/exponential-backoff.ts`
- Concern: Stateless retry timing policy.
- Public APIs:
  - `nextDelayMs(attempt: number, policy: RetryPolicy): number`

### Observability

#### `src/observability/logger.ts`
- Concern: Centralized structured logging contract.
- Public APIs:
  - `logger.info/warn/error/debug`

#### `src/observability/metrics.ts`
- Concern: Counters/latency metrics surface.
- Public APIs:
  - `recordInbound(...)`
  - `recordOutbound(...)`
  - `recordRetry(...)`

## Error Handling Policy
- Signature failure: `401`, no processing.
- Unknown provider: `404` for route, or adapter lookup error.
- Duplicate inbound: `200` with `duplicate=true` response body.
- Temporary downstream errors: retry (bounded) then `failed` delivery event.
- Permanent provider validation errors: no retry, mark failed immediately.
- Exhausted retries: record dead-letter entry and emit failure metric.
- Signature failures: emit security audit log/metric event.
- Callback dedupe: enforce callback idempotency using contract field `callbackIdempotencyKey` (wire aliases like `callback_idempotency_key` are normalized at parse boundary).
- Personal session disconnected: mark session `DEGRADED`, queue outbound retry, expose status endpoint.
- QR expired: return `410` from QR endpoint and require refresh.
- Personal session feature disabled: return `403` from admin session endpoints.

## Testing Strategy
- Unit tests:
  - adapter parsing and signature verification.
  - personal session lifecycle service and QR expiry behavior.
  - idempotency service behavior.
  - retry policy math.
- Integration tests:
  - webhook route -> inbound service -> mock server client.
  - callback route -> outbound service -> mock provider adapter.
  - session event listener -> session inbound bridge -> mock server client.
- Contract tests:
  - normalized envelope fixtures per provider and transport.

## Pre-Implementation Blocking Gate
- Cross-project validation matrix and pass criteria are defined in:
  - `PRE_IMPLEMENTATION_VALIDATION_GATE.md`
- Implementation should not start until all P0/P1 gate items are green.

## Files Involved in Phase 1
- Phase 1A (business mode): webhook/callback/idempotency/retry files listed above.
- Phase 1B (personal mode): session lifecycle, credential store, and session event bridge files listed above.
- No direct modification to existing server runtime files in this project beyond existing ingress contract.

## Refinements After Runtime Simulation
1. Add raw-body capture hook to guarantee signature fidelity.
2. Use atomic `checkAndMark` idempotency API for concurrent webhook safety.
3. Add mention/allowlist policy service before inbound forward.
4. Add dead-letter service for exhausted outbound retries.
5. Add security audit telemetry for repeated signature failures.
6. Remove gateway-local duplicated channel envelope models; use `autobyteus-ts` contracts directly.
7. Require callback idempotency key to prevent duplicate outbound sends.
8. Make callback idempotency TTL an explicit runtime config contract.
9. Split WhatsApp adapter responsibilities into `whatsapp-business` and `whatsapp-personal`.
10. Add admin session lifecycle routes for personal WhatsApp onboarding.
11. Converge webhook and session inbound paths via `handleNormalizedEnvelope(...)`.
12. Add dedicated callback idempotency service for server callback retries.
