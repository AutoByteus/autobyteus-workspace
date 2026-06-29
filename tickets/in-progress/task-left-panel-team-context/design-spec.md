# Design Spec

## Current-State Read

This is a design-impact correction. The previous design placed active-task context in the global Workspaces/run-history tree. API/E2E browser review and direct user clarification showed that was wrong.

There are two relevant “left” surfaces:

1. **Global Workspaces tree**: `AppLeftPanel.vue` -> `WorkspaceAgentRunsTreePanel.vue` -> `WorkspaceHistoryWorkspaceSection.vue`.
   - Correct responsibility: workspace/run/team/member navigation and status.
   - Wrong implemented addition: active-task summary blocks, task actor/team rows, reference rows, and technical details were rendered here.
   - Correct target: remove all active-task context rendering and contracts from this surface.
2. **Team active-task master/detail UI**: `TeamOverviewPanel.vue` -> `TeamActiveTasksSection.vue`.
   - Correct responsibility: active task list/navigation on the left, selected task/reference content on the right.
   - Baseline behavior on `origin/personal`: `TeamActiveTasksSection.vue` already rendered a left navigator and right detail/reference pane. It lacked the requested responsible agent/team/member live roster under each task summary, and technical details were on the right.
   - Correct target: preserve this task UI and change each left navigator item’s internal order/content.

The corrected intended task navigator item is:

```text
Task summary / short description        ← text only; click shows content on right

● Software Engineering Team             ← no indent; responsible agent/team row; status dot
  ● solution_designer                   ← member row; status dot
  ● architecture_reviewer               ← member row; status dot
  ● implementation_engineer             ← member row; status dot

  References                            ← file names stay on the left
    file-a.md                           ← click opens content/preview on right
    screenshot.png

  Technical details                     ← compact/collapsed metadata on the left
```

## Intended Change

Undo the wrong global-tree host and implement the requested hierarchy inside the existing Team active-task split:

- `TeamActiveTasksSection.vue` owns the active task split and local selected task/reference state.
- A team-owned navigator component renders each task item with the exact required order.
- A team-owned detail pane renders the selected task body or selected reference preview.
- Shared status-dot presentation is reused for actor/team/member rows.
- Technical details move to compact/collapsed metadata below reference rows in the left navigator.
- Task summary and reference selection must not focus the center subteam/composer; only explicit actor/team/member row clicks may reuse existing focus behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change with design correction
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Browser evidence shows active-task UI embedded inside the global Workspaces tree. User clarified the task UI should mostly stay and only the left task navigator item content/order should change.
- Design response: Restore active-task ownership to `TeamActiveTasksSection`, remove global-tree active-task coupling, and make the row hierarchy explicit in the Team active-task navigator.
- Refactor rationale: Keeping the wrong global-tree host would preserve a boundary violation and a confusing UI. Correcting this requires removing cross-surface stores/composables and returning selection to the active-task section.
- Intentional deferrals and residual risk, if any: Potential future product choice about whether the Team Tasks section should open by default is deferred. The in-scope correction only fixes task navigator ownership and row structure.

## Terminology

- **Global Workspaces tree**: left app navigation surface for workspaces, runs, teams, and members.
- **Team active-task split**: the active Tasks UI inside the Team tab, with left task navigator and right detail pane.
- **Task navigator item**: one left-side block for a task, containing summary, responsible actor/team, members, references, and technical details.
- **Actor row**: responsible single-agent row or responsible agent-team row under the summary.
- **Member row**: indented row under a responsible agent team.

## Design Reading Order

Read this design as:

