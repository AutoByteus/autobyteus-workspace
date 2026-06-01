# Design Rework Report

## Rework Meta

- Trigger: Architecture review round 1 failed with Design Impact findings.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-file-explorer-context-menu/tickets/in-progress/frontend-file-explorer-context-menu/design-review-report.md`
- Revised design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-file-explorer-context-menu/tickets/in-progress/frontend-file-explorer-context-menu/design-spec.md`
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-file-explorer-context-menu/tickets/in-progress/frontend-file-explorer-context-menu/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-file-explorer-context-menu/tickets/in-progress/frontend-file-explorer-context-menu/investigation-notes.md`

## Rework Summary

The design keeps the original central context-action ownership direction, but now explicitly resolves the two architecture-review gaps:

1. Recursive `FileItem` transport no longer relies on Vue component emits bubbling through recursive children. The revised design chooses a concrete injected callback shape: `FileExplorer.vue` provides `requestFileExplorerContextMenu`, owned by `useFileExplorerContextActions`; every recursive `FileItem.vue` injects and calls it with a normalized `FileExplorerContextRequest`.
2. Containing-folder delete cleanup is now assigned to the store/content-state owner. The revised design adds a path-scoped content cleanup responsibility in `fileExplorerContentActions.ts`, called by `fileExplorerMutationActions.deleteFileOrFolder` after successful delete response and before/with applying the returned change event.

## Findings Addressed

### AR-FE-CM-001 — Recursive Row Context Request Transport

- Decision: Use injected controller callback, not recursive re-emission.
- Revised owner: `FileExplorer.vue` / `useFileExplorerContextActions` provides `requestFileExplorerContextMenu(request)`.
- Revised row responsibility: `FileItem.vue` normalizes its row target and calls the injected callback from any recursive depth.
- Tests added to design: top-level and nested row context-menu visibility after the previous close lifecycle would have run.
- Design sections updated: intended change, primary spine, spine narratives, ownership map, thin facades, off-spine concerns, file responsibilities, boundary encapsulation, dependency rules, interface mapping, examples, migration sequence, and implementation guidance.

### AR-FE-CM-002 — Containing-Folder Delete Active/Open File Cleanup

- Decision: Extend store/content-state cleanup; do not repair preview state in the UI context owner.
- Revised owner: `fileExplorerContentActions.ts` owns open-file list and `activeFile` invariants; `fileExplorerMutationActions.ts` owns successful delete sequencing and calls the content cleanup helper.
- Target behavior: remove any open file whose path equals the deleted file path or starts with `${deletedPath}/`; if the removed set contained `activeFile`, set `activeFile` to the last remaining open file or `null`.
- Tests added to design: store-level exact file delete and containing-folder delete cleanup tests, exercised through `deleteFileOrFolder`; component tests continue to validate context-menu initiation.
- Design sections updated: spine inventory/narratives, off-spine concerns, subsystem allocation, file responsibility mapping, ownership boundaries, interface mapping, migration sequence, risks, and guidance.

## Requirements Alignment

- `AC-FE-CM-006` already required no stale preview/tab state after deleting a direct file or containing folder.
- `AC-FE-CM-010` was clarified to explicitly require top-level and nested row context-menu validation plus exact/containing-folder delete cleanup of open/active file state.
- No new product scope was added; the rework makes the previously approved behavior implementable and testable.

## Remaining Review Focus

- Confirm that the injected callback is the acceptable concrete recursive transport shape.
- Confirm that store/content-state cleanup is assigned to the correct owner and remains behind `useWorkspaceFileExplorer` for UI callers.
- Confirm that the design still rejects compatibility wrappers around `closeAllFileContextMenus` and does not preserve row-owned menu/dialog paths.
