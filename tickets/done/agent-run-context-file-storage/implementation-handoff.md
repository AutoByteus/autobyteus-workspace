# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/tickets/done/agent-run-context-file-storage/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/tickets/done/agent-run-context-file-storage/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/tickets/done/agent-run-context-file-storage/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/tickets/done/agent-run-context-file-storage/design-review-report.md`

## What Changed

- Added server-side context-file draft/final owner descriptors, storage layout, upload/finalize/read/delete services, opportunistic 24h draft cleanup, and new REST routes under `/rest/context-files`, `/rest/drafts/.../context-files/...`, `/rest/runs/.../context-files/...`, and `/rest/team-runs/.../members/.../context-files/...`.
- Switched prompt/codex server-side local-path resolution from composer-specific `/rest/files/...` parsing to the new final context-file locator resolver only.
- Replaced the web `ContextFilePath` path-only shape with a shared discriminated attachment model:
  - `workspace_path`
  - `uploaded`
  - `external_url`
- Added shared web helpers for attachment modeling, presentation, send partitioning, and owner descriptor construction.
- Added a dedicated `contextFileUploadStore` for draft upload, draft delete, and finalize flows.
- Updated single-agent, agent-team, and application send flows to:
  - keep uploaded drafts as draft attachments before send
  - create/restore the run first
  - finalize draft attachments to final locators
  - append finalized attachments to conversation history
  - stream locators/images from the finalized attachment set
- Reworked the main composer and Socratic Math Teacher composer UI to use the new attachment model, shared presentation, draft deletion on removal, and upload-state send blocking.
- Updated user-message rendering and external user-message hydration to use attachment presentation instead of raw `.path` access.
- Added focused web/store tests and new server unit tests for context-file owner/locator behavior.

## Key Files Or Areas

- Server
  - `autobyteus-server-ts/src/api/rest/context-files.ts`
  - `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts`
  - `autobyteus-server-ts/src/context-files/store/context-file-layout.ts`
  - `autobyteus-server-ts/src/context-files/services/context-file-draft-cleanup-service.ts`
  - `autobyteus-server-ts/src/context-files/services/context-file-upload-service.ts`
  - `autobyteus-server-ts/src/context-files/services/context-file-finalization-service.ts`
  - `autobyteus-server-ts/src/context-files/services/context-file-read-service.ts`
  - `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts`
  - `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts`
  - `autobyteus-server-ts/tests/unit/context-files/context-file-owner-types.test.ts`
  - `autobyteus-server-ts/tests/unit/context-files/context-file-local-path-resolver.test.ts`
