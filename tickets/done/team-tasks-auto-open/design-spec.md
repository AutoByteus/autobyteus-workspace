# Design Spec

## Current-State Read

### Team tab active task visibility

`RightSideTabs.vue` already selects the right-side `teamMembers` tab whenever the selected run type is `team`. Inside that tab, `TeamOverviewPanel.vue` is the local owner of the `Messages` / `Tasks` accordion through `expandedSection`. It currently initializes `expandedSection` to `'messages'` and resets it to `'messages'` whenever `activeTeamRunId` changes. `TeamActiveTasksSection.vue` is controlled by `collapsed="!activeTasksExpanded"`, derives entries with `deriveActiveTaskEntries(props.teamContext)`, and renders the task navigator/detail pane. No parent invariant currently connects active task entry presence to `expandedSection`, so active delegated tasks can exist while the section remains collapsed.

### Workspace history nested team tree

`WorkspaceAgentRunsTreePanel.vue` wires Workspace history tree state/actions into `WorkspaceHistoryWorkspaceSection.vue`. `useWorkspaceHistoryTreeState.ts` owns expansion state for workspace rows, agent definition groups, team definition groups, and team run rows. When a team run row is expanded, `WorkspaceHistoryWorkspaceSection.vue` calls a local `flattenTeamMembers(team)` helper that recursively flattens every member descendant. Nested `agent_team` rows show a `TEAM` badge but no nested disclosure state or chevron. This matches the user screenshot: large organizations explode open under one expanded team run and cannot be collapsed at subteam boundaries.

## Intended Change

- Add a parent-owned Team tab invariant: active delegated task entries automatically open the `Tasks` section on initial render, selected team-run change, and new/different active task arrival. Manual collapse/switching remains possible for the same unchanged task set, but a new task set opens `Tasks` again.
- Replace Workspace history team-member flattening with recursive, default-collapsed nested `agent_team` rows. Each nested subteam row with children gets a chevron. The chevron toggles subtree visibility without selecting the row; row body clicks preserve existing member selection/open behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, bounded to frontend presentation state
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Duplicated/Incomplete Tree Presentation Policy
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded
- Evidence:
  - `TeamOverviewPanel.vue` is the existing owner of the Messages/Tasks accordion, but it only defaults/resets to Messages and does not observe active task entries.
  - `WorkspaceHistoryWorkspaceSection.vue` uses local unconditional flattening for nested team members, making it impossible to represent collapsed subtrees.
  - `useWorkspaceHistoryTreeState.ts` already owns tree expansion state and selected-run reveal state, but has no member/subteam expansion model.
- Design response:
  - Keep active-task auto-open policy in `TeamOverviewPanel`; reuse `deriveActiveTaskEntries` instead of duplicating task status rules.
  - Extend Workspace history tree-state ownership to member-level expansion, and make `WorkspaceHistoryWorkspaceSection` render visible rows recursively instead of flattening all descendants.
- Refactor rationale:
  - The active-task change is a local invariant addition; no broad refactor.
  - The nested-team change requires replacing a flatten helper with an explicit tree presentation helper/state because the current file shape cannot support default-collapsed nested subtrees.
- Intentional deferrals and residual risk, if any:
  - Similar flattening exists in `TeamActiveTaskNavigator` for task-team members. The screenshot maps to Workspace history, so task-team navigator nested collapse is deferred unless product/architecture review pulls it into this change. Residual risk: a very large task-team active task could still be visually large inside the Tasks navigator.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace unconditional Messages reset and unconditional Workspace history member flattening with the target behaviors. Do not retain a dual mode that preserves old always-Messages or always-flat behavior.
