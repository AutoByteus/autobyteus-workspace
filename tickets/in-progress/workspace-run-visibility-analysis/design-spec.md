# Design Spec

## Current-State Read

The desktop left sidebar renders `WorkspaceAgentRunsTreePanel.vue` inside `AppLeftPanel.vue`. Since the workspace-removal refactor, the panel fetches `workspaceStore.fetchAllWorkspaces()` on mount and intentionally does not use global run history as a top-level workspace-row source. `runHistoryStore.getTreeNodes()` calls `buildRunHistoryTreeNodes(...)`, which translates `workspaceStore.allWorkspaces` into projection descriptors and passes them to `buildRunTreeProjection(...)`. The pure projection utility creates top-level workspace nodes only from descriptors and attaches persisted/draft runs only when their normalized root matches a descriptor.

That ownership shape is correct for `Remove from Workspaces`: history records for removed/unregistered roots must not recreate visible workspace rows. The regression is descriptor eligibility. `buildRunHistoryTreeNodes(...)` currently skips every workspace whose `kind` is not `filesystem` and every workspace whose `isTemp` is true. Backend `workspaces()` intentionally returns the default temp workspace (`temp_ws_default`, `kind: temp`, `isTemp: true`), and `WorkspaceSelector.vue` auto-selects it as `Temp Workspace (Default)`. The run configuration flow can therefore create a local draft run whose workspace root is the temp root, but the sidebar read model has discarded the only matching workspace descriptor, so the draft run is dropped and the sidebar remains empty.

There are three associated current-state gaps:

1. `WorkspaceHistoryWorkspaceSection` renders the remove action for every workspace node, while backend `removeWorkspace` only supports registered filesystem workspace IDs. Temp rows must be non-removable.
2. `RunHistoryResolver.workspaceRunHistory(workspaceId)` resolves roots only through `WorkspaceManager.getRegisteredWorkspaceRootPath(workspaceId)`, which rejects `temp_ws_default`. If temp rows are visible, expansion/refresh must load history through a visible-workspace root resolver rather than a registered-filesystem-only resolver.
3. Standalone agent draft rows are local only while the run ID starts with `temp-`; after `agentContextsStore.promoteTemporaryId(...)`, the permanent local context can disappear from the tree until backend history refresh catches up.

The added user request exposes another boundary gap in the same run-start workspace flow. In New workspace mode, `WorkspaceSelector.vue` owns `mode` and `tempPath` as local state. It emits the typed path only through `load-new` when the user clicks `Load` or presses Enter. `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue` pass through only `select-existing` and `load-new`, and `RunConfigPanel.vue` cannot see a typed-but-unloaded path. `RunConfigPanel.handleRun()` is synchronous and creates the agent/team context from the current config, which still points at the previous workspace, often Temp Workspace. The screenshot confirms this: the New tab contains `/home/autobyteus/workspace`, but helper text still says `Workspace: Temp Workspace`. The user has now explicitly chosen to remove the New-mode `Load` button/action entirely, so the target design must not preserve that UI path as an optional preload command.

## Intended Change

Correct the workspace-removal projection contract so the sidebar uses **visible run workspace descriptors**:

- registered filesystem workspaces remain visible and removable;
- the backend-visible default temp workspace is visible and non-removable;
- skill/other transient workspaces remain excluded unless a future requirement says they can be run-history workspaces;
- persisted history and local runs still cannot create top-level rows without a visible descriptor;
- workspace-scoped history can resolve `temp_ws_default` to the temp workspace root;
- local standalone permanent contexts remain visible until history reconciliation deduplicates them.

Also make `RunConfigPanel` the final workspace-readiness boundary for new launches:

- `WorkspaceSelector` publishes its current Existing/New mode and pending New path upward while the user types;
- `Run Agent` / `Run Team` auto-loads/registers a non-empty pending New path through the existing `workspaceStore.createWorkspace` path before creating any run context;
- New workspace mode removes the separate user-facing `Load` button/action; typed or browsed paths remain pending launch input until Run Agent / Run Team is clicked;
- a native folder Browse affordance, if present, only fills/changes the pending path and must not create/register the workspace by itself;
- pressing Enter in the path input must not invoke the removed explicit preload flow; if handled, it must follow Run semantics or remain no-op/prevent-default input behavior;
- New-mode helper text must not show a stale old workspace as active while a different pending path is typed.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix plus small UX behavior change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded
- Evidence: The workspace-removal commit made descriptors the only top-level row source and then filtered out temp descriptors, while the run-config flow relies on the same backend temp descriptor as the default workspace. Existing `workspaceRunHistory` resolves only registered filesystem IDs. Separately, New-mode path input is local to `WorkspaceSelector` until the explicit Load action, so Run cannot use it; the user has decided that explicit action should be removed rather than made optional.
- Design response: Define visible workspace descriptors with removability metadata; include temp descriptors as non-removable; keep history subordinate to descriptors; add visible-temp root resolution for workspace-scoped history; project local permanent standalone contexts until history catches up; expose pending workspace input from `WorkspaceSelector`; remove the `load-new`/Load-button user-facing path; and make `RunConfigPanel.handleRun` asynchronously ensure pending New paths are loaded before launch.
- Refactor rationale: A one-line deletion of `if (workspace.isTemp) continue` would show the temp row but would expose a broken remove action, leave temp history expansion broken, and leave the single-agent promotion gap. Similarly, only changing button text would not fix Run's inability to see the pending New path. The fix needs a small contract refactor across projection and run-config workspace input.
- Intentional deferrals and residual risk, if any: Backend launch paths currently may register the temp root as a filesystem workspace by calling `ensureWorkspaceByRootPath`. This design handles duplicate descriptors by keeping the fixed temp descriptor non-removable for that root. A deeper backend semantic cleanup to avoid registering the temp root is deferred because the in-scope behavior can be made coherent without changing launch identity semantics. Removing the New-mode Load button/action is in scope and must not be deferred.

## Terminology

- `Visible run workspace descriptor`: frontend projection input derived from backend `workspaces()` metadata that is allowed to create a top-level Workspaces sidebar row for run/team history.
- `Removable workspace row`: a visible row whose descriptor represents a registered non-temp filesystem workspace and can call `Remove from Workspaces`.
- `Temp workspace row`: the row for `temp_ws_default`; visible for run projection/history but never removable.
- `Local run row`: a standalone agent context that exists in frontend state but is not a draft ID and may not yet be present in backend history.
- `Pending New workspace path`: a path typed in `WorkspaceSelector` while New mode is active and not yet successfully loaded into the run config.
- `Run-triggered New workspace loading`: Run Agent/Run Team behavior that loads/registers the pending New workspace path before creating the run. This replaces the old explicit Load action.

