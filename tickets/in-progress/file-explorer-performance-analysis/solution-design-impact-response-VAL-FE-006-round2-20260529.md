# Solution Design Impact Response — VAL-FE-006 Round 2 Architecture Findings

Date: 2026-05-29  
Owner: solution_designer  
Trigger: Architecture re-review round 2 failed the first `VAL-FE-006` semantic reconciliation design revision.

## Resolution Summary

The revised design has been tightened to make semantic event reconciliation implementation-ready:

- `SemanticFileEventReconciler` is now the single semantic owner for raw watcher event merge, move/rename confidence, tree mutation/invalidation decisions, stale-scope gating, and typed outcome emission.
- `FileSystemWatcher` is explicitly limited to runtime generation validation, mutation suppression, reconciler lifecycle, logical stop, and typed subscriber dispatch.
- The old `FileSystemWatcher` pending-unlink/direct `WatchdogHandler` path is explicitly removed/decommissioned.
- The old change-only `EventBatcher` is decommissioned from the live watcher semantic path.
- Typed `ReconciledFileExplorerEvent` outcomes flow to `FileExplorerSession`, which assigns per-session sequence, then `FileExplorerStreamHandler` serializes WebSocket messages.
- Watcher-derived move/rename now requires filesystem identity proof (`{dev, ino, kind}`); count-unique unlink+add without proof falls back to invalidation/resync.
- Targeted invalidation now uses stale-scope gating with `TreeFreshnessRegistry`; granular events under stale scopes are suppressed/escalated until `WorkspaceFileExplorer.loadFolderChildren()` refreshes and clears the scope.

## Finding Resolutions

### DR-FE-VAL006-001 — Owner Placement Contradiction

Resolved by updating canonical sections so:

```text
FileSystemWatcher
  -> validates watcher/generation and suppression
  -> calls SemanticFileEventReconciler.enqueueRawEvent()

SemanticFileEventReconciler
  -> owns debounce windows
  -> owns pending raw event state
  -> owns move/rename confidence
  -> owns tree mutation / invalidation / resync decision
```

The design now explicitly rejects old `PendingUnlink`, `moveDetectionWindowMs`, and immediate `WatchdogHandler` raw-event application in `FileSystemWatcher`.

### DR-FE-VAL006-002 — Stream Outcome Mapping / Sequence Ownership

Resolved by defining typed delivery end-to-end:

```text
SemanticFileEventReconciler
  -> ReconciledFileExplorerEvent
  -> BoundedReconciledEventQueue
  -> FileExplorerSession assigns sequence
  -> FileExplorerStreamHandler maps to ServerMessage
```

`sequence` is per session and owned by `FileExplorerSession`, not watcher-global. `EventBatcher.createCompositeEvent({changes})` is removed/decommissioned from this path.

### DR-FE-VAL006-003 — Unsafe Move/Rename Inference

Resolved by requiring identity proof. A watcher-derived move/rename may be emitted only when source and destination identities match:

```ts
{ dev, ino, kind }
```

and the matching is one-to-one, source/destination parents are loaded, and no stale scope covers the operation. Unique unlink+add without identity proof now emits invalidation/resync. Validation must include both a true identity-proven move and a negative unrelated delete+create case.

### DR-FE-VAL006-004 — Parent Tree Invalidation / Stale Scope Invariant

Resolved by choosing **stale-scope gating** as the target shape:

- `SemanticFileEventReconciler` marks invalidated folder scopes stale before emitting `FILE_SYSTEM_INVALIDATED`.
- `TreeFreshnessRegistry` owns stale path checks.
- While a path is under stale scope, granular events are suppressed, re-invalidated, or escalated to resync.
- `WorkspaceFileExplorer.loadFolderChildren(folderPath)` clears the stale scope only after successful folder refresh.

## Updated Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/design-spec.md`
- Original VAL-FE-006 response updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/solution-design-impact-response-VAL-FE-006-20260529.md`
