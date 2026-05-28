# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Make the Android/phone `/mobile` file-related controls usable with phone-first presentation while preserving desktop web behavior and the already-working mobile Artifacts tab.

Two reported gaps are in scope:

1. Mobile `Files`/file explorer does not reliably expose the selected workspace's files and folders, and file taps do not provide the same practical content-viewing capability users expect from Artifacts.
2. Team communication message `reference_files` are clickable on desktop web but are inert on mobile; the mobile message view only reports a reference-file count.

The target is functional mobile parity by responsibility, not a desktop layout copy. Mobile should browse/select/view workspace files and tap/view team-message reference files through existing authoritative file and team-communication content owners, displayed in mobile-friendly sheets/full-screen views.

## Investigation Findings

- Mobile shell already includes a `Files` tab and a working `Artifacts` tab (`MobileWorkShell.vue`, `MobileFiles.vue`, `MobileArtifacts.vue`).
- `MobileFiles.vue` uses its own local folder stack and local file-node type, but it does not call `workspaceStore.fetchFolderChildren()` when opening unloaded folders. Desktop `FileItem.vue` does call `fetchFolderChildren()` through the workspace-scoped file explorer boundary.
- `MobileFiles.vue` currently falls back to `workspaceStore.activeWorkspace` or the first workspace when a run context's workspace root cannot be matched. That can show no files or the wrong workspace instead of preserving selected-run scoping.
- Mobile workspace-wide/deep search currently flattens only the already-loaded in-memory tree; it does not use the existing `fileExplorerStore.searchFiles()` / `SearchFiles` query that desktop uses for full workspace search.
- `MobileFileViewer.vue` and `useMobileFileContextCoordinator.ts` intentionally support only text/code/Markdown paths. Existing file viewer infrastructure can display image/audio/video/PDF/CSV/Excel, and protected media resource viewers already route protected REST URLs through authorized object URLs.
- Desktop team-reference behavior is implemented in `TeamCommunicationPanel.vue` as sibling reference-file buttons that select `TeamCommunicationReferenceViewer.vue`. The viewer fetches content from the message-owned REST route `/rest/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` with `authorizedFetch`.
- `MobileTeamMessages.vue` renders message summaries and a plain count such as `1 reference file`; it renders no reference row/button and no viewer. This is the direct reason mobile reference files cannot be clicked.
- Server route policy already treats `/rest/workspaces/...` and `/rest/team-runs/...` as protected REST families. The mobile Apollo/fetch transport attaches the Phone Access bearer credential, so the required data/content routes are already compatible with mobile credentials.
- Android native code primarily hosts the served `/mobile` web shell in a WebView. No native Android file-control root cause was found in the current read; this change should primarily target the mobile web shell and then verify the served mobile bundle on Android/WebView.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / mobile parity behavior change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Mobile Files bypasses folder-child loading/search/content-viewing behavior owned by workspace/file-explorer services and contains preview policy inside an attachment coordinator. Mobile Team Messages bypasses the team-reference row/viewer path entirely and collapses references to a non-interactive count.
- Requirement or scope impact: Add mobile-owned presentation surfaces that delegate to existing file-explorer and team-communication content owners. Refactor small shared/mobile-specific helpers so the fix does not duplicate desktop split-pane layout or bury file preview policy in the attachment coordinator.

## Recommendations

- Keep `MobileFiles.vue` as the phone-first browser, but route workspace resolution, lazy folder loading, workspace-wide search, and file-open state through a mobile file-explorer composable that delegates to `workspaceStore`/`fileExplorerStore`.
- Update mobile file viewing to support the same major read-only content families that the existing `FileViewer`/viewer components support: text/code/Markdown, image, audio, video, PDF, CSV, and Excel, using authorized resource loading for protected REST URLs.
- Do not expose mobile file editing in this change. Preserve the existing `Attach` action for workspace files but keep viewing read-only.
- Add tappable reference-file rows to `MobileTeamMessages.vue` and open them in a mobile full-screen/sheet wrapper around the existing `TeamCommunicationReferenceViewer.vue`.
- Extract reusable team-reference presentation helpers (file display name and icon/type mapping) so desktop and mobile render references consistently without duplicating policy.
- Add focused component/unit tests and mobile-width runtime validation for file browse, file open, reference row click, reference viewer content route, no stale workspace/run leakage, desktop no-regression, and mobile Artifacts no-regression.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-MFRC-001: A phone/Android user opens mobile `Files` for a selected workspace, agent run, or team run and sees the correct workspace's root files/folders.
- UC-MFRC-002: A phone/Android user taps folders in mobile `Files` and can navigate into lazily loaded children.
- UC-MFRC-003: A phone/Android user searches or filters files and can use a real workspace-wide search path when requested.
- UC-MFRC-004: A phone/Android user taps a file in mobile `Files` and views supported content in a read-only mobile surface.
- UC-MFRC-005: A phone/Android user reads team communication messages containing `reference_files` and can tap each reference file.
- UC-MFRC-006: A phone/Android user who taps a reference file opens a mobile-usable preview/content view without losing the current team-message context.
- UC-MFRC-007: Existing desktop web file explorer/reference-file behavior and existing mobile Artifacts behavior remain functional.