- Web
  - `autobyteus-web/types/conversation.ts`
  - `autobyteus-web/utils/contextFiles/contextAttachmentModel.ts`
  - `autobyteus-web/utils/contextFiles/contextAttachmentPresentation.ts`
  - `autobyteus-web/utils/contextFiles/contextAttachmentSend.ts`
  - `autobyteus-web/utils/contextFiles/contextFileOwner.ts`
  - `autobyteus-web/stores/contextFileUploadStore.ts`
  - `autobyteus-web/stores/agentRunStore.ts`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/stores/applicationRunStore.ts`
  - `autobyteus-web/composables/useContextAttachmentComposer.ts`
  - `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
  - `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
  - `autobyteus-web/components/conversation/UserMessage.vue`
  - `autobyteus-web/applications/socratic_math_teacher/components/AppContextFileArea.vue`
  - `autobyteus-web/applications/socratic_math_teacher/components/AppChatInput.vue`
  - `autobyteus-web/applications/socratic_math_teacher/components/AppInputForm.vue`
  - `autobyteus-web/applications/socratic_math_teacher/components/AppUserMessage.vue`
  - `autobyteus-web/applications/socratic_math_teacher/index.vue`
  - `autobyteus-web/stores/__tests__/contextFileUploadStore.spec.ts`
  - `autobyteus-web/applications/socratic_math_teacher/__tests__/app-context-file-area.spec.ts`

## Important Assumptions

- Draft uploads are owned by the currently active draft run/team-member scope at upload time and are finalized into the corresponding final owner during send.
- Historical run-history hydration for legacy `/rest/files/...` user attachments remains out of scope; those locators are treated as generic `external_url` attachments when seen in current web flows.
- Draft cleanup is opportunistic on upload/finalize/delete/read entrypoints and is not expected to remove files exactly at the 24-hour mark.
- The upload client still sends the multipart `owner` field alongside the file; the server now validates that the owner field is present before processing.

## Known Risks

- The code-review local-fix loop changes validated behavior in both the application upload path and draft-to-final finalize contract, so refreshed API/E2E validation is required before code review resumes.
- Full server build/typecheck remains blocked by pre-existing token-usage Prisma typing errors outside this ticket’s scope.
- Full web `nuxi typecheck` remains blocked by many unrelated pre-existing repo type issues outside this ticket’s scope.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Composer-specific `/rest/files/...` parsing/normalization was removed from the changed composer/runtime paths in scope.
  - Shared presentation/open/preview behavior now flows through `contextAttachmentPresentation` instead of per-surface path parsing.
  - Shared attachment-composer orchestration now lives in `autobyteus-web/composables/useContextAttachmentComposer.ts`, and `ContextFilePathInputArea.vue` is back under the hard limit (`426` effective non-empty lines).

## Environment Or Dependency Notes

- To run local checks in this worktree, temporary `node_modules` symlinks were created to the superrepo package installs and then removed; they are not part of the implementation diff.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` now clears the new context-file implementation files, but still fails on pre-existing Prisma/token-usage typing issues:
  - `src/token-usage/converters/prisma-converter.ts`
  - `src/token-usage/repositories/sql/token-usage-record-repository.ts`
- `pnpm -C autobyteus-server-ts typecheck` also still hits pre-existing `rootDir`/`tests` config noise unrelated to this ticket.
- `pnpm -C autobyteus-web exec nuxi typecheck` still hits many unrelated existing web type issues outside the changed attachment/files scope.

## Validation Hints / Suggested Scenarios

- Single-agent composer
  - Add workspace paths, add browser uploads, remove uploaded drafts before send, then send and confirm final `/rest/runs/:runId/context-files/:storedFilename` locators stream correctly.
- Team composer
  - Upload files for one focused member, switch focus, confirm drafts stay with the original member context, then send from each member scope and verify final team-member locators.
- Application composer
  - Upload and remove files in the Socratic Math Teacher app, switch focused members while an upload is still pending, then send and confirm the finalized team-member locators are appended/rendered correctly.
- Rendering/open behavior
  - Open workspace attachments, uploaded attachments, and generic external URLs from both standard conversation and application conversation UI.
- Runtime consumption
  - Confirm codex/prompt backends resolve only the new final context-file locators to local filesystem paths and do not use composer `/rest/files/...` parsing.
- Cleanup
  - Verify draft delete happens immediately on composer removal for uploaded drafts and that stale draft cleanup is opportunistically triggered on upload/finalize/delete/read entrypoints.
- Finalize label preservation
  - Upload a file whose stored filename will be sanitized (spaces / punctuation), send it, and confirm the final attachment label still matches the original uploaded filename.

## What Needs Validation

- End-to-end REST upload/finalize/delete behavior against the running server for both standalone and team-member owners.
- Recheck stale draft cleanup on draft read entrypoints after aging files beyond TTL.
- Recheck pending-upload focus switches in the Socratic Math Teacher application composer using the real `AppContextFileArea.vue` leaf.
- Recheck finalize display-name preservation for sanitized filenames end-to-end, not just at the REST integration layer.
- Finalized attachment replay in live streaming plus UI hydration for new messages.
- Manual confirmation that historical legacy `/rest/files/...` run-history user attachments remain forward-only out of scope and are not silently reintroduced through new compatibility seams.
- Repo-wide typecheck status should remain classified as pre-existing blockage unless downstream validation finds a ticket-scoped regression.

