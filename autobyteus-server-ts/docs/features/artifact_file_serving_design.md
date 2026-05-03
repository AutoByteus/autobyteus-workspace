# Artifact File Serving Design (TypeScript)

## Scope

Covers the current Artifacts-tab serving design.
The active runtime uses the derived `FILE_CHANGE` event plus the run-file-changes projection as the only supported server-side source for touched files and generated outputs.

## Relevant TS Modules

- Runtime derivation:
  - `src/agent-execution/domain/agent-run-file-change.ts`
  - `src/agent-execution/domain/agent-run-file-change-path.ts`
  - `src/agent-execution/events/agent-run-event-pipeline.ts`
  - `src/agent-execution/events/default-agent-run-event-pipeline.ts`
  - `src/agent-execution/events/dispatch-processed-agent-run-events.ts`
  - `src/agent-execution/events/processors/file-change/file-change-event-processor.ts`
  - `src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts`
  - `src/agent-execution/events/processors/file-change/file-change-output-path.ts`
  - `src/agent-execution/events/processors/file-change/file-change-payload-builder.ts`
- Live projection owner:
  - `src/services/run-file-changes/run-file-change-service.ts`
  - `src/services/run-file-changes/run-file-change-path-identity.ts`
- Persistence and historical reads:
  - `src/services/run-file-changes/run-file-change-projection-store.ts`
  - `src/run-history/services/run-file-change-projection-service.ts`
- API boundaries:
  - `src/api/graphql/types/run-file-changes.ts`
  - `src/api/rest/run-file-changes.ts`
- Streaming transport:
  - `src/services/agent-streaming/agent-run-event-message-mapper.ts`

## High-Level Flow

1. Runtime backends convert provider events into normalized `AgentRunEvent` batches.
2. `AgentRunEventPipeline` processes each batch once before subscriber fan-out.
3. `FileChangeEventProcessor` derives `FILE_CHANGE` only for explicit file mutations or known generated-output tools (`generate_image`, `edit_image`, `generate_speech`, including the AutoByteus image/audio MCP forms).
4. `RunFileChangeService` consumes `FILE_CHANGE`, canonicalizes path identity, and updates the run projection.
5. The service persists metadata-only state to `<run-memory-dir>/file_changes.json`.
6. The frontend hydrates rows through `getRunFileChanges(runId)` and continues live updates from `FILE_CHANGE`.
7. The viewer fetches `/runs/:runId/file-change-content?path=...` to stream the current file bytes.

## Live Event Semantics

### `FILE_CHANGE`

This is the authoritative Artifacts-area event.
It carries the canonical path, type, status, source tool, timestamps, and optional transient `content` for live `write_file` preview.

`FileChangeEventProcessor` is the only owner of derived file-change semantics. It recognizes known mutation tools and known generated-output tools with explicit output path semantics. Current generated-output tools are `generate_image`, `edit_image`, `generate_speech`, and their AutoByteus image/audio MCP-prefixed forms; unknown tools with generic `file_path`/`filePath` fields remain lifecycle/activity events only.

### Published-artifact transport

Published-artifact events may still exist for application/runtime consumers, but the current Artifacts tab does not depend on them.
They are not the authoritative serving path for changed files.

## Source Of Truth

### Listing / reopen

- Active runs read from the in-memory `RunFileChangeService` projection.
- Historical runs read normalized metadata from `<run-memory-dir>/file_changes.json`.

### Preview bytes

- `GET /runs/:runId/file-change-content?path=<canonical-path>`
- The route resolves the indexed canonical path back to an absolute path and streams the current bytes from disk.
- `404` means the row is not indexed or the current file no longer exists.
- `409` means an active-run row exists but the final file is not yet present on disk.

### Conversation media

Assistant-message media URL transformation remains a separate concern handled by response customization and media storage.
It is not the Artifacts tab source of truth.

## Durable Storage

```text
<run-memory-dir>/file_changes.json
```

- metadata only; no committed content snapshots
- transient `content` is stripped before persistence
- no fallback to `run-file-changes/projection.json`

## Current Guarantees

- one row per canonical path
- live `write_file` preview remains available through `FILE_CHANGE` content updates
- `FILE_CHANGE` is a state-update stream. Pre-available updates are runtime-shaped: AutoByteus live runs may emit `streaming` then `available` without a separate `pending` row, while other runtimes may emit `pending` before `available`; duplicate identical interim `streaming`/`pending` updates are acceptable when idempotent, terminal state follows, and the final projection remains one row per canonical path.
- known generated image/audio outputs share the same list and preview boundary as file changes
- reopen/history still works from metadata while previews use current filesystem bytes
- legacy-only runs are unsupported by design and behavior

## Removed / Non-Authoritative Paths

The following are no longer the active Artifacts-tab serving path:

- `RunFileChangeService` derivation from generic segment/tool/denial events
- tool-result processors that copied media or emitted artifact events for the Artifacts tab
- `/workspaces/:workspaceId/content` as the Artifacts viewer boundary
- copied media-storage URLs as the primary artifact preview source
- `run-file-changes/projection.json` compatibility hydration
