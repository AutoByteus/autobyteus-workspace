# File Explorer

## Scope

Workspace filesystem tree traversal, snapshot file operations, search, live WebSocket change streaming, and watcher resource ownership.

## TS Source

- `src/file-explorer`
- `src/file-explorer/watcher`
- `src/services/file-explorer-streaming`
- `src/api/graphql/types/file-explorer.ts`
- `src/api/websocket/file-explorer.ts`

## Snapshot Operations

The following operations are request/response snapshots and must not start or retain a filesystem watcher:

- workspace create/fetch shallow tree snapshots
- `folderChildren`
- `fileContent`
- `searchFiles`
- file create/delete/move/rename/write mutations

File mutations return concrete `FileSystemChangeEvent` payloads so the frontend can apply the result immediately. If a live WebSocket stream is also open, the frontend filters the later self-echo from the stream.

Search refreshes its file-name index from snapshot traversal (`getAllFilePaths`) and backend search strategies such as `FuzzysortSearchStrategy` and `RipgrepSearchStrategy`; search must not depend on an always-on watcher.

## Live WebSocket Watcher Lifecycle

Live filesystem changes are served by `/ws/file-explorer/{workspaceId}`. The route resolves the workspace, obtains the workspace file explorer, and delegates to `FileExplorerStreamHandler`.

The handler must acquire a watcher lease before subscribing:

1. `FileExplorerStreamHandler.connect()` calls `BaseFileExplorer.acquireWatcherLease("file-explorer-websocket")`.
2. `LocalFileExplorer` increments its watcher lease count and starts the underlying `FileSystemWatcher` only when the first lease needs it.
3. A `FileExplorerSession` owns the async event iterator and the watcher lease.
4. Disconnecting the WebSocket, ending the event iterator, early-closing during setup, or closing the workspace closes the session and releases the lease.
5. When the lease count reaches zero, `LocalFileExplorer` stops the chokidar watcher.

Multiple WebSocket sessions for the same workspace share one underlying watcher through lease counting. Releasing one session must not stop the watcher while another session still has an active lease.

`LocalFileExplorer.subscribe()` is valid only while a watcher lease has started the watcher. Callers that need live events must acquire a lease first; snapshot callers must not subscribe.

## Resource-Safety Invariants

- Live watchers are visible-consumer driven, not workspace-cache driven.
- Snapshot GraphQL operations remain watcher-free.
- Session close and async iterator cancellation release the watcher lease exactly once.
- Repeated open/close and early-close WebSocket cycles must not leak watcher leases or file descriptors.
- Codex app-server spawn diagnostics include command, cwd, arguments, error code, open file descriptor count when available, and a descriptor-pressure hint for `EBADF`, `EMFILE`, and `ENFILE`.

## Durable Validation

The durable E2E regression for this lifecycle is:

- `tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`

It exercises real Fastify WebSockets, real workspace/file-explorer objects, real chokidar filesystem events, snapshot operations that stay watcher-free, shared watcher leases across concurrent visible sessions, repeated open/close cycles, early close handling, descriptor sampling, and child-process spawn health.
