# Simulated Runtime Call Stacks (External Channel Outbound Reply - Server TS)

## Conventions
- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags: `[ENTRY] [ASYNC] [STATE] [IO] [FALLBACK] [ERROR]`

## Simulation Basis
- Scope Classification: `Large`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/external_messaging_outbound_reply_ticket/EXTERNAL_CHANNEL_OUTBOUND_REPLY_DESIGN.md`

## Use Case Index
- Use Case 1: Bind external turn to ingress receipt deterministically.
- Use Case 2: Publish assistant reply to exact source route by turn.
- Use Case 3: Concurrent peers on one agent do not cross-route.
- Use Case 4: Binding removed before completion blocks callback.
- Use Case 5: Non-external/internal turns skip callback.
- Use Case 6: TEAM-target outbound is explicitly gated in phase 1.
- Use Case 7: Completion event without `turnId` is explicitly skipped.
- Use Case 8: External processors are mandatory defaults for all agents.

---

## Use Case 1: Bind External Turn To Ingress Receipt Deterministically

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/user-input-message-event-handler.ts:handle(...)
└── /Users/normy/autobyteus_org/autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts:process(...) [ASYNC]
    ├── parse external source metadata from message.metadata [STATE]
    ├── read context.state.activeTurnId (guaranteed by order: memory=900, binder=925) [STATE]
    └── /Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts:bindTurnToReceipt(...) [IO]
        └── /Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts:upsertTurnBinding(...) [IO] # create-on-miss avoids race with ingress receipt write order
```

### Branching / Error Paths

```text
[FALLBACK] non-external input
turn-receipt-binding-processor.ts:process(...)
└── no externalSource -> no-op
```

```text
[FALLBACK] receipt row not yet persisted by ingress flow
turn-receipt-binding-processor.ts:process(...)
└── bindTurnToReceipt uses upsert create-on-miss, so no lost correlation

[ERROR] activeTurnId missing
turn-receipt-binding-processor.ts:process(...)
└── log + skip bind (no throw)
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Publish Assistant Reply To Exact Source Route By Turn

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/llm-complete-response-received-event-handler.ts:handle(event, context)
└── /Users/normy/autobyteus_org/autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts:processResponse(...) [ASYNC]
    ├── read triggeringEvent.turnId [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/external-channel-reply-content-formatter.ts:format(response) [STATE]
    └── /Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReplyByTurn(...) [ASYNC]
        ├── channelMessageReceiptService.getSourceByAgentTurn(agentId, turnId) [IO]
        ├── channelBindingService.isRouteBoundToTarget(route, target) [IO]
        ├── callbackIdempotencyService.reserveCallbackKey(...) [IO]
        ├── deliveryEventService.recordPending(...) [IO]
        ├── /Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts:publish(envelope) [IO]
        └── deliveryEventService.recordSent(...) [IO]
```

### Branching / Error Paths

```text
[FALLBACK] source missing for turn
reply-callback-service.ts:publishAssistantReplyByTurn(...)
└── return SOURCE_NOT_FOUND (skip publish)
```

```text
[ERROR] callback network failure
reply-callback-service.ts:publishAssistantReplyByTurn(...)
├── deliveryEventService.recordFailed(...)
└── throw to processor log channel
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Concurrent Peers On One Agent Do Not Cross-Route

### Primary Runtime Call Stack

```text
[ENTRY] inbound from peerA -> bind turnA
[ENTRY] inbound from peerB -> bind turnB
[ASYNC] completion turnA -> getSourceByAgentTurn(agentId, turnA) -> routeA [IO]
[ASYNC] completion turnB -> getSourceByAgentTurn(agentId, turnB) -> routeB [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Binding Removed Before Completion Blocks Callback

### Primary Runtime Call Stack

```text
[ENTRY] completion for previously external turn
└── reply-callback-service.ts:publishAssistantReplyByTurn(...)
    ├── getSourceByAgentTurn(...) -> route resolved [IO]
    ├── isRouteBoundToTarget(route, agentId) -> false [IO]
    └── return BINDING_NOT_FOUND (skip publish)
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 5: Non-External/Internal Turns Skip Callback

### Primary Runtime Call Stack

```text
[ENTRY] completion for web/internal turn
└── external-channel-assistant-reply-processor.ts:processResponse(...)
    ├── turnId exists, but source lookup by turn returns null [IO]
    └── return SOURCE_NOT_FOUND
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 6: TEAM-Target Outbound Is Explicitly Gated (Phase 1)

### Primary Runtime Call Stack

```text
[ENTRY] completion for TEAM-routed turn
└── external-channel-assistant-reply-processor.ts:processResponse(...)
    ├── detect target scope unsupported for phase 1 [STATE]
    └── return TEAM_TARGET_NOT_SUPPORTED (no publish)
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes (expected skip behavior)
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 8: Mandatory External Processors Remove Per-Agent Setup Requirement

### Primary Runtime Call Stack

```text
[ENTRY] server startup
└── /Users/normy/autobyteus_org/autobyteus-server-ts/src/startup/agent-customization-loader.ts:loadAgentCustomizations(...)
    ├── register ExternalChannelTurnReceiptBindingProcessor (isMandatory=true) [STATE]
    └── register ExternalChannelAssistantReplyProcessor (isMandatory=true) [STATE]

[ENTRY] agent definition materialization
└── /Users/normy/autobyteus_org/autobyteus-server-ts/src/agent-definition/utils/processor-defaults.ts:mergeMandatoryAndOptional(...)
    ├── enumerate mandatory processors from registries [STATE]
    └── merge with optional processor lists (dedupe) [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 7: Completion Event Without TurnId Is Explicitly Skipped

### Primary Runtime Call Stack

```text
[ENTRY] completion event for assistant response where triggeringEvent.turnId is null
└── external-channel-assistant-reply-processor.ts:processResponse(...)
    ├── read triggeringEvent.turnId -> null [STATE]
    └── return TURN_ID_MISSING (no publish)
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes (expected skip behavior)
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
