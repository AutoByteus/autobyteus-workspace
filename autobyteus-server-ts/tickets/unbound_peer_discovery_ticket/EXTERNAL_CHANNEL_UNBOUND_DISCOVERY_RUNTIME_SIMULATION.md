# Simulated Runtime Call Stacks (autobyteus-server-ts: Unbound Ingress Disposition, Rev 3)

## Simulation Basis
- Scope Classification: `Large`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/unbound_peer_discovery_ticket/EXTERNAL_CHANNEL_UNBOUND_DISCOVERY_DESIGN.md`

## Verification Outcome Summary
- Use Case 1: Fail (unbound still throws)
- Use Case 2: Pass
- Use Case 3: Pass
- Use Case 4: Pass
- Use Case 5: Partial (route separation smell)

---

## Use Case 1: Unknown Peer Ingress -> UNBOUND

### Current Runtime (Observed)
```text
[ENTRY] channel-ingress.ts:POST /api/channel-ingress/v1/messages
└── channel-ingress-service.ts:handleInboundMessage(envelope)
    └── throw ChannelIngressBindingNotFoundError
        └── route maps 422
```

### Target Runtime (Post-Design Update)
```text
[ENTRY] channel-ingress-message-route.ts:POST /api/channel-ingress/v1/messages
└── channel-ingress-service.ts:handleInboundMessage(envelope)
    └── return { disposition:'UNBOUND', bindingResolved:false }
        └── route maps 202 accepted payload
```

### Verification Checklist
- End-to-end path achieves expected outcome: No (current), Yes (target)
- Separation of concerns looks clean: Partial
- Boundaries/API ownership are clear: Partial
- Dependency flow is reasonable: Yes
- Major smell detected: Yes
- Refinement action: service return contract + route mapping update.

---

## Use Case 2: Bound Peer Ingress -> ROUTED

### Runtime Call Stack
```text
[ENTRY] channel-ingress-service.ts:handleInboundMessage(envelope)
├── idempotencyService.ensureFirstSeen(...) [ASYNC]
├── bindingService.resolveBinding(...) [ASYNC]
├── threadLockService.withThreadLock(...) [ASYNC]
│   └── runtimeFacade.dispatchToBinding(...) [ASYNC]
└── recordIngressReceipt(...) [ASYNC]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Duplicate Ingress -> DUPLICATE

### Runtime Call Stack
```text
[ENTRY] channel-ingress-service.ts:handleInboundMessage(envelope)
└── ensureFirstSeen(...) => duplicate=true
    └── return duplicate result (no resolveBinding/dispatch)
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Invalid Payload -> Parse Error

### Runtime Call Stack
```text
[ENTRY] channel-ingress-message-route.ts:POST /messages
└── parseExternalMessageEnvelope(body) throws ExternalChannelParseError
    └── shared route error mapper -> HTTP 400
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 5: Delivery Event Isolation

### Current Runtime (Observed)
```text
[ENTRY] channel-ingress.ts includes both message ingress + delivery routes + helper logic
```

### Target Runtime (Post-Design Update)
```text
[ENTRY] channel-delivery-event-route.ts:POST /api/channel-ingress/v1/delivery-events
└── deliveryEventService.record* APIs [ASYNC]

[ENTRY] channel-ingress-message-route.ts:POST /api/channel-ingress/v1/messages
└── ingress service only
```

### Verification Checklist
- End-to-end path achieves expected outcome: Partial (current), Yes (target)
- Separation of concerns looks clean: Partial (current), Yes (target)
- Boundaries/API ownership are clear: Partial (current), Yes (target)
- Dependency flow is reasonable: Yes
- Major smell detected: Yes (mixed route concerns)