## Design Reading Order

Read this design from workspace identity to launch behavior:

1. visible workspace descriptor eligibility and removability;
2. draft/local run attachment under descriptors;
3. workspace-scoped history resolution for temp;
4. New workspace path input propagation;
5. Run Agent/Run Team workspace-load sequencing;
6. row action rules and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the temp-exclusion behavior from the run tree read model; remove the assumption that every workspace node is removable; remove the draft-only local standalone projection assumption; replace the registered-filesystem-only root lookup in `workspaceRunHistory` for read operations; remove the assumption that New workspace paths affect config only after explicit Load; remove the New-mode `Load` button/action and `load-new` pass-through from the target user-facing contract.
- Treat removal as first-class design work: old history-created top-level rows remain decommissioned; do not reintroduce them as a compatibility path. The mandatory Load-before-Run path is replaced by Run-triggered New workspace loading and the `Load` UI/event path is decommissioned, not retained as a parallel compatibility path.
- Decision rule: the design fails if it solves sidebar visibility by letting `workspaceGroups`, draft contexts, or hidden suppression lists create top-level workspace rows independently of the workspace-list boundary; it also fails if Run still ignores a non-empty pending New path.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Sidebar mount / reactive store update | Top-level workspace rows rendered | Frontend workspace tree read model | Restores temp workspace visibility without reviving history-created rows. |
| DS-002 | Primary End-to-End | Agent run config `Run Agent` | Selected draft/local agent row visible under workspace | `RunConfigPanel` + agent context store + run-history read model | Fixes standalone temp/new workspace run start. |
| DS-003 | Primary End-to-End | Team run config `Run Team` | Selected draft/live team row visible under workspace | `RunConfigPanel` + team context store + run-history read model | Applies same invariant to team runs. |
| DS-004 | Primary End-to-End | Workspace row expansion/refresh | Workspace-scoped history group cached | Run-history query boundary | Prevents temp row expansion from failing on registered-only backend lookup. |
| DS-005 | Return-Event | Workspace row remove click | Row removed or blocked by backend | Workspace removal workflow | Keeps temp non-removable and preserves filesystem removal semantics. |
| DS-006 | Bounded Local | Standalone run ID promotion | Local permanent row deduped with history | Run tree projection | Prevents selected standalone row flicker/disappearance before history refresh. |
| DS-007 | Primary End-to-End | User types New workspace path and clicks Run | Workspace path registered and config selected before run context creation | `RunConfigPanel` | Removes unintuitive mandatory Load click and prevents stale Temp Workspace launches. |

## Primary Execution Spine(s)

- DS-001: `WorkspaceAgentRunsTreePanel.onMounted -> workspaceStore.fetchAllWorkspaces -> WorkspaceResolver.workspaces -> WorkspaceManager.listVisibleWorkspaces -> runHistoryStore.getTreeNodes -> buildRunHistoryTreeNodes.buildVisibleRunWorkspaceDescriptors -> buildRunTreeProjection -> WorkspaceHistoryWorkspaceSection`
- DS-002: `RunConfigPanel.handleRun -> ensurePendingWorkspaceLoadedForRun -> agentContextsStore.createRunFromTemplate -> selectionStore.selectRun -> runHistoryStore.getTreeNodes -> buildRunHistoryTreeNodes.localRunSnapshots -> buildRunTreeProjection -> useWorkspaceHistoryTreeState.revealSelectedAncestry -> WorkspaceHistoryWorkspaceSection`
- DS-003: `RunConfigPanel.handleRun -> ensurePendingWorkspaceLoadedForRun -> agentTeamContextsStore.createRunFromTemplate -> selectionStore.selectRun -> runHistoryStore.getTreeNodes/getTeamNodes -> buildRunTreeProjection/buildTeamNodes -> useWorkspaceHistoryTreeState.revealSelectedAncestry -> WorkspaceHistoryWorkspaceSection`
- DS-004: `WorkspaceHistoryWorkspaceSection.toggle -> WorkspaceAgentRunsTreePanel.onToggleWorkspace -> runHistoryStore.fetchWorkspaceHistory -> GetWorkspaceRunHistory -> RunHistoryResolver.workspaceRunHistory -> WorkspaceManager.getWorkspaceRootPathForHistory -> WorkspaceRunHistoryService.getWorkspaceRunHistory -> runHistoryStore.replaceWorkspaceGroup`
- DS-005: `WorkspaceHistoryWorkspaceSection.remove button -> useWorkspaceHistoryWorkspaceRemoval -> workspaceStore.removeWorkspace -> WorkspaceResolver.removeWorkspace -> WorkspaceManager.removeRegisteredWorkspace -> frontend prune/toast`
- DS-006: `agentRunStore.sendUserInputAndSubscribe -> PrepareAgentRun -> agentContextsStore.promoteTemporaryId -> buildRunHistoryTreeNodes.localRunSnapshots -> buildRunTreeProjection.dedupeAndSortRuns -> later refresh history row replaces local row`
- DS-007: `WorkspaceSelector.mode/tempPath -> pending-workspace-input event -> AgentRunConfigForm/TeamRunConfigForm pass-through -> RunConfigPanel pending input state -> handleRun async ensure -> workspaceStore.createWorkspace -> run config store setWorkspaceLoaded -> create local run/team context`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The sidebar asks the workspace boundary for visible workspaces. The frontend read model translates only eligible visible descriptors into tree roots. Temp is eligible but non-removable; skill stays excluded. | Workspace panel, workspace store, backend workspace manager, run tree read model, row renderer | `buildRunHistoryTreeNodes` / `buildRunTreeProjection` for frontend projection | Root normalization, descriptor dedupe, removability metadata |
| DS-002 | The agent launch flow first ensures any pending New path is loaded, then creates a local draft context with selected workspace metadata. The read model projects that draft under the visible descriptor and reveal state expands the ancestry. | Run config panel, workspace store, agent context store, run-history read model, tree state | `RunConfigPanel` for launch readiness; `agentContextsStore` for local run lifecycle | Pending path validation, summary creation, avatar fallback, status normalization |
| DS-003 | The team launch flow first ensures any pending New path is loaded, then creates a local team context. The workspace descriptor allows `getTeamNodes(root)` to attach the team under the visible workspace row and reveal the selected team. | Run config panel, workspace store, team context store, run-history read model, team projection | `RunConfigPanel` for launch readiness; `agentTeamContextsStore` for team lifecycle | Member routing, team grouping, status normalization |
| DS-004 | Row expansion asks for history by workspace ID. Backend resolves registered filesystem or temp IDs to a root path and returns root-scoped history. | Workspace row, run-history store, GraphQL resolver, workspace manager, workspace history service | `RunHistoryResolver.workspaceRunHistory` delegates root ownership to `WorkspaceManager` | Query cache, loading/error state, root canonicalization |
| DS-005 | Remove action exists only for removable descriptors. Registered filesystem rows keep existing remove flow; temp rows expose no remove action. | Row renderer, removal composable, workspace store, backend workspace manager | Workspace removal workflow and `WorkspaceManager.removeRegisteredWorkspace` | Confirmation copy, active-run guard, frontend prune |
| DS-006 | After standalone prepare, the run ID becomes permanent before history refresh. The projection treats that local context as a `local` row and dedupes it when history arrives. | Agent run store, agent context store, read model, projection utility | `buildRunTreeProjection` for row dedupe | Row source semantics, selection behavior, action eligibility |
| DS-007 | The workspace selector streams pending New path state upward. On Run, the panel loads the path if needed, blocks run creation on failure, and only then launches using the newly loaded workspace config. | Workspace selector, config form, run config panel, workspace store, config store | `RunConfigPanel` | Pending input reset, run button enablement, duplicate-click prevention, helper text |

