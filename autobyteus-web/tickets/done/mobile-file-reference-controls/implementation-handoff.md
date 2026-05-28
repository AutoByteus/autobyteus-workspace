# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls/autobyteus-web/tickets/done/mobile-file-reference-controls/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls/autobyteus-web/tickets/done/mobile-file-reference-controls/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls/autobyteus-web/tickets/done/mobile-file-reference-controls/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls/autobyteus-web/tickets/done/mobile-file-reference-controls/design-review-report.md`

## What Changed

- Added a mobile workspace-file adapter in `composables/mobile/useMobileWorkspaceFileExplorer.ts`.
  - Resolves the selected mobile context's workspace by explicit workspace id/root path.
  - Uses `runHistoryStore.ensureWorkspaceByRootPath()` where appropriate instead of falling back to an unrelated active/first workspace.
  - Delegates folder lazy loading to `workspaceStore.fetchFolderChildren()`.
  - Delegates full-workspace search and file-open state to `fileExplorerStore.searchFiles()` / `openFilePreview()`.
  - Provides mobile folder/search/open error/loading state for phone UI feedback.
- Reworked `components/mobile/MobileFiles.vue` into phone presentation over the adapter.
  - Shows scoped unavailable/loading states when selected run/team workspace cannot be resolved.
  - Loads unloaded folder children before entering folders.
  - Uses real workspace-wide search when full-workspace search is enabled.
  - Opens selected files into the mobile viewer with authoritative `OpenFileState`.
- Reworked `components/mobile/MobileFileViewer.vue`.
  - Renders read-only workspace file content through the shared `FileViewer` so image/audio/video/PDF/CSV/Excel/text families use existing protected-resource viewer paths.
  - Keeps HTML workspace files in raw read-only mode on mobile to avoid static iframe auth risk.
  - Preserves the mobile `Attach` affordance via `useMobileFileContextCoordinator.attachWorkspaceFile()`.
- Narrowed `composables/mobile/useMobileFileContextCoordinator.ts` back to attachment-context coordination by removing mobile text-only preview policy from that coordinator.
- Added Team Communication reference presentation reuse.
  - New helper: `utils/teamCommunication/referenceFilePresentation.ts`.
  - Desktop `TeamCommunicationPanel.vue` now consumes the helper without changing split-pane behavior.
- Added mobile Team Communication reference viewing.
  - `MobileTeamMessages.vue` now renders structured `message.referenceFiles[]` as tappable rows.
  - New `MobileTeamReferenceViewer.vue` wraps the existing `TeamCommunicationReferenceViewer.vue` in a phone full-screen shell.
  - `TeamCommunicationReferenceViewer.vue` gained `disableRichTextPreview` so mobile can force HTML references to raw authorized content while desktop keeps existing preview behavior.
- Added focused unit/source-guard coverage for mobile files, mobile file viewer, mobile team reference rows/viewer, desktop reference no-regression, and mobile Artifacts no-regression.

## Key Files Or Areas

