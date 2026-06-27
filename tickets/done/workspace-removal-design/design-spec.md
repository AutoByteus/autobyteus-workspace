# Design Spec

## Current-State Read

The desktop left-sidebar `Workspaces` section is currently rendered by `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` inside `AppLeftPanel.vue`. The panel fetches both `workspaceStore.fetchAllWorkspaces()` and `runHistoryStore.fetchTree()` on mount, then delegates each top-level workspace row to `WorkspaceHistoryWorkspaceSection.vue`.

Current top-level workspace rows are not governed by one workspace registry boundary. `runHistoryStore.getTreeNodes()` calls `buildRunHistoryTreeNodes(...)`, which merges:

- active/loaded workspace descriptors from `workspaceStore.allWorkspaces`; and
- run/team history groups from backend `listWorkspaceRunHistory`.

That means historical agent/team runs can independently recreate a top-level workspace row even when the user does not intend that workspace to remain loaded. Backend workspace persistence is also incomplete for the desired behavior: `WorkspaceIdMappingStore` writes app-data `workspaces.json` as a `workspaceId -> rootPath` mapping, but the `workspaces` GraphQL query currently lists `WorkspaceManager.activeWorkspaces`, not the persisted registry as the authoritative visible workspace catalog. There is no remove-workspace mutation and no workspace-row action in the frontend.

The approved product model changes that ownership: the persisted workspace registry is the authority for visible top-level workspace rows; run/team history becomes child data requested for a registered workspace when the user expands/selects that workspace. Removing a workspace deletes only the registry entry and closes active workspace/file-explorer state. It does not delete files, run history, memory, or artifacts.

## Intended Change

Implement `Remove from Workspaces` as a row-specific action on each removable registered workspace row. Refactor the workspace tree so:

1. top-level workspace rows come from the persisted workspace registry returned by the backend `workspaces` boundary;
2. expanding a workspace sends a workspace-scoped history request to the backend;
3. historical records for unregistered/removed workspace roots do not create top-level rows;
4. removing a workspace deletes the registry entry, closes active workspace/file-explorer state, clears relevant frontend selection/tree state, and leaves run/team history/memory/files intact; and
5. re-adding the same root recreates the registry entry and lets expansion reveal its old history again.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus required refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - `WorkspaceAgentRunsTreePanel.vue` currently loads the whole run-history tree on mount and every refresh interval.
  - `runHistoryStore.getTreeNodes()` uses both `workspaceStore.allWorkspaces` and `runHistoryStore.workspaceGroups` as top-level workspace-row sources.
  - `WorkspaceIdMappingStore` persists a mapping file but does not expose a registry list/delete boundary.
  - `WorkspaceResolver.workspaces()` returns active in-memory workspaces rather than the persisted registry as the visible catalog.
- Design response:
  - Make workspace registry/listing the authoritative boundary for top-level workspace rows.
  - Move run/team history under a registered workspace row and fetch it on expansion/selection.
  - Add explicit backend removal mutation that deletes the registry entry and closes active workspace state.
  - Add row-level UI remove action with confirmation and active-run blocking.
- Refactor rationale: A local button plus frontend filtering would preserve the core defect: old history groups would continue to recreate workspace rows. Correct behavior requires moving the top-level row ownership from history projection to the workspace registry boundary.
- Intentional deferrals and residual risk, if any:
  - Broad cleanup of the existing duplicated frontend `absolutePath` / `workspaceRootPath` fields is deferred. New registry/history boundaries must use `workspaceRootPath` as the canonical root identity and must not introduce additional parallel root fields.

## Terminology

- `Registered workspace`: a user-loaded filesystem workspace root present in the persisted workspace registry.
- `Workspace registry`: app-data `workspaces.json`, treated as the persisted authority for visible registered workspace rows.
- `Workspace history`: agent/team run history records that reference a workspace root; these records are not workspace registrations.
- `Remove from Workspaces`: delete the registered workspace entry and close active workspace UI/runtime state; do not delete files, histories, memories, or artifacts.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the desktop Workspaces tree's dependency on all historical workspace groups as top-level row sources.
- Treat removal as first-class design work: delete or decommission the old projection behavior where run history creates top-level workspace rows for roots not present in the registry.
- Decision rule: the design is invalid if it solves removal by adding a second hidden-root suppression list while leaving history as an authoritative top-level workspace source.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | `Primary End-to-End` | App/sidebar bootstrap | Registered workspace rows rendered | Workspace Registry / `WorkspaceManager` | Establishes the authoritative source for top-level rows. |
| DS-002 | `Primary End-to-End` | Workspace-row chevron expansion | Workspace history child rows rendered | Workspace history query boundary / `WorkspaceRunHistoryService` | Moves history under registered workspace rows and makes expansion send the backend request. |
| DS-003 | `Primary End-to-End` | Workspace-row remove action | Registry entry removed and UI row gone after refresh/restart | Workspace removal command / `WorkspaceManager` | Implements the customer-visible removal behavior. |
| DS-004 | `Return-Event` | Backend remove/history result | Frontend tree/selection/toast state | `WorkspaceAgentRunsTreePanel` action owner | Keeps cancel/success/failure/blocked states coherent. |
| DS-005 | `Primary End-to-End` | Header add/load workspace | Registered workspace row restored | Workspace Registry / `WorkspaceManager` | Re-add restores visibility and old history access. |

