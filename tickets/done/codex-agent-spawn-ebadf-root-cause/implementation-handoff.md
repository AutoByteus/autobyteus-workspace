# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Root-cause report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Same-ticket design-impact rework artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Prior/current code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/review-report.md`
- Prior API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`
- Prior delivery docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/docs-sync-report.md`
- Prior delivery/release report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/release-deployment-report.md`
- Prior handoff summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/handoff-summary.md`
- Prior delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round9-electron-build-localization.md`
- Latest-base merge-conflict delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round13-latest-personal-merge-conflicts.md`
- Round-18 latest-base merge-conflict delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round18-latest-personal-merge-conflict.md`
- Round-19 latest-base merge-conflict delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round19-latest-personal-merge-conflicts.md`
- Round-20 latest-base merge-conflict delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round20-latest-personal-merge-conflicts.md`
- API/E2E round-6 Terminal FD failure evidence and durable validation: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
- API/E2E round-9 Terminal descriptor failure analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/terminal-server-e2e-failure-analysis-20260524.md`
- API/E2E round-9 Terminal descriptor evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524.json`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524-final-lsof.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-failure-20260524.json`
- API/E2E round-13 browser Files tab failure analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/browser-files-tab-failure-analysis-20260529.md`

## What Changed

Implemented the architecture-review-round-7 steady-state target:

- Backend now has a tight `WorkspaceMetadata` shape in `autobyteus-server-ts/src/workspaces/workspace-metadata.ts` and GraphQL exposes `WorkspaceMetadata` for workspace list/create/metadata resolution.
- `WorkspaceManager.createWorkspace()` remains the top-level product API, but it is metadata-only: creating/listing/resolving workspaces no longer builds a file tree or starts a watcher.
- `FileSystemWorkspace` is now metadata plus an optional lazy `WorkspaceFileExplorer`; `acquireFileExplorer(reason)` is the explicit acquisition boundary.
- Replaced the old `BaseFileExplorer`/`LocalFileExplorer` hierarchy with one internal `WorkspaceFileExplorer` capability boundary for tree/search/operations/watcher leases.
- File-explorer GraphQL resolvers, search, mutations, and WebSocket streaming explicitly acquire/release `WorkspaceFileExplorer`; non-file-explorer paths remain metadata/root-path only.
- Preserved the prior watcher lifecycle fixes: reference-counted watcher leases, awaited close, close-before-connect cleanup, connected send/loop failure cleanup, snapshot search split from live monitoring, and real WebSocket lifecycle coverage.
- Frontend workspace state is split into metadata (`WorkspaceMetadata`) and separate file-explorer state (`fileExplorerState` plus action modules). Workspace list/create/historical display/config/sidebars/Terminal runtime cwd/resume/rerun stay metadata/root-path only.
- Visible Files surfaces and file actions explicitly own file-explorer loading/live-session behavior. Desktop collapsed right panel and mobile tools do not keep hidden Files content/live consumers; mobile dedicated explorer remains the live mobile file surface.
- Historical standalone/team open/hydration paths use `workspaceMetadata` and do not activate workspaces merely to display history. Workspace-dependent UI/actions activate explicitly and own loading/error UI.
- Team launch preserves the explicit activation boundary: member config serialization carries `workspaceRootPath`, backend launch rejects filesystem metadata IDs without a root path, and same-root members dedupe activation once per create-team request.
- Removed steady-state legacy concepts from implementation source/tests: `WorkspaceReference`, `workspaceReference`, `WorkspaceActivation`, `ensureWorkspaceInitialized`, `BaseFileExplorer`, `LocalFileExplorer`, old direct `getFileExplorer()`/`workspace.searchFiles()` call sites.
- Updated committed frontend GraphQL operation types/documents to match the `WorkspaceMetadata` API/query documents.
- Kept the earlier delivery localization fix: `Terminal.vue` no longer has the hard-coded `Retry workspace load` literal; localization audit passes.
- Round-10 local fix: Terminal now uses an explicit root-path `TerminalTarget`; `useTerminalSession` opens `/ws/terminal/{sessionId}?cwd=...` instead of workspace-id/materialized-workspace URLs, and `Terminal.vue` no longer calls workspace activation before connecting.
- Round-10 local fix: backend Terminal WebSocket validates/canonicalizes cwd directly, has route-level close/error/close-before-connect cleanup, disconnects late sessions if close wins the connect race, and terminal handler/PTY manager clean up partially created sessions and send/read-loop failures.
- Round-10/13 local fix: mobile Files activates from metadata/root path only when the visible Files surface opens, uses the file-explorer store/composable, and owns/releases visible live-session ownership. After merging latest `origin/personal`, the mobile Tools/Terminal/VNC surface remains deleted per the latest mobile shell architecture; interactive Terminal is desktop/workspace-tool only for mobile Phone Access.
- Round-12 local fix for `E2E-TERMFD-001`: terminal close-before-connect now aborts pending startup through an `AbortSignal`, exposes in-flight sessions to `PtySessionManager.closeSession()` so cleanup can close them before `start()` resolves, suppresses expected startup-abort error handling, and hardens `autobyteus-ts` `PtySession.close()` to destroy node-pty socket/write-stream resources, dispose listeners, resolve pending reads, and reject startup if close wins.
- Round-13 delivery local fix: integrated latest `origin/personal@74218467a2f7786c82f3e97b9190058d2cb83bd2`, resolved mobile/terminal/test/docs merge conflicts, preserved the Round-12/7 Terminal FD lifecycle fixes, kept latest-base deletion of `MobileTools.vue`, and reconciled `autobyteus-web/docs/terminal.md` to describe root-path desktop Terminal plus no mobile Phone Access Terminal/VNC page.
- Round-14 user-prompted run API coverage fix: rechecked GraphQL/run-history/run-service integration coverage, found `agent-run-service.integration.test.ts` still wired the legacy `historyIndexService` mock instead of the current `historyCatalogService` prepared/start/terminate boundary, updated that durable integration test to exercise the current run-history catalog lifecycle, and reran the focused GraphQL/run integration subset successfully.
- Round-15 CR-011 local fix: removed the remaining stale negative-test `historyIndexService`, `recordRunCreated`, and `recordRunRestored` setup blocks from `agent-run-service.integration.test.ts`; all test setups now use the current `historyCatalogService` harness where a history dependency is supplied.
- Round-16 `E2E-TERMFD-002` local fix: added a descriptor-safe Darwin `IsolatedPtySession` backend in `autobyteus-ts` that runs `node-pty` inside a short-lived helper child process and bridges data over pipes/IPC. The server process no longer owns `node-pty` PTY master/slave descriptors for macOS Terminal WebSocket sessions; normal command-output close terminates the helper, shell, read loop, streams, IPC, and pending reads.
- Round-16 Terminal tests/evidence update: `getDefaultSessionFactory()` selects `IsolatedPtySession` on Darwin, keeps `PtySession` for non-Darwin Unix, and falls back from the isolated backend to `PtySession`/`DirectShellSession` for tool-session startup fallback. The durable Terminal E2E waits for actual cwd output instead of matching the echoed command literal.
- Round-17 CR-012 local fix: `IsolatedPtySession.start()` now reuses the existing `ensureNodePtySpawnHelperExecutable()` bootstrap invariant before spawning the isolated bridge child, so the Darwin isolated backend repairs a non-executable `node-pty` `spawn-helper` just like the in-process `PtySession` path. It also rechecks closed state after the awaited bootstrap step to avoid spawning a late bridge if close wins during helper repair.
- Round-17 CR-012 regression coverage: added a real integration test that temporarily removes execute bits from the installed `node-pty` `spawn-helper`, starts an `IsolatedPtySession`, verifies helper permission repair and real command output, and restores the original mode in `finally`; unit coverage also asserts bootstrap-before-spawn and no bridge spawn after close-during-bootstrap.
- Round-18 delivery latest-base local fix: integrated latest `origin/personal@03d7880b45afd2b032de6e842e41429fad0a2cb0` after API/E2E Round 10 and code review Round 17 passed. Resolved the `MobileRemoteAccessShell.spec.ts` merge conflict by preserving the ticket-side mobile work-picking/post-pair checks and the latest-base mobile safe-container QR session replacement plus 401 authorized-catalog session-drop coverage. The Round 17 Terminal FD lifecycle implementation files were not changed by the merge resolution.
- Round-19 delivery latest-base local fix: integrated latest `origin/personal@56c6d4bfa27ced68678e4d21dccd4acbcb31aa76` (`v1.3.31`) for the user's 2026-05-28 Electron rebuild request. Resolved conflicts in `MobileRunSetup.vue`, `MobileContextSelectionRegression.spec.ts`, `MobileRemoteAccessShell.spec.ts`, and `MobileUxRefinement.spec.ts` by preserving ticket-side metadata/root-path Files and Terminal lifecycle expectations while adopting latest-base mobile artifacts tab, run setup parity, launch workspace picker, and auto-approve run options behavior.
- Round-20 delivery latest-base local fix: integrated latest `origin/personal@832b6f7cdbf77166576ff69c36803fd4125ff090` (`v1.3.32`) for the user's 2026-05-28 latest-base Electron rebuild request. Resolved conflicts in `MobileFiles.vue`, `MobileRemoteAccessShell.spec.ts`, and `useMobileFileContextCoordinator.ts` by preserving the ticket-side metadata/root-path file-explorer activation and visible live-session ownership while adopting latest-base mobile file/reference controls (`MobileFileViewer`, `MobileTeamReferenceViewer`, protected read-only file previews, mobile attachment rows, and v1.3.32 version artifacts). `useMobileWorkspaceFileExplorer.ts` was reconciled to the ticket architecture: it delegates through `useWorkspaceFileExplorer`, resolves/ensures workspace metadata by root path at visible Files activation, owns mobile folder/search/open-file state, and does not depend on legacy `WorkspaceInfo.fileExplorer` or `workspaceStore.allWorkspaces`. Round 17 Terminal FD lifecycle files were not modified by this merge resolution; focused terminal backend tests still pass.
- Round-21 user-requested advisory cleanup: implemented the non-blocking Round-18 code-review recommendations that were safe local cleanups. `PtySessionManager` and `TerminalHandler` now use internal `targetKey` terminology and `closeAllForTargetKey()` instead of implying Terminal groups sessions by initialized workspace IDs. `RightSideTabs.vue` no longer imports workspace/file-explorer stores for open-file auto-switching; that coordination moved to `useRightPanelOpenFileAutoSwitch()`, keeping the tab shell presentation-oriented while preserving desktop auto-switch behavior and keeping mobile-tools Files disabled. ADV-TERM-001 remains a performance-investigation note: no Terminal backend architecture change was made without profiling, and macOS `IsolatedPtySession` remains intact to preserve descriptor-level cleanup guarantees.
- Round-22 CR-013 local fix: updated the Terminal PTY session manager unit tests and kept repository-resident JS counterpart to match the production `targetKey` rename. Stale `closeAllForWorkspace()` calls, `ws1`/`ws2` fixtures, and workspace-worded test names are replaced with `closeAllForTargetKey()`, `target-1`/`target-2`, and target-key wording.
- Round-23 CR-014 local fix: completed the adjacent Terminal handler test cleanup by replacing workspace-shaped `ws1` target-key fixtures with `target-1` in both `terminal-handler.test.ts` and the kept `.js` counterpart. Focused greps now show no `closeAllForWorkspace`, `terminalTargetId`, `sessions by workspace`, `ws1`, or `ws2` references across Terminal streaming source and unit tests.
- Round-24 DS-014 implementation: updated the desktop right-side tab lifecycle so Files remains lazy before first selection, then stays mounted/cached but inactive after first use when switching to Terminal. `RightSideTabs.vue` now hides cached Files with `v-show` and passes an explicit `active` prop while Terminal remains visible-only and disconnected when hidden. `FileExplorer`, `FileExplorerTabs`, and `FileItem` now gate live sessions, refresh/search work, and global keyboard/drag/context listeners on active state; inactive cached Files releases live session consumers, aborts search, removes panel listeners, and keeps the cached tree available for immediate re-display on return.
- Round-25 DS-015 implementation: completed FileExplorer inactive quiescence. `fileExplorerStore` now owns folder-children generations and AbortControllers; live-session release/final consumer cleanup aborts search, invalidates folder refresh generations, clears active snapshot refresh bookkeeping, disconnects the live stream, and suppresses late stale folder mutations. Snapshot refresh now refreshes root/open folders under one active generation and only starts on first visible live consumer acquisition, avoiding extra same-workspace consumer refresh churn.
- Round-25 backend bounded folder projection: `folderChildren` now delegates to `WorkspaceFileExplorer.loadFolderChildren()` for a one-folder projection instead of using `buildWorkspaceDirectoryTree()` as the ordinary fallback. The new projection validates the requested folder, reads only immediate children, applies workspace ignore/sort policy, updates the cached tree node lazily, and leaves deeper descendants unloaded until explicitly requested.
- Round-26 CR-015 local fix: `WorkspaceFileExplorer.loadFolderChildren()` now applies `WorkspaceIgnoreMatcher` to the requested non-root folder itself before reading entries or updating the tree, so direct requests to ignored folders such as `.git`, `node_modules`, or `.gitignore`-ignored folders return a controlled access-denied error instead of exposing hidden children. Regression coverage verifies ignored direct requests do not call full tree rebuild and leave the cached tree unmodified.
- Round-27 CR-016 local fix: `WorkspaceFileExplorer.getPath()` now resolves the workspace root and candidate path and uses separator-aware `path.relative()` containment instead of raw string-prefix matching, closing same-prefix sibling escapes such as `../ws-sibling`. File read and file operation paths now reuse this single FileExplorer boundary through `getPath()`/`resolveWorkspacePath()`, preserving operation-specific user-facing errors while removing duplicated unsafe prefix guards. Regression coverage verifies `loadFolderChildren('../ws-sibling')` rejects before any tree rebuild or cached-tree mutation.
- Round-28 CR-017 local fix: `RenameFileOperation` now enforces leaf-name rename semantics before filesystem mutation, rejecting empty names, `.` / `..`, absolute names, and names containing `/` or `\`. The computed destination stays workspace-relative and is resolved through the shared `WorkspaceFileExplorer.getPath()` boundary before `fs.rename()`, so rename cannot be used as a cross-folder move or same-prefix sibling escape. Regression coverage verifies a traversal-like `newName` rejects before mutation, does not create the sibling leak file, and leaves the original file/tree entry intact; valid leaf-name rename coverage remains passing.
- Round-29 `E2E-BROWSER-FILES-001` local fix: `FileExplorerTabs.vue` now initializes `handleKeydown` before any active-state watcher can attach global listeners. Immediate active FileExplorer mounting no longer trips the JavaScript temporal-dead-zone error (`Cannot access 'handleKeydown' before initialization`) that caused the browser/Electron Nuxt 500 Files tab crash; regression coverage mounts the component with `active=true` at setup time and verifies listener attachment succeeds.

## Key Files Or Areas

Backend:

- `autobyteus-ts/src/tools/terminal/pty-session.ts`
- `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`
- `autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts`
- `autobyteus-ts/src/tools/terminal/session-factory.ts`
- `autobyteus-ts/tests/unit/tools/terminal/pty-session.test.ts`
- `autobyteus-ts/tests/unit/tools/terminal/isolated-pty-session.test.ts`
- `autobyteus-ts/tests/integration/tools/terminal/isolated-pty-session.test.ts`
- `autobyteus-ts/tests/unit/tools/terminal/session-factory.test.ts`
- `autobyteus-server-ts/src/workspaces/workspace-metadata.ts`
- `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`
- `autobyteus-server-ts/src/workspaces/workspace-manager.ts`
- `autobyteus-server-ts/src/file-explorer/file-explorer.ts`
- `autobyteus-server-ts/src/file-explorer/operations/base-file-operation.ts`
- `autobyteus-server-ts/src/file-explorer/operations/add-file-or-folder-operation.ts`
- `autobyteus-server-ts/src/file-explorer/operations/move-file-operation.ts`
- `autobyteus-server-ts/src/file-explorer/operations/remove-file-operation.ts`
- `autobyteus-server-ts/src/file-explorer/operations/rename-file-operation.ts`
- `autobyteus-server-ts/src/file-explorer/operations/write-file-operation.ts`
- `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts`
- `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`
- `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
- `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts`
- `autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session-manager.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
- `autobyteus-server-ts/src/api/websocket/terminal.ts`
- `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`
- `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`
- `autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.ts`
- `autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.js`
- `autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.ts`
- `autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.js`

Frontend:

- `autobyteus-web/types/workspace/WorkspaceMetadata.ts`
- `autobyteus-web/utils/workspaceMetadata.ts`
- `autobyteus-web/stores/workspace.ts`
- `autobyteus-web/stores/workspaceMetadataActions.ts`
- `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts`
- `autobyteus-web/stores/fileExplorer.ts`
- `autobyteus-web/stores/fileExplorerState.ts`
- `autobyteus-web/stores/fileExplorerContentActions.ts`
- `autobyteus-web/stores/fileExplorerTreeActions.ts`
- `autobyteus-web/stores/fileExplorerMutationActions.ts`
- `autobyteus-web/stores/fileExplorerSearchActions.ts`
- `autobyteus-web/composables/useWorkspaceFileExplorer.ts`
- `autobyteus-web/types/terminal/TerminalTarget.ts`
- `autobyteus-web/utils/terminalTarget.ts`
- `autobyteus-web/composables/useTerminalSession.ts`
- `autobyteus-web/components/fileExplorer/FileExplorer.vue`
- `autobyteus-web/components/fileExplorer/FileExplorerLayout.vue`
- `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue`
- `autobyteus-web/components/fileExplorer/FileItem.vue`
- `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.spec.ts`
- `autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.spec.ts`
- `autobyteus-web/components/fileExplorer/__tests__/FileItem.spec.ts`
- `autobyteus-web/stores/__tests__/workspaceStore.spec.ts`
- `autobyteus-web/components/workspace/tools/Terminal.vue`
- `autobyteus-web/components/layout/RightSideTabs.vue`
- `autobyteus-web/composables/useRightPanelOpenFileAutoSwitch.ts`
- `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts`
- `autobyteus-web/components/mobile/MobileFiles.vue`
- `autobyteus-web/components/mobile/MobileFileViewer.vue`
- `autobyteus-web/components/mobile/MobileTeamReferenceViewer.vue`
- `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts`
- `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts`
- `autobyteus-web/components/mobile/__tests__/MobileFiles.spec.ts`
- `autobyteus-web/components/mobile/__tests__/MobileFileViewer.spec.ts`
- `autobyteus-web/components/mobile/__tests__/MobileTeamMessages.spec.ts`
- `autobyteus-web/components/mobile/MobileRunSetup.vue`
- `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
- `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts`
- `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts`
- `autobyteus-web/components/workspace/config/*`
- `autobyteus-web/services/runHydration/*`
- `autobyteus-web/services/runOpen/*`
- `autobyteus-web/stores/runHistory*`
- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/types/agent/TeamRunConfig.ts`
- `autobyteus-web/generated/graphql.ts`
- `autobyteus-web/docs/file_explorer.md`
- `autobyteus-web/docs/terminal.md`

Removed obsolete source/test paths:

- `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts`
- `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts`
- `autobyteus-web/components/mobile/MobileTools.vue`
- `autobyteus-web/types/workspace/WorkspaceReference.ts`
- `autobyteus-web/utils/workspaceReference.ts`
- `autobyteus-web/stores/workspaceReferenceActions.ts`

## Important Assumptions

- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` are deterministic metadata IDs, not initialized-workspace proof.
- History/team history, runtime cwd, resume/rerun, sidebars, and workspace list/create must stay metadata/root-path only.
- Files, skill file explorer, context file browser/search/read/write, and file-explorer WebSocket are the intended file-explorer acquisition paths.
- Search can acquire a `WorkspaceFileExplorer` for snapshot indexing but must not acquire or retain a live watcher unless a watcher lease is explicitly requested.
- Team launch is an explicit workspace-dependent boundary, so it may activate filesystem workspaces from canonical root paths.
- On Darwin/macOS, Terminal WebSocket sessions use an isolated helper-process PTY backend so the backend server process does not retain `node-pty` `/dev/ptmx` or `(revoked)` descriptors after normal command-output close. The helper still owns real `node-pty` interactive PTY semantics while it is alive.
- The isolated Darwin PTY path must continue to reuse the shared `node-pty` bootstrap owner for `spawn-helper` executable-bit repair before any bridge/helper spawn.
- Terminal backend architecture should not be changed for perceived startup latency unless profiling isolates the bottleneck and the replacement still passes descriptor-level FD probes.
- DS-014 preserves Terminal descriptor discipline: Files may be cached while inactive, but hidden Terminal must not be cached with a live PTY/WebSocket just to speed tab switches.
- DS-015 preserves Terminal/FileExplorer separation: Terminal must not ask FileExplorer whether it is quiesced; FileExplorer owns abort/generation suppression, live watcher release, bounded folder projection, and inactive listener/resource cleanup.
- Full API/E2E validation remains downstream-owned after code review.

