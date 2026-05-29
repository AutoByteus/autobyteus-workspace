# Design Spec

Ticket: `file-explorer-performance-analysis`
Authoritative workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis`
Date: 2026-05-29
Requirements basis: `tickets/in-progress/file-explorer-performance-analysis/requirements.md` (`Refined`, user-approved on 2026-05-29; scope clarified on 2026-05-29)
Investigation basis: `tickets/in-progress/file-explorer-performance-analysis/investigation-notes.md`

## Current-State Read

The current backend File Explorer watcher is demand-driven but the original implementation was not runtime-isolated:

- `FileExplorer.vue` activates the live File Explorer stream only when Files is active.
- `FileExplorerStreamingService.connect()` opens `/ws/file-explorer/:workspaceId`.
- `FileExplorerStreamHandler.connect()` acquires a `WorkspaceFileExplorer` lease and a watcher lease.
- `WorkspaceFileExplorer.acquireWatcherLease()` starts `FileSystemWatcher` when the first live consumer arrives.
- The old `FileSystemWatcher.start()` called `chokidar.watch(...)` directly in the backend Node process.
- The old `FileSystemWatcher.stop()` detached subscribers/timers and awaited `watcher.close()` in that same backend Node process.

The Terminal backend is separate code and does not call File Explorer APIs:

- `/ws/terminal/:sessionId` resolves cwd, then calls `TerminalHandler.connect()`.
- `PtySessionManager.createSession()` starts a PTY session.
- On macOS the default PTY backend is already `IsolatedPtySession`, a helper child process.

The reproduced Files -> Terminal delay was indirect shared-backend interference. Instrumentation showed:

- The frontend created the Terminal WebSocket immediately when switching tabs.
- Backend Terminal route acceptance happened only after File Explorer watcher close finished.
- The watcher had `1670` watched directories, `9847` watched entries, `9847` chokidar closer functions, and `9847` active `FSWatcher` handles.
- `watcher.close()` itself took about `21.36s` synchronously before returning its promise; awaiting the returned promise took only about `3ms`.
- A zero-delay backend timer did not fire during the close loop, proving backend parent event-loop starvation.

Current ownership constraints that must remain true:

- `WorkspaceFileExplorer` is the authoritative owner for File Explorer tree state, watcher lease count, file operations, path validation, search/index lifecycle, ignored-path policy gates, mutation echo suppression, and event subscribers.
- The File Explorer stream/session classes own WebSocket/session lifecycle for live clients.
- Terminal remains independent of File Explorer. The fix removes shared event-loop interference rather than adding Terminal/File Explorer coupling.
- Chokidar remains an acceptable Node watcher implementation. The defect is letting large native chokidar lifecycle work run on the backend parent event loop.

## Scope Simplification — 2026-05-29

The prior `VAL-FE-006` expansion into semantic event reconciliation is removed from this ticket by user direction.

Rationale:

- The root-cause evidence points to watcher physical shutdown blocking the backend event loop, not to frontend event volume.
- The watcher already applies workspace ignore policy, including `.gitignore`, `.git`, `node_modules`, build output, `dist`, and other ignored folders. Real delivered events should therefore be much lower than raw filesystem churn in ignored areas.
- Adding a full event semantic subsystem would increase architecture, implementation, and validation scope without evidence that it solves the reported Files -> Terminal delay.

Target event-delivery stance for this ticket:

- Keep the existing lightweight `EventBatcher` / bounded queue shape.
- Preserve existing `FILE_SYSTEM_CHANGE` semantics and frontend apply path.
- On queue overflow or stream failure, close the stream and rely on the durable reconnect/snapshot refresh path.
- Do **not** add targeted invalidation, resync-required message types, filesystem identity trackers, stale-scope registries, or new watcher-derived move/rename proofing in this ticket.

A future semantic coalescing/reconciliation feature can be designed separately if profiling later proves real non-ignored event storms are a product problem.

## Intended Change

Move native chokidar lifecycle behind a dedicated child-process watcher runtime while keeping File Explorer authority in the backend parent process.

Target live event shape:

```text
Frontend Files tab
  -> File Explorer WebSocket
  -> FileExplorerSession
  -> WorkspaceFileExplorer.acquireWatcherLease()
  -> FileSystemWatcher parent controller
  -> WatcherRuntimeClient / child process IPC
  -> watcher child process owns chokidar
  -> raw watch events over IPC
  -> FileSystemWatcher validates generation, suppression, and ignore policy
  -> existing WatchdogHandler applies tree event semantics
  -> existing EventBatcher creates short-window composite FILE_SYSTEM_CHANGE payloads
  -> frontend File Explorer store
