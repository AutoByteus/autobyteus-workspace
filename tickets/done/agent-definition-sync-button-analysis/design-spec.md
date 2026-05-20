# Design Spec

## Current-State Read

The current implementation exposes node synchronization through three user-facing surfaces:

1. **Agents page selective sync**
   - `autobyteus-web/components/agents/AgentCard.vue` renders a `Sync` button when `ownershipScope === 'SHARED'`.
   - `autobyteus-web/components/agents/AgentList.vue` owns node-registry initialization, target selection state, sync errors/info, `NodeSyncTargetPickerModal`, `NodeSyncReportPanel`, and calls `nodeSyncStore.runSelectiveAgentSync(...)`.
2. **Agent Teams page selective sync**
   - `autobyteus-web/components/agentTeams/AgentTeamCard.vue` renders a `Sync` button when `ownershipScope === 'SHARED'`.
   - `autobyteus-web/components/agentTeams/AgentTeamList.vue` owns the same sync state/report/modal wiring and calls `nodeSyncStore.runSelectiveTeamSync(...)`.
3. **Settings → Nodes full/bootstrap sync**
   - `autobyteus-web/components/settings/NodeManager.vue` offers bootstrap sync when adding a remote node and a Run Full Sync panel with source, targets, and scope.
   - This uses `useNodeSyncStore`, `SyncEntityType`, and `NodeSyncReportPanel`.

All three surfaces use the same execution path:

`UI sync control -> nodeSyncStore -> RunNodeSync GraphQL mutation -> NodeSyncCoordinatorService -> NodeSyncRemoteClient -> exportSyncBundle/importSyncBundle GraphQL APIs -> NodeSyncService -> app-data file writes/cache refresh`

The backend sync payload model does not match the current durable definition model:

- `autobyteus-server-ts/src/sync/services/node-sync-file-layout.ts` reads/writes app-data paths such as `<app-data>/agents/<id>/agent.md` and `<app-data>/agent-teams/<id>/team.md`; it does not resolve additional package roots.
- Package-backed definitions can therefore be exported as empty fallback files or imported into app-data paths that later shadow package-root definitions.
- MCP sync copies machine-local fields (`command`, `args`, `env`, `cwd`, HTTP `url`). Real MCP import examples contain local executable paths, local token files, and environment assumptions.

The current supported definition distribution model is already package/file based:

- `AgentPackageService` imports local/GitHub package roots, updates package-root registry state, and refreshes agent/team definition caches.
- Frontend package stores invalidate/reload applications, agents, and teams after package changes.
- Agent/team definitions are text/folder-backed, so ordinary updates should happen by updating the package/folder/Git checkout and reloading the catalog.

The important non-sync gap is catalog reload freshness:

- Agent list queries call `AgentDefinitionService.getVisibleAgentDefinitions()`, which mostly reads from the persistence provider.
- Agent Team list queries call `AgentTeamDefinitionService.getAllDefinitions()`, backed by `CachedAgentTeamDefinitionProvider`, so manual disk/package changes may not appear until backend cache refresh.
- The target design must make list `Reload` mean "refresh from configured package/file sources," not "copy state from another node."

Constraints to preserve:

- Keep remote node registration/open/rename/remove, capability display, remote browser sharing, and Docker guidance.
- Keep MCP server management, JSON import, configuration editing, tool discovery, and registration.
- Keep package import/remove and package-root registry behavior.
- Keep agent/team run and detail behavior.
- Remove node synchronization as a product feature; do not retain hidden compatibility APIs or disabled UI remnants.

## Intended Change

Fully decommission node synchronization.

The product should no longer expose, call, or maintain cross-node sync for agents, agent teams, or MCP configuration. Agent/team definitions are distributed by packages, Git/folders, and catalog reload. MCP configuration is explicit per machine. Nodes are registered and opened, not synchronized.

Target user-facing state:

- Agents page actions: Search, Reload, Create Agent, Run, View Details. No `Sync` action or sync report.
- Agent Teams page actions: Search, Reload, Create Team, Run, View Details. No `Sync` action or sync report.
- Settings → Nodes: node identity, add remote node, capability status, remote browser sharing, open/rename/remove, Docker guide. No bootstrap sync or Run Full Sync.
- Settings → MCP Servers remains the place for explicit local MCP config/import/discovery.
- Package settings remain the place for package import/remove and future package update/pull behavior.

The implementation should also strengthen catalog reload by adding explicit backend cache-refresh mutations for agent and team catalogs and having list Reload invoke them before network refetch.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup + behavior change + legacy decommission.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure + Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - Sync is database-era state-copy behavior, but definitions are now file/package-backed.
  - Sync reads/writes app-data layout only and is not package-root-aware.
  - MCP sync copies machine-specific execution config that often cannot work on another node.
  - Agent/Team catalog pages currently own cross-node operational state, target selection, and sync reports, which is outside catalog browsing responsibility.
  - Settings → Nodes currently combines node management with state-copy sync, but node management remains valid while state copy does not.
- Design response:
  - Remove sync controls and state from all UI surfaces.
  - Remove frontend node sync store/types/components/mutations and sync tests.
  - Remove backend node-sync GraphQL resolvers/services and sync tests.
  - Add explicit catalog-refresh mutations under existing agent/team definition boundaries so Reload supports file/package updates without resurrecting sync.
- Refactor rationale:
  - A visibility patch such as hiding sync when no target nodes exist would preserve the wrong mental model.
  - A hidden backend sync API would invite future callers to bypass package/MCP ownership again.
  - The correct refactor is a clean removal of the obsolete cross-node state-copy boundary and a smaller strengthening of the catalog refresh boundary.
