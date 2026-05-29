# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree created before deep investigation.
- Current Status: Current-code investigation complete for analysis/design-direction purposes; no implementation handoff sent.
- Investigation Goal: Understand the workspace File Explorer backend, watcher/monitor threading model, event/data-flow spans, and cleanup/close performance risks; produce requirements and a design recommendation.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The request spans backend file listing, filesystem watching, event propagation, lifecycle cleanup, search/indexing, and possible worker/process isolation.
- Scope Summary: Analyze File Explorer backend watcher lifecycle/performance and cleanup behavior, and recommend whether workerization or a smaller lifecycle refactor is appropriate.
- Primary Questions Resolved:
  - Where are workspace File Explorer backend entrypoints and watcher owners? See Relevant Files / Components and Current Behavior.
  - Does watcher work already run outside the JavaScript main thread/event loop? It runs outside the Electron renderer because the backend is a separate Node process, but it does not run in a File Explorer-specific worker/thread/process.
  - What exact flow handles directory listing, watcher setup, event delivery, search, and close/dispose? See Data-Flow Spine Inventory.
  - Why might cleanup/close feel slow? Confirmed risks: close waits for uncancelable full-tree search refresh; chokidar close time scales with watched item count.
  - Is workerization the correct design response? Not as a first fix. Worker threads do not isolate process-wide FDs; a child process could, but should be deferred behind targeted fixes and diagnostics.

## Request Context

