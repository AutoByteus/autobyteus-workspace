# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Design and deliver a proper architecture fix for the workspace File Explorer performance issue reproduced when switching from the Files tab to the Terminal tab after a live File Explorer watcher has started. The fix must preserve File Explorer correctness while preventing native watcher lifecycle work from blocking unrelated backend capabilities such as Terminal WebSocket acceptance and PTY startup.

The investigation confirmed that the backend File Explorer watcher previously ran chokidar in the backend Node process. `FileSystemWatcher.stop()` called chokidar `watcher.close()` in that process, and in the target workspace this synchronously blocked the backend event loop for about 21.36 seconds while closing 9,847 native watcher handles. The target scope is a clean-cut watcher-runtime isolation design with a child-process boundary for native chokidar lifecycle, plus close/search/simple-event safeguards that keep File Explorer lifecycle logically quiescent and observable.

## Scope Clarification — 2026-05-29

The prior `VAL-FE-006` semantic event reconciliation expansion is removed from this ticket by user direction. The original performance root cause was watcher shutdown blocking the backend event loop, not high-frequency frontend event delivery. The watcher already applies `.gitignore` / workspace ignore policy, plus `.git` and common ignored outputs such as `node_modules`, `dist`, build output, and other ignored directories, so we do not have evidence that filtered File Explorer events are frequent enough to justify a new semantic reconciler in this ticket.

This ticket therefore keeps event handling simple:

- preserve the existing lightweight short-window `EventBatcher` / bounded queue behavior;
- preserve existing watcher event semantics and frontend `FILE_SYSTEM_CHANGE` handling;
- close/reconnect on queue overflow or stream failure, using the existing reconnect snapshot refresh path;
- do **not** add `SemanticFileEventReconciler`, `FILE_SYSTEM_INVALIDATED`, file-identity move proofing, stale-scope registries, or targeted invalidation/resync protocol in this ticket.

If future profiling proves that real, non-ignored filesystem event storms still cause File Explorer UI/backend pressure, semantic reconciliation can be designed as a separate focused ticket with fresh evidence.

## Investigation Findings

- The workspace File Explorer watcher is **not** currently implemented with `worker_threads`, a Web Worker, or a File Explorer-specific child process. `WorkspaceFileExplorer` dynamically creates a `FileSystemWatcher`, and the old `FileSystemWatcher.start()` called `chokidar.watch(...)` in the backend Node process.
- The watcher does **not** run in the Electron renderer/UI thread. The Electron app starts the internal backend as a separate Node process (`ELECTRON_RUN_AS_NODE=1`), so File Explorer watcher callbacks and tree synchronization are isolated from the renderer, but they still shared the backend Node event loop and backend process file-descriptor table.
- Current code already contains demand-driven watcher lifecycle: workspaces are metadata-only until a File Explorer is acquired; snapshot/list/search APIs do not start a watcher; a live WebSocket File Explorer session acquires a watcher lease; the last visible/live WebSocket consumer releases the lease and stops the watcher.
- Deeper runtime timing showed the reproduced Files -> Terminal delay was caused by synchronous chokidar watcher shutdown on the backend Node event loop: `watcher.close()` spent about `21.36s` synchronously iterating 9,847 native watcher closers before its promise returned. During that time a zero-delay backend timer did not fire and Terminal WebSocket route acceptance was blocked.
- Worker-thread migration is not the right production answer for this root cause because it does not isolate process-level watcher descriptor pressure. The approved target fix is a watcher child-process runtime that isolates both event-loop-blocking chokidar close and watcher descriptor blast radius.
- `WorkspaceFileExplorer.close()` can also wait for search snapshot refresh work. That traversal/index work must be cancelable or close-detached so close/dispose does not wait on unrelated cold-search work.
- Terminal startup does not call File Explorer APIs directly. The backend Terminal route resolves cwd and creates a PTY session through `TerminalHandler`/`PtySessionManager`; on macOS the default terminal backend is already an isolated helper process. The File Explorer -> Terminal slowdown was indirect shared backend event-loop pressure.
- The frontend aborts superseded File Explorer searches. Backend GraphQL search must propagate abort/cancellation into traversal/indexing so aborted client searches do not keep expensive work on the close path.
- Event delivery is already lightweight-batched and filtered by ignore policy. No additional semantic event reconciliation is required for the original Files -> Terminal performance ticket.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Performance bug fix plus targeted runtime-boundary refactor.
- Design issue signal (`Yes`/`No`/`Unclear`): Yes for native watcher lifecycle placement; no for a new semantic event-reconciliation subsystem in this ticket.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue with a Missing Invariant. Native chokidar lifecycle was owned at the wrong execution boundary, and logical File Explorer close waited for physical chokidar close.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Refactor needed now for watcher runtime isolation and close/search safeguards. Semantic event reconciliation is explicitly deferred/removed because it is not supported by the reproduced root cause or current evidence.
- Requirement or scope impact: Requirements prioritize child-process watcher runtime isolation, immediate logical close and stale-generation rejection, no in-process chokidar fallback, durable lifecycle diagnostics, close-safe search cancellation/detachment, existing lightweight event batching/queue safety, and validation of Files-to-Terminal latency under the large target workspace.

