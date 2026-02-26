# Simulated Runtime Call Stacks (Messaging Gateway)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary (`await`, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` network/file/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Use Case Index

- Use Case 1: WhatsApp Business API inbound DM forwarded to server and replied.
- Use Case 2: Duplicate inbound webhook acknowledged without re-dispatch.
- Use Case 3: Outbound callback retries then dead-letters on repeated failure.
- Use Case 4: WhatsApp personal-session inbound DM bridged to server and replied.

---

## Use Case 1: WhatsApp Business API Inbound DM Forwarded To Server And Replied

### Goal
Accept one WhatsApp Business webhook event, normalize it, forward it to server ingress, and deliver the later outbound callback response.

### Preconditions
- Gateway started through `src/bootstrap/start-gateway.ts:startGateway()`.
- WhatsApp Business adapter configured and registered.
- Server ingress endpoint reachable.

### Expected Outcome
- Exactly one `forwardInbound` call.
- Outbound callback delivered once.
- Delivery event posted back to server.

### Primary Runtime Call Stack

```text
[ENTRY] src/http/routes/provider-webhook-route.ts:handleWebhook("whatsapp", fastifyReq, fastifyReply)
├── src/http/mappers/http-request-mapper.ts:toInboundHttpRequest(fastifyReq) [STATE] # normalize headers/body/query
├── src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:verifyInboundSignature(request, rawBody) [IO]
├── src/application/services/inbound-message-service.ts:handleInbound("whatsapp", request) [ASYNC]
│   ├── src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:parseInbound(request) [STATE]
│   ├── src/application/services/idempotency-service.ts:checkAndMark(idempotencyKey) [IO]
│   ├── src/application/services/channel-mention-policy-service.ts:evaluateIfGroup(envelope) [STATE]
│   └── src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(envelope) [ASYNC][IO]
└── src/http/routes/provider-webhook-route.ts:writeAcceptedResponse(fastifyReply, accepted=true)

[ENTRY] src/http/routes/server-callback-route.ts:handleOutboundCallback(fastifyReq, fastifyReply)
├── autobyteus-ts/src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(body) [STATE]
├── src/application/services/callback-idempotency-service.ts:checkAndMarkCallback(payload.callbackIdempotencyKey, ttlSeconds) [IO]
├── src/application/services/outbound-message-service.ts:handleOutbound(payload) [ASYNC]
│   ├── src/application/services/outbound-message-service.ts:resolveAdapterByRoutingKey(provider, transport) [STATE]
│   ├── src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:sendOutbound(payload) [ASYNC][IO]
│   │   [FALLBACK] for `WHATSAPP + PERSONAL_SESSION`: dispatch via `whatsapp-personal-adapter.ts:sendOutbound(...)`
│   ├── src/application/services/delivery-status-service.ts:record(deliveredEvent) [IO]
│   └── src/infrastructure/server-api/autobyteus-server-client.ts:postDeliveryEvent(deliveredEvent) [ASYNC][IO]
└── src/http/routes/server-callback-route.ts:writeSuccessResponse(fastifyReply)
```

### Branching / Fallback Paths

```text
[FALLBACK] if mention policy blocks group message
src/application/services/inbound-message-service.ts:handleInbound(...)
├── src/application/services/channel-mention-policy-service.ts:evaluateIfGroup(envelope)
└── src/http/routes/provider-webhook-route.ts:writeAcceptedResponse(blocked=true)
```

```text
[ERROR] if signature verification fails
src/http/routes/provider-webhook-route.ts:handleWebhook(...)
├── src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:verifyInboundSignature(...)
└── src/http/routes/provider-webhook-route.ts:writeUnauthorizedResponse(401)
```

```text
[FALLBACK] duplicate server callback
src/http/routes/server-callback-route.ts:handleOutboundCallback(...)
├── src/application/services/callback-idempotency-service.ts:checkAndMarkCallback(...)
└── src/http/routes/server-callback-route.ts:writeSuccessResponse(duplicate=true)
```

### State And Data Transformations

- Provider webhook body -> `InboundHttpRequest`.
- `InboundHttpRequest` -> `ExternalMessageEnvelope[]`.
- `ExternalMessageEnvelope` -> signed server-ingress payload.
- Server callback payload -> `ExternalOutboundEnvelope` -> provider send request.

### Observability And Debug Points

