# Investigation Notes

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Current-state investigation complete; requirements revised and approved; design spec revised for architect re-review
- Investigation Goal: Determine the correct ownership, persistence location, retrieval boundary, and web attachment contract for user-uploaded context files currently attached from frontend context areas.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale:
  - Crosses frontend composer upload flow, backend REST upload/storage routes, runtime input preprocessing, run-owned memory layout, and web attachment rendering/open behavior.
  - Requires an ownership redesign because the current upload boundary mixes run inputs with shared media assets.
  - First-turn draft uploads create a structural constraint because final run IDs do not exist yet when browser uploads happen.
- Scope Summary:
  - Trace current context-file upload and retrieval flow.
  - Compare shared-media storage against run-owned storage.
  - Determine what existing run-owned boundaries can and cannot be reused.
  - Lock a simpler filename-based retrieval design (`run scope + storedFilename`) instead of the earlier manifest-backed `attachmentId` option.
  - Close design-review gaps around web descriptor shape, draft cleanup policy, historical scope, and application scope.
- Primary Questions Resolved:
  - Where are context uploads persisted today?
  - Which subsystem owns them today?
  - What run-scoped storage/fetch capabilities already exist?
  - Why is direct final-run upload not possible for first-turn drafts?
  - What retrieval boundary shape can stay simple without a manifest?
  - How should composer/app/message UIs represent uploaded attachments once raw `path` is no longer the only meaningful field?