- Treat removal as first-class design work: remove or rewrite `flattenTeamMembers` once recursive visible-row rendering exists.
- Decision rule: no compatibility wrapper or feature flag for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team run selection or stream-driven task projection update | `Tasks` section is visible in `TeamOverviewPanel` | `TeamOverviewPanel` | Makes active delegated task agents/task teams discoverable without manual expansion. |
| DS-002 | Primary End-to-End | Workspace history team data with nested `memberTree` | Visible recursive Workspace history member rows with collapsed nested teams | `useWorkspaceHistoryTreeState` + `WorkspaceHistoryWorkspaceSection` | Prevents huge organizations from being fully expanded and provides manual nested-team control. |
| DS-003 | Return-Event | User clicks nested subteam disclosure | Subtree expansion state toggles and member rows rerender | `useWorkspaceHistoryTreeState` | Separates expansion from member selection/opening. |
| DS-004 | Return-Event | User clicks Workspace history member row | Existing selection/hydration path opens/focuses member and selected row remains visible | `useWorkspaceHistorySelectionActions` with tree-state reveal support | Preserves existing member selection while adding collapse. |

## Primary Execution Spine(s)

- DS-001: `Team selection / task projection update -> TeamOverviewPanel active-task signature -> Accordion auto-open policy -> expandedSection='activeTasks' -> TeamActiveTasksSection visible`
- DS-002: `Workspace history read model -> WorkspaceHistoryTreeState member expansion state -> WorkspaceHistoryWorkspaceSection recursive rows -> User sees compact nested team tree`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The selected team context changes or receives new transient task projection nodes. `TeamOverviewPanel` derives a stable active-task signature from the same utility used by the Tasks section. If active tasks exist for a new run or a new task identity appears, it opens the Tasks section. | Team context, active task signature, accordion state, Tasks section | `TeamOverviewPanel` | Active task derivation utility; existing TeamActiveTasksSection rendering; message count preservation. |
| DS-002 | Workspace history supplies a team member tree. Tree-state owns which nested subteams are expanded. The section renders top-level members plus children only for expanded subteams. | Workspace team run, member tree, nested subteam expansion state, visible member rows | `useWorkspaceHistoryTreeState` + `WorkspaceHistoryWorkspaceSection` | Avatar/status display; relative time display; selection actions. |
| DS-003 | A nested subteam chevron click stops propagation, toggles the scoped expansion key, and rerenders descendants without selecting/opening the member. | Disclosure control, expansion key, visible row list | `useWorkspaceHistoryTreeState` | ARIA state and chevron rotation. |
| DS-004 | A member row click follows existing `onSelectTeamMember` behavior. If a selected nested member would otherwise be hidden, tree-state expands its ancestor subteams. | Member row, ancestor expansion, selection action | `useWorkspaceHistorySelectionActions` and tree-state reveal support | Run history hydration; emitted run-selected event. |

## Spine Actors / Main-Line Nodes

- `RightSideTabs`: thin right-side tab selector; ensures Team tab is mounted for team runs.
- `TeamOverviewPanel`: accordion policy owner for Messages/Tasks.
- `ActiveTaskSignature`: parent-owned computed identity of rendered active task entries.
- `TeamActiveTasksSection`: controlled renderer for active tasks.
- `WorkspaceAgentRunsTreePanel`: history tree assembly and contract wiring.
- `WorkspaceHistoryTreeState`: expansion/reveal owner for Workspace history hierarchy.
- `WorkspaceHistoryWorkspaceSection`: presentation renderer for Workspace/agent/team/member rows.
- `WorkspaceHistorySelectionActions`: selection/opening owner for history rows.

## Ownership Map