### Local Fix Loop Update (post validation round 1)

Applied fixes for `api_e2e_engineer` local-fix findings:
- `AV-003`: `ContextFileReadService.getDraftFilePath()` and `getFinalFilePath()` now invoke `cleanupExpiredDrafts()` before file resolution, so stale drafts are pruned on read entrypoints.
- `AV-004`: application composer draft state is now keyed by focused member route key in `applications/socratic_math_teacher/index.vue`, and `applicationRunStore.sendMessageToApplication()` accepts stable caller-provided `targetMemberRouteKey` / `draftOwner` options so finalize/send no longer drift if focus changes after draft creation.

Additional validation rerun after fixes:
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-server-ts exec vitest --run tests/integration/api/rest/context-files.integration.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-web exec vitest --run applications/socratic_math_teacher/__tests__/application-composer-focus-ownership.spec.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-server-ts exec vitest --run tests/unit/context-files/context-file-owner-types.test.ts tests/unit/context-files/context-file-local-path-resolver.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-web exec vitest --run stores/__tests__/applicationRunStore.spec.ts` ✅

### Local Fix Loop Update (post code review round 1)

Applied fixes for `code_reviewer` local-fix findings:
- `LF-001`: extracted shared composer attachment orchestration into `autobyteus-web/composables/useContextAttachmentComposer.ts`; `AppContextFileArea.vue` now captures a stable target bucket key/owner at upload start and commits late upload results back through a parent-provided target updater, so focused-member switches no longer steal in-flight uploads.
- `LF-002`: draft-to-final finalize now sends `{ storedFilename, displayName }` descriptors instead of bare stored filenames; `ContextFileFinalizationService` preserves the original uploaded `displayName` through finalize, and the web finalize store test plus REST integration test now cover sanitization-stressing filenames.
- `LF-003`: `ContextFilePathInputArea.vue` now reuses the shared attachment-composer composable and is back under the hard limit (`426` effective non-empty lines); `AppContextFileArea.vue` also reuses the same orchestration owner instead of carrying a divergent copy.

Focused reruns after code-review fixes:
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-server-ts exec vitest --run tests/integration/api/rest/context-files.integration.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-web exec vitest --run applications/socratic_math_teacher/__tests__/application-composer-focus-ownership.spec.ts applications/socratic_math_teacher/__tests__/app-context-file-area.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts stores/__tests__/contextFileUploadStore.spec.ts` ✅

### Low-Effort Follow-Up Update (Electron-native app drop parity)

Approved follow-up scope implemented as a frontend-only correction to restore Electron-native local-file drag/drop parity in the application-specific composer UI.

Changed files:
- `autobyteus-web/applications/socratic_math_teacher/components/AppContextFileArea.vue`
- `autobyteus-web/applications/socratic_math_teacher/__tests__/app-context-file-area.spec.ts`
- `tickets/done/agent-run-context-file-storage/implementation-handoff.md`

What changed:
- `AppContextFileArea.vue` now mirrors the standard composer’s embedded-Electron native-file drop behavior.
- When running in embedded Electron and OS files are dropped, the app composer now resolves each dropped file through `window.electronAPI.getPathForFile(...)` and appends workspace/local-path attachments via `appendWorkspaceLocators(...)`.
- Browser-style file blobs still keep the existing uploaded-context-file staging flow for upload button selection, clipboard file paste, and non-Electron/browser drag-drop paths.
- No server or finalize/send-path changes were needed for this follow-up.

