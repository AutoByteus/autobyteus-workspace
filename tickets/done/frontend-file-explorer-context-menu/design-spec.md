# Design Spec

## Current-State Read

The affected surface is the desktop right-side Files tab in `autobyteus-web`. The current runtime path for a row right-click is:

`DOM contextmenu -> FileItem.vue handleContextMenu -> document closeAllFileContextMenus event -> FileExplorer.vue close signal -> every FileItem.vue watcher -> FileContextMenu.vue`

Current ownership is fragmented:

- `FileExplorer.vue` owns workspace activation, active/inactive panel lifecycle, search, live-session acquisition, and global file-explorer listeners.
- `FileItem.vue` owns row rendering, left-click open/toggle/lazy-load, drag/drop, inline rename, per-row context-menu state, create/delete dialog state, create target path derivation, and mutation dispatch.
- `FileContextMenu.vue` renders the menu but currently hardcodes all actions and has no root-vs-row target distinction.
- `useWorkspaceFileExplorer.ts` is the authoritative workspace-scoped mutation boundary, delegating create/delete/rename/move to `useFileExplorerStore`.

The live browser reproduction found the root cause: a `FileItem` opens its own menu and dispatches the document-level `closeAllFileContextMenus` event, but the parent `FileExplorer.vue` listener added on 2026-05-29 turns that event into a close signal for all rows, including the opener. The row therefore moves from `showContextMenu=false` to `true` and then immediately back to `false` before the user can see the menu.

Constraints the target design must respect:

- Keep `useWorkspaceFileExplorer` / `useFileExplorerStore` as the authoritative mutation boundary.
- Preserve Files-panel active/inactive quiescence for cached right-side panels.
- Preserve existing left-click open/toggle, lazy child loading, search, drag/drop, and inline rename behavior.
- Do not retain compatibility-only dual context-menu paths.
- Add durable frontend validation for the close-signal regression and create/delete action paths.

## Intended Change

Replace per-row context-menu ownership with one file-explorer context-action owner hosted by `FileExplorer.vue` and implemented either directly in that component or, preferably, in a focused composable `useFileExplorerContextActions`.

Target shape:

1. `FileExplorer.vue` provides an injected `requestFileExplorerContextMenu(request)` callback owned by the context-action controller; every recursive `FileItem.vue` injects and calls that callback for row targets. `FileItem.vue` does not rely on Vue component-event bubbling, and it does not render `FileContextMenu`, add dialogs, or delete dialogs.
2. `FileExplorer.vue` owns one context menu instance, one add dialog, and one delete dialog for the whole explorer surface.
3. A normalized context target shape distinguishes row targets from root/background targets.
4. `FileExplorer.vue` handles background/root contextmenu requests and opens a root-target menu with only root-safe create actions.
5. The custom `closeAllFileContextMenus` document event and `fileExplorerCloseContextMenusSignal` injection are removed from the steady-state design.
6. Inline rename remains row-local because the input is rendered inside `FileItem.vue`; the central context-action owner requests rename through an explicit rename request signal consumed only by the matching row.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix with required targeted refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Duplicated Policy Or Coordination / File Placement Or Responsibility Drift.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: `FileItem.vue` owns per-row menu/dialog/action state while `FileExplorer.vue` owns panel/workspace lifecycle and the global close signal. The browser probe proved this split lets the parent close coordination invalidate the child opener's state. `FileItem.vue` also derives create paths and owns delete dialogs, making root/background context actions awkward and spreading action policy across rows.
- Design response: Move menu/dialog/target/action sequencing to a single explorer-level owner. Provide an injected context-menu request callback from `FileExplorer.vue` so recursive `FileItem.vue` instances at any depth can call the owner directly. Reduce `FileItem.vue` to row concerns plus row-target request normalization/callback invocation. Keep UI mutations behind `useWorkspaceFileExplorer`; extend the store/content-state owner for delete cleanup.
- Refactor rationale: A minimal reorder or `nextTick` patch would fix one symptom but would preserve the mixed ownership that caused it. The in-scope behavior depends on close-other-menu coordination, target selection, root-vs-node actions, create path derivation, and delete confirmation; those belong under one explorer context-action owner, not inside every row.
- Intentional deferrals and residual risk, if any: Full visual redesign of the Files tab and new bulk file-management actions are deferred. Keyboard-only context menu shortcuts and visible kebab buttons are not required by the approved acceptance criteria, though the design keeps standard DOM `contextmenu` testability and does not block adding keyboard/menu-button affordances later.

## Terminology

- `Context action owner`: The `FileExplorer.vue`-hosted controller that owns the visible context menu, selected target, create/delete dialogs, action selection, and root-vs-node policy.
- `Context target`: A normalized identity describing either a file-tree node or the workspace root/background.
- `Row target`: A context target created from a `TreeNode` rendered by `FileItem.vue`.
- `Root target`: A context target representing the workspace root/background rather than a concrete node.

## Design Reading Order

