# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-file-explorer-context-menu/tickets/in-progress/frontend-file-explorer-context-menu/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-file-explorer-context-menu/tickets/in-progress/frontend-file-explorer-context-menu/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-file-explorer-context-menu/tickets/in-progress/frontend-file-explorer-context-menu/design-spec.md`
- Current Review Round: 2
- Trigger: Re-review after `solution_designer` reworked Round 1 findings.
- Prior Review Round Reviewed: 1
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read the revised design spec, design rework report, requirements, prior Round 1 review report, shared design principles, and current code evidence in `FileExplorer.vue`, recursive `FileItem.vue`, `fileExplorerMutationActions.ts`, `fileExplorerContentActions.ts`, and `FileExplorerTabs.vue`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review handoff | N/A | 2 | Fail | No | Found recursive row request transport gap and containing-folder delete active-file cleanup gap. |
| 2 | Reworked design handoff | AR-FE-CM-001, AR-FE-CM-002 | 0 | Pass | Yes | Both prior findings are resolved with concrete owner/interface/test updates. |

## Reviewed Design Spec

The revised design is implementation-ready. It preserves the correct core direction from Round 1 and now resolves the previously blocking gaps:

- Recursive row context requests use an injected `requestFileExplorerContextMenu(request)` callback provided by `FileExplorer.vue` / `useFileExplorerContextActions`; the design no longer assumes component-event bubbling through recursive `FileItem` instances.
- Delete cleanup for exact and containing-folder paths is assigned to the store/content-state owner, with `fileExplorerMutationActions.deleteFileOrFolder` sequencing a content-state helper such as `closePathScopedFiles(deletedPath, workspaceId)` after successful GraphQL response and before/with applying the returned file-system change event.

