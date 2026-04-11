# File Rendering and Media Pipeline (TypeScript)

## Scope

This document describes how media is served in `autobyteus-server-ts`, with a deliberate distinction between:

- managed app-media storage used for uploads and assistant-message media URLs
- run-scoped Artifacts previews that stream current filesystem bytes from indexed file changes

## Core Components

- Media storage service: `src/services/media-storage-service.ts`
- REST media routes: `src/api/rest/media.ts`
- File serving routes: `src/api/rest/files.ts`
- Upload endpoint: `src/api/rest/upload-file.ts`
- Assistant-message URL transformation:
  - `src/agent-customization/processors/response-customization/media-url-transformer-processor.ts`
- Run-scoped artifact preview route:
  - `src/api/rest/run-file-changes.ts`
- Run file change projection owners:
  - `src/services/run-file-changes/*`
  - `src/run-history/services/run-file-change-projection-service.ts`

## Storage Layout

Managed media is stored under `<app-data-dir>/media`:

- `images/`
- `audio/`
- `video/`
- `documents/`
- `others/`
- `ingested_context/`

`MediaStorageService` creates those directories on initialization.

Run-file-change metadata is stored separately under `<run-memory-dir>/file_changes.json`.
The actual artifact/output files remain where the runtime wrote them.

## URL / Serving Strategy

- Managed media URLs are based on `AppConfig.getBaseUrl()` and are typically served from `/rest/files/...`.
- Artifacts-tab previews do not require copied media URLs; they stream current bytes from `/runs/:runId/file-change-content?path=...` using run-scoped indexed path resolution.

## Request Flows

### Managed media / assistant-message flow

1. A file arrives via upload or another managed media path.
2. File category and destination are resolved.
3. The physical file is persisted in the app-data media directory.
4. API responses or response customization return a URL pointing to `/rest/files/...`.

### Run-scoped artifact preview flow

1. A runtime writes/edits a file or produces an output path.
2. `RunFileChangeService` indexes the canonical path and type in the run-scoped projection.
3. The frontend requests `/runs/:runId/file-change-content?path=...`.
4. The server streams the current bytes directly from the filesystem if the indexed file still exists.

## Operational Notes

- Conversation media transformation and Artifacts-tab preview serving are intentionally separate concerns.
- Artifacts preview depends on run-indexed paths, not arbitrary filesystem reads.
- Legacy tool-result media-copy processors are no longer part of the Artifacts path.
- Missing current files return an honest `404` from the run-scoped route instead of stale copied media.