- `RightSideTabs` owns only which right-side tab is active. It must not own Messages/Tasks inner accordion state.
- `TeamOverviewPanel` owns the accordion state and auto-open invariant. It may depend on the active task derivation utility but must not duplicate task lifecycle/status semantics.
- `teamActiveTaskEntries.ts` owns conversion from team context transient task projections to task entries.
- `TeamActiveTasksSection` owns task list/detail rendering and section-local selection state; it remains controlled by `collapsed`.
- `WorkspaceAgentRunsTreePanel` owns top-level composition and contract creation between tree state/actions and section rendering.
- `useWorkspaceHistoryTreeState` owns expansion state and reveal semantics for Workspace history rows, including new nested team member expansion.
- `WorkspaceHistoryWorkspaceSection` owns recursive rendering and click wiring, not persistent state or selection side effects.
- `useWorkspaceHistorySelectionActions` owns selecting/opening runs/team members and preserving existing hydration behavior.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RightSideTabs.vue` | `TeamOverviewPanel` for Team tab internals | Shell-level tab routing | Messages/Tasks accordion policy. |
| `WorkspaceAgentRunsTreePanel.vue` | `useWorkspaceHistoryTreeState` and `useWorkspaceHistorySelectionActions` | Composes state/actions/avatar bindings for the section | Local duplicate member expansion state. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Unconditional `expandedSection.value = 'messages'` on every active team run change | It hides active task entries on team selection | Conditional active-task-aware reset in `TeamOverviewPanel.vue` | In This Change | Messages remains default only when no active tasks exist. |
| Local `flattenTeamMembers(team)` in `WorkspaceHistoryWorkspaceSection.vue` | It erases nested team structure and prevents collapse | Recursive visible-row helper driven by tree-state member expansion | In This Change | Remove or rewrite; do not keep old flat rendering. |
| Any test assumption that active-task seeded views require manually clicking Tasks before interaction | Auto-open makes that click close the section | Updated tests/helper that checks open state first | In This Change | Especially `TeamFocusSendWorkflow.spec.ts`. |
| Active task-team navigator flat member rendering | Similar issue but separate task-specific surface | Potential recursive task-team navigator design | Follow-up | Only if product expands scope. |

## Return Or Event Spine(s) (If Applicable)

- DS-001 return/update: `TASK_DELEGATION_EVENT -> TeamStreamingService projection update -> AgentTeamContext.memberTree changes -> TeamOverviewPanel activeTaskSignature changes -> Tasks opens`.
- DS-003: `Chevron click -> stop propagation -> treeState.toggleTeamMember -> WorkspaceHistoryWorkspaceSection rerenders visible descendants`.
- DS-004: `Member row click -> optional ancestor expansion -> onSelectTeamMember -> runHistoryStore.selectTreeRun -> selectionStore/team view update`.

## Bounded Local / Internal Spines (If Applicable)

- Parent accordion local spine inside `TeamOverviewPanel`:
  `activeTeamRunId/signature watcher -> decide reset/open/no-op -> update expandedSection -> controlled child visibility`.
- Workspace history visible-row local spine inside `WorkspaceHistoryWorkspaceSection`:
  `memberTree -> recursive visit -> include child rows only when subteam expanded -> render row controls`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Active task entry derivation | DS-001 | `TeamOverviewPanel`, `TeamActiveTasksSection` | Determine which transient task projections are active task entries | Avoid duplicate task-status interpretation | Parent may diverge from child count/body. |
| Message perspective/count | DS-001 | `TeamOverviewPanel` | Preserve Messages count and props | Existing Messages behavior must not regress | Auto-open policy could accidentally break message display. |
| Avatar/status/relative time display | DS-002 | `WorkspaceHistoryWorkspaceSection` | Present row metadata | Pure rendering concern | Expansion state may get mixed with display formatting. |
| Selection/hydration | DS-004 | `useWorkspaceHistorySelectionActions` | Open team/member histories | Existing history behavior | Disclosure clicks could accidentally select/open rows. |
| Expansion key pruning | DS-002, DS-003 | `useWorkspaceHistoryTreeState` | Avoid stale nested expansion state after workspace removal | Keeps state bounded | Stale state can leak across workspaces/team runs. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Detect active tasks in Team tab parent | `teamActiveTaskEntries.ts` | Reuse | Already defines entries used by Tasks UI. | N/A |
| Control Team tab section expansion | `TeamOverviewPanel.vue` | Extend | Already owns Messages/Tasks accordion. | N/A |
| Workspace history tree expansion state | `useWorkspaceHistoryTreeState.ts` | Extend | Already owns workspace/group/team expansion and reveal. | N/A |
| Workspace history row rendering | `WorkspaceHistoryWorkspaceSection.vue` | Extend/refactor | Existing section renderer owns row templates. | N/A |
| History row selection | `useWorkspaceHistorySelectionActions.ts` | Extend lightly or coordinate via tree-state contract | Existing selection behavior must remain authoritative. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team tab overview UI | Messages/Tasks accordion policy and active task auto-open | DS-001 | `TeamOverviewPanel` | Extend | No backend change. |
| Active task rendering utilities | Task projection -> task entry mapping | DS-001 | `TeamOverviewPanel`, `TeamActiveTasksSection` | Reuse | Parent computes signature only. |
| Workspace history tree state | Workspace/group/team/member expansion and reveal state | DS-002, DS-003, DS-004 | `WorkspaceHistoryWorkspaceSection` | Extend | Add member expansion methods. |
| Workspace history rendering | Recursive row rendering and disclosure controls | DS-002, DS-003 | `WorkspaceHistoryWorkspaceSection` | Extend/refactor | Remove flattening. |
| Workspace history selection | Open/hydrate selected run/team/member | DS-004 | `WorkspaceAgentRunsTreePanel` | Reuse/extend | Preserve existing selection path. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab overview UI | Accordion policy owner | Compute active task signature and auto-open Tasks on active/new task entries | Existing parent of sections | Reuses `deriveActiveTaskEntries`. |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Workspace history tree state | Tree expansion/reveal owner | Add nested team member expansion state and ancestor expansion | Existing state owner for tree expansion | Uses `TeamTreeNode`/`TeamMemberTreeRow`. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspace history contract | Panel-section boundary | Add member expansion methods to state contract | Existing explicit contract | Uses existing row types. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history rendering | Section renderer | Render visible nested member rows recursively, chevrons, click wiring | Existing row template owner | Uses tree-state contract. |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | Workspace history selection | Selection/open owner | Preserve selection; optionally call ancestor expansion if passed by panel | Existing selection behavior owner | Uses existing row types. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Tests | Component behavior coverage | Active-task auto-open/no-active/manual-collapse/new-task cases | Existing parent tests | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Tests | Workflow coverage | Adapt helper to auto-open behavior | Existing workflow tests | N/A |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Tests | History tree behavior coverage | Nested subteam default collapse/expand/selection tests | Existing history tests | N/A |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Tests | Regression coverage | Guard selected-run reveal with nested member expansion | Existing regression tests | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Active task entry identity/signature | Keep local in `TeamOverviewPanel.vue` | Team tab overview UI | Only parent accordion policy needs it now | Yes | Yes | A new active-task lifecycle model. |
| Workspace visible member row recursion | Keep local in `WorkspaceHistoryWorkspaceSection.vue` unless tests reveal reuse | Workspace history rendering | Only Workspace history renderer uses it in current scope | Yes | Yes | A generic tree framework. |
| Member expansion key creation | Internal helper in `useWorkspaceHistoryTreeState.ts` | Workspace history tree state | Keeps key semantics with state owner | Yes | Yes | A cross-subsystem global key utility. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ActiveTaskEntry` | Yes | N/A | Low | Do not change for auto-open. |
| `TeamMemberTreeRow` | Yes | N/A | Low | Do not modify backend/read-model shape. |
| New visible-row local type | Yes | Yes | Low | Include only `member`, `depth`, and ancestor route keys/hasChildren. |
| New nested expansion state keys | Yes | Yes | Low | Scope by workspace id, team run id, and member route key. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab overview UI | Accordion policy owner | Active-task-aware section auto-open policy | Existing parent state owner | `deriveActiveTaskEntries`. |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Workspace history tree state | Expansion/reveal owner | Member-level subteam expansion methods and ancestor reveal | Existing expansion owner | `TeamTreeNode`, `TeamMemberTreeRow`. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspace history contract | Section state boundary | Expose member expansion/toggle/ancestor methods | Existing state/action contract file | Existing row types. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history rendering | Recursive row renderer | Default-collapsed nested team rows with chevrons; no flat helper | Existing section renderer | Tree-state contract. |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | Workspace history selection | Selection/open owner | Preserve current open/hydration semantics; coordinate ancestor reveal if needed | Existing selection owner | Existing row types. |
| Tests listed above | Coverage | Test boundary | Verify behavior changes and no regressions | Existing relevant suites | N/A |