## Primary Execution Spine(s)

- DS-001: `AppLeftPanel -> WorkspaceAgentRunsTreePanel -> workspaceStore.fetchAllWorkspaces -> GraphQL workspaces -> WorkspaceResolver -> WorkspaceManager -> WorkspaceRegistryStore -> Workspace rows`
- DS-002: `Workspace row chevron -> WorkspaceAgentRunsTreePanel.onToggleWorkspace -> runHistoryStore.fetchWorkspaceHistory(workspaceId) -> GraphQL workspaceRunHistory -> WorkspaceRunHistoryService -> Workspace child history rows`
- DS-003: `Workspace row remove -> ConfirmationModal -> useWorkspaceHistoryWorkspaceRemoval -> runHistoryStore.removeWorkspace -> workspaceStore.removeWorkspace -> GraphQL removeWorkspace -> WorkspaceResolver -> WorkspaceRemovalGuard -> WorkspaceManager.removeRegisteredWorkspace -> WorkspaceRegistryStore.delete -> Frontend cleanup`
- DS-005: `Header + -> useWorkspaceHistoryWorkspaceCreation -> workspaceStore.createWorkspace -> GraphQL createWorkspace -> WorkspaceManager.createWorkspace -> WorkspaceRegistryStore.upsert -> Workspace row restored`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | On startup, the sidebar asks for registered workspaces. Backend reads app-data registry entries and returns metadata. The frontend renders one top-level row per registered real workspace. | Panel, workspace store, GraphQL workspace boundary, WorkspaceManager, registry store | Workspace registry via `WorkspaceManager` | Metadata mapping, temp/skill filtering, localization |
| DS-002 | When the user expands a registered workspace, the frontend requests history for that workspace ID. Backend resolves the ID through the registry to a root path and returns agent/team history for that root. | Row action, run history store, GraphQL run-history boundary, WorkspaceRunHistoryService | Workspace history query boundary | Per-workspace loading/error cache, periodic refresh only for expanded rows |
| DS-003 | The row-level remove action opens confirmation. Confirming calls backend removal. Backend blocks active work, closes active workspace/file-explorer state, deletes the registry entry, and returns success. Frontend removes the row and clears related state. | Row remove action, removal composable, workspace store, GraphQL workspace boundary, WorkspaceManager, registry store | Workspace removal command via `WorkspaceManager` | Active-run guard, file-explorer cleanup, selection cleanup, toast/error messaging |
| DS-004 | Success/failure returns to the panel. Success prunes row/expansion/history cache; failure leaves state unchanged and reports why. | Backend result, panel action owner, stores | `WorkspaceAgentRunsTreePanel` action owner | Confirmation/cancel state, toasts |
| DS-005 | Re-adding a previously removed root creates/upserts the registry entry. Since history records were never deleted, later expansion can show old history. | Header create action, workspace store, GraphQL workspace boundary, WorkspaceManager, registry store | Workspace registry via `WorkspaceManager` | Native folder picker, inline path entry |

## Spine Actors / Main-Line Nodes

- `WorkspaceAgentRunsTreePanel`: frontend container/action owner for the Workspaces section.
- `workspaceStore`: frontend workspace metadata registry state and GraphQL workspace transport owner.
- `runHistoryStore`: frontend per-workspace history cache and child-row projection owner.
- `WorkspaceResolver`: GraphQL transport boundary for workspace registry create/list/remove.
- `RunHistoryResolver`: GraphQL transport boundary for workspace-scoped history reads.
- `WorkspaceManager`: backend owner of registered workspace lifecycle and active workspace instances.
- `WorkspaceRegistryStore`: persistence owner for app-data `workspaces.json` registry entries.
- `WorkspaceRunHistoryService`: backend owner for grouping run/team history by a resolved registered workspace root.

## Ownership Map

| Node | Owns |
| --- | --- |
| `WorkspaceAgentRunsTreePanel` | Section lifecycle, row action wiring, confirmation modals, refresh cadence for expanded histories, parent-level state cleanup after removal. |
| `WorkspaceHistoryWorkspaceSection` | Visual layout for workspace/agent/team rows only; must not own persistence, history fetching, or removal policy. |
| `workspaceStore` | Frontend registered workspace metadata, workspace create/remove GraphQL calls, local workspace metadata cleanup, file-explorer live-session cleanup delegation. |
| `runHistoryStore` | Per-workspace history cache, loading/error state by workspace ID, child history projection for registered workspace rows, selected-history cleanup for removed workspaces. |
| `WorkspaceResolver` | GraphQL request/response boundary for workspace list/create/remove commands. |
| `WorkspaceManager` | Backend registered filesystem workspace lifecycle, active workspace close/unregister, registry upsert/delete/list. |
| `WorkspaceRegistryStore` | Durable JSON registry entries (`workspaceId -> workspaceRootPath`) and canonical root normalization. |
| `WorkspaceRunHistoryService` | Run/team history grouping for one resolved workspace root. |
| `WorkspaceRemovalGuard` | Active run/team blocking policy before registry deletion. |