## Spine Actors / Main-Line Nodes

- `WorkspaceAgentRunsTreePanel`: owns panel-level loading, row action wiring, expansion requests, and refresh loop.
- `workspaceStore`: owns frontend workspace metadata from GraphQL `workspaces()` and create/remove transport calls.
- `WorkspaceManager`: owns backend workspace lifecycle, visible workspace listing, registered removal, and root resolution.
- `runHistoryStore`: owns frontend run-history cache and tree read entrypoints.
- `buildRunHistoryTreeNodes`: owns translation from stores/history/local contexts to projection inputs.
- `buildRunTreeProjection`: owns pure tree assembly, descriptor gating, row dedupe, and sorting.
- `WorkspaceSelector`: owns visible workspace input controls and must publish current input state upward.
- `RunConfigPanel`: owns final launch sequencing and must ensure pending workspace input is loaded before context creation.
- `agentContextsStore` / `agentTeamContextsStore`: own local draft/live run contexts.
- `WorkspaceHistoryWorkspaceSection`: owns row rendering only.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `WorkspaceManager` | Backend workspace identities, temp workspace creation, registered workspace registry, visible root resolution for history, registered-only removal | Run tree UI projection; run/team history grouping |
| `RunHistoryResolver` | GraphQL transport for history queries/mutations | Root selection policy beyond delegating to `WorkspaceManager` |
| `WorkspaceRunHistoryService` | Grouping run/team history by resolved root path | Deciding whether a workspace ID is visible/removable |
| `workspaceStore` | Frontend copy of workspace metadata and create/remove transport calls | Tree row grouping/dedupe; pending input state |
| `WorkspaceSelector` | UI mode/path input and user feedback for pending/loaded/error state | Run launch sequencing; durable workspace registration policy |
| `RunConfigPanel` | Choosing active config, loading pending workspace paths, run launch ordering | Workspace registry internals; local run state after creation |
| `buildRunHistoryTreeNodes` | Read-model composition from workspace metadata, history, and local contexts | Component rendering or backend transport |
| `buildRunTreeProjection` | Pure descriptor-gated tree construction and row dedupe | Workspace metadata fetching or run context lifecycle |
| `WorkspaceHistoryWorkspaceSection` | Presentational row markup and callbacks | Remove policy, history fetching, workspace visibility authority |