1. Remove wrong global-tree host.
2. Restore/own active-task split inside `TeamActiveTasksSection`.
3. Implement exact task navigator item hierarchy.
4. Keep right detail pane for full task/reference content.
5. Reuse status-dot presentation without moving task ownership into the Workspaces tree.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the active-task global-tree rendering path introduced by the previous wrong design.
- Do not keep a compatibility branch where both Workspaces tree and Team active-task navigator render the same active-task context.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team tab active Tasks section render | Right task/reference detail displayed | `TeamActiveTasksSection.vue` | Core corrected task master/detail UI |
| DS-002 | Primary End-to-End | Task navigator actor/member click | Center/team focus updates through existing team context focus | `TeamOverviewPanel.vue` + `agentTeamContextsStore` | Keeps focus behavior explicit and separate from summary/reference selection |
| DS-003 | Bounded Local | Actor/member status value | Tiny status dot classes | `StatusDot.vue` + `workspaceStatusDotPresentation.ts` | Ensures live blue/green/gray/red semantics match Workspaces tree |
| DS-004 | Primary End-to-End | Workspaces tree render | Workspace/run/team/member navigation only | `WorkspaceAgentRunsTreePanel.vue` / `WorkspaceHistoryWorkspaceSection.vue` | Ensures wrong active-task embedding is removed |

## Primary Execution Spine(s)

- DS-001: `TeamOverviewPanel -> TeamActiveTasksSection -> deriveActiveTaskEntries -> TeamActiveTaskNavigator -> local selected task/reference -> TeamActiveTaskDetailPane -> MarkdownRenderer/TeamTaskReferenceViewer`
- DS-002: `TeamActiveTaskNavigator actor/member row -> TeamActiveTasksSection emit select-member -> TeamOverviewPanel.focusActiveTaskMember -> agentTeamContextsStore.focusMemberAndEnsureHydrated -> existing center/team focus`
- DS-004: `AppLeftPanel -> WorkspaceAgentRunsTreePanel -> WorkspaceHistoryWorkspaceSection -> workspace/run/team/member rows only`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Team tab renders active tasks. The section derives task entries, renders a left navigator item for each task, and uses local selection to show task body or reference preview on the right. | Team overview, active task section, active task entry, task navigator item, detail pane | `TeamActiveTasksSection.vue` | status-dot display, reference icon/name formatting, technical metadata rows, split resize |
| DS-002 | Only explicit actor/team/member row clicks request focus. Summary and reference clicks stay inside task detail selection. | navigator actor/member row, active task section, team overview, team context store | `TeamOverviewPanel.vue` for focus command boundary | existing focus/hydration store behavior |
| DS-003 | Actor/team/member statuses are mapped into the same tiny status dots used by the Workspaces tree without duplicating color semantics. | status value, dot presentation mapping, dot component | `StatusDot.vue` + `workspaceStatusDotPresentation.ts` | status normalization |
| DS-004 | The global Workspaces tree renders only workspace/run/team/member navigation and no task-detail content. | workspace tree panel, workspace section, run/team/member rows | Workspaces history components | shared status dot only |

## Spine Actors / Main-Line Nodes

- `TeamOverviewPanel.vue`: Team tab shell and actor/member focus boundary.
- `TeamActiveTasksSection.vue`: active-task split coordinator and local selected task/reference owner.
- `deriveActiveTaskEntries()`: active-task projection owner.
- `TeamActiveTaskNavigator.vue`: left task navigator hierarchy renderer.
- `TeamActiveTaskDetailPane.vue`: right task/reference detail renderer.
- `WorkspaceAgentRunsTreePanel.vue` / `WorkspaceHistoryWorkspaceSection.vue`: global Workspaces tree owners that must not own task details.

## Ownership Map