```

When the user switches Files -> Terminal:

```text
Files inactive
  -> FileExplorerSession.close()
  -> watcher lease release
  -> FileSystemWatcher.stop() logical close in parent
     - detach subscribers
     - clear pending unlink/move timers
     - mark generation closed
     - send child stop/shutdown command
     - arm force-kill timeout through WatcherRuntimeClient
     - return without awaiting physical chokidar.close()
  -> backend parent event loop remains available
  -> Terminal WebSocket route can be accepted and PTY started normally
  -> watcher child may continue/finish/force-exit without blocking parent
```

This is a clean-cut replacement of the production in-process chokidar path. There must be no production fallback that directly creates chokidar in the backend parent process for live workspace File Explorer watching.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Performance bug fix plus targeted runtime-boundary refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes for native watcher lifecycle; no new design issue is proven for event semantic reconciliation within this ticket.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue with a Missing Invariant.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes for watcher runtime isolation and close/search safeguards. Semantic event reconciliation is deferred/removed.
- Evidence:
  - The old `FileSystemWatcher` imported and closed chokidar in the backend parent process.
  - Runtime timing proved `watcher.close()` synchronously blocked the parent event loop for about `21.36s` in the target workspace.
  - Terminal route acceptance was serialized behind that close; PTY startup after acceptance was fast.
  - Worker threads would isolate JavaScript event loops but would still share the process file descriptor table; child process isolation addresses both event-loop blocking and descriptor-pressure blast radius.
  - There is no comparable evidence that filtered File Explorer event volume is the cause of the reported symptom.
- Design response:
  - Keep `WorkspaceFileExplorer` as the authoritative File Explorer owner.
  - Make `FileSystemWatcher` a parent-side controller that owns runtime generation validation, mutation-suppression pre-filtering, existing event handling, subscriber queues, and dispatch.
  - Move native chokidar start/close/raw-event collection into a child process reached through `WatcherRuntimeClient` and an explicit IPC protocol.
  - Make parent watcher stop a logical, idempotent, fast operation; physical close is child-owned and observed asynchronously.
  - Keep event delivery simple: existing batching, existing change stream, bounded queue/close/reconnect safety.
- Refactor rationale:
  - A local timeout, idle debounce, or extra logging would not remove the confirmed event-loop-blocking call from the parent process.
  - Moving the whole File Explorer tree into a child would create a second source of truth and a much larger risky rewrite.
  - The minimal correct boundary is native watcher runtime isolation, not full File Explorer process isolation.
- Intentional deferrals and residual risk:
  - Frontend Web Worker model projection is deferred until browser profiling proves frontend main-thread File Explorer work is a material bottleneck.
  - Semantic event reconciliation/targeted invalidation is deferred until event-volume profiling proves it is needed.
  - Replacing chokidar is out of scope. Chokidar remains the native watcher adapter inside the child.

## Terminology

- `WorkspaceFileExplorer`: parent-process domain owner for one workspace File Explorer.
- `FileSystemWatcher`: parent-process watcher controller. After this change it is not the native chokidar owner.
- `WatcherRuntimeClient`: parent-process child-process/IPC owner for one active watcher runtime.
- `watcher child process`: child Node process that owns chokidar and sends raw watcher messages to the parent.
- `watcher generation`: monotonically increasing identity for one logical watcher runtime start. Parent accepts messages only from the current generation.
- `logical close`: parent-side quiescence and lifecycle close; must be fast and idempotent.
- `physical close`: child-side `chokidar.close()` and process shutdown; may be slow and must not block parent.
- `EventBatcher`: existing lightweight short-window composite change helper; it is not a semantic reconciliation owner.

## Design Reading Order

1. Data-flow spine and ownership.
2. Parent/child watcher runtime boundary.
3. Search-close and simple event-delivery safeguards around that boundary.
4. Concrete file and folder mapping.
5. Migration, removals, and validation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy native-watcher execution path.`
- Required action: remove/decommission the in-process chokidar production path from parent `FileSystemWatcher`.
- Investigation-only chokidar private-internal instrumentation must not remain as production logic.
- Do not add a production feature flag that switches between old in-process chokidar and new child-process chokidar. Test fakes are allowed only as injected unit-test doubles.
- Do not add the previously proposed event-reconciliation subsystem in this ticket; it is removed scope, not legacy to preserve.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Files tab live activation | Native watcher ready | `WorkspaceFileExplorer` | Establishes demand-driven live watcher startup without moving tree authority. |
| DS-002 | Return-Event | OS/chokidar raw event in child | Frontend File Explorer store update | `FileSystemWatcher` parent controller | Shows how raw child events become existing parent tree changes and frontend updates. |
| DS-003 | Primary End-to-End | Files tab inactive/session close | Parent logical watcher close complete | `WorkspaceFileExplorer` | The hot path that must stop blocking Terminal. |
| DS-004 | Bounded Local | Parent stop command | Child physical chokidar close/process exit | `WatcherRuntimeClient` | Makes slow physical close asynchronous and killable. |
| DS-005 | Primary End-to-End | User switches Files -> Terminal | Terminal first PTY output | `TerminalHandler` for Terminal, with File Explorer no longer blocking parent event loop | Validates the user-visible symptom. |
| DS-006 | Bounded Local | Search request or close | Search snapshot refresh complete/aborted/detached | `WorkspaceSearchSnapshotController` | Prevents unrelated search traversal/index work from blocking File Explorer close. |
| DS-007 | Bounded Local | Parent change events for subscribers | Short-window composite `FILE_SYSTEM_CHANGE` or stream close/error | `EventBatcher` under `FileSystemWatcher` | Keeps current event delivery lightweight and bounded without expanding into semantic reconciliation. |

