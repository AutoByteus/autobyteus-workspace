# Simulated Runtime Call Stacks (autobyteus-message-gateway)

## Simulation Basis
- Scope Classification: `Large`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tickets/wechat_personal_integration_ticket/WECHAT_PERSONAL_INTEGRATION_DESIGN.md`

## Use Case Index
- Use Case 1: WeCom callback URL verification handshake.
- Use Case 2: WeCom-app inbound callback to server ingress.
- Use Case 3: WeCom outbound callback dispatch through unified adapter.
- Use Case 4: Setup UI reads capability + account inventory.
- Use Case 5: Start direct WeChat session and fetch QR.
- Use Case 6: Direct WeChat peer discovery for binding.
- Use Case 7: Gateway restart restores direct sessions.

---

## Use Case 1: WeCom Callback URL Verification Handshake

### Primary Runtime Call Stack
```text
[ENTRY] src/http/routes/wecom-app-webhook-route.ts:GET /webhooks/wecom-app/:accountId
└── infrastructure/adapters/wecom/wecom-app-inbound-strategy.ts:verifyHandshake(accountId, query) [STATE]
    ├── wecom-account-registry.ts:resolveAccountMode(accountId) [STATE]
    └── returns decrypted/validated echo payload [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: WeCom-app Inbound Callback

### Primary Runtime Call Stack
```text
[ENTRY] src/http/routes/wecom-app-webhook-route.ts:POST /webhooks/wecom-app/:accountId
├── http-request-mapper.ts:toInboundHttpRequest(request) [STATE]
├── infrastructure/adapters/wecom/wecom-unified-adapter.ts:verifyInboundSignature(request, rawBody) [STATE]
│   └── wecom-app-inbound-strategy.ts:verifyCallback(accountId, request, rawBody) [STATE]
└── application/services/inbound-message-service.ts:handleInbound('WECOM', mappedRequest) [ASYNC]
    ├── wecom-unified-adapter.ts:parseInbound(request) [STATE]
    │   └── wecom-inbound-message-id-normalizer.ts:normalizeInboundMessageId(payload) [STATE]
    ├── idempotency-service.ts:checkAndMarkEnvelope(envelope) [IO]
    └── autobyteus-server-client.ts:forwardInbound(envelope) [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: WeCom Outbound Through Unified Adapter

### Primary Runtime Call Stack
```text
[ENTRY] src/http/routes/server-callback-route.ts:POST /api/server-callback/v1/messages
└── application/services/outbound-message-service.ts:handleOutbound(envelope) [ASYNC]
    ├── resolveAdapterByRoutingKey('WECOM:BUSINESS_API') [STATE]
    └── infrastructure/adapters/wecom/wecom-unified-adapter.ts:sendOutbound(envelope) [ASYNC]
        ├── wecom-account-registry.ts:resolveAccountMode(accountId) [STATE]
        ├── [FALLBACK] legacy mode -> legacy strategy send [ASYNC]
        └── [FALLBACK] app mode -> wecom-app-outbound-strategy.ts:send(envelope) [ASYNC][IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Setup UI Reads Capability + Accounts

### Primary Runtime Call Stack
```text
[ENTRY] src/http/routes/channel-admin-route.ts:GET /api/channel-admin/v1/capabilities
└── application/services/gateway-capability-service.ts:getCapabilities() [STATE]

[ENTRY] src/http/routes/channel-admin-route.ts:GET /api/channel-admin/v1/wecom/accounts
└── infrastructure/adapters/wecom/wecom-account-registry.ts:listAccounts() [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 5: Start Direct WeChat Session And Fetch QR

### Primary Runtime Call Stack
```text
[ENTRY] channel-admin-route.ts:POST /api/channel-admin/v1/wechat/personal/sessions
└── wechat-personal-session-service.ts:startPersonalSession(accountLabel) [ASYNC]
    └── wechat-personal-adapter.ts:startSession(accountLabel) [ASYNC]
        ├── session-state-store.ts:save(sessionMetadata) [IO]
        └── wechaty-sidecar-client.ts:open(sessionConfig) [IO]

[ENTRY] channel-admin-route.ts:GET /api/channel-admin/v1/wechat/personal/sessions/:sessionId/qr
└── wechat-personal-session-service.ts:getPersonalSessionQr(sessionId) [ASYNC]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 6: Direct WeChat Peer Discovery

### Primary Runtime Call Stack
```text
[ENTRY] wechaty-sidecar-client.ts:onMessage(event)
└── wechat-personal-adapter.ts:handleInboundEvent(event) [STATE]
    ├── wechat-inbound-message-id-normalizer.ts:normalizeInboundMessageId(event) [STATE]
    ├── inbound-envelope-mapper.ts:toExternalMessageEnvelope(event) [STATE]
    ├── peer-candidate-index.ts:indexInboundPeer(event) [STATE]
    └── session-inbound-bridge-service.ts:handleSessionEnvelope(envelope) [ASYNC]
        └── inbound-message-service.ts:handleNormalizedEnvelope(envelope) [ASYNC][IO]

[ENTRY] channel-admin-route.ts:GET /api/channel-admin/v1/wechat/personal/sessions/:sessionId/peer-candidates
└── wechat-personal-session-service.ts:listPeerCandidates(sessionId, query) [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 7: Restart Restore

### Primary Runtime Call Stack
```text
[ENTRY] create-gateway-app.ts:createGatewayApp(config)
└── wechat-personal-adapter.ts:restorePersistedSessions() [ASYNC]
    ├── session-state-store.ts:list() [IO]
    └── wechaty-sidecar-client.ts:open(sessionConfig) [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