If a public facade exists: GraphQL resolvers are thin transport facades. `WorkspaceManager` and `WorkspaceRunHistoryService` are the governing owners behind them.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceResolver.workspaces/createWorkspace/removeWorkspace` | `WorkspaceManager` | GraphQL transport boundary | Registry persistence details, file-watcher lifecycle internals, active-run policy. |
| `RunHistoryResolver.workspaceRunHistory` | `WorkspaceRunHistoryService` plus registered workspace resolution | GraphQL transport boundary | Top-level workspace visibility or registry mutation. |
| `WorkspaceHistoryWorkspaceSection` | `WorkspaceAgentRunsTreePanel` action owner | Render rows with scoped callbacks | Removal policy, backend calls, history cache. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| History groups as authoritative top-level workspace row sources in `buildRunHistoryTreeNodes` / `buildRunTreeProjection` | Violates approved model; removed workspaces reappear from history | Registry-derived workspace descriptors from `workspaceStore.allWorkspaces` | In This Change | History can still populate children of registered rows. |
| Desktop `WorkspaceAgentRunsTreePanel` mount-time global `runHistoryStore.fetchTree()` for tree rows | Loads all workspace history before user expands a row and preserves wrong ownership | Per-workspace `fetchWorkspaceHistory(workspaceId)` on expansion | In This Change | Periodic refresh should only refresh expanded workspace histories. |
| Any hidden-root suppression list design | Adds a second visibility authority instead of fixing the source of top-level rows | `WorkspaceRegistryStore` as sole top-level row authority | In This Change | Explicitly rejected. |
| `WorkspaceIdMappingStore` as only an ID lookup helper | The file/class name and API hide its new role as visible workspace registry | `WorkspaceRegistryStore` or an equivalent renamed owner | In This Change | Preserve existing JSON shape if possible; update imports/tests. |
| Header-level remove affordance | Ambiguous target | Row-level `Remove from Workspaces` action | In This Change | Header `+` remains add/load only. |

## Return Or Event Spine(s) (If Applicable)

- Remove success: `WorkspaceManager -> WorkspaceResolver result -> workspaceStore.removeWorkspace -> runHistoryStore cleanup -> WorkspaceAgentRunsTreePanel row state -> Toast`.
- Remove blocked/failure: `WorkspaceRemovalGuard / WorkspaceManager -> WorkspaceResolver result/error -> workspaceStore.removeWorkspace throws/returns false -> removal composable -> row remains visible + error toast`.
- History load success/failure: `WorkspaceRunHistoryService -> RunHistoryResolver -> runHistoryStore workspace cache/loading/error -> expanded row children/loading/error state`.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `WorkspaceAgentRunsTreePanel`.

`Expanded workspace set -> refresh timer tick -> refresh only expanded workspace history caches -> row children update`

This matters because the current global 5-second history refresh should not reintroduce all unregistered historical workspaces.

Parent owner: `WorkspaceManager`.

`Remove command -> active-run guard -> active workspace close -> registry delete -> result`

This bounded sequence ensures the registry is not deleted while active work still depends on the workspace.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Confirmation modal copy/state | DS-003, DS-004 | `WorkspaceAgentRunsTreePanel` | Prevent accidental removal and explain non-destructive semantics | UX safety | Backend/store code would own UI decisions. |
| Active-run removal guard | DS-003 | `WorkspaceManager` | Block removal while active runs/team runs use the workspace | Prevents hiding active work | UI-only checks can race or be bypassed. |
| File-explorer live session cleanup | DS-003 | `workspaceStore` / `WorkspaceManager` | Close watchers/sessions and clear cached tree state | Avoid stale watcher/UI state | Registry deletion would leave live resources. |
| Per-workspace history cache | DS-002, refresh bounded spine | `runHistoryStore` | Store child history, loading, and errors by workspace ID | Supports on-demand expansion | Row components would start owning data fetching. |
| Registry persistence | DS-001, DS-003, DS-005 | `WorkspaceRegistryStore` | Read/write app-data `workspaces.json` | Durable source of visible workspace rows | History or UI would become source of truth. |
| Localization strings | DS-003, DS-004 | UI localization subsystem | User-facing copy for remove/confirm/error | Existing localization policy | Hardcoded literals would fail localization hygiene. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Registered workspace persistence | `autobyteus-server-ts/src/workspaces` | Extend / rename owner | `WorkspaceIdMappingStore` already writes `workspaces.json`; evolve it into registry owner. | N/A |
| Workspace active lifecycle | `WorkspaceManager` | Extend | Already owns active workspaces and file-system workspace construction. | N/A |
| Workspace GraphQL commands | `api/graphql/types/workspace.ts` | Extend | Existing workspace transport boundary. | N/A |
| Workspace-scoped history grouping | `WorkspaceRunHistoryService` | Extend | Already merges agent/team history by workspace root. | N/A |
| Frontend workspace metadata | `stores/workspace.ts` | Extend | Existing workspace metadata and live-session owner. | N/A |
| Frontend history rows | `runHistoryStore` / read model / projection utilities | Extend/refactor | Existing history projection owner, but its top-level row authority must change. | N/A |
| UI confirmation | `ConfirmationModal.vue` | Reuse | Existing confirmation component used by destructive run/team actions. | N/A |
| Workspace removal interaction state | No dedicated composable | Create New | Creation already has a dedicated workspace composable; removal is a separate workflow subject from run/team mutation actions. | Existing `useWorkspaceHistoryMutations` owns run/team actions and should not absorb workspace registry semantics. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend workspaces | Registry, create/list/remove, active workspace close/unregister | DS-001, DS-003, DS-005 | `WorkspaceManager` | Extend/refactor | Make registry authoritative for visible list. |
| Backend run history | Workspace-scoped history lookup by registered workspace root | DS-002 | `WorkspaceRunHistoryService` | Extend | Add explicit workspace-scoped query path. |
| Frontend workspace store | Registered workspace metadata, create/remove transport, local cleanup | DS-001, DS-003, DS-005 | `workspaceStore` | Extend | Add remove action and registry-derived getters. |
| Frontend history store/read model | Per-workspace child history cache/projection | DS-002, DS-004 | `runHistoryStore` | Refactor | Stop using global history groups as top-level row source. |
| Frontend Workspaces panel | UI row actions, expansion fetch, confirmation, refresh cadence | DS-001, DS-002, DS-003, DS-004 | `WorkspaceAgentRunsTreePanel` | Extend/refactor | Keep row renderer presentational. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts` | Backend workspaces | Registry persistence | Load/list/upsert/delete workspace registry entries from app-data `workspaces.json`; expose `buildFilesystemWorkspaceId`. | Persistence concern is cohesive and currently under-named as mapping-only. | `WorkspaceRegistryEntry` |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Backend workspaces | Workspace lifecycle owner | Registry-backed list/create/remove plus active workspace close/unregister. | Existing governing owner for workspace lifecycle. | `WorkspaceRegistryEntry` |
| `autobyteus-server-ts/src/workspaces/workspace-removal-guard.ts` | Backend workspaces | Removal policy | Detect active agent/team runs for a workspace root and return blocking reason. | Active-use policy is distinct from persistence mechanics. | N/A |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Backend GraphQL | Workspace transport | Add `RemoveWorkspaceInput/Result`; make `workspaces()` list registry entries. | Existing workspace GraphQL facade. | Workspace metadata mapper |
| `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` | Backend run history | Workspace history grouping | Add/get one registered workspace's history by root path. | Existing agent/team history grouping owner. | Existing history item types |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Backend GraphQL | History transport | Add workspace-scoped history query accepting `workspaceId`. | Existing run-history GraphQL facade. | Existing history object types |
| `autobyteus-web/graphql/mutations/workspace_mutations.ts` | Frontend GraphQL | Workspace transport docs | Add `RemoveWorkspace`. | Existing frontend workspace mutation definitions. | Generated GraphQL types |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Frontend GraphQL | History transport docs | Add `GetWorkspaceRunHistory`; remove desktop tree dependency on global `ListWorkspaceRunHistory`. | Existing frontend run-history query definitions. | Generated GraphQL types |
| `autobyteus-web/stores/workspace.ts` | Frontend workspace | Workspace metadata owner | Add `removeWorkspace(workspaceId)` and registry/list semantics. | Existing store owns workspace metadata and file-explorer cleanup. | `WorkspaceInfo` |
| `autobyteus-web/stores/runHistoryStore.ts` | Frontend history | History cache/action owner | Add per-workspace history cache/actions and workspace removal cleanup. | Existing store owns history interactions. | `RunHistoryWorkspaceGroup` |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Frontend history projection | Read-model projection | Build top-level nodes from registered workspace descriptors only; attach cached history as children. | Existing read-model projection owner. | `RunTreeWorkspaceNode` |
| `autobyteus-web/utils/runTreeProjection.ts` | Frontend history projection | Tree model builder | Add workspace ID to nodes/descriptors; remove history-only top-level row creation. | Existing pure projection utility. | `RegisteredWorkspaceDescriptor` |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Frontend Workspaces panel | Local expansion state | Expose/prune expansion for registered workspace IDs/roots; support expanded workspace list for refresh. | Existing expansion state owner. | N/A |
| `autobyteus-web/composables/useWorkspaceHistoryWorkspaceRemoval.ts` | Frontend Workspaces panel | Removal workflow | Confirmation pending target, in-flight state, action dispatch, toast messages. | Workspace removal is a distinct workflow from run/team mutations. | N/A |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Frontend Workspaces panel | Container/action owner | Use registry rows, fetch history on expansion, wire remove confirmation. | Existing section owner. | Store/composable contracts |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Frontend Workspaces panel | Presentational row renderer | Split workspace row toggle/action areas; render remove button and per-workspace history loading/error. | Existing row renderer. | Section contracts |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Frontend Workspaces panel | Contract type owner | Add workspace ID/root identity and remove/history loading actions. | Existing contract file. | Tree node/history types |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Registry entry shape (`workspaceId`, canonical root path) | `workspace-registry-store.ts` | Backend workspaces | Used by manager, resolver, tests | Yes: canonical root path only in registry entry | Yes: no separate hidden-root list | A mixed registry + history metadata blob |
| Registered workspace row descriptor (`workspaceId`, `workspaceRootPath`, display name) | `runTreeProjection.ts` or read-model-local type | Frontend history projection | Used to build top-level rows from workspace store | Yes: workspace ID plus canonical root | Partially: existing `WorkspaceInfo` still carries legacy `absolutePath`; descriptor should use `workspaceRootPath` | A raw `WorkspaceInfo` pass-through with unrelated config fields |
| Workspace-scoped history cache key | `runHistoryStore.ts` internal helper | Frontend history | Consistent map keys for loading/error/history | Yes | Yes: key by `workspaceId`, not ambiguous display name/root variants | A generic selector that guesses subject type |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceRegistryEntry` | Yes | Yes | Low | Use `{ workspaceId, workspaceRootPath }`; do not include history/memory or hidden flags. |
| `WorkspaceMetadataInfo` GraphQL type | Existing mixed compatibility shape has both `workspaceRootPath` and `absolutePath` | No | Medium | New code must treat `workspaceRootPath` as canonical; do not add new duplicate fields. Broad field-collapse can be a separate cleanup. |
| `RunTreeWorkspaceNode` | After change, yes | Yes for top-level row authority | Low | Include `workspaceId`; derive rows only from registered workspace descriptors. |
| `RunHistoryWorkspaceGroup` | Yes for history grouping | N/A | Low | Keep as child history payload; do not treat it as workspace registration. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts` | Backend workspaces | Registry persistence | Durable list/upsert/delete/lookup for registered workspace roots in app-data `workspaces.json`. | One persistence owner for visible workspace registry. | `WorkspaceRegistryEntry` |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Backend workspaces | Workspace lifecycle | Uses registry store for list/create/remove; owns active workspace close/unregister. | Governing backend owner remains single. | `WorkspaceRegistryEntry` |
| `autobyteus-server-ts/src/workspaces/workspace-removal-guard.ts` | Backend workspaces | Removal guard | Blocks remove when active agent/team runs exist for root. | Keeps active-use policy outside persistence store. | N/A |
| `autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts` | Backend GraphQL | Workspace response mapping | Map active workspace or registry entry to GraphQL metadata. | Existing response mapper. | `WorkspaceRegistryEntry` |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Backend GraphQL | Workspace API | Registry-backed list, create, remove. | Existing facade. | Mapper/result types |
| `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` | Backend run history | History grouping service | Return history group for one workspace root. | Existing grouping owner. | Existing history item types |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Backend GraphQL | History API | Workspace-scoped history query by `workspaceId`. | Existing facade. | Existing object types |
| `autobyteus-web/stores/workspace.ts` | Frontend workspace | Workspace store | Fetch registry-backed workspaces, create/remove workspace, local cleanup. | Existing store. | `WorkspaceInfo` |
| `autobyteus-web/stores/runHistoryStore.ts` | Frontend history | Per-workspace history store | Fetch/cache/refresh/prune child history by workspace ID. | Existing store evolves from global tree to scoped cache. | `RunHistoryWorkspaceGroup` |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Frontend projection | Read model | Build registered workspace nodes plus cached children. | Existing projection owner. | `RunTreeWorkspaceNode` |
| `autobyteus-web/utils/runTreeProjection.ts` | Frontend projection | Pure tree builder | Enforce no history-only top-level workspace nodes. | Existing pure utility. | Registered descriptors |
| `autobyteus-web/composables/useWorkspaceHistoryWorkspaceRemoval.ts` | Frontend Workspaces panel | Removal workflow | Pending target, confirmation, in-flight state, toast outcomes. | New distinct workflow owner. | N/A |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Frontend Workspaces panel | Expansion state | Toggle/prune/iterate expanded registered workspace IDs/roots. | Existing state owner. | N/A |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Frontend Workspaces panel | Container/action owner | Fetch registry rows, history-on-expand, remove confirmation, refresh expanded histories. | Existing container. | Store/composable contracts |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Frontend Workspaces panel | Row renderer | Display split row, remove button, child history/loading/error. | Existing presentational component. | Contracts |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Frontend Workspaces panel | Contract types | Explicit workspace-row actions/state. | Existing contract owner. | Tree node types |

