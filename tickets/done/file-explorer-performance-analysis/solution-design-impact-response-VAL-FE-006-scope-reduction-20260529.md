# Solution Design Impact Response — VAL-FE-006 Scope Reduction

Date: 2026-05-29
Ticket: `file-explorer-performance-analysis`
Authoritative workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis`

## Decision

`VAL-FE-006` is removed from this ticket as an implementation requirement. The revised design returns to the original performance/root-cause scope: isolate the native chokidar watcher runtime in a child process, make parent watcher close logical and fast, preserve demand-driven watcher leases, make search close/abort safe, and keep event delivery bounded with the existing lightweight batching/reconnect model.

## Why This Is The Better Scope

The user correctly identified that the semantic reconciliation proposal made the ticket too broad. The evidence does not justify it for the original issue:

- The measured Files -> Terminal delay was caused by chokidar `watcher.close()` synchronously blocking the backend parent event loop for about 21.36 seconds.
- The event stream already filters ignored paths using workspace ignore policy (`.gitignore`, `.git`, and common ignored outputs such as `node_modules`, `dist`, build artifacts, `.nuxt`, coverage, etc.).
- The File Explorer surface is not a high-frequency user path for most usage, so a large reconciler/invalidator subsystem is not proportional without event-volume evidence.
- The current implementation already has simple short-window batching and bounded queue failure/reconnect behavior, which is sufficient for this root-cause ticket.

## Architecture Changes From Prior VAL-FE-006 Draft

Removed from this ticket:

- `SemanticFileEventReconciler`
- typed `ReconciledFileExplorerEvent` semantic outcome model
- `FILE_SYSTEM_INVALIDATED`
- `FILE_SYSTEM_RESYNC_REQUIRED`
- targeted folder invalidation/open-descendant refresh protocol
- filesystem identity tracker for watcher-derived move/rename proof
- stale-scope registry/gating
- semantic move/rename/delete+add collapse rules and validation suite

Retained in this ticket:

- child-process chokidar runtime;
- parent generation identity and stale message rejection;
- immediate logical parent close and child force-kill timeout;
- search abort/detach safeguards;
- existing `WatchdogHandler` event semantics;
- existing `EventBatcher` short-window composite batching;
- bounded queue overflow fail-close and frontend reconnect/snapshot refresh.

## How Architecture Review Findings Are Resolved

The previous architecture review failed because the semantic reconciliation design was not implementation-ready. This scope reduction resolves those findings by removing that subsystem rather than deepening it:

1. Owner placement is no longer contradictory: `FileSystemWatcher` remains the parent watcher/event controller, `WatchdogHandler` remains the existing tree-event adapter, and there is no separate semantic owner.
2. Stream outcome mapping stays concrete and existing: only current `FILE_SYSTEM_CHANGE` payloads plus stream close/error/reconnect behavior are in scope; no new typed invalidation/resync outcome model is added.
3. Unique unlink+add proof is no longer introduced: watcher-derived move/rename semantics stay as existing behavior for this ticket; improving them requires a separate evidence-backed design.
4. Parent tree invalidation/stale-subtree invariants are no longer needed because targeted invalidation is removed from scope.

## Updated Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/design-spec.md`

## Expected Next Step

Architecture re-review should evaluate the simplified design against the original root-cause requirements, not the removed semantic reconciliation expansion. If accepted, implementation should remove any planned semantic reconciler work and continue with the already validated child-runtime, logical-close, search-abort, EventBatcher, and reconnect-resync scope.
