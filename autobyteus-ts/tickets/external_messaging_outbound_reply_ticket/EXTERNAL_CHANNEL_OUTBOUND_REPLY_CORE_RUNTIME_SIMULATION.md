# Simulated Runtime Call Stacks (External Channel Outbound Reply Core - autobyteus-ts)

## Conventions
- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags: `[ENTRY] [ASYNC] [STATE] [IO] [FALLBACK] [ERROR]`

## Simulation Basis
- Scope Classification: `Medium`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-ts/tickets/external_messaging_outbound_reply_ticket/EXTERNAL_CHANNEL_OUTBOUND_REPLY_CORE_DESIGN.md`

## Use Case Index
- Use Case 1: Completion event carries deterministic turn id.
- Use Case 2: Missing turn context degrades safely.

---

## Use Case 1: Completion Event Carries Deterministic Turn Id

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(event, context)
├── resolve activeTurnId from context.state [STATE]
├── streamMessages(...) [ASYNC]
├── build CompleteResponse [STATE]
└── /Users/normy/autobyteus_org/autobyteus-ts/src/agent/events/agent-events.ts:new LLMCompleteResponseReceivedEvent(completeResponse, false, activeTurnId)
    └── enqueueInternalSystemEvent(...) [ASYNC]
```

### Branching / Error Paths

```text
[ERROR] stream failure
...llm-user-message-ready-event-handler.ts:catch(error)
└── new LLMCompleteResponseReceivedEvent(errorResponse, true, activeTurnId)
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Missing Turn Context Degrades Safely

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(...)
├── activeTurnId resolves to null [STATE]
└── enqueue LLMCompleteResponseReceivedEvent(..., turnId=null) [ASYNC]
```

### Fallback Path

```text
[FALLBACK] downstream processor requires turn id
Server-side processor checks null and skips callback publish.
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