## Request Context
- User observed that frontend context files (images/audio/other attachments) are stored in a common media folder.
- User believes this is the wrong ownership model because the files belong to an individual agent run or focused team member.
- User asked for analysis of the best storage design and whether the backend retrieval URL shape can be unified.
- After review feedback and discussion, user explicitly preferred a simpler `runId/team scope + storedFilename` design over a manifest-backed `attachmentId` design and approved continuing without another requirements-return loop.
- After live verification on the 8000 dev server, user also asked whether the refactor preserved the original Electron direct-local-path behavior. Investigation confirmed that the main agent/team composer still preserves Electron-native local file drops, but the app-specific context-file UI does not yet mirror that branch.
- User then requested one more low-effort UI enhancement: when sent user messages include image attachments, show small thumbnails instead of filename-only chips where preview URLs are available.
- User later clarified one interaction detail twice while investigating the bug. The final desired click behavior is not Artifacts-panel integration and not a separate modal. The desired target UX is consistency with dragged local files: click the uploaded-image thumbnail in the message and preview it in the right-side Files/File Viewer area.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/tickets/done/agent-run-context-file-storage`
- Current Branch: `codex/agent-run-context-file-storage`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --all --prune` succeeded before worktree creation
- Task Branch: `codex/agent-run-context-file-storage`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): Unknown
- Bootstrap Blockers: None
- Notes For Downstream Agents:
  - Investigate in the dedicated task worktree only.
  - Preserve distinction between shared-media uploads (avatars/global media) and run-owned context-file uploads.
  - Treat the simplified stored-filename route design as the new locked direction.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-13 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch` | Confirm repo context before bootstrap | Repo root confirmed; current branch was `personal` before dedicated task worktree creation | No |
| 2026-04-13 | Command | `git remote show origin` | Resolve base branch / remote context | Remote HEAD branch is `personal` | No |
| 2026-04-13 | Command | `git fetch --all --prune` | Refresh remote refs before task branch creation | Fetch succeeded | No |
| 2026-04-13 | Command | `git worktree add -b codex/agent-run-context-file-storage /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage origin/personal` | Create dedicated task worktree/branch | Dedicated task worktree created successfully | No |
| 2026-04-13 | Code | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | Trace browser composer upload/render/open behavior | Browser uploads happen immediately on attach; UI labels, keys, previews, and click-open behavior currently all depend on raw `path` | Design had to define a richer web attachment descriptor |
| 2026-04-13 | Code | `autobyteus-web/applications/socratic_math_teacher/components/AppContextFileArea.vue` | Check application-surface attachment behavior | Application context area has the same raw-path UI assumptions and upload-store dependency | Application scope must be locked, not left ambiguous |
| 2026-04-13 | Code | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`, `autobyteus-web/applications/socratic_math_teacher/components/AppContextFileArea.vue` | Verify whether Electron-native local-file attachment behavior survived the refactor | Main agent/team composer still uses `window.electronAPI.getPathForFile(...)` for native OS drops, but the app-specific context area routes dropped files straight into `uploadFiles(...)` | Application UI needs an explicit parity requirement/design note |
| 2026-04-13 | Code | `autobyteus-web/components/conversation/UserMessage.vue`, `autobyteus-web/applications/socratic_math_teacher/components/AppUserMessage.vue`, `autobyteus-web/utils/contextFiles/contextAttachmentPresentation.ts`, `autobyteus-web/stores/fileExplorer.ts`, `autobyteus-web/utils/fileExplorer/fileUtils.ts` | Assess whether message surfaces can show image thumbnails and whether clicked uploaded images can preview on the right side like dragged local files | Message surfaces currently render all attachments as text buttons; dragged local files open the right-side File Viewer because they are `workspace_path` attachments and call `fileExplorer.openFile(...)`; uploaded attachments currently route through generic browser open. The File Viewer can already preview external image URLs if opened via the file-explorer store | Consistent right-side preview is frontend-only if thumbnail clicks route uploaded image URLs into the file-explorer store |
| 2026-04-13 | Code | `autobyteus-web/components/conversation/UserMessage.vue` | Check message-surface attachment behavior | User-message chips key, label, and open by raw `path` | Design had to define shared presentation/open rules |
| 2026-04-13 | Code | `autobyteus-web/stores/fileUploadStore.ts` | Identify client upload entrypoint | Context uploads call one generic `/upload-file` REST endpoint and expect `fileUrl` back | Upload-purpose separation is required |
| 2026-04-13 | Code | `autobyteus-server-ts/src/api/rest/upload-file.ts` | Verify backend upload owner and returned URL shape | Upload endpoint categorizes by MIME, writes to shared media directories, returns `/rest/files/<category>/<filename>` URL | Wrong authoritative owner for run-owned context attachments |
| 2026-04-13 | Code | `autobyteus-server-ts/src/services/media-storage-service.ts` | Verify storage root, categories, list/delete behavior, helper capabilities | Shared storage root is `<app-data-dir>/media`; media library listing/deletion is global | Context attachments should not stay here |
| 2026-04-13 | Code | `autobyteus-server-ts/src/api/rest/files.ts` and `src/api/rest/media.ts` | Verify current serving/list/delete boundary | `/rest/files/:category/:filename` is media-root-specific; `/rest/media` lists/deletes shared-media files globally | Cannot be the final authoritative boundary for run-owned context attachments |
| 2026-04-13 | Code | `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` and `src/agent-memory/store/team-member-memory-layout.ts` | Verify existing run-owned folder structure | Run-owned folders already exist under `memory/agents/<runId>` and `memory/agent_teams/<teamRunId>/<memberRunId>` | Correct final ownership roots |
| 2026-04-13 | Code | `autobyteus-web/stores/agentRunStore.ts`, `autobyteus-web/stores/agentTeamRunStore.ts`, `autobyteus-web/stores/applicationRunStore.ts` | Verify when final run/team IDs exist and how application scope maps | First-turn uploads happen before final run/team creation; application focused members already carry temp/final `teamRunId` through team context | Draft staging is mandatory; app scope can reuse team-member routing |
| 2026-04-13 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` and `src/services/agent-streaming/agent-team-stream-handler.ts` | Verify how uploaded paths enter server-side user input | Uploaded locators are wrapped into `ContextFile` entries and passed downstream as-is | Finalized URLs must be normalized before send |
| 2026-04-13 | Code | `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` and `src/agent-customization/processors/prompt/prompt-context-builder.ts` | Verify how uploaded files are consumed as prompt context | URL-based readable files are skipped for inline prompt-context reading; only local paths are read | Final URL -> local path resolution remains required |
| 2026-04-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | Verify runtime-specific handling of `/rest/files/...` URLs | Codex mapper special-cases `/rest/files/...` image URLs into local media-root file paths | Shared-media-specific parsing must be removed for new behavior |
| 2026-04-13 | Code | `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` and `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Check current web attachment payload model | Client message payload model currently only carries raw `path` and `type` | Shared web descriptor needed for richer UI contract |
| 2026-04-13 | Doc | `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Confirm documented intended split between media and run-scoped file preview | Docs explicitly separate managed media from run-scoped artifact preview paths | New context-file subsystem should mirror run-scoped ownership, not media ownership |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Browser composer uploads: `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` -> `autobyteus-web/stores/fileUploadStore.ts`
- Current execution flow:
  1. User attaches a browser file from the context area.
  2. Frontend uploads immediately to `POST /rest/upload-file` before the run/team exists.
  3. Backend categorizes by MIME and writes to `<app-data-dir>/media/<category>/<uuid>.<ext>`.
  4. Backend returns absolute `/rest/files/<category>/<filename>` URL.
  5. Frontend stores that URL in `contextFilePaths` and later sends it over WebSocket.
  6. Server wraps the URL into `ContextFile` and forwards it into runtime input processing.
  7. Some runtimes special-case image URLs, but readable text uploads remain URL-based and therefore are not read by `PromptContextBuilder`.
- Ownership or boundary observations:
  - Upload ownership is currently the shared media subsystem, not the run.
  - Retrieval boundary is category-based and media-root-specific, not run-owned.
  - Global media list/delete routes can affect run-attached inputs.
  - Existing run-scoped route (`/rest/runs/:runId/file-change-content`) is projection-based and does not own uploaded context files.
  - UI attachment surfaces currently overload `path` as stable key, human label, open target, and transport locator at the same time.
- Current behavior summary:
  - Browser-uploaded context files are treated like global media assets today, even when they semantically belong to one run/member composer.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | Main agent/team composer attachment UI | Uploads browser files immediately on attach; labels, keys, and image preview/open logic are all path-driven | Needs shared descriptor + shared presentation/open helper |
| `autobyteus-web/applications/socratic_math_teacher/components/AppContextFileArea.vue` | Application composer attachment UI | Same path-driven upload/render/open behavior as main composer | Application scope should reuse the same contract |
| `autobyteus-web/components/conversation/UserMessage.vue` | User message attachment chips | Displays and opens by raw `path` | Message surfaces must use shared display/open contract |
| `autobyteus-web/stores/fileUploadStore.ts` | Generic frontend upload store | Used by context uploads and avatar uploads | Upload-purpose separation is required |
| `autobyteus-server-ts/src/api/rest/upload-file.ts` | Generic upload route | Writes all uploads into shared media storage and returns `/rest/files/...` URL | Wrong authoritative owner for run-owned context attachments |
| `autobyteus-server-ts/src/services/media-storage-service.ts` | Shared media storage/list/delete owner | No run/team ownership; shared media library and deletion are global | Context attachments should not stay here |
| `autobyteus-server-ts/src/api/rest/files.ts` | Shared media file serving | Only serves media-root category/filename paths | Cannot be the final authoritative boundary for run-owned context attachments |
| `autobyteus-server-ts/src/api/rest/media.ts` | Global media list/delete API | Lists and deletes shared media files by category/filename | Conflicts with run-owned attachment semantics |
| `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` | Single-agent run folder layout | Owns `memory/agents/<runId>` | Natural final storage owner for single-agent uploaded context files |
| `autobyteus-server-ts/src/agent-memory/store/team-member-memory-layout.ts` | Team-member run folder layout | Owns `memory/agent_teams/<teamRunId>/<memberRunId>` | Natural final storage owner for team-member and application-member uploaded context files |
| `autobyteus-server-ts/src/api/rest/run-file-changes.ts` | Run-scoped artifact preview | Works only for indexed run file-change entries | Not directly reusable as-is for uploaded context files |
| `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | Server-side path normalization before prompt build | Leaves URL-based context files untouched | Uploaded text files stay unreadable today |
| `autobyteus-server-ts/src/agent-customization/processors/prompt/prompt-context-builder.ts` | Inline readable-text context builder | Skips URL-based files | Final run-owned local-path resolution is needed |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | Codex-specific input mapping | Special-cases `/rest/files/...` image URLs to local media paths | New context-file routes need one authoritative local-path resolver |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | Agent avatar upload | Uses the same upload store but should remain shared-media-owned | Existing shared-media upload behavior must be preserved for avatars |
| `autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue` | Team avatar upload | Uses the same upload store but should remain shared-media-owned | Confirms the need for upload-purpose split |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-13 | Trace | Static code trace of browser upload -> REST upload -> runtime input path | Upload occurs before run/team creation and returns shared-media URL | Final-run ownership needs draft staging/promotion |
| 2026-04-13 | Trace | Static code trace of prompt context building for URL-based files | URL-based readable files are skipped for inline prompt context | Run-owned uploaded text files should resolve to local paths before prompt build |
| 2026-04-13 | Trace | Static code trace of media library list/delete routes | Shared media library can see and delete uploaded context files globally | Shared-media ownership is semantically unsafe for run-owned inputs |
| 2026-04-13 | Trace | Static code trace of web composer/app/message attachment rendering | All major attachment surfaces currently depend on raw `path` for keys, labels, preview, and open behavior | Required a first-class web attachment descriptor and presentation boundary |

