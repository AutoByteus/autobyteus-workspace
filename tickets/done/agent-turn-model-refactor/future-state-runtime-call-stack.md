# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-subsystem loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v4`
- Requirements: `tickets/done/agent-turn-model-refactor/requirements.md` (status `Refined`)
- Source Artifact:
  - `Medium/Large`: `tickets/done/agent-turn-model-refactor/proposed-design.md`
- Source Design Version: `v4`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`, `DS-004`
  - Ownership sections: `Ownership Map`, `Ownership-Driven Dependency Rules`, `File Responsibility Draft`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.
- Every use case declares which spine(s) it exercises from the approved design basis.
- `Primary End-to-End` in this document means the primary top-level business spine for that use case.
- `Spine Span Sufficiency Rule` is satisfied by showing the initiating runtime surface, the authoritative owner boundary, and the meaningful downstream consequence for each primary use case.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `AgentTurn` | Requirement | R-001, R-003 | N/A | Start And Persist One Outer Agent Turn | Yes/Yes/Yes |
| UC-002 | DS-002 | Primary End-to-End | `AgentTurn` + `ToolInvocationBatch` | Requirement | R-002, R-003 | N/A | Start One Inner Tool Invocation Batch | Yes/Yes/Yes |
| UC-003 | DS-004 | Bounded Local | `ToolInvocationBatch` | Requirement | R-002 | N/A | Settle Tool Results Through The Active Batch | Yes/Yes/Yes |
| UC-004 | DS-003 | Return-Event | segment-event emission boundary | Requirement | R-004 | N/A | Emit Segment Events With Outer Agent Turn Identity | Yes/Yes/Yes |

## Transition Notes

- Temporary migration behavior needed to reach target state:
  - implementation needs one coordinated cleanup wave across runtime state, event models, stream payloads, tests, docs, and the touched downstream `autobyteus-server-ts` consumers
  - no alias layer is designed; the target contract stays on canonical `turnId` / `turn_id`
  - segment producers now receive `turnId` up front so segment events are complete at construction time
- Retirement plan for temporary logic (if any):
  - no dual-path runtime behavior is designed; the target state is clean-cut

## Use Case: UC-001 [Start And Persist One Outer Agent Turn]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentTurn`
- Why This Use Case Matters To This Spine:
  - it establishes the outer turn as an explicit runtime aggregate rather than a loose string field
- Why This Spine Span Is Long Enough:
  - it begins at user input, crosses the runtime ownership boundary, and ends at persisted memory trace plus active runtime state

### Goal

Create one explicit outer `AgentTurn` for a user-originated interaction and use it as the runtime identity for subsequent LLM/tool phases.

### Preconditions

- agent runtime is initialized
- `context.state.memoryManager` is available
- `context.state.activeTurn` is `null` or complete

### Expected Outcome

- one new `AgentTurn` exists on runtime state
- the user message is ingested into memory with the new outer-turn identity
- the same turn remains active for later tool/assistant phases

### Primary Runtime Call Stack

```text
[ENTRY] src/agent/input-processor/memory-ingest-input-processor.ts:process(message, context, sourceEvent)
├── src/memory/memory-manager.ts:startTurn() [STATE]  # outer-turn creation returns the canonical turn id
├── src/agent/agent-turn.ts:create(turnId) [STATE]
├── src/agent/context/agent-runtime-state.ts:setActiveTurn(agentTurn) [STATE]
├── src/agent/agent-turn.ts:nextSeq() [STATE]
└── src/memory/memory-manager.ts:ingestUserMessage(llmUserMessage, turnId, seq, sourceEvent) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the message sender is TOOL and the active turn already exists
src/agent/input-processor/memory-ingest-input-processor.ts:process(...)
└── return existing message without creating a new AgentTurn
```

```text
[ERROR] if memory manager is unavailable
src/agent/input-processor/memory-ingest-input-processor.ts:process(...)
└── return message unchanged
```

### State And Data Transformations

