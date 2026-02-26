# Simulated Runtime Call Stacks (External Channel Ingress - Server TS)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary (`await`, callback, stream subscription)
  - `[STATE]` in-memory mutation
  - `[IO]` DB/network/file IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Simulation Basis

- Scope Classification: `Large`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/external_messaging_channel_bridge_ticket/EXTERNAL_CHANNEL_INGRESS_DESIGN.md`
- Referenced Sections:
  - `File-Level Design`
  - `Use-Case Fulfillment Matrix (Design-Level)`
  - `Error Handling`

## Use Case Index

- Use Case 1: Inbound channel message lazily creates agent and dispatches user message.
- Use Case 2: Existing team binding dispatches to target node with thread serialization.
- Use Case 3: Assistant completion emits outbound callback payload.
- Use Case 4: Approval-required tool invocation under channel policy.
- Use Case 5: Transport-aware binding prevents cross-mode routing collisions.
- Use Case 6: Gateway delivery-event callback updates delivery lifecycle state.

---

## Use Case 1: Inbound Channel Message Lazily Creates Agent And Dispatches User Message

### Goal
Accept gateway-ingress payload and dispatch to an agent instance, creating the agent lazily when required.

### Preconditions
- Gateway signature is valid when shared secret is configured.
- Binding resolves with lazy-create defaults.

### Expected Outcome
- One runtime dispatch.
- Channel receipt row persists source context.
- Binding is updated with created `agentId` transactionally.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/rest/channel-ingress.ts:postInboundMessageRoute(req, reply)
├── src/api/rest/channel-ingress.ts:verifyGatewayRequestSignature(body, headers, deps) [STATE]
│   └── src/api/rest/middleware/verify-gateway-signature.ts:verifyGatewaySignature(input) [IO]
├── autobyteus-ts/src/external-channel/external-message-envelope.ts:parseExternalMessageEnvelope(req.body) [STATE]
├── src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope) [ASYNC]
│   ├── src/external-channel/services/channel-idempotency-service.ts:ensureFirstSeen(idempotencyKey) [IO]
│   ├── src/external-channel/services/channel-binding-service.ts:resolveBinding(provider, transport, accountId, peerId, threadId) [IO]
│   ├── src/external-channel/services/channel-ingress-service.ts:assertTransportCompatible(envelope.transport, binding.transport) [STATE]
│   ├── src/external-channel/services/channel-thread-lock-service.ts:withThreadLock(routingKey, work) [ASYNC][STATE]
│   │   └── src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(binding, envelope) [ASYNC]
│   │       ├── [FALLBACK] if binding.agentId is null
│   │       │   ├── src/agent-execution/services/agent-run-manager.ts:createAgentRun(config) [ASYNC][STATE]
│   │       │   └── src/external-channel/services/channel-binding-service.ts:upsertBindingAgentId(bindingId, agentId) [IO]
│   │       ├── src/agent-execution/services/agent-run-manager.ts:getAgentRun(agentId) [STATE]
│   │       ├── autobyteus-ts/src/agent/message/external-source-metadata.ts:buildAgentExternalSourceMetadata(envelope) [STATE]
│   │       └── agentRun.postUserMessage(agentInputUserMessage) [ASYNC]
│   └── src/external-channel/services/channel-message-receipt-service.ts:recordIngressReceipt(receiptInput) [IO]
│       └── src/external-channel/providers/channel-message-receipt-provider.ts:recordIngressReceipt(receiptInput) [IO]
└── src/api/rest/channel-ingress.ts:writeAcceptedResponse(reply, duplicate=false)
```

### Branching / Fallback Paths

```text
[FALLBACK] idempotency duplicate
src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(...)
├── src/external-channel/services/channel-idempotency-service.ts:ensureFirstSeen(...) # duplicate=true
└── src/api/rest/channel-ingress.ts:writeAcceptedResponse(duplicate=true)
```

```text
[FALLBACK] signature check disabled when shared secret is unset
src/api/rest/channel-ingress.ts:verifyGatewayRequestSignature(body, headers, deps)
└── return null (skip auth gate) -> continue parse + dispatch flow
```

