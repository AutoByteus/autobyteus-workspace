# Simulated Runtime Call Stacks (Cross-Project End-to-End)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation/transformation
  - `[IO]` network/database/file IO
  - `[FALLBACK]` alternate branch
  - `[ERROR]` failure path

## Use Case Index

- Use Case 1: WhatsApp Business DM end-to-end (gateway -> server -> runtime -> gateway).
- Use Case 2: WeCom group thread end-to-end with team target.
- Use Case 3: WhatsApp personal-session DM end-to-end (session -> gateway -> server -> runtime -> gateway).

---

## Use Case 1: WhatsApp Business DM End-To-End

### Goal
Validate full cross-project flow from provider webhook ingress to outbound channel delivery.

### Preconditions
- Gateway and server secrets configured.
- Default channel binding allows lazy agent creation.

### Expected Outcome
- One accepted inbound dispatch.
- Agent run emits assistant complete.
- Outbound callback delivered and tracked.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-message-gateway/src/http/routes/provider-webhook-route.ts:handleWebhook("whatsapp", req, reply)
├── autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:verifyInboundSignature(request, rawBody) [IO]
├── autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:parseInbound(request) [STATE]
├── autobyteus-ts/src/external-channel/external-message-envelope.ts:parseExternalMessageEnvelope(input) [STATE]
└── autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(envelope) [ASYNC][IO]

[ENTRY] autobyteus-server-ts/src/api/rest/channel-ingress.ts:postInboundMessageRoute(req, reply)
├── autobyteus-server-ts/src/api/rest/middleware/verify-gateway-signature.ts:verifyGatewaySignature(...) [IO]
├── autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope) [ASYNC]
│   ├── autobyteus-server-ts/src/external-channel/services/channel-idempotency-service.ts:ensureFirstSeen(key) [IO]
│   ├── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:resolveBinding(provider, transport, ...) [IO]
│   ├── autobyteus-server-ts/src/external-channel/runtime/channel-runtime-facade.ts:sendToAgent(binding, envelope) [ASYNC]
│   │   ├── [FALLBACK] autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts:createAgentInstance(...) [ASYNC][STATE]
│   │   ├── autobyteus-ts/src/agent/message/external-source-metadata.ts:buildAgentExternalSourceMetadata(envelope) [STATE]
│   │   └── agentInstance.postUserMessage(agentInputUserMessage) [ASYNC]
│   └── autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts:recordIngressReceipt(...) [IO]
└── autobyteus-server-ts/src/api/rest/channel-ingress.ts:writeAcceptedResponse(...)

[ASYNC] runtime completion event
└── autobyteus-server-ts/src/external-channel/subscribers/assistant-complete-subscriber.ts:onAssistantComplete(event)
    └── autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReply(event) [ASYNC]
        ├── autobyteus-server-ts/src/external-channel/services/callback-idempotency-service.ts:reserveCallbackKey(callbackKey, ttlSeconds) [IO]
        ├── autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:buildOutboundEnvelope(...) [STATE]
        └── autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:postGatewayCallback(envelope) [ASYNC][IO]

[ENTRY] autobyteus-message-gateway/src/http/routes/server-callback-route.ts:handleOutboundCallback(req, reply)
├── autobyteus-ts/src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(body) [STATE]
├── autobyteus-message-gateway/src/application/services/callback-idempotency-service.ts:checkAndMarkCallback(payload.callbackIdempotencyKey, ttlSeconds) [IO]
├── autobyteus-message-gateway/src/application/services/outbound-message-service.ts:handleOutbound(payload) [ASYNC]
│   ├── autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts:sendOutbound(payload) [ASYNC][IO]
│   ├── autobyteus-message-gateway/src/application/services/delivery-status-service.ts:record(event) [IO]
│   └── autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts:postDeliveryEvent(event) [ASYNC][IO]
└── autobyteus-message-gateway/src/http/routes/server-callback-route.ts:writeSuccessResponse(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] duplicate inbound in gateway
autobyteus-message-gateway/src/application/services/idempotency-service.ts:checkAndMark(key)
└── duplicate=true -> skip forwardInbound
```

```text
[ERROR] outbound provider repeatedly fails
autobyteus-message-gateway/src/application/services/outbound-message-service.ts:handleOutbound(...)
├── retry loop
└── autobyteus-message-gateway/src/application/services/dead-letter-service.ts:recordFailedOutbound(...) [IO]
```

### State And Data Transformations

- Provider webhook payload -> shared envelope (`autobyteus-ts`).
- Envelope -> `AgentInputUserMessage + source metadata`.
- Assistant completion -> outbound callback payload -> provider send payload.

### Observability And Debug Points

- Gateway: inbound accepted/duplicate/rejected, outbound delivered/retried/deadlettered.
- Server: ingress dispatch latency, runtime dispatch result, callback emission status.

### Design Smells / Gaps

- No blocking cross-project smell after standardizing callback idempotency key schema and policy ownership.

### Default Decisions

- Callback idempotency key is deterministic hash of `(provider, transport, accountId, peerId, threadId, correlationMessageId, replyDigest)`.
- Gateway outbound adapter resolution is deterministic by `(provider, transport)` composite key.

---

## Use Case 2: WeCom Group Thread End-To-End With Team Target

### Goal
Validate routing and response delivery for group-thread messages mapped to team node.

### Preconditions
- Binding exists for `(wecom, accountId, peerId, threadId) -> teamId + targetNodeName`.

### Expected Outcome
- Dispatch to team target node with serialized thread ordering.
- Reply delivered back to same thread.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-message-gateway/src/http/routes/provider-webhook-route.ts:handleWebhook("wecom", ...)
├── autobyteus-message-gateway/src/infrastructure/adapters/wecom/wecom-adapter.ts:verifyInboundSignature(...) [IO]
├── autobyteus-message-gateway/src/infrastructure/adapters/wecom/wecom-adapter.ts:parseInbound(...) [STATE]
└── autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(envelope) [ASYNC][IO]

[ENTRY] autobyteus-server-ts/src/api/rest/channel-ingress.ts:postInboundMessageRoute(req, reply)
├── autobyteus-server-ts/src/api/rest/middleware/verify-gateway-signature.ts:verifyGatewaySignature(...) [IO]
└── autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope)
    ├── autobyteus-server-ts/src/external-channel/services/channel-thread-lock-service.ts:withThreadLock(threadKey, work) [ASYNC][STATE]
    │   └── autobyteus-server-ts/src/external-channel/runtime/channel-runtime-facade.ts:sendToTeam(binding, envelope) [ASYNC]
    │       ├── autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts:getTeamInstance(teamId) [STATE]
    │       └── teamInstance.postMessage(agentInputUserMessage, targetNodeName) [ASYNC]
    └── autobyteus-server-ts/src/api/rest/channel-ingress.ts:writeAcceptedResponse(...)

[ASYNC] completion
└── autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReply(event) [ASYNC][IO]

[ENTRY] autobyteus-message-gateway/src/http/routes/server-callback-route.ts:handleOutboundCallback(req, reply)
├── autobyteus-ts/src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(body) [STATE]
├── autobyteus-message-gateway/src/application/services/callback-idempotency-service.ts:checkAndMarkCallback(payload.callbackIdempotencyKey, ttlSeconds) [IO]
└── autobyteus-message-gateway/src/application/services/outbound-message-service.ts:handleOutbound(payload)
    └── autobyteus-message-gateway/src/infrastructure/adapters/wecom/wecom-adapter.ts:sendOutbound(payload) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] mention-gate blocks message
autobyteus-message-gateway/src/application/services/channel-mention-policy-service.ts:evaluateIfGroup(...)
└── blocked=true -> ack without forward
```