- Logs emitted at:
  - `provider-webhook-route.ts:handleWebhook`
  - `inbound-message-service.ts:handleInbound`
  - `outbound-message-service.ts:handleOutbound`
- Metrics/counters updated at:
  - signature failures
  - inbound accepted/duplicate/blocked
  - outbound delivered/failed/retried

### Design Smells / Gaps

- No blocking smell in Phase 1 after enforcing raw-body capture, atomic idempotency store, and callback-idempotency service.

### Default Decisions

- Phase 1 uses meter+log only for mention-policy blocked events (no persistent audit table yet).

---

## Use Case 2: Duplicate Inbound Webhook Acknowledged Without Re-Dispatch

### Goal
Prevent duplicate upstream delivery from triggering duplicate server dispatch.

### Preconditions
- First event `(provider, transport, accountId, externalMessageId)` already processed.

### Expected Outcome
- Return `200` quickly.
- No `forwardInbound` call.

### Primary Runtime Call Stack

```text
[ENTRY] src/http/routes/provider-webhook-route.ts:handleWebhook("whatsapp", ...)
├── src/http/mappers/http-request-mapper.ts:toInboundHttpRequest(...) [STATE]
├── src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:verifyInboundSignature(...) [IO]
└── src/application/services/inbound-message-service.ts:handleInbound("whatsapp", request) [ASYNC]
    ├── src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:parseInbound(request) [STATE]
    ├── src/application/services/idempotency-service.ts:checkAndMark(key) [IO] # returns duplicate=true
    └── src/http/routes/provider-webhook-route.ts:writeAcceptedResponse(duplicate=true)
```

### Branching / Fallback Paths

```text
[FALLBACK] if idempotency backend unavailable
src/application/services/inbound-message-service.ts:handleInbound(...)
└── src/http/routes/provider-webhook-route.ts:writeServiceUnavailableResponse(503)
```

```text
[ERROR] if payload parse fails after signature pass
src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:parseInbound(...)
└── src/http/routes/provider-webhook-route.ts:writeBadRequestResponse(400)
```

### State And Data Transformations

- Parsed envelope -> idempotency key -> duplicate decision.

### Observability And Debug Points

- Counter `gateway_inbound_duplicate_total` incremented.
- Log includes key and provider for correlation.

### Design Smells / Gaps

- No blocking smell in Phase 1 after standardizing minimal duplicate ack response.

### Default Decisions

- Duplicate ack response remains minimal in Phase 1 (`accepted`, `duplicate`) without timestamp payload.

---

## Use Case 3: Outbound Callback Retries Then Dead-Letters On Repeated Failure

### Goal
Handle transient/permanent provider failures deterministically with retry and dead-letter.

### Preconditions
- Server callback payload is valid.
- Provider API repeatedly times out or returns retryable 5xx.

### Expected Outcome
- Retries follow backoff policy.
- On exhaustion, dead-letter is recorded and failure event is posted.

### Primary Runtime Call Stack

```text
[ENTRY] src/http/routes/server-callback-route.ts:handleOutboundCallback(...)
├── autobyteus-ts/src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(body) [STATE]
├── src/application/services/callback-idempotency-service.ts:checkAndMarkCallback(payload.callbackIdempotencyKey, ttlSeconds) [IO]
└── src/application/services/outbound-message-service.ts:handleOutbound(payload) [ASYNC]
    ├── src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:sendOutbound(payload) [ASYNC][IO]
    ├── [FALLBACK] retry loop when send throws retryable error
    │   ├── src/infrastructure/retry/exponential-backoff.ts:nextDelayMs(attempt, policy) [STATE]
    │   └── src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:sendOutbound(payload) [ASYNC][IO]
    ├── [ERROR] retries exhausted
    │   ├── src/application/services/dead-letter-service.ts:recordFailedOutbound(payload, error) [IO]
    │   ├── src/application/services/delivery-status-service.ts:record(failedEvent) [IO]
    │   └── src/infrastructure/server-api/autobyteus-server-client.ts:postDeliveryEvent(failedEvent) [ASYNC][IO]
    └── src/http/routes/server-callback-route.ts:writeFailureAcceptedResponse(deadLettered=true)
```

### Branching / Fallback Paths

