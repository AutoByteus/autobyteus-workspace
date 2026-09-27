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
  `/rest/team-runs/:teamRunId/agent-runs/:agentRunId/context-files/:storedFilename`.
  The team-member route requires the exact canonical AgentRun ID plus containing TeamRun ID and
  resolves the exact memory location from active runtime context or persisted
  V2 Team execution tree; there is no suffix or route-key fallback.
- The finalize request accepts `attachments[{ storedFilename, displayName }]` so the user-visible filename survives any storage-safe `storedFilename` normalization.
- Artifacts-tab previews do not require copied media URLs; they stream current bytes from `/runs/:runId/file-change-content?path=...` using run-scoped indexed path resolution.

## Exact Team attachment cutover and operations

Final Team owners are `{ kind: 'team_member_final', teamRunId, agentRunId }`.
`teamRunId` is the immediate containing TeamRun and `agentRunId` is the canonical
application execution ID, not a provider thread, definition ID, or member address.
Repeated member addresses do not select files. Missing/wrong-team IDs fail; no
address fallback, redirect, newest/configured preference, or mixed-version shim
exists. Draft owners retain their separate temporary scope and member address.
Org and standalone contracts and the existing physical execution directories are
unchanged. Both HTTP GET and provider local-path resolution use exact ownership.

### Startup migration

`20260926_team_context_file_execution_locators_v1` is startup-only, after Team V2,
Org-family and trace-layout prerequisites. It enumerates typed attachment record
sources across Team, Org and standalone memory, proves historical Team references
against the execution index and contained files, and changes only typed locators.
Source-trace provenance disambiguates only a matching physical candidate; otherwise
one unique physical owner is required. Unresolved ownership excludes the source package and its dependants, never guesses.
Prose, provider histories, attachment blobs, and unrelated record values are not
rewritten. Serialization of changed JSON/JSONL records may differ.

Original changed-record backups and `manifest.json` are under
`<app-data-dir>/app-data-migration-backups/20260926_team_context_file_execution_locators_v1/`,
outside live memory discovery. The manifest records original/target hashes,
locator mappings and commit progress. Preflight precedes record writes; atomic
commits and strict rereads precede completion. Retry accepts only original or
target hashes, retains original backups, and re-finalizes uncertain commits.
Both Studio and standalone hosts independently rebuild current package admission
on every startup; the migration ledger is not a startup or admission gate.
Missing-tree/incomplete roots remain untouched and excluded with explicit
`SUCCEEDED_WITH_WARNINGS` dispositions. An actual attempt failure stays `FAILED`,
while independently valid packages and new work remain available. Even zero
admitted historical runs must not prevent opening/new work. Current-reference
checks include dependency closure across Team, Org and standalone packages;
current runtime never decodes historical address locators.

### Coordinated upgrade checklist

This is an operational procedure, not evidence that an installation was upgraded.

1. Obtain deployment authorization and identify the exact node, app-data/memory
   roots, database/ledger, package roots, configured origin and all writers. Record
   current server/client versions and rollback binaries. Do not assume a test root
   or earlier scan represents the installed corpus.
2. Stop all writers, including standalone hosts, and prevent old clients from
   reconnecting. Take a consistent recoverable snapshot of app data, memory,
   database/ledger and configuration before starting new binaries. Migration's
   changed-record backups alone are not a complete installation backup.
3. Rehearse against an isolated consistent copy of that installation with the
   matching candidate server and client. Preserve the configured-origin semantics
   for historical absolute URLs; do not accidentally rebind external-host URLs.
   Isolate credentials, package side effects and network access. There is no
   separate dry-run CLI promised here: startup on the copy performs migration.
4. Check truthful group dispositions and independent current admission; compare
   original backup hashes, attachment hashes, preserved excluded roots, unaffected
   records and non-locator values. Verify usable historical image/file Open and
   duplicate-address send. Include an all-excluded-history case that still opens
   and creates new work. Unexpected hash/backup or unfinished-attempt failures
   require investigation, not deletion or fabricated ledger success. Retry through
   normal startup policy. A completed excluded group is a warning, not a global
   startup failure. Completed released manifests/originals remain evidence and
   must not be rewritten merely for formatting or restored over newer history.
5. With writers still stopped and a fresh consistent snapshot, deploy matching
   web/Electron renderer and server versions together. Capture production migration
   status/manifest, byte and history checks, and a controlled send/read/restart smoke
   result before admitting users. Do not claim Electron shell validation from a
   browser test. Retain backups and the operation log.

### Recovery from the released 1.4.87 startup failure

Retained roots without execution trees were valid predecessor residue; their
presence is not proof that all current data is unusable. The recovery keeps the
same migration ID and existing originals/manifest. Let the normal runner retry
failed attempts; do not reset a completed ledger, move troublesome roots out of
live discovery, fabricate success, or delete history to make startup pass.

Assess current package admission separately from attempt status. Verify application
opening and new work even when no historical package can be admitted, plus reads
from independently usable history, preservation of excluded roots, and a second
startup without redoing a terminal migration. Rehearse on an **unfiltered**, consistent
copy of actual installed data including the failed ledger, not only a current-runtime
fixture with old URL fields. See the [Data Migration Guideline](design/data_migration_guideline.md)
for the governing classification and incident anti-pattern. A test artifact with the
same 1.4.87 label must be identified by candidate/build ID and checksum; the version
label alone does not distinguish it from the affected published binary.

### Recovery and rollback

Keep writers stopped on failure. Preserve the failed manifest, diagnostics and
original backups; source/target hash-safe startup retry is preferable to editing
history. A pre-admission rollback must restore a coherent pre-upgrade snapshot
(records, database/ledger, configuration and matching old binaries), not just the
old server. **Never restore migration backups over newer writes.** If new writes
have occurred, stop and preserve both states for a separately approved recovery or
forward fix; a blind old snapshot restore would lose history. Unknown ownership
requires evidence and escalation, not reassignment by member address.

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