- Intentional deferrals and residual risk, if any:
  - A future "export UI-created definition as package" workflow is out of scope. If users need to move local app-data definitions, implement explicit package export/import later.
  - A future "pull latest" action for managed Git packages is out of scope and belongs under Agent/Application Packages.
  - Automatic filesystem watching is out of scope; Reload remains the explicit refresh trigger.

## Terminology

- **Node synchronization / node sync**: the obsolete cross-node export/import feature implemented by `runNodeSync`, `exportSyncBundle`, and `importSyncBundle`.
- **Catalog refresh**: a local backend cache refresh from configured app-data and package roots; this is not sync and does not contact target nodes.
- **Package import/update model**: the supported model for sharing agent/team definitions through local folders or Git-backed package roots.
- **MCP explicit configuration**: per-machine MCP server config through Settings → MCP Servers, including JSON import and tool discovery.

## Design Reading Order

Read this design in this order:

1. Data-flow spines show what is removed and what replaces the user need.
2. Ownership maps show which pages/services own the remaining responsibilities.
3. Removal and file mappings show the concrete code cleanup.
4. Interface mapping shows removed GraphQL APIs and new catalog refresh mutations.
5. Migration sequence shows a safe implementation order.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths in scope:
  - Agent/Team per-card sync controls and list sync orchestration.
  - Settings → Nodes bootstrap/full sync controls and orchestration.
  - Frontend `nodeSyncStore`, node sync GraphQL mutation file, node sync frontend types, node sync modal/report components.
  - Backend `NodeSyncResolver`, `NodeSyncControlResolver`, and `src/sync/services/*`.
  - Sync-specific tests, generated GraphQL types/hooks/documents, localization keys, and docs references.
- Decision rule: do not leave disabled buttons, hidden resolver APIs, compatibility wrappers, or fallback sync branches.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End (obsolete path to remove) | Agent/Team/Node sync UI or sync GraphQL caller | Backend node-sync services and target node import | No target owner; path is decommissioned | Names the entire legacy state-copy flow so it can be removed cleanly. |
| DS-002 | Primary End-to-End | Agents page Reload or package mutation | Fresh Agent cards from configured file/package roots | Agent Definition Catalog boundary | Replaces user expectation that sync updates agent definitions. |
| DS-003 | Primary End-to-End | Agent Teams page Reload or package mutation | Fresh Team cards from configured file/package roots | Agent Team Definition Catalog boundary | Replaces user expectation that sync updates team definitions, including cached team provider freshness. |
| DS-004 | Primary End-to-End | Settings → MCP Servers import/configure/discover | Local MCP config and registered local tools | MCP Server Management boundary | Preserves valid MCP setup without unsafe cross-node copying. |
| DS-005 | Primary End-to-End | Settings → Nodes add/open/rename/remove | Node registry/window/pairing state | Node Management boundary | Preserves remote-node value while removing state-copy sync. |
| DS-006 | Return-Event | Catalog refresh mutation completion/error | Store loading/error state and rendered catalog | Agent/Team Definition Stores | Ensures Reload has observable success/error behavior. |

## Primary Execution Spine(s)

- **DS-001 obsolete sync path, removed:**
  `Sync button/full sync control -> nodeSyncStore -> runNodeSync GraphQL -> NodeSyncCoordinatorService -> remote exportSyncBundle/importSyncBundle -> app-data file writes`

- **DS-002 target Agent catalog reload:**
  `Agents Reload button -> agentDefinitionStore.refreshAndReloadAllAgentDefinitions -> refreshAgentDefinitionCatalog GraphQL mutation -> AgentDefinitionService.refreshCache -> file/package providers -> agentDefinitions network query -> Agent cards`

- **DS-003 target Team catalog reload:**
  `Agent Teams Reload button -> agentTeamDefinitionStore.refreshAndReloadAllAgentTeamDefinitions -> refreshAgentTeamDefinitionCatalog GraphQL mutation -> AgentDefinitionService.refreshCache + AgentTeamDefinitionService.refreshCache -> file/package providers -> agentTeamDefinitions network query -> Team cards`

- **DS-004 target MCP configuration:**
  `Settings MCP UI/JSON import -> McpConfigService -> local MCP config file/provider -> discover/register tools -> Tools/MCP UI`

- **DS-005 target Node management:**
  `Settings Nodes UI -> nodeStore/Electron node registry/remote browser sharing -> node window or registry mutation -> rendered configured nodes`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user currently starts sync from catalog cards or NodeManager. Frontend wraps node IDs into a sync mutation. Backend exports from a source node and imports into targets. This whole path is removed because it copies the wrong state. | Sync UI, nodeSyncStore, NodeSync GraphQL, NodeSyncCoordinatorService, remote bundle APIs, file layout | Decommissioned; no replacement sync owner | Tests/docs/localization/codegen cleanup. |
| DS-002 | Agent Reload becomes an explicit local catalog refresh. The store asks backend to refresh agent definition cache from configured roots, then refetches the list. | Agents page, agent definition store, AgentDefinitionResolver, AgentDefinitionService, providers, AgentCard | Agent Definition Catalog | Featured catalog settings reload remains independent. |
| DS-003 | Team Reload becomes an explicit local catalog refresh. Because teams reference agents and currently use a cached provider, the team refresh mutation refreshes agent definitions before team definitions, then the store refetches teams. | Agent Teams page, team definition store, AgentTeamDefinitionResolver, AgentTeamDefinitionService, providers, AgentTeamCard | Agent Team Definition Catalog | Featured catalog settings reload remains independent. |
| DS-004 | MCP setup remains local and explicit. Users import/edit config on the machine that will run/reach the MCP server, then discover/register tools. | MCP UI, McpConfigService, MCP config provider, tool discovery/registration | MCP Server Management | Secret/path validation, discovery status, docs wording. |
| DS-005 | Node management remains about reachable AutoByteus nodes and windows. Adding a node probes capabilities and records it; no state is copied afterward. | NodeManager, nodeStore, capability probe, Electron node window API, remote browser sharing | Node Management | Host validation, pairing cleanup, Docker guidance. |
| DS-006 | Refresh success/errors return through GraphQL/Apollo to store loading/error state and normal page rendering. | Resolver result/error, store loading/error refs, page state | Agent/Team Definition Stores | Toasts/logging should stay page/store-level, not backend sync-style reports. |

