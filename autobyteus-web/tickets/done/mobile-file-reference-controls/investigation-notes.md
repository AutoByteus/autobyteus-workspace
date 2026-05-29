# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Current-state read complete; design produced
- Investigation Goal: Determine why mobile Files and team-message reference files are not usable/clickable on Android/mobile while desktop reference files and mobile Artifacts work, then define a phone-first design.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The task spans mobile shell UI, workspace/file-explorer state, file content viewing, team communication message rendering, protected mobile REST/GraphQL authorization, and no-regression constraints for desktop and mobile Artifacts.
- Scope Summary: Fix mobile file explorer display/navigation/content viewing and mobile team communication reference-file click/view behavior.
- Primary Questions Resolved:
  - Current mobile Files has a local browse surface but bypasses lazy folder loading, true workspace-wide search, and broad content viewing.
  - Desktop reference files are sibling buttons in `TeamCommunicationPanel.vue` that open `TeamCommunicationReferenceViewer.vue`.
  - Mobile team messages render only a reference count and no reference controls/viewer.
  - Existing protected REST/GraphQL transport is mobile-compatible; the gaps are frontend mobile presentation/boundary reuse issues.

## Request Context

User reports Android/mobile has a working Artifacts tab where tapping an artifact opens content, but mobile Files/file explorer does not show files or allow clicking, and team communication `reference_files` in exchanges/messages are clickable on desktop web but not clickable on mobile. The user expects both to work on mobile, with attention to mobile display design rather than copying desktop UI.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls/autobyteus-web/tickets/mobile-file-reference-controls`
- Current Branch: `codex/mobile-file-reference-controls`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-28.
- Task Branch: `codex/mobile-file-reference-controls`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative artifacts are in the dedicated task worktree/branch, not the shared `personal` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-28 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Identify starting repo/worktree state | Starting checkout was shared `personal` branch at superrepo root with `origin` remote. | No |
| 2026-05-28 | Command | `git remote show origin` | Resolve tracked remote default/base branch | Remote HEAD branch is `personal`. | No |
| 2026-05-28 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task worktree creation | Fetch completed successfully. | No |
| 2026-05-28 | Command | `git worktree add -b codex/mobile-file-reference-controls /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls origin/personal` | Create dedicated task worktree/branch | Worktree created and branch tracks `origin/personal`; HEAD at `56c6d4bf`. | No |
| 2026-05-28 | Code/Doc | `autobyteus-web/tickets/done/mobile-artifacts-tab/*` | Understand recently delivered working mobile Artifacts pattern and constraints | Mobile Artifacts reused shared `runFileChangesStore`, `ArtifactContentViewer`, and mobile focused-run identity composable; prior validation included Android stale-runtime/bundle risk. | Use as design precedent; preserve Artifacts behavior. |
| 2026-05-28 | Command | `rg -n "MobileFiles|reference_files|referenceFiles|ReferenceFile|reference file|ReferenceFiles|FileExplorer|file explorer" autobyteus-web/...` | Locate mobile Files and team reference code paths | Relevant paths include `MobileFiles.vue`, `MobileFileViewer.vue`, `MobileTeamMessages.vue`, `TeamCommunicationPanel.vue`, `TeamCommunicationReferenceViewer.vue`, `teamCommunicationStore.ts`, `fileExplorer.ts`, `workspace.ts`, and docs. | No |
| 2026-05-28 | Code | `autobyteus-web/components/mobile/MobileWorkShell.vue` | Confirm current mobile shell tab ownership | Shell has `Chat`, `Runs`, `Files`, `Artifacts`, `Activity`; team focus bar visible outside Runs. | Preserve tab set and Artifacts. |
| 2026-05-28 | Code | `autobyteus-web/components/mobile/MobileFiles.vue` | Inspect mobile file browser implementation | Local `folderStack`, local `MobileFileNode`, `previewNode`; `openNode()` only pushes folders or opens preview. It does not call `workspaceStore.fetchFolderChildren()` for unloaded folders. Active workspace fallback can use active/first workspace when context root is not matched. Deep search flattens loaded tree only. | Design mobile workspace/file explorer composable and lazy load/search fixes. |
| 2026-05-28 | Code | `autobyteus-web/components/mobile/MobileFileViewer.vue` | Inspect mobile file content behavior | Full-screen mobile viewer exists with Back/Attach, but preview support is text/code/Markdown only via `useMobileFileContextCoordinator`; binary/PDF/image/video/audio/spreadsheet paths show unsupported even though shared viewers exist. | Design broader read-only viewer using existing content/viewer owners. |
| 2026-05-28 | Code | `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts` | Inspect mobile file preview/attachment owner | Coordinator owns attachment target policy plus preview support/openPreview/getPreviewState. Preview policy is mixed into attachment coordination and limited to text extensions. It duplicates active-run checks similar to focused-run guard for attachment purposes. | Keep attachment concerns; move file browsing/viewing concerns to a dedicated mobile workspace-file owner. |
| 2026-05-28 | Code | `autobyteus-web/components/fileExplorer/FileExplorer.vue`; `autobyteus-web/components/fileExplorer/FileItem.vue`; `autobyteus-web/composables/useWorkspaceFileExplorer.ts` | Compare desktop file explorer behavior | Desktop file item toggles folders and calls `workspaceStore.fetchFolderChildren(wsId, props.file.path)` when opening unloaded folders. File actions are workspace-scoped through `useWorkspaceFileExplorer`. | Mobile should use the same workspace/file-explorer authority instead of a parallel local folder loader. |
| 2026-05-28 | Code | `autobyteus-web/stores/workspace.ts` | Inspect workspace tree ownership and lazy folder loading | `fetchAllWorkspaces` stores `WorkspaceInfo.fileExplorer`; `fetchFolderChildren` calls GraphQL `GetFolderChildren`, updates `nodeIdToNode`, replaces children, and sets `childrenLoaded=true`; file-system watcher updates workspace tree. | Mobile should call this owner for unloaded folders and observe store updates. |
| 2026-05-28 | Code | `autobyteus-web/stores/fileExplorer.ts`; `autobyteus-web/graphql/queries/file_explorer_queries.ts` | Inspect file content/search owners | `openFilePreview`/`openFile` create `OpenFileState`; text content uses GraphQL `GetFileContent`; media/PDF/Excel create `/rest/workspaces/:workspaceId/content?path=...`; `searchFiles` uses GraphQL `SearchFiles`. | Mobile should reuse state and search boundary; protected resource display must use authorization helpers. |
| 2026-05-28 | Code | `autobyteus-web/components/fileExplorer/FileViewer.vue`; `autobyteus-web/components/fileExplorer/viewers/*.vue`; `autobyteus-web/composables/useAuthorizedObjectUrl.ts`; `autobyteus-web/utils/remoteAccess/authorizedResourceUrl.ts` | Check whether shared viewers are mobile-auth compatible | Image/audio/video/PDF viewers use `useAuthorizedObjectUrl`; Excel uses `authorizedFetch`; protected REST prefixes include `/rest/workspaces/`, `/rest/team-runs/`, `/rest/runs/`. | Mobile file viewer can reuse these for many content families; avoid unauthenticated HTML static iframe path. |
| 2026-05-28 | Code | `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Inspect desktop reference-file rendering/click behavior | Desktop renders message row as non-button container with sibling message-summary button and reference-row buttons. `selectReference()` sets selected message/reference and renders `TeamCommunicationReferenceViewer`. | Mobile needs equivalent phone-first reference rows; do not nest reference buttons inside message summary. |
| 2026-05-28 | Code | `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Inspect reference content viewer | Viewer uses `authorizedFetch` against `/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`, maps reference type to `FileDataType`, and passes read-only content to `FileViewer`; supports maximize/restore. | Reuse via mobile wrapper rather than reimplementing content route. |
| 2026-05-28 | Code | `autobyteus-web/components/mobile/MobileTeamMessages.vue` | Inspect mobile team message rendering | Mobile computes focused member perspective but only renders message content and `N reference file(s)` as text. No reference button, selected reference state, or viewer. | Direct mobile reference-file clickability gap. |
| 2026-05-28 | Doc | `autobyteus-web/docs/agent_artifacts.md` | Confirm artifact/reference ownership | Docs state Artifacts are run-file-change only; `reference_files` are child rows of Team Communication messages; reference content opens by message-owned identity route; desktop references are sibling buttons. | Keep references separate from Artifacts. |
| 2026-05-28 | Doc | `autobyteus-web/docs/remote_access.md` | Confirm mobile feature contract and Android/web-shell freshness risk | Mobile shell owns Home/Chat/Runs/Files/Artifacts/Activity. Android loads the desktop-served `/mobile` WebView shell; stale served mobile bundles can keep old JS on Android. | Delivery must rebuild/refresh served mobile bundle before Android verification. |
| 2026-05-28 | Code | `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Inspect backend file/folder query contracts | `folderChildren` builds/fetches tree and returns shallow children; `fileContent` reads text; `searchFiles` returns matches. | No server contract change needed for this design. |
| 2026-05-28 | Code | `autobyteus-server-ts/src/api/rest/workspaces.ts`; `autobyteus-server-ts/src/api/rest/team-communication.ts`; `autobyteus-server-ts/src/services/team-communication/team-communication-content-service.ts` | Inspect protected content routes | Workspace content route streams file bytes by workspace/path. Team reference route resolves stored absolute reference path by teamRunId/messageId/referenceId and streams content. | Existing routes fit mobile file/reference viewing. |
| 2026-05-28 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts`; `autobyteus-web/plugins/30.apollo.client.ts`; `autobyteus-web/utils/remoteAccess/authorizedTransport.ts` | Verify mobile authorization route compatibility | `/rest/workspaces/` and `/rest/team-runs/` are protected REST families; GraphQL POST is protected; mobile Apollo/fetch adds bearer credential. | No auth-design blocker found. |
| 2026-05-28 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/AutoByteusWebView.kt`; `TrustedNavigationPolicy.kt` | Check native Android involvement | Android hosts same-origin `/mobile` WebView and controls navigation; no file/reference-specific native blocker found. | Validate final served mobile bundle on Android/WebView if available. |
| 2026-05-28 | Command | `wc -l autobyteus-web/components/mobile/MobileFiles.vue ...` | Check file size/pressure | `MobileFiles.vue` is 266 lines, `useMobileFileContextCoordinator.ts` is 205 lines, `TeamCommunicationPanel.vue` is 361 lines. Adding behavior directly risks responsibility drift. | Extract mobile/file and reference presentation helpers instead of growing mixed files. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - `/mobile` renders `MobileRemoteAccessShell.vue`.
  - Once paired and a work context is selected, `MobileWorkShell.vue` renders tab content for `chat`, `runs`, `files`, `artifacts`, or `activity`.
- Current mobile Files execution flow:
  - `MobileWorkShell` renders `MobileFiles` for `activeTab === 'files'`.
  - `MobileFiles` resolves an `activeWorkspace` by context workspace id/root, then by active workspace, then by first workspace.
  - It displays `currentFolder.children` or local filters over loaded `fileExplorer` tree nodes.
  - Opening a folder only pushes that node into `folderStack`; no lazy-child fetch occurs.
  - Opening a file sets `previewNode` and renders `MobileFileViewer`.
  - `MobileFileViewer` calls `useMobileFileContextCoordinator.openPreview()` only for text/code/Markdown-supported extensions and otherwise shows an unsupported state.
- Current desktop file explorer flow:
  - `FileExplorer.vue` provides `useWorkspaceFileExplorer` to `FileItem.vue`.
  - `FileItem.vue` toggles folders and calls `workspaceStore.fetchFolderChildren(workspaceId, folderPath)` when opening unloaded folders.
  - `FileExplorerTabs.vue` and `FileViewer.vue` render open-file content by `fileExplorerStore` state.
- Current desktop team reference flow:
  - `TeamCommunicationPanel.vue` lists sent/received messages for the focused member.
  - Each reference file is a sibling button under the message summary button.
  - Clicking a reference selects message/reference state and renders `TeamCommunicationReferenceViewer.vue` in the detail pane.
  - The viewer uses the message-owned REST route and `authorizedFetch` to render read-only content.
- Current mobile team reference flow:
  - `MobileActivityDigest.vue` can show `MobileTeamMessages.vue` under the Messages filter.
  - `MobileTeamMessages.vue` computes the same focused-member perspective but only shows a count for `message.referenceFiles.length`.
  - There is no reference-row button, no selected-reference state, and no mobile viewer.
- Ownership or boundary observations:
  - Workspace tree and folder loading are owned by `workspaceStore`; mobile should not own its own incomplete loading policy.
  - File open/content state is owned by `fileExplorerStore`; mobile viewer should observe/delegate rather than invent a separate content model.
  - Attachment targeting is mobile-specific and belongs in `useMobileFileContextCoordinator`, but browsing/viewing policy is a different concern.
  - Team reference content is message-owned by Team Communication and must not route through Artifacts or raw path parsing.
- Current behavior summary: Mobile has partial file browsing and text-only preview, but it misses the key desktop lazy-load/search/content capabilities and has unsafe workspace fallback. Mobile team messages have no reference-file click path despite desktop having a complete reference button/viewer flow.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / mobile parity behavior change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift
- Refactor posture evidence summary: Refactor is needed now. The mobile file path already mixes browsing, workspace resolution, preview support, and attachment policy; adding file/reference behavior directly would grow mixed components and duplicate desktop presentation helpers.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MobileFiles.vue` | Local `openNode()` does not load unloaded folders and workspace fallback can choose unrelated active/first workspace. | Mobile bypasses authoritative workspace/file-explorer boundary and misses a scoping invariant. | Add mobile workspace-file owner that delegates to `workspaceStore`/`fileExplorerStore`. |
| `MobileFileViewer.vue` + `useMobileFileContextCoordinator.ts` | Preview support is text-only and bundled into attachment coordinator. | File viewing concern drift; adding more support there would make the coordinator a mixed owner. | Split browsing/viewing policy from attachment target policy. |
| `TeamCommunicationPanel.vue` | Desktop reference buttons and viewer are complete and message-owned. | Current backend/content boundary already exists. | Reuse content viewer through mobile wrapper. |
| `MobileTeamMessages.vue` | Only displays a count of reference files. | Local mobile presentation defect and boundary bypass of team-reference viewer. | Add tappable rows and mobile reference viewer. |
| `docs/agent_artifacts.md` | Reference files are explicitly separate from Artifacts and open by message-owned route. | Must not solve mobile references by injecting them into mobile Artifacts. | Keep Artifacts no-regression. |
| `authorizedResourceUrl.ts` / viewer components | Protected REST resources can be fetched with mobile credentials and converted to object URLs. | Existing capability supports mobile content rendering; no new auth model required. | Ensure implementation avoids raw unauthenticated protected iframe/static paths. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Mobile shell pairing/home/work orchestration | Opens contexts, sets tabs, hydrates runs, and delegates to `MobileWorkShell`. | No root change needed; verify Files opens through same shell. |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile task tab owner | Renders Files and Artifacts as distinct tabs. | Preserve tab model. |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Phone-first file browser | Needs correct workspace resolution, lazy loading, search, and viewer invocation. | Modify and offload policy to composable. |
| `autobyteus-web/components/mobile/MobileFileViewer.vue` | Mobile full-screen file preview + attach | Text-only and preview-policy-dependent today. | Replace with broader read-only content viewer over shared file state. |
| `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts` | Mobile file attachment target coordination plus preview helpers | Mixed preview concerns with attachment concerns. | Retain attachment owner; decommission preview helpers after new viewer owner exists. |
| `autobyteus-web/composables/useWorkspaceFileExplorer.ts` | Workspace-scoped file explorer boundary | Binds file actions/search/open state to explicit workspace id. | Reuse from mobile composable where useful. |
| `autobyteus-web/stores/workspace.ts` | Workspace tree/load/watch owner | Owns `fetchFolderChildren` and tree mutation. | Mobile folder browsing must call this owner. |
| `autobyteus-web/stores/fileExplorer.ts` | File open/search/content state owner | Owns `OpenFileState`, `searchFiles`, text content fetch, media URL construction. | Mobile viewer/search should use this owner. |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` and `viewers/*` | Shared content renderer | Supports content families; protected resources are often routed through authorized object URL helpers. | Reuse carefully for read-only mobile content. |
| `autobyteus-web/components/mobile/MobileTeamMessages.vue` | Mobile team message summary list | Lacks reference-file controls/viewer. | Modify to render buttons and open mobile viewer. |
| `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Desktop team communication panel | Has working reference-file row/select behavior. | Keep behavior; extract presentation helper to avoid duplication. |
| `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Team reference content viewer | Owns message-owned content route and read-only file rendering. | Reuse through mobile full-screen wrapper. |
| `autobyteus-server-ts/src/api/rest/team-communication.ts` | Reference content REST route | Streams reference content by team/message/reference identity. | No server change expected. |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | Workspace content REST route | Streams workspace file content by workspace/path. | No server change expected. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/AutoByteusWebView.kt` | Native WebView shell | Hosts served `/mobile`; no file/reference-specific native logic. | Validate stale-bundle risk, not native UI change. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Static trace | Code path trace from `MobileWorkShell.vue` -> `MobileFiles.vue` -> `MobileFileViewer.vue` -> `useMobileFileContextCoordinator.ts` | Mobile file tap path exists but only text-supported previews and does not use lazy folder loading. | Fix is in mobile web source path. |
| 2026-05-28 | Static trace | Code path trace from `MobileActivityDigest.vue` -> `MobileTeamMessages.vue` and desktop `TeamCommunicationPanel.vue` -> `TeamCommunicationReferenceViewer.vue` | Desktop has reference buttons/viewer; mobile only has count text. | Mobile reference click behavior is absent, not merely broken by CSS. |
| 2026-05-28 | Environment check | `test -d autobyteus-web/node_modules && echo has-node-modules || echo no-node-modules` | Task worktree currently has no `autobyteus-web/node_modules`. | Runtime tests were not run during solution-design investigation; implementation/API-E2E should install/run targeted tests. |

## External / Public Source Findings

No external/public sources consulted; current task is local-codebase-specific.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For downstream validation, a mobile-width browser harness and, ideally, Android WebView connected to a freshly served `/mobile` bundle.
- Required config, feature flags, env vars, or accounts: Phone Access pairing/mobile credential for end-to-end Android validation; unit/component tests can mock stores/fetch.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Mobile Files implementation is not a direct desktop `FileExplorerLayout`; that is correct for phone layout, but it needs to reuse the same data/content owners.
- The most likely observed “cannot see all files” causes are:
  - unloaded folders are never fetched on tap;
  - workspace-wide search is only loaded-tree flattening;
  - unresolved context root can silently fall back to the wrong workspace;
  - unsupported content families make file taps appear nonfunctional compared with Artifacts.
- The direct observed mobile reference-file cause is absence of buttons/viewer in `MobileTeamMessages.vue`.
- Existing REST/GraphQL authorization and protected-resource helpers already cover the needed content families; no backend change is indicated.

## Constraints / Dependencies / Compatibility Facts

- Dedicated worktree branch: `codex/mobile-file-reference-controls` from `origin/personal`.
- Must preserve desktop reference-file behavior and mobile Artifacts behavior.
- Must keep team communication `referenceFiles` separate from run artifacts.
- Mobile code must stay free of Electron APIs and desktop shell/split-pane containers.
- Android validation must account for stale served `/mobile` bundle risk documented in `docs/remote_access.md`.

## Open Unknowns / Risks

- Real Android validation was not run during design because no served mobile runtime/device setup was established in this phase.
- Shared HTML previewer static URL behavior may not be mobile-auth-safe; implementation should either keep HTML raw/read-only for mobile or route preview through authorized blob/content handling.
- Very large files may require practical mobile size limits; current requirements allow explicit unsupported/too-large states.

## Notes For Architect Reviewer

- The design should be reviewed as a targeted mobile-web refactor/bug fix, not a backend/server change.
- Key architecture decision: introduce a small mobile workspace-file owner instead of expanding `useMobileFileContextCoordinator` or importing desktop file explorer layouts.
- Key boundary decision: mobile team reference files must reuse the message-owned reference content viewer/route, not Artifacts and not raw workspace-path guessing.