## Ownership Boundaries

- Top-level workspace visibility belongs to the workspace registry boundary (`WorkspaceRegistryStore` through `WorkspaceManager` and `workspaceStore`), not run history.
- Workspace history belongs to the run-history boundary and is subordinate to a registered workspace identity.
- Workspace row UI belongs to the history section renderer, but actions/persistence belong to the panel/stores/backend owners.
- Active workspace/file-explorer sessions are lifecycle state, not registry data. Removing a registry entry must close active state, but the registry store itself must not know file-explorer internals.
- Run/team histories remain owned by run-history services and stores; workspace removal must not call run/team delete/archive paths.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkspaceManager` | `WorkspaceRegistryStore`, active workspace map, workspace close/unregister | GraphQL workspace resolver | Resolver directly editing `workspaces.json` and active map | Add manager methods. |
| `workspaceStore` | GraphQL workspace mutations, local workspace metadata cleanup, file-explorer cleanup | UI components/composables | Component directly mutating `workspaceStore.workspaces` after backend call | Add store action. |
| `runHistoryStore` | Per-workspace cache/projection state | `WorkspaceAgentRunsTreePanel` | Row renderer fetching history directly | Add explicit fetch/prune actions. |
| `WorkspaceRunHistoryService` | Agent/team history grouping by root | RunHistory GraphQL resolver | Resolver reading agent/team catalog stores directly | Add service method. |
| `WorkspaceAgentRunsTreePanel` | Confirmation/removal action wiring, expansion fetch | `WorkspaceHistoryWorkspaceSection` | Section owning backend action logic | Extend section contracts. |

## Dependency Rules

Allowed:

- UI row renderer -> section contracts only.
- `WorkspaceAgentRunsTreePanel` -> `workspaceStore`, `runHistoryStore`, workspace creation/removal composables, tree state composable.
- `workspaceStore` -> workspace GraphQL queries/mutations and file-explorer cleanup store methods.
- `runHistoryStore` -> run-history GraphQL queries and read-model/projection utilities.
- `WorkspaceResolver` -> `WorkspaceManager` and `WorkspaceRemovalGuard` through a manager/removal command API.
- `RunHistoryResolver` -> `WorkspaceManager` for registered workspace resolution and `WorkspaceRunHistoryService` for history grouping.
- `WorkspaceManager` -> `WorkspaceRegistryStore`.

Forbidden:

- History groups must not create top-level workspace rows when the workspace is absent from the registry.
- UI components must not delete registry entries by directly editing local store maps.
- Backend resolvers must not directly mutate `workspaces.json` while bypassing `WorkspaceManager`.
- Workspace removal must not call run/team delete/archive APIs.
- Do not add a hidden-root list as a second authority for visibility.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `workspaces()` GraphQL query | Registered workspace catalog | Return visible registered workspace metadata plus any intentionally exposed non-removable temp workspace metadata needed by selectors | None | Top-level Workspaces sidebar filters to removable registered filesystem rows. |
| `createWorkspace(input: { rootPath })` | Registered workspace | Upsert registry entry and prepare active workspace metadata | Canonical root path | Re-add restores visibility. |
| `removeWorkspace(input: { workspaceId })` | Registered workspace | Remove registry entry and close active state | Registered `workspaceId` | Backend resolves root; no raw path delete from UI. |
| `workspaceRunHistory(workspaceId, limitPerAgent)` | Workspace history | Return agent/team history for one registered workspace | Registered `workspaceId` | Reject/not-found if workspace is not registered. |
| `workspaceStore.removeWorkspace(workspaceId)` | Frontend workspace state | Call mutation and clean local workspace/file-explorer state | Registered `workspaceId` | UI-facing store action. |
| `runHistoryStore.fetchWorkspaceHistory(workspaceId)` | Frontend history cache | Fetch/cache child history for one row | Registered `workspaceId` | Used on expansion. |
| `runHistoryStore.pruneWorkspace(workspaceId)` | Frontend history cache | Clear cached children/selection state after removal | Registered `workspaceId` | No backend deletion. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `removeWorkspace(input.workspaceId)` | Yes | Yes | Low | Use registered workspace ID, not display name. |
| `workspaceRunHistory(workspaceId)` | Yes | Yes | Low | Backend resolves root from registry. |
| Existing `listWorkspaceRunHistory(limit)` | No for desktop Workspaces tree | No workspace identity | High in this context | Remove from desktop tree flow; if global recent still needs history, route through a separately named recent-history boundary. |
| `buildRunHistoryTreeNodes(...)` | Currently mixed | Currently root-based | High | Refactor to registry descriptors as top-level source. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Workspace registry persistence | Current `WorkspaceIdMappingStore`; proposed `WorkspaceRegistryStore` | Proposed: Yes | Current name understates visible registry authority | Rename/evolve owner. |
| Workspace-scoped history query | Proposed `workspaceRunHistory` / `GetWorkspaceRunHistory` | Yes | Low | Use workspace identity in name. |
| Workspace removal workflow | Proposed `useWorkspaceHistoryWorkspaceRemoval` | Yes | Low | Keep separate from run/team mutation composable. |
| Top-level workspace row | `RunTreeWorkspaceNode` with `workspaceId` | Mostly | Medium | Ensure type states row is registered workspace, not history-created root. |

## Applied Patterns (If Any)

- Repository/store pattern: `WorkspaceRegistryStore` owns JSON persistence for registered workspace entries.
- Facade pattern: GraphQL resolvers remain thin transport facades behind `WorkspaceManager` and `WorkspaceRunHistoryService`.
- Bounded local refresh loop: `WorkspaceAgentRunsTreePanel` refreshes only expanded workspace history caches.
- Guard/policy object: `WorkspaceRemovalGuard` owns active-run blocking before removal.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/` | Folder | Backend workspace subsystem | Registry, active workspace lifecycle, path utilities | Existing workspace capability area | Run/team catalog deletion logic |
| `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts` | File | Registry persistence | Durable JSON registry entries | Persistence concern under workspace owner | File-explorer watchers, run history rows |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | File | Workspace lifecycle | Registry-backed list/create/remove and active workspace cleanup | Existing lifecycle owner | GraphQL response formatting |
| `autobyteus-server-ts/src/workspaces/workspace-removal-guard.ts` | File | Removal policy | Active run/team blocking check | Workspace removal policy serves manager | Registry file IO |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | File | Workspace GraphQL facade | Queries/mutations for registry create/list/remove | Existing transport boundary | Direct JSON mutation |
| `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` | File | Workspace history service | Workspace-scoped history grouping by resolved root | Existing run-history grouping owner | Workspace registry mutation |
| `autobyteus-web/components/workspace/history/` | Folder | Frontend Workspaces section | Sidebar workspace rows and child history | Existing UI feature area | Backend persistence logic |
| `autobyteus-web/stores/workspace.ts` | File | Frontend workspace store | Registry-backed workspace metadata/create/remove | Existing store | Run/team history projection |
| `autobyteus-web/stores/runHistoryStore.ts` | File | Frontend history store | Per-workspace history cache and child projection | Existing store | Workspace registry persistence |
| `autobyteus-web/composables/useWorkspaceHistoryWorkspaceRemoval.ts` | File | Frontend removal workflow | Confirmation target, in-flight state, dispatch, toasts | Mirrors existing creation composable | Run/team delete/archive behavior |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | File | Section container | Data loading/action wiring/refresh | Existing container | Row markup details beyond wiring |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | Row renderer | Workspace row layout and action button | Existing renderer | Store calls |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces` | Main-Line Domain-Control + Persistence-Provider | Yes after registry split | Low | Workspace registry and lifecycle naturally belong together but in separate files. |
| `autobyteus-server-ts/src/api/graphql/types` | Transport | Yes | Low | Resolvers must stay thin. |
| `autobyteus-server-ts/src/run-history/services` | Main-Line Domain-Control | Yes | Low | History grouping remains in run-history subsystem. |
| `autobyteus-web/stores` | Frontend state/control | Medium | Medium | Existing flat stores are established; keep clear store responsibilities rather than creating ad hoc helpers. |
| `autobyteus-web/components/workspace/history` | UI + local contracts | Yes | Low | Component/composable split preserves boundaries. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Top-level workspace rows | `workspaces() registry -> workspaceStore.allRegisteredWorkspaces -> RunTreeWorkspaceNode[]` | `listWorkspaceRunHistory() -> workspaceGroups -> top-level rows` | Prevents removed workspaces from reappearing due to old history. |
| Expansion flow | `row chevron -> fetchWorkspaceHistory(workspaceId) -> children` | `panel mount -> fetch every workspace's history -> rows` | Matches user's mental model and reduces unnecessary global history loading. |
| Remove semantics | `removeWorkspace(workspaceId) -> delete registry entry -> keep history/files` | `delete all runs/files under root` | Avoids destructive misunderstanding. |
| Visibility policy | `workspace registry is authoritative` | `history rows + hiddenWorkspaceRoots suppression list` | Avoids two competing visibility sources. |
| API identity | `workspaceRunHistory(workspaceId)` | `listHistory(rootPathOrName)` | Workspace ID proves the root is registered and avoids ambiguous raw selectors. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Frontend-only row filtering | Smallest visible UI change | Rejected | Backend registry deletion plus registry-derived rows. |
| `hiddenWorkspaceRoots` list | Would suppress history-created rows without refactoring projection | Rejected | Make registry the sole top-level row source. |
| Keep desktop mount-time global `fetchTree()` for Workspaces rows | Existing implementation | Rejected | Fetch workspace-scoped history on expansion and refresh only expanded histories. |
| Header-level remove button | Easier to place near `+` | Rejected | Row-level action tied to exact workspace identity. |
| Delete run/team history during workspace removal | Would guarantee no history-created rows | Rejected | Preserve history; prevent it from creating top-level rows. |
| Delete filesystem folder | Could be interpreted as workspace deletion | Rejected | `Remove from Workspaces` never deletes user files. |

