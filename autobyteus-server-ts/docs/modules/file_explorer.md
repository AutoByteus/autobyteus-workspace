# File Explorer

## Scope

Workspace filesystem tree traversal, snapshot file operations, search, live WebSocket change streaming, and watcher resource ownership.

## TS Source

- `src/file-explorer`
- `src/file-explorer/watcher`
- `src/file-explorer/watcher/runtime`
- `src/file-explorer/search-snapshot`
- `src/services/file-explorer-streaming`
- `src/api/graphql/graphql-request-context.ts`
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

Search refreshes its file-name index through `WorkspaceSearchSnapshotController`: `buildWorkspaceDirectoryTree` loads the snapshot, then `FileNameIndexer.refreshSnapshotIndex` traverses `getTree`. Backend strategies such as `FuzzysortSearchStrategy` and `RipgrepSearchStrategy` return internal absolute filesystem candidates. The public `WorkspaceFileExplorer.searchFiles` boundary converts and validates these once against the workspace root, returning workspace-relative locators in the same convention as tree paths. GraphQL `searchFiles(workspaceId, query)` returns those locators unchanged; they can be used directly with workspace text and protected content readers, including for nested files whose folders are not expanded. Ordering is preserved; absolute and escaping inputs remain rejected by the readers.

Search must not depend on an always-on watcher. GraphQL request abort/close is propagated into `WorkspaceSearchSnapshotController`, which cancels a caller's wait on refresh/search work and aborts an unshared refresh when the final waiter leaves. Closing the workspace/file explorer also aborts stale search snapshot refresh work so watcher/session cleanup does not wait for unrelated full-tree traversal.

## Path And Ignored-Folder Boundaries

All snapshot and mutation APIs resolve caller-supplied paths against the
workspace root before touching the filesystem or mutating cached tree state.
Requests that resolve outside the workspace are rejected even when the escaped
path is a same-prefix sibling of the workspace directory.

Boundary expectations:

- `folderChildren` rejects ignored folders such as `.git`, `node_modules`, and
  `.gitignore`-matched folders without projecting them into the cached tree.
- `folderChildren`, `fileContent`, and `writeFileContent` reject `..` traversal
  or same-prefix sibling escapes before returning or writing external content.
- `fileContent` answers the file's exact text, so a refusal is never text: it is a
  GraphQL error whose `extensions.code` says why (autobyteus-579): `WORKSPACE_NOT_FOUND`,
  `FILE_NOT_FOUND`, `WORKSPACE_ACCESS_REFUSED` (a path outside the workspace),
  `FILE_PERMISSION_DENIED`, the workspace's own access codes such as
  `WORKSPACE_LINK_NOT_OPENED`, and `FILE_READ_FAILED` (an unexpected error: a generic
  message, the cause logged). A file whose own text is `{"error":…}` is therefore a
  file like any other. `folderChildren` still answers its refusals as JSON.
- `renameFileOrFolder` accepts only a leaf `newName`; path-like names are
  rejected before any filesystem rename is attempted.
- Rejected boundary operations remain snapshot-only and must not start a live
  watcher lease.

## Read-Only And Link-Aware Workspaces

