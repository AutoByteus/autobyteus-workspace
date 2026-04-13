# Requirements Doc

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement
Redesign browser-uploaded context-file handling so files attached from run/member/application composers are no longer persisted as shared app-media assets under the common media folder. Instead, they should be treated as message-draft inputs that stage under draft context-file storage, then persist under the eventual agent-run or team-member-run memory subtree after send. The authoritative retrieval boundary should be run-scoped and filename-based, using a server-generated stored filename rather than a manifest-backed attachment ID or raw path query.

## Investigation Findings
- Browser uploads from the context area currently call one generic REST upload endpoint (`/rest/upload-file`) through `autobyteus-web/stores/fileUploadStore.ts`.
- The upload endpoint (`autobyteus-server-ts/src/api/rest/upload-file.ts`) categorizes files by MIME type and writes them into the shared media root managed by `MediaStorageService` (`<app-data-dir>/media/images|audio|video|documents|others`).
- Returned URLs are absolute `/rest/files/<category>/<filename>` URLs served by `autobyteus-server-ts/src/api/rest/files.ts`.
- The same upload store is also used for agent/team avatar uploads, so the current endpoint is not context-file-specific.
- Run-owned storage already exists under `<app-data-dir>/memory/agents/<runId>` for single-agent runs and `<app-data-dir>/memory/agent_teams/<teamRunId>/<memberRunId>` for team-member runs.
- Application focused-member composers already ride on a team-context model with temporary/final `teamRunId`, so they can reuse the same team-member ownership scheme instead of requiring a third final storage hierarchy.
- The regular Electron agent/team composer still preserves native local-file path attachments for OS drag/drop through `window.electronAPI.getPathForFile(...)`, while browser-style file blobs (upload button, clipboard file paste, browser drag/drop) go through the uploaded-context-file flow.
- The application-specific context-file UI currently does not mirror that Electron-native path preservation branch; native dropped files there are treated as uploads. If application composer scope stays in-scope, this parity gap should be closed.
- Current run-scoped file serving exists only for indexed run artifacts (`/rest/runs/:runId/file-change-content?path=...`), not for uploaded context files.
- Browser-uploaded images work today mainly because downstream code special-cases `/rest/files/...` URLs for some runtimes (for example Codex image mapping).
- Browser-uploaded readable text files are not properly ingested into prompt context today because `PromptContextBuilder` skips URL-based context files and only reads local filesystem paths.
- Shared media listing/deletion (`/rest/media`) can enumerate and delete the same uploaded files globally, which conflicts with run ownership.
- First-turn uploads happen before final run IDs exist: single-agent runs are created only on first send, and team/application member runs are created only when the team/app launch happens. Therefore a direct final-run-path upload is not possible without either early run creation or a draft/staging step.
- User clarified that the simpler `run scope + stored filename` mapping is preferred over a manifest-backed `attachmentId` design.

## Recommendations
- Use a dedicated context-file upload/serving subsystem instead of the shared media upload path.
- Stage all browser composer uploads under draft context-file storage first, even when the final run/team already exists; finalize them into final run-owned storage only during send.
- Persist final uploaded context files directly under the owning run directory:
  - single-agent: `<app-data-dir>/memory/agents/<runId>/context_files/<storedFilename>`
  - team member: `<app-data-dir>/memory/agent_teams/<teamRunId>/<memberRunId>/context_files/<storedFilename>`
