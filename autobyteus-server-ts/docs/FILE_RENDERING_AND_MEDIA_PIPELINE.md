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
  A draft locator is the attachment's identity and its address. One draft locator codec in
  `context-files/domain/context-file-owner-types.ts` (`buildDraftContextFileLocator` plus its
  exact inverse `parseDraftContextFileLocator`) owns the path shape of every draft owner kind
  (`agent_draft`, `team_member_draft`, `org_member_draft`,
  `agent_collaboration_member_draft`). The REST layer registers exactly one
  `GET /rest/drafts/*` and one `DELETE /rest/drafts/*`, which parse the raw request path
  with that codec. `ContextFileLocalPathResolver` resolves draft locators through the same
  codec. Every draft owner kind is therefore both readable and deletable. A new owner kind
  added to the codec gets both routes, and no route or resolver may hold per-kind draft path
  patterns. Both routes share one error mapping:
  - a path that is not a draft locator → `404`
  - an invalid descriptor (`ContextFileDescriptorError`, including
    `ContextFilePathContainmentError`, or `CollaborationContractError`) → `400 {detail}`
  - an unknown owner → `404`
  - a GET for a missing file → `404`
  - a DELETE → `204` whether or not the file existed
  - any other fault → `500`

  Finalized-file routes are still registered per owner kind; they have no delete operation.
- **Owner identity and stored filename rules.** The owner descriptor parsers
  (`parseDraftContextFileOwnerDescriptor`, `parseFinalContextFileOwnerDescriptor`) are the
  trust boundary for every context-file entry point: upload, finalize, draft GET/DELETE,
  final GETs and runtime locator resolution.
  - Every owner ID of every draft and final owner kind (`draftRunId`, `teamDraftId`,
    `runId`, `teamRunId`, `orgRunId`, `hostRunId`, `agentRunId`) is a safe identity. It
    must be non-empty, have no surrounding whitespace, contain no `/`, `\` or control
    characters, and not be `.` or `..`. IDs are never trimmed into validity. `memberAddress`
    keeps its canonical team-address validation.
  - A descriptor with fields that its owner kind does not define is rejected.
  - A stored filename may contain only `A-Z a-z 0-9 . _ -`. It must not be dot-only or
    contain `..`. The server generates every stored filename (`ctx_<token>__<stem>.<ext>`)
    within that set.
  - Malformed input is answered `400 {detail}`, including on the agent-final route
    `/rest/runs/:runId/context-files/:storedFilename`. Nothing is read, written, moved or
    deleted. Runtime locator resolution treats a malformed locator as unresolved.
  - `resolveSafeChildPath` in `ContextFileLayout` remains as defence in depth. An escaping
    path throws `ContextFilePathContainmentError`, which is answered 400, never 500.
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

### Same-ID migration and startup admission

`20260926_team_context_file_execution_locators_v1` remains the **same existing
startup-only migration**, after Team V2, Org-family and trace-layout prerequisites.
No new migration or successful-ledger replay is added. The ordinary runner skips
`SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` installations; normal eligible pending or
failed attempts use the corrected converter.

The converter discovers structural owners, then reads and semantically transforms
each typed record source once. It replaces only changed files using the existing
atomic writer. Historical Team references require indexed execution ownership and
physical-file proof; source-trace provenance may disambiguate a matching physical
candidate, otherwise one unique owner is required. It never guesses by member name.
An unavailable reference preserves that entire source and produces a warning;
independent sources continue. True IO/commit failures remain FAILED. Retry reads
the current live old/current records, so previously converted files and newer
current content are not overwritten from old copies. Per-file atomic replacement
is not a multi-file transaction. Prose, attachment blobs and unrelated values stay
unchanged; unchanged JSONL lines/terminators retain their bytes.

The former bespoke journal, hashes, retained whole-file backup creation, preflight
and repeated transforms are removed. A temporary file for atomic replacement is
not a retained backup. Any originals/manifests already under
`<app-data-dir>/app-data-migration-backups/20260926_team_context_file_execution_locators_v1/`
remain inert and untouched: the corrected migration does not read, reconcile,
restore, update or delete them. Runner attempt records/logs remain authoritative.

Studio and standalone retain structural current-package validation at startup and
new-run admission, but do not read all historical traces to audit attachments.
There is no reference dependency closure, persistent audit cache or background
replacement scan. Missing-tree/invalid structural packages remain preserved and
excluded; a broken historical attachment no longer excludes an otherwise valid
conversation or its dependants. Exact ownership and contained regular-file checks
happen on the requested attachment read/provider path; only that operation fails
when unavailable. Runtime never decodes historical address locators.

### Coordinated upgrade checklist

This is an operational procedure, not proof of an installed upgrade.

1. Identify the authorized node, versions, configured origin, data/ledger roots
   and all writers. Stop writers before a pending migration and preserve a
   consistent recoverable installation snapshot through the normal operator
   procedure; this converter no longer creates backup copies for you.
2. Rehearse pending and eligible partial retry against an isolated faithful copy,
   preserving configured-origin semantics and isolating credentials/side effects.
   Do not reset the real ledger to construct a test. Already-terminal installations
   need no replay: verify normal reopen and unchanged terminal record/attempt count.
3. Verify typed-reference-only changes, unchanged attachment bytes, unavailable
   whole-source preservation, existing inert residue and new-work availability.
   Comparison hashes are external test evidence, not migration-runtime work.
   Report true failed attempts honestly; do not delete roots or fabricate success.
4. Deploy matching server/web or Electron together. Verify startup, history and
   exact attachment access; missing requested attachments must fail locally.
   Keep the first-upgrade/backend-process timing distinct from actual Electron
   terminal-startup timing. A browser health result is not shell-startup proof.

### Existing released history and rollback

Retained roots without execution trees are not evidence that all current data is
unusable. Preserve them and existing originals/manifests. Do not move roots out of
discovery, reset completed ledger records, force replay or delete history to make
startup look successful. See the [Data Migration Guideline](design/data_migration_guideline.md)
for predecessor dispositions and the recurring full-history-audit anti-pattern.

Do not blindly restore released backup records over newer live writes. If recovery
is required, stop writers, preserve the current state and use an explicitly approved
coherent snapshot/forward-fix procedure with matching binaries and ledger. Unknown
ownership needs investigation, not address-based reassignment. Candidate test apps
may share the published version label until finalization: use build identity and
checksum, not that label alone, to distinguish them.

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