## Known Risks

- Backend `typecheck` remains baseline-blocked by the existing `TS6059` rootDir/include mismatch for repository tests outside `src`, so it is not used as passing evidence. The current implementation evidence uses backend `build:full`, frontend Nuxt build, and targeted backend/frontend tests around the changed FileExplorer paths.
- The committed `autobyteus-web/generated/graphql.ts` was updated to match the changed workspace operation documents; a full schema-driven codegen pass can be rerun in a validation environment with a live schema endpoint if desired.
- Historical display and explicit activation behavior has targeted unit/integration coverage; downstream API/E2E should still exercise real UI/API flows across history display, Files activation, Terminal activation, and repeated watcher open/close.
- The isolated PTY backend intentionally changes macOS Terminal backend placement from in-process `node-pty` to helper-process `node-pty`; code review/API-E2E should verify interactive Terminal semantics alongside descriptor cleanup.
- Round-25 local checks prove bounded unit/store behavior and production builds, but downstream browser/Electron-like validation should still measure FileExplorer quiescence timing separately from Terminal PTY ready / first shell output timing per AC-066/AC-067.
- Round-29 browser-level reproduction passed against a self-started backend/frontend and specifically clears the `handleKeydown` TDZ / Nuxt 500 Files crash. Full downstream API/E2E remains required to rerun the broader Round-13 browser/Electron validation matrix.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: refactor/behavior change for lazy workspace metadata plus file-explorer capability acquisition, continuing the `spawn EBADF` watcher lifecycle fix and the Round-9 Terminal descriptor lifecycle local fix.
- Reviewed root-cause classification: boundary/ownership issue for workspace/file-explorer coupling; local low-level Terminal backend descriptor ownership issue for `E2E-TERMFD-002`.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`; round-7 design was sufficient for implementation.
- Evidence / notes: source/tests no longer contain the legacy steady-state concepts listed by architecture review; metadata APIs and file-explorer acquisition paths are split in backend and frontend. Round-17 built-backend probe returned from baseline `36` FDs to final `32` FDs, with `0` children and no `/dev/ptmx`/`(revoked)` descriptors in final `lsof` after normal command-output churn; the new integration test forced `spawn-helper` non-executable and restored it after successful isolated PTY startup/output. Round-25 implements DS-015 without Terminal/FileExplorer coupling: FileExplorer owns active generation invalidation, abort/suppression, live-session release, and bounded backend folder projection. Round-27 keeps FileExplorer as the authoritative path-containment boundary by centralizing same-prefix sibling escape prevention in `WorkspaceFileExplorer.getPath()` and routing file operations through that boundary. Round-28 completes the rename edge case by keeping rename as a same-directory leaf-name operation and validating the computed destination through that same boundary before mutation. Round-29 is a local implementation-order defect in the FileExplorerTabs setup path; the existing component/lifecycle boundary remains correct, and the fix only moves the referenced handler before the immediate active watcher can attach it.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`; metadata and file-explorer capability state are separate.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: frontend file-explorer store was split into concern-owned action/state modules to keep the store shell small. Round-17 Terminal backend code keeps parent session lifecycle split from bridge source; final size audit passed with no changed implementation source file over 500 effective non-empty lines (`isolated-pty-session.ts` 319 effective non-empty lines, bridge source 89). Round-24 DS-014 touched large file-explorer UI files and kept them under the guardrail (`FileItem.vue` 490 effective non-empty lines, `FileExplorerTabs.vue` 375, `FileExplorer.vue` 265). Round-25 changed-source size audit also passed (`WorkspaceFileExplorer` 438, `workspace.ts` 401, all other changed implementation source files below 265 effective non-empty lines). Round-26 CR-015 source-size audit passed with `WorkspaceFileExplorer` at 446 effective non-empty lines. Round-27 CR-016 source-size audit passed with `WorkspaceFileExplorer` at 461 effective non-empty lines and all touched operation files under 101. Round-28 CR-017 source-size audit passed with `RenameFileOperation` at 73 effective non-empty lines. Round-29 source-size audit passed with `FileExplorerTabs.vue` at 375 effective non-empty lines.

