# Design Spec

## Current-State Read

The desktop left sidebar renders `WorkspaceAgentRunsTreePanel` from `AppLeftPanel.vue`. On mount, the panel loads workspace/catalog data and run-history data, then renders one `WorkspaceHistoryWorkspaceSection` per projected workspace node.

Current expansion behavior is view-local and defaults too open:

- `useWorkspaceHistoryTreeState.ts` owns workspace, agent, and team-run expansion state.
  - `isWorkspaceExpanded(workspaceRootPath)` currently defaults to `true`.
  - `isAgentExpanded(workspaceRootPath, agentDefinitionId)` currently defaults to `true`.
  - `isTeamExpanded(teamRunId)` already defaults to `false`, with selected team runs expanded by watcher.
- `WorkspaceHistoryWorkspaceSection.vue` owns team-definition expansion locally.
  - `isTeamDefinitionExpanded(groupKey)` currently defaults to `true`.
- `runHistoryStore.ts`, `runHistoryReadModel.ts`, and `runTreeProjection.ts` own data loading/projection, not UI expansion defaults.

The current owner boundaries are mostly healthy: history data projection is separate from view expansion. The only local ownership tightening needed is to move team-definition expansion state from the section component into the same tree-state owner as workspace/agent/team-run expansion. This lets default collapse, manual toggles, refresh stability, and selected-path reveal be governed consistently.

## Intended Change

Replace the ordinary initial expanded tree with progressive disclosure:

1. Initial sidebar render shows workspace rows only.
2. Clicking a workspace expands that workspace and shows next-level agent and team-definition group rows.
3. Agent run lists and team run lists remain collapsed until the user opens the specific agent/team-definition group.
4. Manual expansion/collapse state survives background history refresh while the component remains mounted.
5. Newly created workspaces remain expanded after creation.
6. Explicit selected run/team reveal expands only the selected ancestry path, not unrelated workspaces/groups, and does so at most once for the current stable selection key so later manual collapse is not undone by quiet refresh.

This is a frontend-only behavior change. Do not alter backend history APIs, storage, query limits, projection sorting, row action semantics, or team hydration semantics.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX improvement.
- Current design issue found (`Yes`/`No`/`Unclear`): No broad design issue. One local ownership tightening is beneficial.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for the history system overall; local view-state ownership should be tightened for team-definition expansion.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, but only a small local refactor: lift team-definition expansion state into `useWorkspaceHistoryTreeState`.
- Evidence: Workspace/agent/team-run expansion is already in `useWorkspaceHistoryTreeState`; team-definition expansion is the one nested expansion level still local to `WorkspaceHistoryWorkspaceSection.vue`. The approved behavior needs consistent default collapse and selected-path reveal across all levels.
- Design response: Change default expansion fallbacks to collapsed, extend the tree-state contract for team-definition expansion, add a pending/processed selected-reveal guard in `useWorkspaceHistoryTreeState`, and keep all data/projection owners unchanged.
- Refactor rationale: Without lifting team-definition expansion and centralizing the selected-reveal guard, selected team reveal would require a component-local backchannel or would fail to reveal a selected team row when team-definition groups default collapsed; without the guard, quiet refresh could re-open a path after manual collapse.
- Intentional deferrals and residual risk, if any: Do not add persisted expansion preferences or aggregate active-run indicators in this ticket. Hidden active runs may be less visually discoverable until the user expands a group; accepted for the compactness goal.

## Terminology

- `Workspace row`: top-level row for one workspace root path.
- `Agent group row`: second-level row for an agent definition under a workspace.
- `Team-definition group row`: second-level row grouping team runs by team definition under a workspace.
- `Run row`: agent run row under an agent group.
- `Team run row`: team run row under a team-definition group.
- `Team member row`: member row under an expanded team run.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> reusable structure check -> final file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace old expanded-by-default fallbacks directly. Do not add a setting, compatibility branch, or dual rendering mode to preserve old default expansion.
- Obsolete path in scope: default fallback values of `true` for workspace, agent group, and team-definition group expansion.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | App left sidebar mount | Collapsed workspace-only tree render | `WorkspaceAgentRunsTreePanel` + `useWorkspaceHistoryTreeState` | Defines ordinary initial visibility. |
| DS-002 | Primary End-to-End | User toggles workspace/group row | Target subtree visible/hidden | `useWorkspaceHistoryTreeState` via `WorkspaceHistoryWorkspaceSection` | Defines intentional progressive disclosure. |
| DS-003 | Return-Event | Periodic history refresh | Existing expansion choices preserved | `WorkspaceAgentRunsTreePanel` refresh + tree-state refs | Prevents refresh from undoing manual choices. |
| DS-004 | Bounded Local | Selection state changes or pending selected data becomes available | Selected ancestry path expanded once for the current stable selection key | `useWorkspaceHistoryTreeState` | Prevents explicit selected runs/teams from being hidden by collapsed defaults without undoing later manual collapse on refresh. |