1. Follow the data-flow spines to see where authority moves.
2. Use the ownership map to distinguish row rendering from context-action governance.
3. Apply the file responsibility and removal plan to implement the refactor without dual paths.
4. Validate with the specified tests, especially the close-signal regression.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the per-row context-menu/dialog ownership path from `FileItem.vue` and remove the custom document `closeAllFileContextMenus` steady-state path from `FileExplorer.vue`.
- The design must not keep both the old per-row menu and new explorer-level menu active.
- The design must not introduce a compatibility wrapper that forwards old row-owned menu state into the new owner.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-FE-CM-001 | Primary End-to-End | User `contextmenu` on file/folder row | Visible app context menu for that row target | File explorer context-action owner | This is the broken path; it must not self-close. |
| DS-FE-CM-002 | Primary End-to-End | User `contextmenu` on explorer background/root | Visible root-safe app context menu | File explorer context-action owner | Adds the approved root create behavior without row-owned hacks. |
| DS-FE-CM-003 | Primary End-to-End | Menu create-file/create-folder action | Workspace-scoped `createFileOrFolder` mutation and tree update | File explorer context-action owner, then `useWorkspaceFileExplorer` | Create target path derivation must be centralized and correct. |
| DS-FE-CM-004 | Primary End-to-End | Menu delete action | Workspace-scoped `deleteFileOrFolder` mutation and tree/open-file cleanup | File explorer context-action owner, then `useWorkspaceFileExplorer` | Delete must target the intended row and update state after confirmation. |
| DS-FE-CM-005 | Return-Event | GraphQL `FileSystemChangeEvent` from mutation | Rendered tree/open files/preview state updated | `useFileExplorerStore` / workspace store | Existing mutation return path must remain authoritative, but delete content-state cleanup must be corrected. |
| DS-FE-CM-006 | Bounded Local | Context menu open state | Close on outside click, Escape, action, or inactive panel | File explorer context-action owner | This local lifecycle replaces the broken document close-all coordination. |
| DS-FE-CM-009 | Bounded Local | Deleted path content-state cleanup | Open files under the deleted path removed and `activeFile` reconciled to a remaining open file or `null` | `fileExplorerContentActions.ts` / `fileExplorerMutationActions.ts` | Satisfies AC-FE-CM-006 for deleting a folder containing the active preview/open file. |
| DS-FE-CM-007 | Bounded Local | Central rename action selection | Matching `FileItem` enters inline rename mode | File explorer context-action owner + row-local inline rename owner | Keeps inline editor row-local without letting rows own the menu. |
| DS-FE-CM-008 | Primary End-to-End | Files panel active state changes | Context menu/dialogs closed and inactive work quiesced | `FileExplorer.vue` | Preserves cached-panel behavior while preventing inactive menus/actions. |

## Primary Execution Spine(s)

- Row menu: `DOM contextmenu on any recursive FileItem -> injected requestFileExplorerContextMenu(FileExplorerContextRequest) -> FileExplorer context-action owner -> FileContextMenu renders actions`.
- Root menu: `DOM contextmenu on FileExplorer content background -> FileExplorer context-action owner -> FileContextMenu renders root-safe actions`.
- Create action: `FileContextMenu select(add-file/add-folder) -> context-action owner opens AddFileOrFolderDialog -> confirm name -> target path resolver -> useWorkspaceFileExplorer.createFileOrFolder -> fileExplorerStore mutation -> GraphQL -> FileSystemChangeEvent applied to tree`.
- Delete action: `FileContextMenu select(delete) -> context-action owner opens ConfirmDeleteDialog -> confirm -> useWorkspaceFileExplorer.deleteFileOrFolder -> fileExplorerStore mutation -> GraphQL success -> path-scoped content-state cleanup -> FileSystemChangeEvent applied to tree/open-file state`.
- Rename action: `FileContextMenu select(rename) -> context-action owner publishes targeted rename request -> matching FileItem enters inline rename -> FileItem confirm -> useWorkspaceFileExplorer.renameFileOrFolder`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-FE-CM-001 | A row right-click is normalized into an explicit row context target and handed to the explorer-level owner through an injected callback that works from every recursive `FileItem` depth. No row dispatches a document close-all event, and no component-event bubbling is assumed. | Browser event, recursive row target, injected owner callback, context-action owner, menu renderer | File explorer context-action owner | Pointer position normalization, active-panel guard, outside close lifecycle, injected callback transport |
| DS-FE-CM-002 | A background/root right-click is handled by `FileExplorer.vue` only when the event did not originate inside a row, producing a root target and root-safe menu items. | Browser event, root target, context-action owner, menu renderer | File explorer context-action owner | Event target filtering, active workspace check |
| DS-FE-CM-003 | Create actions move through the central owner, which owns the target directory calculation before calling the existing workspace mutation boundary. | Menu action, add dialog, path resolver, workspace explorer boundary, store mutation | Context-action owner then `useWorkspaceFileExplorer` | Name validation stays in existing dialog; target path join helper |
| DS-FE-CM-004 | Delete actions move through the central owner, which owns the selected row identity and confirmation state before calling the existing workspace mutation boundary. After GraphQL success, the store-owned delete sequence reconciles open/active file state for exact or containing-folder deletes. | Menu action, delete confirmation, workspace explorer boundary, store mutation, content-state cleanup | Context-action owner then `useWorkspaceFileExplorer`, then store content-state owner | Root target cannot expose delete; dialog cancel behavior |
| DS-FE-CM-005 | Mutation results return through the existing store tree update path; the UI re-renders from store/content state rather than optimistic local fake state. For delete, open/active file state is reconciled before/with applying the returned delete event. | GraphQL response, fileExplorerStore, content state, tree state, rendered rows | `useFileExplorerStore` / content-state actions | Existing structural echo handling plus corrected open/active file cleanup |
| DS-FE-CM-006 | The menu lifecycle is a local state machine inside one owner: open, choose dialog/action, close on outside/Escape/inactive. | Menu state, document outside listeners, active panel watcher | Context-action owner | Listener cleanup, no custom close-all event |
| DS-FE-CM-009 | When delete succeeds for a file or folder, content-state cleanup removes any open file whose path is the deleted file path or is beneath the deleted folder path. If the current `activeFile` was removed, the store selects the last remaining open file or `null`, so `FileExplorerTabs.vue` reaches its established remaining-file or no-file state. | Deleted path, openFiles, activeFile, tabs projection | `fileExplorerContentActions.ts` / `fileExplorerMutationActions.ts` | Path-scope matching, active-file fallback selection |
| DS-FE-CM-007 | Rename remains an inline row editor, but the context menu no longer lives in the row. The central owner publishes a targeted rename request; only the matching row responds. | Rename request, matching row, inline input, rename mutation | Context-action owner for request; `FileItem.vue` for inline editor | Request id dedupe, id/path matching |
| DS-FE-CM-008 | When the Files panel becomes inactive, the explorer closes menu/dialog state and releases active work while preserving the existing right-side panel cache behavior. | Active prop, FileExplorer lifecycle, context-action owner | `FileExplorer.vue` | Live-session release, search abort, listener cleanup |

## Spine Actors / Main-Line Nodes

- User/browser DOM event.
- `FileItem.vue` recursive row target request caller.
- `FileExplorer.vue` context-action host.
- `useFileExplorerContextActions` context-action owner.
- `FileContextMenu.vue` presentational menu renderer.
- `AddFileOrFolderDialog.vue` and `ConfirmDeleteDialog.vue` presentational dialogs.
- `useWorkspaceFileExplorer.ts` workspace-scoped mutation boundary.
- `useFileExplorerStore` mutation/state owner.
- `fileExplorerContentActions.ts` open/active file state owner.