The design still rejects legacy dual paths, keeps UI callers behind `useWorkspaceFileExplorer`, and keeps `FileContextMenu.vue` presentational.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the task as a bug fix with required targeted refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership, duplicated coordination, and responsibility drift are tied to live reproduction and current file responsibilities. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design rejects timing patches and requires a central context-action owner plus cleanup of obsolete row-owned paths. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Spines, ownership map, removal plan, dependency rules, migration sequence, and tests reflect the refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-FE-CM-001 | Major | Resolved | Revised design chooses injected callback transport: `FileExplorer.vue` provides `requestFileExplorerContextMenu`; every recursive `FileItem.vue` injects/calls it with normalized `FileExplorerContextRequest`; nested-row tests are required. | No recursive emit-bubbling assumption remains. |
| 1 | AR-FE-CM-002 | Major | Resolved | Revised design adds `fileExplorerContentActions.ts` ownership for path-scoped open/active file cleanup and `fileExplorerMutationActions.deleteFileOrFolder` sequencing; store tests cover exact-file and containing-folder cleanup. | UI remains behind `useWorkspaceFileExplorer`. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-FE-CM-001 | Row context menu from any recursive row | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-FE-CM-002 | Root/background context menu | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-FE-CM-003 | Create file/folder action | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-FE-CM-004 | Delete action | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-FE-CM-005 | Mutation return/state update | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-FE-CM-006 | Menu close lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-FE-CM-007 | Rename request bridge | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-FE-CM-008 | Active panel guard | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-FE-CM-009 | Delete path content-state cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| File explorer UI components | Pass | Pass | Pass | Pass | `FileExplorer.vue` hosts/provides the context owner; `FileItem.vue` stays row-local. |
| File explorer context-action controller | Pass | Pass | Pass | Pass | Correct owner for menu/dialog/action lifecycle and recursive row request entrypoint. |
| File explorer pure utilities | Pass | Pass | Pass | Pass | Target/action/path helpers are scoped and semantic. |
| Workspace file explorer data boundary | Pass | Pass | Pass | Pass | UI command path continues through `useWorkspaceFileExplorer`. |
| Store/backend file mutation flow | Pass | Pass | Pass | Pass | Backend unchanged; store content-state cleanup is correctly extended. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Row/root context target identity | Pass | Pass | Pass | Pass | Discriminated union avoids nullable/mixed target identity. |
| Context action ids/items | Pass | Pass | Pass | Pass | Finite action id union avoids label dispatch and duplicated policy. |
| Create target path derivation | Pass | Pass | Pass | Pass | Centralized helper/controller-private pure function is appropriate. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `FileExplorerContextTarget` | Pass | Pass | Pass | Pass | Pass | Root and node target identities are separate. |
| `FileExplorerContextActionId` | Pass | Pass | Pass | N/A | Pass | Finite scoped union. |
| `FileExplorerContextMenuItem` | Pass | Pass | Pass | N/A | Pass | Presentation item only; no command callback. |
| `FileExplorerContextRequest` | Pass | Pass | Pass | N/A | Pass | Contains normalized target and viewport position only. |
| `RequestFileExplorerContextMenu` | Pass | Pass | Pass | N/A | Pass | Callback accepts only normalized request. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Row-owned menu/dialog state | Pass | Pass | Pass | Pass | Remove from `FileItem.vue`. |
| Custom `closeAllFileContextMenus` event/signal | Pass | Pass | Pass | Pass | No compatibility wrapper or opener-id exception. |
| Hardcoded action policy inside `FileContextMenu.vue` | Pass | Pass | Pass | Pass | Replaced by owner-supplied item list. |
| Obsolete listener tests | Pass | Pass | Pass | Pass | Replaced by regression tests for visible menu and absence of old path. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `useFileExplorerContextActions.ts` | Pass | Pass | Pass | Pass | Cohesive UI command lifecycle owner. |
| `utils/fileExplorer/contextMenu.ts` | Pass | Pass | Pass | Pass | Pure target/action/path model. |
| `FileExplorer.vue` | Pass | Pass | Pass | Pass | Host/provider for one context owner and root context entry. |
| `FileItem.vue` | Pass | Pass | Pass | Pass | Recursive row renderer/caller, no menu/dialog state. |
| `FileContextMenu.vue` | Pass | Pass | Pass | Pass | Presentational renderer. |
| Dialog components | Pass | Pass | N/A | Pass | Remain presentational. |
| `fileExplorerContentActions.ts` | Pass | Pass | N/A | Pass | Correct owner for open-file list and `activeFile` invariant. |
| `fileExplorerMutationActions.ts` | Pass | Pass | N/A | Pass | Correct owner for delete success sequencing around store actions. |
| Tests | Pass | Pass | Pass | Pass | Component, utility, and store tests map to the right owners. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Context-action owner -> workspace explorer | Pass | Pass | Pass | Pass | No direct Apollo/store bypass from UI controller. |
| Recursive rows -> injected context request callback | Pass | Pass | Pass | Pass | Rows call one owner-provided callback, not event buses or recursive emits. |
| Mutation action -> content-state helper | Pass | Pass | Pass | Pass | Store-internal sequencing uses the content-state owner. |
| Menu renderer -> owner | Pass | Pass | Pass | Pass | Renderer emits action ids only. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `useFileExplorerContextActions` | Pass | Pass | Pass | Pass | Owns menu/dialog lifecycle and request entrypoint. |
| `useWorkspaceFileExplorer` | Pass | Pass | Pass | Pass | UI mutation boundary remains authoritative. |
| `FileContextMenu.vue` | Pass | Pass | Pass | Pass | Visual-only menu boundary. |
| `FileItem.vue` | Pass | Pass | Pass | Pass | Row-local UI remains separate from menu/action policy. |
| `fileExplorerContentActions.ts` | Pass | Pass | Pass | Pass | Open/active file invariant is store-owned, not UI-repaired. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `requestFileExplorerContextMenu(request)` | Pass | Pass | Pass | Low | Pass |
| `openContextMenu(request)` | Pass | Pass | Pass | Low | Pass |
| `selectAction(actionId)` | Pass | Pass | Pass | Low | Pass |
| `confirmAdd(name)` | Pass | Pass | Pass | Low | Pass |
| `confirmDelete()` | Pass | Pass | Pass | Low | Pass |
| `useWorkspaceFileExplorer.createFileOrFolder(path, isFile)` | Pass | Pass | Pass | Low | Pass |
| `useWorkspaceFileExplorer.deleteFileOrFolder(path)` | Pass | Pass | Pass | Low | Pass |
| `closePathScopedFiles(path, workspaceId)` or equivalent | Pass | Pass | Pass | Low | Pass |
| `useWorkspaceFileExplorer.renameFileOrFolder(path, newName)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/fileExplorer` | Pass | Pass | Low | Pass | Existing UI feature folder. |
| `composables/useFileExplorerContextActions.ts` | Pass | Pass | Low | Pass | Focused Vue controller/composable. |
| `utils/fileExplorer/contextMenu.ts` | Pass | Pass | Low | Pass | Pure helper/model under existing utility area. |
| `stores/fileExplorerContentActions.ts` | Pass | Pass | Low | Pass | Existing content-state owner for open/active file invariants. |
| `stores/fileExplorerMutationActions.ts` | Pass | Pass | Low | Pass | Existing mutation sequencing owner. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace-scoped mutation commands | Pass | Pass | N/A | Pass | Reuse `useWorkspaceFileExplorer`. |
| Tree mutation application | Pass | Pass | N/A | Pass | Existing `FileSystemChangeEvent` path remains authoritative. |
| Open/active file cleanup after delete | Pass | Pass | N/A | Pass | Extend store content-state/mutation actions. |
| Dialog UI | Pass | Pass | N/A | Pass | Existing presentational dialogs. |
| Menu visual renderer | Pass | Pass | N/A | Pass | Existing renderer becomes item-driven. |
| Context target/action lifecycle | Pass | Pass | Pass | Pass | New focused context-action controller is justified. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Row-owned menu vs explorer-owned menu | No | Pass | Pass | Clean-cut replacement. |
| `closeAllFileContextMenus` custom event | No | Pass | Pass | Removed rather than wrapped. |
| Recursive emit bubbling fallback | No | Pass | Pass | Explicitly rejected. |
| UI-side tab cleanup workaround | No | Pass | Pass | Cleanup stays store-owned. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Context helper and controller extraction | Pass | Pass | Pass | Pass |
| `FileExplorer.vue` / `FileItem.vue` refactor | Pass | Pass | Pass | Pass |
| Store/content-state cleanup | Pass | Pass | Pass | Pass |
| Component, utility, and store tests | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Nested row context request | Yes | Pass | Pass | Pass | Injected callback example is clear. |
| Root create | Yes | Pass | Pass | Pass | Root is explicit target kind. |
| Create path | Yes | Pass | Pass | Pass | Folder/file/root examples are clear. |
| Menu renderer | Yes | Pass | Pass | Pass | Presentational menu shape is clear. |
| Rename bridge | Yes | Pass | Pass | Pass | Row-local editor is preserved without row menu ownership. |
| Delete containing active file | Yes | Pass | Pass | Pass | Store-owned invariant and bad UI-repair shape are clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | N/A | N/A | Closed for design review. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no open findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Outside-click handling around Teleported menu items may still be event-order sensitive; implementation tests should click real menu items.
- Path-scoped delete cleanup should normalize path assumptions enough to avoid false positives/negatives, especially around root-like empty paths; root delete remains impossible by action policy.
- Existing component tests may stub too much; implementation should mount real `FileContextMenu` and dialogs where feasible for context-menu behavior.
- Keep the clean-cut removal discipline: no row-owned menu/dialog compatibility path and no `closeAllFileContextMenus` wrapper.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Ready for implementation with the revised cumulative package, including the design rework report.