- `AgentInputUserMessage` -> `LLMUserMessage`
- generated outer-turn ID -> `AgentTurn`
- `AgentTurn.nextSeq()` -> persisted trace sequence

### Observability And Debug Points

- logs emitted at new-turn creation
- debug logs emitted at user-trace ingestion

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- whether `startTurn()` remains on `MemoryManager` or moves to a dedicated `TurnIdTracker`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Start One Inner Tool Invocation Batch]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentTurn`
- Why This Use Case Matters To This Spine:
  - it shows the inner grouped tool batch as a child of the outer turn instead of a parallel turn concept
- Why This Spine Span Is Long Enough:
  - it begins at streamed LLM output, crosses the authoritative outer-turn boundary, and ends at enqueued invocation requests with explicit outer-turn identity

### Goal

Create one `ToolInvocationBatch` inside the active `AgentTurn` when the LLM response emits grouped tool invocations.

### Preconditions

- an active `AgentTurn` already exists on runtime state
- the LLM handler parsed one or more tool invocations from the stream

### Expected Outcome

- the active turn owns a new active tool batch
- each invocation in the batch carries the outer `turnId`
- memory ingests tool intents under the same outer turn

### Primary Runtime Call Stack

```text
[ENTRY] src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(event, context)
├── src/agent/context/agent-runtime-state.ts:getRequiredActiveTurn() [STATE]
├── src/agent/streaming/handlers/streaming-response-handler.ts:getAllInvocations() [STATE]
├── src/agent/agent-turn.ts:startToolInvocationBatch(toolInvocations) [STATE]
│   └── src/agent/tool-invocation-batch.ts:create(batchId, turnId, toolInvocations) [STATE]
├── src/agent/agent-turn.ts:nextSeq() [STATE]
├── src/memory/memory-manager.ts:ingestToolIntents(toolInvocations, turnId, startingSeq) [IO]
└── src/agent/events/agent-input-event-queue-manager.ts:enqueueToolInvocationRequest(PendingToolInvocationEvent) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if no tool invocations are parsed
src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(...)
└── skip batch creation and continue assistant completion path
```

```text
[ERROR] if parsed invocations disagree on outer-turn identity
src/agent/agent-turn.ts:startToolInvocationBatch(...)
└── throw invariant error before queueing any invocation
```

### State And Data Transformations

- parsed tool invocations -> `ToolInvocationBatch`
- outer `AgentTurn` identity -> each invocation `turnId`
- invocation list -> memory tool-call traces

### Observability And Debug Points

- log emitted when a new batch starts inside an outer turn
- log emitted when tool intents are persisted under that turn

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- whether batch identity should be a generated `batchId` string or a monotonic per-turn batch index

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Settle Tool Results Through The Active Batch]

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Bounded Local`
- Governing Owner: `ToolInvocationBatch`
- Why This Use Case Matters To This Spine:
  - it names the batch-internal settlement loop explicitly and prevents that loop from masquerading as an outer turn
- Why This Spine Span Is Long Enough:
  - it covers the whole batch-internal path from one result event to completion release
- If `Spine Scope = Bounded Local`, Parent Owner:
  - `AgentTurn`

### Goal

Record tool results against the active batch, reject mismatched results, and release grouped continuation when the batch is complete.

### Preconditions

- active `AgentTurn` exists
- active `ToolInvocationBatch` exists on that turn
- incoming tool result includes `turnId` or can inherit it from the active turn

### Expected Outcome

- valid results settle into the active batch in invocation order
- mismatched or unknown results do not corrupt completion
- continuation releases only when the batch is complete

### Primary Runtime Call Stack

```text
[ENTRY] src/agent/handlers/tool-result-event-handler.ts:handle(event, context)
├── src/agent/context/agent-runtime-state.ts:getRequiredActiveTurn() [STATE]
├── src/agent/agent-turn.ts:getRequiredActiveToolInvocationBatch() [STATE]
├── src/agent/tool-invocation-batch.ts:accepts(result.toolInvocationId, result.turnId) [STATE]
├── src/agent/tool-invocation-batch.ts:settleResult(result) [STATE]
├── src/agent/handlers/tool-result-event-handler.ts:emitTerminalLifecycle(result, context)
├── src/agent/tool-invocation-batch.ts:isComplete() [STATE]
└── src/agent/handlers/tool-result-event-handler.ts:dispatchResultsToInputPipeline(batch.getOrderedSettledResults(), context) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if there is no active batch but the result is a late duplicate
src/agent/handlers/tool-result-event-handler.ts:handle(...)
└── drop the result via recent-settled cache
```