## Ownership Map

| Owner / Node | Owns | Must Not Own |
| --- | --- | --- |
| `FileExplorer.vue` | Workspace/panel lifecycle, tree container, background/root context event entry, hosting one menu/dialog owner, providing rename requests to rows | Per-row inline edit internals, direct GraphQL calls, duplicate per-row menus |
| `useFileExplorerContextActions` | Current context target, menu visibility/position, action list policy, add/delete dialog state, create path derivation, delete target, outside/Escape close lifecycle, rename request emission | Tree rendering, left-click open/toggle, drag/drop, direct store mutation bypasses |
| `FileItem.vue` | Row rendering, left-click open/toggle/lazy-load, drag/drop, inline rename input and confirm/cancel, row context target normalization and injected callback invocation from any recursive depth | `FileContextMenu`, add/delete dialogs, create/delete path policy, document close-all coordination, recursive component-event transport policy |
| `FileContextMenu.vue` | Rendering provided menu items at a provided position and emitting selected action ids | Workspace knowledge, root-vs-node policy, hardcoded mutation dispatch |
| `AddFileOrFolderDialog.vue` | Existing add dialog UI and name confirm/cancel | Final path derivation, workspace mutation dispatch |
| `ConfirmDeleteDialog.vue` | Existing delete confirmation UI and confirm/cancel | Delete target ownership, workspace mutation dispatch |
| `useWorkspaceFileExplorer.ts` | Workspace-scoped file explorer commands and state projection | UI context menu lifecycle |
| `useFileExplorerStore` | GraphQL mutation calls, returned file-system change application, and workspace file content state through composed action groups | UI menu/dialog state |
| `fileExplorerContentActions.ts` | Open file list and `activeFile` invariants for one workspace | Context-menu UI, GraphQL transport, tree rendering |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Injected `requestFileExplorerContextMenu` callback | `FileExplorer.vue` / `useFileExplorerContextActions` | Converts a row DOM event from any recursive `FileItem` depth into an explicit context target request delivered to the owner | Menu visibility, action policy, create/delete dialogs |
| `FileContextMenu` `select` emit | `useFileExplorerContextActions` | Keeps menu rendering separate from action execution | Target policy, workspace mutation dispatch |
| Existing `useWorkspaceFileExplorer` methods | `useFileExplorerStore` and workspace store | Stable workspace-scoped mutation boundary | UI action target selection or dialog lifecycle |
| Store content-state helper such as `closePathScopedFiles(path, workspaceId)` | `fileExplorerContentActions.ts` | Removes open files under a deleted path and reconciles `activeFile` | UI callers; UI must still call `useWorkspaceFileExplorer` |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `FileItem.vue` `showContextMenu` and `contextMenuPosition` state | Per-row menu state caused opener self-close and duplicates menu ownership | `useFileExplorerContextActions` menu state | In This Change | Remove with the row-rendered `FileContextMenu`. |
| `FileItem.vue` imports/renders of `FileContextMenu`, `ConfirmDeleteDialog`, `AddFileOrFolderDialog` | Dialog/menu should be explorer-level, not per-row | `FileExplorer.vue` hosted components | In This Change | `FileItem.vue` keeps inline rename only. |
| `FileItem.vue` `document.dispatchEvent(new Event('closeAllFileContextMenus'))` | Proven self-close regression path | Single owner state; outside/Escape close lifecycle | In This Change | Do not replace with another global close-all custom event. |
| `fileExplorerCloseContextMenusSignal` provide/inject/watch | Only needed for fragmented per-row menus | Single explorer-level menu owner | In This Change | Existing active/inactive lifecycle remains. |
| `FileExplorer.vue` `closeAllFileContextMenus` document listener | Its current signal closes opener rows and is unnecessary with one menu | Context owner close methods | In This Change | Keep dragover/dragend listeners as needed. |
| Hardcoded action policy inside `FileContextMenu.vue` | Menu renderer cannot distinguish root-vs-node actions cleanly | Action item list from context-action owner | In This Change | Component may still own visual label rendering from provided item data. |
| Tests expecting `closeAllFileContextMenus` listener attachment | Obsolete old behavior | Tests for absence/self-close regression and single owner behavior | In This Change | Update `FileExplorer.spec.ts`. |

## Return Or Event Spine(s) (If Applicable)

- Mutation return spine: `GraphQL mutation response -> serialized FileSystemChangeEvent -> useFileExplorerStore mutation action -> content-state cleanup for delete -> handleFileSystemChange -> tree/content state -> FileExplorer/FileItem/FileExplorerTabs render`.
- Stream echo spine remains unchanged: `backend filesystem event -> workspaceStore.handleFileSystemChange -> fileExplorerStore echo filtering/tree state -> render`. The context-menu design must not bypass this path with local fake tree changes.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `useFileExplorerContextActions`.
  - Menu lifecycle chain: `open(request) -> visible menu -> select action or outside/Escape/inactive -> close menu -> cleanup listeners`.
  - Why it matters: it replaces the broken custom document close-all coordination with one local owner.
- Parent owner: `FileItem.vue`.
  - Inline rename chain: `rename request matches row -> input visible -> enter confirms or blur cancels -> renameFileOrFolder or no-op`.
  - Why it matters: rename UI is physically row-local, but menu ownership is not.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Context target normalization | DS-FE-CM-001, DS-FE-CM-002 | Context-action owner | Convert row/root context into explicit identity shape | Avoid passing mutable component internals as action identity | Ambiguous targets and path bugs |