## Primary Execution Spine(s)

- DS-001: `AppLeftPanel -> WorkspaceAgentRunsTreePanel -> runHistoryStore.getTreeNodes/getTeamNodes -> useWorkspaceHistoryTreeState collapsed defaults -> WorkspaceHistoryWorkspaceSection render`
- DS-002: `User click -> WorkspaceHistoryWorkspaceSection button handler -> useWorkspaceHistoryTreeState toggle -> Vue re-render target subtree`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The left sidebar loads the existing run-history projection, then tree-state default functions decide which levels render. New defaults hide children until explicit expansion. | Sidebar panel, history projection, expansion state, section renderer | `WorkspaceAgentRunsTreePanel` orchestrates; `useWorkspaceHistoryTreeState` governs expansion | Store fetch, avatar lookup, localization, status classes |
| DS-002 | User clicks a visible row. The section delegates to tree-state methods, which update keyed expansion maps and trigger a local re-render. | Workspace row, agent group row, team-definition group row, expansion maps | `useWorkspaceHistoryTreeState` | Row actions that should not toggle parent rows use existing `.stop` behavior |
| DS-003 | Background refresh updates tree data, but expansion refs live outside the projection result and therefore keep prior manual choices for stable keys. | Refresh timer, store projection, expansion maps | `WorkspaceAgentRunsTreePanel` + `useWorkspaceHistoryTreeState` | History API failures remain best-effort/no-op as today |
| DS-004 | Tree-state derives a stable selected-reveal key from selection sources. When the key is new, it tries to resolve the matching ancestry. If nodes are not available yet, it records the key as pending. When the path resolves, it expands only that ancestry and marks the current key processed so quiet refresh does not re-open it after manual collapse. | Selection stores, selected-reveal guard, workspace nodes, team nodes, expansion maps | `useWorkspaceHistoryTreeState` | Avoid overriding later manual collapse for the same selected run/team while still revealing newly selected or newly available paths |

## Spine Actors / Main-Line Nodes

- `AppLeftPanel.vue`: shell entry that mounts the Workspaces history panel.
- `WorkspaceAgentRunsTreePanel.vue`: panel orchestrator for loading, refresh, and section wiring.
- `useWorkspaceHistoryTreeState.ts`: authoritative owner for history tree expansion state and status class helpers.
- `WorkspaceHistoryWorkspaceSection.vue`: renderer and click surface for one workspace subtree.
- `runHistoryStore`: data source/projection facade for workspace, agent, and team nodes.

## Ownership Map