## External / Public Source Findings

- None needed; investigation was codebase-local.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not required for the current static trace.
- Required config, feature flags, env vars, or accounts: Not required.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `git fetch --all --prune`
  - `git worktree add -b codex/agent-run-context-file-storage /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage origin/personal`
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs
- Current shared-media upload path is doing two different jobs:
  - valid shared/global media uploads (avatars, library-like assets)
  - run-owned context attachments (problematic)
- Existing run-owned folder layout is already present and suitable for final context-file ownership.
- Existing run-scoped serving route is not a direct drop-in because it is projection/index based, while uploads are pre-send inputs and may exist before any run file-change projection exists.
- A stable, path-safe stored filename can replace the earlier manifest-backed `attachmentId` idea while still preserving simple route-based lookup.
- Uploaded readable text files currently do not achieve the intended prompt-context semantics when they come from browser upload URLs.
- Draft staging cleanup needed one explicit policy decision; the locked direction is immediate delete on composer removal plus 24-hour TTL pruning for abandoned drafts.
- User clarified a stronger clean-code rule: do not retain composer-specific legacy compatibility. Remove old composer `/rest/files/...` generation/parsing paths, but keep the shared `/rest/files/...` route where it is still genuinely used by supported non-composer features such as avatars/shared media.
- Data migration of already-persisted conversation attachment URLs remains outside this ticket scope.