## Spine Actors / Main-Line Nodes

- **Catalog pages**: `AgentList.vue`, `AgentTeamList.vue`.
- **Catalog cards**: `AgentCard.vue`, `AgentTeamCard.vue`.
- **Definition stores**: `agentDefinitionStore.ts`, `agentTeamDefinitionStore.ts`.
- **GraphQL definition resolvers**: `agent-definition.ts`, `agent-team-definition.ts`.
- **Definition services/providers**: `AgentDefinitionService`, `AgentTeamDefinitionService`, cached providers, file providers.
- **Package managers**: backend package services and frontend package stores.
- **MCP management**: MCP config service/provider/UI.
- **Node management**: `NodeManager.vue`, `nodeStore`, capability probe, remote browser sharing.
- **Removed sync path**: `nodeSyncStore`, node sync GraphQL files, backend sync services.

## Ownership Map

| Actor / Node | Ownership |
| --- | --- |
| Agent catalog page (`AgentList.vue`) | Search, featured/shared/application grouping, list Reload trigger, create navigation, run/detail event wiring. Must not own node registry or sync target selection. |
| Agent card (`AgentCard.vue`) | Presentational summary plus Run/View Details actions. Must not know sync eligibility. |
| Agent definition store | Agent list state, loading/error state, Apollo query/mutation calls for agent definition catalog operations, refresh+reload sequence. |
| Agent definition resolver | Thin GraphQL entrypoint for agent definition query/mutation operations; delegates cache refresh to `AgentDefinitionService`. |
| `AgentDefinitionService` | Authoritative domain boundary for agent definition lookup, mutation, and cache refresh from configured persistence roots. |
| Team catalog page (`AgentTeamList.vue`) | Search, featured/regular grouping, list Reload trigger, create navigation, run/detail event wiring. Must not own node registry or sync target selection. |
| Team card (`AgentTeamCard.vue`) | Presentational summary plus Run/View Details actions. Must not know sync eligibility. |
| Agent team definition store | Team list state, loading/error state, Apollo calls for team catalog operations, refresh+reload sequence. |
| Agent team definition resolver | Thin GraphQL entrypoint for team definition query/mutation operations; delegates cache refresh to services. |
| `AgentTeamDefinitionService` | Authoritative domain boundary for team definition lookup, graph validation, mutation, and cache refresh. |
| Package services/stores | Import/remove package roots and refresh dependent catalogs after package changes. Future package pull/update belongs here. |
| MCP config service/UI | Explicit per-machine MCP configuration/import/discovery/registration. Must not copy MCP config across nodes. |
| NodeManager/nodeStore | Node registry, capability state, node windows, remote browser sharing integration. Must not copy definitions/MCP config between nodes. |
| Backend node sync services/resolvers | Obsolete cross-node state-copy boundary. Remove. |