## Ownership Boundaries

- `TeamOverviewPanel` is the authoritative boundary for Messages/Tasks expansion state. `TeamActiveTasksSection` must not mutate this state directly beyond emitting its existing `toggle` event.
- `deriveActiveTaskEntries` is the authoritative boundary for what counts as an active task entry in the Team tab UI.
- `useWorkspaceHistoryTreeState` is the authoritative boundary for Workspace history expansion/reveal state. `WorkspaceHistoryWorkspaceSection` should query/toggle through the contract and not own parallel expansion maps.
- `useWorkspaceHistorySelectionActions` remains authoritative for opening/hydrating selected rows; disclosure toggles must not bypass into selection behavior.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamOverviewPanel` accordion state | `expandedSection`, active-task watcher/signature | `TeamActiveTasksSection` via props/events | Child directly changing parent state or duplicating auto-open policy | Add explicit props/events or parent logic. |
| `teamActiveTaskEntries.ts` | Task projection collection/entry mapping | Team tab parent/child task UI | Parent directly scanning `isTaskAgentInstance` with custom status rules | Reuse/extend utility. |
| `useWorkspaceHistoryTreeState` | Expansion records and reveal logic | `WorkspaceHistoryWorkspaceSection`, panel wiring | Section-local parallel expansion state | Add contract methods. |
| `useWorkspaceHistorySelectionActions` | `runHistoryStore.selectTreeRun`, selection emissions | Row click handlers | Disclosure click also selecting row | Stop propagation and separate controls. |

## Dependency Rules

Allowed:

- `TeamOverviewPanel.vue` may import `deriveActiveTaskEntries` for a signature/count-like policy decision.
- `WorkspaceAgentRunsTreePanel.vue` may pass new tree-state methods through `WorkspaceHistorySectionState`.
- `WorkspaceHistoryWorkspaceSection.vue` may call state contract methods to check/toggle nested member expansion.
- `WorkspaceHistoryWorkspaceSection.vue` may call action contract methods for row selection only from row body clicks.

Forbidden:

- Do not add backend fields or persistence for UI-only nested expansion state.
- Do not duplicate active-task status classification in `TeamOverviewPanel`.
- Do not let nested subteam chevron clicks bubble into `onSelectTeamMember`.
- Do not keep the old flat Workspace history member renderer as a parallel branch.
- Do not move Workspace history expansion state into `runHistoryStore`; this is presentation state.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `deriveActiveTaskEntries(teamContext)` | Active task entries | Convert team context projections into task rows | `AgentTeamContext` | Existing utility. |
| `isTeamMemberExpanded(workspaceId, teamRunId, memberRouteKey)` | Workspace history nested member expansion | Query nested subteam state | Explicit workspace/team/member identity | New tree-state method. |
| `setTeamMemberExpanded(workspaceId, teamRunId, memberRouteKey, expanded)` | Workspace history nested member expansion | Set nested subteam state | Explicit workspace/team/member identity | New tree-state method. |
| `toggleTeamMember(workspaceId, teamRunId, memberRouteKey)` | Workspace history nested member expansion | Toggle nested subteam state | Explicit workspace/team/member identity | New tree-state method. |
| `expandTeamMemberAncestors(workspaceId, teamRunId, memberRouteKey, memberTree)` | Workspace history reveal | Expand ancestor subteams for a selected/focused member | Explicit workspace/team/member identity plus tree | New tree-state method. |
| `onSelectTeamMember(member)` | Workspace history selection | Open/hydrate selected team member | `TeamMemberTreeRow` | Existing action. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `deriveActiveTaskEntries` | Yes | Yes | Low | Reuse as-is. |
| New `is/set/toggleTeamMemberExpanded` | Yes | Yes | Low | Include workspace/team/member args. |
| `expandTeamMemberAncestors` | Yes | Yes | Low | Accept explicit member tree; do not infer globally. |
| `onSelectTeamMember` | Yes | Yes | Low | Preserve. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team tab active task signature | `activeTaskSignature` | Yes | Low | Include identity-oriented fields. |
| Last auto-opened signature | `lastAutoOpenedTaskSignature` or scoped equivalent | Yes | Low | Avoid vague `seen`. |
| Nested history member expansion | `expandedTeamMembers` | Yes | Low | Scope keys explicitly. |
| Visible Workspace history member row | `VisibleTeamMemberRow` local type | Yes | Low | Keep local to renderer. |

## Applied Patterns (If Any)

- **State machine-ish local policy** inside `TeamOverviewPanel`: a small watcher decides among `open Tasks`, `open Messages`, and `no-op` based on run/signature transitions.
- **Tree disclosure pattern** inside Workspace history: recursive rendering driven by explicit expansion state. This stays inside the Workspace history owner and does not become a generic tree framework.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | File | Team tab accordion owner | Active-task auto-open policy and manual toggle behavior | Existing owner of `expandedSection` | Task status/lifecycle rules independent from `teamActiveTaskEntries`. |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | File | Workspace history tree-state owner | Nested team member expansion state and selected member ancestor reveal | Existing tree expansion/reveal owner | Backend persistence or row rendering. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | File | Panel-section contract | New member expansion methods | Existing contract boundary | Implementation logic. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | Workspace history renderer | Recursive visible member row rendering and disclosure controls | Existing row templates | Selection/hydration logic beyond calling actions. |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | File | History selection owner | Preserve/coordinate row selection | Existing selection/open owner | Disclosure state maps unless passed as a dependency. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | File | Test suite | Unit coverage for auto-open policy | Existing component tests | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | File | Test suite | Workflow adaptation for auto-open | Existing workflow tests | N/A |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | File | Test suite | Nested team disclosure behavior | Existing history tree tests | N/A |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | File | Test suite | Reveal/selection regression coverage | Existing regression tests | N/A |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/team` | Presentation/domain UI | Yes | Low | Team tab components already live here. |
| `components/workspace/history` | Presentation | Yes | Low | Workspace history row rendering/contract already live here. |
| `composables` history tree state/actions | UI state/use-case coordination | Yes | Medium | Existing pattern; keep expansion in tree state and selection in selection actions. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Active task auto-open | `activeTaskSignature changes from A to B -> expandedSection='activeTasks'` | `TeamActiveTasksSection internally forces itself open` | Parent owns accordion state. |
| Manual collapse | User collapses Tasks while signature `task-1` remains; watcher no-ops until signature includes `task-2` | Watcher sets `activeTasks` on every render while signature non-empty | Avoids fighting user control while still drawing attention to new tasks. |
| Workspace nested team | `engineering_org` row shows chevron collapsed; children hidden until chevron click | `flattenTeamMembers(team)` displays `engineering_org` plus all children immediately | Preserves scanability for large orgs. |
| Disclosure click | `@click.stop="state.toggleTeamMember(...)"` | Disclosure click bubbles to `actions.onSelectTeamMember` | Prevents accidental focus/open when expanding. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Feature flag for old Messages-first behavior | Could preserve current behavior | Rejected | Conditional active-task-aware default/open policy. |
| Keep old flat Workspace history member list behind a branch | Could avoid changing tests | Rejected | Recursive default-collapsed member rendering. |
| Persist nested expansion state in backend history | Could remember UI state across sessions | Rejected | Use frontend presentation state only. |
| Duplicate active task detection in parent | Quick implementation | Rejected | Reuse `deriveActiveTaskEntries`. |