## Constraints / Dependencies / Compatibility Facts
- `POST /rest/upload-file` cannot simply be repointed wholesale because avatar uploads still belong to shared media.
- A clean solution must account for agent, team-member, and application-member composer uploads because they share the same current upload behavior.
- Any new unified attachment URL must still support runtime-local resolution where needed (for example Codex image inputs and readable text prompt ingestion).
- Existing stored-run and stored-team deletion already remove the owning run/team directory, which is a strong fit for finalized run-owned attachment cleanup.
- Application focused-member composers can reuse the team-member route shape because application state already maintains a temporary/final `teamRunId` under `teamContext`.

## Locked Decisions / Resolved Review Findings
- `DI-001` resolved: use one shared web attachment descriptor with explicit `kind`, stable `id`, `locator`, `displayName`, and uploaded `storedFilename`, plus one shared presentation/open helper for composer/app/message surfaces.
- `RQ-001` resolved: draft uploads stage under draft context-file storage, are deleted immediately on composer removal, and are TTL-pruned after 24 hours by opportunistic cleanup on upload/finalize/delete entrypoints.
- `RQ-002` resolved: no composer-specific legacy compatibility layer is retained; old composer `/rest/files/...` generation/parsing paths are removed, shared `/rest/files/...` remains only for still-used non-composer features, and no new dual-path resolver is added.
- Application scope resolved: in-scope; application focused-member composers reuse the team-member draft/final contract because they already operate through temp/final `teamRunId`.
- Electron parity follow-up resolved: regular agent/team composer behavior is preserved; the remaining gap is localized to the app-specific context-file UI and is frontend-only because downstream send/finalization/storage logic already supports both uploaded and workspace-path attachments.
- Thumbnail enhancement follow-up resolved after user clarification: message surfaces can reuse the existing shared attachment presentation helper to render previewable image attachments as compact thumbnails with filename-chip fallback, and can reuse the existing right-side File Viewer infrastructure for click behavior by routing uploaded image URLs into the file-explorer store; no backend change is required.
- Architect review DI-002 then exposed one remaining design gap: the target UX was correct, but the design had not fully re-locked one authoritative frontend open/preview owner. The fix is to keep `contextAttachmentPresentation` as that owner and move the uploaded-image -> File Viewer preview branch into its explicit contract instead of leaving message components to special-case it.

