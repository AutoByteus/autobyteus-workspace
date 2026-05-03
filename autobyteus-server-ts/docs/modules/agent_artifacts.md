# Agent Artifacts

## Scope

Current server-side ownership for the Artifacts tab's touched-file and generated-output experience.
The active Artifacts surface is backed by a derived `FILE_CHANGE` runtime event plus the run-file-changes projection, not by published-artifact transport.

## TS Source

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
- `src/services/agent-streaming/agent-run-event-message-mapper.ts`
- `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`
- `src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`
- `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
- `src/agent-customization/processors/response-customization/media-url-transformer-processor.ts` (conversation media only; not the Artifacts tab owner)

## Current Responsibilities

- run each normalized backend event batch through `AgentRunEventPipeline` once before subscriber fan-out
- let `FileChangeEventProcessor` derive the sole live Artifacts event, `FILE_CHANGE`
- classify file mutations explicitly: Claude `Write`/`Edit`/`MultiEdit`/`NotebookEdit`, Codex `edit_file`, and AutoByteus `write_file`/`edit_file`
- classify generated outputs only for known generated-output tools with explicit output-path semantics or known result paths
- keep read-only tool calls such as Claude `Read(file_path)` as tool/activity lifecycle only; generic unknown-tool `file_path` is not file-change evidence
- project `FILE_CHANGE` events into canonical run-scoped rows in `RunFileChangeService`
- persist metadata-only projection state to `<run-memory-dir>/file_changes.json`
- hydrate active and historical rows through `RunFileChangeProjectionService` and `getRunFileChanges(runId)`
- serve current file bytes by `runId + canonical path` through `/runs/:runId/file-change-content`
- keep published-artifact transport separate from the Artifacts tab; current clients depend on `FILE_CHANGE`, not on published-artifact events
- keep assistant-message media URL transformation separate from the Artifacts path via `MediaUrlTransformerProcessor`

## Current Live Design

- The Artifacts tab is a run-scoped touched-file/output projection keyed by canonical path identity.
- Runtime backends normalize provider events, then invoke the shared event pipeline before notifying subscribers.
- The pipeline owns derived file-change semantics; `RunFileChangeService` only consumes `FILE_CHANGE` and maintains projection/persistence/hydration state.
- Current filesystem bytes are the source of truth for committed previews.
- Generated outputs use the same projection and preview route as text edits and writes.
- Persisted state stores metadata only; transient `content` exists only for live buffered `write_file` preview.
- The only supported persisted file is `<run-memory-dir>/file_changes.json`.
- Legacy `run-file-changes/projection.json` is intentionally unsupported and hydrates no rows.

## Notes

If published-artifact transport changes again later, update the streaming protocol docs and runtime converters together.
History reconstruction should continue to come from run history and canonical file-change metadata rather than by reviving a second artifact-persistence subsystem.