GraphQL resolvers remain thin public facades. `WorkspaceManager` and run-history services are the governing owners behind them.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceResolver.workspaces` | `WorkspaceManager` | Transport boundary for visible workspace list | Temp/filter/removal policy beyond manager metadata |
| `RunHistoryResolver.workspaceRunHistory` | `WorkspaceManager` + `WorkspaceRunHistoryService` | Transport boundary for scoped history by visible workspace ID | Registry internals or run-history grouping logic |
| `AgentRunConfigForm` / `TeamRunConfigForm` | `RunConfigPanel` | Form composition pass-through | Workspace load/run sequencing |
| `WorkspaceHistoryWorkspaceSection` callbacks | Panel/composables/stores | Keeps row renderer presentational | Backend calls, remove policy, history fetch policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Temp workspace exclusion in `buildRunHistoryTreeNodes` | Breaks default temp run visibility and conflicts with backend visible workspace list | Visible descriptor eligibility helper in `runHistoryReadModel.ts` | In This Change | Do not remove descriptor gating itself. |
| Assumption that every `RunTreeWorkspaceNode` is removable | Temp rows must be visible but non-removable | `canRemoveFromWorkspaces` on workspace descriptors/nodes | In This Change | UI hides remove action when false. |
| Registered-filesystem-only root lookup for `workspaceRunHistory` | Temp rows need scoped history loading | `WorkspaceManager.getWorkspaceRootPathForHistory` or equivalent visible root resolver | In This Change | Keep `removeRegisteredWorkspace` registered-only. |
| Draft-ID-only local standalone projection | Permanent local contexts can be selected before history appears | `LocalRunSnapshot` with `source: 'draft' | 'local'` | In This Change | `history` still wins dedupe. |
| New workspace path local-only contract | Run cannot load typed paths without explicit Load | Pending workspace input event propagated to `RunConfigPanel` | In This Change | No user-facing Load action remains. |
| Synchronous Run launch assumption | Run-triggered workspace loading is async | Async `handleRun` / launch sequence with duplicate-click guard | In This Change | Preserve existing validation semantics. |
| Any attempted restoration of history-created top-level rows | Would regress workspace removal | Descriptor-only projection remains | In This Change | Existing removed-root tests should stay. |
| Backend temp-root auto-registration during launch | Can create duplicate temp/filesystem descriptors | Frontend same-root dedupe now; deeper launch cleanup later | Follow-up | Not required for coherent in-scope behavior. |
| New-mode `Load` button/action and `load-new` pass-through | User decided the Load step is unintuitive and should not exist | Pending input event plus Run-triggered New workspace loading in `RunConfigPanel` | In This Change | Remove button, explicit preload event, and Enter-to-load behavior; Browse may remain path-only. |

## Return Or Event Spine(s) (If Applicable)

- Workspace history fetch return: `WorkspaceRunHistoryService -> RunHistoryResolver -> runHistoryStore.fetchWorkspaceHistory -> workspaceGroups replacement -> runHistoryStore.getTreeNodes/getTeamNodes -> row children update`.
- Workspace remove return: `WorkspaceManager.removeRegisteredWorkspace -> WorkspaceResolver result -> workspaceStore.removeWorkspace -> runHistoryStore.pruneWorkspace/treeState.pruneWorkspace -> toast`.
- Run-triggered workspace load return: `workspaceStore.createWorkspace -> runConfigStore/teamRunConfigStore.setWorkspaceLoaded -> pending input marked loaded/current -> RunConfigPanel continues launch or selector shows loaded workspace/error feedback`.
- Run promotion return: `PrepareAgentRun result -> agentContextsStore.promoteTemporaryId -> reactive read model -> selected ancestry reveal -> later run-history refresh dedupe`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `buildRunTreeProjection`
  - Chain: `descriptors -> workspace node map -> persisted rows -> local rows -> dedupe by runId -> sorted workspace list`
  - Why it matters: all persisted/local rows must remain subordinate to visible descriptors, and history rows must replace local rows once reconciliation completes.
- Parent owner: `RunConfigPanel`
  - Chain: `Run click -> guard duplicate -> ensure pending workspace -> validate current config -> create context -> clear config`
  - Why it matters: the new workspace load must complete before context creation, and failures must not create partial runs.
- Parent owner: `WorkspaceAgentRunsTreePanel`
  - Chain: `expanded workspace IDs -> refresh interval -> refreshWorkspaceHistoryQuietly(workspaceId)`
  - Why it matters: expanded temp rows must not trigger recurring registered-only history errors.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Root normalization | DS-001, DS-002, DS-003, DS-004, DS-007 | Read model, backend manager/history service, run config | Compare workspace roots consistently | Same physical root appears through `workspaceRootPath`, `absolutePath`, config, or typed input | Duplicate/missing rows or duplicate workspace loads |
| Descriptor dedupe | DS-001 | Read model | Merge same-root temp/filesystem descriptors into one row | Backend can expose temp plus registered same root | Duplicate rows or wrong removability |
| Removability metadata | DS-001, DS-005 | Row renderer/removal workflow | Distinguish visible from removable | Temp is visible but not removable | Broken backend call or misleading UI |
| Row source semantics | DS-002, DS-006 | Projection, selection, mutation actions | Distinguish history/draft/local row capabilities | Local permanent rows are not drafts or history | Wrong open/delete/archive behavior |
| Pending workspace input | DS-007 | Run config panel | Expose New-mode path while typing/browsing | Run must be able to load it without a Load button | Stale Temp Workspace launch |
| Run duplicate-click guard | DS-007 | Run config panel | Prevent multiple createWorkspace/run launches | Run-triggered loading makes Run async | Duplicate workspaces/runs |
| Workspace-scoped history root resolution | DS-004 | Backend run-history resolver | Resolve visible workspace ID to canonical root | Query accepts IDs, history service needs roots | Resolver bypassing registry/temp ownership |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Sidebar tree projection | `autobyteus-web/stores/runHistoryReadModel.ts` + `utils/runTreeProjection.ts` | Extend | Existing owner already composes workspace/history/local run data | N/A |
| Workspace row actions | `components/workspace/history` contracts/section | Extend | Existing renderer and action contracts own row display/callback shape | N/A |
| Backend workspace root ownership | `WorkspaceManager` | Extend | Manager already owns temp and registry workspaces | N/A |
| Workspace-scoped history grouping | `WorkspaceRunHistoryService` | Reuse | It already accepts a root path and groups history | N/A |
| Local run lifecycle | `agentContextsStore` / `agentTeamContextsStore` | Reuse | Existing stores own local draft/live contexts | N/A |
| Workspace path creation | `workspaceStore.createWorkspace` + config-store `setWorkspaceLoaded` | Reuse | Existing workspace registration path already exists and can be called from launch sequencing | N/A |
| Pending path input | `WorkspaceSelector` event contract | Extend | Existing input component owns mode/path state | N/A |
| Launch sequencing | `RunConfigPanel.handleRun` | Extend | Existing owner already decides whether to create agent/team contexts | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Workspaces panel | Row rendering, remove visibility, expansion callbacks | DS-001, DS-004, DS-005 | Panel container and row section | Extend | Keep renderer presentational. |
| Frontend run-history read model/projection | Descriptor eligibility, row projection, row source semantics, dedupe | DS-001, DS-002, DS-003, DS-006 | `runHistoryStore` | Extend | Main sidebar fix area. |
| Frontend launch config | Pending path input, Run-triggered workspace loading, Run enablement | DS-002, DS-003, DS-007 | `RunConfigPanel` | Extend | Main new-request area. |
| Frontend workspace store | Workspace metadata source and create path | DS-001, DS-007 | `workspaceStore` | Reuse | No new workspace source. |
| Backend workspaces | Visible workspace root resolution and removal semantics | DS-004, DS-005 | `WorkspaceManager` | Extend | Add read resolver for temp; leave removal registered-only. |
| Backend run history | Root-scoped history grouping | DS-004 | `WorkspaceRunHistoryService` | Reuse | No schema change needed. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Frontend run-history read model | Read-model owner | Build visible descriptors and local run snapshots | Existing composition point with access to workspace/history/context data | `RunTreeProjection` types |
| `autobyteus-web/utils/runTreeProjection.ts` | Frontend projection utility | Pure projection owner | Workspace node type, row source type, descriptor-gated assembly, dedupe | Existing pure utility | N/A |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Frontend launch config | Workspace input owner | Emit pending mode/path; fix New-mode helper text | Existing mode/path owner | Pending input payload |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Frontend launch config | Agent config form wrapper | Pass pending workspace input event upward | Existing form wrapper | Pending input payload |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Frontend launch config | Team config form wrapper | Pass pending workspace input event upward | Existing form wrapper | Pending input payload |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Frontend launch config | Launch owner | Track pending workspace input; async load before run; duplicate-click guard; Run enablement | Existing owner of run launch and former load workflow | Store loading APIs |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Frontend Workspaces panel | Row renderer | Hide/remove button based on row metadata | Existing row renderer | `RunTreeWorkspaceNode` |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | Frontend run selection | Selection owner | Treat `local` like draft for local context selection | Existing row source branch owner | `RunTreeRowSource` |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Frontend row mutations | Mutation action owner | Ensure `local` rows are not archived/deleted as history | Existing action gate owner | `RunTreeRowSource` |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Backend workspaces | Workspace owner | Resolve registered/temp visible workspace IDs to roots for history | Existing owner of registry and temp workspace | Path canonicalization |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Backend run-history transport | Thin resolver | Use visible root resolver for `workspaceRunHistory` | Existing query boundary | `WorkspaceManager`, `WorkspaceRunHistoryService` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace descriptor shape | Keep in `runTreeProjection.ts` | Frontend projection | Used by read model and projection only | Yes | Yes | A generic workspace DTO replacing `WorkspaceInfo` |
| Descriptor eligibility/dedupe | Keep in `runHistoryReadModel.ts` | Frontend read model | Only one current consumer; extraction would add unnecessary indirection | Yes | Yes | A second workspace visibility authority |
| Visible workspace root resolution | Add method in `WorkspaceManager` | Backend workspace subsystem | Resolved from registry/temp active state already owned there | Yes | Yes | A run-history service helper that bypasses workspace ownership |
| Local row snapshot shape | `LocalRunSnapshot` in `runTreeProjection.ts` | Frontend projection | Shared between read model and projection | Yes | Yes | A kitchen-sink row DTO with team fields |
| Pending workspace input payload | Prefer local type in `WorkspaceSelector.vue` exported or duplicated small interface in forms if project style allows | Frontend launch config | Passed through selector -> form -> panel | Yes | Yes | Durable workspace metadata or config store state |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ProjectionWorkspaceDescriptor` | Yes | Yes | Low | Fields: identity, root, name, kind/removability only. |
| `RunTreeWorkspaceNode` | Yes | Yes | Low | Carries row display/action metadata; not a backend workspace DTO. |
| `LocalRunSnapshot` | Yes | Yes | Low | Represents frontend-local standalone run rows only. |
| `RunTreeRowSource` | Yes | Yes | Low | Values mean row authority: `history`, `draft`, `local`. |
| Pending workspace input payload | Yes | Yes | Low | Fields should be only `mode` and `pendingPath`/`path`; do not include workspace metadata. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Frontend run-history read model | Store read-model composition | Include visible temp descriptors, compute removability, dedupe same-root descriptors, build local run snapshots from all standalone contexts | It already composes tree input data and owns projection translation | `ProjectionWorkspaceDescriptor`, `LocalRunSnapshot` |
| `autobyteus-web/utils/runTreeProjection.ts` | Frontend projection utility | Pure tree projection | Accept visible descriptors and local rows; propagate workspace metadata; attach rows only to descriptors; dedupe `history > local > draft` by run ID | Existing pure projection boundary | N/A |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Frontend launch config | Workspace input owner | Emit current mode/path, remove Load UI/action, keep Browse path-only if present, update New-mode helper text | Existing workspace input owner | Pending input payload |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Frontend launch config | Agent form wrapper | Pass pending workspace input event to panel | Existing pass-through owner | Pending input payload |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Frontend launch config | Team form wrapper | Pass pending workspace input event to panel | Existing pass-through owner | Pending input payload |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Frontend launch config | Launch sequence owner | Track pending workspace input, load path before run, handle async loading/error/duplicate prevention, adjust Run enablement | Existing owner of `handleRun` and former `handleLoadNew` logic | Store loading APIs |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Frontend Workspaces panel | Presentational row renderer | Show remove action only when `workspaceNode.canRemoveFromWorkspaces` is true | Existing row markup owner | `RunTreeWorkspaceNode` |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | Frontend run selection | Selection action owner | Route `local` rows through local context selection, history rows through `openRun` | Existing selection branch | `RunTreeRowSource` |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Frontend row mutations | Mutation action owner | Allow draft delete only for `draft`, history archive/delete only for inactive `history`; no archive/delete for `local` | Existing action gate | `RunTreeRowSource` |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Frontend Workspaces panel | Section contract owner | Type callbacks/state remain row-metadata aware if needed by tests | Existing contract location | `RunTreeWorkspaceNode` |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Backend workspaces | Workspace manager | Add visible history root resolver for registered filesystem and temp IDs | Correct owner of registry and temp | Path canonicalization |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Backend run-history transport | GraphQL resolver | Use visible history root resolver before calling history service | Existing query boundary | `WorkspaceManager` |
| Test files listed in Guidance | Test coverage | Durable regression coverage | Add/update frontend/backend tests | Existing test owners | N/A |

