# Design Spec

## Current-State Read

The desktop shell has two separate task/team navigation surfaces today:

- Left shell: `AppLeftPanel.vue` mounts `WorkspaceAgentRunsTreePanel.vue`, which delegates row rendering to `WorkspaceHistoryWorkspaceSection.vue`. This is where the reference screenshot's live status-dot language currently exists. Workspace rows show agent/team run hierarchy with tiny `h-2 w-2 rounded-full` dots before executable rows.
- Right Team tab: `RightSideTabs.vue` mounts `TeamOverviewPanel.vue`, which contains Messages plus `TeamActiveTasksSection.vue`. `TeamActiveTasksSection` currently owns both the active task navigator and the right detail pane through local refs (`selectedTaskRouteKey`, `selectedReferenceId`).

Important current details:

- Workspace status dots are rendered inline in `WorkspaceHistoryWorkspaceSection.vue` and colored by callbacks from `useWorkspaceHistoryTreeState.ts`.
- Current status colors are:
  - team `Initializing` -> `bg-amber-500 animate-pulse`
  - team `Running` -> `bg-blue-500 animate-pulse`
  - team `Idle` -> `bg-green-500`
  - team `Error` -> `bg-red-500`
  - team `Offline` -> `bg-gray-400`
  - agent/member uses the same color intent through `runStatusClass`.
- Active task reference file names already render in the left navigator inside `TeamActiveTaskRow.vue`; selecting a file switches the right pane to `TeamTaskReferenceViewer`.
- Active task technical details currently render in the right detail pane as a `<details>` block inside `TeamActiveTasksSection.vue`.
- `TeamOverviewPanel.vue` currently gates active-task visibility with local `expandedSection`, defaults that state to `messages`, and collapses `TeamActiveTasksSection` unless `expandedSection === 'activeTasks'`. This is a required current-state owner because left task/reference clicks must make the right detail visible.
- `useRightPanel.ts` currently exposes `toggleRightPanel` but not an explicit `openRightPanel`; right-detail activation should add/use an idempotent open action rather than toggling blindly.
- `deriveActiveTaskEntries()` already projects the task fields needed for the target left context: task summary/description, target agent/team, status/status label, task reference files, task arguments, task IDs, run IDs, and task-team members.

The current coupling issue is not a backend gap. The issue is frontend ownership drift: the right Team tab owns active-task navigation state and left/right split behavior locally, while the left workspace tree already owns the live navigation/status experience users want reused. Moving task navigation left without extracting shared status semantics and shared selection would duplicate policy and create drift.

## Intended Change

Keep the full task content, selected reference preview, messages, and other rich content on the right side. Move the compact active-task navigation/context to the left side under the text-only task summary:

```text
Task summary / short description      # text only; clicking selects task content on right
Software Engineering Team             # root roster row, no extra indent, status dot
  solution_designer                   # member rows indented, status dots
  architecture_reviewer
  implementation_engineer
References                            # file names on left
  design-spec.md                      # click -> right preview
Technical details                     # compact, collapsed metadata on left
```

For a single-agent active task:

```text
Task summary / short description      # text only
solution_designer                     # root roster row, status dot, no extra indent
References
  handoff.md
Technical details
```

The right Team/Tasks surface becomes a detail surface for the selected active task or selected reference. The left side becomes the active task navigator and live responsibility/status context. A left task/reference click must also activate the right-side Team tab and open the active-task detail section so the selected detail is visible immediately, not hidden behind Messages or another right tab.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination / File Placement Or Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small targeted frontend refactor
- Evidence:
  - `useWorkspaceHistoryTreeState.ts` currently owns status class semantics, but only as local callbacks for the workspace tree.
  - `TeamActiveTasksSection.vue` owns active-task selection locally, which cannot coordinate a left-panel navigator with a right-panel detail pane.
  - `TeamOverviewPanel.vue` owns local right-side section visibility (`messages` vs `activeTasks`), so selection alone does not guarantee visible right detail.
  - `TeamActiveTaskRow.vue` already renders reference file rows in a left navigator, but under the right Team tab's internal split.
  - Technical details are currently placed in the right detail pane even though the target UX treats them as compact metadata/navigation context.
- Design response:
  - Extract/reuse status-dot presentation semantics from the workspace tree.
  - Lift active-task task/reference selection into a small Pinia store keyed by `teamRunId`.
  - Add a separate right-detail activation owner that opens the Team tab and the active-task section when a left task/reference row is selected, while keeping the selection store selection-only.
  - Split active-task UI into a left context tree and a right detail pane.
  - Move technical detail rows into the left context tree beneath references.
- Refactor rationale: Without this refactor, implementation would either duplicate status-dot class mappings, leave the right detail pane and left navigator with separate drifting selection/reference behavior, or select a task on the left while the right detail remains hidden behind `TeamOverviewPanel`'s Messages section.
- Intentional deferrals and residual risk, if any: Mobile-specific redesign is deferred. Existing mobile team surfaces may continue using their current layout unless implementation chooses to reuse the new shared selection/detail pieces. Desktop left-panel narrowness remains a UX risk mitigated by truncation and collapsed technical details.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read this design as:

1. data-flow spines for left context rendering and right content update
2. subsystem ownership allocation
3. reusable status/technical-detail structures
4. concrete file changes
5. migration sequence and testing guidance

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the old right-side master/detail active-task navigator as the authoritative task/reference selection owner. Do not keep a second hidden local navigator state in `TeamActiveTasksSection.vue` after introducing shared selection.
- Treat removal as first-class design work: the old local `selectedTaskRouteKey` / `selectedReferenceId` ownership in `TeamActiveTasksSection.vue` becomes obsolete once selection is shared between left and right.
- Decision rule: the implementation must not keep duplicate status mapping functions or dual active-task selection models.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `AgentTeamContext` active task projection | Left active-task context tree | `WorkspaceAgentRunsTreePanel` as left-panel orchestrator | Renders task summary, actor roster, status dots, references, and technical metadata in the left panel |
| DS-002 | Primary End-to-End | Left task/reference click | Visible right task detail/reference preview | `useTeamActiveTaskRightDetailActivation` + `teamOverviewSectionStore` | Coordinates selection with right-panel activation so detail is not hidden behind Messages or another tab |
| DS-003 | Primary End-to-End | Left actor/member click | Focused team member conversation | Existing workspace/team selection actions | Preserves clickability/focus behavior from the workspace tree |
| DS-004 | Bounded Local | Status value | Tiny status dot CSS classes | Shared status presentation utility/component | Keeps blue/green/gray/red status semantics identical between current workspace tree and new active-task rows |

## Primary Execution Spine(s)

- DS-001 left render spine: `AgentTeamContext -> deriveActiveTaskEntries -> WorkspaceAgentRunsTreePanel -> WorkspaceHistoryWorkspaceSection -> TeamActiveTaskContextTree`
- DS-002 detail selection/activation spine: `TeamActiveTaskContextTree click -> existing team selection/hydration action -> teamActiveTaskSelectionStore -> useTeamActiveTaskRightDetailActivation -> open right panel + Team tab + activeTasks section -> TeamActiveTaskDetailPane -> Markdown body or TeamTaskReferenceViewer`
- DS-003 focus spine: `TeamActiveTaskContextTree actor/member click -> existing team focus/open action -> AgentTeamContextsStore / runHistoryStore hydration -> TeamWorkspaceView`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The live team context is read from the active team run, projected into active task entries, and rendered under the relevant left-side team/task area. | `AgentTeamContext`, `ActiveTaskEntry`, `TeamActiveTaskContextTree` | `WorkspaceAgentRunsTreePanel` | status-dot presentation, avatar/name presentation, reference-file row presentation, technical detail row projection |
| DS-002 | A left-side task or reference row updates shared selection and triggers right-detail activation; the right panel opens the Team tab, expands the active-task section, and renders the matching task body or file preview. | `TeamActiveTaskSelection`, `TeamOverviewSection`, `TeamActiveTaskDetailPane`, `TeamTaskReferenceViewer` | `useTeamActiveTaskRightDetailActivation` + `teamOverviewSectionStore` | selected-entry resolution, right tab activation, reference refresh behavior |
| DS-003 | Clicking an actor/member row focuses the same team member target as existing workspace tree actions. | `TeamMemberNode`, `AgentTeamContext`, focused member state | existing team focus/open owner | hydration and focus safety fallback |
| DS-004 | Status values become a tiny dot with the same current workspace colors. | `AgentStatus`, `AgentTeamStatus`, `StatusDot` | shared presentation utility/component | class mapping; animation only for active/running/initializing states |

## Spine Actors / Main-Line Nodes

- `AgentTeamContext`: source of live team member tree and active delegated task projections.
- `ActiveTaskEntry`: existing projection shape for one active delegated task.
- `WorkspaceAgentRunsTreePanel`: left-panel orchestrator that already wires tree state/actions and should now wire active-task context bindings.
- `TeamActiveTaskContextTree`: new left-side renderer for task summary, responsible actor/team, member status, reference file rows, and technical details.
- `teamActiveTaskSelectionStore`: shared selection owner for selected task and reference per team run.
- `teamOverviewSectionStore`: shared owner of the Team overview section visibility (`messages` vs `activeTasks`) per team run.
- `useTeamActiveTaskRightDetailActivation`: action boundary that makes the right detail visible after left task/reference selection.
- `TeamActiveTaskDetailPane`: right-side detail renderer for selected task body or selected reference preview.

## Ownership Map