## Primary Execution Spine(s)

### DS-001: Live watcher startup

`FileExplorer.vue active -> FileExplorerStreamingService -> /ws/file-explorer -> FileExplorerStreamHandler -> WorkspaceFileExplorer.acquireWatcherLease() -> FileSystemWatcher parent controller -> WatcherRuntimeClient -> watcher child process -> chokidar.watch(...) -> ready IPC -> CONNECTED message`

### DS-003: Files close / watcher release

`FileExplorer.vue inactive -> FileExplorerSession.close() -> WatcherLease.release() -> WorkspaceFileExplorer.releaseWatcherLease() -> FileSystemWatcher.stop() logical close -> WatcherRuntimeClient.requestStop() -> parent returns`

### DS-005: Files -> Terminal switch after fix

`UI tab switch -> File Explorer logical release returns quickly -> /ws/terminal route accepted in backend parent -> TerminalHandler.connect() -> PtySessionManager -> IsolatedPtySession helper -> first PTY stdout -> frontend terminal prompt`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A live File Explorer consumer starts the watcher through the existing lease path. The parent creates a child runtime and waits asynchronously for `ready`; chokidar startup happens in the child. | `FileExplorerStreamHandler`, `WorkspaceFileExplorer`, `FileSystemWatcher`, `WatcherRuntimeClient`, child chokidar runtime | `WorkspaceFileExplorer` | Auth, workspace lookup, ignore matcher creation, lifecycle diagnostics. |
| DS-002 | Chokidar emits raw filesystem events in the child. IPC messages carry watcher/generation identity. The parent validates current generation, applies suppression and ignore checks, runs existing `WatchdogHandler` semantics, and emits existing `FILE_SYSTEM_CHANGE` payloads through the current batching path. | Child chokidar runtime, `WatcherRuntimeClient`, `FileSystemWatcher`, `WatchdogHandler`, `EventBatcher`, `FileExplorerSession` | `FileSystemWatcher` | IPC validation, stale-message rejection, bounded subscriber queues, existing composite batching. |
| DS-003 | Closing the live session releases the last watcher lease. The parent watcher quiesces subscribers and timers, marks the generation closed, sends stop to the child, arms force-kill cleanup, and returns without waiting for child `chokidar.close()`. | `FileExplorerSession`, `WorkspaceFileExplorer`, `FileSystemWatcher`, `WatcherRuntimeClient` | `WorkspaceFileExplorer` | Idempotent close, child cleanup telemetry, stale message rejection. |
| DS-004 | The child receives a stop/shutdown command and calls `watcher.close()` inside the child process. It may report `stopped`; if it does not, parent timeout kills it. | `WatcherRuntimeClient`, child runtime, chokidar | `WatcherRuntimeClient` | Timeout policy, process exit/error handling, stdout/stderr logging. |
| DS-005 | Terminal starts through its existing route. The fix is successful when Terminal route acceptance and PTY startup are no longer serialized behind File Explorer physical close. | Terminal route, `TerminalHandler`, `PtySessionManager`, `IsolatedPtySession` | `TerminalHandler` | Timing validation only; no Terminal/File Explorer dependency. |
| DS-006 | Search snapshot refresh can be aborted or detached when the workspace closes so it cannot hold the close path. | GraphQL resolver, `WorkspaceFileExplorer`, `WorkspaceSearchSnapshotController`, `DirectoryTraversal`, `FileNameIndexer` | `WorkspaceSearchSnapshotController` | Abort-signal propagation, generation guard, stale snapshot rejection. |
| DS-007 | Subscriber event delivery uses the existing short batch window and bounded queue. The batcher combines existing change payloads; it does not infer filesystem semantics. Overflow/failure closes the stream and the frontend reconnects/refreshes. | `FileSystemWatcher`, `EventBatcher`, `FileExplorerSession`, frontend live actions | `FileSystemWatcher` for event production; `FileExplorerSession` for session forwarding | Queue high-water behavior, reconnect snapshot refresh, no new protocol types. |