## Recommendations

1. Implement a clean-cut backend watcher-runtime isolation boundary. The production backend parent process must no longer create or close chokidar watchers directly on the shared backend event loop.
2. Keep `WorkspaceFileExplorer` authoritative for tree state, watcher leases, file operations, search, path validation, ignored-path policy, mutation echo suppression, and event subscribers.
3. Move native chokidar ownership into a dedicated child process per active workspace watcher. The child process owns chokidar start/ready/raw-event/error/stop and can block or be killed without blocking Terminal or the backend parent event loop.
4. Make File Explorer watcher release a two-phase lifecycle:
   - logical close in the parent is immediate/idempotent: detach subscribers, clear timers, mark the watcher generation closed, send child stop, arm a force-kill timeout, and return control to the caller;
   - physical close runs inside the watcher child process; the parent observes completion asynchronously and force-terminates the child after a bounded timeout if it does not exit.
5. Preserve demand-driven watcher lifecycle: non-live snapshot/list/search APIs must remain watcher-free; live WebSocket consumers acquire watcher leases; the final live consumer release logically quiesces the watcher.
6. Keep chokidar as the native watching implementation inside the isolated runtime. Chokidar is a reasonable/popular Node choice; the problem was closing a very large chokidar watcher synchronously on the backend parent event loop.
7. Add durable, gated watcher lifecycle diagnostics in the parent/child protocol: start duration, ready counts, raw event counts, logical stop duration, child physical close duration, forced-kill count, active lease count, watched directory/entry counts where available, and close reason.
8. Add close-safe search/index behavior: make full-tree search refresh/traversal cancelable or detach it so `WorkspaceFileExplorer.close()` and live watcher release never wait on unrelated search refresh work.
9. Keep event delivery simple in this ticket: retain the existing short-window event batcher and bounded subscriber queue, preserve current `FILE_SYSTEM_CHANGE` stream semantics, and rely on reconnect/resync on stream failure/overflow. Do not add semantic event reconciliation, targeted invalidation, file-identity move proofing, or stale-scope gating here.
10. Treat frontend File Explorer workerization and semantic event reconciliation as separate, profile-driven follow-ups. Vue/DOM rendering must stay on the main thread; only pure client-side tree reconciliation/projection work should move to a Web Worker if profiling later proves it is needed.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-FE-001: Open/browse a workspace File Explorer tree and load directory children without starting a live watcher unnecessarily.
- UC-FE-002: Monitor workspace filesystem changes for visible/live File Explorer consumers and propagate file events to the frontend using the existing lightweight event stream semantics.
- UC-FE-003: Close, switch, or dispose a workspace/File Explorer session without noticeable hangs, stale event delivery, or leaked watchers.
- UC-FE-004: Search workspace files without leaving uncancelable backend traversal/index work running after the frontend aborts or the workspace closes.
- UC-FE-005: Explain current data-flow spans for File Explorer request, watcher, event, search, and cleanup paths.
- UC-FE-006: Switch from Files to Terminal after a live File Explorer session has started, and connect the terminal without File Explorer cleanup work delaying terminal readiness.

