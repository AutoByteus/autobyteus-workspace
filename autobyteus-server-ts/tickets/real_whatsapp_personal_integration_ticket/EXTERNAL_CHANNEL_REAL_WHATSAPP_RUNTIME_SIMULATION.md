# Simulated Runtime Call Stacks (Debug-Trace Style)

This document validates server-side flow for real WhatsApp personal transport without reintroducing conversation persistence coupling.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` DB/network IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Simulation Basis

- Scope Classification: `Large`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/real_whatsapp_personal_integration_ticket/EXTERNAL_CHANNEL_REAL_WHATSAPP_DESIGN.md`

## Current Runtime Validation Snapshot (2026-02-09)

This simulation now matches current implementation and verification evidence.

Validation evidence:
- External-channel suites passed across unit/integration/e2e layers (81 tests total).
- GraphQL setup e2e tests passed:
  - `tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts`
- Live GraphQL introspection confirmed setup fields are registered:
  - query fields: `externalChannelCapabilities`, `externalChannelBindings`
  - mutation fields: `upsertExternalChannelBinding`, `deleteExternalChannelBinding`
- Live GraphQL query confirmed setup APIs execute successfully:
  - `externalChannelCapabilities { bindingCrudEnabled }`
  - `externalChannelBindings`

Use-case readiness against current code:
- Use Case 1: Pass.
- Use Case 2: Pass.
- Use Case 3: Pass.
- Use Case 4: Pass.

## Use Case Index

- Use Case 1: Inbound personal-session message dispatches to runtime and records source context.
- Use Case 2: Assistant completion publishes callback envelope via recorded source context.
- Use Case 3: Delivery-event callback updates lifecycle.
- Use Case 4: Web setup queries capabilities and updates binding.

---

## Use Case 1: Inbound Personal-Session Message Dispatches To Runtime

### Goal
Accept normalized personal-session envelope and route to bound agent/team while recording callback source context.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/rest/channel-ingress.ts:POST /api/channel-ingress/v1/messages
├── verify-gateway-signature.ts:verifyGatewaySignature(input) [IO]
├── autobyteus-ts/external-channel/external-message-envelope.ts:parseExternalMessageEnvelope(body) [STATE]
└── src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope) [ASYNC]
    ├── channel-idempotency-service.ts:ensureFirstSeen(key) [IO]
    ├── channel-binding-service.ts:resolveBinding(provider, transport, accountId, peerId, threadId) [IO]
    ├── channel-thread-lock-service.ts:withThreadLock(routingKey, work) [ASYNC][STATE]
    │   └── runtime/default-channel-runtime-facade.ts:dispatchToBinding(binding, envelope) [ASYNC]
    │       ├── [FALLBACK] AGENT target path
    │       │   ├── agent-run-manager.ts:getAgentRun(agentId) [STATE]
    │       │   └── agentRun.postUserMessage(agentInputUserMessage) [ASYNC]
    │       └── [FALLBACK] TEAM target path
    │           ├── agent-team-run-manager.ts:getTeamRun(teamId) [STATE]
    │           └── teamRun.postMessage(agentInputUserMessage, targetNodeName) [ASYNC]
    └── channel-message-receipt-service.ts:recordIngressReceipt(receiptInput) [IO]
        └── providers/sql-channel-message-receipt-provider.ts:recordIngressReceipt(input) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] duplicate inbound
channel-idempotency-service.ts:ensureFirstSeen(key) => duplicate=true
└── route returns accepted duplicate
```

```text
[ERROR] missing binding
channel-binding-service.ts:resolveBinding(...) => null
└── route maps to 422 CHANNEL_BINDING_NOT_FOUND
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Assistant Completion Publishes Callback Envelope

### Goal
Build outbound callback envelope from stored source context and publish to gateway.

### Primary Runtime Call Stack

```text
[ENTRY] src/external-channel/subscribers/assistant-complete-subscriber.ts:onAssistantComplete(event)
└── src/external-channel/services/reply-callback-service.ts:publishAssistantReply(input) [ASYNC]
    ├── callback-idempotency-service.ts:reserveCallbackKey(callbackKey, ttl) [IO]
    ├── channel-message-receipt-service.ts:getLatestSourceByDispatchTarget(target) [IO]
    │   └── providers/sql-channel-message-receipt-provider.ts:getLatestSourceByDispatchTarget(target) [IO]
    ├── reply-callback-service.ts:buildAssistantReplyEnvelope(input) [STATE]
    ├── delivery-event-service.ts:recordPending(input) [IO]
    ├── callbackPublisher.publish(envelope) [ASYNC][IO]
    └── delivery-event-service.ts:recordSent(input) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] duplicate callback key
callback-idempotency-service.ts:reserveCallbackKey(...) => duplicate=true
└── publishAssistantReply returns DUPLICATE without publish
```

```text
[FALLBACK] compatibility lookup for pre-refinement data
channel-message-receipt-service.ts:getLatestSourceByDispatchTarget(target) => null
└── channel-message-receipt-service.ts:getLatestSourceByAgentId(agentId) [IO]
    ├── returns source -> continue publish path
    └── returns null -> publishAssistantReply returns SOURCE_NOT_FOUND
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Delivery-Event Callback Updates Lifecycle

### Goal
Persist gateway delivery state transitions.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/rest/channel-ingress.ts:POST /api/channel-ingress/v1/delivery-events
├── verify-gateway-signature.ts:verifyGatewaySignature(input) [IO]
├── autobyteus-ts/external-channel/external-delivery-event.ts:parseExternalDeliveryEvent(body) [STATE]
├── channel-ingress.ts:resolveCallbackIdempotencyKey(metadata, correlationMessageId) [STATE]
└── src/external-channel/services/delivery-event-service.ts:recordPending|recordSent|recordFailed(input) [ASYNC]
    └── providers/sql-delivery-event-provider.ts:upsertByCallbackKey(input) [IO]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Web Setup Queries Capabilities And Updates Binding

### Goal
Enable setup-only UI operations for binding capability and CRUD.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/external-channel-setup.ts:externalChannelCapabilities()
└── returns setup capability snapshot [STATE]

[ENTRY] src/api/graphql/types/external-channel-setup.ts:externalChannelBindings()
└── channel-binding-service.ts:listBindings() [ASYNC][IO]

[ENTRY] src/api/graphql/types/external-channel-setup.ts:upsertExternalChannelBinding(input)
└── channel-binding-service.ts:upsertBinding(input) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[ERROR] capability disabled in rollout gate
externalChannelCapabilities() => bindingCrudEnabled=false
└── web store blocks binding UI operations
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