| Node | Owns |
| --- | --- |
| `WorkspaceAgentRunsTreePanel` | left panel tree orchestration, passing workspace/tree/status/action bindings into presentational rows |
| `WorkspaceHistoryWorkspaceSection` | presentational workspace/agent/team row layout; should not own task selection state |
| `TeamActiveTaskContextTree` | compact left active-task context layout and row emit behavior |
| `teamActiveTaskSelectionStore` | selected active task route key and selected reference ID keyed by team run ID; selection only, not panel visibility |
| `teamOverviewSectionStore` | active Team overview section keyed by team run ID (`messages`, `activeTasks`, or collapsed/null if retained) |
| `useTeamActiveTaskRightDetailActivation` | coordinating action to ensure right panel visibility, Team tab selection, and active-task section visibility for a selected task/reference |
| `TeamOverviewPanel` | consumes `teamOverviewSectionStore` instead of local `expandedSection`; renders Messages or Active Tasks according to that owner |
| `TeamActiveTaskDetailPane` | right-side selected task/reference rendering; does not own navigator state or section visibility |
| `workspaceStatusDotPresentation` / `StatusDot` | canonical tiny-dot class semantics for agent/team/member statuses |
| `teamActiveTaskTechnicalDetails` | projection of task technical metadata rows and JSON input string |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceHistoryWorkspaceSection.vue` | `WorkspaceAgentRunsTreePanel` and passed contracts | Presentational row rendering | active-task task/reference selection state |
| `TeamOverviewPanel.vue` | `teamOverviewSectionStore` for section visibility; `teamActiveTaskSelectionStore` for active task selection; team communication store for messages | Composes right-side team detail sections and reacts to explicit activation | left navigator state, task data cache, or status mapping |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Local `selectedTaskRouteKey` and `selectedReferenceId` in `TeamActiveTasksSection.vue` | Selection must coordinate left panel and right panel siblings | `stores/teamActiveTaskSelectionStore.ts` | In This Change | Clean-cut; no duplicate local selection path |
| Local `expandedSection` ref in `TeamOverviewPanel.vue` | Left task/reference clicks must open active-task detail from outside the component | `stores/teamOverviewSectionStore.ts` plus `useTeamActiveTaskRightDetailActivation.ts` | In This Change | Keep manual header toggles by dispatching store actions |
| Right-side internal active-task navigator split (`aside` inside `TeamActiveTasksSection.vue`) | Navigator moves to the left panel | `TeamActiveTaskContextTree.vue` hosted from workspace left tree | In This Change | Right side becomes detail-only |
| Right-side technical detail block in task detail pane | Technical details move left as metadata | `TeamActiveTaskTechnicalDetails.vue` or rows inside `TeamActiveTaskContextTree.vue` using shared utility | In This Change | Keep collapsed on left |
| Duplicate status-dot mapping in new component | Would drift from workspace tree | `workspaceStatusDotPresentation.ts` / `StatusDot.vue` | In This Change | Existing workspace tree should also use the extracted mapping |
| Large active-task status chips in the left compact navigator | User requested tiny status dots on actors, not chips on task summaries | status dots on actor/member rows only | In This Change | Right detail may keep concise status text only if needed, but left compact UI should not |

## Return Or Event Spine(s) (If Applicable)

- Right detail activation/update: `left task/reference click -> teamActiveTaskSelectionStore change + useTeamActiveTaskRightDetailActivation -> right panel visible + Team tab active + teamOverviewSectionStore.activeTasks -> TeamActiveTaskDetailPane computed selected entry/reference -> Markdown body or TeamTaskReferenceViewer`.
- Focus update: `actor/member click -> focus/hydration action -> AgentTeamContextsStore focused member -> TeamWorkspaceView header/conversation updates`.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `teamActiveTaskSelectionStore`

`selectTask(teamRunId, routeKey) -> set selected task -> clear selected reference -> right detail renders task body`

`selectReference(teamRunId, routeKey, referenceId) -> set selected task + selected reference -> right detail renders TeamTaskReferenceViewer`

Parent owner: `useTeamActiveTaskRightDetailActivation`

`activateTeamTaskDetail(teamRunId) -> openRightPanel -> setRightTab('teamMembers') -> teamOverviewSectionStore.showActiveTasks(teamRunId)`

These local state spines matter because left and right panels are siblings and cannot rely on component-local refs. Selection and visibility are intentionally separate owners.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| status-dot class mapping | DS-001, DS-004 | left context tree and existing workspace tree | Map `AgentStatus` / `AgentTeamStatus` to tiny dot classes | Prevent visual drift | Duplicated color logic across components |
| avatar/name presentation | DS-001 | left context tree | Reuse existing member/avatar display helpers where possible | Keep roster familiar | Inconsistent row identity display |
| reference file presentation | DS-002 | left context tree | Render file icon/name rows using existing `referenceFileIcon` / `referenceFileName` | Preserve existing file-name-left/content-right behavior | Left navigator becomes disconnected from existing previews |
| technical metadata projection | DS-001, DS-002 | left context tree | Render task IDs/run IDs/target info/input compactly | Moves metadata out of right content | IDs/JSON crowd right content or left live rows |
| selection fallback | DS-002 | selection store/detail pane | Choose first active task when no explicit selection exists or selected task disappears | Stable UX as active tasks change | Empty right pane despite active task availability |
| right detail activation | DS-002 | Team overview/detail surface | Open right panel, switch to Team tab, and expand active-task section after left task/reference click | Satisfies REQ-002 / AC-003 | Left click selects data but user still sees Messages/other tab |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| status dot visuals | workspace history tree status callbacks | Extend / extract | Existing behavior is correct but trapped in `useWorkspaceHistoryTreeState` | N/A |
| active task projection | `utils/teamActiveTaskEntries.ts` | Reuse | Already has task/target/reference/member data | N/A |
| reference file icon/name | `utils/teamReferences/referenceFilePresentation.ts` | Reuse | Already used by active task rows | N/A |
| reference preview | `TeamTaskReferenceViewer.vue` | Reuse | Existing right preview behavior is correct | N/A |
| active task selection across shell siblings | none; currently local refs | Create New | Needed because left and right surfaces are siblings | Store should own selection only, not task data |
| Team overview section visibility | `TeamOverviewPanel.vue` local `expandedSection` | Extract | Left panel needs to open the active-task section from outside `TeamOverviewPanel` | Use a small section store, not the selection store |
| right tab/panel activation | `useRightSideTabs`, `useRightPanel` | Extend / Compose | Existing right tab/panel owners should be called through a narrow activation composable | N/A |
| technical detail row projection | inline inside `TeamActiveTasksSection.vue` | Extract | Needs to move left and avoid duplication | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/history` | left workspace tree host and row placement | DS-001, DS-003 | `WorkspaceAgentRunsTreePanel` | Extend | Host active-task context under live/expanded team runs |
| `components/workspace/team` | active-task context/detail components | DS-001, DS-002 | `TeamActiveTaskContextTree`, `TeamActiveTaskDetailPane` | Extend | Split current active task section into left context + right detail |
| `stores` | shared active task selection and Team overview section visibility | DS-002 | `teamActiveTaskSelectionStore`, `teamOverviewSectionStore` | Create New | Keep separate stores: selection-only vs section-visibility-only |
| `composables` | right detail activation command | DS-002 | `useTeamActiveTaskRightDetailActivation` | Create New | Narrow orchestration over existing right panel/tab owners and section store |
| `utils/teamReferences` | reference file presentation | DS-002 | `TeamActiveTaskContextTree` | Reuse | File name/icon logic stays canonical |
| `utils` or `components/workspace/common` | status dot presentation | DS-004 | existing work tree and new context tree | Create / Extend | Extract current mapping from tree composable |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/workspaceStatusDotPresentation.ts` | shared workspace presentation | status-dot presentation | Map agent/team status to class strings; export base dot class if needed | One pure utility for shared CSS semantics | N/A |
| `autobyteus-web/components/workspace/common/StatusDot.vue` | shared workspace presentation | status-dot component | Render the tiny `h-2 w-2 rounded-full` dot for agent/team statuses | Prevent repeated span class composition | status mapping utility |
| `autobyteus-web/stores/teamActiveTaskSelectionStore.ts` | team active task UI state | active task selection owner | Store selected task route key and reference ID by team run ID | One small store for sibling coordination | ActiveTaskEntry identity shape |
| `autobyteus-web/stores/teamOverviewSectionStore.ts` | team overview UI state | right Team overview section owner | Store active section per team run and expose `showActiveTasks`, `showMessages`, `toggleSection` | Replaces local `expandedSection` so left clicks can open active-task detail | Team section identity |
| `autobyteus-web/composables/useTeamActiveTaskRightDetailActivation.ts` | team active task UI action | right detail activation command | Ensure right panel visible, set Team tab active, and show active-task section | Keeps activation out of selection store | right panel/tab/section owners |
| `autobyteus-web/composables/useRightPanel.ts` | right panel UI state | right panel visibility owner | Add idempotent `openRightPanel()` if absent | Activation must not call `toggleRightPanel` blindly | N/A |
| `autobyteus-web/utils/teamActiveTaskTechnicalDetails.ts` | team active task projection | technical metadata projection | Build technical rows and technical input JSON string from `ActiveTaskEntry` | Removes inline logic from detail pane | `ActiveTaskEntry` |
| `autobyteus-web/components/workspace/team/TeamActiveTaskContextTree.vue` | team active task UI | left navigator/context tree | Render text-only task summary, root actor/team, member rows, references, collapsed technical details | One component owns left active-task context layout | status dot, reference presentation, technical details utility |
| `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | team active task UI | right detail pane | Render selected task body or selected reference preview | One component owns right content behavior | selection store, `TeamTaskReferenceViewer` |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | team active task UI | section shell | Keep header/count/collapse behavior and compose detail pane only, or become a thin wrapper | Existing tests and section identity can remain | detail pane |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | team overview UI | right section composition | Consume `teamOverviewSectionStore` instead of local `expandedSection`; headers call store toggles | Required to make left task/reference activation visible | local visibility refs |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | workspace history | left orchestration | Provide active-task bindings/actions into section | Already orchestrates left row contracts | selection store/context store |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | workspace history | presentational row host | Insert `TeamActiveTaskContextTree` under expanded live team rows | Current left tree row renderer | active task bindings |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| status -> dot class mapping | `utils/workspaceStatusDotPresentation.ts` | shared workspace presentation | Existing and new rows need identical semantics | Yes | Yes | generic style helper with unrelated colors |
| technical detail row building | `utils/teamActiveTaskTechnicalDetails.ts` | team active task projection | Left metadata and tests need stable rows after moving from right | Yes | Yes | mixed renderer with Vue-specific state |
| selected active task/reference identity | `stores/teamActiveTaskSelectionStore.ts` | team active task UI state | Left navigator and right detail need shared selection | Yes | Yes | task data cache or projection owner |
| Team overview section visibility | `stores/teamOverviewSectionStore.ts` | team overview UI state | Left task/reference clicks and right headers both need the same visibility owner | Yes | Yes | broad right-panel controller |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ActiveTaskEntry` | Yes | N/A | Low | Reuse as data projection; do not introduce a second task DTO |
| `TeamActiveTaskSelection` | Yes | Yes | Low | Fields: `teamRunId`, `memberRouteKey`, optional `referenceId`; do not store copied entry data |
| `TeamOverviewSectionState` | Yes | Yes | Low | Fields: `teamRunId`, `activeSection`; no task/reference data |
| `TechnicalDetailRow` | Yes | Yes | Low | Fields: `key`, `labelKey`, `dataTest`, `value`; keep JSON input separate |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/workspaceStatusDotPresentation.ts` | shared workspace presentation | status-dot mapping | Pure functions for agent/team dot class semantics | Source of truth for blue/green/gray/red statuses | AgentStatus, AgentTeamStatus |
| `autobyteus-web/components/workspace/common/StatusDot.vue` | shared workspace presentation | status-dot renderer | Render the exact tiny status dot used under workspace tree | Keeps class shape reusable | status mapping utility |
| `autobyteus-web/stores/teamActiveTaskSelectionStore.ts` | team active task UI state | selection store | Shared selected task/reference per team run | Coordinates left/right siblings | selection shape |
| `autobyteus-web/stores/teamOverviewSectionStore.ts` | team overview UI state | section visibility store | Shared Team overview section visibility per team run | Coordinates left-triggered activation with right headers | section state shape |
| `autobyteus-web/composables/useTeamActiveTaskRightDetailActivation.ts` | team active task UI action | activation command | Open right panel, switch to Team tab, show active-task section | Narrow cross-owner orchestration | right panel/tab/section APIs |
| `autobyteus-web/composables/useRightPanel.ts` | right panel UI state | panel visibility boundary | Expose `openRightPanel()` for idempotent activation | Existing right panel visibility owner | broad panel routing |
| `autobyteus-web/utils/teamActiveTaskTechnicalDetails.ts` | team active task projection | technical metadata | Build task technical rows and optional JSON input | Moves inline logic out of right component | ActiveTaskEntry |
| `autobyteus-web/components/workspace/team/TeamActiveTaskContextTree.vue` | team active task UI | left active-task context | Task summary text, actor/team/member status rows, reference file rows, technical details | New left-side UX owner | status dot, references, technical utility |
| `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | team active task UI | right active-task content | Task markdown/detail or selected reference preview | New right-side detail owner | selection store, reference viewer |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | team active task UI | section shell | Header/count/collapse composition; no local navigator state | Preserves section role in Team tab | detail pane |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | workspace history | left orchestration | Provide team active-task context bindings/actions | Existing left tree orchestrator | selection store/actions |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | workspace history | presentational host | Render active-task context tree under expanded live team | Existing tree row renderer | active task component |

## Ownership Boundaries

- `WorkspaceAgentRunsTreePanel` remains the authoritative left-tree orchestration boundary. It may pass active-task bindings into row components, but presentational row components must not own cross-panel selection state.
- `teamActiveTaskSelectionStore` is the authoritative selection boundary for selected active task/reference. Right detail components read this store; left context components write it.
- `teamOverviewSectionStore` is the authoritative visibility boundary for the Team overview's `messages` vs `activeTasks` section per team run. Left activation and right headers both use this owner.
- `useTeamActiveTaskRightDetailActivation` is the authoritative command boundary for turning a left task/reference selection into visible right detail; it coordinates existing right panel/tab owners with `teamOverviewSectionStore` but does not own selection or task data.
- `workspaceStatusDotPresentation` / `StatusDot` is the authoritative status-dot presentation boundary. `useWorkspaceHistoryTreeState` must delegate to it instead of owning unique color mappings.
- `TeamActiveTaskDetailPane` owns right-side content rendering only; it must not reintroduce a second navigator or technical-details metadata placement.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `teamActiveTaskSelectionStore` | selection records keyed by `teamRunId` | left context tree, right detail pane | local `selectedTaskRouteKey` refs in right pane plus store in left pane | add explicit actions/getters to the store |
| `teamOverviewSectionStore` | section state keyed by `teamRunId` | TeamOverviewPanel headers and left-triggered activation | local `expandedSection` ref plus external activation store | add explicit section actions/getters to the store |
| `useTeamActiveTaskRightDetailActivation` | calls to right panel visibility, right tab selection, and team overview section store | left task/reference row handlers | callers directly mutating right tab and section state in multiple places | add a narrow activation method |
| `workspaceStatusDotPresentation` / `StatusDot` | color class mapping, base dot classes | workspace tree and active-task context tree | copy-paste switch statements in new component | extend utility/component props |
| `deriveActiveTaskEntries()` | active task projection from `AgentTeamContext` | left context tree, right detail pane | a second projection of task refs/members/technical IDs | add fields to existing projection if truly missing |

## Dependency Rules

Allowed:

- `WorkspaceAgentRunsTreePanel` may import stores/composables and pass active-task bindings into `WorkspaceHistoryWorkspaceSection`.
- `TeamActiveTaskContextTree` may use presentational utilities/components and emit focus/selection/activation events.
- `TeamActiveTaskContextTree` or its orchestration action may call `teamActiveTaskSelectionStore` for selection and `useTeamActiveTaskRightDetailActivation` for visibility; these calls must remain separate.
- `TeamActiveTaskDetailPane` may read selection store and render `TeamTaskReferenceViewer` or task markdown.
- `TeamOverviewPanel` may read/write `teamOverviewSectionStore` for its header toggles and section visibility.
- Existing workspace tree status functions may call extracted status utilities.

Forbidden:

- Do not duplicate the status color switch in `TeamActiveTaskContextTree`.
- Do not keep local right-pane selected task/reference refs after the shared store is introduced.
- Do not keep local `expandedSection` as the only owner after the section store is introduced.
- Do not let `teamActiveTaskSelectionStore` open tabs, show panels, or own Team overview section visibility.
- Do not use `toggleRightPanel` for left task/reference activation; use an idempotent open action.
- Do not put a status dot on the task summary row.
- Do not indent the responsible agent/team root row relative to the task summary inside the active-task block.
- Do not move reference content/preview into the left panel; only file names/rows live left.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `selectTask(teamRunId, memberRouteKey)` | active task selection | Select task body for right detail | `teamRunId + memberRouteKey` | Clears selected reference |
| `selectReference(teamRunId, memberRouteKey, referenceId)` | active task reference selection | Select reference preview for right detail | `teamRunId + memberRouteKey + referenceId` | Keeps selected task identity explicit |
| `getSelection(teamRunId)` | active task selection | Read current selection | `teamRunId` | Store getter or computed helper |
| `showActiveTasks(teamRunId)` | Team overview section visibility | Make active-task detail section visible | `teamRunId` | Owned by `teamOverviewSectionStore` |
| `showMessages(teamRunId)` | Team overview section visibility | Make messages section visible | `teamRunId` | Owned by `teamOverviewSectionStore` |
| `toggleSection(teamRunId, section)` | Team overview section visibility | Manual header toggle | `teamRunId + section` | Replaces local toggle |
| `activateTeamTaskDetail(teamRunId)` | right active-task detail activation | Ensure right panel visible, Team tab active, activeTasks section open | `teamRunId` | Composable command; not selection store |
| `openRightPanel()` | right panel visibility | Idempotently show the right panel | none | Add to `useRightPanel`; activation must not use toggle |
| `agentStatusDotClass(status)` | agent/member status dot | CSS status mapping | `AgentStatus | string | null` | Used by existing and new rows |
| `teamStatusDotClass(status)` | team status dot | CSS status mapping | `AgentTeamStatus | string | null` | Used by existing and new rows where team status is available |
| `buildActiveTaskTechnicalRows(entry)` | task technical metadata | Build rows for left details | `ActiveTaskEntry` | Uses existing label keys |

Rule validation: selection identity is explicit. No generic `select(id)` method should guess whether an ID is a task, reference, team, or member.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `selectTask` | Yes | Yes | Low | N/A |
| `selectReference` | Yes | Yes | Low | N/A |
| `agentStatusDotClass` | Yes | Yes | Low | N/A |
| `teamStatusDotClass` | Yes | Yes | Low | N/A |
| `buildActiveTaskTechnicalRows` | Yes | Yes | Low | N/A |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| left active task context tree | `TeamActiveTaskContextTree` | Yes | Low | Use if implementation agrees |
| right active task content | `TeamActiveTaskDetailPane` | Yes | Low | Use if implementation agrees |
| active task selection | `teamActiveTaskSelectionStore` | Yes | Low | Keep focused on UI selection only |
| Team overview section visibility | `teamOverviewSectionStore` | Yes | Low | Keep focused on messages/activeTasks visibility only |
| right detail activation command | `useTeamActiveTaskRightDetailActivation` | Yes | Low | Do not let it own selection or task data |
| status dot presentation | `workspaceStatusDotPresentation` / `StatusDot` | Yes | Low | Do not call it a generic helper |

## Applied Patterns (If Any)

- **Store / UI state owner**: `teamActiveTaskSelectionStore` owns cross-panel selection for active task/reference. It solves sibling coordination, not domain persistence.
- **Store / UI visibility owner**: `teamOverviewSectionStore` owns right Team overview section visibility. It replaces local-only `expandedSection` so external left clicks can open active-task details.
- **Command composable**: `useTeamActiveTaskRightDetailActivation` coordinates existing right panel/tab owners with the section store. It owns activation sequencing only.
- **Presentational component extraction**: `StatusDot` and `TeamActiveTaskContextTree` avoid duplicating row/status styling.
- **Projection utility**: `teamActiveTaskTechnicalDetails` extracts technical metadata rows from inline detail-pane logic.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/workspaceStatusDotPresentation.ts` | File | status-dot presentation | Status-to-class mapping for workspace/team/agent rows | Status mapping is pure and reused by composables/components | unrelated status badges or textual labels |
| `autobyteus-web/components/workspace/common/StatusDot.vue` | File | shared workspace UI | Tiny dot renderer | Existing and new workspace/team rows can reuse it | task summary status logic |
| `autobyteus-web/stores/teamActiveTaskSelectionStore.ts` | File | active task selection | Shared task/reference selection state | Pinia store fits cross-panel UI state | active task data projection or network calls |
| `autobyteus-web/stores/teamOverviewSectionStore.ts` | File | Team overview section visibility | Shared messages/activeTasks visibility state per team run | Pinia store fits left-triggered right-section activation | task data, reference data, broad right-panel control |
| `autobyteus-web/composables/useTeamActiveTaskRightDetailActivation.ts` | File | right detail activation command | Open right panel, select Team tab, show activeTasks section | Cross-owner action belongs in a composable, not in selection store | task data cache or row rendering |
| `autobyteus-web/composables/useRightPanel.ts` | File | right panel visibility | Add `openRightPanel()` and keep `toggleRightPanel()` for manual toggle | Current right panel state owner should provide idempotent open | task detail activation logic |
| `autobyteus-web/utils/teamActiveTaskTechnicalDetails.ts` | File | active task metadata | Technical row/input projection | Pure utility near existing `teamActiveTaskEntries` concern | Vue rendering or selection state |
| `autobyteus-web/components/workspace/team/TeamActiveTaskContextTree.vue` | File | left active task context | Task summary, actor/member status rows, references, technical details | Team active task feature component | right content preview |
| `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | File | right active task detail | Selected task body/reference preview | Team active task feature component | left navigation rows |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | File | active task section wrapper | Count/header/collapse and detail pane composition | Existing right Team tab section | local task/reference selection state |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | File | right Team overview composition | Consume section store and call store toggles; active-task section becomes externally activatable | Existing owner of messages vs activeTasks presentation | local-only `expandedSection` gate |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | workspace tree presentation | Host left active-task context under expanded team rows | Existing work tree renderer | store logic or status switch copies |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | File | workspace tree contracts | Extend with active-task bindings if needed | Existing contract file | concrete store imports |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/history` | Main-Line Domain-Control / Presentation | Yes | Low | Owns left workspace tree rendering |
| `components/workspace/team` | Mixed Justified | Yes | Medium | Already owns team workspace UI; keep new active-task components clearly named by concern |
| `stores` | Off-Spine Concern | Yes | Low | Cross-panel selection state belongs in Pinia |
| `utils` | Off-Spine Concern | Yes | Low | Pure projection/presentation utilities only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| status dot placement | `Task summary` text only, then `StatusDot + Software Engineering Team`, then indented `StatusDot + member` | `StatusDot + Task summary` | User explicitly rejected dot on task summary |
| team root indentation | `Software Engineering Team` aligned with task block content, members indented under it | task summary -> indented team -> further indented members | User explicitly rejected team-root indentation |
| selection identity | `selectReference(teamRunId, memberRouteKey, referenceId)` | `select(id)` guessing task vs file | Avoid ambiguous selectors |
| right/left split | left file name row -> right `TeamTaskReferenceViewer` | file content/preview in narrow left panel | Preserves current file-name-left/content-right behavior |
| right detail activation | left task/reference click -> selection store + activation composable -> Team tab + activeTasks section visible -> detail pane | left click only updates selection while right remains on Messages or Files | Satisfies REQ-002 / AC-003 in the current shell |
| status mapping reuse | `StatusDot(kind="agent", status)` used by workspace and active task rows | new component with its own blue/green switch | Prevents visual drift |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old right-side navigator local state while adding left navigator | Lower immediate code churn | Rejected | Use `teamActiveTaskSelectionStore`; right side becomes detail-only |
| Copy status class switch into new component | Fastest visual match | Rejected | Extract mapping and update current tree to use it |
| Keep technical details in both left and right | Might reduce regression risk | Rejected | Move technical metadata left only; right stays content/preview |
| Keep local-only `expandedSection` in `TeamOverviewPanel` | Existing section toggle already works manually | Rejected | Replace with `teamOverviewSectionStore` so left activation and right header toggles share one owner |
| Add status chip to task summary | Current `TeamActiveTaskRow` has optional status chip | Rejected | Status dots appear only on agent/team/member rows |

