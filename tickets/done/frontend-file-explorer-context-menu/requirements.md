# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready - approved by user on 2026-06-01 after live browser reproduction/root cause identification.

## Goal / Problem Statement

The frontend file explorer context menu no longer opens for file-management actions in the desktop Files tab. The user reports that right-clicking folders/files does not open the app context menu, so they cannot remove files or create new folders. Live browser reproduction against the running desktop backend confirmed that the `FileItem` handler briefly sets the menu open, then the menu closes immediately before it is visible. The affected surface is `autobyteus-web`'s desktop file explorer (`FileExplorer` / `FileItem` / `FileContextMenu`) shown in the app Files tab screenshot.

The desired outcome is a reliable, test-covered frontend context-menu path for file-tree mutation actions, with the mutation target unambiguous and with visible tree/preview state updated after success or failure.

## Investigation Findings

- The frontend row context menu is currently implemented per tree item in `autobyteus-web/components/fileExplorer/FileItem.vue`; menu rendering is in `FileContextMenu.vue`; create/delete dialogs are `AddFileOrFolderDialog.vue` and `ConfirmDeleteDialog.vue`.
- The actual backend GraphQL mutation contracts for create/delete still exist and match the frontend generated types: `deleteFileOrFolder(workspaceId, path)` and `createFileOrFolder(workspaceId, path, isFile)`.
- Backend documentation and E2E coverage state that file mutations are snapshot operations returning concrete `FileSystemChangeEvent` payloads for immediate frontend application.
- Existing durable frontend tests cover lazy loading and file opening, but do **not** cover the row context menu, add-folder dialog dispatch, delete confirmation dispatch, or root/background context-menu behavior.
- A temporary focused component probe confirmed that, in isolation without the parent-level global close listener, right-clicking a `FileItem` opens the menu and clicking `Add Folder` / `Delete` calls the injected explorer actions with expected paths.
- Live browser reproduction in the active Files tab confirmed the actual failure mode: invoking `handleContextMenu` on a visible folder sets `showContextMenu=true`, but after the parent `closeAllFileContextMenus` signal propagates, the same `FileItem` watcher closes itself and `showContextMenu` becomes `false`; no visible menu remains.
- Manual state forcing (`showContextMenu=true` with a fixed position) renders the teleported `FileContextMenu` correctly with `Add File`, `Add Folder`, `Rename`, and `Delete`. Therefore `FileContextMenu.vue` rendering is not the failure.
- `git blame` identifies the self-close regression path as the interaction between old per-row `document.dispatchEvent(new Event('closeAllFileContextMenus'))` in `FileItem.vue` and the parent close-signal listener added on **2026-05-29** (`fa8b7c2e`, `fix: cache inactive files panel for terminal switch`) in `FileExplorer.vue`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix with small interaction-ownership hardening.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Duplicated Policy Or Coordination / File Placement Or Responsibility Drift.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, limited to frontend context-menu ownership.
- Evidence basis: `FileItem.vue` currently owns row rendering, expand/load, file opening, drag/drop, per-row menu state, delete confirmation state, create dialog state, and path derivation. `FileExplorer.vue` owns a global close signal and panel/workspace binding, but not the mutation-context surface. A row contextmenu dispatches the global close event, then opens itself; the parent close signal then tells every row, including the opener, to close. This cross-owner coordination closes the newly opened menu before it can be used.
- Requirement or scope impact: The fix should not only reorder one click handler; it should make the context action target explicit, keep one authoritative menu/dialog owner for the explorer surface or otherwise guarantee the opener cannot self-close, and add durable tests for the user-visible context-menu create/delete flows.

## Recommendations

- Treat this as a frontend file-explorer context-action ownership fix with a confirmed self-closing menu regression.
- Keep the backend GraphQL mutation contracts unchanged unless implementation later proves backend failure in a reproducible runtime path.
- Add durable frontend tests that exercise right-click menu visibility and Add Folder/Delete dispatch through the real context menu/dialog components.
- Prefer moving context-menu/dialog ownership to `FileExplorer.vue` (or a dedicated file-explorer context action controller used by it), while `FileItem.vue` emits target/position requests. This creates one active workspace/panel-aware owner and enables a root/background create-folder context.
- Preserve existing `useWorkspaceFileExplorer` and `fileExplorerMutationActions` as the authoritative mutation boundary.
- Add regression coverage specifically proving that a row contextmenu remains visible after the close-other-menus coordination runs.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- Right-click a file-tree row and see context actions at the pointer location.
- Create a new folder from the context menu for the correct target directory.
- Create a new folder at the active workspace root from an explorer-background/root context when no row target is intended.
- Remove/delete a file or folder from the context menu after the existing confirmation flow.
- Keep explorer tree, selected/open file tabs, and preview state coherent after successful or failed mutations.

## Out of Scope

- New bulk file-management actions.
- Redesigning the entire Files tab visual layout.
- Backend filesystem permission/path-boundary changes unless implementation reproduces a backend API failure after the frontend interaction path is fixed.
- Native OS context menu integration.

## Functional Requirements