- `components/mobile/MobileFiles.vue`
- `components/mobile/MobileFileViewer.vue`
- `components/mobile/MobileTeamMessages.vue`
- `components/mobile/MobileTeamReferenceViewer.vue`
- `composables/mobile/useMobileWorkspaceFileExplorer.ts`
- `composables/mobile/useMobileFileContextCoordinator.ts`
- `utils/teamCommunication/referenceFilePresentation.ts`
- `components/workspace/team/TeamCommunicationPanel.vue`
- `components/workspace/team/TeamCommunicationReferenceViewer.vue`
- Tests:
  - `components/mobile/__tests__/MobileFiles.spec.ts`
  - `components/mobile/__tests__/MobileFileViewer.spec.ts`
  - `components/mobile/__tests__/MobileTeamMessages.spec.ts`
  - updated `components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
  - updated `components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts`

## Important Assumptions

- Android uses the served `/mobile` web shell, so this implementation targets mobile web-shell code rather than native Android file controls.
- Existing protected REST/GraphQL credential paths remain valid for `/rest/workspaces/...` and `/rest/team-runs/...` content routes.
- Existing shared `FileViewer` child viewers remain the authoritative renderers for supported read-only content families; mobile owns wrapper/layout and raw HTML safety choice.
- Team Communication reference files are structured `message.referenceFiles[]` entries, not raw prose paths.

## Known Risks

- Phone viewport/API-E2E validation is still needed for actual media/PDF/Excel sizing inside reused shared viewers.
- Android/WebView validation must confirm the served `/mobile` bundle is fresh; the local `build:mobile-web` check produced fresh ignored assets under `dist-mobile/public`, but no delivery finalization was performed here.
- Existing repository-wide `nuxi typecheck` remains blocked by broad pre-existing TypeScript issues outside this change. A final filtered run showed no changed-file matches, but the command still exits non-zero globally.
- Existing `workspaceStore.fetchFolderChildren()` can log/return on failures; mobile now infers failure when a folder remains unloaded after the fetch call, but API/E2E should still exercise backend failure/loading behavior.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix / mobile parity behavior change
- Reviewed root-cause classification: Boundary Or Ownership Issue / File Placement Or Responsibility Drift
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: File browsing/search/opening now flows through the mobile workspace-file adapter over existing workspace/file-explorer stores. Team references now flow through structured message references and the existing Team Communication reference viewer. Attachment targeting remains isolated in the mobile context coordinator.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Removed text-only preview functions from `useMobileFileContextCoordinator.ts`, replaced count-only reference UI with tappable rows, and removed unsafe first-workspace fallback behavior from mobile Files. Changed implementation files are under 500 effective non-empty lines. The larger `MobileFiles.vue` rewrite and new adapter were assessed; responsibilities were split between presentation (`MobileFiles.vue`), adapter (`useMobileWorkspaceFileExplorer.ts`), viewer (`MobileFileViewer.vue`), and Team Communication wrapper/helper files.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` to restore workspace dependencies in this worktree.
- Ran `pnpm exec nuxi prepare` to generate `.nuxt` metadata before tests/typecheck/build.
- `pnpm run build:mobile-web` generated ignored build outputs in `dist/` and `dist-mobile/`; these are not intended as source changes.
- No server contracts or dependencies were changed.

## Local Implementation Checks Run

- `pnpm exec vitest run components/mobile/__tests__/MobileFileViewer.spec.ts components/mobile/__tests__/MobileFiles.spec.ts components/mobile/__tests__/MobileTeamMessages.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileArtifacts.spec.ts components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts`
  - Result: Passed, 8 files / 43 tests.
- `pnpm run guard:web-boundary`
  - Result: Passed.
- `pnpm run guard:localization-boundary`
  - Result: Passed.
- `pnpm run audit:localization-literals`
  - Result: Passed with zero unresolved findings.
- `pnpm run build:mobile-web`
  - Result: Passed. Noted existing bundle-size warnings and one existing dynamic/static import chunking warning for file explorer queries.
- `pnpm exec nuxi typecheck`
  - Result: Failed due existing repo-wide TypeScript issues outside this change (examples include build scripts, settings tests, store tests, unrelated stores, and generated Apollo typing). Final filtered output had no changed-file matches.

## Downstream Validation Hints / Suggested Scenarios

- Phone-width `/mobile` Files tab:
  - workspace context shows correct root rows;
  - active/historical agent-run and team-run contexts resolve by selected workspace root;
  - unresolved run/team root shows scoped unavailable state and does not display another workspace's files.
- Folder browsing:
  - tap an unloaded folder and confirm `fetchFolderChildren(workspaceId, folderPath)` runs and returned children render;
  - exercise backend folder-fetch failure and confirm visible retry/error feedback.
- Full-workspace search:
  - enable full-workspace search, search for an unloaded file, and confirm `SearchFiles` results render.
- Mobile file viewing:
  - open text, Markdown, HTML, image, audio, video, PDF, CSV, and Excel workspace files;
  - confirm protected media/PDF/Excel URLs are loaded through authorized fetch/object URL paths;
  - confirm HTML renders raw/read-only on mobile rather than static iframe preview.
- Attach:
  - attach a viewed workspace file to an active agent run, pending team run, and draft launch context; confirm no duplicate attachments.
- Team Communication references:
  - messages with structured `referenceFiles[]` show tappable rows;
  - tapping a reference opens by `{ teamRunId, messageId, referenceId }` and fetches `/rest/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` with mobile auth;
  - closing returns to the same message list/focused member perspective.
- No-regression:
  - desktop `TeamCommunicationPanel` reference buttons still open the existing viewer;
  - mobile Artifacts tab remains run-file-change-owned and unchanged;
  - source guards continue to reject desktop split-pane/Electron imports in mobile code.

## API / E2E / Executable Validation Still Required

- Required before delivery: API/E2E/mobile-runtime validation in a phone-width browser and Android/WebView-equivalent served `/mobile` environment.
- Required before delivery: confirm mobile bundle freshness from the served desktop/server node, not only local source/build output.
- Required before delivery: broader executable validation should classify any viewer sizing/auth/runtime failures and route local fixes back through code review if repository-resident validation or implementation changes are added.
