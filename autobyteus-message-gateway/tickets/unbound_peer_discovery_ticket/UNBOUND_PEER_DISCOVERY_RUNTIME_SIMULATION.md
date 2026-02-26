# Simulated Runtime Call Stacks (autobyteus-message-gateway: Unbound Peer Discovery, Rev 3)

## Simulation Basis
- Scope Classification: `Large`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tickets/unbound_peer_discovery_ticket/UNBOUND_PEER_DISCOVERY_DESIGN.md`

## Verification Outcome Summary
- Use Case 1: Partial (blocked by server contract)
- Use Case 2: Fail (non-text dropped pre-observation)
- Use Case 3: Pass
- Use Case 4: Partial (forward-blocked branch is functionally correct but weakly visible)
- Use Case 5: Pass
- Use Case 6: Fail (no explicit non-error diagnostics for mention-blocked path)

---

## Use Case 1: Unknown Direct Peer Text Before Binding

### Current Runtime (Observed)
```text
[ENTRY] baileys-session-client.ts:messageListener(event)
└── whatsapp-personal-adapter.ts:handleInboundMessage(record, event)
    ├── personal-peer-candidate-index.ts:recordObservation(...) [STATE]
    └── inbound-message-service.ts:handleNormalizedEnvelope(envelope)
        └── autobyteus-server-client.ts:forwardInbound(envelope) [IO]
            └── 422 thrown -> bridge error reporter
```

### Target Runtime (Post-Design Update)
```text
[ENTRY] baileys-session-client.ts:messageListener(event)
└── whatsapp-inbound-observer.ts:observeInbound(...) [STATE]
└── whatsapp-inbound-router.ts:routeInboundIfRoutable(...) [ASYNC]
    └── inbound-message-service.ts:handleNormalizedEnvelope(envelope)
        └── autobyteus-server-client.ts:forwardInbound(envelope) [IO]
            └── disposition='UNBOUND'
```

### Verification Checklist
- End-to-end path achieves expected outcome: No (current), Yes (target)
- Separation of concerns looks clean: Partial
- Boundaries/API ownership are clear: Partial
- Dependency flow is reasonable: Yes
- Major smell detected: Yes
- Refinement action: server contract + adapter split.

---

## Use Case 2: Unknown Non-Text Message Before Binding

### Current Runtime (Observed)
```text
[ENTRY] baileys-session-client.ts:mapInboundMessage(message)
└── if !text => return null
```

### Target Runtime (Post-Design Update)
```text
[ENTRY] baileys-session-client.ts:mapInboundMessage(message)
└── returns event with text=null
    ├── whatsapp-inbound-observer.ts:observeInbound(...) [STATE]
    └── whatsapp-inbound-router.ts:routeInboundIfRoutable(...)
        └── [FALLBACK] skip envelope forwarding
```

### Verification Checklist
- End-to-end path achieves expected outcome: No (current), Yes (target)
- Separation of concerns looks clean: No (current), Yes (target)
- Boundaries/API ownership are clear: Partial
- Dependency flow is reasonable: Yes
- Major smell detected: Yes
- Refinement action: optional-text event model.

---

## Use Case 3: Bound Peer Inbound Routes Successfully

### Runtime Call Stack
```text
[ENTRY] inbound-message-service.ts:handleNormalizedEnvelope(envelope)
├── idempotencyService.checkAndMarkEnvelope(...) [ASYNC]
├── mentionPolicyService.evaluateIfGroup(...) [STATE]
└── autobyteus-server-client.ts:forwardInbound(envelope) [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Group Message Without Mention

### Current Runtime (Observed)
```text
[ENTRY] whatsapp-personal-adapter.ts:handleInboundMessage(...)
├── recordObservation(...) [STATE]
└── inbound-message-service.ts:handleNormalizedEnvelope(envelope)
    └── mentionPolicyService.evaluateIfGroup(...) => allowed=false
        └── forwarding skipped, blocked=true
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes (discoverability preserved)
- Separation of concerns looks clean: Partial (lane not explicit in current adapter structure)
- Boundaries/API ownership are clear: Partial
- Dependency flow is reasonable: Yes
- Major smell detected: Yes (observability concern mixed with silent fallback behavior)
- Refinement action: keep branch explicit in runtime simulation/tests and add explicit mention-blocked diagnostics policy.

---

## Use Case 5: Real Forwarding Failure

### Runtime Call Stack
```text
[ENTRY] session-inbound-bridge-service.ts:handleSessionEnvelope(envelope)
└── [ERROR] inbound-message-service throws
    └── defaultSessionInboundErrorReporter(...)
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 6: Mention-Blocked Fallback Visibility

### Current Runtime (Observed)
```text
[ENTRY] inbound-message-service.ts:handleNormalizedEnvelope(envelope)
└── mentionPolicyService.evaluateIfGroup(...) => allowed=false
    └── return { blocked:true, forwarded:false }
        └── session-inbound-bridge-service.ts ignores result payload
```

### Target Runtime (Post-Design Update)
```text
[ENTRY] session-inbound-bridge-service.ts:handleSessionEnvelope(envelope)
└── inbound-message-service.ts:handleNormalizedEnvelope(envelope)
    ├── blocked=false -> normal behavior
    └── blocked=true -> non-error diagnostic log (policy-blocked path)
```

### Verification Checklist
- End-to-end path achieves expected outcome: No (current), Yes (target)
- Separation of concerns looks clean: Partial
- Boundaries/API ownership are clear: Partial
- Dependency flow is reasonable: Yes
- Major smell detected: Yes (policy fallback not observable)
