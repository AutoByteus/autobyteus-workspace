# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved by user; design production in progress
- Investigation Goal: Analyze why mobile Files tab does not work on Android/iOS and determine whether it is unimplemented, partially implemented, API-blocked, stale-bundle-related, or workspace-resolution-related.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Required tracing Android, iOS, mobile web shell, shared file explorer frontend, backend GraphQL/REST/WebSocket file APIs, and docs/packaging expectations.
- Scope Summary: Mobile Files tab current-state and feasibility/root-cause analysis.
- Primary Questions To Resolve:
  - Where is the Files tab declared in Android and iOS? Resolved: it is not native; native wrappers load `/mobile`.
  - What screen/view is displayed when selected? Resolved: `MobileFiles.vue` inside `MobileWorkShell.vue`.
  - Is there existing server/API/SDK file-browsing capability? Resolved: yes, GraphQL/REST/WebSocket file explorer APIs exist.
  - Is missing behavior local mobile wiring or broader product/API gap? Resolved: feature exists; likely failure is workspace context/root-load error propagation, stale bundle, or selected workspace path availability.

## Request Context

User reports that the application has Android and iOS support and that the Files tab currently does not work. They are unsure whether the reason is lack of implementation or complexity and requested codebase analysis.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis/tickets/mobile-files-tab-analysis
- Current Branch: codex/mobile-files-tab-analysis
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-27; origin/personal at f3305f40.
- Task Branch: codex/mobile-files-tab-analysis
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None
- Notes For Downstream Agents: Investigation-only unless user approves implementation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `pwd; ls -la; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git worktree list` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap environment and repo mode | Workspace is a Git repo on branch `personal` with Android/iOS/mobile/backend/frontend directories; shared checkout has unrelated untracked files. | No |
| 2026-06-27 | Command | `git symbolic-ref --short refs/remotes/origin/HEAD; git rev-parse --abbrev-ref --symbolic-full-name @{u}; git fetch origin --prune` | Resolve and refresh base branch before dedicated worktree | `origin/HEAD` and current upstream are `origin/personal`; fetch succeeded; `origin/personal` at `f3305f40`. | No |
| 2026-06-27 | Command | `git worktree add -b codex/mobile-files-tab-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis origin/personal` | Create isolated task worktree/branch | Dedicated worktree created; clean branch tracking `origin/personal`. | No |
| 2026-06-27 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt`; `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/AutoByteusWebView.kt`; `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/TrustedNavigationPolicy.kt` | Determine Android ownership | Android validates/saves paired node profile and opens `AutoByteusWebView`; it allows `/mobile`, `/rest`, `/graphql`, assets; it does not implement native Files tab. `WebFileChooserCoordinator` is for browser file input, not Files tab browsing. | No |
| 2026-06-27 | Code | `autobyteus-ios/AutoByteusMobile/WebShellViewController.swift`; `autobyteus-ios/AutoByteusMobile/AutoByteusWebViewController.swift`; `autobyteus-ios/AutoByteusMobileCore/TrustedNavigationPolicy.swift` | Determine iOS ownership | iOS wraps `/mobile` in `WKWebView`, with same-origin/path allowlist; it does not implement Home/Chat/Runs/Files natively. | No |
| 2026-06-27 | Code | `autobyteus-web/components/mobile/MobileWorkShell.vue` | Find bottom-nav Files entrypoint | Bottom navigation includes `files` tab and renders `MobileFiles` when active. | No |
| 2026-06-27 | Code | `autobyteus-web/components/mobile/MobileFiles.vue` | Inspect Files tab implementation | Implements workspace title/path, search/filter, folder list, lazy folder loading, full-workspace search, preview sheet, attach action. | Runtime repro could identify which state user sees. |
| 2026-06-27 | Code | `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | Inspect workspace resolution and file-store adapter | Resolves workspace from context; for run/team-run uses `workspaceRootPath` -> `workspaceMetadata` -> `ensureWorkspaceMetadata`; fetches root folder when tree not seeded; starts live session. It catches thrown errors, but root `fetchFolderChildren` currently tends not to throw on server payload errors. | Fix likely belongs here plus file explorer action contract. |
| 2026-06-27 | Code | `autobyteus-web/stores/fileExplorerTreeActions.ts` | Inspect folder loading error handling | `fetchFolderChildren` logs GraphQL errors and `folderData.error`, then returns without throwing or setting store error. This can convert root load failures into empty successful mobile state. | Yes if implementing. |
| 2026-06-27 | Code | `autobyteus-web/stores/fileExplorerContentActions.ts`; `autobyteus-web/graphql/queries/file_explorer_queries.ts`; `autobyteus-web/stores/fileExplorerSearchActions.ts` | Verify frontend API calls | Text content uses GraphQL `fileContent`; search uses GraphQL `searchFiles`; media URL uses `/rest/workspaces/:workspaceId/content`. | No |
| 2026-06-27 | Code | `autobyteus-web/composables/useAuthorizedObjectUrl.ts`; `autobyteus-web/utils/remoteAccess/authorizedResourceUrl.ts`; `autobyteus-web/components/fileExplorer/viewers/*.vue` | Verify mobile auth for protected media/PDF | Shared viewers load protected REST URLs through authorized fetch/object URLs for images/audio/video/PDF; Excel uses `authorizedFetch`. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Verify backend file APIs | Backend resolver exposes `fileContent`, `searchFiles`, `folderChildren` plus mutations. Read/list/search acquire workspace file explorer leases. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/api/rest/workspaces.ts` | Verify REST content route | `/rest/workspaces/:workspaceId/content?path=...` serves workspace files with boundary checks. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/api/websocket/file-explorer.ts`; `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts`; `autobyteus-web/utils/remoteAccess/websocketAuth.ts` | Verify file watcher streaming path and mobile auth | WebSocket route uses remote-access websocket auth; client adds `access_token` when mobile credential exists. | No |
| 2026-06-27 | Code | `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue`; `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Inspect mobile Home/Files and catalog context path | Home `openFiles()` only switches active tab and screen; if no current context, Files shows choose-workspace state. Catalog loads workspaces from `workspaceStore.fetchAllWorkspaces()`. | UX may need refinement if user expects Home Files to open picker directly. |
| 2026-06-27 | Doc | `autobyteus-web/docs/remote_access.md`; `docs/android_mobile_access.md`; `autobyteus-android/README.md`; `autobyteus-ios/README.md` | Check intended mobile contract | Docs explicitly say native wrappers load server `/mobile`; mobile Files is read-only workspace browser; stale `/mobile` bundle is a known validation/failure risk. | Use for final answer. |
| 2026-06-27 | Command | `pnpm --dir autobyteus-web test:nuxt -- run components/mobile/__tests__/MobileFiles.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts` | Attempt focused validation | Failed before tests because the dedicated worktree has no `node_modules`; `cross-env: command not found`. No product behavior tested. | Install dependencies or run in prepared checkout if implementation proceeds. |
| 2026-06-27 | Command | `find ... dist/dist-mobile/mobile-web`; `grep -l mobile-files-no-workspace ...` in original checkout | Check local generated bundle presence | Dedicated worktree has no built mobile assets. Original shared checkout has generated `dist`/`dist-mobile` containing mobile Files markers, but packaged/served node may still be stale independently. | Runtime validation should hash served `/mobile/index.html`. |
| 2026-06-28 | Other | User follow-up requirement in chat | Capture implementation-quality requirement before downstream handoff | User clarified that `/mobile` can be tested via browser `open_tab`; implementation should verify the fixed Files tab UI and improve the UI if it is not good, as normal frontend engineering responsibility. | Carry into design/handoff if implementation proceeds. |
| 2026-06-28 | Other | User follow-up in chat: "Since you found the problem, now kickoff the ticket." | Capture requirements approval and workflow start | User approved moving from investigation into ticket implementation workflow. | Produce design spec and hand off to architecture review. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Android/iOS native app opens a paired server `/mobile` URL in WebView/WKWebView.
  - Mobile web shell renders `MobileRemoteAccessShell`, `MobileWorkShell`, and bottom tabs.
- Current execution flow:
  - `Android MainActivity` or iOS `WebShellViewController` -> WebView/WKWebView -> `/mobile` Nuxt shell -> `MobileRemoteAccessShell` -> `MobileWorkShell` -> active tab `files` -> `MobileFiles` -> `useMobileWorkspaceFileExplorer` -> shared `fileExplorerStore` / `workspaceStore` -> GraphQL/REST/WebSocket backend file explorer.
- Ownership or boundary observations:
  - Native wrappers own pairing/opening/containment, not product tab content.
  - `MobileFiles.vue` owns mobile Files presentation and local UI state.
  - `useMobileWorkspaceFileExplorer.ts` owns mobile context-to-workspace resolution.
  - `fileExplorerStore` owns shared file tree/content/search state.
  - Backend `FileExplorerResolver` and workspace routes own server filesystem access.
- Current behavior summary:
  - Files is implemented. It can fail or appear non-functional when no context is selected, when the selected workspace path cannot be loaded on the paired server, when root load errors are swallowed into an empty state, or when the served mobile bundle is stale.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Feature Gap Investigation
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect + Missing Invariant
- Refactor posture evidence summary: No large refactor appears necessary. Existing owners are mostly correct. The main issue is a missing error propagation invariant between `fetchFolderChildren` and mobile root resolution.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MobileFiles.vue` | UI already supports list/search/filter/preview/attach. | Feature is not absent. | Runtime reproduction. |
| `useMobileWorkspaceFileExplorer.ts` | Correctly avoids falling back to unrelated workspace. | Ownership is sound, but failure feedback must be reliable. | Improve root failure surfacing. |
| `fileExplorerTreeActions.ts` | Server and GraphQL errors are logged and swallowed. | Missing invariant: callers cannot know root load failed. | Make error contract explicit. |
| Android/iOS wrappers | Native code only wraps `/mobile`; no native Files path. | Fix belongs in web/server bundle, not native app, unless wrapper blocks transport. | Verify bundle freshness and WebView transport. |
| Docs | Known stale mobile bundle risk. | Runtime failures may persist after source fixes unless served bundle is refreshed. | Hash/serve validation. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Android pairing/opening shell | Opens `AutoByteusWebView` for validated mobile URL. | Not the Files tab owner. |
| `autobyteus-ios/AutoByteusMobile/WebShellViewController.swift` | iOS WebView shell | Hosts `AutoByteusWebViewController`. | Not the Files tab owner. |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile work shell/bottom nav | Declares `files` tab. | Entry owner for mobile tabs. |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Files tab UI | Implements browse/search/filter/preview/attach. | Feature exists; debug state transitions. |
| `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | Mobile context-to-workspace file explorer adapter | Resolves context workspace and fetches root if needed. | Needs reliable root-load error feedback. |
| `autobyteus-web/stores/fileExplorerTreeActions.ts` | Shared folder loading action | Logs/returns on server errors instead of throwing. | Likely local defect. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | GraphQL file explorer queries/mutations | Exposes folder/content/search APIs. | Backend capability exists. |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | Workspace content REST route | Serves protected file content. | Binary/media preview supported. |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | Serves `/mobile` static bundle | Chooses packaged `mobile-web`, `public/mobile`, or dev `autobyteus-web/dist/public`. | Stale bundle can explain Android/iOS mismatch. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-27 | Test | `pnpm --dir autobyteus-web test:nuxt -- run components/mobile/__tests__/MobileFiles.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts` | Failed before test execution because fresh worktree lacks `node_modules` / `cross-env`. | No runtime validation performed in this isolated worktree. |
| 2026-06-27 | Probe | Static source trace across mobile/native/backend files | Files implementation exists; backend APIs exist; root error propagation gap found statically. | Strong static root-cause candidate. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: To reproduce fully, run paired AutoByteus server with mobile web bundle served under `/mobile`, select a workspace/run/team-run, and open Files from Android/iOS or browser mobile runtime.
- Required config, feature flags, env vars, or accounts: Phone Access must be enabled and a valid mobile credential paired.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Android/iOS native code is not where Files should be implemented. Both wrappers load the server mobile UI.
2. `MobileFiles.vue` is implemented and uses existing workspace file explorer state/actions.
3. Backend GraphQL/REST/WebSocket file explorer capabilities exist and are protected by the remote-access policy for mobile credentials.
4. Current frontend root folder fetch error handling is weak: server errors from `folderChildren` can be logged and swallowed, leaving mobile with an empty list and no actionable error.
5. Docs explicitly warn that stale `/mobile` bundles can make native wrappers appear broken even when source is fixed.

## Constraints / Dependencies / Compatibility Facts

- Analysis only; no product code changes requested yet.
- Mobile Files is read-only workspace browsing; phone-local filesystem browsing is out of scope.
- Server/container path availability matters: a host path in run history must be reachable from the paired server process/container.
- The native APK/iOS build and the served `/mobile` web bundle have independent freshness.

## Open Unknowns / Risks

- Need actual observed UI state from the user's phone to choose the exact fix path.
- Implementation must also perform browser-based `/mobile` UI validation and improve poor Files-tab UI states found during that check.
- Need confirm whether the paired node is desktop, Docker, or another server and whether the run workspace root path exists in that runtime.
- Need verify served `/mobile/index.html`/asset hash against current source when reproducing.

## Notes For Architect Reviewer

No architecture-review handoff yet; requirements are approved for implementation. If implementation proceeds, recommend a narrow design around a clear error-return/throw contract for shared file explorer fetch actions and mobile root resolution state, plus focused mobile tests and browser-based `/mobile` visual/interactive validation.