- `REQ-FE-CM-001`: The frontend file explorer must reliably open and keep visible its app-owned context menu for supported file-tree row targets using right-click/contextmenu input while the Files panel is active. The menu must not immediately self-close because of global close-other-menu coordination.
- `REQ-FE-CM-002`: The context menu must expose and execute a create-folder action for the correct target directory. For a folder target, the new folder belongs under that folder; for a file target, it belongs beside that file; for an explorer background/root target, it belongs at the workspace root.
- `REQ-FE-CM-003`: The context menu must expose and execute a delete/remove action for removable file-tree row targets, and must not expose delete for the workspace-root/background target.
- `REQ-FE-CM-004`: Successful create/delete operations must apply the returned file-system change to the visible tree and keep open/selected/preview state consistent.
- `REQ-FE-CM-005`: Failed or cancelled operations must leave the filesystem tree unchanged and surface/record the existing app error behavior without false successful UI state.
- `REQ-FE-CM-006`: Context-menu actions must remain scoped to the active workspace ID provided by `useWorkspaceFileExplorer`; no context action may target a path outside the active workspace boundary.
- `REQ-FE-CM-007`: The context action interaction must be testable without relying on a physical right mouse button by exercising DOM `contextmenu` events, and the UI should remain compatible with browser/Electron-generated contextmenu input.

## Acceptance Criteria

- `AC-FE-CM-001`: In the Files tab, right-clicking or dispatching a standard DOM `contextmenu` event on a visible file or folder row opens the app context menu at the pointer location and it remains visible after the close-other-menus cycle completes.
- `AC-FE-CM-002`: Right-clicking the explorer background/root area opens a context menu that allows root-level create-folder/create-file actions but not row-only delete/rename actions.
- `AC-FE-CM-003`: Selecting create-folder for a folder target creates the folder under that folder, and the new folder appears in the tree without a full app restart.
- `AC-FE-CM-004`: Selecting create-folder for a file target creates the folder beside the file, and the new folder appears in the containing folder without a full app restart.
- `AC-FE-CM-005`: Selecting delete/remove for a file or folder target shows the existing confirmation flow; confirming removes the intended target and updates the tree without a full app restart.
- `AC-FE-CM-006`: If the currently previewed/open file is deleted directly or through a deleted containing folder, the preview/tabs transition to the established no-file/remaining-file state instead of showing stale content.
- `AC-FE-CM-007`: Cancelling delete or create closes the dialog/menu without calling the mutation action.
- `AC-FE-CM-008`: Mutation failure keeps the visible tree unchanged and stores/logs the existing mutation error state rather than showing a false successful mutation.
- `AC-FE-CM-009`: Existing left-click selection, expand/collapse, lazy child loading, search/filter, drag/drop, and file-preview behavior continue to work.
- `AC-FE-CM-010`: Frontend automated tests cover top-level and nested row context-menu visibility after close-signal propagation, row create-folder dispatch, row delete confirmation dispatch, root/background create-folder dispatch, inactive-panel guard behavior, and exact/containing-folder delete cleanup of open/active file state.

## Constraints / Dependencies

- Must use `useWorkspaceFileExplorer` / `useFileExplorerStore` as the existing frontend mutation boundary.
- Must preserve backend GraphQL mutation contracts and workspace path scoping.
- Must not introduce compatibility-only duplicate action paths.
- Must preserve the Files panel inactivity/quiescence behavior introduced for file-explorer performance unless implementation proves that active-state propagation is the direct regression.

## Assumptions

- The reported issue is in `autobyteus-web`'s desktop file explorer, not the mobile file browser.
- The screenshot is from the current app Files tab/right-panel file explorer.
- The user expects create-folder to be available from the context menu at both row targets and the file explorer root/background.

## Risks / Open Questions

- The exact user-observed failure mode is now known: the app context menu does not remain open at all.
- Live browser reproduction used the already-running desktop-backed workspace tab with visible file rows; the local-dev route-only probe earlier had no active workspace, but the later active tab reproduction did hit the actual Files tree.
- The 2026-05-29 close-signal attachment in `FileExplorer.vue` is the proven regression interaction with the older per-row close event dispatch in `FileItem.vue`.

## Requirement-To-Use-Case Coverage

- File-tree row right-click menu: `REQ-FE-CM-001`, `REQ-FE-CM-006`, `REQ-FE-CM-007`; `AC-FE-CM-001`, `AC-FE-CM-009`, `AC-FE-CM-010`
- Root/background create: `REQ-FE-CM-002`, `REQ-FE-CM-006`; `AC-FE-CM-002`, `AC-FE-CM-010`
- Create folder mutation: `REQ-FE-CM-002`, `REQ-FE-CM-004`, `REQ-FE-CM-005`; `AC-FE-CM-003`, `AC-FE-CM-004`, `AC-FE-CM-007`, `AC-FE-CM-008`
- Delete/remove mutation: `REQ-FE-CM-003`, `REQ-FE-CM-004`, `REQ-FE-CM-005`; `AC-FE-CM-005`, `AC-FE-CM-006`, `AC-FE-CM-007`, `AC-FE-CM-008`

## Acceptance-Criteria-To-Scenario Intent

- `AC-FE-CM-001`: Basic active row contextmenu event handling and menu visibility after close-signal propagation.
- `AC-FE-CM-002`: Root/background context target support without invalid delete/rename actions.
- `AC-FE-CM-003`: Positive folder-target create-folder mutation and tree refresh.
- `AC-FE-CM-004`: Positive file-target sibling create-folder mutation and tree refresh.
- `AC-FE-CM-005`: Positive delete/remove mutation and tree refresh after confirmation.
- `AC-FE-CM-006`: Open/active file cleanup after direct or containing-folder deletion.
- `AC-FE-CM-007`: Cancel correctness.
- `AC-FE-CM-008`: Error correctness.
- `AC-FE-CM-009`: Adjacent explorer behavior regression protection.
- `AC-FE-CM-010`: Durable validation for the context-menu interaction spine, recursive row transport, and delete content-state cleanup.

## Approval Status

Approved by user on 2026-06-01. User explicitly requested a design-principles-based refactor/design-health assessment when refactoring is warranted.