## Out of Scope

- Broad UI redesign of the File Explorer surface.
- Moving the entire backend File Explorer tree authority, file operation authority, or search authority into the watcher child process.
- Moving Vue components, DOM rendering, or direct Pinia mutation ownership wholesale into a frontend worker.
- Replacing chokidar with a different watcher library in this ticket.
- General frontend virtualization changes unless later metrics prove UI rendering/projection is the bottleneck.
- Semantic event reconciliation beyond the existing lightweight `EventBatcher`: no `SemanticFileEventReconciler`, no `FILE_SYSTEM_INVALIDATED`, no targeted folder invalidation protocol, no file identity tracker, no stale-scope registry, and no new backend move/rename inference rules in this ticket.

## Functional Requirements

- REQ-FE-PERF-001: Document whether watcher/monitor work currently runs on the Node/Electron main process event loop, a child process, a Worker Thread, Web Worker, or another isolation boundary.
- REQ-FE-PERF-002: Document the current data-flow spans for listing, watching, event delivery, search, and close/dispose paths with authoritative owners and boundary crossings.
- REQ-FE-PERF-003: Preserve demand-driven watcher lifecycle: non-live snapshot/list/search APIs must not start chokidar; live WebSocket consumers may acquire watcher leases; the final live consumer release must quiesce/stop watcher work.
- REQ-FE-PERF-004: Close/dispose must be idempotent, must stop logical event delivery immediately, and must not wait on unbounded unrelated search traversal/index refresh work.
- REQ-FE-PERF-005: Workspace search refresh/traversal must be cancelable or close-detached so frontend aborts and workspace/session close do not leave expensive backend work blocking lifecycle cleanup.
- REQ-FE-PERF-006: Watcher lifecycle must expose diagnostics for start duration, stop/close duration, active lease count, watched item counts where available, and close reason.
- REQ-FE-PERF-007: Event delivery must remain bounded and lightweight: preserve the existing short-window batching and bounded subscriber queue, close/reconnect on overflow/failure, and do not add a semantic event reconciler or new invalidation protocol in this ticket.
- REQ-FE-PERF-008: Route production native watcher lifecycle through a clearly owned child-process runtime so chokidar start/close/event collection cannot block the backend parent event loop; do not use `worker_threads` as the production answer for this ticket, and do not retain an in-process chokidar fallback for the replaced path.
- REQ-FE-PERF-009: Frontend File Explorer workerization, if pursued later, must keep Vue/DOM rendering on the main thread while isolating heavy tree-model reconciliation, flattening, filtering, search result projection, or visible-row computation behind a clear Web Worker-owned model boundary.
- REQ-FE-PERF-010: Preserve current correctness for creates, deletes, moves, renames, recursive directory changes, ignored-folder policy, path-boundary validation, mutation echo suppression, and existing watcher lease race handling.
- REQ-FE-PERF-011: File Explorer lifecycle must not indirectly delay Terminal startup beyond an explicit performance budget when switching tabs; watcher logical close in the backend parent should complete fast enough that Terminal WebSocket route acceptance is not serialized behind physical chokidar close.
- REQ-FE-PERF-012: Identify validation evidence needed for performance and lifecycle behavior, including focused tests/probes for parent event-loop responsiveness during child watcher close, event flow, search cancellation/detachment, watcher cleanup, Files-to-Terminal switch latency, and reconnect behavior on stream close/error.
- REQ-FE-PERF-013: Watcher child-process messages must carry explicit watcher/generation identity so stale events, late ready/stopped messages, and old child errors cannot mutate current File Explorer state after logical close or restart.
- REQ-FE-PERF-014: The implementation must not introduce the previously proposed semantic event-reconciliation subsystem in this ticket. Existing event semantics may be preserved; future reconciliation requires a separate evidence-backed requirements/design pass.

## Removed / Superseded Requirements From Prior VAL-FE-006 Expansion