## Out of Scope

- Redesigning desktop file explorer layout or desktop Team Communication split-pane layout.
- Moving `reference_files` into the Artifacts tab or treating team-message references as run artifacts.
- Changing artifact semantics, artifact persistence, or `runFileChangesStore` behavior.
- Changing server file/reference-file persistence contracts.
- Mobile file editing, rename/delete/move/create operations, or desktop-equivalent context menus.
- Building a native Android file explorer or native Android file picker for workspace browsing. Android continues to host the served `/mobile` web shell.
- Adding offline caching/service-worker behavior for protected file/reference content.

## Functional Requirements

- REQ-MFRC-001: Mobile Files must resolve the workspace for the current `MobileWorkContext` without falling back to an unrelated workspace when a run/workspace context declares a specific workspace identity or root path.
- REQ-MFRC-002: Mobile Files must render a phone-first browse surface over the authoritative workspace tree owned by `workspaceStore`.
- REQ-MFRC-003: Mobile Files must lazily load folder children through the existing `workspaceStore.fetchFolderChildren(workspaceId, folderPath)` path when a user opens an unloaded folder.
- REQ-MFRC-004: Mobile Files must support workspace-wide search through the existing `fileExplorerStore.searchFiles(query, workspaceId)` / `SearchFiles` boundary rather than only flattening already-loaded nodes.
- REQ-MFRC-005: Mobile file selection must open supported file content in a read-only mobile surface using the existing file-explorer content state and protected-resource authorization helpers.
- REQ-MFRC-006: Mobile file viewing must support at least the content families already supported by shared file viewers where mobile-safe: text/code/Markdown raw view, image, audio, video, PDF, CSV, and Excel. Unsupported cases must show an explicit phone-readable state.
- REQ-MFRC-007: Mobile file viewing must retain the existing mobile `Attach` affordance for workspace files, scoped to the active run, pending team run, or mobile draft as currently defined.
- REQ-MFRC-008: Mobile team messages must render each structured `message.referenceFiles[]` entry as a tappable control, not only a count.
- REQ-MFRC-009: Tapping a mobile team-message reference file must open content through the message-owned team-communication reference route and viewer, not through run artifacts or workspace-path guessing.
- REQ-MFRC-010: Mobile reference viewing must preserve the current team run, focused member perspective, selected message, and reference context while allowing the user to close/back out to the message list.
- REQ-MFRC-011: Desktop Team Communication reference-file behavior must keep using sibling reference buttons and the existing message-owned viewer.
- REQ-MFRC-012: Existing mobile Artifacts behavior must remain unchanged: artifacts stay run-file-change-owned and continue to use `ArtifactContentViewer`.
- REQ-MFRC-013: Mobile file/reference controls must not import desktop shell/split-pane containers such as `FileExplorerLayout`, `FileExplorerTabs`, `TeamCommunicationPanel`, `RightSideTabs`, or `BrowserPanel`.

## Acceptance Criteria