## Derived Layering (If Useful)

- UI layer: `WorkspaceAgentRunsTreePanel`, `WorkspaceHistoryWorkspaceSection`, workspace creation/removal composables.
- Frontend state layer: `workspaceStore`, `runHistoryStore`, read-model/projection utilities.
- Transport layer: frontend GraphQL query/mutation definitions and backend GraphQL resolvers.
- Backend domain/control layer: `WorkspaceManager`, `WorkspaceRunHistoryService`, `WorkspaceRemovalGuard`.
- Persistence layer: `WorkspaceRegistryStore` using app-data `workspaces.json`.

Layering follows ownership: UI calls stores; stores call GraphQL; resolvers call backend owners; backend owners call persistence. UI and resolvers must not bypass owners and edit persistence internals.

## Migration / Refactor Sequence

1. Backend registry owner:
   - Rename/evolve `WorkspaceIdMappingStore` into `WorkspaceRegistryStore` with `listEntries`, `upsertEntry`, `deleteEntry`, and lookup methods.
   - Preserve existing `workspaces.json` data shape if feasible (`workspaceId -> rootPath`) to avoid data migration while changing code ownership.
   - Update `WorkspaceManager` imports/tests.
2. Backend workspace list/remove:
   - Update `WorkspaceManager` to list registered workspace metadata from registry entries, create/upsert registry entries, and remove registry entries after active-use guard passes.
   - Add active workspace close/unregister in removal path.
   - Add GraphQL `removeWorkspace` mutation and registry-backed `workspaces()` query behavior.