- Generate one unique server-owned `storedFilename` per browser-uploaded attachment (for example `ctx_<token>__<sanitized-original-name>`). Keep that filename stable across draft-to-final promotion.
- Use run-scoped filename routes, not shared `/rest/files/...`, not artifact `/file-change-content`, and not raw `?path=` queries.
- Introduce one shared web attachment descriptor so composer/app/message surfaces no longer render, key, and open attachments by raw path/URL alone.
- Use one shared attachment presentation/open layer so UI surfaces do not each invent their own routing rules. That layer should render previewable image attachments as compact thumbnails in message surfaces, with filename-chip fallback when preview resolution fails or the attachment is not an image. For sent-message image thumbnails, the same layer should route previewable uploaded images into the right-side Files/File Viewer area so they behave consistently with dragged local-image attachments, and should not route through the Artifacts panel.
- Keep shared-media upload behavior for avatar/shared-library use cases; do not repurpose the existing shared-media upload endpoint for run-owned context files.
- Preserve Electron native local-file path behavior for OS drag/drop across all in-scope composer UIs, including application-specific context-file areas; only browser-style file blobs should enter the uploaded-context-file staging/finalization flow.
- Lock draft cleanup behavior: composer removal should delete uploaded draft files immediately; abandoned draft uploads older than 24 hours should be opportunistically pruned by the server cleanup owner.
- Remove old composer-specific `/rest/files/...` generation, parsing, and normalization paths as part of this change. Keep the shared `/rest/files/...` route only where it is still actively used by supported non-composer features such as avatars/shared media.
- No data migration of already-persisted conversation records is included in this ticket.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases
- `UC-001`: A user uploads one or more context files in a new single-agent draft before the first send.
- `UC-002`: A user uploads one or more context files in an existing single-agent run before the next send.
- `UC-003`: A user uploads one or more context files while focused on a team member before the team run has been launched.
- `UC-004`: A user uploads one or more context files while focused on a launched team member before the next send.
- `UC-005`: A user uploads one or more context files while focused on an application member; the same draft/final ownership rules apply through the underlying team-member context.
- `UC-006`: Uploaded context files can be previewed/opened through run- or draft-scoped `context-files/:storedFilename` routes, independent of media category.
- `UC-007`: Uploaded readable text files are resolved to local files during server-side input processing so prompt-context building can actually read them.
- `UC-008`: Removing an uploaded draft attachment from the composer deletes the staged server file immediately.
- `UC-009`: Abandoned uploaded draft files older than the retention window are cleaned up automatically without touching final run-owned files.
- `UC-010`: Deleting stored run history or stored team history removes the associated finalized uploaded context files automatically because they live under the owned run directory.
- `UC-011`: Shared-media uploads for avatars and similar global assets continue to use the shared-media path and are not moved into run-owned storage.
- `UC-012`: Composer attachment flows no longer depend on shared-media `/rest/files/...` URLs or any legacy composer-specific compatibility path.
- `UC-013`: In Electron, native OS file drag/drop continues to attach direct local file paths for all in-scope composer UIs, including the application-specific context-file area, rather than silently converting those inputs into uploaded context files.
- `UC-014`: When a sent user message contains image attachments with previewable locators, message surfaces show compact image thumbnails instead of filename-only chips; clicking a thumbnail previews the image in the right-side Files/File Viewer area like a dragged local-image attachment, and non-image or failed-preview attachments remain filename chips.

## Out of Scope
- Moving assistant-generated media output out of the shared media subsystem.
- Redesigning the run-file-change artifact projection system beyond any reuse needed for context-file serving analysis.
- Implementing unrelated media-library UX redesign.
- Data migration that rewrites already-persisted conversation attachment URLs into the new run-owned context-file subsystem.