## Environment Or Dependency Notes

- No implementation-owned dependency changes were made. The latest-base merge carries upstream v1.3.32 version/package/release-manifest updates that delivery requested for the Electron rebuild.
- Validation logs for this implementation pass are under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/`.
- The localization audit still emits the existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning for `localization/audit/migrationScopes.ts`; the audit result is pass with zero unresolved findings.

## Local Implementation Checks Run

Implementation-scoped checks only; this is not downstream API/E2E sign-off.

Round-29 `E2E-BROWSER-FILES-001` browser Files tab TDZ local-fix checks:

- `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorerTabs.spec.ts --run`
  - Result: pass, 1 file / 2 tests.
  - Covers inactive-to-active listener attach/detach and immediate active mount without listener initialization errors.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-tabs-unit-20260529.log`
- `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts components/fileExplorer/__tests__/FileItem.spec.ts --run`
  - Result: pass, 3 files / 11 tests.
  - Covers the focused FileExplorer active/quiescence component area after the listener-order fix.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-targeted-frontend-20260529.log`
- Self-started browser-level reproduction against fresh backend/frontend (`autobyteus-server-ts` built backend on `127.0.0.1:8071`, Nuxt dev frontend on `127.0.0.1:3071`).
  - Command: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-tab-reproduction-20260529.mjs` with `FRONTEND_URL=http://127.0.0.1:3071`.
  - Result: pass; navigated from `/agents?view=list`, clicked `Daily Assistant` `Run`, reached `/workspace`, and found no Nuxt Error 500, no `Cannot access 'handleKeydown' before initialization`, and no page errors.
  - Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-tab-reproduction-20260529.mjs`
  - Probe JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-tab-reproduction-20260529.json`
  - Probe run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-tab-reproduction-20260529.run.log`
  - Backend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-backend-20260529.log`
  - Frontend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-frontend-20260529.log`
  - Screenshots: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-agents-list-before-run-20260529.png`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-tab-workspace-20260529.png`
- `pnpm -C autobyteus-web build`
  - Result: pass; existing large-chunk warnings only.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-frontend-nuxt-build-20260529.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-diff-check-20260529.log`