```text
[FALLBACK] if non-retryable provider validation error
src/application/services/outbound-message-service.ts:handleOutbound(...)
├── skip retry
└── src/application/services/dead-letter-service.ts:recordFailedOutbound(...) [IO]
```

```text
[ERROR] if dead-letter persistence fails
src/application/services/dead-letter-service.ts:recordFailedOutbound(...)
└── src/http/routes/server-callback-route.ts:writeServiceUnavailableResponse(503)
```

### State And Data Transformations

- `ExternalOutboundEnvelope` -> provider-specific outbound request.
- retry attempt state -> delay durations.
- terminal error -> dead-letter record + delivery failure event.

### Observability And Debug Points

- Metrics:
  - `gateway_outbound_retry_total`
  - `gateway_outbound_deadletter_total`
- Structured logs include `correlationMessageId` and `provider`.

### Design Smells / Gaps

- No blocking smell in Phase 1; replay endpoint is explicitly deferred to Phase 2.

### Default Decisions

- Dead-letter replay is owned by gateway via an admin replay endpoint in Phase 2.

---

## Use Case 4: WhatsApp Personal-Session Inbound DM Bridged To Server And Replied

### Goal
Accept WhatsApp personal-session inbound events, normalize and forward to server, then send outbound reply through same session.

### Preconditions
- Personal-session feature flag enabled.
- Session created and logged in via admin route QR flow.
- Session listener running.

### Expected Outcome
- Inbound session event forwarded once to server.
- Assistant reply callback sent to personal session.
- Session-health telemetry updated.

### Primary Runtime Call Stack

```text
[ENTRY] src/http/routes/channel-admin-route.ts:createPersonalSession(req, reply)
└── src/application/services/whatsapp-personal-session-service.ts:startPersonalSession(accountLabel) [ASYNC]
    ├── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:startSession(...) [ASYNC]
    └── src/infrastructure/adapters/whatsapp-personal/session-event-listener.ts:startSessionEventListener(sessionId, onEnvelope) [ASYNC]

[ASYNC] src/infrastructure/adapters/whatsapp-personal/session-event-listener.ts:onMessageUpsert(event)
└── src/application/services/session-inbound-bridge-service.ts:handleSessionEnvelope(envelope) [ASYNC]
    ├── src/application/services/inbound-message-service.ts:handleNormalizedEnvelope(envelope) [ASYNC]
    │   ├── src/application/services/idempotency-service.ts:checkAndMark(key) [IO]
    │   ├── src/application/services/channel-mention-policy-service.ts:evaluateIfGroup(envelope) [STATE]
    │   └── src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(envelope) [ASYNC][IO]
    └── src/observability/metrics.ts:recordInbound(provider="whatsapp", transport="PERSONAL_SESSION") [STATE]

[ENTRY] src/http/routes/server-callback-route.ts:handleOutboundCallback(...)
├── autobyteus-ts/src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(body) [STATE]
├── src/application/services/callback-idempotency-service.ts:checkAndMarkCallback(payload.callbackIdempotencyKey, ttlSeconds) [IO]
└── src/application/services/outbound-message-service.ts:handleOutbound(payload) [ASYNC]
    └── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:sendOutbound(payload) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] QR code expired before user scans
src/application/services/whatsapp-personal-session-service.ts:getPersonalSessionQr(...)
└── src/http/routes/channel-admin-route.ts:writeGoneResponse(410, code="SESSION_QR_EXPIRED")
```

```text
[ERROR] session disconnected while sending callback reply
src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:sendOutbound(...)
└── src/application/services/dead-letter-service.ts:recordFailedOutbound(...) [IO]
```

### State And Data Transformations

- Session SDK event -> canonical `ExternalMessageEnvelope` (`transport=PERSONAL_SESSION`).
- Callback envelope -> session send payload.
- Session status transitions (`CONNECTING -> ACTIVE -> DEGRADED/STOPPED`).

### Observability And Debug Points

- Metrics:
  - `gateway_personal_session_active_total`
  - `gateway_personal_session_reconnect_total`
  - `gateway_personal_session_inbound_total`
- Logs include `sessionId`, `provider`, and transport.

### Design Smells / Gaps

- No blocking smell in Phase 1 after defining encrypted credential-store policy and admin-only session lifecycle endpoints.

### Default Decisions

- Phase 1 persists session credentials on local encrypted filesystem path; central secret-store backend is Phase 2.
