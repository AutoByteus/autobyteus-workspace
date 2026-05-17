# Streaming Parsing Architecture (TypeScript)

## Scope

Describes how streaming model output is parsed and transformed before being persisted and emitted.

## Building Blocks

- Runtime streaming handlers:
  - `src/services/agent-streaming/agent-stream-handler.ts`
  - `src/services/agent-streaming/agent-team-stream-handler.ts`
- Processor pipeline registration:
  - `src/startup/agent-customization-loader.ts`
- Parser and formatter dependencies from `autobyteus-ts`.

## Pipeline

1. User message enters runtime manager.
2. Input processors apply transformations.
3. Model stream events are parsed.
4. Tool invocation/result processors may transform application/runtime artifacts.
5. Response processors persist/normalize outbound content.
6. Transport layer emits stream chunks and completion events.

The run-scoped web Artifacts tab is intentionally separate from this
customization pipeline: runtime adapters first emit base normalized
`AgentRunEvent` batches, then `AgentRunEventPipeline` appends derived
`FILE_CHANGE` events for explicit write/edit/generated-output semantics before
subscriber fan-out. `RunFileChangeService` consumes those `FILE_CHANGE` events
for projection/persistence instead of deriving artifacts from generic
tool-result processors.

Native AutoByteus team events follow the same pipeline boundary. The
AutoByteus team backend owns one native event bridge per active team run,
converts/enriches each native member event once, runs that event through the
pipeline, and only then fans the processed source/derived events out to all
server subscribers. This preserves stateful file-change ordering for
`write_file` events and avoids duplicate derivation when multiple websocket/API
subscribers are attached.

Nested mixed-team events use the same processed-event boundary but prefix child
team events with the parent subteam member path before fan-out. The canonical
source identity is `TeamRunEvent.sourcePath`; the WebSocket transport derives
`source_route_key` from that path and may include the deprecated
`sub_team_node_name` only as a display alias. Downstream processors and
projections must use path/route identity, not the one-segment alias, when
attributing nested leaf output.

Team Communication references use the accepted `INTER_AGENT_MESSAGE` as
processor input. The raw message payload carries `message_id`, sender/receiver
identity, natural `content`, `message_type`, and structured reference metadata
from explicit `payload.reference_files`. Message prose is not scanned for path
candidates: absolute paths mentioned only in `content`, Markdown decoration,
frontend chat rendering, and user clicks are not reference-declaration
authorities. `TeamCommunicationMessageProcessor` emits one normalized
`TEAM_COMMUNICATION_MESSAGE` event per accepted message, and
`TeamCommunicationService` persists those derived events once per team run in
`agent_teams/<teamRunId>/team_communication_messages.json`. The persisted
message stores sender and receiver `memberKind`, `memberPath`,
`memberRouteKey`, and optional `representedSubTeam` metadata. Parent-to-
representative messages can therefore display the represented subteam while
projecting the actual leaf recipient path, and upward child-to-parent reports
can display the child representative's subteam without inventing a reply alias.
The frontend
projects focused-member sent/received message views in the Team tab from
`TEAM_COMMUNICATION_MESSAGE`, while raw `INTER_AGENT_MESSAGE` remains the
conversation display source. Recipient runtime input may include one generated
**Reference files:** block from the structured list, while the original
inter-agent message content remains natural and self-contained. Runtime
diagnostics for this path use the `[team-communication]` prefix and log concise
event-level metadata rather than full message content.