| Recursive row request transport | DS-FE-CM-001 | `FileExplorer.vue` / context-action owner | Provide an injected callback that every recursive `FileItem` calls directly | Vue component emits do not bubble through recursive component boundaries | Nested row context menus would stop working after row menu removal |
| Context menu action list derivation | DS-FE-CM-001, DS-FE-CM-002 | Context-action owner | Return root-safe or node actions | Delete/rename must be impossible for root targets | Root menu could expose invalid operations |
| Create parent path resolution | DS-FE-CM-003 | Context-action owner | Folder target -> child; file target -> sibling; root target -> root | Centralizes currently row-local path derivation | Duplicate path policy across rows/root |
| Outside click and Escape close | DS-FE-CM-006 | Context-action owner | Close one active menu/dialog lifecycle safely | Replaces custom close-all event | Self-close or leaked listeners |
| Active panel guard | DS-FE-CM-001, DS-FE-CM-008 | `FileExplorer.vue` / context-action owner | Ignore/open/close actions only while active | Preserves cached inactive panel behavior | Hidden inactive panel can mutate UI state |
| Inline rename bridge | DS-FE-CM-007 | Context-action owner + `FileItem.vue` | Route central rename action to matching row editor | Keeps row-local UI without row menu ownership | Parent would need awkward DOM/input control or rows would keep menu ownership |
| Existing mutation/state application | DS-FE-CM-003, DS-FE-CM-004, DS-FE-CM-005 | `useWorkspaceFileExplorer` / store | Call GraphQL and apply returned event | Existing authoritative backend/store boundary | UI would bypass store and desync tree |
| Path-scoped open/active file cleanup | DS-FE-CM-004, DS-FE-CM-005, DS-FE-CM-009 | `fileExplorerMutationActions.ts` / `fileExplorerContentActions.ts` | Remove exact/descendant open files and reset `activeFile` after delete | AC-FE-CM-006 requires no stale active preview after containing-folder delete | Tabs can show unsupported/no-data state for stale active path |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Workspace-scoped create/delete/rename/move | `useWorkspaceFileExplorer` and `useFileExplorerStore` | Reuse | Already owns workspace ID scoping and GraphQL mutation dispatch | N/A |
| Tree mutation application | `fileExplorerStore` / `utils/fileExplorer/fileUtils.ts` | Reuse | Already applies `FileSystemChangeEvent` | N/A |
| Open/active file cleanup after delete | `fileExplorerContentActions.ts` and `fileExplorerMutationActions.ts` | Extend | Current exact-path `closeFile` plus descendant `openFiles` filter leaves descendant `activeFile` stale; add one content-state owner method for path-scoped cleanup and call it from delete mutation action | N/A |
| Add/delete dialog UI | Existing `AddFileOrFolderDialog.vue`, `ConfirmDeleteDialog.vue` | Reuse | Dialogs are presentational and already fit | N/A |
| Menu visual renderer | Existing `FileContextMenu.vue` | Extend | Keep visual component, change action data source | N/A |
| Context menu target/action lifecycle | No healthy existing owner; current row ownership is defective | Create New / Extend FileExplorer | Needs one owner for target, menu, dialogs, and close lifecycle | Existing `useWorkspaceFileExplorer` owns data/mutations, not UI action lifecycle |
| Path helper for context targets | `utils/fileExplorer` folder | Extend | Existing folder owns file-explorer pure helpers | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| File explorer UI components | Tree rendering, row interaction, menu/dialog presentation, root/background context entry | DS-FE-CM-001, DS-FE-CM-002, DS-FE-CM-007, DS-FE-CM-008 | `FileExplorer.vue`, `FileItem.vue` | Extend | Main code changes live here. |
| File explorer context-action controller | Current target, recursive row request callback, menu/dialog lifecycle, action policy, path derivation | DS-FE-CM-001, DS-FE-CM-002, DS-FE-CM-003, DS-FE-CM-004, DS-FE-CM-006, DS-FE-CM-007, DS-FE-CM-008 | `FileExplorer.vue` | Create New | Focused owner, likely a composable. |
| File explorer pure utilities | Normalized context target types and path helpers | DS-FE-CM-001 to DS-FE-CM-004 | Context-action controller and tests | Extend | Keep helpers semantic and small. |
| Workspace file explorer data boundary | Workspace-scoped commands and store projection | DS-FE-CM-003, DS-FE-CM-004, DS-FE-CM-005, DS-FE-CM-009 | Context-action controller, `FileItem.vue` rename | Reuse | No GraphQL contract changes; underlying store cleanup is extended. |
| Store/backend file mutation flow | GraphQL mutations, returned change application, delete-time open/active file cleanup | DS-FE-CM-004, DS-FE-CM-005, DS-FE-CM-009 | `useWorkspaceFileExplorer`, `useFileExplorerStore` | Extend | Backend unchanged; frontend content-state cleanup changes. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useFileExplorerContextActions.ts` | File explorer context-action controller | Context-action owner | Menu target state, menu action selection, add/delete dialog state, create path derivation, close lifecycle, rename request, recursive row request entrypoint | Cohesive lifecycle/controller concern serving `FileExplorer.vue` and its recursive descendants | Yes, context target/action helper types |
| `autobyteus-web/utils/fileExplorer/contextMenu.ts` | File explorer pure utilities | Context target/action model | Normalized context target, action ids/items, path helpers | Pure reusable file avoids duplicating path logic in component and tests | N/A |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | File explorer UI components | Tree/context host | Host context controller, provide injected `requestFileExplorerContextMenu` callback, root background context handler, render one menu/dialog set, provide rename request | Parent already owns workspace/panel context and can provide callbacks to all recursive descendants | Yes |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | File explorer UI components | Row renderer/editor | Inject and call `requestFileExplorerContextMenu`; keep left click, lazy load, drag/drop, inline rename | Row-local visual/interaction concerns only; injection works for recursive descendants without re-emission | Yes, context target normalizer |
| `autobyteus-web/components/fileExplorer/FileContextMenu.vue` | File explorer UI components | Presentational menu | Render provided menu items and emit selected action id | Visual renderer only | Yes, menu item/action id type |
| `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.spec.ts` | Validation | Component integration tests | Context menu regression, nested-row request transport, root menu, and action dispatch tests | Existing parent-level tests can mount real recursive FileItem/menu/dialog interactions | Yes |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | File explorer content-state owner | Open/active file state | Add a path-scoped close helper that removes open files at or under a deleted path and reconciles `activeFile` | Existing file owns open/active file commands | N/A |
| `autobyteus-web/stores/fileExplorerMutationActions.ts` | File explorer mutation owner | Delete mutation sequencing | Replace exact close + descendant filter with content-state helper call before/with applying delete event | Existing file owns GraphQL mutation sequencing | N/A |
| `autobyteus-web/stores/__tests__/fileExplorerStore.spec.ts` | Validation | Store content-state coverage | Add exact-file and containing-folder delete cleanup tests | Existing store test covers delete mutation behavior | N/A |
| `autobyteus-web/utils/fileExplorer/__tests__/contextMenu.test.ts` | Validation | Pure utility tests | Path/action target derivation | Pure helpers need focused edge tests | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Row/root context target identity | `utils/fileExplorer/contextMenu.ts` | File explorer pure utilities | Used by `FileItem`, controller, menu/tests | Yes: store only `kind`, `nodeId`, `path`, `name`, `isFile` for node targets | Yes: do not pass both `TreeNode` and copied fields | A generic filesystem DTO for backend APIs |
| Context action ids/items | `utils/fileExplorer/contextMenu.ts` | File explorer pure utilities | Used by controller and `FileContextMenu` | Yes: action id is singular source, label/icon presentation data separated | Yes: no hardcoded duplicate action lists in component/tests | A broad app-wide menu framework |
| Create target path derivation | `utils/fileExplorer/contextMenu.ts` or controller-private pure functions | File explorer pure utilities | Used by create action and tests | Yes: one parent path meaning | Yes: no parallel file/folder path branches in components | A generic path library with OS filesystem behavior |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `FileExplorerContextTarget` | Yes | Yes | Low | Use discriminated union: root has no node fields; node has explicit UI/mutation identity fields. |
| `FileExplorerContextActionId` | Yes | Yes | Low | Keep as finite union: `add-file`, `add-folder`, `rename`, `delete`. |
| `FileExplorerContextMenuItem` | Yes | Yes | Low | Presentation data only: id, label, icon. No target or mutation callbacks. |
| `FileExplorerContextRequest` | Yes | Yes | Low | Contains only target and viewport position. No raw DOM event after normalization. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useFileExplorerContextActions.ts` | File explorer context-action controller | Context-action owner | Owns menu/dialog lifecycle, target state, recursive row request entrypoint, action selection, create/delete dispatch via `useWorkspaceFileExplorer`, rename request state, outside/Escape/inactive close | One coherent UI command lifecycle owner | `FileExplorerContextTarget`, action ids, path helpers |
| `autobyteus-web/utils/fileExplorer/contextMenu.ts` | File explorer pure utilities | Context target/action model | Defines normalized target/request/action item types plus pure target path/action-list helpers | Small, semantic, testable pure model | N/A |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | File explorer UI components | Explorer host | Uses the context-action controller, handles root/background contextmenu, provides injected row request callback, renders one `FileContextMenu`, one add dialog, one delete dialog, provides rename request | Parent already owns workspace and active state | Shared context types |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | File explorer UI components | Row renderer/editor | Injects and calls context-menu request callback; keeps left click/toggle/lazy load/drag/drop; watches targeted rename request for inline rename | Removes mixed menu/dialog policy from row and supports nested rows | Shared context target normalizer |
| `autobyteus-web/components/fileExplorer/FileContextMenu.vue` | File explorer UI components | Presentational menu | Accepts `items` and `position`; emits `select(actionId)`; no workspace or target policy | Keeps visual rendering separate from behavior | Menu item/action id type |
| `autobyteus-web/components/fileExplorer/AddFileOrFolderDialog.vue` | File explorer UI components | Presentational add dialog | Unchanged unless minor prop typing is needed | Existing dialog remains cohesive | N/A |
| `autobyteus-web/components/fileExplorer/ConfirmDeleteDialog.vue` | File explorer UI components | Presentational confirm dialog | Unchanged | Existing dialog remains cohesive | N/A |
| `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.spec.ts` | Validation | Parent integration coverage | Add tests for top-level and nested row menu visibility after close lifecycle, row add/delete dispatch, root menu actions, inactive guard | Parent is the new behavior owner and provider of recursive callback | Shared test helpers/context target types |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | File explorer content-state owner | Open/active file state owner | Add path-scoped cleanup helper for deleted file/folder path | Keeps AC-FE-CM-006 state invariant behind store boundary | N/A |
| `autobyteus-web/stores/fileExplorerMutationActions.ts` | File explorer mutation owner | Delete mutation sequence | Call path-scoped content cleanup after successful delete response and before/with applying returned change event | Mutation action already owns delete success sequencing | N/A |
| `autobyteus-web/stores/__tests__/fileExplorerStore.spec.ts` | Validation | Store cleanup regression coverage | Exact file delete and containing-folder delete active/open file cleanup tests | Store is content-state owner for FileExplorerTabs projection | N/A |
| `autobyteus-web/components/fileExplorer/__tests__/FileItem.spec.ts` | Validation | Row behavior coverage | Update/remove old stubs; assert row calls injected context request callback and keeps lazy/load/open behavior | Row no longer owns menu/dialogs; no recursive emit assumption | Shared context types |
| `autobyteus-web/utils/fileExplorer/__tests__/contextMenu.test.ts` | Validation | Pure helper coverage | Validate root/folder/file action lists and path derivation | Pure logic is easier to validate separately | N/A |