## Spine Actors / Main-Line Nodes

- `FileExplorer.vue`: frontend activation boundary for live File Explorer work.
- `FileExplorerStreamingService`: browser-side WebSocket client; not a runtime owner.
- `FileExplorerStreamHandler`: backend WebSocket/session connection owner.
- `FileExplorerSession`: per-live-session lifecycle owner and event-forwarding owner.
- `WorkspaceFileExplorer`: authoritative File Explorer domain owner.
- `FileSystemWatcher`: parent-process watcher controller and existing event application owner.
- `WatcherRuntimeClient`: parent IPC/process lifecycle owner for the child watcher runtime.
- `watcher-runtime-process.ts` / `ChokidarWatcherRuntime`: child-side native watcher owner.
- `WatchdogHandler`: existing parent-side adapter from watcher raw events into File Explorer tree changes.
- `EventBatcher`: existing lightweight composite change batching helper.
- `TerminalHandler` / `PtySessionManager`: Terminal startup owners, unchanged except validation diagnostics if needed.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `WorkspaceFileExplorer` | File Explorer lifecycle, tree, search owner reference, watcher lease count, file operations, path validation, mutation echo suppression, subscriber entrypoint. | Native chokidar handles after this change; child process lifecycle details. |
| `FileSystemWatcher` | Parent-side watcher runtime state, current generation, subscribers, mutation-suppression paths, pending unlink timers, existing `WatchdogHandler` event path, and dispatch to subscriber queues. | Native chokidar construction/close; child process spawn details; WebSocket serialization. |
| `WatcherRuntimeClient` | Child process spawn, IPC command send, message validation, ready promise, stop command, background close observation, force-kill timeout, process logging. | File tree mutation, file operation semantics, search. |
| `ChokidarWatcherRuntime` | Chokidar watch options, native watcher start/ready/raw events/error/close inside child. | Workspace tree state, subscriber queues, frontend messages. |
| `WorkspaceSearchSnapshotController` | Search strategy/index construction, refresh task, abort/generation, stale result rejection. | Watcher leases, native watcher lifecycle. |
| `WatchdogHandler` | Existing conversion of add/delete/move/modify watcher events into File Explorer tree changes and serialized change payloads. | Child process lifecycle; batching/reconnect policy; search. |
| `EventBatcher` | Short-window composite batching of already-produced change payloads and bounded collector error on overflow. | Filesystem semantic reconciliation, invalidation decisions, tree mutation ownership. |
| `FileExplorerSession` | Per-session lifecycle and forwarding existing watcher stream messages to the socket. | Reconciliation semantics or tree mutation. |
| `TerminalHandler` | Terminal session creation and output streaming. | Any File Explorer cleanup coordination. |