- Changed implementation source size audit.
  - Result: pass; `FileExplorerTabs.vue` is 375 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-source-size-20260529.log`
- Focused listener-order grep.
  - Result: pass; `handleKeydown` declaration precedes `attachGlobalListeners()` and the immediate active watcher.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round29-browser-files-listener-order-grep-20260529.log`

Round-28 CR-017 rename destination path-boundary local-fix checks:

- `pnpm -C autobyteus-server-ts test tests/unit/file-explorer/workspace-file-explorer.test.ts`
  - Result: pass, 1 file / 11 tests.
  - Covers existing watcher/bounded projection/ignored-folder/path-boundary behavior plus valid leaf-name rename and traversal-like `newName` rejection before mutation. The CR-017 regression asserts `renameFileOrFolder('sub/rename-me.txt', '../../ws-sibling/renamed-leak.txt')` rejects, the sibling leak file is not created, the original file remains, and the cached tree still contains the original path.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round28-cr017-backend-file-explorer-unit-20260529.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round28-cr017-backend-build-full-20260529.log`
- Reviewer path-boundary probe script: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round24-file-explorer-path-boundary-probes-20260529.mjs`
  - Result: pass; load/read/write same-prefix sibling escapes reject, write/rename leak files are not created, and original rename source remains after rejected traversal-like `newName`.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round28-cr017-path-boundary-probe-20260529.log`
- Focused grep for stale unsafe FileExplorer workspace-root string-prefix guards and RenameFileOperation destination validation.
  - Result: pass; no stale `workspaceRootPath` string-prefix/path-join guard patterns remain in `autobyteus-server-ts/src/file-explorer`, and `RenameFileOperation` contains the leaf-name guard plus destination `resolveWorkspacePath()`.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round28-cr017-path-boundary-grep-20260529.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round28-cr017-diff-check-20260529.log`