## Ownership Boundaries

The authoritative UI action boundary for context menus is `FileExplorer.vue` through `useFileExplorerContextActions`. `FileExplorer.vue` provides the context request callback; `FileItem.vue` may initiate a context request by injecting and calling that callback, but must not own the menu state or mutation dialog state. The authoritative mutation boundary remains `useWorkspaceFileExplorer`; neither `FileExplorer.vue` nor the context-action controller should call Apollo or store internals directly for create/delete/rename/move.

Inline rename is a narrow exception because the input field physically lives in the row. The central owner owns the menu action and publishes a targeted rename request; the matching row owns the local input lifecycle and calls the existing rename mutation boundary on confirm.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useFileExplorerContextActions` | Menu target state, action policy, add/delete dialogs, close lifecycle, recursive row request entrypoint | `FileExplorer.vue`, injected callback called by every `FileItem.vue` | Rows rendering their own menus/dialogs, relying on recursive Vue emits to bubble, or dispatching document close-all events | Add explicit controller methods or request types |
| `useWorkspaceFileExplorer` | Workspace ID resolution, command calls, store delegation | Context-action controller, `FileItem.vue` rename confirm | Direct Apollo/store mutation calls from UI components for context actions | Add/extend a workspace explorer method |
| `FileContextMenu.vue` visual boundary | DOM/CSS rendering and item selection emit | `FileExplorer.vue` context host | Menu component deciding root-vs-node target policy or calling mutations | Pass a richer item list/action id from owner |
| `FileItem.vue` row boundary | Row rendering, inline editor, drag/drop, left-click behavior | `FileExplorer.vue` tree renderer and provided context callback | Parent manipulating row DOM directly for inline rename; recursive emit chains as required transport | Use targeted rename request injection and injected context request callback |
| `fileExplorerContentActions.ts` content-state boundary | Open files, active file, content display state invariants | `fileExplorerMutationActions.ts`, file explorer tabs projection | UI components directly filtering tabs/active file after mutations | Add/extend internal content-state actions |

## Dependency Rules

Allowed:

- `FileExplorer.vue` must provide one injected `requestFileExplorerContextMenu` callback from the context-action owner.
- `FileItem.vue` may import pure context target helpers and call the injected `requestFileExplorerContextMenu(FileExplorerContextRequest)` callback from any recursive depth.
- `FileExplorer.vue` may use `useFileExplorerContextActions`, render `FileContextMenu`, and render existing dialogs.
- `useFileExplorerContextActions` may call `useWorkspaceFileExplorer` commands passed to it or available from `FileExplorer.vue`.
- `fileExplorerMutationActions.ts` may call a content-state action such as `closePathScopedFiles(path, workspaceId)` before/with applying a successful delete event.
- `FileContextMenu.vue` may depend on menu item/action id types but not on stores, `TreeNode`, or workspace state.
- Tests may use pure helpers and mount `FileExplorer.vue` with the store state setup.

Forbidden:

- `FileItem.vue` must not render `FileContextMenu`, `AddFileOrFolderDialog`, or `ConfirmDeleteDialog`.
- `FileItem.vue` must not dispatch `closeAllFileContextMenus`, rely on recursive Vue emit bubbling, or own create/delete action sequencing.
- `FileExplorer.vue` / context controller must not bypass `useWorkspaceFileExplorer` to call GraphQL/store internals directly.
- `FileContextMenu.vue` must not hardcode root-vs-node action policy or call mutations.
- Do not keep both row-owned and explorer-owned context menus.
- UI components must not repair delete preview state directly; that belongs to the store/content-state owner behind `useWorkspaceFileExplorer`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| Injected `requestFileExplorerContextMenu(request)` | Row context target transport | Report a row contextmenu request from any recursive `FileItem` to the context-action owner | `FileExplorerContextRequest` with node target and `{top,left}` | Raw DOM event should be normalized before crossing boundary; no Vue emit bubbling required. |
| `useFileExplorerContextActions.openContextMenu(request)` | Context-menu lifecycle | Open menu for a root or node target | `FileExplorerContextRequest` | Guards inactive/no-workspace state. |
| `useFileExplorerContextActions.selectAction(actionId)` | Context action | Route selected action to dialog, rename request, or close | `FileExplorerContextActionId` | No raw label/string matching outside union. |
| `useFileExplorerContextActions.confirmAdd(name)` | Create action | Resolve final path and call create command | Non-empty basename from existing dialog | Dialog remains responsible for name input/cancel. |
| `useFileExplorerContextActions.confirmDelete()` | Delete action | Confirm selected node delete | Current node target only | Root target delete impossible. |
| `useWorkspaceFileExplorer.createFileOrFolder(path, isFile)` | Workspace mutation | Create workspace file/folder | Workspace-relative path + isFile | Existing authoritative command. |
| `useWorkspaceFileExplorer.deleteFileOrFolder(path)` | Workspace mutation | Delete workspace file/folder | Workspace-relative path | Existing authoritative UI-facing command. Underlying store must reconcile open/active file state for exact and descendant paths. |
| `closePathScopedFiles(path, workspaceId)` or equivalent content action | Workspace content state | Remove exact/descendant open files and reset active file | Workspace-relative deleted path + workspace ID | Internal store action; not a UI-facing command. |
| `useWorkspaceFileExplorer.renameFileOrFolder(path, newName)` | Workspace mutation | Rename workspace file/folder | Workspace-relative path + new basename | Called by row inline editor. |

Rule application: root and node targets use an explicit discriminated union. Do not use a generic nullable `TreeNode` or path string whose identity meaning changes by context.


Concrete target/request shape for implementation:

```ts
type FileExplorerContextNodeTarget = {
  kind: 'node'
  nodeId: string
  path: string
  name: string
  isFile: boolean
}