If a public facade exists, the governing owner is the underlying domain service/store. GraphQL resolvers and card components are thin boundaries, not policy owners.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentDefinitionResolver` | `AgentDefinitionService` | GraphQL transport entrypoint. | Cache policy beyond delegating to the service. |
| `AgentTeamDefinitionResolver` | `AgentTeamDefinitionService` plus agent-definition refresh dependency | GraphQL transport entrypoint. | Sync, node selection, generic mixed-subject refresh. |
| `AgentCard.vue` / `AgentTeamCard.vue` | Parent catalog pages/stores | Present card state and emit run/detail. | Cross-node operation eligibility. |
| `NodeManager.vue` | `nodeStore`, remote browser sharing store, capability probe utilities | Node management screen. | Definition/MCP state distribution. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Agent card `Sync` button, `canSync`, `sync-agent` emit | Catalog cards should not start cross-node state copy. | Agent package/update/reload model; `AgentList` Reload. | In This Change | Remove from all card placements and tests. |
| Agent list sync state/modal/report/functions | Agent list should own catalog browsing only. | `agentDefinitionStore.refreshAndReloadAllAgentDefinitions`. | In This Change | Remove nodeStore/nodeSyncStore/window node dependencies from AgentList unless needed for other behavior. |
| Team card `Sync` button, `canSync`, `sync-team` emit | Team cards should not start cross-node state copy. | Agent package/update/reload model; `AgentTeamList` Reload. | In This Change | Nested team count remains unrelated. |
| Team list sync state/modal/report/functions | Team list should own catalog browsing only. | `agentTeamDefinitionStore.refreshAndReloadAllAgentTeamDefinitions`. | In This Change | Remove nodeStore/nodeSyncStore/window node dependencies. |
| NodeManager bootstrap sync on add | Adding a node should register/probe only. | Node registration + capability probe. | In This Change | Add-node copy/status keys removed. |
| NodeManager Run Full Sync section | Full sync is the obsolete product feature. | Package/MCP explicit flows. | In This Change | Remove source/target/scope/report state. |
| `autobyteus-web/stores/nodeSyncStore.ts` | No frontend caller remains. | None. | In This Change | Delete store and its tests. |
| `autobyteus-web/graphql/mutations/nodeSyncMutations.ts` | No frontend sync mutation remains. | Definition refresh mutations in subject-owned mutation files. | In This Change | Delete after codegen/update. |
| `autobyteus-web/types/nodeSync.ts` | Node sync DTOs no longer used. | None. | In This Change | Delete. |
| `autobyteus-web/components/sync/NodeSyncTargetPickerModal.vue` | Only used by sync flows. | None. | In This Change | Delete with tests/localization. |
| `autobyteus-web/components/sync/NodeSyncReportPanel.vue` | Only used by sync flows. | Normal page loading/error state. | In This Change | Delete with tests/localization. |
| Backend `node-sync.ts`, `node-sync-control.ts` GraphQL types/resolvers | Hidden sync API would preserve obsolete boundary. | Subject-owned definition refresh mutations; MCP explicit config APIs. | In This Change | Remove from schema registration. |
| Backend `src/sync/services/*` | No GraphQL or product caller remains. | Package services, definition services, MCP config service. | In This Change | Delete service tests. |
| Node sync frontend/backend tests | They assert removed behavior. | New/updated tests for no sync UI and refresh reload. | In This Change | Migrate any non-sync persistence contract coverage before deleting. |
| Node sync localization/generated keys | Removed UI no longer references them. | Existing Reload/MCP/package wording. | In This Change | Remove both source and generated keys where applicable. |
| Docs references to syncing agents/teams/MCP between nodes | User guidance should match package/MCP model. | Package import/update/reload docs; MCP explicit config docs. | In This Change | Be careful not to remove unrelated local "tool discovery" wording unless it says cross-node sync. |

## Return Or Event Spine(s) (If Applicable)

- **DS-006 Catalog refresh return path:**
  `refresh mutation success/error -> Apollo result/error -> store loading/error refs -> Reload spinner/error console/toast -> catalog render`

No sync report/event spine remains. Refresh uses normal query/mutation error handling rather than sync-specific report panels.

## Bounded Local / Internal Spines (If Applicable)

No event loop, worker loop, or state machine is introduced. Existing provider cache refresh remains an internal service operation:

- Parent owner: `AgentDefinitionService` / `AgentTeamDefinitionService`.
- Chain: `refreshCache -> provider.refresh -> repopulated cached provider from persistence roots`.
- Why it matters: the explicit Refresh mutation should call this service boundary, not reach into providers directly.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Featured catalog setting reload | DS-002, DS-003 | Catalog pages | Reload featured item settings alongside definitions. | Featured grouping is display config, not definition source. | Would blur definition refresh with settings ownership. |
| Toast/delete result handling | DS-002 | Agent catalog page/store | Show normal mutation feedback. | Existing delete flow should remain. | Sync report-style UI would reintroduce obsolete mental model. |
| Capability probe/host validation | DS-005 | NodeManager/nodeStore | Validate and display node reachability. | Node management remains valid. | Could be mistaken as sync readiness if tied to sync UI. |
| Remote browser sharing cleanup | DS-005 | NodeManager/remoteBrowserSharingStore | Manage browser pairing when removing nodes. | Independent node feature. | Could be accidentally removed if all node features are conflated with sync. |
| MCP tool discovery | DS-004 | MCP management | Discover/register local tools after config. | Valid local operation. | Calling it "sync" could confuse it with removed node sync. |
| Codegen/localization generation | All | Build/tooling | Keep generated GraphQL/localization in sync with removed APIs/keys. | Prevent stale references. | Stale generated files keep dead types visible. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent catalog cache refresh | Agent Definition subsystem | Extend | `AgentDefinitionService.refreshCache()` already exists and is the right service boundary. | N/A |
| Team catalog cache refresh | Agent Team Definition subsystem | Extend | `AgentTeamDefinitionService.refreshCache()` already exists; mutation should also refresh agents first because teams reference agents. | N/A |
| Package-backed definition updates | Agent/Application Package subsystems | Reuse | Existing package import/remove already refresh dependent catalogs. | N/A |
| MCP configuration | MCP Server Management subsystem | Reuse | Explicit local import/config/discovery already exists and matches machine-local constraints. | N/A |
| Node registration/window management | Node management store/UI | Reuse | Existing nodeStore/NodeManager remain valid once sync is removed. | N/A |
| Cross-node synchronization | Existing node sync subsystem | Remove | The subsystem's subject is obsolete and unsafe for current architecture. | No new replacement sync subsystem. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Catalog Frontend | Agent page search/group/render/reload/run/detail. | DS-002, DS-006 | Agent catalog page/store | Extend | Remove sync wiring; add refresh+reload action usage. |
| Agent Team Catalog Frontend | Team page search/group/render/reload/run/detail. | DS-003, DS-006 | Team catalog page/store | Extend | Remove sync wiring; add refresh+reload action usage. |
| Agent Definition Backend | Agent definition cache refresh/query/mutation. | DS-002 | `AgentDefinitionService` | Extend | Add subject-owned refresh mutation. |
| Agent Team Definition Backend | Team definition cache refresh/query/mutation. | DS-003 | `AgentTeamDefinitionService` | Extend | Add subject-owned refresh mutation. |
| Node Management Frontend | Node registry and windows. | DS-005 | `NodeManager.vue`, `nodeStore` | Reuse | Remove sync subfeature. |
| MCP Server Management | Local MCP import/config/discovery. | DS-004 | `McpConfigService` and UI | Reuse | No sync behavior. |
| Node Sync Backend/Frontend | Cross-node export/import/reporting. | DS-001 | None | Remove | Entire capability decommissioned. |
| Documentation/Localization/Tests | User guidance and executable expectations. | All | Delivery/testing owners | Modify | Remove sync wording and tests; add refresh/no-sync coverage. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts` | Agent Definition Backend | GraphQL resolver facade | Add `refreshAgentDefinitionCatalog(): Boolean`. | Existing agent definition GraphQL boundary. | Existing service. |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | Agent Team Definition Backend | GraphQL resolver facade | Add `refreshAgentTeamDefinitionCatalog(): Boolean`. | Existing team definition GraphQL boundary. | Existing services. |
| `autobyteus-web/stores/agentDefinitionStore.ts` | Agent Catalog Frontend | Definition store | Add refresh+reload store action. | Store already owns agent list Apollo calls/state. | Existing mutation/query files. |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | Agent Team Catalog Frontend | Definition store | Add refresh+reload store action. | Store already owns team list Apollo calls/state. | Existing mutation/query files. |
| `AgentList.vue` | Agent Catalog Frontend | Catalog page | Remove sync UI/state; use refresh+reload action. | Page owns visible catalog behavior. | Existing store. |
| `AgentTeamList.vue` | Agent Team Catalog Frontend | Catalog page | Remove sync UI/state; use refresh+reload action. | Page owns visible catalog behavior. | Existing store. |
| `NodeManager.vue` | Node Management Frontend | Node page | Remove sync UI/state; preserve node management. | Existing page owns node management. | Existing node/remote browser stores. |
| Node sync frontend/backend files | Node Sync | Obsolete boundary | Delete. | No remaining responsibility. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Catalog refresh result | None; use GraphQL `Boolean` | Agent/Team Definition boundaries | Not enough structure to justify a shared DTO. GraphQL errors carry failure details. | Yes | Yes | A generic mixed-subject catalog coordinator. |
| Sync report/target DTOs | None; delete | Removed Node Sync | No replacement shared structure. | Yes | Yes | Hidden compatibility model. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `refreshAgentDefinitionCatalog(): Boolean` | Yes | Yes | Low | Keep subject-specific. |
| `refreshAgentTeamDefinitionCatalog(): Boolean` | Yes | Yes | Low | Keep subject-specific; implementation may refresh agent cache first as a team dependency. |
| Removed NodeSync DTOs | N/A | Yes | N/A | Delete generated/source types. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts` | Agent Definition Backend | Agent definition GraphQL resolver | Existing agent queries/mutations plus `refreshAgentDefinitionCatalog`. | Subject-specific resolver already exists. | `AgentDefinitionService.refreshCache`. |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | Agent Team Definition Backend | Team definition GraphQL resolver | Existing team queries/mutations plus `refreshAgentTeamDefinitionCatalog`. | Subject-specific resolver already exists. | `AgentDefinitionService.refreshCache`, `AgentTeamDefinitionService.refreshCache`. |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | GraphQL schema | Schema composition | Remove `NodeSyncResolver` and `NodeSyncControlResolver` imports/registrations. | Keeps public API list accurate. | N/A |
| `autobyteus-web/graphql/mutations/agentDefinitionMutations.ts` | Agent Catalog Frontend | Agent GraphQL mutation definitions | Add `RefreshAgentDefinitionCatalog`. | Subject-specific mutation file. | N/A |
| `autobyteus-web/graphql/mutations/agentTeamDefinitionMutations.ts` | Agent Team Catalog Frontend | Team GraphQL mutation definitions | Add `RefreshAgentTeamDefinitionCatalog`. | Subject-specific mutation file. | N/A |
| `autobyteus-web/stores/agentDefinitionStore.ts` | Agent Catalog Frontend | Store | Add `refreshAndReloadAllAgentDefinitions`; preserve query/mutation state. | Store already centralizes agent list state. | Existing query/mutation docs. |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | Agent Team Catalog Frontend | Store | Add `refreshAndReloadAllAgentTeamDefinitions`; preserve query/mutation state. | Store already centralizes team list state. | Existing query/mutation docs. |
| `autobyteus-web/components/agents/AgentCard.vue` | Agent Catalog Frontend | Presentational card | Remove `Sync` button/emit/canSync. | Card remains summary/run/detail only. | N/A |
| `autobyteus-web/components/agents/AgentList.vue` | Agent Catalog Frontend | Page | Remove sync imports/state/template/functions; Reload calls refresh+reload. | Page remains catalog UI. | Store action. |
| `autobyteus-web/components/agentTeams/AgentTeamCard.vue` | Agent Team Catalog Frontend | Presentational card | Remove `Sync` button/emit/canSync. | Card remains summary/run/detail only. | N/A |
| `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Agent Team Catalog Frontend | Page | Remove sync imports/state/template/functions; Reload calls refresh+reload. | Page remains catalog UI. | Store action. |
| `autobyteus-web/components/settings/NodeManager.vue` | Node Management Frontend | Node settings page | Remove bootstrap/full sync UI/imports/state/functions; preserve node add/open/rename/remove. | Sync was only a subfeature; node management remains. | Existing node/remote browser stores. |
| `autobyteus-web/generated/graphql.ts` | Frontend generated GraphQL | Generated schema/types | Remove node sync generated artifacts; add refresh mutations if codegen is used. | Generated file mirrors schema. | Generated. |
| `autobyteus-web/localization/messages/**` | Localization | Locale source/generated messages | Remove sync keys; update add-node wording away from bootstrap. | Messages follow UI. | Generated locale tooling. |
| `autobyteus-web/docs/*.md` | Documentation | User docs | Remove sync guidance; document package/reload and MCP explicit config. | Docs follow product behavior. | N/A |
| Sync tests | Test suites | Validation | Delete/update to new behavior. | Tests should encode target behavior. | N/A |

## Ownership Boundaries

- **Definition catalog boundary** is subject-owned by agent/team definition services. UI stores call GraphQL resolver methods; they must not reach into providers or package registries directly.
- **Package boundary** owns package root import/remove/update semantics. Catalog Reload may refresh from currently configured roots, but it must not mutate package registry state or pull Git remotes.
- **MCP boundary** owns local MCP config and tool discovery. No node or catalog owner may copy MCP config across nodes.
- **Node management boundary** owns node registry/window/capability/pairing state. It must not own definition distribution or MCP config distribution.
- **GraphQL schema boundary** must no longer expose node-sync APIs. There is no hidden transport entrypoint for `runNodeSync`, `exportSyncBundle`, or `importSyncBundle`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentDefinitionService` | cached provider, persistence provider, processor normalization | Agent resolver, package services | UI/store/provider direct refresh or file-root reads | Add/adjust subject-specific service/resolver method. |
| `AgentTeamDefinitionService` | cached provider, persistence provider, team graph validation | Team resolver, package services | UI/store/provider direct refresh or generic mixed sync | Add/adjust team-specific service/resolver method. |
| Package services | package registry, additional roots, package import/remove | Package UI/stores | Catalog page pulling Git or mutating package roots | Add package-specific update action later. |
| MCP config service | MCP config provider, JSON import, discovery/register sequence | MCP UI/resolvers | Node sync copying MCP configs | Add explicit MCP import/config validation. |
| Node store/NodeManager | node registry, capability/pairing/window actions | Settings → Nodes UI | Definition/MCP state copy on node add | Add node-management-specific action only. |

## Dependency Rules

Allowed:

- Agent/Team list pages may depend on their subject stores and server settings store.
- Agent/Team stores may depend on subject-specific GraphQL queries/mutations.
- GraphQL resolvers may depend on subject services.
- Package stores/services may refresh dependent catalogs after package mutations.
- NodeManager may depend on nodeStore, capability probe, remote browser sharing, and window node context.
- MCP UI/services may manage local MCP config and local tool discovery.

Forbidden:

- Agent/Team catalog pages must not import `nodeStore`, `nodeSyncStore`, `NodeSyncTargetPickerModal`, `NodeSyncReportPanel`, or node sync types for catalog actions.
- NodeManager must not import `nodeSyncStore`, `SyncEntityType`, or node sync report components.
- Frontend code must not import `nodeSyncMutations.ts` or `types/nodeSync.ts`.
- Backend schema must not register node sync resolvers.
- Backend services must not call node sync services as a hidden compatibility path.
- MCP config must not be copied between nodes by any node-level operation.
- Do not introduce a generic `refreshCatalog(entityTypes: string[])` command; split by subject-owned refresh mutations.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `refreshAgentDefinitionCatalog(): Boolean` | Agent definition catalog | Refresh local backend agent definition cache from configured roots. | None | New GraphQL mutation in `agent-definition.ts`. |
| `refreshAgentTeamDefinitionCatalog(): Boolean` | Agent team definition catalog | Refresh local backend team definition cache from configured roots; refresh agent cache first for member-reference freshness. | None | New GraphQL mutation in `agent-team-definition.ts`. |
| `agentDefinitions` query | Agent definition catalog | Return visible agent definitions. | None | Existing; used after refresh. |
| `agentTeamDefinitions` query | Agent team definition catalog | Return root/team definitions. | None | Existing; used after refresh. |
| MCP config import/configure/discover APIs | MCP server config | Manage local MCP config and tools. | MCP server ID/config payloads | Existing; retained. |
| Node store add/open/rename/remove actions | Node registry | Manage node entries/windows. | Node IDs/base URLs | Existing; retained without sync. |
| `runNodeSync` | Node sync | Removed. | N/A | Delete GraphQL mutation/API. |
| `exportSyncBundle` / `importSyncBundle` | Node sync | Removed. | N/A | Delete GraphQL query/mutation/API. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `refreshAgentDefinitionCatalog` | Yes | Yes | Low | Keep agent-specific. |
| `refreshAgentTeamDefinitionCatalog` | Yes | Yes | Low | Keep team-specific. |
| `runNodeSync` | No for current product | No longer applicable | High | Remove. |
| `exportSyncBundle` / `importSyncBundle` | No for current product | No longer applicable | High | Remove. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent catalog refresh | `refreshAgentDefinitionCatalog` | Yes | Low | Use "refresh" not "sync". |
| Team catalog refresh | `refreshAgentTeamDefinitionCatalog` | Yes | Low | Use "refresh" not "sync". |
| Node synchronization | `NodeSync*` | Yes historically, obsolete now | High | Delete to avoid product drift. |
| MCP local discovery | Existing MCP discovery/import names | Yes if docs avoid cross-node "sync" | Medium | Update docs/UI wording if any cross-node sync implication remains. |

## Applied Patterns (If Any)

- **Repository/provider cache refresh**: existing cached providers remain behind subject services; refresh mutations call service methods, not providers directly.
- **Thin GraphQL resolver facade**: resolvers expose subject operations and delegate to services.
- No new coordinator/facade pattern should be introduced. A generic catalog-sync or node-sync replacement would violate the clean-cut removal decision.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts` | File | Agent Definition GraphQL | Add refresh mutation; keep existing agent operations. | Existing subject resolver. | Team/MCP/node sync operations. |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | File | Agent Team Definition GraphQL | Add refresh mutation; keep existing team operations. | Existing subject resolver. | Generic sync or MCP operations. |
| `autobyteus-server-ts/src/api/graphql/types/node-sync.ts` | File | Removed | Delete. | Obsolete API. | N/A |
| `autobyteus-server-ts/src/api/graphql/types/node-sync-control.ts` | File | Removed | Delete. | Obsolete API. | N/A |
| `autobyteus-server-ts/src/sync/services/` | Folder | Removed | Delete node sync services. | Obsolete capability area. | N/A |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | File | Schema composition | Remove node sync resolver imports/registrations. | Public API composition. | Dead resolver references. |
| `autobyteus-web/components/agents/AgentCard.vue` | File | Agent card | Remove sync action. | Existing presentational component. | Node/sync logic. |
| `autobyteus-web/components/agents/AgentList.vue` | File | Agent catalog page | Remove sync orchestration; call refresh reload. | Existing page. | Node target selection/reporting. |
| `autobyteus-web/components/agentTeams/AgentTeamCard.vue` | File | Team card | Remove sync action. | Existing presentational component. | Node/sync logic. |
| `autobyteus-web/components/agentTeams/AgentTeamList.vue` | File | Team catalog page | Remove sync orchestration; call refresh reload. | Existing page. | Node target selection/reporting. |
| `autobyteus-web/components/settings/NodeManager.vue` | File | Node management | Remove sync controls/state; keep node management. | Existing settings page. | Definition/MCP state copy. |
| `autobyteus-web/components/sync/` | Folder | Removed | Delete folder if empty after removing components/tests. | No remaining frontend sync component owner. | N/A |
| `autobyteus-web/stores/nodeSyncStore.ts` | File | Removed | Delete. | No remaining caller. | N/A |
| `autobyteus-web/types/nodeSync.ts` | File | Removed | Delete. | No remaining DTOs. | N/A |
| `autobyteus-web/graphql/mutations/nodeSyncMutations.ts` | File | Removed | Delete. | No remaining GraphQL operations. | N/A |
| `autobyteus-web/graphql/mutations/agentDefinitionMutations.ts` | File | Agent frontend GraphQL | Add refresh mutation. | Subject-specific mutation file. | Team/generic sync operations. |
| `autobyteus-web/graphql/mutations/agentTeamDefinitionMutations.ts` | File | Team frontend GraphQL | Add refresh mutation. | Subject-specific mutation file. | Agent/generic sync operations except explicit dependency refresh handled backend. |
| `autobyteus-web/stores/agentDefinitionStore.ts` | File | Agent store | Add refresh+reload action. | Existing agent store. | Node sync state. |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | File | Team store | Add refresh+reload action. | Existing team store. | Node sync state. |
| `autobyteus-web/generated/graphql.ts` | File | Generated GraphQL | Regenerate/update. | Mirrors schema. | Node sync generated types/hooks. |
| `autobyteus-web/localization/messages/**` | Files | Localization | Remove sync keys/update wording. | Mirrors UI. | Dead sync strings. |
| `autobyteus-web/docs/*.md` | Files | Product docs | Remove sync docs; clarify package/MCP flows. | User guidance. | Cross-node sync instructions. |
| Sync-specific test files | Files | Tests | Delete/update. | Validation follows target behavior. | Removed behavior assertions. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/` | Transport | Yes | Low | Subject resolver files already split by agent/team/MCP/etc. Remove node sync files. |
| `autobyteus-server-ts/src/sync/services/` | Main-Line Domain-Control, obsolete | No after requirement change | High | Delete folder; no valid owner remains. |
| `autobyteus-web/components/agents/` | UI feature | Yes | Low | Remove node concerns from catalog components. |
| `autobyteus-web/components/agentTeams/` | UI feature | Yes | Low | Remove node concerns from catalog components. |
| `autobyteus-web/components/settings/` | Settings UI | Mixed justified | Medium | NodeManager may still coordinate node UI concerns; remove sync to reduce mixing. |
| `autobyteus-web/components/sync/` | Obsolete UI feature | No after removal | High | Delete if empty. |
| `autobyteus-web/stores/` | Frontend state stores | Yes by subject | Low | Delete nodeSync store; add subject refresh actions to agent/team stores. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Updating imported agents | `Reload -> refreshAgentDefinitionCatalog -> agentDefinitions query` | `Agent card Sync -> choose target node -> copy app-data files` | Reload refreshes current configured sources; sync copies stale/wrong state. |
| Updating imported teams | `Reload -> refreshAgentTeamDefinitionCatalog -> agentTeamDefinitions query` | `Team card Sync -> import bundle into target app-data` | Team cache freshness is solved locally without cross-node copy. |
| MCP setup | `Import/edit MCP JSON on this machine -> discover/register tools` | `Copy MCP config from another node` | Local paths/secrets/env are machine-specific. |
| Node management | `Add remote node -> probe capabilities -> show Open/Rename/Remove` | `Add remote node -> bootstrap sync definitions/MCP` | Node registration is useful without state synchronization. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Hide Sync only when no target nodes exist | Would reduce the immediate confusing no-target button. | Rejected | Remove Sync entirely; the feature is obsolete even when targets exist. |
| Keep Settings → Nodes full sync as an advanced feature | It previously looked like the coherent owner for cross-node sync. | Rejected | Remove full/bootstrap sync; keep node management only. |
| Keep backend node sync APIs with no UI callers | Could reduce backend removal work. | Rejected | Remove resolvers/services/tests/generated artifacts to avoid future boundary bypass. |
| Mark backend sync deprecated | A staged deprecation might seem safer. | Rejected | User approved full removal and design principles reject legacy retention for in-scope behavior. |
| Auto-rewrite MCP paths during sync | Might try to salvage MCP sync. | Rejected | Use explicit per-machine MCP import/configuration; path/env/secrets are not safely inferable. |
| Create generic `refreshCatalog(entityTypes)` | Might look reusable. | Rejected | Use subject-specific refresh mutations to keep identity and ownership explicit. |

## Derived Layering (If Useful)

- UI layer: Agent/Team/Node/MCP settings pages show actions and loading/error states.
- Store layer: subject stores own frontend state and Apollo calls.
- GraphQL transport layer: subject resolvers expose explicit operations.
- Domain/service layer: definition services own cache refresh and provider encapsulation.
- Persistence/provider layer: file/package providers read configured roots.

The key layering rule is not vertical abstraction; it is ownership. UI must use store/resolver/service boundaries and must not bypass into node sync internals or provider internals.

## Migration / Refactor Sequence

1. **Add catalog refresh interfaces first.**
   - Add `refreshAgentDefinitionCatalog(): Boolean` in `agent-definition.ts` calling `AgentDefinitionService.getInstance().refreshCache()`.
   - Add `refreshAgentTeamDefinitionCatalog(): Boolean` in `agent-team-definition.ts` calling `AgentDefinitionService.getInstance().refreshCache()` then `AgentTeamDefinitionService.getInstance().refreshCache()`.
   - Add frontend GraphQL mutation documents and store actions `refreshAndReloadAllAgentDefinitions` / `refreshAndReloadAllAgentTeamDefinitions`.
2. **Switch list Reload to refresh+reload.**
   - Update `AgentList.vue` and `AgentTeamList.vue` `handleReload` to call the new store actions plus existing server settings reload.
3. **Remove Agent/Team selective sync UI.**
   - Remove sync buttons/emits/computed values from cards.
   - Remove sync imports/state/templates/functions from list pages.
   - Remove node registry/node sync initialization from list pages.
4. **Remove Settings → Nodes sync UI.**
   - Remove bootstrap checkbox/status and full sync section.
   - Remove `useNodeSyncStore`, `NodeSyncReportPanel`, `SyncEntityType`, full sync state, bootstrap state, `onRunFullSync`, `syncFullSyncDefaults`.
   - Keep add-node probe/registry behavior and normal degraded/warning/success messaging.
5. **Delete frontend node sync artifacts.**
   - Delete `nodeSyncStore.ts`, `nodeSyncMutations.ts`, `types/nodeSync.ts`, `components/sync/*`, and associated tests.
6. **Delete backend node sync API/services.**
   - Remove node sync resolver imports/registrations from schema.
   - Delete `node-sync.ts`, `node-sync-control.ts`, and `src/sync/services/*`.
   - Delete sync-specific backend tests. If `json-file-persistence-contract.e2e.test.ts` contains non-sync persistence coverage worth retaining, migrate that coverage into package/definition CRUD tests before deleting sync calls.
7. **Regenerate/update generated artifacts.**
   - Update `autobyteus-web/generated/graphql.ts` by the repo's codegen path or manually remove stale node sync artifacts if codegen is not available.
   - Remove/add generated localization entries according to the localization workflow.
8. **Update tests/docs/localization.**
   - Update card/list/NodeManager tests to assert absence of sync controls and validate reload behavior.
   - Add/adjust backend GraphQL tests for refresh mutations.
   - Update docs to describe package/Git/folder update + Reload and explicit MCP config/import/discovery.
9. **Final dead-reference verification.**
   - `rg "NodeSync|nodeSync|runNodeSync|exportSyncBundle|importSyncBundle|NodeSyncTargetPickerModal|NodeSyncReportPanel|sync-agent|sync-team|run_full_sync|bootstrap_sync" autobyteus-web autobyteus-server-ts`
   - Treat file-explorer `*Synchronizer` classes and unrelated local "tool discovery" wording as separate; do not delete unrelated synchronization concepts blindly.

## Key Tradeoffs

- **Simplicity over power-user copy convenience:** Removing sync may remove a narrow convenience for identical machines or local app-data copies, but it eliminates a misleading product model. Future explicit package export/import is a safer replacement.
- **Explicit Reload over automatic watchers:** Reload gives users control and is easier to validate. Filesystem watchers for all package roots are out of scope.
- **Subject-specific refresh over generic catalog refresh:** Two explicit mutations avoid ambiguous entity-type selectors and keep ownership clear.
- **Full backend removal over hidden API retention:** More work now, but avoids stale generated types and future misuse.

## Risks

- Generated GraphQL artifacts may be large and may require the established codegen command; stale generated node sync types will cause confusion or compile failures.
- Some tests may import nodeSync mocks indirectly; all such test scaffolding must be cleaned up.
- Docs may use the word "sync" for local tool discovery. Only remove/reword cross-node synchronization references; do not accidentally remove valid MCP tool discovery behavior.
- If users expect a one-click Git pull for packages, this change does not add it. That should be a separate package-management feature.
- Backend sync removal may expose non-sync persistence assertions embedded in sync tests. Preserve valuable non-sync coverage under definition/package tests before deleting the sync test file.

## Guidance For Implementation

- Keep the implementation deletion-first and compile-driven: remove UI callers, then remove frontend artifacts, then remove backend APIs/services, then clean generated/tests/docs.
- Avoid introducing a replacement `sync` term. Use `refresh`, `reload`, `import`, `configure`, or `discover` according to the real operation.
- For Agent Team refresh, refresh agent definitions before team definitions to avoid stale member-reference dependencies.
- Add tests at the user behavior level:
  - Agent/Team cards do not render `Sync`.
  - Agent/Team lists do not mount sync modal/report components and Reload invokes refresh+reload.
  - NodeManager add-node does not call sync and no full sync controls render.
  - Backend schema no longer exposes node sync operations and exposes the new refresh mutations.
- Run the most targeted frontend/backend unit tests first, then broader typecheck/test suites as practical.