## Derived Layering (If Useful)

- Left presentation layer: `WorkspaceAgentRunsTreePanel` / `WorkspaceHistoryWorkspaceSection` / `TeamActiveTaskContextTree`
- Shared UI state layer: `teamActiveTaskSelectionStore`, `teamOverviewSectionStore`, `useTeamActiveTaskRightDetailActivation`
- Right detail layer: `TeamOverviewPanel` / `TeamActiveTasksSection` / `TeamActiveTaskDetailPane`
- Shared presentation/projection utilities: status-dot mapping, reference-file presentation, technical-detail projection

Layering is explanatory only; ownership and selection boundaries above are authoritative.

## Migration / Refactor Sequence

1. Extract status-dot mapping from `useWorkspaceHistoryTreeState.ts` into `utils/workspaceStatusDotPresentation.ts`; optionally add `StatusDot.vue`.
2. Update existing workspace tree status rows to use the extracted mapping/component without changing visual output.
3. Add `teamActiveTaskSelectionStore.ts` with explicit task/reference selection actions keyed by `teamRunId`.
4. Add `teamOverviewSectionStore.ts` and refactor `TeamOverviewPanel.vue` to consume it instead of local `expandedSection`; right header toggles dispatch store actions.
5. Add idempotent `openRightPanel()` to `useRightPanel.ts`, then add `useTeamActiveTaskRightDetailActivation.ts` to ensure right panel visibility, Team tab activation, and active-task section visibility after left task/reference clicks.
6. Extract technical detail row/input building from `TeamActiveTasksSection.vue` into `utils/teamActiveTaskTechnicalDetails.ts`.
7. Add `TeamActiveTaskDetailPane.vue` for right-side selected task body/reference preview; remove technical details from right content.
8. Add `TeamActiveTaskContextTree.vue` for left-side task summary, actor/team/member status rows, reference file rows, and collapsed technical details.
9. Extend `WorkspaceAgentRunsTreePanel.vue` and `WorkspaceHistoryWorkspaceSection.vue` contracts to render `TeamActiveTaskContextTree` for live/expanded team runs with active tasks. Use existing focus/open actions for member clicks.
10. Refactor `TeamActiveTasksSection.vue` to remove the internal left navigator and local selection refs; compose `TeamActiveTaskDetailPane` under the right Team tab.
11. Update tests:
   - status-dot extraction preserves existing workspace status behavior;
   - left active-task context renders text-only task summary, non-indented actor/team row, indented members, references, and collapsed technical details;
   - reference row selection in left tree opens the right panel, selects the Team tab, opens activeTasks, and shows right preview;
   - task summary selection from left opens activeTasks even when Messages was previously expanded;
   - manual Messages/Tasks header toggles still use `teamOverviewSectionStore`;
   - right pane no longer renders technical details;
   - shared selection handles disappearing selected task by falling back to first active task.