type FileExplorerContextRootTarget = { kind: 'root' }

type FileExplorerContextTarget =
  | FileExplorerContextNodeTarget
  | FileExplorerContextRootTarget

type FileExplorerContextRequest = {
  target: FileExplorerContextTarget
  position: { top: number; left: number }
}

type FileExplorerContextActionId =
  | 'add-file'
  | 'add-folder'
  | 'rename'
  | 'delete'

type RequestFileExplorerContextMenu = (request: FileExplorerContextRequest) => void
```

The context-action composable should be constructed with the existing workspace explorer boundary and active-state signal, and `FileExplorer.vue` should provide its request entrypoint to all recursive descendants, for example:

```ts
const contextActions = useFileExplorerContextActions({
  explorer,
  panelActive,
})

provide('requestFileExplorerContextMenu', contextActions.openContextMenu)
// FileItem injects and calls this callback instead of emitting through recursion.
```

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `FileExplorerContextRequest` | Yes | Yes | Low | Use root/node discriminated target. |
| Injected `requestFileExplorerContextMenu` | Yes | Yes | Low | Function accepts only normalized request and is provided by `FileExplorer.vue`. |
| `FileExplorerContextActionId` | Yes | Yes | Low | Finite union; no label matching. |
| `openContextMenu` | Yes | Yes | Low | Accept only normalized request. |
| `confirmAdd` | Yes | Yes | Low | Uses current target owned by controller; no external path override. |
| `confirmDelete` | Yes | Yes | Low | Only valid for current node target. |
| Existing `useWorkspaceFileExplorer` commands | Yes | Yes | Low | Reuse unchanged. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Explorer-level context controller | `useFileExplorerContextActions` | Yes | Low | Name by behavior, not vague helper/support. |
| Context target union | `FileExplorerContextTarget` | Yes | Low | Keep scoped to file explorer UI. |
| Context request | `FileExplorerContextRequest` | Yes | Low | Includes target + position only. |
| Recursive request entrypoint | `requestFileExplorerContextMenu` | Yes | Low | Injection callback name states owner/action and avoids emit-bubbling ambiguity. |
| Menu item | `FileExplorerContextMenuItem` | Yes | Low | Presentation item, not command callback. |
| Row component | `FileItem.vue` | Yes | Medium if it keeps action policy | Remove menu/dialog/create/delete policy. |

## Applied Patterns (If Any)

- Local controller/composable: `useFileExplorerContextActions` owns a small UI command lifecycle for one parent component and exposes one injected request callback for recursive rows. It is not a generic service locator.
- Presentational component: `FileContextMenu.vue` remains a renderer/emitter, not a behavior owner.
- Discriminated union: `FileExplorerContextTarget` makes root-vs-node identity explicit.
- Bounded local state machine: menu lifecycle (`closed -> menu open -> dialog/rename/action -> closed`) lives inside the context-action owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/` | Folder | File explorer UI components | Tree, row, menu, dialogs, viewer UI | Existing UI subsystem for this feature | Store/backend mutation internals |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | File | Explorer host/context action entry | Host controller, provide recursive row request callback, render one menu/dialog set, background root context handler | Existing parent owning active workspace/panel | Per-row inline edit details beyond request signal |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | File | Row renderer/editor | Row visuals, click/open/toggle/lazy-load, drag/drop, inline rename, injected context request callback invocation | Existing recursive row component | Per-row menu/dialog/create/delete ownership; re-emission chains |
| `autobyteus-web/components/fileExplorer/FileContextMenu.vue` | File | Presentational menu renderer | Render provided action items at position and emit selection | Existing menu UI file | Target policy or mutation dispatch |
| `autobyteus-web/composables/useFileExplorerContextActions.ts` | File | Context-action owner | Target state, recursive row request entrypoint, action lifecycle, dialogs, close handling, path dispatch through workspace explorer | Composable isolates parent UI command lifecycle without bloating `FileExplorer.vue` | Direct GraphQL calls, row DOM manipulation, store content-state cleanup |
| `autobyteus-web/utils/fileExplorer/contextMenu.ts` | File | File explorer pure context model | Target/action types and pure path/action helpers | Existing pure utility folder for file explorer | OS path behavior, backend contracts |
| `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.spec.ts` | File | Component integration validation | Parent-owned context menu tests including nested row requests | Existing parent component test file | Backend E2E responsibilities |
| `autobyteus-web/utils/fileExplorer/__tests__/contextMenu.test.ts` | File | Pure utility validation | Target/action/path helper tests | Existing utility test folder | Component mounting |