| Main-Line Node | Owns | Must Not Own |
| --- | --- | --- |
| `TeamOverviewPanel.vue` | Team tab composition, Messages/Tasks shell, existing focus command handoff for actor/member rows | Task navigator row internals; active-task entry projection; global tree activation state |
| `TeamActiveTasksSection.vue` | Active task entries for the active team, local selected task route key, selected reference ID, reference refresh signal, split layout/resize, event routing between navigator/detail | Global Workspaces tree state; cross-surface store-backed selection; actor/member row rendering details |
| `TeamActiveTaskNavigator.vue` | Exact left navigator item hierarchy, row order, row clicks, status-dot placement for actor/team/member rows, reference row listing, compact technical details | Right detail rendering; center focus mutation; active task data projection |
| `TeamActiveTaskDetailPane.vue` | Selected task body rendering, selected reference preview, optional task execution status/header/focus button | Left actor/member roster; left technical details; selection state ownership; global store access |
| `deriveActiveTaskEntries()` | Projection from `AgentTeamContext` to `ActiveTaskEntry[]` | Vue rendering state; selected item state |
| `StatusDot.vue` / `workspaceStatusDotPresentation.ts` | Shared tiny-dot visual presentation and status class mapping | Team/task selection, run tree expansion, business status decisions |
| Workspaces history components | Workspace/run/team/member navigation and existing tree status display | Active task summary blocks, task references, active-task technical details, task detail selection |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamOverviewPanel` `@select-member` handler | `agentTeamContextsStore.focusMemberAndEnsureHydrated` | Allows active-task actor rows to reuse existing focus behavior | Task summary/reference selection |
| `StatusDot.vue` | `workspaceStatusDotPresentation.ts` | Gives both Workspaces tree and task navigator the same tiny-dot rendering | Status source selection or task status policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Active-task bindings in `WorkspaceAgentRunsTreePanel.vue` | Wrong host container | `TeamActiveTasksSection.vue` local task split | In This Change | Remove imports, computed bindings, action wiring |
| Active-task rendering in `WorkspaceHistoryWorkspaceSection.vue` | Wrong host container | `TeamActiveTaskNavigator.vue` inside Team active-task section | In This Change | Workspaces tree must not render task blocks |
| Active-task contract types in `workspaceHistorySectionContracts.ts` | Wrong cross-surface contract | Team active-task component props/events | In This Change | Remove `WorkspaceHistoryActiveTaskBindings` or equivalent |
| `stores/teamActiveTaskSelectionStore.ts` | Selection no longer crosses global tree/right detail boundary | Local refs in `TeamActiveTasksSection.vue` | In This Change | Remove if no other real caller remains |
| `stores/teamOverviewSectionStore.ts` | Section visibility no longer needs external global-tree activation | Local TeamOverviewPanel section state | In This Change | Remove/revert unless another caller remains |
| `composables/useTeamActiveTaskRightDetailActivation.ts` | Only needed for global-tree click activation | No replacement needed | In This Change | Remove |
| Any `useRightPanel.openRightPanel()` addition only used by wrong activation path | Not needed for corrected task-in-section flow | Existing right panel APIs | In This Change if unused | Keep only if already used by another valid feature |
| Old `TeamActiveTaskRow.vue` status-chip/description/reference-only shape | Does not match requested hierarchy | `TeamActiveTaskNavigator.vue` or item subcomponent | In This Change | Do not preserve as parallel old row |
| `TeamActiveTaskContextTree.vue` as imported by history components | Correct row shape but wrong name/host/coupling | Rename/repurpose to `TeamActiveTaskNavigator.vue` under team components | In This Change | Must not be imported from history components |

## Return Or Event Spine(s) (If Applicable)

- Reference reselection event: `reference row click -> TeamActiveTasksSection.selectReference -> if same reference, increment referenceRefreshSignal -> TeamActiveTaskDetailPane -> TeamTaskReferenceViewer refresh`.
- Actor/member focus event: described by DS-002.

## Bounded Local / Internal Spines (If Applicable)

- `TeamActiveTasksSection` local selection spine: `entries change -> validate selectedTaskRouteKey -> clear invalid reference -> default to first task when needed -> render detail`.
- Split resize spine: `resize handle mousedown -> useHorizontalSplitResize -> leftPaneWidth -> navigator width`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Status-dot presentation | DS-001, DS-003, DS-004 | Navigator and Workspaces tree renderers | Map status to classes and render tiny dot | Prevents status color drift | Would mix visual status policy into task selection |
| Reference icon/name formatting | DS-001 | `TeamActiveTaskNavigator.vue` | Display file-name rows compactly | Existing reference row behavior must remain | Would bloat projection with presentation concerns |
| Technical metadata row projection | DS-001 | `TeamActiveTaskNavigator.vue` | Build compact key/value rows and input JSON | Keeps technical details consistent and testable | Would duplicate metadata mapping in template |
| Split resize | DS-001 | `TeamActiveTasksSection.vue` | Own left/right pane sizing | Existing split UI behavior | Would distract navigator/detail components |
| Existing focus/hydration | DS-002 | `TeamOverviewPanel.vue` / store | Focus actor/team/member explicitly | Reuses existing behavior | Summary/reference clicks could unexpectedly change center focus |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Active task projection | `utils/teamActiveTaskEntries.ts` | Reuse | Already exposes summary, target, members, references, metadata | N/A |
| Task master/detail split | `TeamActiveTasksSection.vue` | Extend/restore | Existing correct host for active task UI | N/A |
| Reference preview | `TeamTaskReferenceViewer.vue` | Reuse | Existing right-side content preview behavior | N/A |
| Status dots | Workspaces tree status mapping | Extend by shared presentation component/utility | User wants same tiny status-dot semantics | N/A |
| Global Workspaces tree | history components | Do not extend for active tasks | Wrong product surface for task details | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team active task UI | active task split, selection, navigator hierarchy, right detail | DS-001, DS-002 | `TeamActiveTasksSection.vue` | Extend/restore | Main work lands here |
| Workspace shared presentation | tiny status-dot component/mapping | DS-003, DS-004 | row renderers | Extend | Presentation-only sharing |
| Workspaces history UI | workspace/run/team/member navigation | DS-004 | history components | Reuse without active-task extension | Remove wrong task coupling |
| Team reference preview | reference content display | DS-001 | detail pane | Reuse | No ownership change |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `TeamActiveTasksSection.vue` | Team active task UI | section coordinator | derive entries, own selection/resize, compose navigator/detail | One section-level state owner | `ActiveTaskEntry` |
| `TeamActiveTaskNavigator.vue` | Team active task UI | left navigator renderer | exact task item hierarchy and row events | Keeps complex row structure out of section coordinator | `StatusDot`, technical rows, reference presentation |
| `TeamActiveTaskDetailPane.vue` | Team active task UI | right detail renderer | selected task body/reference preview | Detail is separate from navigator | `TeamTaskReferenceViewer` |
| `teamActiveTaskTechnicalDetails.ts` | Team active task projection | metadata projection | compact technical rows/input JSON | Template-independent metadata mapping | `ActiveTaskEntry` |
| `StatusDot.vue` | Workspace shared presentation | dot component | tiny dot rendering | Shared visual primitive | status presentation utility |
| `workspaceStatusDotPresentation.ts` | Workspace shared presentation | status class mapping | status -> dot classes | Shared semantics | status enum/string |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| status -> tiny dot class mapping | `utils/workspaceStatusDotPresentation.ts` | shared workspace presentation | Workspaces tree and task navigator need same dot semantics | Yes | Yes | task selection helper or history store dependency |
| status dot rendering | `components/workspace/common/StatusDot.vue` | shared workspace presentation | Avoid duplicate dot spans/classes | Yes | Yes | business status owner |
| technical detail rows | `utils/teamActiveTaskTechnicalDetails.ts` | team active task projection | Needed after moving details left | Yes | Yes | Vue state owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ActiveTaskEntry` | Yes | N/A | Low | Reuse; do not introduce a second task DTO |
| `TechnicalDetailRow` | Yes | Yes | Low | Keep values as display metadata only |
| Local selection in `TeamActiveTasksSection` | Yes | Yes | Low | Fields: selected member route key, selected reference ID, refresh signal; do not store copied entries |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Team active task UI | active-task section coordinator | section header/body, derive entries, local selected task/reference, refresh signal, split resize, compose navigator/detail, emit actor focus | One component owns section-level state and split composition | `ActiveTaskEntry`, `useHorizontalSplitResize` |
| `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue` | Team active task UI | left task navigator | render summary -> actor/team -> members -> references -> technical details; emit select-task/select-reference/select-member | One renderer owns exact hierarchy | `StatusDot`, reference presentation, technical details utility |
| `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | Team active task UI | right detail pane | render selected task body or selected reference preview; optional focus button for selected actor | Detail content stays separate from navigation hierarchy | `MarkdownRenderer`, `TeamTaskReferenceViewer` |
| `autobyteus-web/utils/teamActiveTaskTechnicalDetails.ts` | Team active task projection | metadata row builder | build compact technical rows and technical input JSON from entry | Reusable/testable mapping | `ActiveTaskEntry` |
| `autobyteus-web/components/workspace/common/StatusDot.vue` | workspace shared presentation | status-dot renderer | render tiny status dot with accessible label/title if existing style supports it | Shared UI primitive | status presentation utility |
| `autobyteus-web/utils/workspaceStatusDotPresentation.ts` | workspace shared presentation | status presentation mapping | normalize/map statuses to dot classes | Shared status semantics | status enums/strings |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab UI | Team overview shell | keep Messages/Tasks composition and handle actor focus events from active tasks | Shell owns tab section composition only | existing stores |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspaces history UI | global tree orchestrator | workspace/run/team/member tree only | Removes wrong active-task host | shared status dot only if applicable |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspaces history UI | global tree row renderer | workspace/run/team/member rows only | Removes wrong active-task rendering | shared status dot only if applicable |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspaces history UI | history section contracts | contracts for workspace/run/team/member rows only | Removes active-task contract drift | N/A |

## Ownership Boundaries

- The active-task UI boundary is `TeamActiveTasksSection.vue`. It owns task entry rendering state and selected task/reference state.
- The global Workspaces tree boundary is the history panel/section. It owns workspace/run navigation only.
- Shared status-dot presentation is a presentation boundary, not a data/selection boundary.
- Actor/member focus crosses from active-task UI to existing team-context focus only through the explicit `select-member` event path.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamActiveTasksSection.vue` | local selection refs, navigator/detail composition, split resize | `TeamOverviewPanel.vue` | history components importing active task entries or setting selection | expose narrow props/events on the section |
| Workspaces history panel/section | workspace/run tree state and row rendering | `AppLeftPanel.vue` | active-task UI importing into history tree | keep task UI in Team section |
| `StatusDot.vue` | dot span/classes via presentation utility | row renderers | copying status class maps into each row component | extend status presentation utility |
| `TeamActiveTaskDetailPane.vue` | right body/reference rendering | `TeamActiveTasksSection.vue` | detail pane reading global selection stores | pass explicit props |