## Derived Layering (If Useful)

- UI shell: `RightSideTabs`, `WorkspaceAgentRunsTreePanel`.
- UI state owners: `TeamOverviewPanel` for local accordion; `useWorkspaceHistoryTreeState` for Workspace history expansion.
- UI renderers: `TeamActiveTasksSection`, `WorkspaceHistoryWorkspaceSection`.
- Selection/use-case actions: `useWorkspaceHistorySelectionActions`.
- Data derivation: `teamActiveTaskEntries.ts`, run history read model types.

## Migration / Refactor Sequence

1. Update `TeamOverviewPanel.vue`:
   - import `deriveActiveTaskEntries`;
   - compute `activeTaskSignature` from active task entries;
   - replace unconditional team-run reset with active-task-aware watcher;
   - preserve `toggleSection` manual behavior.
2. Update Team tab tests:
   - add initial active-task auto-open case;
   - add no-active default Messages case;
   - add manual collapse then new-task reopen case;
   - adjust `TeamFocusSendWorkflow` helper so it does not close already-open Tasks.
3. Extend `useWorkspaceHistoryTreeState.ts`:
   - add `expandedTeamMembers` state scoped by workspace/team/member;
   - add query/set/toggle methods;
   - add ancestor expansion helper;
   - include member expansion state in workspace pruning.