- `AppLeftPanel.vue` owns sidebar layout and placement only. It must not own expansion defaults.
- `WorkspaceAgentRunsTreePanel.vue` owns data loading cadence, refresh timer, and assembling section state/actions. It delegates expansion policy to `useWorkspaceHistoryTreeState`.
- `useWorkspaceHistoryTreeState.ts` owns expansion maps, default expansion policy, manual toggles, selected-path reveal guard/pending state, and status-class helpers.
- `WorkspaceHistoryWorkspaceSection.vue` owns rendering markup and event forwarding for one workspace subtree. It should not own persistent expansion policy for a nested tree level.
- `runHistoryStore` and read-model/projection utilities own history data shape, sorting, and grouping. They must not own UI expansion state.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceHistorySectionState` contract | `useWorkspaceHistoryTreeState` | Passes state methods from panel to section without importing the composable inside the child renderer | Data loading, history projection, backend calls |
| `runHistoryStore.getTreeNodes/getTeamNodes` | Run-history read model/projection utilities | Provides rendered tree data to the panel | UI expansion defaults |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Workspace expansion default `?? true` | Old default causes top-level clutter | `?? false` in `useWorkspaceHistoryTreeState.ts`, plus selected/create explicit expansion | In This Change | Clean replacement, no setting. |
| Agent expansion default `?? true` | Old default exposes run rows immediately after workspace opens | `?? false` in `useWorkspaceHistoryTreeState.ts`, plus toggle and selected ancestry reveal | In This Change | Satisfies extra intentional click. |
| Component-local team-definition expansion ref/default | It fragments nested expansion state and blocks selected team ancestry reveal | New tree-state methods keyed by workspace + team-definition group key | In This Change | Remove local `expandedTeamDefinitions` ref from section. |
| Team-definition expansion default `?? true` | Old default exposes all team runs immediately after workspace opens | `?? false` in tree-state owner | In This Change | Team-run member default remains unchanged. |

## Return Or Event Spine(s) (If Applicable)

- DS-003 Refresh event spine: `setInterval -> runHistoryStore.refreshTreeQuietly -> store projection updates -> same keyed expansion maps -> stable rendered expansion state`.
- Selection event spine: `selectionStore/runHistoryStore selected IDs -> stable selected-reveal key -> pending/processed guard -> one-shot selected ancestry expansion -> section render reveals selected path`.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `useWorkspaceHistoryTreeState`

- Workspace toggle: `toggleWorkspace(rootPath) -> setWorkspaceExpanded(rootPath, !current)`.
- Agent toggle: `toggleAgent(rootPath, agentDefinitionId) -> setAgentExpanded(compoundKey, !current)`.
- Team-definition toggle: `toggleTeamDefinition(rootPath, groupKey) -> setTeamDefinitionExpanded(compoundKey, !current)`.
- Team-run toggle: keep existing `toggleTeam(teamRunId) -> setTeamExpanded(teamRunId, !current)`.
- Selected ancestry reveal: `selectedRevealKey + nodes available -> if key not processed for current stable interval, locate ancestor keys -> set only those ancestors expanded -> mark key processed; if not found, keep key pending until nodes arrive`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Avatar fallback/error state | DS-001 | Section rendering | Display avatars/initials for visible rows | Visual presentation only | Would distract expansion policy with unrelated UI state. |
| Relative-time formatting | DS-001 | Section rendering | Render last activity labels for visible run rows | Existing presentation concern | Should not drive visibility. |
| Row actions: create/archive/delete/terminate/select | DS-002 | Section actions | Preserve existing run/team workflows once rows are visible | User workflow continuity | Coupling row actions to expansion defaults could break `.stop` behavior. |
| Store data projection | DS-001, DS-003 | Panel data source | Build workspace/agent/team nodes | Existing read-model responsibility | Putting expansion into data projection would reset on refresh and mix UI with data. |
| Test selectors / ARIA attributes | DS-002 | UI tests/accessibility | Stable targeting and state semantics | Helpful for changed collapsed defaults | Lack of selectors can make tests brittle. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Workspace/agent/team expansion state | Workspace history tree state composable | Extend | Already owns most expansion state and status helpers | N/A |
| Team-definition expansion state | Workspace history tree state composable | Extend | Consolidates nested expansion policy and selected reveal | N/A |
| Tree data | Run-history store/read model | Reuse unchanged | Data is correct; visibility policy is separate | N/A |
| Tests | Existing history panel unit/regression/integration tests | Extend | They cover the impacted UI workflows | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace history UI | Rendering and interaction for history tree | DS-001, DS-002 | `WorkspaceAgentRunsTreePanel`, `WorkspaceHistoryWorkspaceSection` | Extend | Frontend-only. |
| Workspace history tree state | Expansion defaults, toggles, selected ancestry reveal | DS-001, DS-002, DS-004 | `useWorkspaceHistoryTreeState` | Extend | Main change owner. |
| Run-history read model | Workspace/agent/team node data | DS-001, DS-003 | `runHistoryStore` | Reuse | No behavior change. |
| Test suite | Regression evidence | All | Vitest component/integration tests | Extend | Add collapsed-default assertions and update existing interactions. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Workspace history tree state | Expansion-state owner | Default collapse, keyed expansion maps, selected ancestry reveal with pending/processed guard | Existing owner for expansion state | Existing run/team node types |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspace history UI | Parent-child state contract | Add team-definition expansion methods to section state | Keeps child renderer decoupled from composable imports | Existing section types |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history UI | Section renderer | Render collapsed/expanded rows and forward toggle calls | Existing rendering owner | Contract methods |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspace history UI | Panel orchestrator | Wire new state methods to section contract; preserve create workspace expansion | Existing wiring point | Composable return |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Tests | Main component tests | Add default collapse tests; update interactions | Existing coverage | Test helper |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Tests | Regression tests | Expand ancestry before row actions | Existing coverage | Test helper |
| `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Tests | Integration tests | Expand workspace/team group before selecting team rows | Existing coverage | Test helper |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Expansion key construction for workspace + subject ID | Keep local private helpers in `useWorkspaceHistoryTreeState.ts` | Workspace history tree state | Only needed by one composable | N/A | N/A | Generic global key utility |
| Test expansion helper | Local helper in affected spec files unless repetition becomes large | Tests | Test-only interaction setup | N/A | N/A | Production API |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Existing `RunTreeWorkspaceNode`, `TeamTreeNode` | Yes | N/A | Low | No change. |
| `WorkspaceHistorySectionState` contract | Yes after adding explicit team-definition methods | N/A | Low | Add methods with explicit workspace/group identity; avoid generic `toggleNode`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Workspace history tree state | Authoritative tree expansion owner | Workspace/agent/team-definition/team-run expansion maps, collapsed defaults, one-shot selected ancestry reveal guard, status classes | Existing composable already owns this state category | Existing run-history types |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspace history UI | Section state interface | Explicit state/toggle API consumed by section | Keeps parent-child boundary typed | Existing status and row types |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history UI | Section renderer | Uses state contract for all expansion levels; no local team-definition expansion policy | Rendering belongs here; policy does not | Contract methods |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspace history UI | Panel orchestrator | Supplies new state methods, preserves loading/refresh/create behavior | Existing orchestration owner | Composable return |
| Existing tests under `components/workspace/history/__tests__` | Tests | Validation | Collapse-default and expanded-workflow coverage | Existing test owners | Test fixtures/helpers |