## Ownership Boundaries

Top-level workspace row authority remains the workspace-list boundary. The frontend may translate backend workspace metadata into a narrower run-tree descriptor, but it must not invent rows from run history or local contexts without a descriptor. Backend run-history queries may resolve workspace IDs through `WorkspaceManager`, but run-history services receive canonical root paths and should not inspect workspace registry/temp internals directly. Row rendering may hide/show actions from node metadata but must not determine removability by hard-coded workspace IDs or call stores directly.

For run launch, `WorkspaceSelector` owns input state and user feedback, while `RunConfigPanel` owns launch sequencing. The selector must not create runs or own durable workspace registration. The run panel must not read child component internals by ref; it should receive an explicit input event and then reuse `workspaceStore.createWorkspace` for registration.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkspaceManager` | Registry store, active temp workspace, active workspace map | `WorkspaceResolver`, `RunHistoryResolver` | Resolver directly reading registry or constructing temp root paths | Add explicit manager method |
| `workspaceStore.createWorkspace` | GraphQL create mutation and local metadata registration | `RunConfigPanel` run-triggered workspace loading | Run context stores constructing workspace metadata without registering | Reuse/extend workspace store action |
| `WorkspaceSelector` event contract | Local mode/tempPath input state | Agent/team config forms and `RunConfigPanel` | Parent reading child local state via DOM/ref | Add explicit pending input event |
| `RunConfigPanel` | Run launch sequencing and config selection | Run button and config forms | Context stores loading workspaces before creation | Add `ensurePendingWorkspaceLoadedForRun` in panel |
| `buildRunHistoryTreeNodes` | Workspace descriptor eligibility, local snapshot building | `runHistoryStore.getTreeNodes` | Components filtering workspace kinds/removability | Extend read model output |
| `buildRunTreeProjection` | Descriptor-gated tree assembly and run dedupe | Read model/tests | Store/component manually merging rows | Extend projection input/output |
| `WorkspaceHistoryWorkspaceSection` contract | Row callbacks from panel/composables | Row renderer | Row importing stores or mutation modules | Add callback/state fields to contracts |

## Dependency Rules

- `WorkspaceAgentRunsTreePanel` may depend on `workspaceStore`, `runHistoryStore`, tree-state and action composables.
- `WorkspaceHistoryWorkspaceSection` may depend on props/contracts and emit/call callbacks only; it must not import stores.
- `runHistoryReadModel.ts` may depend on projection utilities, workspace metadata shape, agent/team context types, and status/summary helpers.
- `runTreeProjection.ts` must remain pure and must not import stores, Vue, GraphQL, or backend-facing services.
- `WorkspaceSelector` may emit current input state; it must not mutate run config stores directly.
- `AgentRunConfigForm` and `TeamRunConfigForm` may pass workspace input events upward; they must not own workspace creation.
- `RunConfigPanel` may call `workspaceStore.createWorkspace`, run/team config store workspace loading APIs, and context-store creation actions; it must not duplicate backend workspace ID policy.
- `RunHistoryResolver` may depend on `WorkspaceManager` and `WorkspaceRunHistoryService`; it must not read registry files directly.
- `WorkspaceRunHistoryService` must stay root-path based; it must not decide workspace ID visibility.
- `removeWorkspace` behavior must continue to use `removeRegisteredWorkspace`; do not reuse the new history root resolver for removal.

Forbidden shortcuts:

- `workspaceGroups -> top-level workspace row` without a visible descriptor.
- `row.workspaceId === 'temp_ws_default'` checks scattered through components for action policy; use row metadata.
- `workspaceRunHistory` accepting raw root paths from the frontend.
- Making temp removable to satisfy duplicate descriptor cases.
- Keeping New-mode typed path only in child local state while expecting Run to use it.
- Creating runs before pending Run-triggered workspace loading succeeds.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `workspaces()` | Visible workspace metadata | Return registered filesystem plus transient visible workspaces | None | Existing schema; temp remains returned. |
| `workspaceRunHistory(workspaceId, limitPerAgent)` | Workspace-scoped history read | Resolve visible workspace ID to root, return history group | Registered filesystem workspace ID or `temp_ws_default` | Query remains same; resolver broadens read resolution. |
| `removeWorkspace(input.workspaceId)` | Registered workspace removal | Remove registered filesystem workspace only | Registered filesystem workspace ID | Must continue rejecting temp. |
| `WorkspaceSelector @workspace-input-change` (name finalizable) | Current workspace input | Tell parent selected mode and pending path | `{ mode: 'existing' | 'new'; pendingPath: string }` | Emits on mount/mode/path changes. |
| Removed: `WorkspaceSelector @load-new` | Legacy explicit workspace preload | Not accepted in target interface | Raw path string | Decommission; parent should receive pending input only and Run should trigger loading. |
| `RunConfigPanel.ensurePendingWorkspaceLoadedForRun` | Launch workspace readiness | Load pending New path before context creation | Current pending input state | Internal function, not a store action. |
| `buildRunHistoryTreeNodes(params)` | Frontend run tree read model | Translate current store state to tree nodes | Workspace metadata list + histories + local contexts | Add visible descriptor/local row logic. |
| `buildRunTreeProjection(input)` | Pure tree projection | Assemble tree from descriptors, history, local rows | Normalized root via descriptor; row IDs | No stores. |
| `WorkspaceHistoryWorkspaceSection` props | Workspace row rendering | Render row/actions based on node metadata | `RunTreeWorkspaceNode` | Hide remove when not removable. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `workspaceRunHistory` | Yes | Yes | Low after fix | Resolve visible IDs through `WorkspaceManager`; do not accept root paths. |
| `removeWorkspace` | Yes | Yes | Low | Keep registered-only behavior. |
| `WorkspaceSelector` pending input event | Yes | Yes | Low | Emit mode/path only; no workspace metadata. |
| `RunConfigPanel` launch sequence | Yes | Yes | Low | Internal async ensure before context creation. |
| `buildRunTreeProjection` | Yes | Yes | Low | Inputs distinguish descriptors, history, local rows. |
| `RunTreeRowSource` | Yes | Yes | Low | Add `local` so permanent local rows are not misclassified. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Visible workspace descriptor | `ProjectionWorkspaceDescriptor` with removability fields | Yes | Low | Do not call it `RegisteredWorkspaceDescriptor` because temp is visible too. |
| Local permanent run | `local` row source / `LocalRunSnapshot` | Yes | Low | Avoid `live` if row may be offline but locally selected. |
| Temp history root resolver | `getWorkspaceRootPathForHistory` or `resolveVisibleWorkspaceRootPath` | Yes | Medium | Name must make it clear it is for reads, not removal. |
| Remove flag | `canRemoveFromWorkspaces` | Yes | Low | Prefer explicit capability over `isTemp` checks in UI. |
| Pending workspace path | `pendingWorkspaceInput` / `pendingPath` | Yes | Low | Do not call it loaded/selected until create succeeds. |
| Run-triggered load helper | `ensurePendingWorkspaceLoadedForRun` | Yes | Low | Name should show it is launch-specific. |

## Applied Patterns (If Any)

- Read model pattern: `runHistoryReadModel.ts` translates store/backend shapes into projection inputs.
- Pure projection pattern: `runTreeProjection.ts` has no side effects and owns deterministic tree assembly/dedupe.
- Facade pattern: GraphQL resolvers remain thin wrappers behind `WorkspaceManager` and history services.
- Capability flag pattern: `canRemoveFromWorkspaces` controls UI action availability without leaking backend removal rules into components.
- Input event pattern: `WorkspaceSelector` emits a small explicit payload for current input state; parent does not reach into child internals.
- Async guard pattern: `RunConfigPanel` prevents duplicate launches while loading the pending workspace path and launching.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryReadModel.ts` | File | Frontend read model | Descriptor eligibility/dedupe; local row snapshot building | Existing tree read model owner | Component rendering, GraphQL calls |
| `autobyteus-web/utils/runTreeProjection.ts` | File | Pure projection utility | Tree construction, row source types, dedupe | Existing projection owner | Store access, workspace fetches |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | File | Workspace input | Pending input event and New-mode helper state | Existing owner of mode/path input | Workspace registration, run launch |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | File | Agent config form | Pass workspace input events | Existing wrapper | Workspace registration |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | File | Team config form | Pass workspace input events | Existing wrapper | Workspace registration |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | File | Launch owner | Load pending path during Run, enable/disable Run, duplicate guard, create contexts | Existing owner of run launch and former load logic | Backend workspace policy internals |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | Row renderer | Hide remove action for non-removable rows | Existing row markup owner | Store calls |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | File | Selection actions | Select local rows locally; open history rows through backend | Existing row-selection owner | Projection construction |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | File | Run/team row mutations | Guard actions by row source | Existing mutation action owner | Workspace removal policy |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | File | Backend workspace owner | Visible history root resolver | Existing registry/temp owner | Run-history grouping |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | File | GraphQL transport | Use manager root resolver for scoped history | Existing run-history GraphQL boundary | Registry/temp implementation details |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores` | Frontend state/read-model | Yes | Low | Existing pattern keeps store read models/actions near stores. |
| `autobyteus-web/utils` | Pure utility/projection | Yes | Low | Projection is store-free and testable. |
| `autobyteus-web/components/workspace/config` | UI/config launch | Yes | Low | Existing folder for launch config surfaces; Run sequencing belongs in panel. |
| `autobyteus-web/components/workspace/history` | UI row/panel | Yes | Low | Existing feature folder for sidebar history UI. |
| `autobyteus-server-ts/src/workspaces` | Backend workspace domain/control | Yes | Low | Correct place for registry/temp root ownership. |
| `autobyteus-server-ts/src/api/graphql/types` | Transport | Yes | Medium | Resolver files are mixed by GraphQL type definitions; acceptable existing layout, keep logic thin. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Temp descriptor eligibility | `temp_ws_default` from `workspaces()` -> descriptor `{ workspaceKind: 'temp', canRemoveFromWorkspaces: false }` -> workspace row exists | `if (workspace.isTemp) continue` | Fixes first-run empty sidebar. |
| Removed history suppression | No descriptor for `/old/root`; history group `/old/root` is ignored as top-level source | Re-adding `workspaceGroups` to `workspaceDescriptors` | Preserves workspace removal. |
| Row action policy | `<button v-if="workspaceNode.canRemoveFromWorkspaces">` | Component checks `workspaceId !== 'temp_ws_default'` or calls backend and handles error | Keeps UI policy data-driven. |
| Temp history read | `workspaceRunHistory('temp_ws_default') -> WorkspaceManager.getWorkspaceRootPathForHistory -> temp root` | Frontend sends raw temp root path to history query | Keeps workspace ID boundary. |
| Local permanent row | Permanent local context -> `source: 'local'`; history refresh same ID -> `source: 'history'` replaces it | Treating permanent local row as `draft` or requiring history before display | Prevents wrong delete/archive actions and flicker. |
| New path Run-triggered load | New mode path `/home/autobyteus/workspace` -> Run -> `workspaceStore.createWorkspace` -> config updated -> context created | Run creates context from stale Temp Workspace because Load was not clicked | Matches user expectation. |
| New-mode helper | `Path will be loaded when you run: /home/...` or no stale success text | `Workspace: Temp Workspace` while `/home/...` is typed | Removes misleading screenshot state. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Restore history-created top-level workspace rows | Would make temp draft visible quickly | Rejected | Keep descriptor-only rows; include temp descriptor properly. |
| Hidden removed-root suppression list | Could hide removed history while allowing other history-created rows | Rejected | Workspace boundary remains sole top-level authority. |
| Let temp remove action call backend and show error | Minimal UI change | Rejected | Add explicit `canRemoveFromWorkspaces` metadata and hide action. |
| Accept raw root path in `workspaceRunHistory` | Would bypass registered-only ID resolver | Rejected | Add visible workspace ID root resolver in `WorkspaceManager`. |
| Keep `draftRuns` input and add separate `liveRuns` patch without row source tightening | Minimizes test churn | Rejected | Use a tight local row model/source semantics in projection. |
| Keep typed New path local-only and document Load requirement | Current implementation | Rejected | Run must load pending New path without a separate Load action. |
| Remove Load button without run-owned loading sequence | Simplifies UI but would still leave undefined workspace readiness/error handling on Run | Rejected as incomplete | Remove the Load UI/action and implement Run-triggered New workspace loading in `RunConfigPanel`. |

## Derived Layering (If Useful)

- UI layer: `WorkspaceAgentRunsTreePanel`, `WorkspaceHistoryWorkspaceSection`, `WorkspaceSelector`, agent/team config forms, `RunConfigPanel`.
- Frontend state/projection layer: `workspaceStore`, run config stores, `runHistoryStore`, `runHistoryReadModel`, `runTreeProjection`.
- Backend transport layer: GraphQL resolvers.
- Backend domain/control layer: `WorkspaceManager`, `WorkspaceRunHistoryService`.

The design follows ownership rather than strict layers: UI uses frontend stores/projection; GraphQL uses workspace/history domain owners; no caller bypasses `WorkspaceManager` for workspace root authority; run context stores do not own workspace loading.

## Migration / Refactor Sequence

1. Backend visible history root resolution:
   - Add a `WorkspaceManager` method for history/read root resolution, e.g. `getWorkspaceRootPathForHistory(workspaceId: string): Promise<string | null>`.
   - Resolve registered filesystem IDs through the registry as today.
   - Resolve `TempWorkspace.TEMP_WORKSPACE_ID` by `getOrCreateTempWorkspace()` and canonicalized base path.
   - Keep `removeRegisteredWorkspace` and `getRegisteredWorkspaceRootPath` unchanged for removal/registered-only semantics.
   - Update `RunHistoryResolver.workspaceRunHistory` to use the new read resolver and adjust the not-found error copy.
2. Frontend projection types:
   - Extend `ProjectionWorkspaceDescriptor` and `RunTreeWorkspaceNode` with `workspaceKind`/`canRemoveFromWorkspaces` (exact `workspaceKind` optional if `canRemoveFromWorkspaces` is sufficient for UI; keeping kind helps tests/debugging).
   - Replace draft-only projection input with `LocalRunSnapshot[]` carrying `source: 'draft' | 'local'`.
   - Extend `RunTreeRowSource` to `history | draft | local`.
3. Frontend read model:
   - Replace the temp-exclusion filter with explicit descriptor eligibility: include non-temp filesystem and temp descriptors; exclude skill/unknown descriptors for this sidebar.
   - Compute `canRemoveFromWorkspaces = kind === 'filesystem' && !isTemp`, except the fixed temp root remains non-removable even if a duplicate filesystem descriptor exists for that same root.
   - Dedupe descriptors by normalized root. If any descriptor for the root is the fixed temp descriptor, keep the temp identity/removability for that root; otherwise keep the registered filesystem descriptor.
   - Build local row snapshots for all standalone agent contexts with workspace roots. Mark `temp-...` as `draft`; mark other local contexts as `local`.
4. New workspace input propagation:
   - Add a `WorkspaceSelector` emitted event for current workspace input state. Suggested payload: `{ mode: 'existing' | 'new'; pendingPath: string }`.
   - Emit on mount after initial mode/default selection, on mode changes, and on `tempPath` changes.
   - Pass the event through `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue` to `RunConfigPanel.vue`.
   - Remove the New-mode `Load` button/action, remove `load-new` pass-through from the forms, and remove Enter-to-load behavior from the path input. If Enter is intentionally handled, route it to the same guarded Run sequence or prevent/default no-op; do not keep a hidden preload command.
   - If the platform-specific Browse/folder picker remains, it must only populate/update the pending path. It must not call workspace registration/loading by itself.
   - Update New-mode helper text: if mode is `new` and pending path is non-empty but not loaded/current, show pending/on-run-load feedback or clear the old success state. Do not show `Workspace: Temp Workspace` for a different typed path.
5. Run-triggered workspace load sequencing:
   - In `RunConfigPanel.vue`, track the latest pending workspace input for the active config.
   - Replace the user-facing `handleLoadNew(path)` flow with an internal helper that returns success/failure (or workspace ID) and is called only from the guarded Run launch sequence.
   - Make `handleRun` async. Before existing run creation logic, call `ensurePendingWorkspaceLoadedForRun()`.
   - If New mode has a non-empty path and it is not already the loaded/current workspace root, call `workspaceStore.createWorkspace({ root_path: path })`, then `setWorkspaceLoaded(...)` on the active agent/team config store.
   - If loading fails, set the workspace error and return without creating any run/team context.
   - Add an in-flight launch/workspace-load guard so duplicate Run clicks cannot create duplicate workspaces/runs.
   - Adjust Run disabled logic so a non-empty pending New path can satisfy the workspace requirement for enabling; after loading, re-check normal agent/team launch readiness before creating contexts.
6. Pure projection:
   - Create workspace nodes only from descriptors.
   - Attach persisted and local rows only to matching descriptors; warn/skip orphaned local rows.
   - Dedupe rows by run ID, with `history` replacing `local`/`draft`, and `local` replacing same-ID `draft` if that ever occurs.
7. UI/action updates:
   - Hide the workspace remove button when `workspaceNode.canRemoveFromWorkspaces` is false.
   - Ensure selection treats `local` rows like draft rows (local context selection path).
   - Ensure archive/delete gates ignore `local` rows; terminate still depends on `isActive`.
8. Tests:
   - Add backend tests for `workspaceRunHistory(temp_ws_default)` and continued `removeWorkspace(temp_ws_default)` rejection.
   - Add frontend projection/read-model/component/config tests listed below.
9. Run scoped checks and update artifacts/handoff.

No temporary dual behavior should remain at the end.

## Key Tradeoffs

- Showing temp workspace as a visible descriptor may make the sidebar show `Temp Workspace` as soon as the workspace list is fetched, even before the first run. This is acceptable for this fix because backend already returns it as visible and run config already presents it as the default. If product later wants unused temp hidden until a draft/live/history exists, that should be a separate explicit visibility requirement rather than an implicit bug workaround.
- Backend launch still may register the temp root as filesystem. This design handles the visible duplicate safely by preferring temp non-removability for the fixed temp root; deeper launch cleanup is deferred.
- Adding a `local` row source changes tests and types but avoids overloading `draft` or `history` semantics.
- Removing the Load button simplifies the launch mental model and matches the user's explicit preference, but it removes the ability to preview/register a path before Run. That tradeoff is accepted: Browse, if present, remains path selection only, and registration errors surface under the workspace selector when Run is clicked.

## Risks

- If some tests assumed every workspace row has a remove button, they must be updated to distinguish removable vs non-removable descriptors.
- If `workspaceRunHistory` tests assert only registered IDs are accepted, they must be refined: registered filesystem and temp visible IDs are accepted for reads; removal remains registered-only.
- If local permanent contexts include opened historical offline runs not in loaded workspace history, they may appear as `local` rows under visible descriptors. This is acceptable for selected/local continuity, and history dedupe will replace them when loaded.
- Descriptor same-root preference for temp prevents a registered duplicate of the temp root from becoming removable. This is intentional for the fixed temp root but could hide the duplicate registration issue until backend launch semantics are cleaned up.
- Run-triggered workspace loading makes `handleRun` asynchronous; duplicate-click prevention and post-load readiness re-checks are required to avoid duplicate launches or launching after a failed workspace load.
- Pending path state can become stale across agent/team selection changes if it is not reset or refreshed by child events. Implementation should key/reset pending input when active config changes or rely on `WorkspaceSelector` immediate emits.

## Guidance For Implementation

Recommended durable coverage:

Frontend unit/component tests:

- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
  - temp workspace in `workspaceStore.allWorkspaces` creates a `Temp Workspace` node;
  - `temp-...` draft under temp appears immediately;
  - non-`temp-` local standalone context appears as `source: 'local'` before history;
  - history row with same permanent ID replaces/dedupes local row;
  - same-root temp + filesystem descriptors render one non-removable temp row;
  - history-only removed root still does not create a row.
- `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts`
  - descriptors remain the only top-level source;
  - local rows without descriptors are skipped;
  - source precedence/dedupe is `history` over `local`/`draft`.
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` or regressions:
  - temp workspace row does not render `Remove from Workspaces` action;
  - registered filesystem row still renders remove action;
  - no eager global history fetch on mount remains true.
