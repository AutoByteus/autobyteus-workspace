# Simulated Runtime Call Stacks (autobyteus-server-ts)

## Simulation Basis
- Scope Classification: `Medium`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/wechat_personal_integration_ticket/EXTERNAL_CHANNEL_WECHAT_DESIGN.md`

## Use Case Index
- Use Case 1: Inbound `WECHAT + PERSONAL_SESSION` dispatch.
- Use Case 2: Assistant reply publishes `WECHAT` callback envelope.
- Use Case 3: Binding mutation invariant enforcement.
- Use Case 4: Web reads server compatibility pairs.

---

## Use Case 1: Inbound `WECHAT + PERSONAL_SESSION` Dispatch

### Primary Runtime Call Stack
```text
[ENTRY] src/api/rest/channel-ingress.ts:POST /api/channel-ingress/v1/messages
├── parseExternalMessageEnvelope(payload) [STATE]
└── src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope) [ASYNC]
    ├── channel-idempotency-service.ts:ensureFirstSeen(key) [IO]
    ├── channel-binding-service.ts:resolveBinding(provider, transport, accountId, peerId, threadId) [IO]
    ├── runtime/default-channel-runtime-facade.ts:dispatchToBinding(binding, envelope) [ASYNC]
    └── channel-message-receipt-service.ts:recordIngressReceipt(input) [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Assistant Reply Publishes `WECHAT` Callback Envelope

### Primary Runtime Call Stack
```text
[ENTRY] src/external-channel/subscribers/assistant-complete-subscriber.ts:onAssistantComplete(event)
└── src/external-channel/services/reply-callback-service.ts:publishAssistantReply(input) [ASYNC]
    ├── callback-idempotency-service.ts:reserveCallbackKey(key) [IO]
    ├── channel-message-receipt-service.ts:getLatestSourceByDispatchTarget(target) [IO]
    ├── reply-callback-service.ts:buildAssistantReplyEnvelope(input) [STATE]
    └── callbackPublisher.publish(envelope provider=WECHAT) [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Binding Mutation Invariant Enforcement

### Primary Runtime Call Stack
```text
[ENTRY] src/api/graphql/types/external-channel-setup.ts:upsertExternalChannelBinding(input)
├── parseExternalChannelProvider(input.provider) [STATE]
├── parseExternalChannelTransport(input.transport) [STATE]
├── channel-binding-constraint-service.ts:validateProviderTransport(provider, transport) [STATE]
├── channel-binding-target-options-service.ts:isActiveTarget(...) [IO]
└── channel-binding-service.ts:upsertBinding(...) [IO]
```

### Branching / Error Paths
```text
[ERROR] invalid combination
validateProviderTransport(WECHAT, BUSINESS_API)
└── throw Error('UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION') [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Web Reads Server Compatibility Pairs

### Primary Runtime Call Stack
```text
[ENTRY] src/api/graphql/types/external-channel-setup.ts:externalChannelCapabilities()
└── returns { bindingCrudEnabled, acceptedProviderTransportPairs } [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