## Ownership Boundaries

The authoritative expansion boundary is `useWorkspaceHistoryTreeState`. Components above or beside it should ask this composable whether a node is expanded and call explicit setter/toggle methods. They must not maintain parallel expansion defaults for one nested level.

`WorkspaceHistoryWorkspaceSection` remains a renderer: it receives row data, state methods, avatar bindings, and row actions. It can compute display groups from props, but it should not decide durable/default expansion policy independently.

`runHistoryStore` remains a data boundary. It must not receive UI expansion flags and must not mutate data projection to hide rows.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useWorkspaceHistoryTreeState` | `expandedWorkspace`, `expandedAgents`, `expandedTeamDefinitions`, `expandedTeams`, selected reveal key derivation, pending reveal key, processed/current-key guard | `WorkspaceAgentRunsTreePanel`, `WorkspaceHistoryWorkspaceSection` through contract | Component-local expansion map for team definitions with different defaults; unconditional selected watcher that reopens after manual collapse | Add explicit team-definition methods and one-shot selected-reveal guard to composable/contract |
| `runHistoryStore` read-model methods | Tree node projection and team node projection | `WorkspaceAgentRunsTreePanel`, tree state selected-reveal lookup | Component reconstructing history data from raw store state | Add/consume existing typed read methods |

## Dependency Rules

Allowed:

- `WorkspaceAgentRunsTreePanel` may import and instantiate `useWorkspaceHistoryTreeState`.
- `WorkspaceAgentRunsTreePanel` may pass explicit state methods into `WorkspaceHistoryWorkspaceSection` through `WorkspaceHistorySectionState`.
- `WorkspaceHistoryWorkspaceSection` may call state contract methods in response to clicks.
- `useWorkspaceHistoryTreeState` may inspect `runHistoryStore.getTreeNodes()`, `getTeamNodes()`, `selectionStore.selectedType/selectedRunId`, `runHistoryStore.selectedTeamRunId`, and `runHistoryStore.selectedRunId` to derive and resolve selected ancestry.

Forbidden:

- Do not add backend/API expansion flags.
- Do not put expansion defaults into run-history projection utilities.
- Do not keep team-definition expansion as a separate component-local policy after moving workspace/agent defaults to collapsed.
- Do not add a compatibility setting to preserve expanded-by-default behavior.
- Do not use a generic untyped `toggleNode(id)` that blurs workspace, agent, team-definition, and team-run identities.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `isWorkspaceExpanded` / `setWorkspaceExpanded` / `toggleWorkspace` | Workspace expansion | Query/set/toggle top-level visibility | `workspaceRootPath: string` | Default false. |
| `isAgentExpanded` / `setAgentExpanded` / `toggleAgent` | Agent group expansion within workspace | Query/set/toggle agent run-list visibility | `workspaceRootPath: string`, `agentDefinitionId: string` | Add setter if selected reveal needs it. Default false. |
| `isTeamDefinitionExpanded` / `setTeamDefinitionExpanded` / `toggleTeamDefinition` | Team-definition group expansion within workspace | Query/set/toggle team-run-list visibility | `workspaceRootPath: string`, `groupKey: string` | New composable-owned API. Default false. |
| `isTeamExpanded` / `setTeamExpanded` / `toggleTeam` | Team run member expansion | Existing team-member visibility | `teamRunId: string` | Keep default false and existing selected team behavior. |
| Internal `selectedRevealKey` | Selected ancestry reveal | Derive the current run/team path that may need one-shot reveal | `agent:${runId}` or `team:${teamRunId}` from authoritative selection sources | Internal to `useWorkspaceHistoryTreeState`; not exposed to section renderer. |
| Internal `pendingRevealKey` / `processedCurrentSelectionKey` guard | Manual-collapse-safe reveal | Remember unresolved selected keys and whether the current stable key was already revealed | Stable selected key string plus boolean/last-key state | Prevents quiet refresh from re-opening a manually collapsed selected path. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Workspace expansion methods | Yes | Yes | Low | N/A |
| Agent expansion methods | Yes | Yes | Low | Use workspace + agent definition compound key. |
| Team-definition expansion methods | Yes | Yes | Low | Use workspace + group key; avoid run ID because this is group-level. |
| Team-run expansion methods | Yes | Yes | Low | Keep existing team run ID. |
| Internal selected reveal key derivation | Yes | Yes | Low | Use explicit `agent:${runId}` / `team:${teamRunId}` keys from documented selection-source priority. |
| Internal pending/processed reveal guard | Yes | Yes | Low | Keep guard private to `useWorkspaceHistoryTreeState`; do not expose as section API. |

## Selected-Reveal Guard Contract (AR-001 Resolution)

`useWorkspaceHistoryTreeState` MUST implement selected ancestry reveal as a one-shot action for the current stable selection-key interval. This is the authoritative contract for avoiding refresh-after-manual-collapse regressions.

### Authoritative selection sources

Derive one `selectedRevealKey` in this priority order:

1. If `selectionStore.selectedType === 'team'` and `selectionStore.selectedRunId` is non-empty: `team:${selectionStore.selectedRunId}`.
2. If `selectionStore.selectedType === 'agent'` and `selectionStore.selectedRunId` is non-empty: `agent:${selectionStore.selectedRunId}`.
3. If `runHistoryStore.selectedTeamRunId` is non-empty: `team:${runHistoryStore.selectedTeamRunId}`.
4. If `runHistoryStore.selectedRunId` is non-empty: `agent:${runHistoryStore.selectedRunId}`.
5. Otherwise there is no selected reveal key.

`runHistoryStore.selectedTeamMemberRouteKey` may inform member focus elsewhere, but the expansion reveal key stays at `team:${teamRunId}` because the sidebar ancestry that needs opening is workspace -> team-definition group -> team run.

### Guard state

The composable owns these private refs or equivalent state:

- `observedSelectionKey`: last non-null/current selected key observed by the reveal loop.
- `revealAppliedForObservedKey`: whether reveal has already succeeded for the current stable selected-key interval.
- `pendingRevealKey`: current selected key waiting for matching tree/team nodes to become available.

### Reveal algorithm

1. Watch the derived `selectedRevealKey` and the tree data needed to resolve it.
2. When `selectedRevealKey` changes from the previous observed key, set `observedSelectionKey` to the new key, set `revealAppliedForObservedKey = false`, and set `pendingRevealKey` to that key if it is non-empty.
3. If there is no selected key, clear `pendingRevealKey` and do not change expansion maps.
4. If `revealAppliedForObservedKey` is already true for the current observed key, return without changing expansion maps. This is the manual-collapse safety rule for quiet refresh.
5. If the current key cannot yet be resolved to a visible ancestry path, keep `pendingRevealKey` equal to that key and wait for later node availability.
6. When the current key resolves, expand only the matching ancestry:
   - Agent: matching workspace and agent group.
   - Team: matching workspace, team-definition group, and team run.
7. After successful reveal, set `revealAppliedForObservedKey = true` and clear `pendingRevealKey`.
8. Re-run reveal only when the selected key changes to a different run/team key or when a pending key first becomes resolvable. Do not re-run merely because `refreshTreeQuietly()` produced new node object identities for the same selected key.

### Manual-collapse rule

Manual toggles remain authoritative after the one-shot reveal. If the user collapses the selected workspace, selected agent group, selected team-definition group, or selected team run after reveal, a quiet refresh with the same selected key MUST NOT reopen it. A later explicit selection change to a different key may reveal that new key's ancestry.

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Workspace row | `workspaceNode` | Yes | Low | N/A |
| Agent group | `agentNode` | Yes | Low | N/A |
| Team-definition group | `TeamDefinitionGroup`, `groupKey` | Yes | Low | Keep terminology consistent. |
| Team run | `team` / `TeamTreeNode` | Yes | Low | N/A |

## Applied Patterns (If Any)

- Keyed UI state map: existing pattern using records keyed by stable identity. Extend it to team-definition groups.
- Progressive disclosure: collapse higher-volume children until the user opens the relevant parent.
- One-shot selected-path reveal: explicit selection can open only its ancestry path without changing global defaults or re-opening the same path after manual collapse during quiet refresh.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | File | Tree expansion state | Collapsed defaults, expansion maps, one-shot selected ancestry reveal, status helpers | Existing expansion state owner | Backend calls, data fetching side effects beyond existing store reads |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | File | Parent-child UI contract | Add explicit team-definition expansion methods | Existing typed contract | Implementation state |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | Workspace subtree renderer | Render collapsed/expanded hierarchy and call contract methods | Existing renderer | Durable expansion defaults |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | File | Panel orchestration | Wire expanded state methods and keep refresh/create behavior | Existing panel owner | Nested expansion policy not mediated by tree state |
| `autobyteus-web/components/workspace/history/__tests__/...` | Files | Test coverage | Default collapsed behavior and existing workflow regressions | Existing test location | Production helpers |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/history` | UI renderer + UI contracts | Yes | Low | Existing compact folder is appropriate for component-level change. |
| `composables` | UI state/composable owner | Yes | Low | Existing location for tree state. |
| `stores` / `utils` run history files | Data/read-model | Yes | Low | No changes planned. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Initial render | `Workspace A`, `Workspace B` only | `Workspace A -> Agent -> run1, run2, run3` immediately | Confirms compact startup. |
| Expanded workspace | `Workspace A -> Agent One (12), Agent Two (4), Teams -> Software Engineering Team (20)` | Opening workspace reveals every run under every group | Preserves useful group navigation. |
| Expanded group | `Workspace A -> Agent One (12) -> run1, run2` | User must search through all groups' histories after one workspace click | Shows intentional one-more-click behavior. |
| Selected reveal | Selected `run-1` expands only `Workspace A -> Agent One`; if the user collapses `Agent One`, a 5-second quiet refresh does not reopen it while `agent:run-1` remains the stable selected key | Selected run expands all workspaces and all groups, or an unconditional watcher reopens the same path after manual collapse | Prevents collapsed defaults from hiding context while preserving user authority after the initial reveal. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| User setting for old expanded-by-default behavior | Could preserve previous default | Rejected | Replace default with approved collapsed progressive disclosure. |
| Dual mode based on history count | Could expand small histories but collapse large ones | Rejected for this ticket | Keep predictable behavior: always collapsed defaults. |
| Backend-provided expansion hints | Could centralize state outside UI | Rejected | Expansion is local UI state; keep backend unchanged. |