- Config/selector tests, likely under `autobyteus-web/components/workspace/config/__tests__` or existing relevant suites:
  - typing a New path emits pending input state while typing, with no Load click/action required;
  - New mode does not render a `Load` button or expose a `load-new` explicit preload event;
  - pressing Enter in the New path input does not call the removed preload flow;
  - New-mode helper does not show stale `Workspace: Temp Workspace` for a different pending path;
  - clicking Run Agent with a pending New path calls `workspaceStore.createWorkspace`, updates agent config, and creates the run only after success;
  - clicking Run Team with a pending New path calls `workspaceStore.createWorkspace`, updates team config, and creates the team only after success;
  - failed Run-triggered workspace loading sets workspace error and does not create a run/team;
  - Browse/folder picker, if available in test environment, only updates pending path and does not create/register the workspace before Run.

Backend tests:

- `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts`
  - `workspaceRunHistory(workspaceId: temp_ws_default)` returns a group for the temp root.
  - unregistered unknown ID still rejects.
- `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` or unit workspace manager tests:
  - `removeWorkspace(temp_ws_default)` remains rejected / unsuccessful.

Implementation should avoid schema/codegen churn because the existing `workspaceRunHistory(workspaceId, limitPerAgent)` query shape remains unchanged. If generated GraphQL types are stale in the repo, update only if the existing project workflow requires it; no schema fields are being added.