- Changed-source size audit for the touched backend FileExplorer implementation files.
  - Result: pass; `WorkspaceFileExplorer` is 461 effective non-empty lines, `BaseFileOperation` is 32, and `RenameFileOperation` is 73.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round28-cr017-source-size-20260529.log`

Round-27 CR-016 file-explorer path-boundary local-fix checks:

- `pnpm -C autobyteus-server-ts test tests/unit/file-explorer/workspace-file-explorer.test.ts`
  - Result: pass, 1 file / 9 tests.
  - Covers existing watcher/bounded projection/ignored-folder behavior plus same-prefix sibling escape rejection for `loadFolderChildren('../ws-sibling')`; the regression asserts no full-tree rebuild is called and the cached tree remains unmodified after the rejected request.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round27-cr016-backend-file-explorer-unit-20260529.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round27-cr016-backend-build-full-20260529.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round27-cr016-diff-check-20260529.log`
- Changed-source size audit for the touched backend FileExplorer implementation files.
  - Result: pass; `WorkspaceFileExplorer` is 461 effective non-empty lines, and touched operation files are all under 101 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round27-cr016-source-size-20260529.log`
- Focused grep for stale unsafe FileExplorer workspace-root string-prefix guards.
  - Result: pass; no stale `workspaceRootPath` string-prefix guard/path-join guard patterns remain in `autobyteus-server-ts/src/file-explorer`.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round27-cr016-path-boundary-grep-20260529.log`

Round-26 CR-015 ignored-folder policy local-fix checks:

- `pnpm -C autobyteus-server-ts test tests/unit/file-explorer/workspace-file-explorer.test.ts`
  - Result: pass, 1 file / 8 tests.
  - Covers existing watcher/bounded projection behavior plus direct requested-folder ignore enforcement for `.git`, `node_modules`, and a `.gitignore`-ignored folder. The regression asserts no full-tree rebuild is called and the tree remains unmodified after ignored direct requests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round26-cr015-backend-file-explorer-unit-20260529.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round26-cr015-backend-build-full-20260529.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round26-cr015-diff-check-20260529.log`
- Changed-source size audit for the touched backend FileExplorer implementation file.
  - Result: pass; `WorkspaceFileExplorer` is 446 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round26-cr015-source-size-20260529.log`

Round-25 DS-015 FileExplorer quiescence checks:

- `pnpm -C autobyteus-server-ts test tests/unit/file-explorer/workspace-file-explorer.test.ts`
  - Result: pass, 1 file / 7 tests.
  - Covers watcher lease lifecycle plus new bounded `WorkspaceFileExplorer.loadFolderChildren()` projection that does not call `buildWorkspaceDirectoryTree()` and does not load grandchildren for ordinary folder loads.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round25-backend-file-explorer-unit-20260529.log`
- `pnpm -C autobyteus-web test:nuxt stores/__tests__/workspaceStore.spec.ts components/fileExplorer/__tests__/FileExplorer.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts components/fileExplorer/__tests__/FileItem.spec.ts --run`
  - Result: pass, 4 files / 22 tests.
  - Covers final visible consumer release, live stream disconnect, search abort, folder-generation invalidation, AbortSignal propagation, late folder response suppression, active/inactive FileExplorer listener gating, and no per-node global FileItem listeners.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round25-frontend-file-explorer-quiescence-tests-20260529.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round25-backend-build-full-20260529.log`
- `pnpm -C autobyteus-web build`
  - Result: pass; emitted existing large-chunk warnings only.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round25-frontend-nuxt-build-20260529.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round25-diff-check-20260529.log`
- Changed-source size audit for touched Round-25 implementation files.
  - Result: pass; no changed implementation source file exceeds 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round25-source-size-20260529.log`
- `pnpm -C autobyteus-server-ts typecheck`
  - Result: not used as passing evidence; command remains baseline-blocked by existing `TS6059` rootDir/include mismatch for repository test files outside `src`. Backend `build:full` passed for source compilation.

Round-24 DS-014 Files-to-Terminal lifecycle checks:

- `pnpm -C autobyteus-web test:nuxt run components/layout/__tests__/RightSideTabs.spec.ts components/fileExplorer/__tests__/FileExplorer.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts components/fileExplorer/__tests__/FileItem.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts`
  - Result: pass, 6 files / 29 tests.
  - Covers Files lazy-before-first-use, cached hidden Files when switching to Terminal, inactive live-session/search/listener release, no per-node global FileItem listeners, FileExplorerTabs active listener gating, and existing Terminal root-path frontend behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round24-files-terminal-lifecycle-frontend-tests-20260529.log`
- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 4 files / 26 tests.
  - Confirms DS-014 did not require backend Terminal lifecycle changes and the root-path/descriptor-safe Terminal backend subset still passes.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round24-files-terminal-backend-terminal-tests-20260529.log`
- `pnpm -C autobyteus-web guard:web-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round24-files-terminal-web-boundary-20260529.log`
- Focused Files/Terminal lifecycle grep.
  - Result: pass; Terminal path has no file-explorer acquisition/import references; Files panel uses lazy/cached `v-show` with explicit active prop; `FileItem` no longer registers per-node global close/drag listeners; active FileExplorer owner owns consolidated listener and inactive suspension hooks.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round24-files-terminal-lifecycle-grep-20260529.log`
- Changed-source size audit for touched DS-014 implementation files.
  - Result: pass; no changed implementation source file exceeds 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round24-files-terminal-source-size-20260529.log`