A compact layout is clearer for this scope: the feature already lives in `components/fileExplorer`, `composables`, and `utils/fileExplorer`. No new intermediate module folder is needed because the structural depth is small and the file responsibilities are explicit.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/fileExplorer` | Mixed Justified UI component folder | Yes | Low | Existing folder contains cohesive file explorer UI components; controller host belongs here through `FileExplorer.vue`. |
| `composables` | Main-Line Domain-Control for reusable Vue controllers | Yes | Low | Existing convention for `useWorkspaceFileExplorer`; new composable owns UI command lifecycle. |
| `utils/fileExplorer` | Off-Spine Concern | Yes | Low | Pure helper/model files only; no UI state or mutations. |
| `stores` | Persistence/State owner | Yes | Low | Reused unchanged for mutation application. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Nested row context request | `FileExplorer provide(requestFileExplorerContextMenu) -> nested FileItem inject callback -> contextmenu normalizes { target: { kind: 'node', nodeId, path, name, isFile }, position } -> callback opens one menu` | `FileItem emit('request-context-menu')` with no recursive forwarding; or `document.dispatchEvent('closeAllFileContextMenus'); showContextMenu = true` | The good shape works from every recursive depth and removes self-close. |
| Root create | `FileExplorer background contextmenu -> target { kind: 'root' } -> actions [add-file, add-folder]` | Fake hidden root `FileItem` or passing `null` and branching everywhere | Root is a real target kind, not an absence of target. |
| Create path | `folder target 'docs' + 'new' -> 'docs/new'; file target 'docs/a.md' + 'new' -> 'docs/new'; root + 'new' -> 'new'` | Duplicate path derivation in every row and root handler | Prevents inconsistent create locations. |
| Menu renderer | `FileContextMenu :items="contextMenuItems" @select="selectAction"` | `FileContextMenu` hardcodes all actions and decides when delete is valid | Keeps policy in owner, rendering in renderer. |
| Rename | Central menu publishes targeted rename request; matching row opens inline input | Parent reaches into DOM to focus arbitrary row input or row keeps its own menu | Keeps row-local editor without restoring row-owned menu. |
| Delete containing active file | Deleting `docs` removes open files `docs/a.md` and `docs/sub/b.md`; if `activeFile` was one of them, active becomes the last remaining open file or `null` | UI context owner filters tabs locally after delete, or store filters openFiles but leaves `activeFile='docs/a.md'` | AC-FE-CM-006 is a content-state invariant owned by the store. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep per-row menu and only delay close signal with `nextTick`/`setTimeout` | Minimal local symptom fix | Rejected | Remove row-owned menu/dialog path; centralize menu ownership. |
| Keep custom `closeAllFileContextMenus` event and ignore opener by id | Smaller change while preserving old coordination | Rejected | A single menu owner makes close-all unnecessary. |
| Add root/background menu as another hidden `FileItem` | Reuses row menu code | Rejected | Root is explicit target kind under parent owner. |
| Call store/Apollo directly from new controller | Avoids threading `useWorkspaceFileExplorer` | Rejected | Preserve authoritative workspace mutation boundary. |
| Keep hardcoded action list in `FileContextMenu` and hide items with CSS | Quick visual-only root support | Rejected | Menu item policy belongs to context-action owner. |

## Derived Layering (If Useful)

Layering explanation after ownership:

- UI event/render layer: `FileExplorer.vue`, `FileItem.vue`, `FileContextMenu.vue`, dialogs.
- UI command lifecycle owner: `useFileExplorerContextActions`.
- Workspace command boundary: `useWorkspaceFileExplorer`.
- Store/backend state layer: `useFileExplorerStore`, GraphQL mutations, file-system change application.

The UI command lifecycle layer must not bypass the workspace command boundary.

## Migration / Refactor Sequence

1. Add pure context target/action types and helpers in `utils/fileExplorer/contextMenu.ts` with tests for:
   - folder/file/root action lists,
   - folder child create path,
   - file sibling create path,
   - root create path.
2. Add `useFileExplorerContextActions.ts` with controller state and methods:
   - open/close menu,
   - exposed `openContextMenu`/`requestFileExplorerContextMenu` entrypoint suitable for injection to recursive rows,
   - select action,
   - add/delete dialog open/confirm/cancel,
   - create path resolution,
   - rename request emission,
   - outside/Escape/inactive cleanup.
3. Modify `FileContextMenu.vue` to accept provided `items` and emit `select(actionId)`; remove internal hardcoded menu policy.
4. Modify `FileExplorer.vue`:
   - instantiate the context-action controller,
   - render one `FileContextMenu`, one `AddFileOrFolderDialog`, and one `ConfirmDeleteDialog`,
   - handle root/background contextmenu only when not inside `.file-item`,
   - provide injected `requestFileExplorerContextMenu` callback from the controller to all recursive descendants,
   - provide targeted rename request to descendants,
   - remove custom `closeAllFileContextMenus` listener/signal.
5. Modify `FileItem.vue`:
   - remove per-row menu/add/delete state and related imports,
   - inject `requestFileExplorerContextMenu` and call it with normalized row context requests,
   - keep row click/lazy load/drag/drop behavior,
   - watch targeted rename request and invoke local inline rename for matching row,
   - keep rename confirm/cancel mutation behavior.
6. Extend store/content-state cleanup for delete:
   - add a `fileExplorerContentActions.ts` helper such as `closePathScopedFiles(deletedPath, workspaceId)`,
   - remove any open file whose path equals `deletedPath` or starts with `${deletedPath}/`,
   - if the removed set contained `activeFile`, set `activeFile` to the last remaining open file or `null`,
   - call this helper from `fileExplorerMutationActions.deleteFileOrFolder` after a successful delete response and before/with applying the returned change event.
7. Update component and store tests:
   - top-level and nested row contextmenus keep the menu visible after the close lifecycle would previously have run,
   - Add Folder on folder target calls `createFileOrFolder('folder/new-name', false)`,
   - Add Folder on file target creates beside file,
   - root Add Folder creates root-level path,
   - Delete on row target opens confirm and calls `deleteFileOrFolder(path)` only after confirm,
   - store delete cleanup removes exact and descendant open files and resets `activeFile` to a remaining file or `null`,
   - root menu does not expose Delete/Rename,
   - inactive panel ignores/clears menu and does not mutate.
8. Update obsolete tests expecting `closeAllFileContextMenus` listener attachment.
9. Run targeted frontend checks:
   - `pnpm --dir autobyteus-web exec cross-env NUXT_TEST=true vitest run components/fileExplorer/__tests__/FileExplorer.spec.ts components/fileExplorer/__tests__/FileItem.spec.ts stores/__tests__/fileExplorerStore.spec.ts utils/fileExplorer/__tests__/contextMenu.test.ts`
   - Existing adjacent file explorer tests as needed.
10. Browser/API-E2E validation should reproduce the visible Files tab and verify a standard row `contextmenu` event opens a visible menu.

## Key Tradeoffs

- Centralizing the menu is a larger change than a one-line timing patch, but it removes the design cause: fragmented menu/close ownership.
- Keeping inline rename inside `FileItem.vue` avoids a heavy DOM-control refactor, while the targeted rename request prevents rows from keeping context-menu ownership.
- Adding a small pure context helper file avoids duplicating root/file/folder target path rules in components and tests.
- No backend/API changes are needed because current evidence proves a frontend lifecycle bug.

## Risks

- Teleported menu outside-click handling can accidentally close before menu-item actions if event propagation is mishandled. Mitigate with tests that click real menu items.
- Inline rename request matching must be stable. Use node id when available and path as fallback only if ids are missing.
- Root/background right-click must not steal row right-clicks. Filter `event.target.closest('.file-item')` before opening root menu.
- Inactive panel cleanup must preserve current performance behavior. Keep existing live-session/search quiescence tests updated.
- Existing `FileExplorer.spec.ts` stubs may hide real menu behavior; context-menu tests should mount real `FileContextMenu` and dialogs where feasible.
- Store content-state cleanup must not be placed in the UI controller; otherwise preview/tab state can diverge for non-context-menu deletes. The cleanup helper should be exercised through `deleteFileOrFolder`, not only by calling the helper directly.

## Guidance For Implementation

- Prefer implementing `useFileExplorerContextActions` with explicit refs/computed values rather than adding another mixed block to `FileExplorer.vue`. Construct it with `{ explorer, panelActive }` so it depends on the existing workspace boundary instead of store internals.
- Keep action ids as a finite type; do not dispatch by menu label string.
- Keep `FileContextMenu.vue` presentational. It should not import `TreeNode`, stores, or `useWorkspaceFileExplorer`.
- Do not use `setTimeout`/`nextTick` as the root fix for self-close. The root fix is ownership removal of the close-all event path.
- Make root target creation path an empty parent path and join it into `newName`, not `/newName`.
- Preserve all existing file open/toggle/lazy-load behavior in `FileItem.vue`. For rename, provide a targeted rename request ref such as `{ requestId, nodeId, path, name }`; `FileItem` should match by `nodeId` first and path second only as a fallback.
- Treat test updates as part of the refactor: remove obsolete expectations around `closeAllFileContextMenus` and add regression coverage for menu remaining visible.