```text
[ERROR] team missing or invalid binding
autobyteus-server-ts/src/external-channel/runtime/channel-runtime-facade.ts:sendToTeam(...)
└── ingress route returns 422/404
```

### State And Data Transformations

- WeCom callback -> canonical envelope.
- Envelope -> team-dispatch message with channel metadata.
- Completion event -> callback -> WeCom send payload.

### Observability And Debug Points

- Lock contention timing for thread key.
- Team target-node dispatch success/failure counters.

### Design Smells / Gaps

- No blocking smell after enforcing startup validation for mention-policy and team-binding compatibility.

### Default Decisions

- Startup must fail fast on invalid policy/binding combinations.

---

## Use Case 3: WhatsApp Personal-Session DM End-To-End

### Goal
Validate full flow for personal WhatsApp account after QR-linked session is active.

### Preconditions
- Personal session created via admin endpoint and status is `ACTIVE`.
- Gateway+server signing secrets configured.
- Binding exists for `provider=whatsapp, transport=PERSONAL_SESSION`.

### Expected Outcome
- Personal-session inbound event dispatches once.
- Agent emits reply and callback is delivered via personal session client.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-message-gateway/src/http/routes/channel-admin-route.ts:createPersonalSession(req, reply)
└── autobyteus-message-gateway/src/application/services/whatsapp-personal-session-service.ts:startPersonalSession(accountLabel) [ASYNC]

[ASYNC] autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/session-event-listener.ts:onMessageUpsert(event)
└── autobyteus-message-gateway/src/application/services/session-inbound-bridge-service.ts:handleSessionEnvelope(envelope) [ASYNC]
    └── autobyteus-message-gateway/src/application/services/inbound-message-service.ts:handleNormalizedEnvelope(envelope) [ASYNC]
        └── autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(envelope) [ASYNC][IO]

[ENTRY] autobyteus-server-ts/src/api/rest/channel-ingress.ts:postInboundMessageRoute(req, reply)
└── autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope)
    ├── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:resolveBinding(provider, transport, ...) [IO]
    └── autobyteus-server-ts/src/external-channel/runtime/channel-runtime-facade.ts:sendToAgent(binding, envelope) [ASYNC]

[ASYNC] autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReply(event)
└── autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:postGatewayCallback(envelope) [ASYNC][IO]

[ENTRY] autobyteus-message-gateway/src/http/routes/server-callback-route.ts:handleOutboundCallback(req, reply)
├── autobyteus-ts/src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(body) [STATE]
├── autobyteus-message-gateway/src/application/services/callback-idempotency-service.ts:checkAndMarkCallback(payload.callbackIdempotencyKey, ttlSeconds) [IO]
└── autobyteus-message-gateway/src/application/services/outbound-message-service.ts:handleOutbound(payload)
    └── autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:sendOutbound(payload) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] session temporarily disconnected
autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts:reconnect(sessionId)
└── queue callback retry with backoff
```

```text
[ERROR] transport mismatch with binding
autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts:assertTransportCompatible(...)
└── ingress route returns 409 code=CHANNEL_TRANSPORT_MISMATCH
```

### State And Data Transformations

- Session SDK event -> shared envelope (`transport=PERSONAL_SESSION`).
- Reply callback -> personal-session send payload.

### Observability And Debug Points

- Gateway session health metrics and reconnect counters.
- Server transport mismatch counter.

### Design Smells / Gaps

- No blocking smell in Phase 1 after restricting personal-session admin APIs to internal-operator RBAC and audit logging.

### Default Decisions

- Personal-session admin routes are restricted to internal operators in Phase 1 (no public self-service yet).