- `git diff --check` and `git diff --cached --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round24-files-terminal-diff-check-20260529.log`

Round-23 CR-014 local-fix checks:

- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 4 files / 26 tests.
  - Covers the corrected Terminal handler target-key fixture cleanup plus Terminal manager, WebSocket integration, and lifecycle paths requested by code review.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round23-cr014-terminal-tests-20260528.log`
- Focused CR-014 grep for stale Terminal target/workspace naming (`closeAllForWorkspace`, `terminalTargetId`, `sessions by workspace`, `ws1`, `ws2`) across `autobyteus-server-ts/src/services/terminal-streaming` and `autobyteus-server-ts/tests/unit/services/terminal`.
  - Result: pass; stale symbols/fixtures are gone and expected `targetKey`/`closeAllForTargetKey`/`target-1` references remain.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round23-cr014-terminal-naming-grep-20260528.log`
- `git diff --check` and `git diff --cached --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round23-cr014-diff-check-20260528.log`

Round-22 CR-013 local-fix checks:

- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 3 files / 17 tests.
  - Covers the corrected `PtySessionManager` target-key unit coverage plus Terminal WebSocket integration and lifecycle paths requested by code review.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round22-cr013-terminal-manager-tests-20260528.log`
- Focused CR-013 grep for stale Terminal manager workspace naming (`closeAllForWorkspace`, `ws1`, `ws2`, and `sessions by workspace`) across `PtySessionManager`, `TerminalHandler`, and the TS/JS unit test counterparts.
  - Result: pass; stale symbols/fixtures are gone and expected `closeAllForTargetKey`/`targetKey` references remain.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round22-cr013-terminal-manager-grep-20260528.log`
- `git diff --check` and `git diff --cached --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round22-cr013-diff-check-20260528.log`

Round-21 user-requested code-review advisory cleanup checks:

- `pnpm -C autobyteus-web test:nuxt run components/layout/__tests__/RightSideTabs.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts`
  - Result: pass, 3 files / 17 tests.
  - Covers extracted right-panel open-file auto-switch behavior, mobile-tools Files suppression, Terminal root-path frontend behavior, and Terminal UI activation.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round21-terminal-tabs-advisory-frontend-tests-20260528.log`
- `pnpm -C autobyteus-server-ts test tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 2 files / 7 tests.
  - Covers Terminal WebSocket root-path/cwd flow, close-before-connect cleanup, partial-session cleanup, and real PTY lifecycle after internal naming cleanup.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round21-terminal-tabs-advisory-backend-tests-20260528.log`
- Terminal manager naming and `RightSideTabs.vue` dependency grep.
  - Result: pass; Terminal streaming source has no legacy `workspaceId`/`closeAllForWorkspace` naming, and `RightSideTabs.vue` no longer imports/calls file-explorer or workspace stores for open-file auto-switching.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round21-terminal-tabs-advisory-boundary-grep-20260528.log`
- `pnpm -C autobyteus-web guard:web-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round21-terminal-tabs-advisory-web-boundary-20260528.log`
- `git diff --check` and `git diff --cached --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round21-terminal-tabs-advisory-diff-check-20260528.log`
- Changed-source size audit for touched implementation files.
  - Result: pass; no changed source implementation file exceeds 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round21-terminal-tabs-advisory-source-size-20260528.log`

Round-20 delivery latest-base merge-conflict local-fix checks:

- `pnpm -C autobyteus-web test:nuxt run components/mobile/__tests__/MobileFiles.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileArtifacts.spec.ts components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts components/mobile/__tests__/MobileTeamMessages.spec.ts composables/mobile/__tests__/useMobileFileContextCoordinator.spec.ts composables/mobile/__tests__/useMobileFocusedRunIdentity.spec.ts composables/mobile/__tests__/useMobileLaunchWorkspaces.spec.ts stores/__tests__/mobileWorkStore.spec.ts`
  - Result: pass, 12 files / 71 tests.
  - Covers the Round-20 conflicted mobile Files/file-reference shell plus prior mobile UX/context regression surfaces and latest-base team-reference rows.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-frontend-mobile-file-reference-tests-20260528.log`
- `pnpm -C autobyteus-web guard:web-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-frontend-web-boundary-20260528.log`
- `pnpm -C autobyteus-web guard:localization-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-frontend-localization-boundary-20260528.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-frontend-localization-audit-20260528.log`
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/node-pty-bootstrap.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Result: pass, 4 files / 18 tests.
  - Confirms the latest-base integration did not disturb isolated PTY spawn-helper repair, Darwin backend selection, or isolated-session command-output coverage.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-autobyteus-ts-terminal-focused-20260528.log`
- `git diff --check` and `git diff --cached --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-diff-check-20260528.log`
- Changed-source size audit for touched frontend implementation files.
  - Result: pass; no changed source implementation file exceeds 500 effective non-empty lines (`MobileFiles.vue` 318, `useMobileWorkspaceFileExplorer.ts` 295).
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-source-size-20260528.log`

Round-19 delivery latest-base merge-conflict local-fix checks:

- `pnpm -C autobyteus-web test:nuxt run components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileArtifacts.spec.ts components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts composables/mobile/__tests__/useMobileFocusedRunIdentity.spec.ts composables/mobile/__tests__/useMobileLaunchWorkspaces.spec.ts stores/__tests__/mobileWorkStore.spec.ts`
  - Result: pass, 8 files / 57 tests.
  - Covers all conflicted mobile tests plus latest-base mobile artifacts/run-setup composables and store behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-frontend-mobile-conflict-tests-20260528.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-frontend-localization-audit-20260528.log`
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Result: pass, 4 files / 27 tests.
  - Confirms latest-base integration did not disturb the isolated PTY spawn-helper and Terminal backend selection coverage.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-autobyteus-ts-terminal-unit-integration-20260528.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests.
  - Confirms root-path Terminal WebSocket lifecycle and close-before-connect cleanup coverage still passes after latest-base integration.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-server-terminal-e2e-20260528.log`
- Source/test/ticket-artifact scoped diff check for the resolved mobile files, ticket handoff/blocker artifact, and Round-19 evidence logs.
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-source-test-diff-check-20260528.log`

Round-18 delivery latest-base merge-conflict local-fix checks:

- `pnpm -C autobyteus-web test:nuxt run components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
  - Result: pass, 1 file / 15 tests.
  - Covers the resolved mobile shell test set: ticket-side mobile work selection/post-pair behavior plus latest-base safe-container QR session replacement and 401 authorized-catalog session-drop behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round18-frontend-mobile-remote-access-shell-20260524.log`
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Result: pass, 4 files / 27 tests.
  - Confirms latest-base integration did not disturb the Round 17 isolated PTY spawn-helper and Terminal backend selection coverage.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round18-autobyteus-ts-terminal-unit-integration-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests.
  - Confirms latest-base integration did not disturb root-path Terminal WebSocket lifecycle and close-before-connect cleanup coverage.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round18-server-terminal-e2e-20260524.log`
