# Solution Design Impact Response — VAL-FE-006

Date: 2026-05-29
Owner: solution_designer
Trigger: API/E2E round 2 design-impact reroute for backend File Explorer semantic event coalescing/reconciliation.

## Decision

`VAL-FE-006` is **in scope for this ticket**.

Reason: the refined requirements already included bounded/coalesced File Explorer event delivery (`REQ-FE-PERF-007`), and the user clarified that backend File Explorer should not send every short-window update to the frontend. Because this affects the backend/frontend stream contract and correctness semantics, it is a design-impact rework rather than a local implementation patch.

## Required Design Change

Add an explicit backend semantic event reconciliation layer before frontend delivery:

```text
Child raw chokidar event
-> parent FileSystemWatcher
-> SemanticFileEventReconciler
-> existing tree synchronizers / tree snapshot refresh
-> FileExplorerStreamEvent
   - granular FILE_SYSTEM_CHANGE, or
   - FILE_SYSTEM_INVALIDATED, or
   - FILE_SYSTEM_RESYNC_REQUIRED
-> FileExplorerSession / WebSocket
-> frontend granular apply or targeted/full snapshot refresh
```

This replaces simple short-window concatenation as the intended steady-state contract. The old change-only `EventBatcher` is decommissioned from the live watcher semantic path; typed `ReconciledFileExplorerEvent` outcomes must flow to the session without being wrapped into fake `{ changes }` composites.

## Policy Summary

- Use a semantic debounce/reconciliation window: default `1000 ms` quiet window, max `3000 ms` continuous-burst window.
- Reconcile by workspace-relative path and final filesystem state, not only by raw event count.
- Collapse repeated same-path modifications into one modify.
- Collapse add+modify to add.
- Collapse create+delete of a path that did not previously exist to no-op.
- Collapse modify+delete to delete.
- Treat delete+add same existing file path as one modify when type is stable.
- Treat same-path type replacement or ambiguous move/rename candidates as parent/subtree invalidation, not guessed granular changes.
- Emit move/rename only when filesystem identity proves the source and destination are the same object, for example matching `{dev, ino, kind}`. Count-unique unlink+add is not enough; otherwise invalidate the nearest safe loaded folder or require workspace resync.
- Suppress descendant granular events when an ancestor granular structural event, subtree invalidation, or workspace resync covers them.
- If event count/cardinality exceeds semantic thresholds or queue overflow makes fidelity unsafe, emit `FILE_SYSTEM_RESYNC_REQUIRED` before closing/reconnecting instead of relying on silent fail-close.

## Stream Contract Additions

Add explicit stream outcomes:

- `FILE_SYSTEM_CHANGE`: granular changes that are safe to apply directly.
- `FILE_SYSTEM_INVALIDATED`: one or more folder paths must be refreshed from snapshot APIs.
- `FILE_SYSTEM_RESYNC_REQUIRED`: whole File Explorer snapshot refresh is required; may include `reconnect_required` when the stream cannot continue safely.

`FileExplorerSession` assigns each emitted outcome a monotonic per-session `sequence` for ordering and diagnostics; the reconciler does not assign sequence.

## Frontend Recovery Contract

- On `FILE_SYSTEM_CHANGE`, apply current granular change handling.
- On `FILE_SYSTEM_INVALIDATED`, refresh the listed folder paths and currently open descendants under them. If targeted refresh fails or the folder identity is unknown, fall back to full snapshot refresh.
- On `FILE_SYSTEM_RESYNC_REQUIRED`, refresh the root plus open folders using the existing snapshot refresh path. If `reconnect_required` is true or the socket closes, reconnect and refresh after connect.

## Updated Artifacts

This response is reflected in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/design-spec.md`

## Validation Expectations

Implementation must add durable validation for:

1. same-path modify collapse;
2. add+modify collapse;
3. create+delete no-op;
4. modify+delete collapse;
5. identity-proven rename/move emission;
6. unique but unrelated delete+add and ambiguous delete/add become invalidation, not guessed move;
7. descendant events under invalidated/stale folders are suppressed until folder refresh clears the stale scope;
8. high-cardinality burst emits invalidation/resync instead of thousands of frontend changes;
9. frontend `FILE_SYSTEM_INVALIDATED` triggers targeted snapshot refresh;
10. frontend `FILE_SYSTEM_RESYNC_REQUIRED` triggers full snapshot refresh/reconnect recovery.

## Architecture Re-Review Correction (2026-05-29)

After architecture re-review round 2, this response was tightened as follows:

- `SemanticFileEventReconciler` is the only semantic owner for raw watcher event merge/move/invalidation/tree-mutation decisions.
- `FileSystemWatcher` owns only runtime generation validation, mutation suppression, reconciler lifecycle, logical stop, and typed subscriber dispatch. The old pending unlink / direct `WatchdogHandler` path is removed.
- `EventBatcher` is not retained as the stream semantic path. Typed `ReconciledFileExplorerEvent` outcomes are delivered through a bounded typed queue.
- `FileExplorerSession` owns per-session sequence assignment; `FileExplorerStreamHandler` owns WebSocket message serialization.
- Move/rename requires filesystem identity proof. Count uniqueness alone falls back to targeted invalidation/resync.
- Targeted invalidation uses stale-scope gating: granular events under stale scopes are suppressed/escalated until `WorkspaceFileExplorer.loadFolderChildren()` refreshes and clears the scope.
