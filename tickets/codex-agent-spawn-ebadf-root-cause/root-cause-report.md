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
3. Move actual workspace activation to workspace-dependent actions: Files, Terminal, resume/rerun, context picker, and similar.
4. Missing local paths should not block viewing stored history; they should error only when the user requests current workspace functionality.

## Round 3 Design Refinement: Workspace Identity vs Activation Ambiguity

Architecture review round 3 identified that the same history-open root cause also appears in the shared frontend data model:

- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` were used as if they represented an initialized workspace handle, but history viewing only needs deterministic workspace identity and root-path display metadata.
- Team historical hydration has a separate path that currently builds every member context through `buildTeamMemberContexts()` and calls `ensureWorkspaceByRootPath()` for every member workspace path.

Root-cause refinement:

- The slow history-open symptom is not only a local call-site defect. It is a shared-structure looseness and boundary issue: deterministic workspace identity, initialized workspace payload, and file explorer snapshot were allowed to collapse into `workspaceId`/`WorkspaceInfo` usage.
- The corrected invariant is: `workspaceId` in run/team configs is a stable reference id only; initialized workspace payload belongs to `WorkspaceStore.workspaces`; workspace activation is explicit at Files/Terminal/context or other workspace-dependent action boundaries.