A public facade may remain thin. In particular, `FileExplorerStreamHandler` is a connection/session entry owner, not the deep watcher runtime owner. It must call `WorkspaceFileExplorer` rather than directly reaching into `FileSystemWatcher` or `WatcherRuntimeClient`.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `/ws/file-explorer/:workspaceId` route | `FileExplorerStreamHandler` / `WorkspaceFileExplorer` | Transport auth and socket adaptation. | Watcher runtime process details. |
| `FileExplorerStreamingService` | Frontend workspace File Explorer store/actions | Browser WebSocket abstraction. | Authoritative client tree model beyond existing store behavior. |
| `WorkspaceFileExplorer.subscribe()` | `FileSystemWatcher` | Domain-level event subscription boundary. | Direct child IPC or chokidar access. |
| `/ws/terminal/:sessionId` route | `TerminalHandler` | Terminal transport boundary. | File Explorer close coordination. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Direct `chokidar` import/use in parent `file-system-watcher.ts` | Confirmed parent event-loop blocking root cause. | Child `ChokidarWatcherRuntime` behind `WatcherRuntimeClient`. | In This Change | Parent `FileSystemWatcher` keeps name/public role but becomes controller only. |
| Parent `await watcher.close()` hot path | Serializes Terminal and other backend work behind physical native close. | Logical parent close + child background close/kill timeout. | In This Change | Parent may await only fast IPC send/marking, not child stopped. |
| Investigation-only private chokidar `_closers` monkey-patching | It was for root-cause proof and depends on private internals. | Durable lifecycle diagnostics through protocol and public `getWatched()` counts. | In This Change | Do not ship private chokidar instrumentation. |
| Production in-process chokidar fallback flag | Would preserve the known bad path. | Clean child-runtime production path. | In This Change | Unit-test fakes are allowed through injected runtime client registry. |
| Synchronous close dependence on search snapshot refresh | Can keep File Explorer close waiting on unrelated traversal/indexing. | Abortable/detached `WorkspaceSearchSnapshotController` with generation guard. | In This Change | Close path must not wait for long refresh. |
| Prior semantic event-reconciliation proposal | It expanded scope beyond the proven root cause. | Existing `EventBatcher` + bounded queue + reconnect snapshot refresh. | Removed From This Change | No targeted invalidation/resync protocol in this ticket. |

## Subsystems / Capability Areas

| Capability / Subsystem | Current Home | Target Posture | Reason |
| --- | --- | --- | --- |
| File Explorer domain | `autobyteus-server-ts/src/file-explorer/*` | Extend | Keep authoritative tree/search/file-operation ownership in parent. |
| Watcher runtime process | `autobyteus-server-ts/src/file-explorer/watcher/runtime/*` | Create/Extend | New child-process native watcher boundary. |
| File Explorer streaming | `autobyteus-server-ts/src/services/file-explorer-streaming/*` | Extend minimally | Preserve session lifecycle and reconnect semantics; no new semantic event types. |
| Search snapshot/index | `autobyteus-server-ts/src/file-explorer/search-snapshot/*` | Create/Extend | Give search refresh cancellation/detachment a focused owner. |
| Frontend workspace store/live actions | `autobyteus-web/stores/*` | Extend minimally | Preserve reconnect/snapshot refresh on stream close/error. |

## File / Folder Responsibility Mapping

