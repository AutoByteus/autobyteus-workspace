# Agent Artifacts

## Scope

Current server-side ownership for the Artifacts tab's produced-file and
message-reference experiences.

The **Agent Artifacts** surface is backed by a derived `FILE_CHANGE` runtime
event plus the run-file-changes projection, not by published-artifact transport.

Message-reference surfaces are backed by a derived
`MESSAGE_FILE_REFERENCE_DECLARED` runtime event plus a canonical team-level
message-file-reference projection. The frontend presents these rows as
**Sent Artifacts** or **Received Artifacts** for the currently focused team
member. This is additive to inter-agent message display: raw paths in chat remain
normal text, and referenced content opens only through persisted team reference
identity.

## TS Source

- Agent Artifact runtime/projection:
  - `src/agent-execution/domain/agent-run-file-change.ts`
  - `src/agent-execution/domain/agent-run-file-change-path.ts`
  - `src/agent-execution/events/agent-run-event-pipeline.ts`
  - `src/agent-execution/events/default-agent-run-event-pipeline.ts`
  - `src/agent-execution/events/dispatch-processed-agent-run-events.ts`
  - `src/agent-execution/events/processors/file-change/file-change-event-processor.ts`
  - `src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts`
  - `src/agent-execution/events/processors/file-change/file-change-output-path.ts`
  - `src/agent-execution/events/processors/file-change/file-change-payload-builder.ts`
  - `src/services/run-file-changes/run-file-change-service.ts`
  - `src/services/run-file-changes/run-file-change-path-identity.ts`
  - `src/services/run-file-changes/run-file-change-projection-store.ts`
  - `src/run-history/services/run-file-change-projection-service.ts`
  - `src/api/graphql/types/run-file-changes.ts`
  - `src/api/rest/run-file-changes.ts`
- Message-reference runtime/projection:
  - `src/agent-execution/domain/agent-run-message-file-reference.ts`
  - `src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.ts`
  - `src/agent-execution/events/processors/message-file-reference/message-file-reference-paths.ts`
  - `src/agent-execution/events/processors/message-file-reference/message-file-reference-payload-builder.ts`
  - `src/agent-team-execution/services/publish-processed-team-agent-events.ts`
  - `src/services/message-file-references/message-file-reference-identity.ts`
  - `src/services/message-file-references/message-file-reference-service.ts`
  - `src/services/message-file-references/message-file-reference-projection-store.ts`
  - `src/services/message-file-references/message-file-reference-projection-service.ts`
  - `src/services/message-file-references/message-file-reference-content-service.ts`
  - `src/api/graphql/types/message-file-references.ts`
  - `src/api/rest/message-file-references.ts`