- AC-MFRC-001: In a phone-width viewport or Android WebView, selecting a workspace or run with workspace files and opening `Files` shows the correct workspace root entries.
- AC-MFRC-002: Tapping an unloaded folder in mobile `Files` triggers `fetchFolderChildren()` for the selected workspace and displays the returned children.
- AC-MFRC-003: If a selected run context's workspace root cannot be resolved, mobile Files shows an explicit unavailable/loading state instead of displaying a different workspace.
- AC-MFRC-004: Workspace-wide mobile search invokes the existing file search query and can show matches that were not already present in the loaded tree.
- AC-MFRC-005: Tapping supported text/code/Markdown files opens a readable mobile content view.
- AC-MFRC-006: Tapping supported image/PDF/CSV/Excel/audio/video files opens a mobile view backed by authorized protected-resource loading.
- AC-MFRC-007: Tapping `Attach` from the mobile file viewer still attaches the selected workspace file to the correct active-run, pending-team-run, or draft target and does not duplicate attachments.
- AC-MFRC-008: Mobile team messages with one or more `referenceFiles` render visible tappable reference rows with a display name and file-type icon/marker.
- AC-MFRC-009: Tapping a mobile reference row opens a mobile viewer that fetches `/rest/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` with mobile authorization.
- AC-MFRC-010: Closing the mobile reference viewer returns to the same mobile message list/perspective.
- AC-MFRC-011: Existing desktop `TeamCommunicationPanel` tests for sibling reference buttons and selected reference viewer still pass.
- AC-MFRC-012: Existing mobile Artifacts tests/runtime checks still pass and artifacts remain separate from team-message reference files.
- AC-MFRC-013: Source guards or equivalent tests confirm mobile code does not pull in desktop shell/split-pane containers or Electron APIs.

## Constraints / Dependencies

- Must respect the existing `/mobile` Phone Access bearer credential path for GraphQL, REST, and WebSocket calls.
- Must reuse `workspaceStore`, `fileExplorerStore`, `useWorkspaceFileExplorer`, `TeamCommunicationReferenceViewer`, `teamCommunicationStore`, and existing protected-resource helpers where they are authoritative.
- Must preserve desktop web behavior and not change server contracts unless implementation discovers a blocker not found in this investigation.
- Mobile file/reference viewers must be read-only for this scope.
- Mobile code must remain Electron-free (`window.electronAPI` is forbidden in `/mobile` paths).

## Assumptions

- The Android application loads the same served `/mobile` web shell as phone browsers, so web-shell fixes address Android once the mobile bundle served by the desktop/server node is refreshed.
- The user's `reference files` are the structured Team Communication `referenceFiles` created from `send_message_to.reference_files`, not raw paths inside message prose.
- Existing server-side file-content and team-reference-content routes are sufficient for mobile once the mobile UI exposes the controls correctly.

## Risks / Open Questions

- HTML preview paths in shared viewers can depend on static workspace URLs; implementation should avoid unauthenticated iframe/static usage for mobile or route such preview through authorized blob/content handling.
- Very large text/binary files may need explicit mobile size/loading limits; the requirement is a clear supported/unsupported/error state, not unrestricted full-file editing.
- Physical Android validation can still fail if the desktop/server node is serving a stale `/mobile` bundle; delivery must include mobile-bundle freshness evidence.

## Requirement-To-Use-Case Coverage

- REQ-MFRC-001 -> UC-MFRC-001, UC-MFRC-007
- REQ-MFRC-002 -> UC-MFRC-001
- REQ-MFRC-003 -> UC-MFRC-002
- REQ-MFRC-004 -> UC-MFRC-003
- REQ-MFRC-005 -> UC-MFRC-004
- REQ-MFRC-006 -> UC-MFRC-004
- REQ-MFRC-007 -> UC-MFRC-004
- REQ-MFRC-008 -> UC-MFRC-005
- REQ-MFRC-009 -> UC-MFRC-006
- REQ-MFRC-010 -> UC-MFRC-006
- REQ-MFRC-011 -> UC-MFRC-007
- REQ-MFRC-012 -> UC-MFRC-007
- REQ-MFRC-013 -> UC-MFRC-007

## Acceptance-Criteria-To-Scenario Intent

- AC-MFRC-001/002/003 validate correct mobile workspace scoping and folder browsing.
- AC-MFRC-004 validates real workspace-wide file discovery.
- AC-MFRC-005/006 validate mobile file content viewing across supported content families.
- AC-MFRC-007 validates existing mobile attachment behavior remains intact.
- AC-MFRC-008/009/010 validate mobile team-message reference-file click/view behavior.
- AC-MFRC-011/012/013 validate no regression and no unsupported desktop/Electron boundary imports.

## Approval Status

Design-ready from the user's explicit request that both mobile Files and mobile reference files should work, with phone-first display design. Scope excludes mobile file editing and server-contract changes unless downstream implementation finds a blocker.
