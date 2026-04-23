# Artifact File Serving Design (TypeScript)

## Scope

Covers the current Artifacts-tab serving design.
The active runtime uses the run-file-changes subsystem as the only supported server-side source for touched files and generated outputs.

## Relevant TS Modules

- Live projection owner:
  - `src/services/run-file-changes/run-file-change-service.ts`
  - `src/services/run-file-changes/run-file-change-path-identity.ts`
  - `src/services/run-file-changes/run-file-change-invocation-cache.ts`
- Persistence and historical reads:
  - `src/services/run-file-changes/run-file-change-projection-store.ts`
  - `src/run-history/services/run-file-change-projection-service.ts`
- API boundaries:
  - `src/api/graphql/types/run-file-changes.ts`
  - `src/api/rest/run-file-changes.ts`
- Streaming transport:
  - `src/services/agent-streaming/agent-run-event-message-mapper.ts`

## High-Level Flow

1. Agent-run lifecycle, segment, and tool events enter `RunFileChangeService`.
2. The service canonicalizes path identity, buffers transient `write_file` content, and discovers generated outputs from invocation context plus success payloads.
3. The service emits `FILE_CHANGE_UPDATED` and persists metadata-only state to `<run-memory-dir>/file_changes.json`.
4. The frontend hydrates rows through `getRunFileChanges(runId)` and continues live updates from `FILE_CHANGE_UPDATED`.
5. The viewer fetches `/runs/:runId/file-change-content?path=...` to stream the current file bytes.

## Live Event Semantics

### `FILE_CHANGE_UPDATED`

This is the authoritative Artifacts-area event.
It carries the canonical path, type, status, source tool, timestamps, and optional transient `content` for live `write_file` preview.

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
- live `write_file` preview remains available
- generated media/document outputs share the same list and preview boundary as file changes
- reopen/history still works from metadata while previews use current filesystem bytes
- legacy-only runs are unsupported by design and behavior

## Removed / Non-Authoritative Paths

The following are no longer the active Artifacts-tab serving path:

- tool-result processors that copied media or emitted artifact events for the Artifacts tab
- `/workspaces/:workspaceId/content` as the Artifacts viewer boundary
- copied media-storage URLs as the primary artifact preview source
- `run-file-changes/projection.json` compatibility hydration