4. Extend `workspaceHistorySectionContracts.ts` and `WorkspaceAgentRunsTreePanel.vue` wiring to expose new state methods.
5. Refactor `WorkspaceHistoryWorkspaceSection.vue`:
   - replace `flattenTeamMembers` with recursive visible-row construction;
   - render nested subteam chevrons for `agent_team` rows with children;
   - stop propagation on disclosure clicks;
   - keep row body selection behavior.
6. Update Workspace history tests:
   - default collapsed nested subteam children hidden;
   - disclosure expands/collapses with `aria-expanded` and no selection call;
   - row selection still calls `selectTreeRun` / emits team selected;
   - selected nested member remains visible via ancestor expansion.
7. Run focused tests when dependencies are available:
   - `pnpm --dir autobyteus-web test:nuxt --run components/workspace/team/__tests__/TeamOverviewPanel.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
8. Later delivery docs sync should update docs that currently say `TeamOverviewPanel` always opens/resets to Messages.

## Key Tradeoffs

- Recomputing active task entries in `TeamOverviewPanel` duplicates a small derivation call, not lifecycle logic. This keeps `TeamActiveTasksSection` controlled and avoids broad prop refactors.
- Nested Workspace history expansion state is frontend-only and scoped. This avoids backend/storage changes but means nested expansion resets across reloads.
- Deferring active task-team navigator nested collapse keeps this change focused on the screenshot surface and avoids changing task-specific navigator selection/reference behavior prematurely.

## Risks

- If Vue reactivity does not notice nested `memberTree` mutation for active task projections, the auto-open watcher may require a signature source based on a reactive map replacement or existing store update shape. Tests should simulate the real update pattern.
- Existing tests may fail because manually clicking Tasks now closes an already-open section; update helpers carefully.
- Member expansion keys must be scoped enough to avoid stale expansion across workspaces/team runs.
- If product expects active task-team navigator nested collapse in the same release, this design intentionally defers that and should be amended before implementation.

## Guidance For Implementation

- Keep changes small and owner-aligned. Do not introduce a global tree component.
- Use explicit `data-test` attributes for nested subteam disclosure rows to make tests stable, e.g. `workspace-team-member-disclosure` and existing `workspace-team-member-...` rows.
- Preserve accessibility: set `aria-expanded` on subteam disclosure/row where appropriate; keep focus-visible styles.
- For active task signature, use stable identity fields (`kind`, `node.memberRouteKey`, `taskId`, `runId`) rather than status labels, so status-only updates do not repeatedly steal focus.
- In Workspace history, render leaf rows with a spacer where the chevron would be if needed to preserve alignment.