- Source/docs scoped diff check for the resolved file, ticket handoff/blocker artifact, and Round-18 evidence logs.
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round18-source-doc-diff-check-20260524.log`

Round-17 CR-012 isolated PTY spawn-helper bootstrap local-fix checks:

- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Result: pass, 4 files / 27 tests.
  - Covers Darwin backend selection/fallback ordering, isolated PTY bridge startup/write/resize/read/close semantics, existing `PtySession` cleanup behavior, bootstrap-before-spawn ordering, close-during-bootstrap no-spawn cleanup, and real `spawn-helper` chmod repair with original mode restoration.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-autobyteus-ts-terminal-unit-integration-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests.
  - Covers root-path Terminal cwd, unavailable-cwd rejection before session creation, close-before-connect/repeated churn cleanup, and real Terminal output.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-server-terminal-e2e-20260524.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-backend-build-full-20260524.log`
- Focused built-backend macOS Terminal descriptor/timing probe copied from the Round-9 API/E2E failure harness.
  - Command: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524.mjs`
  - Result: pass; baseline after health `36` FDs, after 8 normal real command-output sessions `32` FDs, after 25 early-close sessions `32` FDs, final after abort-before-open churn `32` FDs, final child count `0`, and final `lsof` contains no `/dev/ptmx` or `(revoked)` descriptors.
  - Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524.mjs`
  - Probe JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524.json`
  - Probe run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524.run.log`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524-final-lsof.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524-server.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-source-doc-diff-check-20260524.log`
- Changed implementation source size audit.
  - Result: pass; changed round-17 implementation source files are all <= 500 effective non-empty lines (`isolated-pty-session.ts` 319 effective non-empty lines, bridge source 89).
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-source-size-20260524.log`

Round-16 `E2E-TERMFD-002` normal Terminal command-output descriptor local-fix checks:

- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts`
  - Result: pass, 3 files / 25 tests.
  - Covers Darwin backend selection, fallback ordering, isolated PTY child-process startup/write/resize/read/close semantics, stream destruction on normal child exit, pending-read flush, idempotent close, and existing in-process `PtySession` cleanup behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-autobyteus-ts-terminal-unit-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests.
  - Covers root-path Terminal cwd, unavailable-cwd rejection before session creation, close-before-connect/repeated churn cleanup, and the durable output assertion now waits for actual cwd output instead of the echoed command literal.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-server-terminal-e2e-20260524.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-backend-build-full-20260524.log`
- Focused built-backend macOS Terminal descriptor/timing probe copied from the Round-9 API/E2E failure harness.
  - Command: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524.mjs`
  - Result: pass; baseline after health `36` FDs, after 8 normal real command-output sessions `32` FDs, final after early-close/abort churn `32` FDs, final child count `0`, and final `lsof` contains no `/dev/ptmx` or `(revoked)` descriptors.
  - Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524.mjs`
  - Probe JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524.json`
  - Probe run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524.run.log`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524-final-lsof.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524-server.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-diff-check-20260524.log`
- Changed implementation source size audit.
  - Result: pass; changed round-16 implementation source files are all <= 500 effective non-empty lines (`isolated-pty-session.ts` 313 effective non-empty lines, bridge source 89).
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-source-size-20260524.log`

Round-13 latest-base merge-conflict integration checks:

- `git diff --check HEAD -- autobyteus-web autobyteus-server-ts autobyteus-android autobyteus-message-gateway docs scripts .github README.md`
  - Result: pass.
  - Scope note: source/docs scoped because the merge brings upstream `tickets/done/**` validation logs from `origin/personal`; those upstream archived logs are not source/docs and were not edited for this ticket.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-diff-check-20260523.log`
- `git diff --check origin/personal...HEAD -- autobyteus-web autobyteus-server-ts autobyteus-ts autobyteus-android autobyteus-message-gateway docs scripts .github README.md`
  - Result: pass after committing the latest-base merge.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-post-merge-source-docs-diff-check-20260523.log`
- `pnpm -C autobyteus-web test:nuxt run components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts`
  - Result: pass, 5 files / 48 tests.
  - Covers the merged mobile shell with no `MobileTools.vue`, mobile Files metadata/file-explorer/live-session ownership, cwd-based Terminal frontend session behavior, and Terminal component root-path target behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-frontend-mobile-terminal-tests-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 4 files / 26 tests.
  - Covers the preserved backend Terminal FD lifecycle behavior after latest-base integration: close-before-connect churn, invalid cwd rejection, partial setup cleanup, and real PTY close/release.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-backend-terminal-targeted-20260523.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-frontend-localization-audit-20260523.log`

Round-14 run GraphQL/API-layer and run-service integration checks:

- `pnpm -C autobyteus-server-ts test tests/unit/api/graphql/types/agent-run.test.ts tests/unit/api/graphql/types/agent-team-run.test.ts tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts tests/integration/agent-execution/agent-run-service.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - Initial result: failed because `agent-run-service.integration.test.ts` still used a stale legacy `historyIndexService` dependency shape and therefore did not exercise the current prepared-run/history-catalog lifecycle correctly.
  - Fix: updated the durable integration test to use an in-memory `historyCatalogService`/metadata harness matching the current `recordPreparedRun -> recordRunStarted -> recordRunTerminated` boundary.
  - Final result: pass, 7 files / 36 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round14-run-graphql-integration-tests-20260523.log`
- `git diff --check -- autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round14-diff-check-20260523.log`

Round-15 CR-011 local-fix checks:

- `rg -n "historyIndexService|recordRunCreated|recordRunRestored" autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts`
  - Result: pass; no stale legacy run-history mock references remain.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round15-legacy-run-history-grep-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/api/graphql/types/agent-run.test.ts tests/unit/api/graphql/types/agent-team-run.test.ts tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts tests/integration/agent-execution/agent-run-service.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - Result: pass, 7 files / 36 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round15-run-graphql-integration-tests-20260523.log`
- `git diff --check -- autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round15-diff-check-20260523.log`

Round-12 local-fix checks for `E2E-TERMFD-001`:

- `pnpm -C autobyteus-ts exec vitest --run tests/unit/tools/terminal/pty-session.test.ts`
  - Result: pass, 1 file / 12 tests.
  - Covers idempotent PTY close, node-pty resource destruction/listener disposal, and close-during-startup rejection/cleanup.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-autobyteus-ts-pty-session-unit-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 4 files / 26 tests.
  - Covers in-flight session close during startup, Terminal handler startup-abort behavior, cwd-based WebSocket integration, invalid cwd rejection, real PTY close/release, and repeated close-before-connect churn.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-backend-terminal-targeted-20260523.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-backend-build-full-20260523.log`
- Focused built-backend macOS Terminal FD probe copied from API/E2E failure harness.
  - Command: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523.mjs`
  - Result: pass; baseline `36` FDs, normal attached close `38` FDs, final after 25 close-before-connect cycles `39` FDs with `0` child processes. This removes the previous linear growth to `111` FDs.
  - Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523.mjs`
  - Probe log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523.log`
  - Probe JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523.json`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523-final-lsof.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523-server.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-diff-check-20260523.log`