User asked to examine the backend for the workspace File Explorer due to perceived performance issues. They specifically suspect the watcher/monitor should perhaps run in a JavaScript worker or separate thread, ask whether that is already happening, and report that cleanup/close feels slow. In follow-up, the user clarified that they are also wondering whether both backend and frontend File Explorer work should have their own workers because watcher events may be invoked continuously during file changes. The user further described a concrete symptom: after File Explorer has started, switching to the Terminal tab can make Terminal connection appear slow. They also requested data-flow span analysis for different cases to understand how the overall system works.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis`
- Current Branch: `codex/file-explorer-performance-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis`
- Bootstrap Base Branch: `origin/personal` (`a96a8bdaac3dd042d084eab1fff9cd38f59fb783` after `git fetch origin --prune`)
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-29.
- Task Branch: `codex/file-explorer-performance-analysis` tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Current shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is on `personal`; authoritative task worktree is the dedicated worktree listed above. The main checkout has installed `node_modules`; the dedicated worktree does not, so runtime probes/tests were executed from the main checkout after verifying relevant File Explorer paths had no diff from `origin/personal`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-29 | Command | `pwd`; `ls -la` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Resolve initial workspace | Superrepo contains `autobyteus-server-ts`, `autobyteus-web`, `autobyteus-ts`, Electron/server/web packages, and `tickets`. | No |
| 2026-05-29 | Command | `git status --short --branch`; `git remote -v`; `git branch -vv --all --no-abbrev`; `git worktree list --porcelain` | Determine repo state and whether current worktree is dedicated | Initial checkout was `personal...origin/personal [behind 1]`, not a dedicated task branch. Existing related worktrees included `codex/file-explorer-move-stale-children` and `codex/file-explorer-watcher-fd-usage`. | No |
| 2026-05-29 | Command | `git remote show origin`; `git symbolic-ref --quiet --short refs/remotes/origin/HEAD` | Resolve base branch | Remote HEAD is `origin/personal`; origin HEAD branch is `personal`. | No |
| 2026-05-29 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task branch creation | Completed successfully. | No |
| 2026-05-29 | Setup | `git worktree add -b codex/file-explorer-performance-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis origin/personal` | Create dedicated task worktree | Worktree created at latest `origin/personal`, HEAD `a96a8bda`. | No |
| 2026-05-29 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Follow team workflow | Requires dedicated worktree, requirements doc, investigation notes, design spec after requirements approval, and data-flow spine inventory. | No |
| 2026-05-29 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Read canonical design reference | Emphasizes data-flow spine inventory, authoritative boundaries, ownership clarity, and explicit refactor posture. | No |
| 2026-05-29 | Command | `rg -n "worker_threads|new Worker|Worker\(" autobyteus-server-ts/src autobyteus-web -g '*.ts' -g '*.vue' -g '*.js'` | Check whether File Explorer uses a JS worker/thread | File Explorer backend paths do not use `worker_threads` or Web Workers. Worker usage found elsewhere is unrelated (for example transcription/external-channel workers). | No |
| 2026-05-29 | Code | `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | Inspect File Explorer authoritative backend owner | `WorkspaceFileExplorer` owns root tree, ignore policy, search/indexing, watcher lease count, `startWatcher`, `stopWatcher`, `close`, `subscribe`, and file operations. `close()` waits for `searchSnapshotRefreshTask` before stopping watcher. | Yes: design close/search cancellation. |
| 2026-05-29 | Code | `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | Inspect watcher implementation/threading | `FileSystemWatcher.start()` calls `chokidar.watch(...)`; no worker/thread/process boundary. `stop()` detaches subscribers and timers before awaiting `watcher.close()`. | Yes: add timing/count diagnostics. |
| 2026-05-29 | Code | `autobyteus-server-ts/src/file-explorer/watcher/event-batcher.ts` | Inspect event queue/batching | Events are batched through async queues with a default 250 ms batch interval; no explicit backpressure/coalescing limit found. | Yes: design event-storm cap/coalescing. |
| 2026-05-29 | Code | `autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts`; `autobyteus-server-ts/src/file-explorer/tree-state-synchronizers/*.ts` | Inspect filesystem event tree-sync path | Watchdog normalizes add/delete/move/modify events and mutates the in-memory tree through synchronizers. `findNodeByPath` is path-depth traversal with sibling scans. | No immediate worker need; preserve ownership. |
| 2026-05-29 | Code | `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Inspect workspace/file-explorer lifecycle | `FileSystemWorkspace` is metadata-only until `acquireFileExplorer`; it reference-counts File Explorer leases and closes the explorer on workspace close. | No |
| 2026-05-29 | Code | `autobyteus-server-ts/src/api/websocket/file-explorer.ts`; `autobyteus-server-ts/src/services/file-explorer-streaming/*.ts` | Inspect WebSocket/session lifecycle | WebSocket route handles close-before-connected race; stream handler acquires File Explorer and watcher leases; `FileExplorerSession.close()` releases watcher lease then File Explorer lease idempotently. | No |
| 2026-05-29 | Code | `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Inspect GraphQL list/search/mutation entrypoints | Resolvers acquire File Explorer leases for operations. `folderChildren` is bounded to a folder; `searchFiles` calls backend search; request abort is not propagated into traversal/indexing. | Yes: search cancellation. |
| 2026-05-29 | Code | `autobyteus-server-ts/src/file-explorer/directory-traversal.ts`; `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | Inspect traversal/indexing cost | Full traversal and index refresh yield periodically but have no cancellation signal. Search snapshot refresh can scan the full workspace. | Yes: close/search cancellation. |
| 2026-05-29 | Code | `autobyteus-web/components/fileExplorer/FileExplorer.vue`; `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts`; `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` | Inspect frontend activation and live stream ownership | File Explorer live session is gated by panel active state and workspace; final consumer disconnect aborts frontend search/snapshot state and closes WebSocket. `disconnect()` is synchronous client-side and does not await backend cleanup. | No |
| 2026-05-29 | Code | `autobyteus-web/electron/server/baseServerManager.ts`; `autobyteus-web/electron/server/macOSServerManager.ts` | Determine process boundary between Electron UI and backend | Electron starts the internal server as a separate Node process using `spawn(process.execPath, [serverEntry, ...])` with `ELECTRON_RUN_AS_NODE=1`. | No |
| 2026-05-29 | Doc | `tickets/done/file-explorer-move-stale-children/*`; `tickets/done/codex-agent-spawn-ebadf-root-cause/*` | Review prior related File Explorer/FD work | Prior root cause: always-on/ignored-too-late watchers could accumulate many FDs and break child-process spawn. Current code has demand-driven watcher leases and ignore filtering at chokidar boundary. | No |
| 2026-05-29 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo diff --stat HEAD..origin/personal -- autobyteus-server-ts/src/file-explorer autobyteus-server-ts/src/services/file-explorer-streaming autobyteus-server-ts/src/api/websocket/file-explorer.ts autobyteus-server-ts/src/api/graphql/types/file-explorer.ts autobyteus-web/components/fileExplorer autobyteus-web/stores/workspaceFileExplorerLiveActions.ts autobyteus-web/services/fileExplorerStreaming autobyteus-web/electron/server` | Ensure main checkout test/probe execution is representative of task base | No diff for relevant File Explorer paths between main checkout HEAD and `origin/personal`; tests/probes from main checkout are acceptable because the dedicated worktree lacks dependencies. | No |
| 2026-05-29 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/file-explorer/workspace-file-explorer.test.ts tests/unit/services/file-explorer-streaming/file-explorer-session.test.ts tests/unit/services/file-explorer-streaming/file-explorer-stream-handler.test.ts --no-watch` | Validate current unit lifecycle behavior | Passed: 3 files, 26 tests. Log saved to `validation-artifacts/file-explorer-lifecycle-unit-20260529.log`. | No |
| 2026-05-29 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts --no-watch` | Validate current WebSocket watcher lifecycle behavior | Passed: 1 file, 3 tests. Log saved to `validation-artifacts/file-explorer-websocket-lifecycle-e2e-20260529.log`. | No |
| 2026-05-29 | Probe | Standalone Node/chokidar synthetic-tree close probe in `autobyteus-server-ts` | Measure close scaling with watched item counts | Close latency increased materially with watched entries: ~39 ms at 301 entries, ~399 ms at 1,201 entries, ~2.45 s at 3,001 entries. FDs returned to baseline after close. | Yes: add diagnostics; avoid hot-path blocking where possible. |

## Current Behavior / Current Flow

### Current entrypoints and boundaries

- Frontend UI activation boundary: `autobyteus-web/components/fileExplorer/FileExplorer.vue` only acquires a live File Explorer session when the panel/workspace is active.
- Frontend live session coordinator: `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts` reference-counts visible File Explorer consumers per workspace and opens/closes one WebSocket service per workspace.
- Frontend WebSocket client: `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` connects to `/ws/file-explorer/:workspaceId`, handles `CONNECTED`, `FILE_SYSTEM_CHANGE`, `ERROR`, and `PONG`, and closes the socket on disconnect.
- Backend WebSocket route: `autobyteus-server-ts/src/api/websocket/file-explorer.ts` creates/disconnects stream sessions and handles close-before-connected races.
- Backend stream owner: `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts` resolves the workspace, acquires a File Explorer lease, acquires a watcher lease, creates a session, and sends events.
- Backend session owner: `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts` owns idempotent stream close, event forwarding, and lease release order.
- Workspace owner: `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` owns lazy `WorkspaceFileExplorer` creation and File Explorer lease counting.
- File Explorer owner: `autobyteus-server-ts/src/file-explorer/file-explorer.ts` owns in-memory tree state, search/indexing, file operations, watcher lifecycle, watcher lease counting, and final close.
- Watcher owner: `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` wraps chokidar and dispatches normalized tree events through `WatchdogHandler` and subscriber queues.

### Thread/process model

- There is no File Explorer-specific backend `worker_threads` usage, frontend Web Worker, or child process.
- The File Explorer watcher runs in the backend Node process. Chokidar/libuv/OS watching performs underlying platform watching, but JS event callbacks, tree synchronization, batching, and event fanout execute on the backend Node event loop.
- The backend Node process itself is separate from the Electron renderer/UI process. On macOS, Electron starts the server with `spawn(process.execPath, [serverEntry, ...])` and `ELECTRON_RUN_AS_NODE=1`.
- Implication: a JS worker thread would only isolate some backend CPU callback work; it would not isolate process-wide file descriptors. If descriptor pressure is the bottleneck, the isolation boundary would need to be a child process/service, not `worker_threads`.
- Frontend implication: WebSocket message parsing and `fileExplorerTreeActions.handleFileSystemChange(...)` currently run on the browser main thread. Vue/DOM rendering cannot move to a worker, but a worker could own a client-side File Explorer model/projection if profiling shows tree reconciliation, flattening, filtering, or visible-row computation blocks rendering.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DFS-FE-001 | Folder/listing snapshot | `FileExplorer.vue` / store request for root or folder children | JSON tree/folder projection returned to frontend store | `WorkspaceFileExplorer` via GraphQL resolver lease | Confirms non-live browsing can remain watcher-free and bounded to requested folder depth. |
| DFS-FE-002 | Live watcher setup | Active File Explorer panel consumer | `FileSystemWatcher` running with one watcher lease per live stream session | `WorkspaceFileExplorer` watcher lease lifecycle | Shows watcher starts only for visible/live WebSocket consumers, not for all workspaces. |
| DFS-FE-003 | External filesystem event propagation | OS/chokidar filesystem event | Frontend File Explorer tree update | `FileSystemWatcher` + `WatchdogHandler` for event normalization; `WorkspaceFileExplorer` for tree authority | Explains where events are synchronized, batched, streamed, and applied. |
| DFS-FE-004 | File Explorer close/dispose | Frontend panel inactive/socket close or workspace close | Watcher subscribers quiesced, watcher lease released/stopped, File Explorer lease released | `FileExplorerSession.close()` and `WorkspaceFileExplorer.close()` | Captures likely slow-close path and stale-event safety. |
| DFS-FE-005 | Search/cold index | Frontend `searchFiles` GraphQL request | Search results or aborted client fetch | `WorkspaceFileExplorer` search snapshot/indexing | Exposes uncancelable full traversal/index refresh that can block close. |
| DFS-FE-006 | File mutation + echo suppression | Frontend create/delete/move/rename/write GraphQL mutation | Server-side file operation result plus frontend/applied watcher echo handling | File operation classes under `WorkspaceFileExplorer`; frontend mutation actions | Ensures performance changes preserve mutation correctness and duplicate-event suppression. |
| DFS-FE-007 | Frontend tree reconciliation/render path | `FILE_SYSTEM_CHANGE` WebSocket message or mutation echo | Updated store tree and rendered visible File Explorer rows | Current owner: Pinia store + Vue component on browser main thread; possible future owner: File Explorer model Web Worker for compute-only projection | Separates what can move to a frontend worker from what must remain on the UI thread. |
| DFS-FE-008 | Files-to-Terminal switch latency | User switches from Files tab to Terminal tab after live watcher is active | Terminal WebSocket open and PTY first output | Separate owners: File Explorer lifecycle and Terminal handler; shared backend process/event loop is the interference boundary | Directly addresses observed terminal slow-connect symptom. |

### DFS-FE-001: Folder/listing snapshot path

`FileExplorer.vue` active view / store snapshot refresh -> GraphQL `folderChildren` resolver in `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` -> `FileSystemWorkspace.acquireFileExplorer("folderChildren")` -> `WorkspaceFileExplorer.loadFolderChildren(folderPath)` -> `DirectoryTraversal.loadChildren(...)` / `TreeNode.toShallowDict(...)` -> frontend store receives folder children.

Key observations:
- This path acquires a File Explorer lease but does not acquire a watcher lease.
- `loadFolderChildren` is bounded to the requested folder and supports an internal `AbortSignal`, but the GraphQL resolver currently does not pass a request abort signal.

### DFS-FE-002: Live watcher setup path

`FileExplorer.vue` panel active watcher -> `workspaceStore.acquireFileExplorerLiveSession(workspaceId, consumerId)` -> `FileExplorerStreamingService.connect(workspaceId)` -> backend `/ws/file-explorer/:workspaceId` route -> `FileExplorerStreamHandler.connect(...)` -> `FileSystemWorkspace.acquireFileExplorer("file-explorer-websocket")` -> `WorkspaceFileExplorer.acquireWatcherLease("file-explorer-websocket")` -> `WorkspaceFileExplorer.startWatcher()` -> `new FileSystemWatcher(...)` -> `chokidar.watch(workspaceRootPath, { ignored: ignoreMatcher.shouldIgnoreForWatch, ignoreInitial: true, persistent: true, awaitWriteFinish: ... })` -> `CONNECTED` message to frontend.

Key observations:
- Current implementation shares one real watcher across multiple visible WebSocket consumers via watcher lease count.
- Existing E2E confirms search snapshot APIs are watcher-free and multiple WebSocket consumers share one watcher.

### DFS-FE-003: Filesystem event propagation path

OS/libuv/chokidar event -> `FileSystemWatcher` handler (`handleAdd`, `handleUnlink`, `handleModify`; move detection via 200 ms timer) -> `WatchdogHandler` -> add/remove/move/modify synchronizer mutates `WorkspaceFileExplorer` tree -> `FileSystemChangeEvent` JSON -> `FileSystemWatcher` subscriber queues -> `EventBatcher` 250 ms composite batching -> `FileExplorerSession` forwarder -> `FileExplorerStreamHandler` sends `FILE_SYSTEM_CHANGE` over WebSocket -> `FileExplorerStreamingService` -> `workspaceFileExplorerLiveActions.handleFileSystemChange` -> File Explorer store tree update.

Key observations:
- The main event callback and tree mutation run on the backend Node event loop.
- Event batching exists, but there is no explicit unbounded queue protection for huge event storms.

### DFS-FE-004: Close/dispose path

Frontend panel inactive/unmount/switch -> `suspendInactiveWork()` releases live session, aborts frontend search, clears snapshot generation/timers/listeners -> final consumer release calls `disconnectFileExplorerLiveStreamForStore()` -> WebSocket closes -> backend route `cleanup()` -> `FileExplorerStreamHandler.disconnect(sessionId)` -> `FileExplorerSession.close()` -> event queue closed, watcher lease released, File Explorer lease released, event generator returned, forwarder awaited -> `WorkspaceFileExplorer.releaseWatcherLease()` -> if count reaches zero, `stopWatcherIfUnused()` -> `FileSystemWatcher.stop()` detaches subscribers/timers and awaits `chokidar.close()`.

Workspace close path:
`WorkspaceManager/FileSystemWorkspace.close()` -> `WorkspaceFileExplorer.close()` -> sets watcher lease count to zero -> waits for `searchSnapshotRefreshTask` if present -> waits for any watcher start/stop promise -> `stopWatcher()` -> `FileSystemWatcher.stop()`.

Key observations:
- Logical watcher quiescence is good inside `FileSystemWatcher.stop()` because subscribers/timers are cleared before awaiting chokidar close.
- The public release/close path still awaits `chokidar.close()`; latency can scale with watched item count.
- `WorkspaceFileExplorer.close()` also waits for full search snapshot refresh if one is in progress, which can make close slow for reasons unrelated to watcher close.

### DFS-FE-005: Search/cold index path

Frontend search input -> `fileExplorerSearchActions.searchFiles` aborts previous client request via `AbortController` -> GraphQL `searchFiles` resolver -> `FileSystemWorkspace.acquireFileExplorer("searchFiles")` -> `WorkspaceFileExplorer.searchFiles(query)` -> `refreshSearchSnapshotIndex()` -> `buildWorkspaceDirectoryTree()` full traversal -> `FileNameIndexer.refreshSnapshotIndex()` -> `CompositeSearchStrategy` tries `FuzzysortSearchStrategy`, then fallbacks -> results returned to frontend.

Key observations:
- Search always refreshes/builds the snapshot index before strategy execution, even on cold query paths where ripgrep might be cheaper.
- Frontend abort cancels the HTTP/client request, but backend traversal/index refresh has no cancellation signal and can continue.
- `WorkspaceFileExplorer.close()` awaits the same refresh task, so closing during cold search can feel slow.

### DFS-FE-006: Mutation and watcher echo path

Frontend mutation action -> GraphQL file operation mutation -> `WorkspaceFileExplorer.fileOperations` operation (`create`, `delete`, `move`, `rename`, `write`) -> filesystem mutation + in-memory tree update/suppression path -> mutation returns `FileSystemChangeEvent` -> frontend applies mutation event and records recent structural echo -> live watcher event may arrive -> frontend consumes matching recent echo to avoid duplicate structural update.

Key observations:
- Target lifecycle/performance changes must preserve echo suppression and mutation correctness.


### DFS-FE-007: Frontend tree reconciliation/render path

`FileExplorerStreamingService.onmessage` -> `handleMessage(JSON.parse(...))` -> `onFileSystemChange` callback -> workspace store `handleFileSystemChange` -> File Explorer store `fileExplorerTreeActions.handleFileSystemChange` -> echo suppression -> `applyTreeChanges(wsState.tree, wsState.nodeIdToNode, event)` -> Vue reactive updates and DOM rendering.

Key observations:
- There is no File Explorer-specific frontend Web Worker today.
- WebSocket receive callbacks, JSON parsing, event application, Pinia mutation, and Vue reactive propagation run on the browser main thread.
- If profiling shows frontend jank during large snapshots/event batches, the movable work is the pure data-model side: event normalization, tree reconciliation, flattening, filtering, search projection, and visible-row computation. Vue components and actual DOM updates must remain on the main thread.
- A future frontend worker should avoid becoming a second source of truth. Either the worker owns the client-side tree model and emits patches/projections to the UI, or the main-thread store remains authoritative; do not keep both authoritative models.


### DFS-FE-008: Files-to-Terminal switch / possible indirect interference path

UI tab select `terminal` -> `RightSideTabs.vue` marks Files inactive but keeps Files mounted with `v-show` -> `FileExplorer.vue` receives `active=false` -> `suspendInactiveWork()` releases live File Explorer session and aborts frontend search -> backend File Explorer WebSocket cleanup starts `FileExplorerSession.close()` / watcher lease release / `FileSystemWatcher.stop()` -> same tab switch mounts `Terminal.vue` -> `useTerminalSession.connect()` opens `/ws/terminal/:sessionId?cwd=...` -> backend Terminal route authorizes, `fs.stat`s cwd, `TerminalHandler.connect()` creates a PTY session -> on macOS `IsolatedPtySession.start()` spawns a helper process and waits for ready -> terminal output stream begins.

Key observations:
- There is no direct backend dependency from Terminal to Workspace File Explorer. Terminal code does not acquire a File Explorer lease, call `folderChildren`, call `searchFiles`, or touch watcher APIs.
- The plausible coupling is shared-resource interference: File Explorer watcher event processing, watcher close, or uncancelable search refresh runs in the same backend Node process/event loop while Terminal route/session startup is trying to proceed.
- The frontend also does Files teardown and Terminal mount in the same tab switch, so browser main-thread jank can mimic backend Terminal slowness unless measured separately.
- Existing historical validation showed built-backend Terminal connect normally very fast and Terminal/FileExplorer boundary grep clean, but the user's concrete scenario needs a combined Files-active -> Terminal-switch timing probe under a large watched tree/event workload.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Performance / lifecycle analysis.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant for close/search cancellation; no design issue found in the core demand-driven watcher owner boundary; separate-process isolation is a deferred architecture option.
- Refactor posture evidence summary: Targeted refactor is justified around `WorkspaceFileExplorer` close/search lifecycle and watcher diagnostics. Full worker/process split is not justified without additional metrics.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User report | Perceived File Explorer performance issue and slow cleanup/close; suspicion that watcher may need worker isolation. | Investigation must separate real backend event-loop/FD risk from lifecycle, search, event-volume, and frontend reconciliation risks. | Done for current analysis; runtime telemetry still needed in product. |
| Code inspection | Watcher lifecycle is owned by `WorkspaceFileExplorer`, and demand-driven watcher leases already exist. | Current owner boundary is mostly correct; do not bypass it with a generic worker wrapper. | Preserve in design. |
| Code inspection | `WorkspaceFileExplorer.close()` awaits `searchSnapshotRefreshTask`, which can run full traversal/indexing without cancellation. | Close invariant is incomplete; targeted refactor needed. | Design/implement cancellation or close-detached work. |
| Chokidar probe | `watcher.close()` time grows with watched entries and descriptors. | Slow close can be real even when code is logically correct; metrics and close UX strategy are needed. | Add diagnostics; consider idle-stop grace/two-phase close. |
| Existing tests | Unit/E2E lifecycle tests pass, including close-before-connected and repeated open/close descriptor/spawn health. | Old always-on/leaking watcher issue appears addressed in current code; remaining issue is latency/observability/cancellation, not gross leak. | Extend tests for search-close and diagnostic behavior. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Metadata workspace owner, lazy File Explorer creation, File Explorer lease count, workspace close | Keeps File Explorer uncreated until acquired; release only decrements lease; close awaits `fileExplorer.close()`. | Correct high-level owner; close must not inherit unbounded child work. |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | Authoritative File Explorer tree/search/watcher/file-operation owner | Owns watcher lease count, start/stop promises, search snapshot task, close. Close waits for search snapshot refresh. | Main target for lifecycle/search cancellation and diagnostics. |
| `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | Chokidar wrapper and raw event dispatcher | No worker/thread boundary. Stop clears queues/timers before `watcher.close()`. | Preserve logical quiescence; add timing/count metrics and maybe non-hot-path close strategy. |
| `autobyteus-server-ts/src/file-explorer/watcher/event-batcher.ts` | Async event queues and composite event batching | 250 ms batching exists; no explicit event-storm cap/backpressure. | Add bounded coalescing/backpressure in targeted design. |
| `autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts` and `autobyteus-server-ts/src/file-explorer/tree-state-synchronizers/*.ts` | Normalize watcher events and mutate in-memory tree | Tree sync runs in backend event loop; local algorithms appear owner-coherent. | Do not move only watcher callbacks without preserving single tree authority. |
| `autobyteus-server-ts/src/file-explorer/directory-traversal.ts` | Directory traversal/tree building | Full traversal yields periodically but has no cancellation signal. | Needs abort/cancellation integration for search and close. |
| `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | File-name index refresh/search support | Snapshot refresh yields periodically but has no cancellation signal. | Needs abort/cancellation integration or close-detached semantics. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | GraphQL File Explorer operations | `folderChildren` bounded; `searchFiles` triggers backend search; request abort not propagated. | Search/list cancellation should be handled at resolver or File Explorer owner boundary. |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | WebSocket route/session cleanup | Handles close/error and late disconnect if socket closes before `CONNECTED`. | Existing race handling should be preserved. |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts` | WebSocket stream connect/disconnect orchestration | Acquires File Explorer and watcher leases; disconnect closes session. | Existing owner relationship is coherent. |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts` | Per-session event forwarding and idempotent close | Releases watcher lease first, then File Explorer lease; closes queue/generator/forwarder. | Good session close owner; target changes should not bypass it. |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | UI active-state boundary | Releases live session and aborts frontend search on inactive/unmount. | Frontend already signals inactivity; backend must honor cancellation/close semantics. |
| `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts` | Frontend live-consumer reference count and stream setup/teardown | First consumer connects stream; final release aborts frontend work and disconnects stream. | Preserve frontend demand-driven behavior. |
| `autobyteus-web/stores/fileExplorerTreeActions.ts` / `~/utils/fileExplorer/fileUtils` | Frontend File Explorer tree mutation and echo suppression | `handleFileSystemChange` consumes echoes, applies tree changes to Pinia state, and invalidates modified file content on the main thread. | Candidate future Web Worker boundary if profiling shows tree reconciliation/projection is expensive; Vue/DOM stays main-thread. |
| `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` | Browser-side WebSocket client | `disconnect()` closes WS and clears local state; WebSocket `onmessage` parses JSON and invokes File Explorer event callback on the main thread. | Backend close latency may not block UI directly, but frontend stream/event handling can still contribute to UI jank under large batches. |
| `autobyteus-web/electron/server/macOSServerManager.ts` | Electron internal server process launch | Spawns backend as separate Node process with `ELECTRON_RUN_AS_NODE=1`. | UI renderer is already process-isolated from watcher; backend process is not File Explorer-workerized. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-29 | Test | From dedicated worktree: `pnpm -C autobyteus-server-ts exec vitest ...` | Failed with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found` because the dedicated worktree has no `node_modules`. | Use main checkout with installed deps after verifying relevant paths match `origin/personal`. |
| 2026-05-29 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/file-explorer/workspace-file-explorer.test.ts tests/unit/services/file-explorer-streaming/file-explorer-session.test.ts tests/unit/services/file-explorer-streaming/file-explorer-stream-handler.test.ts --no-watch` | Passed: 3 files, 26 tests. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/validation-artifacts/file-explorer-lifecycle-unit-20260529.log`. | Current unit lifecycle behavior is healthy for existing tests. |
| 2026-05-29 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts --no-watch` | Passed: 1 file, 3 tests. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/validation-artifacts/file-explorer-websocket-lifecycle-e2e-20260529.log`. Confirms watcher-free snapshot APIs, one real watcher shared across live consumers, close-before-connected lease cleanup, repeated open/close without descriptor growth, and child-process spawn health. | Old gross watcher leak is covered; add search-close and diagnostics tests next. |
| 2026-05-29 | Probe | Standalone Node script using `chokidar.watch` over synthetic trees of 50/200/500 dirs with 5 files each; recorded watched counts, FD counts, ready duration, close duration. | Results: 50 dirs: watchedDirs 52, watchedEntries 301, FDs 12→262→12, ready 30.1 ms, close 39.4 ms. 200 dirs: watchedDirs 202, watchedEntries 1201, FDs 12→1012→12, ready 83.1 ms, close 398.8 ms. 500 dirs: watchedDirs 502, watchedEntries 3001, FDs 12→2512→12, ready 204.2 ms, close 2449 ms. | `chokidar.close()` can be slow at larger watched counts; instrumentation is needed and hot close paths should not also wait on unrelated full-search traversal. |
| 2026-05-29 | Probe | Standalone Node script with 500-dir chokidar watcher, measuring `child_process.spawn(process.execPath, ...)` before watcher, with watcher active, during watcher close, and after close. | With ~3,001 watched entries and FDs 13→2513→13, child-process spawn stayed ~26 ms in all phases; watcher close took ~957 ms in that run. | Plain child_process spawn was not slowed by active watcher FDs in this synthetic probe, but watcher close still consumed nearly 1 s. Terminal real startup may still be delayed by backend event-loop work, PTY helper startup, or frontend work; needs integrated Files-to-Terminal instrumentation. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Not needed for this investigation. The necessary behavior was established from local code, local tests, and a local chokidar runtime probe.
- Version / tag / commit / freshness: Repository base `origin/personal` at `a96a8bdaac3dd042d084eab1fff9cd38f59fb783` on 2026-05-29.
- Relevant contract, behavior, or constraint learned: Local runtime behavior shows chokidar close time scales with watched entries on this environment.
- Why it matters: The user's slow-close report can be explained by concrete local behavior without assuming a missing worker thread.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Unit/E2E tests create temporary workspaces and test SQLite DB through the existing test setup.
- Required config, feature flags, env vars, or accounts: Existing test `.env.test`; no external accounts.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation listed in Source Log; main checkout used for tests because it has installed dependencies and relevant paths match the refreshed base.
- Cleanup notes for temporary investigation-only setup: Synthetic chokidar probe created temporary directories under the OS temp area and removed them in script cleanup.

## Findings From Code / Docs / Data / Logs

1. **No File Explorer worker exists today.** The backend watcher is a chokidar wrapper inside `FileSystemWatcher`, created by `WorkspaceFileExplorer.startWatcher()`. No File Explorer code path uses `worker_threads`, `new Worker`, or a dedicated child process.
2. **The UI is already process-isolated from watcher work.** Electron starts the backend as a separate Node process, so watcher callbacks do not run in the renderer. However, File Explorer watcher callbacks do run in the same backend process/event loop as other backend work.
3. **The current watcher lifecycle is demand-driven and largely correct.** Existing tests verify watcher-free snapshot/search API behavior, one watcher shared across visible WebSocket consumers, close-before-connected cleanup, repeated open/close without descriptor growth, and child-process spawn health.
4. **The frontend File Explorer is also not workerized.** Current stream message parsing and tree state application run on the browser main thread. A frontend Web Worker may be beneficial for heavy tree-model work, but not for Vue/DOM rendering and only after profiling shows main-thread jank.
5. **Slow close can still be real.** `watcher.close()` cost scales with watched entries, and `WorkspaceFileExplorer.close()` can wait for a full, uncancelable search snapshot traversal/index refresh before it even stops the watcher.
6. **Worker threads are not a descriptor-pressure fix.** Since Node worker threads share the process, they share the process FD table. If process-level FD isolation is needed, a child process/service is the right boundary, not a worker thread.
7. **The most actionable real fix is to isolate native watcher runtime work from the backend parent event loop.** The confirmed Files -> Terminal delay is caused by synchronous chokidar close in the parent process. The target design should keep `WorkspaceFileExplorer` authoritative for File Explorer state, but move native chokidar start/close/raw-event collection behind a child-process runtime boundary. Search cancellation/detachment, lifecycle metrics, and event backpressure remain necessary safeguards around that boundary.

## Constraints / Dependencies / Compatibility Facts

- Dedicated task worktree must remain authoritative for artifacts and downstream work.
- Target design must preserve the existing demand-driven watcher lifecycle from prior FD-leak fixes.
- Target design must reject long-lived dual watcher behavior/backward-compatibility wrappers unless explicitly outside scope.
- The approved watcher process split must not create two authoritative File Explorer trees. `WorkspaceFileExplorer` remains the source of truth for tree mutations, watcher leases, file operations, path validation, and lifecycle; the child process owns native chokidar collection only.
- Existing path-boundary validation, ignored-folder policy, and mutation echo suppression must be preserved.

## Open Unknowns / Risks

- Product telemetry is not yet available to rank how often each performance risk occurs in normal usage; however, the reproduced Files -> Terminal delay in the target workspace is confirmed to be backend parent event-loop blocking during chokidar close.
- GraphQL request abort-signal propagation was confirmed by API/E2E round 2; implementation must preserve it while adding semantic event reconciliation.
- Acceptable event-storm coalescing semantics need product/implementation confirmation for cases such as generated directories, large deletes, and move storms.
- Child-process watcher isolation is now in scope for the real fix. Event-storm behavior inside the child still needs bounded parent-side coalescing/backpressure so raw event bursts do not overwhelm parent queues after IPC delivery.

## Notes For Architect Reviewer

Implementation scope is now approved by the user as of 2026-05-29. The design should focus on a clean-cut child-process watcher runtime boundary for native chokidar lifecycle while preserving `WorkspaceFileExplorer` as the authoritative File Explorer tree/session owner. The design should also include close-safe search refresh behavior, watcher lifecycle diagnostics, bounded event batching/backpressure, explicit Files-to-Terminal latency validation, and a profile-driven frontend model-worker option as a separate follow-up. Backend `worker_threads` should be rejected as the production solution for this ticket because they do not isolate process-wide watcher descriptor pressure, and an in-process chokidar fallback must not remain in production for the replaced path.

## Runtime Files-to-Terminal Timing Probe Update (2026-05-29)

After the user clarified that Terminal requires an agent-bound workspace context, I created a temporary frontend agent context bound to `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` and reran the Files -> Terminal scenario with timing instrumentation enabled.

Artifacts:
- Backend timing log: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/runtime-logs/backend-timing-20260529.log`
- Backend timing grep: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/validation-artifacts/backend-files-to-terminal-timing-grep-20260529.log`
- Probe summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/validation-artifacts/files-to-terminal-timing-summary-20260529.md`

Observed timing:
- Frontend created an agent-bound workspace context and clicked Files at `1780061770125`.
- File Explorer live stream connected at `1780061772485` after watcher start completed.
- Backend watcher start: `FileSystemWatcher.start.ready durationMs=2337`, `watchedDirectoryCount=1670`, `watchedEntryCount=9847`.
- Frontend clicked Terminal and created the terminal WebSocket at `1780061774634`.
- Backend watcher close started at `1780061774634` and finished at `1780061794810`: `FileSystemWatcher.stop.end durationMs=20178`.
- Backend Terminal route accepted the socket at `1780061794814`, immediately after watcher close finished.
- Backend PTY startup after route acceptance was not slow: `IsolatedPtySession.start.end durationMs=248`; first PTY stdout arrived `369 ms` after isolated session start.
- Frontend WebSocket `open` fired `20180.4 ms` after frontend WebSocket creation; first terminal output arrived `20553.8 ms` after frontend WebSocket creation.

Preliminary root-cause conclusion:
- The user-reported symptom reproduced: the frontend writes the local “Connected to Workspace Terminal” line immediately, but the shell prompt/output arrives late.
- In this reproduction, the delay is not the terminal PTY helper itself. The backend did not accept/process the Terminal WebSocket until after File Explorer watcher shutdown finished.
- The current hot path couples tab switch from Files -> Terminal to `chokidar.close()` on the shared backend Node process/event loop; for this workspace close took ~20.18 s. This is now the primary confirmed issue to design around.

## Watcher Close Internal Timing Probe Update (2026-05-29)

Added deeper instrumentation inside `FileSystemWatcher.stop()` to break shutdown into:
- Chokidar internal `_closers`, `_watched`, `_streams`, `_throttled`, pending write/unlink counts.
- Active backend handles before/after close.
- Sync duration of the `watcher.close()` call before its promise is returned.
- Await duration after `watcher.close()` returns.
- Wrapped per-closer synchronous timing totals/samples.
- A zero-delay timer and 100 ms interval event-loop probe during close.

Artifacts:
- Summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/validation-artifacts/watcher-close-internal-timing-20260529.md`
- Backend grep: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/validation-artifacts/backend-watcher-close-internal-grep-20260529.log`
- Full backend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/runtime-logs/backend-timing-close-detail-20260529.log`

Findings:
- Watcher start for the target workspace observed `watchedDirectoryCount=1670`, `watchedEntryCount=9847`.
- Before close, chokidar held `closerPathCount=9847`, `closerFunctionCount=9847`, and active backend handles included `FSWatcher=9847`.
- `watcher.close()` itself consumed `closeCallSyncDurationMs=21356.1` before returning its promise.
- Awaiting the returned promise consumed only `closeAwaitDurationMs=3`.
- Wrapped closer timing showed `calledCloserCount=9847`, `totalCloserSyncMs=21347.4`, `avgCloserSyncMs=2.2`, `maxCloserSyncMs=67.9`.
- A zero-delay timer scheduled before close did not fire until `21363 ms` later; a 100 ms interval recorded `0` ticks before close/await ended and then a `~21362 ms` gap.

Root-cause refinement:
- The Files -> Terminal prompt delay is caused by synchronous chokidar watcher shutdown on the backend Node event loop. The promise returned by `watcher.close()` is not the expensive async part in this scenario; chokidar's synchronous close loop over thousands of native `FSWatcher` closers blocks the event loop before the promise is returned.
- This explains why Terminal WebSocket route acceptance happened only after File Explorer close completed in the previous reproduction: the backend event loop could not process the socket upgrade while inside the synchronous close loop.
- This changes the worker/process recommendation. Worker threads were not a sufficient answer for process-wide FD pressure, but they are now a plausible mitigation for this confirmed event-loop blocking. A child process remains the stronger isolation boundary because it isolates both event-loop blocking and descriptor pressure.

## Requirements Approval / Design Scope Update (2026-05-29)

The user approved a real, durable fix after reviewing the investigation and the child-process watcher-runtime recommendation. Scope is no longer "diagnostics first, defer process split". The design basis is now:

- The backend parent process must not create/close chokidar directly for production File Explorer live watching.
- Native chokidar lifecycle moves to a dedicated child process per active workspace watcher.
- `WorkspaceFileExplorer` remains authoritative for tree state, watcher leases, file operations, search/index, path-boundary validation, ignored-path policy gate, mutation echo suppression, and subscriber/event dispatch.
- The watcher child process owns only raw native watch collection: start, ready, raw add/addDir/unlink/unlinkDir/change/error, stop, and process shutdown.
- Parent logical watcher close must complete without waiting for the child to finish physical chokidar close; late/stale child messages must be ignored using explicit watcher/generation identity.
- Production code must not preserve an in-process chokidar fallback for the replaced path. Test fakes are acceptable for unit coverage.
- Search refresh/traversal cancellation or close-detachment remains in scope as a lifecycle safeguard, even though the reproduced Terminal delay was dominated by chokidar close.

## API/E2E Design Impact Update — VAL-FE-006 (2026-05-29)

API/E2E round 2 routed a design-impact finding after all previously reviewed executable checks passed for watcher isolation, Files-to-Terminal timing, built child runtime, GraphQL abort propagation, stop-path E2E, and frontend reconnect/resync.

Artifacts:
- API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/api-e2e-validation-report.md`
- Design-impact reroute note: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/api-e2e-design-impact-reroute-20260529.md`
- Solution response: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/solution-design-impact-response-VAL-FE-006-20260529.md`

Finding:
- Current backend `EventBatcher` performs simple 0.25 second composite batching by concatenating `changes` arrays. It also has bounded overflow/fail-close behavior.
- The user clarified that backend File Explorer should not send every short-window update to the frontend and that 1-3 seconds of reconciliation latency can be acceptable.
- The current design/implementation did not define semantic per-path/per-node reconciliation rules, subtree invalidation, or explicit resync-required stream messages.

Solution-design decision:
- `VAL-FE-006` is in scope for this ticket because it refines the existing event backpressure/coalescing requirement (`REQ-FE-PERF-007`) and affects the backend/frontend stream contract.
- The target design must introduce a semantic event reconciliation owner between parent raw watcher events and WebSocket stream delivery.
- The old change-only composite batcher is decommissioned from the live watcher semantic path; typed reconciled outcomes replace `{ changes }` concatenation for stream delivery.

## Architecture Re-Review Round 2 Update — VAL-FE-006 (2026-05-29)

Architecture re-review failed the first semantic reconciliation revision as `Design Impact` and reported four blocking findings:

- `DR-FE-VAL006-001`: owner placement contradiction between `SemanticFileEventReconciler` and old `FileSystemWatcher` move/tree-sync path.
- `DR-FE-VAL006-002`: stream outcome mapping and per-session sequence ownership were not concrete.
- `DR-FE-VAL006-003`: unique unlink+add was insufficient proof for safe move/rename.
- `DR-FE-VAL006-004`: parent stale-subtree invalidation invariant was underspecified.

Response artifact:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/solution-design-impact-response-VAL-FE-006-round2-20260529.md`

Design corrections made:
- `SemanticFileEventReconciler` is the single semantic owner for raw watcher event merge, move/rename confidence, tree mutation/invalidation/resync decisions, stale-scope gating, and typed outcome emission.
- `FileSystemWatcher` is limited to runtime generation validation, mutation-suppression pre-filtering, reconciler lifecycle, logical stop, and typed subscriber dispatch.
- Old `PendingUnlink` / `moveDetectionWindowMs` / direct `WatchdogHandler` raw-event application is explicitly removed from the target design.
- `EventBatcher` is decommissioned from the live watcher semantic path and replaced by typed `ReconciledFileExplorerEvent` delivery.
- `FileExplorerSession` owns per-session sequence assignment; `FileExplorerStreamHandler` owns WebSocket message serialization.
- Watcher-derived move/rename requires filesystem identity proof (`{dev, ino, kind}`); unique unlink+add without proof produces invalidation/resync.
- Targeted invalidation uses stale-scope gating with `TreeFreshnessRegistry`; granular events under stale scopes are suppressed/escalated until `WorkspaceFileExplorer.loadFolderChildren()` refreshes and clears the stale scope.

## Scope Simplification Update — 2026-05-29

User clarified that the ticket should return to the original Files -> Terminal performance/root-cause scope and should remove the proposed semantic event reconciliation expansion. Rationale recorded from the user discussion:

- The confirmed performance problem was watcher shutdown blocking the backend parent event loop, not high-frequency frontend event delivery.
- Workspace watcher events are already filtered by ignore policy. The current implementation uses `.gitignore` plus explicit ignored folders such as `.git`; the repository ignores common high-churn folders including `node_modules`, build output, `dist`, `.nuxt`, and coverage/build artifacts. Therefore raw filesystem churn in ignored paths should not normally reach the File Explorer stream.
- The File Explorer UI is not a frequently used path for most users, so a large semantic reconciliation subsystem would add complexity without proportional evidence-backed value.

Design decision after clarification:

- Remove `VAL-FE-006` semantic reconciliation from this ticket.
- Preserve the existing lightweight `EventBatcher` / bounded queue / reconnect-refresh behavior.
- Do not add `SemanticFileEventReconciler`, `FILE_SYSTEM_INVALIDATED`, `FILE_SYSTEM_RESYNC_REQUIRED`, file identity tracking, stale-scope gating, or targeted invalidation in this ticket.
- Keep a future option open: if later profiling proves real non-ignored event storms are a product issue, design semantic reconciliation as a separate focused ticket with fresh requirements and validation.

Artifacts updated in place:

- `tickets/in-progress/file-explorer-performance-analysis/requirements.md`
- `tickets/in-progress/file-explorer-performance-analysis/design-spec.md`
- `tickets/in-progress/file-explorer-performance-analysis/solution-design-impact-response-VAL-FE-006-scope-reduction-20260529.md`