3. Backend workspace-scoped history:
   - Add `WorkspaceRunHistoryService` method for one workspace root.
   - Add GraphQL query `workspaceRunHistory(workspaceId, limitPerAgent)` that resolves `workspaceId` through the registry before returning history.
4. Frontend GraphQL/types:
   - Add/update frontend GraphQL documents.
   - Regenerate or update generated GraphQL types according to the project workflow.
5. Frontend stores/projection:
   - Add `workspaceStore.removeWorkspace`.
   - Refactor `runHistoryStore` to cache history by workspace ID and fetch workspace history on demand.
   - Refactor `buildRunHistoryTreeNodes` / `buildRunTreeProjection` so registered workspace descriptors are the only top-level row source.
   - Ensure unregistered historical roots do not produce rows.
6. Frontend UI:
   - Change workspace root row from one full-width button into a row with a toggle button region and a far-right remove action using `@click.stop`.
   - Add confirmation modal copy: files/history/memory are not deleted; workspace can be added again to show history.
   - Wire expansion to fetch history if missing/stale and render loading/error state under the expanded row.
   - Refresh only expanded workspace histories on the background interval.
7. Cleanup old paths:
   - Remove desktop Workspaces dependency on global `fetchTree()` for row creation.
   - Remove any remaining history-created top-level workspace descriptor path.
   - Do not add hidden-root fallback.