The earlier draft requirements `REQ-FE-PERF-015` through `REQ-FE-PERF-019` covered targeted invalidation, resync-required protocol, filesystem identity proof, and stale-scope gating. They are removed from this ticket by the 2026-05-29 user scope clarification and are not implementation or validation obligations for this ticket.

## Acceptance Criteria

- AC-FE-PERF-001: The investigation artifact identifies concrete File Explorer backend entrypoints, watcher owner(s), lifecycle owner(s), event delivery boundaries, and frontend activation boundaries with file paths.
- AC-FE-PERF-002: The analysis includes data-flow spine inventory for directory list/load, watcher setup, filesystem event propagation, search, and close/dispose.
- AC-FE-PERF-003: The design routes native watcher lifecycle through a clearly owned child-process isolation boundary, explicitly rejects production worker-thread/in-process chokidar fallback for this root cause, and keeps `WorkspaceFileExplorer` authoritative for tree state.
- AC-FE-PERF-004: The proposed cleanup/close design is idempotent, logically detaches subscribers immediately, cancels/ignores stale-generation events after close, and avoids waiting on physical chokidar close or unbounded traversal/index refresh on the hot close path.
- AC-FE-PERF-005: The validation plan includes lifecycle tests/probes that exercise open-watch-close, close during search/index refresh, repeated open/close, watcher disposal/event quiescence, and descriptor/spawn health.
- AC-FE-PERF-006: Watcher lifecycle diagnostics are available in logs or test probes so future reports can distinguish search traversal, chokidar close, event batch/queue pressure, frontend reconciliation, and terminal startup costs.
- AC-FE-PERF-007: The design explicitly separates backend isolation choices from frontend Web Worker choices and defines which state/compute can move off-thread without moving UI rendering or creating duplicate authoritative trees.
- AC-FE-PERF-008: Validation includes a Files-to-Terminal switch scenario that records File Explorer release/close spans and terminal WebSocket/PTY readiness spans under the large target workspace.
- AC-FE-PERF-009: A synthetic slow watcher-runtime stop test proves parent `FileSystemWatcher.stop()` returns without waiting for child physical close, stale child messages are ignored, and parent event-loop timer gaps remain within the agreed budget.
- AC-FE-PERF-010: Event-path validation preserves the existing lightweight batching/queue-safety behavior and proves queue overflow or stream failure does not corrupt state because the frontend reconnect path refreshes the snapshot.
- AC-FE-PERF-011: Backend/frontend durable tests validate reconnect/resync after File Explorer stream close/error and GraphQL search abort propagation, without adding targeted invalidation or semantic coalescing tests.

## Removed / Superseded Acceptance Criteria From Prior VAL-FE-006 Expansion

The earlier draft acceptance criteria for `FILE_SYSTEM_INVALIDATED`, `FILE_SYSTEM_RESYNC_REQUIRED`, file-identity move proof, stale-scope suppression, and high-cardinality semantic coalescing are removed from this ticket by user scope clarification.

## Constraints / Dependencies

- Must preserve the existing demand-driven watcher lifecycle that prevents always-on workspace watcher FD pressure.
- Must avoid backward-compatibility wrappers, dual watcher behavior, or parallel authoritative tree owners in the target design.
- `WorkspaceFileExplorer` must remain the authoritative parent for File Explorer tree state, watcher leases, file operations, search, path-boundary validation, mutation echo suppression, ignore policy, and frontend event subscribers.
- The watcher child process must own native chokidar lifecycle only. It must not become a second authoritative File Explorer tree.
- Production code must not retain an in-process chokidar fallback for the replaced watcher path, because that would preserve the confirmed event-loop-blocking failure mode. Test doubles/fakes are allowed for unit tests only.
- Parent close/release paths must not wait for physical chokidar close inside the child process.
- Generated build output must be able to locate and launch the watcher child entrypoint in both dev and built-backend Electron/runtime environments.

## Assumptions

