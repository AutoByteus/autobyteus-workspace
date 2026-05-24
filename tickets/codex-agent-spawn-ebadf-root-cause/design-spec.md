# Design Spec: WorkspaceMetadata, Lazy WorkspaceFileExplorer, Demand-Driven Watchers, and Root-Path Terminal

Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
Date: 2026-05-22
Status: Round 9 Terminal normal-session descriptor lifecycle rework added after E2E-TERMFD-002; ready for architecture review

Related artifacts:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`

Revision after architecture review round 1:

- AR-001 covered by making the dedicated mobile `explorer` panel the only mobile file-explorer live surface and requiring mobile tools `RightSideTabs` to suppress the `files` tab/render path.
- AR-002 covered by assigning raw WebSocket pending-connect cleanup to `api/websocket/file-explorer.ts` and atomic lease/session setup cleanup to `FileExplorerStreamHandler.connect()`.

Same-ticket release-blocker revision after implementation/delivery validation:

- Slow historical run opening is now in scope because the current-ticket build is not releasable if history rows eagerly initialize workspaces.
- Historical run viewing must use canonical `workspaceRootPath` / cheap workspace reference and must not create/initialize a workspace or build file trees. File-tree materialization is reserved for Files/context browsing and similar file-explorer features; Terminal/resume/rerun use root path/cwd directly.

Revision after architecture review round 3:

- AR-003 was originally addressed with a cheap workspace reference concept. The authoritative Round 8 steady-state name is now `WorkspaceMetadata`; `WorkspaceReference` is a legacy/current-state or temporary migration alias only.
- AR-004 covered by adding the team historical hydration spine and splitting live member workspace materialization from historical member context shell/reference building. Round 8 represents those per-member identities as `WorkspaceMetadata` values and does not call `ensureWorkspaceByRootPath()` for every member.

Same-ticket Terminal root-path revision:

- User validation of the delivered Electron build showed opening Terminal can be slow. Current code confirms Terminal calls `workspaceStore.ensureWorkspaceInitialized(reference)` and backend Terminal requires `workspaceManager.getWorkspaceById(workspaceId)`, so Terminal inherits file-tree materialization cost.
- Terminal is reclassified as a cwd/root-path feature, like history display and resume/rerun. It must not materialize `WorkspaceInfo`, call `FileSystemWorkspace.initialize()`, build file trees, or acquire file-explorer watcher resources merely to open a PTY.

Revision after architecture review round 5:

- AR-005 covered by adding the mobile Tools Terminal surface to the Terminal root-path design. `MobileTools.vue` must derive a root-path `TerminalTarget` from `MobileWorkContext` or the focused team member `WorkspaceMetadata` and pass it to `Terminal.vue`; it must not gate Terminal on initialized `WorkspaceInfo` or pass an initialized-workspace-id-only prop.
- AR-006 covered by adding a Terminal WebSocket pending-connect cleanup contract mirroring the file-explorer route principle: terminal route cleanup tracks `closed`, `cleanupStarted`, `connectPromise`, `connectedSessionId`, pending messages, and disconnects any late-created PTY session after early close or setup failure.


Historical Round 6 user-requested architecture clarification, now superseded by Round 8 naming where applicable:

- Target terminology changes from `WorkspaceReference` to `WorkspaceMetadata`: the cheap object is metadata, not a live reference/handle.
- `Workspace` is defined as metadata plus an optional lazy `FileExplorer` capability. `createWorkspace()` / `getOrCreateWorkspace()` create or return metadata only and must never create the internal FileExplorer.
- `BaseFileExplorer` and `LocalFileExplorer` are removed/collapsed because the product has only one local filesystem file explorer. The concrete workspace-scoped `WorkspaceFileExplorer` owns tree/search/file operations and watcher leases.
- FileExplorer creation/release is initiated only by file-explorer consumers: desktop Files, mobile Files, skill file explorer, and context file browser/search/read/write. Agent runtime, Codex/Claude/AutoByteus cwd resolution, history, resume/rerun, and Terminal use only WorkspaceMetadata/rootPath.


Historical Round 7 API-preserving refinement, preserved by Round 8:

- Keep `WorkspaceManager`, `Workspace`, `SkillWorkspace`, `TempWorkspace`, and `createWorkspace()` as the top-level domain API where practical. The API names are good; the implementation semantics must change.
- `createWorkspace()` means create/register a Workspace metadata/capability container only. It must not initialize the FileExplorer, FileNameIndexer, search strategy, file tree, or watcher.
- FileExplorer remains a lazy explicit capability acquired through file-explorer paths, e.g. `workspace.acquireFileExplorer(reason)`.
- Do not introduce a steady-state parallel `WorkspaceMetadataManager`; that would fragment ownership. `WorkspaceManager` remains the authoritative owner of workspace metadata/objects.


Round 8 concept-separation refinement:

- The lazy capability is named `WorkspaceFileExplorer` in the target design to make ownership explicit: it is the file-explorer capability for one workspace, not general workspace metadata and not a speculative remote/local hierarchy.
- `WorkspaceFileExplorer` owns tree state, folder loading, `FileNameIndexer`, search, file operations, watcher leases, and live update fanout. It may decompose internally into `WorkspaceFileTreeState`, `WorkspaceFileSearchIndex`, `WorkspaceFileOperations`, and `WorkspaceFileWatcherLeaseManager`.
- Tree payloads sent to the frontend are `WorkspaceFileExplorerTree` / file-explorer-specific projections, not fields on `WorkspaceMetadata`. Frontend `workspaceStore` remains metadata-only; frontend file-explorer state owns tree/search/open-file/loading/live-stream state by `workspaceId`.



Authoritative naming note after AR-007:

- Round 8 is the only steady-state target.
- `WorkspaceReference`, `WorkspaceActivationState`, `BaseFileExplorer`, `LocalFileExplorer`, `WorkspaceInfo.fileExplorer`, and `ensureWorkspaceInitialized(reference)` are legacy/current-state or temporary migration names only, not target architecture.


Round 9 Terminal descriptor-lifecycle refinement after API/E2E:

- `E2E-TERMFD-002` showed normal attached Terminal command-output sessions can leave `/dev/ptmx` / `(revoked)` descriptors after close even when `PtySessionManager.sessionCount` and child process count return to zero.
- Terminal close acceptance now covers normal open/run-command/output/close descriptor cleanup, not only close-before-connect and setup-failure cleanup.
- `TerminalSession.close()` / `PtySessionManager.closeSession()` must represent deep OS-resource cleanup: read loop termination, pending read/timer cleanup, listener disposal, child exit/kill fallback, and PTY descriptor release.
- Durable validation must measure process FDs and PTY/revoked descriptor lines after repeated real command-output Terminal sessions.

## Current-State Read

### Original frontend execution path at ticket start

At initial root-cause investigation, frontend workspace loading opened live filesystem streams too early:

- `autobyteus-web/stores/workspace.ts:createWorkspace()` stores the workspace, then calls `connectToFileSystemChanges(newWorkspace.workspaceId)`.
- `autobyteus-web/stores/workspace.ts:fetchAllWorkspaces()` iterates all fetched workspaces and calls `connectToFileSystemChanges(ws.workspaceId)` for each one.
- `autobyteus-web/stores/workspace.ts:registerSkillWorkspace()` creates a placeholder workspace and immediately calls `connectToFileSystemChanges(workspaceId)`.
- `connectToFileSystemChanges()` creates a `FileExplorerStreamingService` and calls `service.connect(workspaceId)`.

This means loading known workspaces, not user-visible file-explorer intent, causes backend watcher startup.

Desktop rendering is closer to the desired model but still incomplete:

- `RightSideTabs.vue` renders `FileExplorerLayout` only when `activeTab === 'files'`.
- `WorkspaceDesktopLayout.vue` hides the entire right panel with `v-show`, so if the active tab is Files and the right panel is collapsed, the file explorer component may remain mounted even though it is not visible.

Mobile rendering currently keeps the explorer mounted while hidden:

- `WorkspaceMobileLayout.vue` wraps the explorer in `v-if="hasActiveWorkspace"` and `v-show="activeMobilePanel === 'explorer'"`.
- Because `v-show` does not unmount, a mount-driven live subscription would stay active even when mobile user is on another panel unless this is changed.
- `WorkspaceMobileLayout.vue` also mounts `RightSideTabs` inside the mobile `tools` panel via `v-show`.
- `RightSideTabs` has global right-side-tab state and can render `FileExplorerLayout` when `activeTab === 'files'`. Therefore mobile has a second hidden file-explorer path today: `activeMobilePanel !== 'explorer'` but mobile `RightSideTabs` still mounted and active right-side tab equals `files`.
- Target decision retained in Round 8: the mobile `tools` panel must not expose or render the `files` tab through `RightSideTabs`; the dedicated mobile `explorer` panel is the only mobile file-explorer live surface. That visible surface acquires the lazy `WorkspaceFileExplorer` from `WorkspaceMetadata`; hidden panels and metadata-only contexts never create it.

Skill detail embeds an always-visible file explorer while the skill detail page is mounted:

- `SkillDetail.vue` renders `<FileExplorer :workspaceId="workspaceId" />` and `<FileExplorerTabs :workspaceId="workspaceId" />`.
- This should remain a valid live-consumer path while the skill detail workspace is displayed.

### Original backend execution path at ticket start

At initial root-cause investigation, backend watcher startup was also too implicit:

- `FileSystemWorkspace.initialize()` builds a shallow tree, creates `FileNameIndexer`, creates search strategy, then starts `completeFullInitialization()` in the background.
- `completeFullInitialization()` builds the full workspace tree and calls `fileNameIndexer.start()`.
- `FileNameIndexer.start()` builds an index, then calls `fileExplorer.ensureWatcherStarted()` and subscribes to watcher events.
- `LocalFileExplorer.ensureWatcherStarted()` calls `FileExplorer.startWatcher()`.
- `FileExplorer.startWatcher()` creates `FileSystemWatcher`, whose `start()` calls recursive `chokidar.watch(workspaceRootPath, ...)`.
- `FileExplorerStreamHandler.connect()` separately calls `fileExplorer.ensureWatcherStarted()` before creating a streaming session.
- `FileExplorerStreamHandler.disconnect()` closes the session but has no explicit watcher lease to release.
- `autobyteus-server-ts/src/api/websocket/file-explorer.ts` currently stores `sessionId` only after async `connect()` resolves. If the socket closes before that resolution, the close handler sees `sessionId === null` and returns. After watcher leases are introduced, that race could leak a late-created session/lease unless the route tracks pending connect cleanup.

### Current implemented historical run open path

After the watcher lifecycle implementation, a separate same-ticket release blocker remains:

- `autobyteus-web/stores/runHistoryLoadActions.ts:openHistoricalRun()` calls `openAgentRun()`.
- `openAgentRun()` calls `loadRunContextHydrationPayload()`.
- `loadRunContextHydrationPayload()` calls `input.ensureWorkspaceByRootPath(resumeConfig.metadataConfig.workspaceRootPath)` before building the run config or selecting the run.
- `ensureRunHistoryWorkspaceByRootPath()` may call `workspaceStore.fetchAllWorkspaces()` and then `workspaceStore.createWorkspace({ root_path })`.
- Backend `WorkspaceManager.createWorkspace()` awaits `FileSystemWorkspace.initialize()`.
- `FileSystemWorkspace.initialize()` calls `fileExplorer.buildWorkspaceDirectoryTree(1)`.

This means opening a historical run can still pay filesystem workspace materialization/tree-scan cost before the user opens Files or any other file-tree-dependent surface. The historical payload already contains `workspaceRootPath`, which is enough to display historical metadata. A live/current initialized workspace is not needed for read-only history viewing.

### Current implemented historical team/member open path

Team history has a separate eager path that must not be hidden behind the standalone agent fix:

- `autobyteus-web/stores/runHistorySelectionActions.ts:openTeamMemberRunFromHistory()` calls `openTeamRun()` and passes `ensureWorkspaceByRootPath`.
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts:openTeamRun()` calls `loadTeamRunContextHydrationPayload()` and receives `firstWorkspaceId` for `TeamRunConfig` reconstruction.
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:loadHistoricalTeamRunContextHydrationPayload()` fetches the focused member projection, but then calls `buildTeamMemberContexts({ ensureWorkspaceByRootPath })`.
- `autobyteus-web/stores/runHistoryTeamHelpers.ts:buildTeamMemberContexts()` loops all flattened agent members and calls `ensureWorkspaceByRootPath(member.workspaceRootPath)` for each member with a path before building that member config.
- `autobyteus-web/utils/teamRunConfigUtils.ts:reconstructTeamRunConfigFromMetadata({ firstWorkspaceId })` writes that id into `TeamRunConfig.workspaceId` without retaining the root-path/display reference.

Therefore historical team/member viewing can multiply the same eager workspace materialization cost across all team members, even when only one focused member projection is being viewed.

### Current implemented Terminal open path

The Terminal feature still uses the old materialized-workspace boundary:

- `autobyteus-web/components/workspace/tools/Terminal.vue` computes a `requestedWorkspaceReference`, then `connectTerminal()` calls `ensureWorkspaceForTerminal()`.
- `ensureWorkspaceForTerminal()` calls `workspaceStore.ensureWorkspaceInitialized(reference)` whenever no explicit initialized workspace is already available.
- `ensureWorkspaceInitialized()` calls `workspaceStore.createWorkspace({ root_path: reference.workspaceRootPath })` and waits for the backend `createWorkspace` mutation.
- Backend `WorkspaceManager.createWorkspace()` awaits `FileSystemWorkspace.initialize()`, which builds the shallow file tree.
- Only after that does frontend connect `useTerminalSession()` to `/ws/terminal/:workspaceId/:sessionId`.
- Backend `api/websocket/terminal.ts` rejects if `workspaceManager.getWorkspaceById(workspaceId)` is missing and uses `workspace.getBasePath()` only to obtain `cwd`.

Terminal does not need `WorkspaceInfo.fileExplorer`, folder children, search index, or watcher state. It only needs a validated `workspaceRootPath`/cwd and an authenticated WebSocket/PTY session.

### Current implemented mobile Terminal path

Mobile has a second Terminal entry surface that can preserve the old dependency if not designed explicitly:

- `autobyteus-web/components/mobile/MobileWorkShell.vue` renders `MobileTools.vue` when the active mobile tab is `tools`.
- `MobileTools.vue` receives `MobileWorkContext` and computes `workspaceFromContext`.
- For workspace context it looks up `workspaceStore.workspaces[context.workspaceId]`.
- For agent-run/team-run context it normalizes `context.workspaceRootPath` and then searches `workspaceStore.allWorkspaces` for a matching initialized/current `WorkspaceInfo`.
- It renders the no-workspace prompt when `terminalWorkspaceId` is empty, otherwise renders `<Terminal :workspace-id="terminalWorkspaceId" />`.
- `MobileWorkContext` already carries root-path data: `agent-run.workspaceRootPath`, `team-run.workspaceRootPath`, and `workspace.rootPath`.

Therefore mobile Terminal currently gates Terminal availability through initialized workspace payload lookup even though the mobile context already has the cwd root path needed for Terminal.

### Current implemented Terminal WebSocket pending-connect path

The Terminal WebSocket route has the same close-before-connect lifecycle shape that was previously designed for file explorer:

- `api/websocket/terminal.ts` registers message/close handlers around `connectedSessionId`.
- If socket close occurs before `handler.connect(...)` resolves, the close handler sees no connected session id and returns.
- A late successful `handler.connect()` can then create and retain a PTY session/read loop after the socket has already closed.
- Setup failure after partial terminal session creation also needs explicit handler-side cleanup so `PtySessionManager` does not retain a session record.

Terminal route cleanup must be explicit because PTY sessions are process resources even though they are not file watchers.

### Current ownership problem

The file watcher currently behaves as a property of a loaded workspace/index, but product intent says it is a property of a visible file-explorer experience. This boundary mismatch lets inactive workspaces retain recursive watchers and file descriptors indefinitely. The late history-open and Terminal blockers expose the same deeper ownership issue at the workspace identity layer: cwd/display use cases depend on current workspace materialization because `workspaceId`, workspace metadata, file-explorer snapshot, mobile Terminal context lookup, and terminal cwd lookup are currently coupled too tightly.

## Intended Change

The authoritative target for this ticket is Round 8. All earlier target names such as `WorkspaceReference`, `WorkspaceActivationState`, `BaseFileExplorer`, `LocalFileExplorer`, `WorkspaceInfo.fileExplorer`, and `ensureWorkspaceInitialized(reference)` are either current-state evidence or temporary migration aliases only. They are not steady-state architecture.

Make workspace handling cheap and metadata-first, and make file browsing/search/watching an explicit lazy capability:

```text
WorkspaceManager
-> owns workspace registration, id mapping, and metadata resolution