```text
[ERROR] if the incoming result carries a different outer-turn identity
src/agent/tool-invocation-batch.ts:accepts(...)
└── reject settlement and return without progressing completion
```

### State And Data Transformations

- incoming `ToolResultEvent` -> normalized `turnId`
- result -> batch settlement record
- ordered settled results -> aggregated tool continuation message

### Observability And Debug Points

- warnings emitted for duplicate, unknown, or turn-mismatched results
- lifecycle events emitted for terminal result states

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- whether `AgentTurn` should expose a one-step `settleToolResult(result)` convenience method or keep batch settlement explicit in the handler

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Emit Segment Events With Outer Agent Turn Identity]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Return-Event`
- Governing Owner: segment-event emission boundary in `LLMUserMessageReadyEventHandler`
- Why This Use Case Matters To This Spine:
  - the user explicitly wants every segment event to belong to one outer agent turn and expose that identity
- Why This Spine Span Is Long Enough:
  - it begins at segment creation and ends at typed stream payload delivery to consumers, including the touched frontend protocol types

### Goal

Ensure every emitted segment event carries required outer-turn identity from construction time without making the parser or streaming handler own turn lifecycle state.

### Preconditions

- active `AgentTurn` exists
- one segment event has been produced by reasoning emission or a streaming handler callback

### Expected Outcome

- outbound segment payload contains required `turn_id`
- stream consumers can correlate all segment events to the outer turn directly
- the touched frontend segment payload types also declare `turn_id` explicitly, so the live-stream contract stays symmetric with the backend
- parser internals remain turn-lifecycle-agnostic even though segment producers receive the turn id as input

### Primary Runtime Call Stack

```text
[ENTRY] src/agent/handlers/llm-user-message-ready-event-handler.ts:emitSegmentEvent(segmentEvent)
├── src/agent/streaming/segments/segment-events.ts:toDict() [STATE]  # segmentEvent already carries turn_id from construction
├── src/agent/events/notifiers.ts:notifyAgentSegmentEvent(segmentEvent.toDict()) [ASYNC]
├── src/agent/streaming/streams/agent-event-stream.ts:handleInternalEvent(eventEnvelope)
├── src/agent/streaming/events/stream-event-payloads.ts:createSegmentEventData(payload) [STATE]
├── autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts:map(event) [ASYNC]
├── autobyteus-web/services/agentStreaming/protocol/messageParser.ts:parseServerMessage(raw) [ASYNC]
└── autobyteus-web/services/agentStreaming/protocol/messageTypes.ts:SegmentStartPayload|SegmentContentPayload|SegmentEndPayload [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if notifier is unavailable
src/agent/handlers/llm-user-message-ready-event-handler.ts:emitSegmentEvent(...)
└── return without emitting, while keeping runtime turn state unchanged
```

```text
[ERROR] if a segment payload reaches the stream layer without `turn_id`
src/agent/streaming/events/stream-event-payloads.ts:createSegmentEventData(...)
└── reject payload as incomplete for the target contract
```

### State And Data Transformations

- runtime turn id -> constructed `SegmentEvent` with required `turn_id`
- constructed event -> serialized outbound payload with `turn_id`
- outbound payload -> typed `SegmentEventData`
- frontend websocket payload -> typed segment payload that still exposes `turn_id`

### Observability And Debug Points

- segment debug logs include `segment_id`, `segment_type`, and `turn_id`
- stream consumer logs can group segments by outer turn directly
- frontend debug logs can print `turn_id` without depending on untyped passthrough payloads

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- none

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