## Follow-Up Finding: Electron Native-Path Parity

- Live 8000-server verification showed the main ticket goal is working: the tested run stored uploaded context files under `memory/agents/superagent_6989/context_files/`, not under shared media.
- Separate follow-up investigation compared the standard composer (`ContextFilePathInputArea.vue`) with the application-specific UI (`AppContextFileArea.vue`).
- `ContextFilePathInputArea.vue` still preserves the original Electron direct-local-path behavior for native OS drag/drop by resolving each dropped `File` through `window.electronAPI.getPathForFile(...)` and then appending workspace/local-path attachments.
- `AppContextFileArea.vue` does not currently have the equivalent Electron-native branch; dropped files there are treated as uploads.
- Because `applicationRunStore.ts`, `agentTeamRunStore.ts`, and the shared attachment send partitioning already support both uploaded attachments and workspace/local-path attachments, this parity gap is a small frontend-only follow-up rather than a storage or backend design issue.

## Follow-Up Finding: Message-Surface Image Thumbnails

- The baseline message surfaces historically rendered all context attachments as filename buttons/chips. The current worktree has already started adding thumbnail rendering in `UserMessage.vue` and `AppUserMessage.vue`, but the click-routing logic is still split because uploaded-image previews are special-cased in those components instead of being owned entirely by the shared helper.
- `contextAttachmentPresentation.resolveImagePreviewUrl(...)` already knows how to produce browser or Electron-friendly preview URLs for uploaded and workspace-path image attachments.
- Dragged local-image attachments already preview on the right side because `contextAttachmentPresentation.openAttachment(...)` routes `workspace_path` attachments into `fileExplorer.openFile(...)`, and the file-explorer store knows how to preview local images.
- Pasted clipboard images do not currently preview on the right side because they become uploaded attachments with run-scoped locators, and `contextAttachmentPresentation.openAttachment(...)` routes non-`workspace_path` attachments through generic browser-open behavior instead of the file-explorer store.
- Clipboard-pasted image names also commonly appear as `image.png` because the browser clipboard `File` object usually exposes that generic filename, and the upload service intentionally preserves `file.filename` as `displayName`; the stored run-owned filename is separate and is not what the UI renders.
- User's final requirement is consistent behavior: render compact thumbnails for previewable image attachments and, on click, preview uploaded images in the same right-side Files/File Viewer area used by dragged local-image attachments. Non-image or failed-preview attachments should still fall back to filename chips.
- The authoritative UI boundary for that routing must remain `contextAttachmentPresentation`; message components should delegate the decision there rather than open-coding a file-explorer branch locally.
- Code review round 7 confirmed the current implementation still diverges from that target boundary: `UserMessage.vue` and `AppUserMessage.vue` each special-case uploaded-image thumbnail clicks with direct `fileExplorerStore.openFile(previewUrl, workspaceId)` branches, while `contextAttachmentPresentation.openAttachment(...)` still falls back to browser-open behavior for non-workspace attachments. That divergence is the active re-entry issue to close before code review can pass again.
- User preference locked: use server-generated stored filenames in routes instead of manifest-backed attachment IDs.

## Approval Update
- 2026-04-13: User approved the earlier run-scoped `context-files` direction.
- 2026-04-13: After follow-up discussion, user explicitly approved the simpler stored-filename route direction and instructed the team to continue without another requirements-return loop.
- 2026-04-13: User explicitly clarified the non-principle against legacy compatibility: keep code only if it is still used by supported areas; otherwise remove it.

## Notes For Architect Reviewer
- Requirements are revised and approved.
- The new authoritative direction is: draft staging + final run-owned storage + stored-filename routes + shared web attachment descriptor/open helper + explicit 24-hour draft cleanup + no composer-specific legacy compatibility while preserving still-used shared-media functionality.
