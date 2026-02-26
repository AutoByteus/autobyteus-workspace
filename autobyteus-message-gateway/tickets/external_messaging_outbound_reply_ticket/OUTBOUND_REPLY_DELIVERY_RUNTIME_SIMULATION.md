# Simulated Runtime Call Stacks (Outbound Reply Delivery - Gateway)

## Conventions
- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags: `[ENTRY] [ASYNC] [STATE] [IO] [FALLBACK] [ERROR]`

## Simulation Basis
- Scope Classification: `Medium`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tickets/external_messaging_outbound_reply_ticket/OUTBOUND_REPLY_DELIVERY_DESIGN.md`

## Use Case Index
- Use Case 1: Authenticated callback enters outbound pipeline.
- Use Case 2: Outbound chunk planning + WhatsApp send.
- Use Case 3: Outbound chunk planning + WeChat send.
- Use Case 4: Retry and dead-letter on terminal failure.
- Use Case 5: Callback secret absent in local dev bypasses signature verification.

---

## Use Case 1: Authenticated Callback Enters Outbound Pipeline

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-message-gateway/src/http/routes/server-callback-route.ts:POST /api/server-callback/v1/messages
├── verifyServerCallbackSignature(rawBody, headers, secret) [STATE][IO]
├── autobyteus-ts/src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(body) [STATE]
├── callback-idempotency-service.ts:checkAndMarkCallback(callbackIdempotencyKey) [STATE]
└── outbound-message-service.ts:handleOutbound(payload) [ASYNC]
```

### Branching / Error Paths

```text
[FALLBACK] duplicate callback key
server-callback-route.ts
└── return accepted duplicate=true, no send
```

```text
[ERROR] invalid signature
verify-server-callback-signature.ts
└── route returns 401
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Outbound Chunk Planning + WhatsApp Send

### Primary Runtime Call Stack

```text
[ENTRY] outbound-message-service.ts:handleOutbound(payload)
├── outbound-chunk-planner.ts:planChunks(payload) [STATE]
├── resolve adapter for WHATSAPP:PERSONAL_SESSION [STATE]
├── whatsapp-personal-adapter.ts:sendOutbound(payloadWithChunks) [ASYNC]
│   ├── findActiveSessionByAccountLabel(accountId) [STATE]
│   └── session.client.sendText(peerId, chunkText) for each chunk [IO]
├── delivery-status-service.ts:record(DELIVERED) [STATE]
└── delivery-status-service.ts:publishToServer(event) [IO]
```

### Branching / Error Paths

```text
[ERROR] no active session
whatsapp-personal-adapter.ts:sendOutbound(...)
└── throws -> outbound service retry branch
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Outbound Chunk Planning + WeChat Send

### Primary Runtime Call Stack

```text
[ENTRY] outbound-message-service.ts:handleOutbound(payload)
├── outbound-chunk-planner.ts:planChunks(payload) [STATE]
├── resolve adapter for WECHAT:DIRECT_PERSONAL_SESSION [STATE]
├── wechat-personal-adapter.ts:sendOutbound(payloadWithChunks) [ASYNC]
│   └── wechaty-sidecar-client.ts:sendText(...) per chunk [IO]
├── delivery-status-service.ts:record(DELIVERED) [STATE]
└── delivery-status-service.ts:publishToServer(event) [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Retry And Dead-Letter On Terminal Failure

### Primary Runtime Call Stack

```text
[ENTRY] outbound-message-service.ts:handleOutbound(payload)
├── adapter.sendOutbound(...) attempt #1 [ASYNC]
├── [FALLBACK] retryable -> sleep(backoff) -> retry [ASYNC]
└── [ERROR] terminal failure
    ├── dead-letter-service.ts:recordFailedOutbound(payload, error) [STATE]
    ├── delivery-status-service.ts:record(FAILED) [STATE]
    └── delivery-status-service.ts:publishToServer(FAILED event) [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 5: Callback Secret Absent In Local Dev Bypasses Signature Verification

### Primary Runtime Call Stack

```text
[ENTRY] /api/server-callback/v1/messages with callback secret unset
└── verifyServerCallbackSignature(...) [STATE]
    ├── detect no configured secret [STATE]
    └── allow request to continue (dev-mode policy)
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