| Path | Owner / Role | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | `WorkspaceFileExplorer` | Watcher leases, close/dispose, search owner integration, path validation, file operations, subscriber boundary. |
| `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | Parent watcher controller | Generation identity, runtime client lifecycle, suppression, pending unlink timers, `WatchdogHandler` event path, subscriber queues, logical stop. Must not import chokidar. |
| `autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts` | Existing watcher-event adapter | Existing add/delete/move/modify tree-change behavior and serialized change generation. |
| `autobyteus-server-ts/src/file-explorer/watcher/event-batcher.ts` | Lightweight event batching | Preserve existing short-window composite batching and bounded collector overflow behavior. No semantic reconciliation. |
| `autobyteus-server-ts/src/file-explorer/watcher/runtime/watcher-runtime-protocol.ts` | IPC protocol types | `start`, `stop`, `ready`, `rawEvent`, `error`, `stopped` message shapes with watcher/generation identity and diagnostics. |
| `autobyteus-server-ts/src/file-explorer/watcher/runtime/watcher-runtime-client.ts` | Parent runtime client | Spawn/start/stop child process, validate messages, observe background close, force-kill timeout, report diagnostics. |
| `autobyteus-server-ts/src/file-explorer/watcher/runtime/watcher-runtime-process-registry.ts` | Runtime client factory | Production child runtime factory and unit-test fake injection seam. |
| `autobyteus-server-ts/src/file-explorer/watcher/runtime/watcher-runtime-process.ts` | Child process wrapper | Wire process IPC/stdout/stderr/exit to runtime client. |
| `autobyteus-server-ts/src/file-explorer/watcher/runtime/watcher-runtime-entrypoint.ts` | Child process entrypoint | Node entrypoint launched by built/dev backend. |
| `autobyteus-server-ts/src/file-explorer/watcher/runtime/chokidar-watcher-runtime.ts` | Child native watcher | Create chokidar watcher, apply workspace ignore strategy, send ready/raw/error/stopped messages, close chokidar inside child. |
| `autobyteus-server-ts/src/file-explorer/watcher/runtime/watcher-runtime-diagnostics.ts` | Diagnostics | Structured timing/count helpers for watcher start/stop/kill/raw-event spans. |
| `autobyteus-server-ts/src/file-explorer/search-snapshot/workspace-search-snapshot-controller.ts` | Search refresh owner | Abortable/detached traversal/index refresh, generation guards, stale commit rejection. |
| `autobyteus-server-ts/src/file-explorer/directory-traversal.ts` | Traversal | Accept abort signal and stop traversal promptly when requested. |
| `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | Search index | Cooperate with abort/generation flow. |
| `autobyteus-server-ts/src/api/graphql/graphql-request-context.ts` | GraphQL request context | Propagate client abort signal to resolvers. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | GraphQL File Explorer resolvers | Pass abort signal into `WorkspaceFileExplorer.searchFiles`. |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts` | Session lifecycle | Acquire/release watcher lease, forward existing event stream, close cleanly. |
| `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts` | Frontend live actions | Preserve reconnect/snapshot refresh on stream close/error. No targeted invalidation handling in this ticket. |
| `autobyteus-web/stores/__tests__/workspaceStore.reconnect-resync.spec.ts` | Frontend durable regression | Validate reconnect/resync after stream close/error. |

## Dependency Rules And Forbidden Shortcuts

Allowed:

- `WorkspaceFileExplorer -> FileSystemWatcher` for live watcher lease/subscription.
- `FileSystemWatcher -> WatcherRuntimeClient` for child runtime start/stop/raw-event callbacks.
- `FileSystemWatcher -> WatchdogHandler` for existing tree event application.
- `FileSystemWatcher -> EventBatcher` through its `events()` stream.
- `WorkspaceFileExplorer -> WorkspaceSearchSnapshotController` for search refresh ownership.
- Streaming/session code -> `WorkspaceFileExplorer` public lease/subscription API.

Forbidden:

- Parent watcher code importing or directly constructing chokidar.
- Stream/session code reaching into `WatcherRuntimeClient` or child IPC internals.
- Terminal code coordinating with File Explorer close.
- Child watcher runtime mutating parent File Explorer tree state.
- New semantic invalidation/resync protocol in this ticket.
- Feature flags that keep production in-process chokidar fallback alive.

## Interface Boundaries / Identity Shapes

| Interface / Method | Subject Owned | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `WorkspaceFileExplorer.acquireWatcherLease()` | Workspace live watcher lease | Start shared watcher on first live consumer and return idempotent release handle. | Workspace instance; no caller-provided watcher ID. | Demand-driven boundary remains authoritative. |
| `FileSystemWatcher.start()` | Parent watcher generation | Create new runtime identity and ask runtime client to start child. | `{ watcherId: string, generation: number }`. | Generation increments per logical start. |
| `WatcherRuntimeClient.start(command)` | Child runtime start | Spawn child and send start command. | `{ watcherId, generation, workspaceRootPath }`. | Resolves on current `ready`; rejects on current runtime failure. |
| `WatcherRuntimeClient.requestStop(reason)` | Child runtime logical stop request | Send stop, arm/maintain timeout, return without waiting for physical close. | Current runtime identity held internally. | Idempotent and fast. |
| Child raw event message | Watcher runtime event | Report native event to parent. | `{ watcherId, generation, event: { eventType, path, isDirectory } }`. | Parent ignores stale identity. |
| `WorkspaceSearchSnapshotController.search/refresh` | Search snapshot/index | Search and refresh with abort/generation safety. | `{ query, workspaceRootPath, AbortSignal? }`. | Aborted/stale refresh cannot block close or commit stale data. |
| `FileSystemWatcher.events()` | Existing live event stream | Return async generator of serialized composite change events. | Session subscribes via queue; no watcher internals exposed. | Uses existing `EventBatcher`; no new protocol type. |

## Child Runtime Lifecycle Contract

### Start

1. Parent `FileSystemWatcher.start()` creates `{ watcherId, generation }`.
2. `WatcherRuntimeClient` launches child process with a stable entrypoint that works in dev and built runtime.
3. Child creates `ChokidarWatcherRuntime` with workspace ignore strategies.
4. Child sends `ready` with watched directory/entry counts and start duration.
5. Parent accepts `ready` only if `{ watcherId, generation }` matches the current runtime.

### Raw Event

1. Child sends raw event `{ watcherId, generation, eventType, path, isDirectory }`.
2. Parent rejects stale identity.
3. Parent ignores suppressed mutation echo paths and ignored paths.
4. Parent applies existing `handleAdd` / `handleUnlink` / `handleModify` logic and `WatchdogHandler` behavior.
5. Serialized change payloads go to bounded subscriber queues.
6. `EventBatcher` combines short-window change payloads into existing composite `FILE_SYSTEM_CHANGE` data.

### Stop

1. Parent `FileSystemWatcher.stop(reason)` closes subscribers, clears pending unlink timers, snapshots current runtime client, clears current identity, and ignores late ready/raw/error messages.
2. Parent calls `WatcherRuntimeClient.requestStop(reason)` only as a fast IPC request; it does not await child physical close.
3. Child calls `watcher.close()` inside the child process and sends `stopped` if it completes.
4. Parent logs physical close duration if received.
5. If the child does not exit within the configured timeout, parent force-kills it and logs forced-kill diagnostics.

## Search Close / Abort Contract

- `WorkspaceFileExplorer.searchFiles` accepts an optional abort signal from GraphQL request context.
- `DirectoryTraversal` checks the abort signal during traversal and fails fast with an abort error.
- `WorkspaceSearchSnapshotController` owns refresh generation. A refresh result may commit only if it is still current and not aborted.
- `WorkspaceFileExplorer.close()` cancels/detaches refresh work and must not wait on long traversal/index work.
- GraphQL request abort should reach search within a small scheduling window; API/E2E round 2 observed abort propagation in about `2ms`.

## Event Delivery Contract For This Ticket

This ticket intentionally preserves the existing simple event model.

- The only normal live update stream payload remains existing file-system change data, serialized through current `FILE_SYSTEM_CHANGE` handling.
- `EventBatcher` may combine multiple serialized `{ changes }` payloads over a short window. It does not inspect final filesystem state or infer semantic operations.
- Subscriber queues remain bounded. If a queue overflows, close that stream with an error indicating reconnect is required.
- Frontend reconnect logic refreshes root/open folder state after abnormal close/error. This is the recovery mechanism for lost stream fidelity in this ticket.
- No targeted subtree invalidation, full resync-required message, stale-scope registry, or identity-based external move inference is introduced.

This is deliberately conservative: it fixes the proven performance bug while avoiding unproven architecture expansion.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep in-process chokidar behind feature flag/fallback | Easier rollout and fallback if child process fails. | Rejected | Production live watcher path uses child runtime only; failures surface as watcher unavailable/reconnect. |
| Use Node `worker_threads` instead of child process | Worker thread isolates JS event loop and may reduce parent blocking. | Rejected for this ticket | Child process isolates event-loop blocking and process-wide watcher descriptor pressure. |
| Add only idle-stop debounce to avoid close during tab switch | Could hide the Files -> Terminal case. | Rejected as primary fix | Logical close and child runtime isolation solve the root cause. Debounce may be added later only as UX optimization. |
| Move entire File Explorer tree into worker/child | Would isolate more work. | Rejected | Keep one authoritative tree in parent; child owns native watcher collection only. |
| Keep `WorkspaceFileExplorer.close()` awaiting search refresh | Preserves current sequencing. | Rejected | Search refresh becomes abortable/detached with stale commit guard. |
| Add semantic event reconciler/targeted invalidation now | API/E2E raised it as possible design impact. | Rejected/Removed by scope clarification | Preserve existing lightweight batching and reconnect refresh; design semantic reconciliation separately only if metrics justify it. |

## Derived Layering

```text
Transport/session layer:
  api/websocket/file-explorer.ts
  services/file-explorer-streaming/*

File Explorer domain layer:
  file-explorer/file-explorer.ts
  file-explorer/search-snapshot/*
  file-explorer/directory-traversal.ts
  file-explorer/file-name-indexer.ts

Watcher parent-control layer:
  file-explorer/watcher/file-system-watcher.ts
  file-explorer/watcher/watchdog-handler.ts
  file-explorer/watcher/event-batcher.ts

Watcher child-runtime layer:
  file-explorer/watcher/runtime/*
```

Layering is explanatory only. The authoritative boundary remains `WorkspaceFileExplorer` for File Explorer domain behavior and `WatcherRuntimeClient` for child runtime lifecycle.

## Migration / Implementation Sequence

1. Add watcher runtime IPC protocol and child runtime files.
2. Replace parent chokidar construction/close in `FileSystemWatcher` with `WatcherRuntimeClient` start/stop.
3. Preserve existing `WatchdogHandler`, pending unlink, suppression, subscriber queue, and `EventBatcher` behavior unless changes are necessary for the child raw-event shape.
4. Make parent `stop()` logical and fast: close subscribers, clear timers, clear generation, request child stop, return.
5. Add child physical close observation and force-kill timeout.
6. Add lifecycle diagnostics and timing logs behind existing diagnostic flags.
7. Add/adjust search abort/detach path.
8. Preserve frontend reconnect/snapshot refresh behavior and durable test coverage.
9. Remove any production in-process chokidar fallback and investigation-only chokidar private instrumentation.
10. Do not implement the removed semantic event reconciliation scope.

## Validation Plan

Backend/unit/integration:

- Parent `FileSystemWatcher.stop()` returns without waiting for delayed child physical close.
- Stale child messages after logical close/restart are ignored by watcher/generation identity.
- Child runtime entrypoint works in dev and built backend layout.
- Stop path force-kills child if physical close does not complete before timeout.
- Existing watcher event behavior still handles add/delete/move/modify, mutation echo suppression, ignored paths, and lease races.
- `EventBatcher` retains short-window composite behavior and overflow error behavior.
- Search abort reaches traversal/indexing and close/dispose does not wait on long refresh.

API/E2E:

- Files -> Terminal timing records Terminal WebSocket route acceptance and first PTY output while child physical close may still be running.
- Reconnect after File Explorer stream close/error refreshes the snapshot.
- Built-server probes validate child runtime spawn and GraphQL abort propagation.
- Final process scan finds no watcher child orphan processes.

Frontend:

- Existing File Explorer live store applies `FILE_SYSTEM_CHANGE` events.
- Durable reconnect/resync regression covers stream close/error and root/open-folder refresh.
- No frontend targeted-invalidation behavior is added or required in this ticket.

## Runtime Diagnostics

Keep diagnostics low-noise and structured enough to grep:

- watcher start requested/ready duration and watched counts;
- logical stop duration;
- child stopped duration or forced kill;
- stale message counts;
- raw event count and subscriber queue overflow count;
- existing batcher batch count/high-water when available;
- Files -> Terminal validation spans.

Diagnostics should use public chokidar data such as `getWatched()` counts where available, not private `_closers` monkey-patching.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Child process launch path differs between dev and built runtime | Watcher unavailable in packaged backend. | Runtime entrypoint resolver and built-server validation. |
| Rapid Files open/close starts a new child while old child is closing | Temporary duplicate watchers/FD pressure. | Generation identity, force-kill old child on timeout/restart, demand-driven leases. |
| Child physical close hangs forever | Orphan process or FD leak. | Force-kill timeout and process registry cleanup. |
| Search traversal ignores abort | Close/dispose can still wait on traversal. | Abort-aware traversal and generation guard. |
| Event stream queue overflow loses updates | Frontend stale tree. | Close stream with reconnect-required error; frontend reconnect refreshes snapshot. |
| Future non-ignored event storms occur | UI/backend pressure. | Separate metrics-backed semantic reconciliation follow-up; do not solve speculatively here. |

## Guidance For Implementation

- Keep the implementation spine-led: first make the parent watcher stop logical and child-owned, then add close/search/simple-event safeguards.
- Do not route stream/session code around `WorkspaceFileExplorer` to reach watcher runtime internals.
- Do not keep the old parent chokidar path as a fallback.
- Use an injected runtime-client factory only for tests; production factory launches the child process.
- The parent `FileSystemWatcher.stop()` performance budget is based on logical close, not physical child close.
- Files -> Terminal validation should assert ordering: Terminal route acceptance must occur before child physical `stopped` when physical close is delayed, and must not wait for the historical ~20s chokidar close.
- Do not add semantic event reconciliation, targeted invalidation protocol, or frontend targeted folder refresh in this ticket.
- Use current tests as regression anchors:
  - watcher-free snapshot/search APIs;
  - one live watcher shared across live consumers;
  - close-before-connected cleanup;
  - repeated open/close without descriptor growth;
  - mutation echo suppression and ignored-path behavior;
  - lightweight event batching and reconnect refresh.