## Functional Requirements
- `REQ-001`: Browser-uploaded context files must no longer be persisted as shared media-library assets under the common app-media root.
- `REQ-002`: Final persisted ownership for uploaded context files must be the individual run/member run, using the existing memory-root hierarchy for single-agent and team-member runs.
- `REQ-003`: The system must support pre-send uploads before final run IDs exist without forcing early creation of the actual run/team runtime.
- `REQ-004`: All browser-uploaded composer attachments must stage under draft context-file storage first and be finalized into run-owned storage only during send.
- `REQ-005`: Uploaded context files must be retrievable through authoritative draft/final `context-files/:storedFilename` URL boundaries that are independent of media category and use a server-generated stored filename rather than a manifest-backed ID or raw path query.
- `REQ-006`: The shared-media upload path must remain available for avatar/global-media use cases and must not be silently repointed to run-owned context storage.
- `REQ-007`: Server-side input processing must be able to resolve final run-scoped context-file URLs into local filesystem paths when local-file access is needed (for example readable text context ingestion and runtime-local media mapping).
- `REQ-008`: Uploaded context files must no longer appear in the global media-library list/delete flow owned by the shared media subsystem.
- `REQ-009`: Existing stored-run and stored-team deletion flows must remove finalized uploaded context files automatically via owned-folder cleanup, without requiring a separate global media cleanup path.
- `REQ-010`: Each browser-uploaded attachment must receive one unique server-generated `storedFilename`, and that filename must stay stable across draft-to-final promotion.
- `REQ-011`: Web context attachment state must use one shared descriptor that separates stable UI identity, transport locator, user-facing display label, and source kind; composer/app/message surfaces must not key or label attachments by raw locator alone.
- `REQ-012`: Composer/app/message surfaces must use one shared presentation/open boundary. That boundary must be the authoritative owner of attachment-open routing policy, including workspace-local attachments -> workspace/file-explorer behavior, previewable uploaded-image thumbnails in sent messages -> right-side Files/File Viewer preview, and other uploaded/external attachments -> browser-open behavior unless separately specified. UI components may supply callbacks/capabilities to that boundary, but they must not branch on attachment kind, preview URL, or source type to call the file explorer or browser directly.
- `REQ-013`: Removing an uploaded draft attachment from the composer must immediately delete the staged server file; `clear all` must do the same for all staged uploaded attachments.
- `REQ-014`: Abandoned uploaded draft files older than 24 hours must be opportunistically pruned by the server cleanup owner during upload/finalize/delete entrypoints, and empty draft directories must be pruned immediately after finalize/delete/cleanup.
- `REQ-015`: Application focused-member composers are in scope and must reuse the same team-member draft/final routing and storage model already used for team-member composers.
- `REQ-016`: Remove composer-specific legacy `/rest/files/...` upload/output/parsing behavior from the in-scope flow. Keep shared `/rest/files/...` behavior only for still-supported non-composer features, and do not add any composer-specific backward-compatibility wrapper or dual-path runtime resolver.
- `REQ-017`: The refactor must preserve existing Electron native local-path attachment behavior for OS drag/drop across all in-scope composer UIs. Regular browser uploads and pasted file blobs use staged uploaded attachments; Electron-native local file drops continue to resolve through `window.electronAPI.getPathForFile(...)` into workspace/local-path attachments.
- `REQ-018`: Message-rendering surfaces must use the shared attachment presentation helper to render image attachments as compact thumbnails when `resolveImagePreviewUrl(...)` succeeds, while preserving filename-chip fallback for non-image attachments or preview failures. Clicking a previewable image thumbnail must preview that image in the right-side Files/File Viewer area, consistent with dragged local-image attachments, rather than opening the Artifacts panel or a separate modal.
- `REQ-019`: Previewable uploaded-image attachments must be openable through the same right-side File Viewer pathway used by local/workspace image attachments. The shared presentation/open boundary may normalize uploaded run-scoped URLs into previewable file-viewer entries, but it must keep non-image attachment behavior unchanged unless separately specified.

## Acceptance Criteria
- `AC-001`: The refined requirements basis identifies the exact current upload entrypoints, storage owners, serving routes, and run-memory folder layout used by the current implementation.
- `AC-002`: The analysis explicitly explains why direct final-run upload is blocked for first-turn drafts and why some form of draft/staging or equivalent ownership bridge is required.
- `AC-003`: The target direction separates context-file uploads from shared-media uploads and protects avatar/global-media flows from regression.
- `AC-004`: The target direction uses run-scoped `context-files/:storedFilename` routes rather than shared-media routes, manifest-backed `attachmentId` routes, or path-query routes.
- `AC-005`: The target direction covers single-agent, team-member, and application focused-member composer flows.
- `AC-006`: The requirements explicitly lock the web attachment descriptor/open contract, the draft cleanup policy, and the no-legacy-compatibility rule for composer attachment flows.
- `AC-007`: In-scope Electron composer surfaces preserve native local-path drag/drop behavior while still using the new uploaded-context-file flow for browser-style file blobs.
- `AC-008`: Message-rendering surfaces show compact thumbnails for previewable image attachments, clicking those thumbnails previews the image in the right-side Files/File Viewer area through the shared presentation/open boundary, and non-image or failed-preview attachments retain filename-chip fallback.
- `AC-009`: The user has approved the revised requirements basis and explicitly said implementation may continue without another requirements-return loop.

