# Simulated Runtime Call Stacks (Debug-Trace Style)

Use this document as a debugger-like simulation for the real WhatsApp personal session path in `autobyteus-message-gateway`.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` network/file IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Simulation Basis

- Scope Classification: `Large`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tickets/real_whatsapp_personal_integration_ticket/REAL_WHATSAPP_PERSONAL_DESIGN.md`
- Referenced Sections:
  - `File And Module Breakdown`
  - `API Contract Changes (Gateway Admin)`
  - `Error Handling And Edge Cases`

## Use Case Index

- Use Case 1: Start personal session and return real QR.
- Use Case 2: Scan QR and forward inbound DM to server ingress.
- Use Case 3: Send assistant reply through personal session.
- Use Case 4: Restart gateway and recover session.

---

## Use Case 1: Start Personal Session And Return Real QR

### Goal
Create a real WhatsApp personal session and expose real QR payload.

### Preconditions
- `GATEWAY_WHATSAPP_PERSONAL_ENABLED=true`.
- SDK runtime dependencies installed.
- Auth root path writable.

### Expected Outcome
- Session record is created.
- SDK emits QR.
- `GET .../qr` returns `{ code, expiresAt }`.

### Primary Runtime Call Stack

```text
[ENTRY] src/http/routes/channel-admin-route.ts:POST /api/channel-admin/v1/whatsapp/personal/sessions
└── src/application/services/whatsapp-personal-session-service.ts:startPersonalSession(accountLabel) [ASYNC]
    └── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:startSession(input) [ASYNC]
        ├── src/infrastructure/adapters/whatsapp-personal/session-credential-store.ts:getSessionAuthPath(sessionId) [IO]
        ├── src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts:open({ sessionId, authPath }) [ASYNC][IO]
        ├── src/infrastructure/adapters/whatsapp-personal/session-state-mapper.ts:toSessionState(connectionUpdate) [STATE]
        └── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:cacheQrAndStatus(sessionId, qr, expiresAt) [STATE]

[ENTRY] src/http/routes/channel-admin-route.ts:GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/qr
└── src/application/services/whatsapp-personal-session-service.ts:getPersonalSessionQr(sessionId) [ASYNC]
    └── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:getSessionQr(sessionId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] QR not ready yet
whatsapp-personal-adapter.ts:getSessionQr(sessionId)
└── throw SESSION_QR_NOT_READY -> channel-admin-route maps to HTTP 409
```

```text
[FALLBACK] second session requested while one is already running
whatsapp-personal-adapter.ts:startSession(input)
└── throw SESSION_ALREADY_RUNNING -> channel-admin-route maps to HTTP 409
```

```text
[ERROR] auth root not writable
session-credential-store.ts:getSessionAuthPath(sessionId) [IO]
└── throw -> channel-admin-route maps to HTTP 500 (setup failure)
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Scan QR And Forward Inbound DM To Server Ingress

### Goal
Receive a real inbound WhatsApp message via personal session and forward normalized envelope to server.

### Preconditions
- Session state is `ACTIVE`.
- Inbound subscriber bridge registered at bootstrap.

### Expected Outcome
- Exactly one normalized envelope forwarded to `/api/channel-ingress/v1/messages` when server ingress is reachable.

### Primary Runtime Call Stack

```text
[ENTRY] src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts:onMessage(event)
└── src/infrastructure/adapters/whatsapp-personal/inbound-envelope-mapper.ts:toExternalMessageEnvelope(event) [STATE]
    └── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:publishInbound(envelope) [ASYNC]
        └── src/application/services/session-inbound-bridge-service.ts:handleSessionEnvelope(envelope) [ASYNC]
            └── src/application/services/inbound-message-service.ts:handleNormalizedEnvelope(envelope) [ASYNC]
                ├── src/application/services/idempotency-service.ts:checkAndMark(key) [IO]
                ├── src/application/services/channel-mention-policy-service.ts:evaluateIfGroup(envelope) [STATE]
                └── src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(envelope) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] duplicate inbound message id
inbound-message-service.ts:handleNormalizedEnvelope(envelope)
└── idempotency-service.ts:checkAndMark(key) => duplicate=true
```

```text
[ERROR] server ingress unavailable
autobyteus-server-client.ts:forwardInbound(envelope) [IO]
└── throw -> inbound path emits failure telemetry and marks transient forward failure (phase 1 has no durable replay queue)
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Send Assistant Reply Through Personal Session

### Goal
Dispatch server callback outbound payload to active personal session.

### Preconditions
- Callback payload has `provider=WHATSAPP` and `transport=PERSONAL_SESSION`.
- Target session is active.

### Expected Outcome
- Outbound message delivered through personal session client.
- Delivery event posted back to server.

### Primary Runtime Call Stack

```text
[ENTRY] src/http/routes/server-callback-route.ts:POST /api/server-callback/v1/messages
├── autobyteus-ts/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(body) [STATE]
├── src/application/services/callback-idempotency-service.ts:checkAndMarkCallback(callbackKey) [IO]
└── src/application/services/outbound-message-service.ts:handleOutbound(payload) [ASYNC]
    ├── outbound-message-service.ts:resolveAdapterByRoutingKey(WHATSAPP, PERSONAL_SESSION) [STATE]
    ├── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:sendOutbound(payload) [ASYNC]
    │   └── src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts:sendText(peerId, replyText) [ASYNC][IO]
    ├── src/application/services/delivery-status-service.ts:record(deliveredEvent) [IO]
    └── src/infrastructure/server-api/autobyteus-server-client.ts:postDeliveryEvent(deliveredEvent) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] callback duplicate
server-callback-route.ts -> callback-idempotency-service => duplicate=true
└── return success without second send
```

```text
[ERROR] session not active
whatsapp-personal-adapter.ts:sendOutbound(payload)
└── throw SESSION_NOT_ACTIVE -> outbound-message-service applies retry/dead-letter policy
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Restart Gateway And Recover Session

### Goal
Recover personal session after process restart without manual recreation.

### Preconditions
- Session credentials persisted.
- Startup bootstrap enabled for session recovery.

### Expected Outcome
- Session transitions back to `ACTIVE` or `PENDING_QR` deterministically.

### Primary Runtime Call Stack

```text
[ENTRY] src/bootstrap/start-gateway.ts:startGateway()
└── src/bootstrap/create-gateway-app.ts:createGatewayApp(config)
    └── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:restorePersistedSessions() [ASYNC]
        ├── session-credential-store.ts:listSessions() [IO]
        ├── for each session -> baileys-session-client.ts:open(...) [ASYNC][IO]
        └── session-state-mapper.ts:toSessionState(update) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] credentials invalid after logout on phone
baileys-session-client.ts:open(...)
└── adapter marks session STOPPED and requires startSession() again
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