```text
[ERROR] missing binding and no lazy-create defaults
src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(...)
└── src/api/rest/channel-ingress.ts:writeUnprocessableEntityResponse(422)
```

### State And Data Transformations

- Ingress JSON payload -> `ExternalMessageEnvelope`.
- Envelope -> `AgentInputUserMessage` with `externalSource` metadata.
- Source context -> `ChannelMessageReceipt` row.

### Observability And Debug Points

- Logs: route entry, signature decision, idempotency decision, binding decision, dispatch completion, receipt write.
- Metrics:
  - `channel_ingress_accepted_total`
  - `channel_ingress_duplicate_total`
  - `channel_ingress_dispatch_latency_ms`

### Design Smells / Gaps

- No blocking smell. Responsibilities are isolated across route, orchestration, runtime facade, and provider boundary.

### Open Questions

- None blocking for Phase 1.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No
- If any "No", refinement action: N/A

---

## Use Case 6: Gateway Delivery-Event Callback Updates Delivery Lifecycle State

### Goal
Persist gateway delivery-event callbacks as deterministic delivery lifecycle updates (`PENDING`/`SENT`/`FAILED`).

### Preconditions
- Gateway can call `/api/channel-ingress/v1/delivery-events` with normalized payload.
- Callback idempotency key is present in metadata or resolvable from correlation id fallback.

### Expected Outcome
- Delivery-event route resolves callback key deterministically.
- `delivery-event-service` records matching status transition in provider storage.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/rest/channel-ingress.ts:postDeliveryEventRoute(req, reply)
├── src/api/rest/channel-ingress.ts:verifyGatewayRequestSignature(body, headers, deps) [STATE]
│   └── src/api/rest/middleware/verify-gateway-signature.ts:verifyGatewaySignature(input) [IO]
├── autobyteus-ts/src/external-channel/external-delivery-event.ts:parseExternalDeliveryEvent(req.body) [STATE]
├── src/api/rest/channel-ingress.ts:resolveCallbackIdempotencyKey(metadata, correlationMessageId) [STATE]
└── src/external-channel/services/delivery-event-service.ts:recordSent|recordPending|recordFailed(input) [ASYNC]
    └── src/external-channel/providers/sql-delivery-event-provider.ts:upsertByCallbackKey(input) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] callback key fallback to correlationMessageId
src/api/rest/channel-ingress.ts:resolveCallbackIdempotencyKey(metadata, correlationMessageId)
└── metadata key missing -> use normalized correlationMessageId
```

```text
[ERROR] invalid delivery-event payload (`correlationMessageId` blank/missing)
autobyteus-ts/src/external-channel/external-delivery-event.ts:parseExternalDeliveryEvent(req.body)
└── src/api/rest/channel-ingress.ts:handleRouteError(...) -> HTTP 400 (`INVALID_INPUT`, `field=correlationMessageId`)
```

### State And Data Transformations

- Delivery-event payload -> parsed `ExternalDeliveryEvent`.
- Callback key resolution order:
  1. `metadata.callbackIdempotencyKey`
  2. `metadata.callback_idempotency_key`
  3. `correlationMessageId`
- Parsed status -> mapped service call (`recordPending`/`recordSent`/`recordFailed`).

### Observability And Debug Points

- Logs: callback key resolution decision, delivery status mapping, provider upsert result.
- Metrics:
  - `channel_delivery_event_accepted_total`
  - `channel_delivery_event_parse_error_total`

### Design Smells / Gaps

- No blocking smell. Route-only parsing/resolution concern is separate from delivery lifecycle persistence concern.

### Open Questions

- None blocking for Phase 1.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No
- If any "No", refinement action: N/A

---

## Use Case 2: Existing Team Binding Dispatches To Target Node With Thread Serialization

### Goal
Route channel message to a team context with stable ordering per external thread.

### Preconditions
- Binding resolves to `teamId` and `targetNodeName`.

### Expected Outcome
- Message dispatches exactly once to configured node.
- No thread interleaving for same `(provider, transport, accountId, peerId, threadId)`.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/rest/channel-ingress.ts:postInboundMessageRoute(req, reply)
└── src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope) [ASYNC]
    ├── src/external-channel/services/channel-binding-service.ts:resolveBinding(...) [IO]
    ├── src/external-channel/services/channel-thread-lock-service.ts:withThreadLock(routingKey, work) [ASYNC][STATE]
    │   └── src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(binding, envelope) [ASYNC]
    │       ├── src/agent-team-execution/services/agent-team-run-manager.ts:getTeamRun(teamId) [STATE]
    │       ├── autobyteus-ts/src/agent/message/external-source-metadata.ts:buildAgentExternalSourceMetadata(envelope) [STATE]
    │       └── teamInstance.postMessage(agentInputUserMessage, targetNodeName) [ASYNC]
    └── src/external-channel/services/channel-message-receipt-service.ts:recordIngressReceipt(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] team not active and binding allows lazy team create
src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(...)
└── src/agent-team-execution/services/agent-team-run-manager.ts:createTeamRun(...) [ASYNC][STATE]
```