- The user's “monitor” and “watcher” refer to filesystem watching used by the workspace File Explorer live update stream.
- The primary Files -> Terminal delay is confirmed to be synchronous chokidar close on the backend parent event loop for the target workspace, not Terminal PTY helper startup.
- A child process is the appropriate production isolation boundary because it isolates both event-loop blocking and process-level watcher descriptor pressure.
- Search refresh/traversal cancellation remains an in-scope lifecycle safeguard even though it was not the dominant cause in the reproduced Files -> Terminal delay.
- Ignored paths substantially reduce expected real File Explorer event volume; there is no current evidence that a new semantic event-reconciliation subsystem is justified for the original ticket.

## Risks / Open Questions

- The exact child-process launch shape must work in both TypeScript source/dev and built `dist` runtime paths.
- If users rapidly toggle Files open/closed, starting a new child while an old child is still physically closing could temporarily duplicate native watcher descriptors. The design must force-terminate old closing children on restart or after a short timeout.
- Future non-ignored generated-file bursts could still reveal event-volume pressure. That is a separate evidence-backed follow-up, not part of this root-cause ticket.
- GraphQL request abort-signal propagation was confirmed by API/E2E round 2; implementation must preserve it.
- Frontend workerization remains a separate profiling question and should not block the backend root-cause fix.

## Requirement-To-Use-Case Coverage

- REQ-FE-PERF-001: UC-FE-002, UC-FE-005
- REQ-FE-PERF-002: UC-FE-001, UC-FE-002, UC-FE-003, UC-FE-004, UC-FE-005
- REQ-FE-PERF-003: UC-FE-001, UC-FE-002, UC-FE-003
- REQ-FE-PERF-004: UC-FE-003, UC-FE-004
- REQ-FE-PERF-005: UC-FE-003, UC-FE-004
- REQ-FE-PERF-006: UC-FE-002, UC-FE-003, UC-FE-005
- REQ-FE-PERF-007: UC-FE-002, UC-FE-003
- REQ-FE-PERF-008: UC-FE-002, UC-FE-003, UC-FE-006
- REQ-FE-PERF-009: UC-FE-001, UC-FE-002, UC-FE-003, UC-FE-005
- REQ-FE-PERF-010: UC-FE-001, UC-FE-002, UC-FE-003
- REQ-FE-PERF-011: UC-FE-003, UC-FE-006
- REQ-FE-PERF-012: UC-FE-001, UC-FE-002, UC-FE-003, UC-FE-004, UC-FE-006
- REQ-FE-PERF-013: UC-FE-002, UC-FE-003, UC-FE-006
- REQ-FE-PERF-014: UC-FE-002, UC-FE-003, UC-FE-006

## Acceptance-Criteria-To-Scenario Intent

- AC-FE-PERF-001: Ensures analysis is grounded in current code, not speculation.
- AC-FE-PERF-002: Ensures the user receives the requested end-to-end data-flow explanation.
- AC-FE-PERF-003: Ensures the worker/process question is answered with evidence and the target architecture uses a single authoritative File Explorer owner plus isolated native watcher runtime.
- AC-FE-PERF-004: Ensures close/dispose latency, stale-event safety, and parent event-loop responsiveness are first-class outcomes.
- AC-FE-PERF-005: Ensures downstream implementation can be validated executably.
- AC-FE-PERF-006: Ensures future performance reports have actionable timing/count evidence rather than subjective slowness only.
- AC-FE-PERF-007: Ensures frontend and backend workerization are not conflated and that each has a clear owner and proof threshold.
- AC-FE-PERF-008: Ensures the user-reported Terminal slowdown after using Files is validated as an end-to-end scenario.
- AC-FE-PERF-009: Ensures the core architectural fix is executable-testable without requiring a 20 second real chokidar close in every test run.
- AC-FE-PERF-010: Ensures the existing simple event stream remains bounded and recovery-safe without expanding scope.
- AC-FE-PERF-011: Ensures reconnect/resync and search abort safeguards remain durable after scope reduction.

## Approval Status

Approved by the user on 2026-05-29 for a real, durable backend watcher isolation fix using a proper child-process runtime. On 2026-05-29, the user clarified that the semantic event reconciliation expansion made the ticket too broad; solution design removed that expansion and returned the ticket to the original performance/root-cause scope.
