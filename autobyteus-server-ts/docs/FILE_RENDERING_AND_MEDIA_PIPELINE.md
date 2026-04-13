# File Rendering and Media Pipeline (TypeScript)

## Scope

This document describes how file/media bytes are served in `autobyteus-server-ts`, with a deliberate distinction between:

- managed app-media storage used for uploads and assistant-message media URLs
- run-scoped browser-uploaded context files that stage under draft ownership and finalize into run/member-owned storage
- run-scoped Artifacts previews that stream current filesystem bytes from indexed file changes

## Core Components

- Media storage service: `src/services/media-storage-service.ts`
- REST media routes: `src/api/rest/media.ts`
- File serving routes: `src/api/rest/files.ts`
- Upload endpoint: `src/api/rest/upload-file.ts`
- Context-file REST routes: `src/api/rest/context-files.ts`
- Context-file storage/services:
  - `src/context-files/store/context-file-layout.ts`
  - `src/context-files/services/context-file-upload-service.ts`
  - `src/context-files/services/context-file-finalization-service.ts`
  - `src/context-files/services/context-file-read-service.ts`
  - `src/context-files/services/context-file-local-path-resolver.ts`
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

Browser-uploaded composer attachments use the dedicated context-file layout instead:

- draft uploads live under `<app-data-dir>/draft_context_files/.../context_files/<storedFilename>`
- finalized standalone uploads live under `<memory-dir>/agents/<runId>/context_files/<storedFilename>`
- finalized team-member uploads live under `<memory-dir>/agent_teams/<teamRunId>/members/<memberRunId>/context_files/<storedFilename>`

Run-file-change metadata is stored separately under `<run-memory-dir>/file_changes.json`.
The actual artifact/output files remain where the runtime wrote them.

## URL / Serving Strategy

- Managed media URLs are based on `AppConfig.getBaseUrl()` and are typically served from `/rest/files/...`.
- Draft uploaded context files are served from `/rest/drafts/.../context-files/:storedFilename` until send-time finalization.
- Finalized uploaded context files are served from `/rest/runs/:runId/context-files/:storedFilename` or `/rest/team-runs/:teamRunId/members/:memberRouteKey/context-files/:storedFilename`.
- The finalize request accepts `attachments[{ storedFilename, displayName }]` so the user-visible filename survives any storage-safe `storedFilename` normalization.
- Artifacts-tab previews do not require copied media URLs; they stream current bytes from `/runs/:runId/file-change-content?path=...` using run-scoped indexed path resolution.

## Request Flows

### Managed media / assistant-message flow

1. A file arrives via upload or another managed media path.
2. File category and destination are resolved.
3. The physical file is persisted in the app-data media directory.
4. API responses or response customization return a URL pointing to `/rest/files/...`.

### Composer uploaded context-file flow

1. The browser uploads a file to `/rest/context-files/upload` with an explicit draft-owner descriptor.
2. `ContextFileUploadService` writes the bytes under the draft context-file tree and returns an uploaded descriptor with `storedFilename`, `displayName`, `locator`, and `phase='draft'`.
3. The send owner creates or restores the final run/team-member identity, then posts `/rest/context-files/finalize` with `attachments[{ storedFilename, displayName }]`.
4. `ContextFileFinalizationService` moves the bytes into run/member-owned `context_files/`, returns final locators, and preserves the original uploaded `displayName` instead of deriving it from the sanitized stored filename.
5. Prompt-building and Codex mapping resolve only the final `/rest/.../context-files/...` locators back to local filesystem paths.

### Run-scoped artifact preview flow

1. A runtime writes/edits a file or produces an output path.
2. `RunFileChangeService` indexes the canonical path and type in the run-scoped projection.
3. The frontend requests `/runs/:runId/file-change-content?path=...`.
4. The server streams the current bytes directly from the filesystem if the indexed file still exists.

## Operational Notes

- Conversation media transformation, composer context-file storage, and Artifacts-tab preview serving are intentionally separate concerns.
- Browser-uploaded composer attachments no longer depend on shared `/rest/files/...` media storage for send-time runtime consumption.
- Finalized context-file locators are the only uploaded-file locators that prompt-building/Codex path resolution may translate back to local files.
- Artifacts preview depends on run-indexed paths, not arbitrary filesystem reads.
- Legacy tool-result media-copy processors are no longer part of the Artifacts path.
- Missing current files return an honest `404` from the run-scoped route instead of stale copied media.
