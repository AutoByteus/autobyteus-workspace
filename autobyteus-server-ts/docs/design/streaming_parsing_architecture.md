# Streaming Parsing Architecture (TypeScript)

## Scope

Describes how provider stream output becomes canonical Agent events before
persistence, Team/application adaptation, and WebSocket projection.

## Building Blocks

- provider converters under `src/agent-execution/backends/*/events`
- `src/agent-execution/domain/agent-run.ts`
- `src/agent-execution/events/default-agent-run-event-pipeline.ts`
- `src/agent-execution/events/processors/segment-lifecycle`
- `src/agent-execution/events/processors/file-change`
- `src/agent-memory`
- `src/agent-team-execution/services/team-agent-event-adapter.ts`
- `src/services/agent-streaming`
- browser handlers under `autobyteus-web/services/agentStreaming`

## Pipeline

```text
provider-native event
  -> provider converter (minimal source AgentRunEvent)
  -> AgentRunEventDispatchQueue (one ordered lane per AgentRun)
  -> run-owned lifecycle transformers
  -> derived-event processors
  -> canonical listener fanout
       -> memory/raw traces/history
       -> file-change projection
       -> application producer
       -> stateless Team adaptation and strict Team wire projection
       -> standalone wire projection
  -> WebSocket presentation egress
  -> strict browser parser and state mutation
```

Providers do not emit application-facing Team identity or repair consumer state.
AutoByteus normalizes native `segment_id` once to internal `payload.id`; Codex
and Claude also reach the common boundary using `id`. Missing provider identity
stays missing and is rejected by common lifecycle admission; no runtime may
manufacture a fallback ID.

## Canonical Segment Boundary

Each `AgentRun` owns one live, non-persisted `AgentSegmentLifecycleState` keyed
by `{turnId,segmentId}`. The finite segment type is established by
`SEGMENT_START`. Provider content and end remain minimal; the first pipeline
transformer validates their exact source shape, derives the start-owned type
onto canonical content, and emits a type-less canonical end. Invalid lifecycle
input becomes `AGENT_SEGMENT_LIFECYCLE_INVALID` turn/runtime diagnostic evidence
and produces no segment mutation.

All post-pipeline consumers therefore receive only:

- start: exact ID, turn, finite type, optional JSON metadata;
- content: exact ID, turn, the admitted type, and delta; or
- end: exact ID, turn, terminal metadata, with no repeated type.

Turn completion/interruption, turn-terminal error, runtime-global terminal
error, offline/error status, and accepted AgentRun termination clear the
applicable live state. Partial lifecycle is not persisted or resumed.

## Derived Events And Persistence

`FILE_CHANGE` derivation is part of the canonical pipeline rather than a
WebSocket/tool-result side path. `RunFileChangeService` consumes derived events
for persistence. `RuntimeMemoryEventAccumulator` consumes exact canonical
segment and tool lifecycle events; it does not derive turn/segment identity,
synthesize missing starts, or recover text from end payloads.

Team Communication separately consumes accepted inter-Agent delivery events.
Its persisted projection stores exact `TeamExecutionAddress` sender/receiver
values and structured `reference_files`; natural prose is never scanned for
reference authority.

## Team And Browser Projection

A Team member handle verifies its real AgentRun binding and supplies one
`TeamAgentExecutionBinding`. `TeamAgentEventAdapter` is stateless: it maps
canonical Agent events and exact error evidence but performs no segment
correlation. The strict Team projector emits `agent_execution` plus the canonical
payload through `@autobyteus/team-stream-contracts`.

Standalone and Team browser handlers use the same compound turn/segment
identity. The stored identity retains canonical type, existing mutation requires
that type to agree, and typed canonical content can initialize a late subscriber.
Missing/unknown types, ID-only lookup, type defaults, serialized type-plus-ID
lookup keys, and consumer-side missing-start synthesis are not supported.

WebSocket content cadence is presentation-only. It coalesces adjacent content
only when every payload field except `delta` is deeply equal, preserving exact
execution, turn, segment, and type identity. Lifecycle, persistence, and other
subscribers remain unbuffered.