Workspace
-> WorkspaceMetadata
-> optional lazy WorkspaceFileExplorer capability slot

WorkspaceFileExplorer
-> tree state + folder loading + search/index + file operations + watcher/live lifecycle

WorkspaceFileExplorerTree
-> API/frontend projection of the loaded file tree
```

The durable invariant is:

```text
Workspace creation/list/history/runtime/terminal = metadata/rootPath only.
Files/context/skill file browsing/search/live updates = explicit WorkspaceFileExplorer acquisition.
```

This means:

- `WorkspaceManager.createWorkspace()`, `getOrCreateWorkspace()`, and `ensureWorkspaceByRootPath()` keep their product-level API role where practical, but they create/resolve metadata-only `Workspace` objects.
- `Workspace` creation must not build file trees, create `FileNameIndexer`, initialize search, create `WorkspaceFileExplorer`, or start watchers.
- Desktop Files, mobile Files, skill file explorer, context file browser/search/read/write, and file-explorer WebSocket are the only normal paths that acquire `WorkspaceFileExplorer`.
- History, team history, Terminal desktop/mobile, runtime cwd resolution, resume/rerun, sidebars, and workspace metadata list/create must not acquire `WorkspaceFileExplorer`.
- Terminal uses a root-path `TerminalTarget`, validates cwd directly, and never initializes file-explorer state merely to open a PTY.
- File-explorer and Terminal WebSocket routes both own pending-connect cleanup so early close/setup failure cannot retain watcher or PTY resources.
- Normal attached Terminal sessions must also be descriptor-clean: after real command output and WebSocket close, Terminal-owned PTY descriptors, revoked descriptors, listeners, timers, read loops, manager records, and child processes must all be released after a bounded close wait.

## Task Design Health Assessment

- Change posture: Bug fix + performance remediation + architecture refactor.
- Root-cause classification: Boundary/ownership issue, missing lifecycle invariant, shared data-model looseness, and file responsibility drift.
- Refactor required now: Yes.
- Why: The original `spawn EBADF` was caused by watcher/file-descriptor pressure from workspace/file-explorer lifecycle coupling. Subsequent validation showed the same boundary problem in history and Terminal: read-only/cwd-only features were forced through workspace materialization/file-tree initialization. A local retry, fd-limit increase, or watcher-only patch would leave the architecture slow and fragile.
- Design response: Preserve the good top-level workspace boundary, make workspace creation metadata-only, move all file-tree/search/operation/watcher concerns into explicit lazy `WorkspaceFileExplorer`, and split frontend metadata state from file-explorer tree/live state.

## Terminology

| Term | Authoritative meaning |
| --- | --- |
| `WorkspaceMetadata` | Cheap metadata: `workspaceId`, canonical `rootPath`, `displayName`, `kind/source`. No tree, watcher, search index, or mutable file-explorer status. |
| `Workspace` | Backend domain object owned by `WorkspaceManager`: metadata plus optional lazy `WorkspaceFileExplorer` slot/factory. |
| `WorkspaceManager` | Authoritative owner for workspace registration, root-path canonicalization/id mapping, workspace lookup, and metadata-only create/get-or-create. |
| `WorkspaceFileExplorer` | Lazy workspace-scoped file browsing capability. Owns tree/folder state, file search/index, file operations, watcher leases, and live update fanout. |
| `WorkspaceFileExplorerTree` | Serializable/API/frontend projection of currently loaded tree state. Returned only by file-explorer APIs. |
| `WorkspaceFileTreeState` | Internal collaborator under `WorkspaceFileExplorer` that owns loaded folders/tree nodes/dirty flags/projection assembly. |
| `WorkspaceFileSearchIndex` | Internal collaborator under `WorkspaceFileExplorer` that owns `FileNameIndexer`, search strategy, snapshot refresh, and query execution. |
| `WorkspaceFileOperations` | Internal collaborator under `WorkspaceFileExplorer` that owns validated file read/write/create/move/delete under the workspace root. |
| `WorkspaceFileWatcherLeaseManager` | Internal collaborator under `WorkspaceFileExplorer` that owns watcher start/stop, lease counting, and live event fanout. |
| `TerminalTarget` | Root-path/cwd terminal input with required canonical root path and optional grouping/label metadata. It is not a workspace materialization handle. |
| Legacy/current-state `WorkspaceReference` | Temporary migration alias for `WorkspaceMetadata` only. Not a steady-state type name. |
| Legacy/current-state `WorkspaceInfo.fileExplorer` | Superseded tree-bearing workspace payload. Must be removed/split into metadata response plus file-explorer projection response. |
| Legacy/current-state `BaseFileExplorer` / `LocalFileExplorer` | Superseded abstraction stack. Must be removed/collapsed into the single `WorkspaceFileExplorer` capability boundary. |
| Legacy/current-state `WorkspaceActivationState` / `Workspace materialization state` | Superseded or transition-only language. In the steady state, file-explorer loading/live status belongs to FileExplorer-specific frontend state, not general workspace metadata. |

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | WorkspaceFileExplorer? | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Workspace metadata create/list | User path or workspace list load | `WorkspaceMetadata` in frontend `workspaceStore` | `WorkspaceManager` + workspace metadata API | No | Keeps workspace APIs cheap and preserves existing product boundary. |
| DS-002 | Standalone historical run open | History row click | Conversation/config/activity rendered | Run history hydration owner | No | History viewing must not scan files or initialize file explorer state. |
| DS-003 | Team historical run open/member focus | Team/member history click | Focused member projection + sibling shells rendered | Team history hydration owner | No | Prevents eager materialization of every member workspace. |
| DS-004 | Agent runtime cwd | Send/activate/resume/rerun | Runtime starts with cwd/root path | Agent run provisioning/runtime resolver | No | Runtime launch should not depend on file tree/watchers. |
| DS-005 | Terminal desktop/mobile | Terminal tab/panel open | PTY starts in validated cwd | Terminal target/session/route owner | No | Terminal is a cwd feature, not a file-explorer feature. |
| DS-006 | Desktop Files open/close | Files tab visible/hidden | Tree rendered or leases released | FileExplorer UI + `WorkspaceFileExplorer` | Yes | Main visible desktop file browsing path. |
| DS-007 | Mobile Files open/close | Mobile explorer panel active/inactive | Tree rendered or leases released | Mobile file explorer + `WorkspaceFileExplorer` | Yes | Prevents hidden mobile panels from holding resources. |
| DS-008 | Skill file explorer | Skill detail file area visible | Skill tree/folders rendered | Skill file explorer host + `WorkspaceFileExplorer` | Yes | Skill metadata registration must not fetch tree until visible. |
| DS-009 | Context browser/search/read | Context file browser action | Folder/search/file result returned | Context browser + `WorkspaceFileExplorer` | Yes | Context file selection is file-explorer functionality. |
| DS-010 | File-explorer live updates | Visible live stream connects | Watcher events update FileExplorer state | File-explorer WS route + watcher lease manager | Yes | Watcher exists only while visible consumers need it. |
| DS-011 | File-explorer pending cleanup | WS close/error/setup failure | No retained watcher/session | File-explorer WS route + stream handler | Yes, cleanup | Closes the original descriptor leak/race class. |
| DS-012 | Terminal pending cleanup | Terminal WS close/error/setup failure | No retained PTY/read loop | Terminal WS route + session manager | No | Prevents replacing watcher leaks with PTY leaks. |
| DS-013 | Terminal normal-session descriptor cleanup | Normal Terminal open/run-command/output/close | Manager state, read loop, child process, and PTY descriptors released | `TerminalHandler` + `PtySessionManager` + `TerminalSession` implementation | No | Ensures normal Terminal use cannot recreate descriptor pressure. |

## Primary Execution Spines

### DS-001 Workspace metadata create/list

```text
User selects path or frontend loads workspaces
-> GraphQL createWorkspace/workspaces/workspaceMetadata
-> WorkspaceManager canonicalizes rootPath and derives workspaceId
-> Workspace(metadata only) is registered or returned
-> WorkspaceMetadata DTO returned
-> frontend workspaceStore stores metadata
-> sidebar/config/history labels render
```

Creates `WorkspaceFileExplorer`: No. Returns tree: No.

### DS-002 Standalone historical run open

```text
History row click
-> openHistoricalRun/openAgentRun
-> history projection + resume/config metadata fetched
-> WorkspaceMetadata resolved from stored workspaceRootPath/workspaceId if needed
-> AgentRunConfig carries workspaceId/rootPath metadata
-> conversation/activity/config render
```

Creates `WorkspaceFileExplorer`: No. Returns tree: No.

### DS-003 Team historical run open/member focus

```text
Team/member history row click
-> openTeamRun / team hydration service
-> team metadata + focused member projection fetched
-> primary WorkspaceMetadata + member WorkspaceMetadata map built
-> focused member context + sibling shells rendered
-> sibling focus fetches projection only
```

Creates `WorkspaceFileExplorer`: No. Returns tree: No.

### DS-004 Agent runtime cwd

```text
Send/activate/resume/rerun
-> AgentRunConfig/TeamRunConfig workspace metadata read
-> WorkspaceManager/id mapping resolves canonical rootPath when needed
-> runtime config cwd = WorkspaceMetadata.rootPath
-> Codex/Claude/AutoByteus runtime starts
```

Creates `WorkspaceFileExplorer`: No.

### DS-005 Terminal desktop/mobile

```text
Desktop Terminal tab or Mobile Tools Terminal
-> active/focused WorkspaceMetadata.rootPath or MobileWorkContext rootPath
-> TerminalTarget{rootPath, optional workspaceId/displayName}
-> useTerminalSession opens root-path terminal WS
-> backend authorizes and validates/canonicalizes cwd
-> PtySessionManager starts PTY in cwd
-> terminal state reports connected/error
```

Creates `WorkspaceFileExplorer`: No. Returns tree: No.

### DS-013 Terminal normal-session descriptor cleanup

```text
Terminal WebSocket open with valid cwd
-> TerminalHandler.connect
-> PtySessionManager.createSession
-> TerminalSession.start opens PTY backend
-> user command writes marker and produces actual command output
-> WebSocket close
-> TerminalHandler.disconnect stops active read loop ownership
-> PtySessionManager.closeSession removes registry entry and awaits TerminalSession.close
-> TerminalSession.close flushes pending reads/timers, disposes listeners, exits/kills child, releases PTY descriptors, clears references
-> descriptor probe returns to post-warmup baseline
```

Creates `WorkspaceFileExplorer`: No. Terminal descriptor ownership is independent from workspace file-explorer ownership.

### DS-006/DS-007 Files open/close

```text
Visible Files surface
-> frontend reads WorkspaceMetadata from workspaceStore/context
-> fileExplorerStore opens consumer for workspaceId
-> file-explorer GraphQL/WS request
-> WorkspaceManager.getOrCreateWorkspace(workspaceId) returns metadata-only Workspace
-> workspace.acquireFileExplorer(reason)
-> WorkspaceFileExplorer creates internal collaborators if absent
-> WorkspaceFileTreeState loads root/folder data
-> WorkspaceFileExplorerTree/folder result returned
-> fileExplorerStore stores projection by workspaceId
```

Close path:

```text
Files hidden/collapsed/unmounted or context browser closes
-> frontend releases file-explorer consumer/live session
-> backend releases watcher lease/session if one exists
-> final release stops watcher and optionally closes idle WorkspaceFileExplorer
```

Creates `WorkspaceFileExplorer`: Yes. Returns tree: Yes.

### DS-008 Skill file explorer

```text
Skill detail visible
-> skill rootPath resolved as WorkspaceMetadata(kind='skill')
-> skill metadata registered only
-> visible skill file explorer requests folder/tree
-> workspace.acquireFileExplorer('skill-explorer')
-> WorkspaceFileExplorerTree/folder result returned
```

Registering the skill workspace metadata alone must not fetch folder children or start live updates.

### DS-009 Context browser/search/read/write

```text
Context browser opened or file search/read/write requested
-> selected WorkspaceMetadata
-> fileExplorerStore/context browser requests folder/search/file operation
-> backend acquires WorkspaceFileExplorer
-> WorkspaceFileSearchIndex or WorkspaceFileOperations handles action internally
-> result returned to FileExplorer-specific frontend state
```

Creates `WorkspaceFileExplorer`: Yes if absent.

### DS-010 Live updates

```text
Visible file explorer live stream connects
-> file-explorer WS route registers early cleanup
-> WorkspaceFileExplorer acquired
-> WorkspaceFileWatcherLeaseManager.acquire(consumer)
-> first lease starts watcher
-> watcher events fan out through stream handler
-> fileExplorerStore patches/invalidates tree/search/open-file state
```

Watcher start is forbidden outside this visible-consumer/live-update path.

## Main Domain Subject Nodes And Ownership

| Node | Ownership |
| --- | --- |
| `WorkspaceManager` | workspace id/root-path mapping, metadata-only create/get/list, workspace registry. |
| `Workspace` | `WorkspaceMetadata`, root-path accessors, optional lazy `WorkspaceFileExplorer` capability slot, acquisition/release boundary. |
| `WorkspaceMetadata` | stable identity/root path/display/kind. No tree/status/resource state. |
| `WorkspaceFileExplorer` | workspace-scoped file browsing/search/mutation/watch capability. Coordinates internal collaborators. |
| `WorkspaceFileTreeState` | loaded folders/tree state and `WorkspaceFileExplorerTree` projection assembly. |
| `WorkspaceFileSearchIndex` | `FileNameIndexer`, search snapshot/index refresh, file search execution. |
| `WorkspaceFileOperations` | validated local file operations under workspace root. |
| `WorkspaceFileWatcherLeaseManager` | watcher lease counting, start/stop/close, event fanout. |
| `workspaceStore` frontend | `WorkspaceMetadata` collection, active metadata, display/config helpers only. |
| `fileExplorerStore` frontend | tree projections, loaded/expanded folders, open/selected file state, search state, loading/error/live stream status by workspace id. |
| Run/team history hydration | builds run/team contexts from persisted projections and `WorkspaceMetadata`; never file-explorer state. |
| Terminal session/route | root-path/cwd validation, WebSocket pending cleanup, and PTY lifecycle; never workspace file explorer. |
| `TerminalHandler` | Terminal read loop lifecycle, session attach/detach, and handoff to `PtySessionManager`. |
| `PtySessionManager` | in-process Terminal session registry and `closeSession()` orchestration; manager cleanup is not sufficient without `TerminalSession.close()`. |
| `TerminalSession` implementation (`autobyteus-ts`) | low-level PTY backend, child process, PTY descriptors, listeners, pending reads/timers, and deep close semantics. |
| File-explorer WS route | raw WS lifecycle and cleanup before/around `WorkspaceFileExplorer` watcher lease acquisition. |

## Authoritative Data Model

### Backend

```ts
export interface WorkspaceMetadata {
  workspaceId: string;
  rootPath: string;
  displayName: string;
  kind: 'filesystem' | 'skill' | 'temp';
}