Focused frontend checks:
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-web exec vitest --run applications/socratic_math_teacher/__tests__/app-context-file-area.spec.ts applications/socratic_math_teacher/__tests__/application-composer-focus-ownership.spec.ts` ✅

Residual issues / notes:
- This follow-up only restores Electron-native drag/drop parity for the app-specific composer leaf. Upload-button, paste, and browser drag/drop behavior intentionally remain on the uploaded-file staging/finalization path.
- Repo-wide web typecheck remains outside this low-effort scope and is still blocked by unrelated pre-existing issues noted above.

### Local Fix Loop Update (post follow-up code review round 4)

Applied fixes for `code_reviewer` local-fix finding:
- `LF-004`: `autobyteus-web/applications/socratic_math_teacher/components/AppContextFileArea.vue` now captures the current composer target before awaiting `window.electronAPI.getPathForFile(...)` and passes that stable target into `appendWorkspaceLocators(nativePaths, target)`, so Electron native-drop attachments stay with the original focused-member bucket even if focus changes while path resolution is in flight.

Focused regression coverage added:
- `autobyteus-web/applications/socratic_math_teacher/__tests__/app-context-file-area.spec.ts`
  - existing Electron native-drop happy path still covered
  - new unresolved `getPathForFile(...)` focus-switch regression proves attachments remain on the original member bucket

Focused rerun after `LF-004`:
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-web exec vitest --run applications/socratic_math_teacher/__tests__/app-context-file-area.spec.ts applications/socratic_math_teacher/__tests__/application-composer-focus-ownership.spec.ts` ✅

### Frontend Enhancement Update (message-surface image thumbnails)

Approved frontend-only enhancement implemented inside the existing `contextAttachmentPresentation` / message-UI boundary.

Changed files:
- `autobyteus-web/components/conversation/UserMessage.vue`
- `autobyteus-web/applications/socratic_math_teacher/components/AppUserMessage.vue`
- `autobyteus-web/components/conversation/__tests__/UserMessage.spec.ts`
- `autobyteus-web/applications/socratic_math_teacher/__tests__/app-user-message.spec.ts`

What changed:
- Previewable image attachments in user-message surfaces now render as compact thumbnails instead of filename-only chips.
- Both message surfaces reuse `contextAttachmentPresentation.resolveImagePreviewUrl(...)`.
- `contextAttachmentPresentation.openAttachment(...)` is now the single authoritative frontend open/preview boundary for these message-surface attachments.
- Both message surfaces now stay thin: they render thumbnails/chips, then delegate all click routing decisions to the shared helper.
- The shared helper now owns the File Viewer preview branch via `openFilePreview(...)` for previewable non-workspace images when `preferFileViewerForPreviewableImages` is enabled.
- Clicking a previewable uploaded-image thumbnail still routes into the right-side Files/File Viewer path, but that decision now lives in the shared helper instead of component-local branches.
- Non-image attachments still render as filename chips.
- Image attachments whose preview URL cannot be resolved, or whose image preview fails to load, fall back to the same filename-chip rendering.
- Non-image chips and failed-preview image chips still use the normal attachment open behavior.
- No modal preview path was added for sent-message uploaded-image thumbnails.
- No Artifacts-panel or artifact-tab bridge was introduced.

Additional focused helper coverage:
- `autobyteus-web/utils/contextFiles/__tests__/contextAttachmentPresentation.spec.ts`
  - workspace-path attachments still route through `openWorkspaceFile(...)`
  - previewable uploaded/external images route through `openFilePreview(...)` when preferred
  - failed-preview images fall back to browser-open behavior

Focused frontend checks:
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-context-file-storage/autobyteus-web exec vitest --run utils/contextFiles/__tests__/contextAttachmentPresentation.spec.ts components/conversation/__tests__/UserMessage.spec.ts applications/socratic_math_teacher/__tests__/app-user-message.spec.ts applications/socratic_math_teacher/__tests__/app-context-file-area.spec.ts applications/socratic_math_teacher/__tests__/application-composer-focus-ownership.spec.ts` ✅

Residual notes:
- This enhancement is frontend-only and does not modify any upload, finalize, storage, or backend behavior.
- Repo-wide web typecheck remains outside this scope and is still blocked by unrelated pre-existing issues noted above.
