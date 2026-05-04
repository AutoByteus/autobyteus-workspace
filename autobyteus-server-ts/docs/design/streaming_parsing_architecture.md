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

Message-derived Sent/Received Artifacts use the same event-pipeline boundary but
a different owner. Accepted synthetic `INTER_AGENT_MESSAGE` events from team
managers pass through `MessageFileReferenceProcessor`, which appends
`MESSAGE_FILE_REFERENCE_DECLARED` metadata only when the event carries explicit
`payload.reference_files`. Message prose is not scanned for path candidates:
absolute paths mentioned only in `content`, Markdown decoration, frontend chat
rendering, and user clicks are not reference-declaration authorities. Explicit
reference paths are normalized and deduped before projection.
`MessageFileReferenceService` persists that metadata once per team run in
`agent_teams/<teamRunId>/message_file_references.json` and projects it as
focused-member sent/received views on the frontend. Recipient runtime input may
include one generated **Reference files:** block from the structured list, while
the original inter-agent message content remains natural and self-contained.
Runtime diagnostics for this path use the `[message-file-reference]` prefix and
log concise event-level metadata rather than full message content.