## Dependency Rules

Allowed:

- `TeamActiveTasksSection.vue` may import `deriveActiveTaskEntries`, `TeamActiveTaskNavigator.vue`, `TeamActiveTaskDetailPane.vue`, and `useHorizontalSplitResize`.
- `TeamActiveTaskNavigator.vue` may import `StatusDot.vue`, reference file presentation helpers, and `teamActiveTaskTechnicalDetails.ts`.
- `TeamActiveTaskDetailPane.vue` may import `MarkdownRenderer` and `TeamTaskReferenceViewer`.
- Workspaces history components may import `StatusDot.vue` / status presentation utilities for their own rows.

Forbidden:

- Workspaces history components must not import `deriveActiveTaskEntries`, `TeamActiveTaskNavigator.vue`, `TeamActiveTaskDetailPane.vue`, or active-task selection stores.
- The active-task navigator must not mutate `agentTeamContextsStore` directly; it emits actor/member selection.
- Task summary and reference row clicks must not call focus/hydration actions.
- The detail pane must not own selected task/reference state or read a global active-task selection store.
- Do not keep both the wrong global-tree UI and corrected task-section UI.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `deriveActiveTaskEntries(teamContext)` | active task projection | convert `AgentTeamContext` into renderable task entries | `AgentTeamContext` | Existing utility remains source of truth |
| `TeamActiveTaskNavigator` props | task navigator render input | render entries and selected state | `entries: ActiveTaskEntry[]`, `selectedTaskRouteKey`, `selectedReferenceId` | No store access |
| `TeamActiveTaskNavigator` `select-task` event | task selection | request selected task body | `memberRouteKey: string` | Summary row only |
| `TeamActiveTaskNavigator` `select-reference` event | reference selection | request selected reference preview | `{ memberRouteKey: string; referenceId: string }` | Keeps reference tied to task |
| `TeamActiveTaskNavigator` `select-member` event | actor focus | request explicit actor/member focus | `memberRouteKey: string` | Actor/member rows only |
| `TeamActiveTaskDetailPane` props | right detail render input | render selected task/reference | `selectedEntry`, `selectedReference`, `referenceRefreshSignal` | Pure props-driven detail |
| `TeamOverviewPanel.focusActiveTaskMember` | team focus command | focus/hydrate actor/member | `memberRouteKey: string` plus active team run ID | Existing behavior reused |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `select-task` | Yes | Yes | Low | Route key means task member route key |
| `select-reference` | Yes | Yes | Low | Pair reference ID with owning task route key |
| `select-member` | Yes | Yes | Low | Only actor/member rows emit it |
| `TeamActiveTaskDetailPane` props | Yes | Yes | Low | No global selection fallback |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Left active task renderer | `TeamActiveTaskNavigator.vue` | Yes | Low | Prefer over `ContextTree` because it is not global tree content |
| Right active task renderer | `TeamActiveTaskDetailPane.vue` | Yes | Low | Keep |
| Technical rows helper | `teamActiveTaskTechnicalDetails.ts` | Yes | Low | Keep |
| Global history section | `WorkspaceHistoryWorkspaceSection.vue` | Yes | Low | Remove active-task concern from it |