export class Workspace {
  readonly metadata: WorkspaceMetadata;
  private fileExplorer?: WorkspaceFileExplorer;

  getBasePath(): string;       // metadata.rootPath
  getName(): string;           // metadata.displayName
  acquireFileExplorer(reason: WorkspaceFileExplorerConsumerReason): Promise<WorkspaceFileExplorerLease>;
  closeFileExplorerIfIdle(): Promise<void>;
}
```

`Workspace` constructor and manager creation paths create metadata only. `fileExplorer` remains absent until explicit acquisition by a file-explorer consumer.

```ts
export class WorkspaceFileExplorer {
  private readonly treeState: WorkspaceFileTreeState;
  private readonly searchIndex: WorkspaceFileSearchIndex;
  private readonly operations: WorkspaceFileOperations;
  private readonly watcherLeases: WorkspaceFileWatcherLeaseManager;

  folderChildren(path: string): Promise<WorkspaceFolderChildrenResult>;
  treeSnapshot(depth: number): Promise<WorkspaceFileExplorerTree>;
  searchFiles(query: string): Promise<WorkspaceFileSearchResult[]>;
  readFile(path: string): Promise<WorkspaceFileContent>;
  writeFile(path: string, content: string): Promise<void>;
  moveFile(sourcePath: string, targetPath: string): Promise<void>;
  deletePath(path: string): Promise<void>;
  acquireWatcherLease(reason: string): Promise<WorkspaceFileWatcherLease>;
  close(): Promise<void>;
}
```

Internal collaborators are not public service-locator APIs. Non-file-explorer consumers must not import or depend on them directly.

### GraphQL / API DTO split

General workspace responses are metadata-only:

```graphql
type WorkspaceMetadata {
  workspaceId: ID!
  rootPath: String!
  displayName: String!
  kind: WorkspaceKind!
}
```

File-explorer responses carry tree/search/file projections:

```graphql
type WorkspaceFileExplorerTree {
  workspaceId: ID!
  root: WorkspaceFileTreeNode!
  loadedPaths: [String!]!
}