- Streaming transport:
  - `src/services/agent-streaming/agent-run-event-message-mapper.ts`
  - `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`
  - `src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`
  - `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
- Separate concern:
  - `src/agent-customization/processors/response-customization/media-url-transformer-processor.ts` (conversation media only; not the Artifacts tab owner)

## Current Responsibilities

- Run each normalized backend event batch through `AgentRunEventPipeline` once before subscriber fan-out.
- Let `FileChangeEventProcessor` derive the sole live Agent Artifact event, `FILE_CHANGE`.
- Let `MessageFileReferenceProcessor` derive `MESSAGE_FILE_REFERENCE_DECLARED` only from accepted `INTER_AGENT_MESSAGE` events that contain valid absolute local path candidates, including paths directly wrapped in common AI/Markdown delimiters.
- Process synthetic team-manager `INTER_AGENT_MESSAGE` events through the shared event pipeline before team fan-out via `publishProcessedTeamAgentEvents`, without moving extraction into `send_message_to` handlers.
- Normalize extracted message-reference paths by stripping adjacent wrapper characters from supported inline-code, emphasis/bold, Markdown link-target, blockquote, list, quote, and parenthesis contexts while still requiring a full absolute local path.
- Classify file mutations explicitly: Claude `Write`/`Edit`/`MultiEdit`/`NotebookEdit`, Codex `edit_file`, and AutoByteus `write_file`/`edit_file`.
- Classify generated outputs only for known generated-output tools (`generate_image`, `edit_image`, `generate_speech`, including the AutoByteus image/audio MCP forms) with explicit output-path semantics or known result paths.
- Keep read-only tool calls such as Claude `Read(file_path)` as tool/activity lifecycle only; generic unknown-tool `file_path` is not file-change evidence.
- Project `FILE_CHANGE` events into canonical run-scoped rows in `RunFileChangeService`.
- Project `MESSAGE_FILE_REFERENCE_DECLARED` events into canonical team-level rows in `MessageFileReferenceService`.
- Deduplicate message references by deterministic `teamRunId + senderRunId + receiverRunId + normalizedPath` identity, preserving `createdAt` and updating `updatedAt` on repeat declarations.
- Wait for pending same-team reference projection updates before active reads so immediate content opens can resolve newly declared references.
- Persist Agent Artifact metadata-only projection state to `<run-memory-dir>/file_changes.json`.
- Persist message-reference metadata-only projection state to `agent_teams/<teamRunId>/message_file_references.json` with atomic temp-file + rename writes.
- Hydrate active and historical Agent Artifact rows through `RunFileChangeProjectionService` and `getRunFileChanges(runId)`.
- Hydrate active and historical message references through `MessageFileReferenceProjectionService` and `getMessageFileReferences(teamRunId)`.
- Serve Agent Artifact bytes by `runId + canonical path` through `/runs/:runId/file-change-content`.
- Serve referenced bytes through `/team-runs/:teamRunId/message-file-references/:referenceId/content` only after resolving a persisted reference.
- Avoid filesystem existence or content checks while deriving references from message text; file IO occurs only when the referenced-content route opens a persisted reference.
- Emit concise `[message-file-reference]` diagnostics for accepted-message scans, metadata skips, projection insert/update, and content-resolution failures without logging full inter-agent message content by default.
- Keep published-artifact transport separate from the Artifacts tab; current clients depend on `FILE_CHANGE` and `MESSAGE_FILE_REFERENCE_DECLARED`, not on published-artifact events.
- Keep assistant-message media URL transformation separate from the Artifacts path via `MediaUrlTransformerProcessor`.

## Current Live Design

- **Agent Artifacts** are a run-scoped touched-file/output projection keyed by canonical path identity.
- Message-reference artifacts are a team-scoped projection keyed by deterministic `referenceId`.
- Runtime backends normalize provider events, then invoke the shared event pipeline before notifying subscribers.
- The pipeline owns both derived file-change semantics and derived message-reference semantics. `RunFileChangeService` only consumes `FILE_CHANGE`; `MessageFileReferenceService` only consumes `MESSAGE_FILE_REFERENCE_DECLARED`.
- Current filesystem bytes are the source of truth for committed previews.
- Referenced-file previews read current filesystem bytes by persisted `teamRunId + referenceId` identity. There is no supported raw-path-only content route for message references.
- Markdown/AI decoration around a path is parsing syntax only. It is not part of
  persisted path identity.
- Generated outputs use the same projection and preview route as text edits and writes.
- Persisted state stores metadata only; transient `content` exists only for live buffered `write_file` preview.
- `FILE_CHANGE` is a state-update stream, not an exact-one occurrence guarantee. `write_file` pre-available statuses are runtime-shaped and duplicate identical interim updates are acceptable when idempotent and followed by terminal state without duplicating projection rows.
- The only supported Agent Artifact persisted file is `<run-memory-dir>/file_changes.json`.
- The only supported message-reference persisted file is `agent_teams/<teamRunId>/message_file_references.json`.
- Member-scoped duplicate reference files, receiver-owned query/route shapes, and a single generic reference section are intentionally not supported.
- Legacy `run-file-changes/projection.json` is intentionally unsupported and hydrates no rows.

## Notes

If published-artifact transport changes again later, update the streaming protocol docs and runtime converters together.
History reconstruction should continue to come from run history and canonical file-change/message-reference metadata rather than by reviving a second artifact-persistence subsystem.