## Applied Patterns (If Any)

- Master/detail split: `TeamActiveTasksSection` owns local selection and composes navigator/detail panes.
- Presentation primitive: `StatusDot.vue` provides shared dot rendering without taking data ownership.
- Projection utility: `deriveActiveTaskEntries()` remains the data projection boundary.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/` | Folder | Team active task UI | Team-specific task and communication UI | Existing location for Team tab components | Global Workspaces tree rendering |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | File | active-task section | split coordinator and local selection | Correct host for task UI | Workspaces tree state |
| `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue` | File | left navigator | exact task hierarchy | Team active task UI owner | right detail rendering or store mutation |
| `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | File | right detail | task body/reference preview | Team active task UI owner | left roster/technical-details hierarchy |
| `autobyteus-web/components/workspace/common/StatusDot.vue` | File | shared presentation | tiny dot | reusable across workspace rows | business logic |
| `autobyteus-web/utils/workspaceStatusDotPresentation.ts` | File | shared presentation | status class mapping | existing semantics extracted | active task selection |
| `autobyteus-web/components/workspace/history/` | Folder | Workspaces history UI | workspace/run/team/member tree | Existing global tree owner | active task summary/reference/technical rows |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/team` | Main-Line Domain-Control UI | Yes | Low | Active task UI belongs here |
| `components/workspace/history` | Main-Line Domain-Control UI | Yes after cleanup | Medium currently | Remove wrong task coupling |
| `components/workspace/common` | Off-Spine Concern | Yes | Low | Shared visual primitive only |
| `utils` | Off-Spine Concern | Yes | Low | Projection/presentation helpers only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Host container | `TeamActiveTasksSection -> TeamActiveTaskNavigator -> TeamActiveTaskDetailPane` | `WorkspaceHistoryWorkspaceSection -> TeamActiveTaskContextTree -> right Team tab activation` | Prevents the exact rerouted confusion |
| Task summary click | `summary click -> selectTask(routeKey) -> right pane task body` | `summary click -> focus subteam/composer` | Separates task content selection from actor focus |
| Actor row click | `actor/member click -> select-member event -> existing focus behavior` | `actor row click mutates global active-task selection store and center focus indirectly` | Keeps explicit focus boundary |
| References | `reference file row on left -> TeamTaskReferenceViewer on right` | `reference row in global Workspaces tree` | Preserves existing task UI behavior |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep global Workspaces tree active-task block and also add Team navigator version | Could avoid deleting wrong code | Rejected | Remove global-tree active-task path; only Team navigator owns it |
| Keep `teamActiveTaskSelectionStore` as a compatibility bridge | It already exists from wrong implementation | Rejected unless a remaining concrete same-section need is proven | Local selection in `TeamActiveTasksSection` |
| Keep `useTeamActiveTaskRightDetailActivation` | It already opens right panel/Team tab | Rejected | No external global-tree task click path remains |
| Keep old `TeamActiveTaskRow.vue` in parallel with new navigator | Could reduce code deletion | Rejected | One left navigator hierarchy only |

## Derived Layering (If Useful)

- Shell layer: `TeamOverviewPanel` chooses Messages/Tasks shell.
- Section layer: `TeamActiveTasksSection` owns active-task split state.
- Pane layer: navigator and detail pane render separate sides.
- Shared presentation layer: status dot and reference/metadata helpers.

## Migration / Refactor Sequence

1. Remove active-task props/contracts/imports/actions from `WorkspaceAgentRunsTreePanel.vue`, `WorkspaceHistoryWorkspaceSection.vue`, and `workspaceHistorySectionContracts.ts`.
2. Remove `useTeamActiveTaskRightDetailActivation.ts` and the active-task cross-surface stores if no valid caller remains.
3. Restore `TeamActiveTasksSection.vue` as the split coordinator:
   - derive `activeTaskEntries`;
   - own `selectedTaskRouteKey`, `selectedReferenceId`, `referenceRefreshSignal` locally;
   - validate selection when entries change;
   - use/restore `useHorizontalSplitResize` for navigator width.
4. Add/rename `TeamActiveTaskNavigator.vue` under `components/workspace/team/`:
   - render summary text-only;
   - render actor/team row immediately below summary with no indent and status dot;
   - render member rows indented with status dots;
   - render references/file rows;
   - render compact/collapsed technical details.
5. Refactor `TeamActiveTaskDetailPane.vue` to receive explicit selected entry/reference props and render only the right-side task body/reference preview.
6. Keep shared status-dot presentation extraction and update Workspaces tree rows only as a presentation reuse, not as task ownership.
7. Update unit tests:
   - `TeamActiveTasksSection.spec.ts`: exact hierarchy/order; summary click selects task detail; reference click opens preview; technical details on left; actor row emits focus.
   - Workspaces tree tests: active-task context is not rendered under history rows; normal status dots remain.
   - Status-dot utility tests: color/animation mapping.
8. Run browser smoke against `Nested Classroom Test Team`: verify no active-task block under global Workspaces tree and verify corrected Team task navigator hierarchy.

## Key Tradeoffs

- Keeping the existing Team active-task split avoids a larger UI redesign and matches the user's “task UI should pretty much stay” clarification.
- Local selection in `TeamActiveTasksSection` is simpler and healthier than cross-surface stores because navigator and detail are siblings again.
- Shared status-dot extraction remains useful, but only as presentation reuse; it must not justify task ownership inside the Workspaces tree.

## Risks

- The left task navigator can become visually dense for tasks with many members/references; use truncation, line clamp, compact rows, and collapsed technical details.
- If future product direction wants Tasks visible by default, that should be a separate requirement from this correction.
- Need careful test updates so stale tests do not keep asserting the wrong global-tree behavior.

## Guidance For Implementation

- Treat the current global-tree active-task implementation as wrong code to remove, not as a base to polish.
- Reuse the useful row rendering ideas from `TeamActiveTaskContextTree.vue` only after relocating/renaming them under the Team active-task navigator and removing store coupling.
- Do not modify backend/runtime data unless `ActiveTaskEntry` is proven insufficient.
- Make the row hierarchy visible in tests by using stable `data-test` selectors for summary, actor/team row, member rows, references section, reference rows, and technical details.
- After implementation, the browser screenshot should show active-task context inside the Team Tasks UI, not under the global Workspaces list.