## Constraints / Dependencies
- `autobyteus-web/stores/fileUploadStore.ts` is currently shared by context uploads and avatar uploads, so upload-purpose separation is required at either the API boundary, the store boundary, or both.
- Current browser composer upload flow happens before GraphQL run/team creation for first-turn drafts.
- Existing run-owned folders are already standardized under the server memory root.
- Existing shared-media routes are intentionally tied to the media root and category-based listing/deletion.
- The preferred design explicitly avoids a manifest-backed `attachmentId` layer unless a later ticket proves it necessary.

## Assumptions
- User intent is specifically about browser-uploaded context attachments from run/member/application composers, not avatar uploads or assistant-generated output media.
- The preferred end state is clean-cut separation, not dual ownership between shared media and run-owned storage.
- Application focused-member composers should not be left on the old shared-media behavior when the same upload problem exists there.
- Application focused-member composers should also preserve the same Electron native local-path drag/drop behavior as the main composer when running inside the desktop app.
- The same shared attachment presentation helper can be reused in message surfaces, and the existing right-side File Viewer already supports previewing external image URLs when opened through the file-explorer store. Therefore thumbnail rendering plus right-side preview behavior for uploaded images is expected to be frontend-only and should not require backend changes.
- Existing run deletion flows should remain the authoritative cleanup path for finalized run-owned attachments.

## Risks / Locked Decisions
- Locked cleanup policy: uploaded draft attachments live under draft context-file storage, are deleted immediately on composer removal, and are TTL-pruned after 24 hours if abandoned.
- Locked clean-code rule: no composer-specific backward-compatibility layer is retained; shared `/rest/files/...` code remains only if still used by supported non-composer features.
- Locked migration scope: data migration of already-persisted conversation attachment URLs is not included in this ticket.
- Locked identity rule: use server-generated stored filenames, not manifest-backed attachment IDs.

## Requirement-To-Use-Case Coverage
- `REQ-001` -> `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-010`
- `REQ-002` -> `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-010`
- `REQ-003` -> `UC-001`, `UC-003`, `UC-005`
- `REQ-004` -> `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-008`
- `REQ-005` -> `UC-006`
- `REQ-006` -> `UC-011`
- `REQ-007` -> `UC-007`
- `REQ-008` -> `UC-010`, `UC-011`
- `REQ-009` -> `UC-010`
- `REQ-010` -> `UC-001`, `UC-003`, `UC-005`, `UC-006`
- `REQ-011` -> `UC-006`, `UC-008`, `UC-012`
- `REQ-012` -> `UC-006`, `UC-012`
- `REQ-013` -> `UC-008`
- `REQ-014` -> `UC-009`
- `REQ-015` -> `UC-005`
- `REQ-016` -> `UC-012`
- `REQ-017` -> `UC-013`
- `REQ-018` -> `UC-014`
- `REQ-019` -> `UC-014`

## Acceptance-Criteria-To-Scenario Intent
- `AC-001` -> current-state traceability validation
- `AC-002` -> first-turn draft ownership constraint validation
- `AC-003` -> shared-media separation validation
- `AC-004` -> route-identity simplification validation
- `AC-005` -> ownership coverage validation
- `AC-006` -> review-gap closure validation
- `AC-007` -> Electron parity validation
- `AC-008` -> image-thumbnail rendering validation
- `AC-009` -> approval gate satisfied

## Approval Status
Approved by user on 2026-04-13. Revised requirements direction (`storedFilename`-based routes, explicit draft cleanup policy, and no composer-specific legacy compatibility while preserving still-used shared-media functionality) was also approved by user on 2026-04-13 with instruction to continue without another requirements-return loop.