```text
[ERROR] team instance missing and no lazy-create config
src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(...)
└── src/api/rest/channel-ingress.ts:writeUnprocessableEntityResponse(422)
```

### State And Data Transformations

- Envelope -> team-targeted `AgentInputUserMessage`.
- Thread-lock queue state -> deterministic dispatch ordering.

### Observability And Debug Points

- Metric `channel_thread_lock_wait_ms` for contention.
- Log includes `routingKey`, `teamId`, and `targetNodeName`.

### Design Smells / Gaps

- No blocking smell. Dispatch ordering concern is isolated in lock service.

### Open Questions

- None blocking for Phase 1.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No
- If any "No", refinement action: N/A

---

## Use Case 3: Assistant Completion Emits Outbound Callback Payload

### Goal
Convert assistant-complete events into outbound callback payloads for gateway delivery.

### Preconditions
- Message originated from external channel.
- Assistant-complete event is emitted by runtime stream.

### Expected Outcome
- Outbound callback posted once.
- Delivery state recorded as pending -> sent/failed.

### Primary Runtime Call Stack

```text
[ASYNC][ENTRY] src/external-channel/subscribers/assistant-complete-subscriber.ts:onAssistantComplete(event)
└── src/external-channel/services/reply-callback-service.ts:publishAssistantReply(event) [ASYNC]
    ├── src/external-channel/services/callback-idempotency-service.ts:reserveCallbackKey(callbackKey, ttlSeconds) [IO]
    ├── src/external-channel/services/channel-message-receipt-service.ts:getLatestSourceByAgentId(agentId) [IO]
    │   └── src/external-channel/providers/channel-message-receipt-provider.ts:getLatestSourceByAgentId(agentId) [IO]
    ├── src/external-channel/services/channel-binding-service.ts:findBindingByDispatchTarget(agentId, teamId) [IO]
    ├── src/external-channel/services/reply-callback-service.ts:buildAssistantReplyEnvelope(...) [STATE]
    ├── src/external-channel/services/delivery-event-service.ts:recordPending(...) [IO]
    ├── src/external-channel/services/reply-callback-service.ts:postGatewayCallback(envelope) [ASYNC][IO]
    └── src/external-channel/services/delivery-event-service.ts:recordSent(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] no source context found for agent
src/external-channel/services/reply-callback-service.ts:publishAssistantReply(...)
└── skip callback publication + log channel-unbound completion
```

```text
[ERROR] callback network failure
src/external-channel/services/reply-callback-service.ts:postGatewayCallback(...)
└── src/external-channel/services/delivery-event-service.ts:recordFailed(...) [IO]
```

### State And Data Transformations

- Assistant-complete event -> normalized callback envelope.
- Delivery lifecycle state: pending -> sent/failed.

### Observability And Debug Points

- Metrics:
  - `channel_reply_callback_total`
  - `channel_reply_callback_duplicate_total`
  - `channel_reply_callback_fail_total`
- Logs include callback idempotency key and routing identifiers.

### Design Smells / Gaps