Two workspace properties drive the explorer; the explorer never decides them
itself (autobyteus-554; the Memory page's semantic memory view, a
`SemanticMemoryWorkspace`, is the one workspace that sets them, see
[Workspaces](./workspaces.md#semantic-memory-workspaces)). Every other workspace
keeps the defaults and today's behavior.

- `readOnly` (default false): every file-explorer GraphQL mutation (write,
  create, rename, move, delete) resolves the workspace through
  `resolveWritableWorkspace` and is refused `WORKSPACE_READ_ONLY` before the file
  explorer or any file is touched (`FileSystemWorkspace.assertWritable`).
- `followSymbolicLinks` (default true): when false, the explorer
  (`WorkspaceFileExplorer` with `{ followSymbolicLinks: false }`) classifies
  entries by `lstat` (`classifyEntryWithoutFollowingLinks`): a folder, a regular
  file, or a link, which becomes a leaf `TreeNode` with `isSymbolicLink = true`
  (JSON `is_symbolic_link`; `is_file: false`, children loaded) and is never
  entered; any other entry (socket, FIFO, device) is skipped. `folderChildren`,
  `fileContent` and the workspace content and static routes refuse a path with a
  link anywhere on it, from the root down (`assertNoSymbolicLinkOnPath`,
  `WORKSPACE_LINK_NOT_OPENED`; the REST routes answer 403 with the code), so a
  file is only ever read inside the root. The whole-tree traversal behind the
  file-name search does not enter links either, and `rg --files` does not follow
  them (its default). The watcher runtime is started with chokidar
  `followSymlinks: false`, so a change inside a linked folder's target never
  reaches the tree. A link created while the view is open arrives as an ordinary
  add event (a file row) until the folder is read again; opening it is refused.
- The refusals carry the code at the start of the message
  (`WorkspaceAccessError`, `src/workspaces/workspace-access-error.ts`), so the
  GraphQL error, the JSON error string and the REST body all name it.

## Live WebSocket Watcher Lifecycle

Live filesystem changes are served by `/ws/file-explorer/{workspaceId}`. The route resolves the workspace, obtains the workspace file explorer, and delegates to `FileExplorerStreamHandler`.

The handler must acquire a watcher lease before subscribing:

1. `FileExplorerStreamHandler.connect()` calls `BaseFileExplorer.acquireWatcherLease("file-explorer-websocket")`.
2. `LocalFileExplorer` increments its watcher lease count and starts the underlying `FileSystemWatcher` only when the first lease needs it.
3. A `FileExplorerSession` owns the async event iterator and the watcher lease.
4. Disconnecting the WebSocket, ending the event iterator, early-closing during setup, or closing the workspace closes the session and releases the lease.
5. When the lease count reaches zero, `WorkspaceFileExplorer` logically stops the watcher in the backend parent process and asks the watcher runtime child process to stop its native watcher.

Multiple WebSocket sessions for the same workspace share one underlying watcher through lease counting. Releasing one session must not stop the watcher while another session still has an active lease.

`WorkspaceFileExplorer.subscribe()` is valid only while a watcher lease has started the watcher. Callers that need live events must acquire a lease first; snapshot callers must not subscribe.

### Content-change events (`modify`)

A client must be able to refresh an open file whatever its tree has loaded (autobyteus-452).

- `watchdog-handler` sends `modify` with the file's workspace-relative `path` (POSIX separators) for:
  - a file `change`, whether or not the path is in the tree;
  - a file `add`, after the structural `add`;
  - a file move, after the structural move: the watcher pairs a temp file's unlink with the add at its final path, so an atomic rewrite arrives as a move.
- Clients use `modify` only to reload a file they have open. They ignore other paths, so a burst of changes causes no reads.

## Watcher Runtime Isolation

The backend parent process owns File Explorer tree state, watcher leases, event subscribers, path validation, ignored-path policy, search, and mutation echo suppression. It does **not** own native chokidar watcher lifecycle directly.

`FileSystemWatcher` creates a `WatcherRuntimeClient` for each active watcher generation. The client forks `src/file-explorer/watcher/runtime/watcher-runtime-process.ts`, sends a `start` command with `{ watcherId, generation, workspaceRootPath, followSymbolicLinks }`, and receives raw add/change/unlink events over IPC. Only the runtime adapter (`chokidar-watcher-runtime.ts`) imports and closes chokidar.

Important runtime-boundary rules:

- Parent watcher stop is logical and bounded: clear subscribers and pending timers, detach the current runtime identity, send a child `stop` command, arm the force-kill timer, and return without waiting for physical chokidar close.
- The child process owns physical chokidar close and exits on normal stop, parent IPC disconnect, or parent force kill after timeout.
- Every IPC message carries watcher identity (`watcherId`, `generation`). Parent code ignores stale ready/raw-event/error/stopped messages after close or restart.
- Runtime errors and event queue overflow fail-close the WebSocket stream; clients reconnect and refresh a snapshot rather than continuing from uncertain event state.
- Production code must not add an in-process chokidar fallback for this replaced path, because that would reintroduce backend event-loop blocking during large watcher close.

## Resource-Safety Invariants

- Live watchers are visible-consumer driven, not workspace-cache driven.
- Snapshot GraphQL operations remain watcher-free.
- Session close and async iterator cancellation release the watcher lease exactly once, even when stream setup fails or a client disconnects early.
- Repeated open/close and early-close WebSocket cycles must not leak watcher leases, runtime child processes, or file descriptors.
- Watcher generation identity prevents stale child events from mutating current File Explorer state after logical close/restart.
- `EventBatcher` and subscriber queues are bounded; overflow is treated as a stream error requiring reconnect/snapshot refresh.
- Codex app-server spawn diagnostics include command, cwd, arguments, error code, open file descriptor count when available, and a descriptor-pressure hint for `EBADF`, `EMFILE`, and `ENFILE`.

## Durable Validation

The durable E2E regression for this lifecycle is:

- `tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
- `tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts`
- `tests/integration/file-explorer/file-system-watcher.integration.test.ts`
- `tests/unit/file-explorer/file-system-watcher-runtime.test.ts`
- `tests/unit/file-explorer/workspace-search-snapshot-controller.test.ts`
- `tests/unit/file-explorer/watcher-runtime-protocol.test.ts`

It exercises real Fastify WebSockets, real workspace/file-explorer objects, real chokidar filesystem events through the child runtime, snapshot operations that stay watcher-free, shared watcher leases across concurrent visible sessions, repeated open/close cycles, early close handling, descriptor sampling, child-process spawn health, logical-stop behavior, stale-generation rejection, bounded event batching, and abortable search snapshot refresh.

The path-boundary E2E covers ignored-folder projection rejection, same-prefix
sibling escape rejection for folder/read/write APIs, path-like rename
rejection, and the invariant that those rejected snapshot operations do not
start watcher leases or mutate cached tree state.

### Search-to-content regression

`tests/e2e/file-explorer/search-content-http.e2e.test.ts` joins real GraphQL
search results to the protected REST content route using the actual workspace
path owner. It checks relative PDF/text locators, exact PDF bytes and MIME,
and the existing absolute, traversal, and sibling-escape denials. Its PDF
fixture is shared with the browser probe at
`test-support/file-explorer/resume-preview.pdf`.

The browser journey is discoverable from the workspace root with
`pnpm -C autobyteus-web test:e2e:search-pdf-preview --output-dir <fresh-directory>`.
Read the probe header for build prerequisites and isolation. It owns a current
backend, Nuxt host and browser; it searches, selects a previously unloaded PDF,
asserts rendered pages, and checks tree/text identity and HTTP denials. This is
web-equivalent Files coverage, not deployed-build or user-verification evidence.

For full packaged product validation, use a current isolated desktop instance
and scenario-specific UI assertions. See the
[Linux isolated-instance guide](../../../docs/isolated-app-instances.md#linux)
for current native-build, non-root, sandbox and whole-session display setup.
Agent-owned validation does not substitute for target rollout or explicit user
acceptance.
