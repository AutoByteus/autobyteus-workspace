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
- Runtime-visible context-file reference rendering:
  - `autobyteus-ts/src/agent/message/context-file-reference-section.ts`
  - `autobyteus-ts/src/agent/message/multimodal-message-builder.ts`
  - `src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts`
  - `src/agent-execution/backends/claude/session/claude-session.ts`
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
- finalized team-member uploads live under the canonical member memory directory
  resolved from the root TeamRun id, physical ancestor TeamRun ids, rooted
  member address, and AgentRun id

Run-file-change metadata is stored separately under `<run-memory-dir>/file_changes.json`.
The actual artifact/output files remain where the runtime wrote them.

## URL / Serving Strategy

- Managed media URLs are based on `AppConfig.getBaseUrl()` and are typically served from `/rest/files/...`.
- Draft uploaded context files are served from `/rest/drafts/.../context-files/:storedFilename` until send-time finalization.
- Finalized uploaded context files are served from
  `/rest/runs/:runId/context-files/:storedFilename` or
  `/rest/team-runs/:teamRunId/members/:memberAddress/context-files/:storedFilename`.
  The team-member route requires one encoded canonical rooted address and
  resolves the exact memory location from active runtime context or persisted
  schema-v3 Team metadata; there is no suffix or route-key fallback.
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
5. Prompt-building, Codex mapping, and Claude session text mapping resolve only the final `/rest/.../context-files/...` locators back to local filesystem paths.
6. If one or more context files resolve to local absolute paths, the runtime-visible current user message text includes one generated `Reference files:` block listing those paths. Native AutoByteus and Codex still preserve their existing media payloads (`image_urls` / `localImage`) in addition to the text block; Claude receives the text reference only.

### Run-scoped artifact preview flow

1. A runtime writes/edits a file, or a known generated-output tool (`generate_image`, `edit_image`, `generate_speech`, `generate_video`, including the AutoByteus image/audio/video MCP forms) produces an output path.
2. `AgentRunEventPipeline` runs once on the normalized backend event batch before subscriber fan-out.
3. `FileChangeEventProcessor` derives a `FILE_CHANGE` event for explicit file mutations or known generated outputs.
4. `RunFileChangeService` indexes the canonical path and type in the run-scoped projection.
5. The frontend requests `/runs/:runId/file-change-content?path=...`.
6. The server streams the current bytes directly from the filesystem if the indexed file still exists.

## Operational Notes

- Conversation media transformation, composer context-file storage, and Artifacts-tab preview serving are intentionally separate concerns.
- Browser-uploaded composer attachments no longer depend on shared `/rest/files/...` media storage for send-time runtime consumption.
- Finalized context-file locators are the only uploaded-file locators that prompt-building, Codex path resolution, and Claude text mapping may translate back to local files.
- Runtime-visible `Reference files:` blocks list complete server-side local paths. This intentionally exposes host filesystem paths to the selected runtime/model provider for the current trusted local/server deployment model so later agents can copy the paths into explicit `reference_files` handoffs when needed.
- HTTP(S) URLs, data URLs, malformed `file:` URLs, empty values, and unresolved context-file locators must not be emitted as local `Reference files:` entries.
- Artifacts preview depends on run-indexed paths, not arbitrary filesystem reads.
- Generic `file_path`/`filePath` fields are not artifact evidence by themselves; generated-output rows require a known output-producing tool plus explicit output/destination metadata or that tool's known result shape.
- Legacy tool-result media-copy processors are no longer part of the Artifacts path.
- Missing current files return an honest `404` from the run-scoped route instead of stale copied media.