8. Tests and validation hooks:
   - Add backend registry/remove tests and GraphQL e2e tests.
   - Add frontend store/projection/component tests for registry-derived rows, expansion-triggered history request, remove/cancel/success/failure, and re-add semantics.

## Key Tradeoffs

- This refactor is larger than adding a row button, but it aligns the product with the user's mental model and prevents removed rows from reappearing.
- Keeping app-data `workspaces.json` shape as `workspaceId -> rootPath` minimizes migration risk while still making it the authoritative registry.
- Fetching history on expansion may require new loading/error UI, but avoids preloading all historical workspaces and clarifies ownership.
- Blocking active workspace removal is safer than hiding active work; users must stop active runs first.

## Risks

- Existing mobile Recent surfaces currently use global workspace-group history. Implementation must avoid breaking mobile recents; if touched, keep them separate from desktop top-level workspace row projection.
- Existing consumers of `workspaceStore.allWorkspaces` may expect active workspaces, not registry entries. Audit launch selectors and mobile launch workspaces to ensure registry-backed metadata is acceptable.
- Generated GraphQL type updates may be required after schema/document changes.
- Active-run detection by workspace root must include both standalone agent runs and team runs.
- If default temp workspace appears in workspace store responses, the sidebar must filter it out or mark it non-removable.

## Guidance For Implementation

- Use `workspaceId` as the primary UI/API identity for registered workspace rows; use `workspaceRootPath` for display, history lookup after backend resolution, and confirmation copy.
- Do not delete or mutate run/team history, memory, artifacts, or filesystem contents during workspace removal.
- Keep `WorkspaceHistoryWorkspaceSection.vue` presentational: it emits/uses callbacks; it should not import stores.
- Use the existing run/team row action style for the workspace remove action, but ensure it is keyboard accessible and does not depend only on hover.
- Prefer optimistic local row pruning only after backend success. On failure or active-run block, leave the row and history cache unchanged.
- When a workspace is removed, prune local expansion state and cached history for that workspace ID, clear selected historical context if it belongs to that workspace, and clear file-explorer state/live sessions for the workspace ID.
- Add tests that specifically prove a history record for an unregistered root does not create a top-level workspace row.