## Key Tradeoffs

- **Selection store vs section visibility store**: two small owners are intentional. Selection state should not become a broad panel controller, and Team overview section visibility should not cache task data.
- **Shared store vs local refs**: stores add small new owners but are necessary because left and right panels are siblings.
- **Extract status component vs pure utility only**: a component reduces repeated span markup; a pure utility is lower churn. Either is acceptable if existing and new rows share the same mapping. Preferred: utility plus small `StatusDot.vue` for consistent markup.
- **Render active task context only for selected/expanded team vs all teams**: start with expanded live team rows to avoid left-panel overload. The store can support multiple team IDs if later expanded.
- **Technical details on left**: improves right content cleanliness but risks narrow-panel noise; mitigate with collapsed default, truncation, and title/copy affordances if needed.

## Risks

- Active task lists can change while a reference is selected; the selection store/detail pane must handle stale selection gracefully.
- Right detail activation must not fight manual user section toggles except when the user explicitly clicks a left task/reference row.
- `ActiveTaskEntry.status` for task-team entries currently comes from `AgentStatus`-typed node status rather than `AgentTeamStatus`; implementation must choose the correct dot mapping based on available data and avoid implying a stronger semantic than the source supports.
- Left panel width may make technical IDs hard to read; collapsed default and truncation are mandatory.
- Existing tests assume `TeamActiveTasksSection` owns the master/detail split; test updates are expected.

## Guidance For Implementation

- Use the existing workspace dot shape exactly: `inline-block h-2 w-2 flex-shrink-0 rounded-full` with the same color/animation classes.
- Do not add a dot to the task summary row.
- Do not indent the responsible actor/team root row within the task block; indent only members below a team.
- Preserve current reference behavior: file names on the left, content/preview on the right.
- On left task/reference row click, run both selection and right-detail activation; do not assume selection alone makes the right detail visible.
- Move technical details left below references and collapse them by default.
- Keep the right side focused on readable task body, messages, and selected reference preview.
- Prefer extending existing tests around `WorkspaceAgentRunsTreePanel` and `TeamActiveTasksSection` rather than relying only on snapshots.
