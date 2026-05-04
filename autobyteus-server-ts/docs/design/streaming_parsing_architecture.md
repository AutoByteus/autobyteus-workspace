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
`MESSAGE_FILE_REFERENCE_DECLARED` metadata for valid absolute local path
candidates. The processor tolerates common AI/Markdown decoration directly
around the absolute path, such as inline code, emphasis/bold, Markdown links,
blockquote/list context, quotes, and parentheses, and persists the unwrapped
normalized path. `MessageFileReferenceService` persists that metadata once per
team run in `agent_teams/<teamRunId>/message_file_references.json` and projects
it as focused-member sent/received views on the frontend. This keeps reference
creation out of `send_message_to` handlers and out of frontend chat rendering;
raw paths in inter-agent messages remain normal text. Runtime diagnostics for
this path use the `[message-file-reference]` prefix and log concise event-level
metadata rather than full message content.