- Changed implementation source size audit for the round-12 Terminal lifecycle files.
  - Result: pass; changed round-12 implementation files are all <= 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-source-size-audit-20260523.log`

Round-10 local-fix checks:

- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-diff-check-20260523.log`
- Focused Terminal/mobile boundary grep.
  - Result: pass; no old terminal workspace-id route/materialized-workspace lookup, no Terminal component workspace activation, and no Mobile Files `.fileExplorer`/`allWorkspaces`/workspace-id Terminal prop path. Positive grep confirms root-path `TerminalTarget`, `useWorkspaceFileExplorer`, and mobile visible live-session ownership.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-boundary-grep-20260523.log`
- Legacy steady-state concept grep after round-10 changes.
  - Result: pass; no `WorkspaceReference`, `workspaceReference`, `WorkspaceActivation`, `ensureWorkspaceInitialized`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, direct `getFileExplorer()`, or direct `workspace.searchFiles()` matches in backend/frontend source/test scope.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-legacy-name-grep-20260523.log`
- Changed implementation source size audit.
  - Result: pass; changed implementation source files in the round-10 area are all <= 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-source-size-audit-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts`
  - Result: pass, 3 files / 22 tests.
  - Covers terminal unit behavior plus cwd-based Terminal WebSocket, invalid cwd rejection, close-while-connect-pending cleanup, and partial PTY setup cleanup.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-backend-terminal-unit-integration-tests-20260523.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-backend-build-full-20260523.log`
- `pnpm -C autobyteus-web test:nuxt composables/__tests__/useTerminalSession.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
  - Result: pass, 5 files / 47 tests.
  - Covers cwd terminal URL, no Terminal workspace activation, then-current Mobile Tools root-path targets with empty workspace store, Mobile Files metadata activation/file-explorer store/live-session ownership, and mobile static boundary guards. Round-13 latest-base integration superseded the Mobile Tools surface by keeping it deleted.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-frontend-terminal-mobile-tests-20260523.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-frontend-localization-audit-20260523.log`
- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-frontend-boundary-guards-20260523.log`

Prior round-7 implementation checks retained as upstream confidence evidence:

- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-diff-check-20260523.log`
- Legacy steady-state concept grep across backend source/tests and frontend source/tests/generated docs scope.
  - Result: pass; no `WorkspaceReference`, `workspaceReference`, `WorkspaceActivation`, `ensureWorkspaceInitialized`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, old explorer module names, direct `getFileExplorer()`, direct `workspace.searchFiles()`, or old reference-backed naming found.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-legacy-name-grep-20260523.log`
- Changed implementation source size audit.
  - Result: pass; no changed implementation source file over 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-source-size-audit-20260523.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-backend-build-full-20260523.log`
- `pnpm -C autobyteus-server-ts test` with targeted workspace/file-explorer/team-run suite.
  - Result: pass, 12 files / 71 tests.
  - Covered unit, integration, and the existing real file-explorer WebSocket lifecycle E2E as local implementation confidence.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-backend-targeted-tests-20260523.log`
- `pnpm -C autobyteus-web test:nuxt` with targeted workspace metadata/file-explorer/config/history/mobile suite.
  - Result: pass, 21 files / 166 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-frontend-targeted-tests-20260523.log`
- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-frontend-boundary-guards-20260523.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-frontend-localization-audit-20260523.log`

## Downstream Validation Hints / Suggested Scenarios

Round-29 `E2E-BROWSER-FILES-001` downstream focus:

- Re-run the Round-13 browser-level Files tab flow against a fresh backend/frontend and confirm `/workspace` does not render Nuxt Error 500 and no `Cannot access 'handleKeydown' before initialization` / minified TDZ error appears in browser console or page errors.
- Re-check the packaged/Electron-like flow that originally showed the minified `Cannot access 'ee' before initialization` symptom.
- Keep broader DS-015 checks for inactive FileExplorer resource quiescence and Terminal first-paint behavior in the API/E2E scope.

Round-28 CR-017 downstream focus:

- Re-run reviewer path-boundary probe or equivalent GraphQL/API path-boundary check to confirm rename traversal-like `newName` values reject before filesystem mutation and same-prefix sibling leak files are not created.
- Confirm GraphQL rename behavior still accepts valid leaf names and continues to direct cross-folder moves through `moveFileOrFolder()` rather than `renameFileOrFolder()`.

Round-27 CR-016 downstream focus:

- Re-run reviewer path-boundary probe or equivalent GraphQL/API path-boundary check to confirm same-prefix sibling requests such as `../ws-sibling` reject and do not mutate FileExplorer cached tree state.
- Confirm file read/write/move/rename/remove/add operations still reject outside-workspace paths through the shared `WorkspaceFileExplorer.getPath()` boundary while preserving their operation-specific errors.

Round-25 DS-015 downstream focus:

- Browser/Electron-like sequence: Terminal -> Files -> load/open folder tree -> Terminal; record FileExplorer inactive/quiescence timing separately from Terminal backend PTY ready and first real shell output.
- Confirm inactive cached Files has no live file-explorer WebSocket/watcher lease, no active snapshot/folderChildren/search task, no global FileExplorer listeners, and no stale late folder/search mutations.
- Confirm GraphQL `folderChildren` returns immediate folder projection without an ordinary full workspace rebuild; deeper folders load only when explicitly requested.


- Historical standalone run display: verify no backend workspace creation/file-explorer acquisition until an explicit workspace-dependent action is invoked.
- Historical team run/member display: verify team/member metadata is shown without workspace initialization, including per-member workspace metadata.
- Files desktop/mobile: verify first visible file-explorer surface acquires file-explorer capability and live watcher, and close/collapse/unmount releases live watcher ownership.
- Terminal desktop/mobile: verify Terminal uses metadata/root path for runtime cwd and only activates workspace-dependent behavior at the explicit terminal action boundary; rerun the focused built-backend FD probe to confirm normal command-output churn and close-before-connect churn do not retain server-owned PTY/revoked descriptors.
- Context file browser/search/read/write and skill file explorer: verify these remain intended file-explorer acquisition paths.
- WebSocket lifecycle: repeat real close-before-connected and repeated open/close tests to confirm watcher leases release promptly and child-process spawn remains healthy.
- Team launch: verify same-root members activate once, distinct roots activate once each, and filesystem metadata IDs without root paths reject.

## API / E2E / Executable Validation Still Required

Code review should run before API/E2E resumes. After re-review, API/E2E should validate the full integrated behavior for metadata-only history/workspace paths, explicit Files/Terminal/context acquisition, watcher lifecycle stability, the macOS built-backend Terminal descriptor probe for `E2E-TERMFD-002`, and the delivery Electron build path that previously failed at localization audit.