## Derived Layering (If Useful)

Layer shape remains unchanged:

- Shell/component layer: `AppLeftPanel`, `WorkspaceAgentRunsTreePanel`, `WorkspaceHistoryWorkspaceSection`.
- UI state composable layer: `useWorkspaceHistoryTreeState`.
- Store/read-model layer: `runHistoryStore`, `runHistoryReadModel`, `runTreeProjection`.

The change stays in the shell/component + UI state layers.

## Migration / Refactor Sequence

1. Extend `WorkspaceHistorySectionState` with explicit team-definition expansion methods:
   - `isTeamDefinitionExpanded(workspaceRootPath, groupKey)`
   - `toggleTeamDefinition(workspaceRootPath, groupKey)`
   - optionally `setTeamDefinitionExpanded(workspaceRootPath, groupKey, expanded)` for selected reveal.
2. Move `expandedTeamDefinitions` state from `WorkspaceHistoryWorkspaceSection.vue` into `useWorkspaceHistoryTreeState.ts`.
3. Change default fallbacks:
   - workspace: false
   - agent group: false
   - team-definition group: false
   - team run: keep false
4. Add `setAgentExpanded` if needed for selected ancestry reveal.
5. Implement selected ancestry reveal in `useWorkspaceHistoryTreeState` using the AR-001 guard contract:
   - Extend `RunHistoryTreeStoreLike` to include `selectedTeamRunId` and, if useful for completeness, `selectedTeamMemberRouteKey`.
   - Derive `selectedRevealKey` from `selectionStore.selectedType/selectedRunId`, `runHistoryStore.selectedTeamRunId`, and `runHistoryStore.selectedRunId` in the priority order documented above.
   - Track `observedSelectionKey`, `revealAppliedForObservedKey`, and `pendingRevealKey` (or equivalent state).
   - For selected agent runs, locate the matching workspace and agent in `workspaceNodes`; expand that workspace and agent group only, then mark the current key processed.
   - For selected team runs, locate the matching workspace/team definition group via `workspaceTeams(workspaceRootPath)` / group-key resolver; expand workspace, team-definition group, and the selected team run only, then mark the current key processed.
   - If the selected path is not available yet, keep the selected key pending and apply reveal only when the path first becomes resolvable.
   - If quiet refresh updates nodes while the same key is already processed, do not change expansion maps.