- No blocking smell. Build/publish/idempotency/delivery concerns are separated.

### Open Questions

- None blocking for Phase 1.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No
- If any "No", refinement action: N/A

---

## Use Case 4: Approval-Required Tool Invocation Under Channel Policy

### Goal
Ensure deterministic handling when runtime requests tool approval for a channel-originated run.

### Preconditions
- Agent/tool configuration can emit approval-required events.
- Channel has no interactive approval UX in Phase 1.

### Expected Outcome
- Policy mode resolves deterministically (`AUTO_APPROVE` / `AUTO_DENY` / `TIMEOUT_DENY`).
- Run does not stall indefinitely.

### Primary Runtime Call Stack

```text
[ASYNC][ENTRY] src/external-channel/subscribers/tool-approval-requested-subscriber.ts:onToolApprovalRequested(event)
└── src/external-channel/services/tool-approval-policy-service.ts:handleApprovalRequested(input) [ASYNC]
    ├── src/external-channel/services/tool-approval-policy-service.ts:resolvePolicy(context) [STATE]
    ├── [FALLBACK] policy=AUTO_APPROVE -> src/external-channel/runtime/channel-runtime-approval-port.ts:postToolExecutionApproval(agentId, invocationId, true) [ASYNC]
    ├── [FALLBACK] policy=AUTO_DENY -> src/external-channel/runtime/channel-runtime-approval-port.ts:postToolExecutionApproval(agentId, invocationId, false) [ASYNC]
    └── [FALLBACK] policy=TIMEOUT_DENY -> schedule timeout -> post deny [ASYNC]
```

### Branching / Fallback Paths

```text
[ERROR] approval command publish fails
src/external-channel/services/tool-approval-policy-service.ts:handleApprovalRequested(...)
└── default to deny + emit policy-failure telemetry event
```

### State And Data Transformations

- Approval event -> policy decision -> approval command.

### Observability And Debug Points

- Metric `channel_tool_approval_policy_total{policy=*}`.
- Warning log for timeout-deny and failure fallback.

### Design Smells / Gaps

- No blocking smell. Event bridge, policy decision, and approval-command boundary are isolated.

### Open Questions

- None blocking for Phase 1 (`WEB_QUEUE` remains Phase 2).

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No
- If any "No", refinement action: N/A

---

## Use Case 5: Transport-Aware Binding Prevents Cross-Mode Routing Collisions

### Goal
Ensure WhatsApp business and personal-session transports cannot cross-route to the wrong binding.

### Preconditions
- Multiple bindings may exist for same provider/account/peer/thread with different `transport`.

### Expected Outcome
- Message routes only to transport-matching binding.
- Explicit mismatch returns deterministic `409 CHANNEL_TRANSPORT_MISMATCH`.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/rest/channel-ingress.ts:postInboundMessageRoute(req, reply)
└── src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope) [ASYNC]
    ├── src/external-channel/services/channel-binding-service.ts:resolveBinding(provider, transport, accountId, peerId, threadId) [IO]
    ├── src/external-channel/services/channel-ingress-service.ts:assertTransportCompatible(envelope.transport, binding.transport) [STATE]
    └── src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(binding, envelope) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] no transport-specific binding, provider-default fallback enabled
src/external-channel/services/channel-binding-service.ts:resolveBinding(...)
└── return provider-default binding only when `allowTransportFallback=true`
```

```text
[ERROR] explicit transport mismatch
src/external-channel/services/channel-ingress-service.ts:assertTransportCompatible(...)
└── src/api/rest/channel-ingress.ts:writeConflictResponse(409, code="CHANNEL_TRANSPORT_MISMATCH")
```

### State And Data Transformations

- Envelope transport + binding policy -> dispatch eligibility decision.

### Observability And Debug Points

- Metric `channel_ingress_transport_mismatch_total`.
- Warning log includes provider, transport, binding id, and peer id.

### Design Smells / Gaps

- No blocking smell. Transport policy is explicit and centralized.

### Open Questions

- None blocking for Phase 1.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No
- If any "No", refinement action: N/A
