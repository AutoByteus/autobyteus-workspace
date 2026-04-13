# Agent Artifacts

## Scope

Current server-side ownership for the Artifacts tab's touched-file and generated-output experience.
The active Artifacts surface is backed by the run-file-changes subsystem, not by a separate persisted-artifact query path.

## TS Source

- `src/services/run-file-changes/run-file-change-service.ts`
- `src/services/run-file-changes/run-file-change-path-identity.ts`
- `src/services/run-file-changes/run-file-change-invocation-cache.ts`
- `src/services/run-file-changes/run-file-change-projection-store.ts`
- `src/run-history/services/run-file-change-projection-service.ts`
- `src/api/graphql/types/run-file-changes.ts`
- `src/api/rest/run-file-changes.ts`
- `src/services/agent-streaming/agent-run-event-message-mapper.ts`
- `src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-turn-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
- `src/agent-customization/processors/response-customization/media-url-transformer-processor.ts` (conversation media only; not the Artifacts tab owner)

## Current Responsibilities

- normalize `write_file`, `edit_file`, and generated-output signals into one canonical run-scoped row model
- emit `FILE_CHANGE_UPDATED` as the authoritative live Artifacts event
- persist metadata-only projection state to `<run-memory-dir>/file_changes.json`
- hydrate active and historical rows through `RunFileChangeProjectionService` and `getRunFileChanges(runId)`
- serve current file bytes by `runId + canonical path` through `/runs/:runId/file-change-content`
- keep `ARTIFACT_PERSISTED` / `ARTIFACT_UPDATED` only as compatibility/off-spine transport noise where some runtimes still emit them; current clients do not depend on them
- keep assistant-message media URL transformation separate from the Artifacts path via `MediaUrlTransformerProcessor`

## Current Live Design

- The Artifacts tab is a run-scoped touched-file/output projection keyed by canonical path identity.
- Current filesystem bytes are the source of truth for committed previews.
- Generated outputs use the same projection and preview route as text edits and writes.
- Persisted state stores metadata only; transient `content` exists only for live buffered `write_file` preview.
- The only supported persisted file is `<run-memory-dir>/file_changes.json`.
- Legacy `run-file-changes/projection.json` is intentionally unsupported and hydrates no rows.

## Notes

If `ARTIFACT_*` compatibility events are removed later, update the streaming protocol docs and runtime converters together.
History reconstruction should continue to come from run history and canonical file-change metadata rather than by reviving a second artifact-persistence subsystem.
