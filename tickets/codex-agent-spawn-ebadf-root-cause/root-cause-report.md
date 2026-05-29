# Codex Agent `spawn EBADF` Root Cause Report

Date: 2026-05-22
Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause`
Observed failing user workspace: `/Users/normy/autobyteus_org/autobyteus-tutorial-videos`

## Executive finding

The failing `Codex` run is not failing because of GPT-5.5, the prompt, the attached context file, or the Codex agent definition. It fails before Codex starts.

The embedded AutoByteus server process has accumulated 10k+ workspace file watcher descriptors. In that resource state, Node/Electron child-process creation can throw:

```text
spawn EBADF
```

A new Codex app-server client requires `child_process.spawn(...)`. Since the failing workspace does not already have a live Codex app-server child, activation fails and the run stays in the pre-start state.

## Most important evidence

### Failing run never started

Run metadata for `7f230594-ead2-4760-9fda-afcf69ad884a`:

```json
{
  "agentDefinitionId": "codex",
  "workspaceRootPath": "/Users/normy/autobyteus_org/autobyteus-tutorial-videos",
  "llmModelIdentifier": "gpt-5.5",
  "runtimeKind": "codex_app_server",
  "platformAgentRunId": null,
  "startedAt": null
}
```

WebSocket command ack:

```json
{
  "accepted": false,
  "code": "ACTIVATION_FAILED",
  "message": "spawn EBADF"
}
```

### Reproduced through the Electron server path

Using the same backend path as the frontend (`prepareAgentRun` + `/ws/agent/:runId` + `SEND_MESSAGE`):

- Original run `7f230594-ead2-4760-9fda-afcf69ad884a`: failed with `ACTIVATION_FAILED spawn EBADF`.
- Fresh run in `/Users/normy/autobyteus_org/autobyteus-tutorial-videos`: failed with `ACTIVATION_FAILED spawn EBADF`.
- Fresh run in `/tmp/autobyteus-codex-repro-small`: failed with `ACTIVATION_FAILED spawn EBADF`.
- Fresh run in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`: accepted, because an AutoByteus-owned Codex app-server child for that cwd was already running.

Existing AutoByteus child:

```text
PID 12922 node /Users/normy/.nvm/versions/node/v22.21.1/bin/codex app-server
cwd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo
```

So the more precise condition is: **new Codex app-server spawns fail after server descriptor pressure; already-started app-server clients can still accept work.**

### File descriptors are dominated by workspace watchers

Current embedded server process:

```text
PID 98772
lsof -p 98772 | wc -l -> about 11033
```

The high descriptor rows are primarily regular files under workspace roots watched by the server. `lsof` shows fd numbers reaching `9999` and then `*NNN` display rows, which on this macOS output indicates fds beyond the 9999 display width.

A standalone watcher probe on the tutorial workspace with the same `chokidar.watch(...)` style opened about 1,429 regular-file descriptors and released them after `watcher.close()`.

### EBADF reproduced without Codex

A standalone Node probe with many `fs.watch` handles reproduced the same exception:

```text
N=10220 watchers -> spawn succeeds
N=10240 watchers -> spawn throws EBADF
```

Representative stack:

```text
Error: spawn EBADF
    at ChildProcess.spawn (node:internal/child_process:420:11)
    at spawn (node:child_process:787:9)
```

This confirms the exception is a Node/macOS child-process failure under watcher/fd pressure, not a Codex CLI or prompt-specific issue.

## Code path implicated

### Codex activation

`autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts`:

```ts
this.process = spawn(this.options.command, this.options.args, {
  cwd: this.options.cwd,
  env: this.options.env ?? process.env,
  stdio: ["pipe", "pipe", "pipe"],
});
```

`CodexAppServerClientManager` keeps one app-server client per cwd. If that cwd has no running client, activation must spawn a new child process.

### Descriptor accumulation

`autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`:

- `initialize()` starts `completeFullInitialization()` in the background.
- `completeFullInitialization()` calls `fileNameIndexer.start()`.

`autobyteus-server-ts/src/file-explorer/file-name-indexer.ts`:

- `start()` calls `fileExplorer.ensureWatcherStarted()` and subscribes to watcher events.

`autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`:

- `start()` calls recursive `chokidar.watch(...)` over the workspace root.

`autobyteus-server-ts/src/workspaces/workspace-manager.ts`:

- Created workspaces are cached in `activeWorkspaces` with no idle release path.

`autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts`:

- WebSocket `disconnect()` closes the session but does not release/stop the underlying workspace watcher.

## Root cause classification

Boundary/ownership issue with a missing lifecycle invariant:

- Workspace manager owns workspace caching but does not release expensive resources for inactive workspaces.
- File-name indexing starts persistent recursive watchers as part of workspace initialization.
- Watchers are not scoped to active UI/file-explorer consumers or an idle timeout.
- The server can therefore accumulate enough descriptors that later child-process spawning fails with `EBADF`.

## Why it appears rare

The bug requires accumulated server state. A clean server, or a workspace that already has a live Codex app-server child, may not hit the failing path. A new Codex workspace/cwd after many large workspace watchers have accumulated does hit the path.

This matches the user observation: other runs often work, but this one failed repeatedly.

## Immediate workaround

Restart AutoByteus. That should release the accumulated watcher/file descriptors and allow a fresh Codex app-server child to spawn again.

## Durable fix direction

Fix the workspace watcher lifecycle rather than patching the Codex runtime only:

1. Stop starting recursive watchers unconditionally from workspace initialization / filename indexer startup.
2. Tie watcher startup to explicit active consumers, or introduce reference counting plus idle shutdown.
3. Ensure file-explorer WebSocket disconnects release subscriptions and allow watchers to stop.
4. Add workspace-manager idle eviction/close for inactive cached workspaces.
5. Add regression tests/probes proving descriptor count does not grow monotonically after repeated workspace open/disconnect cycles and proving child-process spawn remains healthy under normal app usage.

## Refined Product Insight

The file watcher exists to power the frontend file explorer's live-update experience, not to make every loaded workspace continuously observable. The frontend currently violates that intent by opening file-explorer WebSocket streams from workspace load paths (`createWorkspace`, `fetchAllWorkspaces`, and `registerSkillWorkspace`). The backend then compounds the issue by starting recursive watchers from workspace/indexer initialization and by lacking explicit watcher leases on stream sessions.

The durable fix should therefore be demand-driven on both sides:

- Frontend: open live file-explorer streams only while a file explorer surface is visible.
- Backend: keep a recursive watcher alive only while at least one stream session holds a watcher lease.
- Snapshot tree refresh/search/file operations should remain request/response flows and must not imply persistent watching.

This design matches actual user behavior: if the user only opens file explorer for a short portion of the day, the backend should only watch during that visible interval, plus an optional short idle grace period.

## Post-Review Edge-Case Refinements

Two edge cases are now explicitly part of the durable fix:

1. Mobile has a nested `RightSideTabs` instance in the tools panel. Because mobile already has a dedicated Files/Explorer panel, the tools-side `RightSideTabs` must suppress the `files` tab and never render `FileExplorerLayout`.
2. The file-explorer WebSocket route must clean up pending async `connect()` work when the socket closes before a `sessionId` exists. Late-created sessions must be disconnected, and handler setup failures after watcher lease acquisition must release the lease.

## Same-Ticket Release Blocker: Slow Historical Run Opening

After the watcher lifecycle implementation, validation of the packaged Electron build exposed a related release blocker: opening historical run rows can be very slow. Code-path inspection shows this is not caused by live watchers directly; it is caused by historical run hydration eagerly resolving the stored `workspaceRootPath` into a current live `workspaceId` through workspace creation/initialization.

Current path:

```text
openHistoricalRun
-> openAgentRun
-> loadRunContextHydrationPayload
-> ensureWorkspaceByRootPath(workspaceRootPath)
-> workspaceStore.createWorkspace / backend WorkspaceManager.createWorkspace
-> FileSystemWorkspace.initialize
-> buildWorkspaceDirectoryTree(1)
```

Root-cause refinement:

- Historical run viewing is read-only and only needs stored projection/resume/file-change data plus `workspaceRootPath` as metadata.
- Current code treats `workspaceId` as mandatory for historical config hydration, and resolving it goes through initialized workspace state.
- `WorkspaceInfo` mixes workspace identity/metadata with file explorer tree snapshot, making it too heavy for history display.

Durable fix direction in the same ticket:

1. Introduce/use a cheap workspace reference boundary based on canonical `workspaceRootPath` and deterministic `workspaceId` without file tree initialization.
2. Hydrate historical runs with that lazy workspace reference, not by creating/initializing a workspace.
3. Move actual workspace materialization to file-tree-dependent actions: Files, context picker file browsing, and similar. Terminal and resume/rerun use the stored/canonical `workspaceRootPath` directly unless a future runtime path truly needs file-tree state.
4. Missing local paths should not block viewing stored history; they should error only when the user requests current workspace functionality.

## Round 3 Design Refinement: Workspace Identity vs Activation Ambiguity

Architecture review round 3 identified that the same history-open root cause also appears in the shared frontend data model:

- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` were used as if they represented an initialized workspace handle, but history viewing only needs deterministic workspace identity and root-path display metadata.
- Team historical hydration has a separate path that currently builds every member context through `buildTeamMemberContexts()` and calls `ensureWorkspaceByRootPath()` for every member workspace path.

Root-cause refinement:

- The slow history-open symptom is not only a local call-site defect. It is a shared-structure looseness and boundary issue: deterministic workspace identity, initialized workspace payload, and file explorer snapshot were allowed to collapse into `workspaceId`/`WorkspaceInfo` usage.
- The corrected invariant is: `workspaceId` in run/team configs is a stable reference id only; initialized workspace payload belongs to `WorkspaceStore.workspaces`; workspace materialization is explicit at Files/context file-tree action boundaries. Terminal is a root-path/cwd action, not a materialized-workspace action.


## Same-Ticket Release Blocker: Terminal Root-Path Refinement

On 2026-05-23, validation of the latest delivered Electron build exposed the same boundary problem in the Terminal tab. The file explorer and history paths had been separated from eager watcher/materialization behavior, but Terminal still follows the old materialized-workspace path:

```text
Terminal.vue
-> ensureWorkspaceForTerminal()
-> workspaceStore.ensureWorkspaceInitialized(reference)
-> workspaceStore.createWorkspace({ root_path })
-> WorkspaceManager.createWorkspace()
-> FileSystemWorkspace.initialize()
-> /ws/terminal/:workspaceId/:sessionId
-> workspaceManager.getWorkspaceById(workspaceId)
-> TerminalHandler.connect(..., workspace.getBasePath())
```

Root-cause refinement:

- Terminal is a cwd/root-path feature. It needs an authenticated WebSocket, a validated cwd, a session id, and optional session grouping metadata.
- Terminal does not need `WorkspaceInfo.fileExplorer`, a shallow tree, search/index structures, live file explorer streams, or watcher leases.
- The backend route currently requires `workspaceManager.getWorkspaceById(workspaceId)` only to recover cwd, which forces the frontend to materialize an ordinary filesystem workspace before opening Terminal.

Durable same-ticket fix direction:

1. `Terminal.vue` resolves the active/focused `WorkspaceReference` and passes `workspaceReference.workspaceRootPath` to `useTerminalSession`.
2. `useTerminalSession.ts` accepts a root-path terminal target rather than an initialized workspace-id-only target.
3. `api/websocket/terminal.ts` validates/canonicalizes the requested cwd directly and calls the terminal handler with cwd.
4. `TerminalHandler` / `PtySessionManager` start PTY sessions from the validated cwd and do not call workspace materialization or file-explorer APIs.
5. Missing/inaccessible paths fail at Terminal connection time, without blocking historical conversation display or mutating run context.

## Round 5 Root-Cause Refinement: Mobile Terminal And Pending PTY Cleanup

Architecture review round 5 found that the Terminal root-path fix must cover the full Terminal spine, not only the desktop tab:

1. **Mobile Terminal still had the old initialized-workspace gate.** `MobileTools.vue` receives `MobileWorkContext`, but it converts that context into `workspaceFromContext` by reading `workspaceStore.workspaces` or searching `workspaceStore.allWorkspaces`, then renders `<Terminal :workspace-id="terminalWorkspaceId" />`. This keeps mobile Terminal dependent on materialized `WorkspaceInfo` even though `MobileWorkContext` already carries `workspaceRootPath` / `rootPath`.
2. **Terminal WebSocket pending connect had the same lifecycle race as file explorer.** `api/websocket/terminal.ts` assigns `connectedSessionId` only after async `handler.connect()` resolves; a close before that point can return without disconnecting a late-created PTY session/read loop.

Refined root cause:

- The same boundary issue appears in two forms: root-path/cwd features were using materialized workspace identity, and async route cleanup depended on a session id that may not exist yet.
- Watcher/file-descriptor pressure caused the original `spawn EBADF`, but the same durable fix principle applies to PTY sessions: resource lifetime must be owned by the visible/connected consumer boundary, including pending setup and failure windows.

Durable same-ticket fix additions:

1. `MobileTools.vue` derives `TerminalTarget` directly from `MobileWorkContext` and already-hydrated focused member references; it does not look up `WorkspaceInfo` or pass a workspace-id-only Terminal prop.
2. Backend Terminal route registers close/error cleanup before auth/connect, tracks `closed`, `cleanupStarted`, `connectPromise`, `connectedSessionId`, and pending messages, and disconnects late PTY sessions after early close.
3. `TerminalHandler.connect()` / `PtySessionManager` close partial PTY sessions on setup failure before route ownership is established.

## Round 6 Root-Cause Refinement: Workspace Metadata vs FileExplorer Capability

The deeper root cause is now stated more precisely:

- The codebase treats “workspace” as if workspace metadata and file-explorer state are one subject.
- Current backend `FileSystemWorkspace` creates a `LocalFileExplorer` in its constructor, and `WorkspaceManager.createWorkspace()` calls `initialize()`, which builds a shallow tree and creates search/index state.
- Current frontend `WorkspaceInfo` includes `fileExplorer: TreeNode`, so general workspace state is still tree-bearing.
- Runtime/cwd features then accidentally depend on file-explorer initialization when they only need root path metadata.

Correct invariant:

```text
WorkspaceMetadata is the core subject.
FileExplorer is an optional lazy capability of that metadata.
```

Additional durable fix direction:

1. Rename the cheap identity/display shape from `WorkspaceReference` to `WorkspaceMetadata`.
2. Make `createWorkspace()` / `getOrCreateWorkspace()` metadata-only and forbid internal FileExplorer creation there.
3. Collapse `BaseFileExplorer` and `LocalFileExplorer` into a single concrete `FileExplorer` because no alternate filesystem implementation exists.
4. Create/acquire/release FileExplorer only from file-explorer consumers: Files, mobile Files, skill explorer, context browser/search/read/write, and live file-explorer WebSocket.
5. Keep agent runtime, Codex/Claude/AutoByteus cwd resolution, Terminal, history, resume, and rerun on `WorkspaceMetadata.rootPath` only.


## Round 7 Root-Cause Refinement: API Names Were Not The Defect

The final root-cause framing is not that `WorkspaceManager` or `createWorkspace()` are bad API concepts. They are the right product-level boundary: the application does manage workspaces, and callers should be able to create or resolve a workspace by root path.

The defect is that workspace creation currently crosses into FileExplorer ownership:

```text
createWorkspace()
-> FileSystemWorkspace constructor / initialize()
-> FileExplorer tree setup
-> FileNameIndexer/search setup
-> potential watcher/resource pressure
```

Corrected invariant:

```text
Workspace creation is cheap metadata/capability-container creation.
FileExplorer creation is explicit, lazy, and owned by file-explorer consumers.
```

This means the durable fix should preserve the top-level workspace boundary while removing eager implementation side effects. Renaming or replacing `WorkspaceManager` with a separate metadata manager would not address the core ownership issue and could create a new mixed-boundary problem. The important removal is not the workspace API; it is the implicit FileExplorer/index/tree initialization hidden behind workspace creation/list/history/terminal/runtime paths.


## Round 8 Root-Cause Refinement: Tree/Search/Watcher State Needs A File-Explorer Capability Boundary

The final concept separation is now sharper:

```text
WorkspaceMetadata is the workspace identity/root-path subject.
WorkspaceFileExplorer is the lazy capability subject for file browsing/searching/mutation/watching.
WorkspaceFileExplorerTree is the frontend/API projection of loaded tree state.
```

The original architecture blurred these subjects in both directions:

- Backend workspace creation constructed or initialized file-explorer internals.
- Backend search/index state lived under workspace initialization even though it serves file browsing/search.
- Frontend workspace metadata carried `fileExplorer: TreeNode`, so workspace selection/list/history paths inherited tree payload pressure.

Corrected invariant:

```text
A Workspace can own a WorkspaceFileExplorer capability, but Workspace creation does not create it.
WorkspaceFileExplorer owns tree, index/search, file operations, and watchers.
WorkspaceFileExplorerTree is emitted only by file-explorer APIs and stored only in file-explorer frontend state.
```

This refinement avoids two bad outcomes at once:

1. It prevents `Workspace` from remaining bloated with file browsing/search/watcher state.
2. It prevents a new generic `FileExplorer` god-object by allowing internal collaborators under one explicit `WorkspaceFileExplorer` boundary.


## AR-007 Root-Cause Documentation Reconciliation

Architecture review round 6 did not reject the Round 8 architecture. It rejected the design spec as an implementation guide because older final-target sections still contradicted the accepted model. The root cause of that review failure was documentation ambiguity: one artifact contained both the superseded `WorkspaceReference` / `BaseFileExplorer` / tree-bearing `WorkspaceStore` target and the accepted `WorkspaceMetadata` / `WorkspaceFileExplorer` / `WorkspaceFileExplorerTree` target.

The design spec has now been reconciled so the only steady-state target is the Round 8 model. Superseded names are allowed only as current-state evidence or temporary migration aliases, not target architecture.


## Round 9 Root-Cause Refinement: Terminal Manager Cleanup Is Not OS Descriptor Cleanup

`E2E-TERMFD-002` shows a new distinction in the Terminal lifecycle:

```text
PtySessionManager.sessionCount === 0
child process count === 0
```

is not equivalent to:

```text
all Terminal-owned PTY descriptors and revoked handles are released
```

The root cause is a lifecycle acceptance gap: previous design rounds made the route/handler robust against early close and setup failure, but did not explicitly assign descriptor-level cleanup for normal attached command-output sessions. The low-level `TerminalSession` implementation owns node-pty resources, listener disposables, pending reads/timers, kill/wait/destroy ordering, and descriptor release. The server route and handler can request close, but they cannot by themselves prove OS resource cleanup unless the session implementation's close contract is strong and validation measures descriptors.

Correct invariant:

```text
Terminal close is complete only when manager state, read loop state, child process state, and PTY descriptor state are all cleaned up.
```

Durable fix direction:

1. Strengthen the `TerminalSession.close()` / `PtySessionManager.closeSession()` contract to include deep OS-resource cleanup.
2. Ensure normal open/run-command/close paths and early-close/setup-failure paths share the same terminal resource owner and idempotent close semantics.
3. Add descriptor-level built-backend/macOS validation for normal attached command-output churn.
4. If `node-pty` cannot be made descriptor-clean in this runtime, switch or wrap the terminal backend with a descriptor-safe lifecycle rather than relying on fd-limit increases or session-map cleanup.



## Round 10 Root-Cause Refinement: FileExplorer Activity Can Delay Terminal Shell Readiness

The latest user clarification shows Terminal UI first paint is mostly fine: the tab opens and `Connected to Workspace Terminal` appears immediately. The delayed part is the real backend shell output/prompt. Code inspection confirms that the current `Connected to Workspace Terminal` line is written locally by `Terminal.vue` before backend PTY readiness is known.

So the refined root cause is not only large FileExplorer DOM teardown. The stronger issue is lifecycle/resource coordination after Files has been active:

```text
Files active -> file tree/folder refresh + watcher/live session active
Switch to Terminal -> local xterm paints immediately
FileExplorer cleanup/in-flight filesystem work may still be running
Terminal PTY spawn/read loop/first shell output becomes slow
```

Correct invariant:

```text
Terminal shell readiness must be independent from FileExplorer activity, and Terminal UI must distinguish local initialization from backend PTY readiness.
```

Durable fix direction:

1. Keep the desktop Files panel lazy before first use so history/Terminal-first flows still do not mount FileExplorer or acquire watchers.
2. After first Files use, preserve/cache the FileExplorer UI/tree if needed for UI responsiveness, but drive live resources from explicit active/visible state.
3. On Files inactive, release watcher/live session, cancel or suppress late snapshot/search work, and suspend global listeners without allowing cleanup to starve Terminal PTY startup.
4. Add Terminal readiness status: local xterm initialization, WebSocket open, backend PTY ready, and first shell output are separate states. Do not display a local `Connected` line as proof of shell readiness.
5. Keep Terminal mounted/connected only while Terminal is selected so the performance fix does not reintroduce hidden PTY descriptor pressure.
6. Validate the exact symptom by measuring time to backend Terminal ready and first shell output for `Terminal -> Files -> loaded tree/live watcher -> Terminal`, not only time to tab paint.