6. Wire new state methods through `WorkspaceAgentRunsTreePanel.vue` into `WorkspaceHistoryWorkspaceSection.vue`.
7. Remove component-local `expandedTeamDefinitions` ref and local `isTeamDefinitionExpanded` / `toggleTeamDefinition` implementations from the section.
8. Update tests:
   - Add assertions for initial workspace-only rendering.
   - Add assertions for workspace-expanded/group-collapsed rendering.
   - Update existing row action tests to expand workspace/group before selecting rows or row actions.
   - Update historical team lazy hydration tests to expand workspace and team-definition group before clicking team rows.
9. Run focused tests for workspace history panel and lazy hydration. Then run broader frontend test command if feasible.

## Key Tradeoffs

- Pros: Greatly reduces initial clutter; matches user mental model; keeps existing history data model unchanged; simple frontend-only implementation.
- Cons: Users need one extra click to see run histories; active run discoverability in collapsed groups may be less immediate.
- Decision: The user explicitly approved the extra click because users should open only the group they want to work with.

## Risks

- Tests may fail because many existing assertions assume run/team rows are immediately present. Mitigate with test helper expansion and new default-state assertions.
- Selected-path reveal could override manual collapse if implemented as an unconditional watch. Mitigate with a stable selected-reveal key, pending key, and processed/current-key guard so the same selected path is revealed once and not re-expanded on quiet refresh after manual collapse.
- Team-definition group keys must match between render and selected reveal. Mitigate by extracting or duplicating a small private resolver with identical identity logic, or moving the resolver to a tiny local exported utility only if needed by both files. Do not create a generic global helper.

## Guidance For Implementation

- Keep this ticket frontend-only.
- Do not touch backend GraphQL, server run-history storage, or projection sorting/limits.
- Prefer explicit methods per tree level over a generic node-expansion API.
- Keep row action `.stop` behavior unchanged for terminate/archive/delete buttons.
- Add `aria-expanded` and stable `data-test` attributes to workspace/agent/team-definition toggles if tests need reliable targeting.
- Add selected-reveal validation for:
  - selected agent run pending before data load, then one matching workspace/agent group opens when data arrives;
  - selected team run sourced from `runHistoryStore.selectedTeamRunId` when `selectionStore` is not the source, then one matching workspace/team-definition/team-run path opens;
  - after selected path auto-reveal, manually collapse the revealed group, trigger a quiet refresh/tree-node update with the same selected key, and verify the group remains collapsed;
  - changing selection to a different run/team key reveals the new path without expanding unrelated paths.
- Focus validation on:
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
  - `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts`