type WorkspaceFolderChildrenResult {
  workspaceId: ID!
  folderPath: String!
  children: [WorkspaceFileTreeNode!]!
}
```

`WorkspaceInfo.fileExplorer` is removed from general workspace responses. If a temporary migration alias named `WorkspaceInfo` remains, its payload must be metadata-only.

### Frontend

```text
workspaceStore
  - workspacesById: Record<string, WorkspaceMetadata>
  - activeWorkspaceId / activeWorkspaceMetadata
  - metadata loading/error state
  - display/config helpers
  - no tree nodes
  - no nodeIdToNode
  - no search results
  - no file-explorer live stream state

fileExplorerStore
  - treeByWorkspaceId: Record<string, WorkspaceFileExplorerTree>
  - loadedFoldersByWorkspaceId
  - expandedFoldersByWorkspaceId
  - selected/open file state by workspaceId
  - search query/results/loading/error by workspaceId
  - live stream connection/consumer state by workspaceId
```

Agent/team run configs carry stable metadata/root-path identity. During migration, a field called `workspaceReference` may temporarily remain as an alias, but the steady-state subject is `workspaceMetadata`/`WorkspaceMetadata`.

## Interface Boundary Mapping

| Interface | Subject | Identity/input | Returns | May acquire `WorkspaceFileExplorer`? |
| --- | --- | --- | --- | --- |
| `WorkspaceManager.createWorkspace(input)` | workspace metadata | root path/kind/source | `Workspace` / `WorkspaceMetadata` | No |
| `WorkspaceManager.getOrCreateWorkspace(idOrRoot)` | workspace metadata | workspace id or root path | `Workspace` metadata container | No |
| `WorkspaceManager.ensureWorkspaceByRootPath(rootPath)` | workspace metadata | root path | `Workspace` metadata container | No |
| GraphQL `createWorkspace` | workspace metadata | root path | `WorkspaceMetadata` | No |
| GraphQL `workspaces` | workspace metadata list | none/filter | `WorkspaceMetadata[]` | No |
| GraphQL `workspaceMetadata(rootPath)` or retained cheap alias | workspace metadata | root path | `WorkspaceMetadata` | No |
| `Workspace.acquireFileExplorer(reason)` | workspace file explorer | file-explorer consumer reason | `WorkspaceFileExplorerLease` | Yes |
| GraphQL `folderChildren(workspaceId,path)` | file tree/folder projection | workspace id + folder path | `WorkspaceFolderChildrenResult` | Yes |
| GraphQL `workspaceFileExplorerTree(workspaceId)` | file tree projection | workspace id | `WorkspaceFileExplorerTree` | Yes |
| GraphQL `searchWorkspaceFiles(workspaceId,query)` | file search | workspace id + query | search results | Yes |
| GraphQL file read/write/move/delete | file operations | workspace id + normalized path(s) | content/status | Yes |
| File-explorer WS | live file updates | workspace id + session id | events | Yes + watcher lease |
| Terminal WS | terminal cwd/PTY | `TerminalTarget` root path + session id | PTY stream | No |
| `PtySessionManager.closeSession(sessionId)` | terminal session registry + close orchestration | session id | close completion boolean | No |
| `TerminalSession.close()` | low-level PTY OS resources | session instance | deep close completion | No |
| Run/team history hydration | history projection | run/team ids + persisted root paths | contexts/configs with metadata | No |
| Runtime cwd resolver | runtime launch | run config metadata | cwd string | No |

## File Responsibility Mapping

### Backend

| File / area | Target responsibility | Required change |
| --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | authoritative workspace registry/id mapping and metadata-only create/get/list | Stop calling tree/file-explorer initialization from create/get/list. Keep top-level API names where practical. |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | metadata-bearing `Workspace` plus lazy `WorkspaceFileExplorer` capability slot/acquisition | Constructor creates metadata only. Remove eager `LocalFileExplorer` creation and tree/index setup. |
| `autobyteus-server-ts/src/workspaces/skill-workspace.ts` | skill workspace metadata specialization | Skill metadata only; skill file explorer acquisition happens from visible skill file UI. |
| `autobyteus-server-ts/src/workspaces/temp-workspace.ts` | temp workspace metadata specialization | Temp metadata only; file explorer only if a file-explorer consumer opens temp files. |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | rename/recast into `WorkspaceFileExplorer` owner or equivalent | Own/cohere folder/tree/search/ops/watcher capability for one workspace root. |
| `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts` | obsolete abstraction | Remove/decommission. No steady-state base class. |
| `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts` | obsolete local wrapper | Remove/decommission after lease logic moves under `WorkspaceFileExplorer`. |
| `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | internal search/index collaborator | Move behind/under `WorkspaceFileSearchIndex`; no watcher start from index creation. |
| new/renamed `workspace-file-tree-state.ts` | internal tree/folder state | Loaded node cache, folder children, dirty flags, tree projection assembly. |
| new/renamed `workspace-file-search-index.ts` | internal search/index lifecycle | Own `FileNameIndexer` and search strategy refresh/query. |
| new/renamed `workspace-file-operations.ts` | internal file operations | Validate paths under root and perform local file operations. |
| new/renamed `workspace-file-watcher-lease-manager.ts` | internal watcher lifecycle | Lease count, watcher start/stop/close, event fanout. |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | metadata-only workspace schema/resolvers | Remove tree from workspace responses. Cheap metadata/root-path resolver only. |
| `autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts` | metadata converter | Stop calling `getFileExplorer()`/tree serialization. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | file-explorer schema/resolvers | Acquire `WorkspaceFileExplorer` explicitly and return file-explorer DTOs. |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | file-explorer WS lifecycle | Register cleanup before async acquisition/connect; release late/partial sessions and watcher leases. |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Terminal root-path WS lifecycle | Validate cwd directly; pending-connect cleanup for PTY sessions; no workspace file-explorer calls. |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | Terminal read loop and session attach/detach | Ensure disconnect stops active read-loop ownership and awaits manager close. |
| `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | server Terminal session registry and close orchestration | Remove manager record and await `TerminalSession.close()`; expose tests that distinguish manager count from OS resources. |
| `autobyteus-ts/src/tools/terminal/pty-session.ts` or selected `TerminalSession` backend | low-level PTY process/descriptor lifecycle | Make normal close descriptor-clean: flush pending reads/timers, dispose listeners, exit/kill child, release/destroy PTY descriptors, clear references, and resolve only after bounded cleanup. |
| runtime workspace resolvers | runtime cwd resolution | Use `WorkspaceMetadata.rootPath`/id mapping only. No file-explorer acquisition. |

### Frontend

| File / area | Target responsibility | Required change |
| --- | --- | --- |
| `autobyteus-web/stores/workspace.ts` | metadata-only workspace store | Remove tree/open-file/search/live state and `nodeIdToNode`; store `WorkspaceMetadata` only. |
| `autobyteus-web/stores/fileExplorer.ts` | file-explorer UI state by workspace id | Own `WorkspaceFileExplorerTree`, loaded/expanded folders, open files, search state, loading/errors/live stream status. |
| `autobyteus-web/services/fileExplorerStreaming/*` | live stream transport | Used only by visible file-explorer consumers; no auto-connect from metadata list/create. |
| workspace metadata action files | metadata resolution | Rename/recast legacy reference actions to metadata actions. No file-tree activation semantics. |
| file-explorer live actions | visible file-explorer consumer lifecycle | Acquire/release live stream/consumer state only while UI is visible. |
| `components/fileExplorer/*` | visible file explorer UI | Read metadata, open fileExplorerStore, render loading/tree, release on hide/unmount. |
| `components/skills/SkillWorkspaceLoader.vue` | skill metadata + visible file explorer host | Register skill metadata only; request tree only from visible file explorer. |
| `components/workspace/tools/Terminal.vue` | Terminal target UI | Accept/build `TerminalTarget` from metadata/root path; do not call workspace file-explorer acquisition. |
| `components/mobile/MobileTools.vue` | mobile Terminal target | Derive root-path Terminal target from `MobileWorkContext` or focused member metadata without looking up initialized workspace payload. |
| history/team hydration files | run/team context metadata | Build configs/shells with `WorkspaceMetadata`; no file-explorer state. |

## Ownership Boundaries And Dependency Rules

Allowed dependencies:

- Workspace metadata consumers may depend on `WorkspaceManager`, `Workspace`, and `WorkspaceMetadata`.
- File-explorer UI/API/WS consumers may acquire `WorkspaceFileExplorer` through `Workspace`.
- `WorkspaceFileExplorer` may depend on internal collaborators for tree/search/operations/watcher lifecycle.
- Terminal may depend on root-path validation and PTY session services, not file-explorer state.
- Terminal route/handler/manager may depend on `TerminalSession.close()` as the low-level OS-resource close contract; they must not treat manager map removal alone as cleanup completion.
- Runtime cwd resolvers may depend on metadata/id mapping/root path, not file-explorer state.

Forbidden dependencies:

- `WorkspaceManager.createWorkspace()`, `getOrCreateWorkspace()`, `ensureWorkspaceByRootPath()`, workspace list, and metadata converters must not instantiate or access `WorkspaceFileExplorer`.
- History/team history/Terminal/runtime/resume/rerun/sidebar/config display must not call `Workspace.acquireFileExplorer()` or import `WorkspaceFileExplorerTree` DTOs.
- General `WorkspaceMetadata`/workspace response types must not include tree/search/watcher/loading fields.
- `workspaceStore` must not own tree nodes, search results, open file content, or live file stream state.
- Non-file-explorer code must not bypass `WorkspaceFileExplorer` and directly use `WorkspaceFileTreeState`, `WorkspaceFileSearchIndex`, `WorkspaceFileOperations`, or `WorkspaceFileWatcherLeaseManager`.
- No steady-state `BaseFileExplorer`/`LocalFileExplorer` abstraction stack remains.
- No compatibility dual path may keep `WorkspaceInfo.fileExplorer` as a general workspace payload.
- Terminal validation must not use `PtySessionManager.sessionCount` or child-process count alone as proof of cleanup; descriptor-level evidence is required for normal command-output sessions.

## Route / Handler Cleanup Contracts

### File-explorer WebSocket

`api/websocket/file-explorer.ts` owns cleanup before a session id or watcher lease may exist.

Required route state:

```ts
let closed = false;
let cleanupStarted = false;
let connectPromise: Promise<FileExplorerConnectResult> | null = null;
let connectedSessionId: string | null = null;
```

Contract:

1. Register close/error cleanup before auth, workspace lookup, or file-explorer acquisition.
2. If close/error occurs before `connectPromise` resolves, mark `closed`, clear pending input, and attach a late cleanup to disconnect any returned session/lease.
3. If setup fails after acquiring `WorkspaceFileExplorer` or watcher lease, release the lease and close any partial session.
4. Disconnect/release must be idempotent.
5. Final release of the final watcher lease stops/closes the watcher and clears active watcher references.

### Terminal WebSocket

`api/websocket/terminal.ts` owns analogous pending-connect cleanup for PTY resources.

Required route state:

```ts
let closed = false;
let cleanupStarted = false;
let connectPromise: Promise<TerminalConnectResult> | null = null;
let connectedSessionId: string | null = null;
let pendingMessages: string[] = [];
```

Contract:

1. Register close/error cleanup before auth, cwd validation, or PTY creation.
2. Validate/canonicalize cwd directly from `TerminalTarget`; do not create workspace file-explorer state.
3. If close/error wins before connect resolves, clear pending messages and disconnect any late-created PTY session.
4. `TerminalHandler.connect()` / `PtySessionManager` must close partial PTY sessions if setup fails after process/session creation but before route ownership is established.
5. `disconnect()` must be idempotent.

### Normal Terminal Session Deep-Close Contract

Normal attached Terminal sessions have a separate close contract from pending-connect cleanup. The close path is complete only after all four layers are clean:

1. WebSocket layer: socket close/error has run cleanup once and no pending input remains queued.
2. Handler layer: active read loop ownership is removed, pending read is flushed, and the read-loop task has exited or been awaited.
3. Manager layer: session registry no longer contains the session id.
4. Low-level session layer: shell/PTY child has exited or been killed, listeners/disposables are disposed, pending read timers are cleared, PTY object references are cleared, and PTY master/slave descriptors are released or verified absent after a bounded wait.

The low-level `TerminalSession` implementation owns descriptor cleanup. If a specific backend such as `node-pty` leaves `/dev/ptmx` or `(revoked)` descriptors after its close sequence, implementation must adjust the close order/backend/wrapper or choose a descriptor-safe backend for server WebSocket Terminal sessions. The design explicitly rejects fd-limit increases or manager-map cleanup as sufficient fixes.

## Removal / Decommission Plan

Remove or decommission as steady-state architecture:

- Automatic file-explorer stream connection from workspace create/fetch/register paths.
- `WorkspaceInfo.fileExplorer` or any tree-bearing general workspace response.
- Frontend `workspaceStore` ownership of tree nodes, open file content, search state, or live stream state.
- Backend eager `FileSystemWorkspace.initialize()` tree/index/search behavior from workspace creation.
- Public/general `workspace.getFileExplorer()` accessor.
- Public/general `workspace.searchFiles()` method.
- `BaseFileExplorer` and `LocalFileExplorer` abstraction stack.
- `FileNameIndexer.start()` behavior that starts watchers by default.
- Terminal workspace-id-only contract that requires initialized workspace payload to obtain cwd.
- Terminal close behavior that reports success while retaining PTY/revoked descriptors after normal command-output sessions.
- Mobile Terminal lookup through `workspaceStore.workspaces` / `allWorkspaces` as a render/connect gate.
- Historical team helper path that materializes every member workspace for history display.

Temporary migration aliases allowed only inside one implementation change:

- `WorkspaceReference` as an alias for `WorkspaceMetadata` while call sites are updated.
- `WorkspaceInfo` name only if its payload is already metadata-only.
- Existing GraphQL operation names such as `createWorkspace`/`workspaces` if their response contracts are metadata-only.

## Migration / Refactor Sequence

1. Introduce/settle `WorkspaceMetadata` DTO/type and metadata-only workspace responses.
2. Change `WorkspaceManager.createWorkspace()`, `getOrCreateWorkspace()`, and `ensureWorkspaceByRootPath()` to metadata-only semantics.
3. Change `FileSystemWorkspace`/`SkillWorkspace`/`TempWorkspace` constructors so they do not create file explorer, tree, index, search, or watcher state.
4. Add `Workspace.acquireFileExplorer(reason)` and lazy `WorkspaceFileExplorer` capability creation.
5. Recast existing file-explorer implementation into the single `WorkspaceFileExplorer` boundary and internal collaborators.
6. Move watcher lease logic under `WorkspaceFileWatcherLeaseManager` / `WorkspaceFileExplorer`.
7. Move `FileNameIndexer` and search strategy lifecycle under `WorkspaceFileSearchIndex` / `WorkspaceFileExplorer`.
8. Move validated file operations under `WorkspaceFileOperations` / `WorkspaceFileExplorer`.
9. Remove `BaseFileExplorer` and `LocalFileExplorer` after call sites use the new capability boundary.
10. Split GraphQL/API responses: metadata APIs return metadata only; file-explorer APIs return `WorkspaceFileExplorerTree`/folder/search/file payloads.
11. Split frontend state: `workspaceStore` metadata-only; `fileExplorerStore` owns tree/search/open-file/live state.
12. Update desktop/mobile Files, skill file explorer, and context browser to acquire/release FileExplorer state explicitly.
13. Update standalone/team history hydration to use `WorkspaceMetadata` and never acquire file-explorer state.
14. Update Terminal desktop/mobile to use root-path `TerminalTarget` and backend cwd validation only.
15. Strengthen Terminal normal close path so `TerminalSession.close()` / `PtySessionManager.closeSession()` release OS PTY descriptors after normal command-output sessions.
16. Update runtime cwd resolvers to use metadata/root path only.
17. Add pending-connect cleanup tests for file-explorer WS and Terminal WS.
18. Add normal attached command-output Terminal descriptor churn validation.
19. Delete temporary migration aliases and any remaining imports of superseded target names.

## Validation Plan

Backend validation:

- Unit test: `WorkspaceManager.createWorkspace()` does not instantiate `WorkspaceFileExplorer`, build tree, create `FileNameIndexer`, initialize search, or start watcher.
- Unit test: `getOrCreateWorkspace()` from id/root mapping remains metadata-only.
- Unit test: `FileSystemWorkspace`/`SkillWorkspace`/`TempWorkspace` constructors are metadata-only.
- Unit test: file-explorer GraphQL folder/search/read/write resolvers are the first backend paths to acquire `WorkspaceFileExplorer`.
- Unit/static check: no `BaseFileExplorer` / `LocalFileExplorer` steady-state imports remain.
- Unit/static check: `WorkspaceFileTreeState`, `WorkspaceFileSearchIndex`, `WorkspaceFileOperations`, and `WorkspaceFileWatcherLeaseManager` are not directly used by history/terminal/runtime/workspace metadata code.
- Runtime tests: Codex/Claude/AutoByteus cwd resolution does not call `Workspace.acquireFileExplorer()`.
- Terminal tests: root-path Terminal route does not acquire `WorkspaceFileExplorer`; early close/setup failure leaves `PtySessionManager.sessionCount` at baseline.
- Terminal descriptor tests: normal attached command-output sessions return manager session count, child process count, process FD count, and PTY/revoked descriptor count to a bounded post-warmup baseline after close.
- Terminal unit tests: `TerminalSession.close()` disposes listeners, clears timers/pending reads, exits/kills child, clears references, and is idempotent.
- File-explorer WS tests: close before async connect resolves releases late watcher/session; setup failure after lease acquisition releases lease.
- Descriptor probe: repeated open/close of file explorer does not monotonically increase descriptors and child process spawn remains successful.

Frontend validation:

- Store tests: `workspaceStore` metadata list/create contains no `TreeNode`, `nodeIdToNode`, search, open-file, or live stream state.
- Store tests: `fileExplorerStore` owns `WorkspaceFileExplorerTree`, loaded folders, expanded folders, search results, open file state, loading/error/live stream state by workspace id.
- UI tests: opening history row does not call workspace create/materialize or file-explorer store open.
- UI tests: desktop Terminal and mobile Terminal do not call file-explorer acquisition or workspace file-tree creation.
- UI tests: desktop Files/mobile Files/skill file explorer/context browser acquire file-explorer state only while visible and release on hide/unmount/close.
- Mobile tests: mobile tools `RightSideTabs` cannot render hidden Files path; dedicated mobile explorer is the only mobile file-explorer live surface.
- Team history tests: opening team history with multiple member workspaces builds metadata/shells without materializing every workspace.

End-to-end/manual validation:

- Reproduce original Codex tutorial workspace send after heavy workspace use; no `spawn EBADF`.
- Open large historical runs and team historical runs; conversation/config render without file-tree delay.
- Open desktop/mobile Terminal from historical/non-materialized workspace; PTY starts from cwd without workspace file-explorer initialization.
- Run repeated normal Terminal open/actual-command-output/close cycles in built backend; no per-session PTY descriptor growth remains after bounded wait.
- Open Files after history selection; visible loading occurs, tree appears, watcher starts only while visible.
- Close/hide Files; watcher/resources release.

## Backward-Compatibility Rejection Log

- Do not keep old tree-bearing `WorkspaceInfo` alongside new metadata as a long-term compatibility path.
- Do not keep `WorkspaceReference` and `WorkspaceMetadata` as parallel steady-state concepts. `WorkspaceReference` is a temporary alias only if needed during migration.
- Do not keep `BaseFileExplorer`/`LocalFileExplorer` as speculative future extension points.
- Do not preserve Terminal workspace-id-only route as the normal path for ordinary filesystem workspaces.
- Do not preserve Terminal close semantics that only clear manager state while OS PTY descriptors remain retained.
- Do not preserve history/team history eager materialization as a fallback branch.
- Do not preserve automatic file-explorer live stream startup from workspace list/create/register paths.

## AR-007 Reconciliation Note

This sectioned design spec has been reconciled so Round 8 is the only authoritative steady-state target. Earlier terms from previous rounds are intentionally retained only in the `Current-State Read`, revision history, or explicit legacy/migration-alias rows. The target architecture is:

```text
WorkspaceMetadata
Workspace = WorkspaceMetadata + optional lazy WorkspaceFileExplorer
WorkspaceFileExplorer = internal tree/search/operation/watcher owners
WorkspaceFileExplorerTree = file-explorer API/frontend projection
```

Any implementation or review finding that treats `WorkspaceReference`, `WorkspaceActivationState`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, or `ensureWorkspaceInitialized(reference)` as steady-state target architecture should be considered a design violation.


## E2E-TERMFD-002 Reconciliation Note

API/E2E Round 9 established that normal Terminal sessions need descriptor-level acceptance. The route/handler pending cleanup design remains necessary but is not sufficient. The terminal lifecycle target now includes a normal-session deep-close invariant:

```text
Terminal close complete = socket cleanup + read-loop cleanup + manager removal + low-level PTY descriptor release
```

Any implementation that passes `PtySessionManager.sessionCount === 0` while retaining per-session `/dev/ptmx` or `(revoked)` descriptors after normal command-output close fails the design.
