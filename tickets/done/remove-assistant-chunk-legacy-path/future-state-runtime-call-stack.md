# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/remove-assistant-chunk-legacy-path/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/remove-assistant-chunk-legacy-path/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`
  - Ownership sections: `autobyteus-ts runtime`, `autobyteus-ts CLI`, `autobyteus-server-ts runtime conversion`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | `Primary End-to-End` | `autobyteus-ts` runtime + CLI | `Requirement` | `R-001`,`R-002`,`R-004` | N/A | Local runtime streams assistant output through segments only | Yes/N/A/Yes |
| `UC-002` | `DS-002` | `Primary End-to-End` | `autobyteus-server-ts` runtime bridge | `Requirement` | `R-003`,`R-004` | N/A | Server boundary and active tests stay segment-only | Yes/N/A/Yes |

## Transition Notes

- No temporary migration behavior is planned.
- The target state removes chunk compatibility branches instead of preserving a transition wrapper.

## Use Case: `UC-001` Local runtime streams assistant output through segments only

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts`
- Why This Use Case Matters To This Spine:
  - It proves the real live incremental path is `segment_event`, not a legacy chunk side channel.
- Why This Spine Span Is Long Enough:
  - It starts at the LLM streaming loop, crosses the notifier/bridge boundary, and ends at the human-visible CLI/team consumers.

### Goal

Emit and render assistant reasoning/content incrementally without any `ASSISTANT_CHUNK` event type.

### Preconditions

- A user turn is active.
- `LLMUserMessageReadyEventHandler` is handling a streaming response.

### Expected Outcome

- Incremental reasoning/content flows only through segment events.
- CLI/team consumers render from segment events plus the final complete response.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(...)
├── autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts:emitSegmentEvent(...)
├── autobyteus-ts/src/agent/events/notifiers.ts:notifyAgentSegmentEvent(...)
├── autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts:handleAgentEvent(...)
├── autobyteus-ts/src/cli/agent/cli-display.ts:handleStreamEvent(...) [STATE]
└── autobyteus-ts/src/cli/agent-team/widgets/focus-pane-history.ts:renderHistory(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if segment payload parsing fails
autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts:handleAgentEvent(...)
└── console.error(...) # event is dropped instead of reviving chunk compatibility
```

### State And Data Transformations

- `ChunkResponse` from `llmInstance.streamMessages(...)` -> `SegmentEvent` start/content/end payloads
- `SegmentEvent` -> `StreamEventType.SEGMENT_EVENT`
- `SEGMENT_EVENT` -> CLI/team rendering state buffers

### Observability And Debug Points

- `LLMUserMessageReadyEventHandler` logs streaming handler selection.
- `AgentEventStream` logs payload parsing errors.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: `UC-002` Server boundary and active tests stay segment-only

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-server-ts`
- Why This Use Case Matters To This Spine:
  - It keeps the server boundary aligned with the live segment contract and prevents dead chunk expectations from leaking back into tests or websocket messages.
- Why This Spine Span Is Long Enough:
  - It starts at incoming `StreamEvent`, crosses conversion into `AgentRunEvent`, and ends at websocket-contract assertions.

### Goal

Keep the active server/test surface segment-only after chunk type removal upstream.

### Preconditions

- The runtime bridge receives an autobyteus `StreamEvent`.

### Expected Outcome

- Segment events convert into `AgentRunEventType.SEGMENT_*`.
- Active `.ts` websocket tests assert `SEGMENT_CONTENT`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts:convert(...)
├── autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts:resolveSegmentEventType(...)
├── autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts:map(...)
├── autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:convertTeamRunEventToMessage(...)
└── autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts:streams team events and routes client messages(...)
```

### Branching / Fallback Paths

```text
[ERROR] if segment event type or turn id is invalid
autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts:convert(...)
└── return null
```

### State And Data Transformations

- `StreamEventType.SEGMENT_EVENT` -> `AgentRunEventType.SEGMENT_CONTENT` / `SEGMENT_START` / `SEGMENT_END`
- `AgentRunEvent` -> websocket `SEGMENT_CONTENT` message payload

### Observability And Debug Points

- Unit test coverage in `autobyteus-stream-event-converter.test.ts`
- Integration test coverage in `agent-team-websocket.integration.test.ts`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

