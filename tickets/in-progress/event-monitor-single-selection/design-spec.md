# Design Spec

## Current-State Read

The desktop workspace renders a single center surface from `agentSelectionStore.selectedType`: `WorkspaceAdaptiveLayout` chooses either `AgentWorkspaceView` or `TeamWorkspaceView`. For a team selection, `AgentTeamEventMonitor` resolves the selected `activeTeamContext`, chooses its focused member route, and passes one conversation to `AgentEventMonitor`.

The left history tree is separately projected by `runHistoryNavigationProjection`. Each `TeamTreeNode` has a stable `teamRunId` and its own `focusedMemberRouteKey`. Activating a history row already selects the team run and focuses/hydrates the member through the existing selection/open coordinators. The defect is in `WorkspaceHistoryWorkspaceSection`: stable rows and transient rows decide current-looking emphasis from `memberRouteKey === focusedMemberRouteKey(team)` without checking whether `team.teamRunId` is the selected team. A common route such as `code_reviewer` therefore appears selected in multiple team runs while only one team is active.

The current owner boundaries remain healthy. The selection store owns the viewed run; the team context owns focus within that run; the history tree panel is the correct adapter between those stores and the presentational section. No event-monitor, server, route-contract, or persisted-data refactor is needed.

## Intended Change

Align left-row current/selected presentation with the existing center-view identity:

1. Keep `agentSelectionStore` as the only viewed-run authority.
2. Extend `WorkspaceHistorySectionState` with a narrow `isTeamRunSelected(teamRunId)` query supplied by `WorkspaceAgentRunsTreePanel`.
3. In `WorkspaceHistoryWorkspaceSection`, compute a team-member row's current state only when both conditions hold:
   - the team run is the authoritative selected team (`selectedType === 'team'` and matching `selectedRunId`), and
   - the row route matches that team's `focusedMemberRouteKey`.
4. Use that compound result for stable-row classes, transient-row emphasis, and one appropriate `aria-current` state. Keep the transient base ghost background, expansion, status, activity, hover, and keyboard focus separate.
5. Add a focused component regression using two team runs with the same focused member route and assert one selected/current row. Add lifecycle/type-switch assertions proportionate to the final implementation.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002 / AC-001, AC-002: only the compound selected team/member target is current. | User activates a team/member row; selected target is `(teamRunId, memberRouteKey)`. | `investigation-notes.md` BEH-001; `WorkspaceHistoryWorkspaceSection.vue:300,365`; `agentSelectionStore.ts`. | Preserve one center target and per-team focus; add selected-team gating to row presentation. | `DS-001` primary: history row -> selection adapter -> selection/focus stores -> active team/member -> center monitor; `DS-002` bounded UI projection. |
| BEH-002 | User | REQ-003 / AC-003: transfer current styling when the viewed target changes. | User activates another team/member or agent row. | `runHistorySelectionActions.ts:64-139`; `WorkspaceAdaptiveLayout.vue:18-20`. | Preserve existing selection/open/hydration; re-render only the new compound target as current. | `DS-001`, `DS-003` return/render spine. |
| BEH-003 | Contract/User | REQ-004, REQ-005 / AC-004, AC-005: supported workspace link/history lifecycle stays aligned and accessible. | Workspace execution link supplies team run plus member route; existing coordinators commit selection. | `useWorkspaceRouteSelection.ts`; `workspaceNavigationService.ts`; `WorkspaceHistoryWorkspaceSection.vue`. | Preserve route contract and clear/no-target behavior; expose one current semantic and keep keyboard focus distinct. | `DS-001`, `DS-003`. |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/in-progress/event-monitor-single-selection/ui-ux-spec.md` | Defines user journeys, compound identity, visual state separation, lifecycle, and accessibility behavior. | REQ-001..REQ-005 / AC-001..AC-005 | The design maps its selection predicate, transient behavior, and `aria-current` guidance directly to this supplement. | Approved for architecture review; intended behavior locked by user on 2026-08-11. |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor needed now: `No`
- Evidence: The center path is single-valued by `agentSelectionStore`; team projection is keyed by `teamRunId`; only the history row emphasis at `WorkspaceHistoryWorkspaceSection.vue:300,365` drops team identity and selected type.
- Design response: Strengthen the existing tree-panel-to-section state contract with a team-run selection predicate and derive row current state from `(selected team run, team-local focus route)`.
- Refactor rationale: The existing owners, file placement, APIs, and data structures already express the required identity. Creating a selection store, changing the event-monitor owner, or rewriting projection data would duplicate authority and expand risk without addressing the local defect.
- Intentional deferrals and residual risk, if any: Browser-reload selection persistence remains unsupported/out of scope. The transient ghost background remains as its existing semantic presentation; implementation/review should confirm selected/current emphasis is distinguishable from it.

## Terminology

- **Viewed target:** The one agent run or team run/member conversation rendered in the center event monitor.
- **Compound team target:** `(teamRunId, memberRouteKey)`, the identity needed to distinguish the same role/member route across separate team runs.
- **Current/selected row:** The left navigation row corresponding to the viewed target. It is not the same as keyboard focus, hover, expansion, status, activity, or transient execution presentation.

## Design Reading Order

This design proceeds from the verified center and history paths to the compound identity predicate, ownership boundary, file mapping, and minimal change sequence. No persisted-data migration or compatibility seam applies.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete path in scope: the route-only row-current comparisons in `WorkspaceHistoryWorkspaceSection` are obsolete as the selected-state policy and must be replaced directly.
- No compatibility wrapper, dual predicate, feature flag, or retained route-only selection path is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: No persisted subject changes. Run history data remains in the existing store/read model; Pinia selection is runtime UI state; workspace execution-link query parameters are transient and stripped after opening.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader/writer behavior and representative evidence: N/A; no reader/writer changes.
- Required semantics and invariants under direct use: Yes. Direct use preserves all run/member/history meaning and changes only derived row presentation.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No storage or migration operation.
- Decision: `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: A migration would provide no benefit because no stored shape changes. The correction is a derived frontend predicate only.
- Acceptance criteria or design constraints supported by this decision: REQ-001..REQ-005, AC-001..AC-005; no API/persistence changes.

### Migration Plan (Only When Decision Is `Migration Required`)

`N/A — persisted data is not affected.`

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-003 | User activates history row or supported workspace execution link | One team/member conversation is rendered in the center event monitor | `agentSelectionStore` + active team context | Shows the complete identity flow from trigger to visible outcome; the row must use the same identity. |
| DS-002 | Bounded Local | BEH-001, BEH-002 | `WorkspaceHistoryWorkspaceSection` receives projected team nodes and state contract | Stable/transient rows render one current target | `WorkspaceHistoryWorkspaceSection` as row presentation owner, with selection policy supplied by tree-panel boundary | Captures the local row predicate where the bug occurs without replacing the end-to-end spine. |
| DS-003 | Return-Event / Render | BEH-001, BEH-002, BEH-003 | Selection/focus store mutation completes | Vue reactive render updates old/new row classes and current semantics | Existing Pinia/Vue reactive state | Ensures transfer is atomic at the derived render boundary and stale old emphasis disappears. |

## Primary Execution Spine(s)

`User or Workspace Execution Link -> Workspace History Selection Adapter / Open Coordinator -> agentSelectionStore + Team Context Focus -> WorkspaceAdaptiveLayout -> AgentTeamEventMonitor -> AgentEventMonitor`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A row activation or supported link identifies a run; existing selection/open code commits the selected agent/team and, for teams, focuses a member. The adaptive workspace selects one center view, and the team event monitor renders one focused conversation. The history row predicate consumes the same selected team identity plus the team-local focused route, so only the center owner is reflected as current. | History navigation target; selection/open coordinator; `agentSelectionStore`; `AgentTeamContext`; workspace adaptive view; `AgentTeamEventMonitor`; `AgentEventMonitor` | `agentSelectionStore` for viewed run; `AgentTeamContext` for member focus | Route parsing, history hydration, navigation reveal, status/activity projection, keyboard/hover styling |
| DS-002 | The tree panel passes projected nodes and a state contract to each workspace section. The section derives `isSelectedTeamMember(team,row)` from `state.isTeamRunSelected(team.teamRunId)` and `row.memberRouteKey === focusedTeamMemberRouteKey(team)`, then applies presentation to stable/transient rows. | Tree panel; workspace section; stable member row; transient row | `WorkspaceHistoryWorkspaceSection` owns derived row presentation; tree panel owns the adapter boundary | Expansion maps, avatar/status rendering, transient ghost styling |
| DS-003 | When selection/focus changes, Pinia/Vue reactivity re-evaluates the predicate for every rendered row. The former compound target no longer matches; the new target matches; no local row-selection cache exists to become stale. | Selection/focus state; row render | Existing reactive stores and Vue template | Opening/loading indicators, error handling, focus-visible browser state |

## Spine Actors / Main-Line Nodes

- `Workspace history row / workspace execution link` — initiating user or contract surface.
- `useWorkspaceHistorySelectionActions` / existing open coordinators — translate target activation to existing selection/open behavior.
- `agentSelectionStore` — authoritative selected run/type.
- `AgentTeamContext` — authoritative focused member within the selected team.
- `WorkspaceAdaptiveLayout` — selects one center view branch.
- `AgentTeamEventMonitor` / `AgentEventMonitor` — renders the meaningful center outcome.
- `WorkspaceAgentRunsTreePanel` / `WorkspaceHistoryWorkspaceSection` — projects the same target back to navigation presentation.

## Ownership Map

- `agentSelectionStore` owns the single selected run identity and desktop center-view mode. It is the authoritative source for whether a team run is selected.
- `AgentTeamContext` owns member focus and hydration within its own team run. Its `focusedMemberRouteKey` is team-local, not a global selection identity.
- `WorkspaceAgentRunsTreePanel` owns the adapter boundary to the history section and may answer whether a given `teamRunId` is the selected team without exposing store internals.
- `WorkspaceHistoryWorkspaceSection` owns row layout and derived visual/accessibility state. It must combine the team-selection predicate with the team-local focus route; it does not own selection or call stores.
- `WorkspaceTransientExecutionRow` is a thin presentational wrapper. It receives an exact current/emphasis boolean and emits existing selection/toggle events; it must not import stores or selection policy.
- `AgentTeamEventMonitor` owns the center team/member conversation rendering. It remains unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceAgentRunsTreePanel` -> `WorkspaceHistorySectionState` | `agentSelectionStore` and `AgentTeamContext`; `WorkspaceHistoryWorkspaceSection` owns presentation | Keeps the section presentational and testable while exposing the minimal selected-team query. | A second selection store, focus mutation, or center-view decision. |
| `WorkspaceTransientExecutionRow` | `WorkspaceHistoryWorkspaceSection` / tree state and selection actions | Reusable markup/event wrapper for transient rows. | Store access, selection identity resolution, or expansion state. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Route-only selected-looking comparison in stable team-member row | A member route is not globally unique across team runs. | `WorkspaceHistorySectionState.isTeamRunSelected` plus section compound predicate | In This Change | Replace directly; no dual path. |
| Route-only `focused` value passed to transient row | It can emphasize a row in an inactive team. | Exact selected/current predicate from `WorkspaceHistoryWorkspaceSection` | In This Change | Rename prop to `isSelected`/`current` if implementation clarity benefits; retain wrapper ownership. |
| Any test fixture/contract that assumes focus alone means global selection | It would preserve the bug's ambiguity. | Compound team-run + member-route fixtures and assertions | In This Change | Update only affected durable tests. |

## Return Or Event Spine(s) (If Applicable)

`Selection/open coordinator commits -> Pinia selection and team focus mutate -> navigation projection/tree state updates -> Vue reactive section renders -> old row loses current state and new row gains it`

This is a derived render/event path, not a second selection owner.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `WorkspaceHistoryWorkspaceSection`
- Short chain: `TeamTreeNode + SectionState -> isSelectedTeamMember(team,row) -> stable/transient class + aria-current`
- Why it matters: This is the exact local invariant boundary. It keeps compound identity in the parent section and prevents a presentational row from guessing selection from a route key.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| History projection/reveal | DS-001, DS-002 | Tree panel / history navigation | Builds team nodes, indexes identity, expands ancestors for selected target | Keeps history data and reveal behavior out of row markup | Row would own projection/lifecycle logic and risk bypassing stores |
| Team-member hydration | DS-001 | Existing open/focus coordinator | Loads historical member context when needed | Preserves existing historical-run lifecycle | Selection UI would become coupled to async data loading |
| Status/activity/avatar presentation | DS-002 | Workspace section | Renders status/activity dots and avatar fallbacks | These are informative non-selection states | Mixing them into selection predicate would recreate ambiguity |
| Keyboard/hover/focus styling | DS-002, DS-003 | Row presentation / browser | Shows interaction focus without changing selection | Accessibility and pointer feedback | Focus could be mistaken for viewed-target state |
| Route parsing/cleanup | DS-001 | Workspace route selection service | Opens supported execution links, removes transient query | Existing navigation contract | UI component would bypass route/open owner |

## Ownership Boundaries

Authority changes from the initiating row/link to the existing selection/open coordinator, then to `agentSelectionStore` for selected run/type and `AgentTeamContext` for member focus. The center monitor reads those authoritative owners. The history section is downstream presentation: it may query whether a team is selected but must not maintain or mutate selection. A team-local focus route is only meaningful in the context of its team run and must never be treated as global identity.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `agentSelectionStore` | `selectedType`, `selectedRunId`, center-view mode side effect | Workspace layout, history adapter, active-context facade | Row-local `ref`/set of selected IDs or route-only global matching | Expose a read-only `isTeamRunSelected` adapter at the existing panel boundary. |
| `AgentTeamContext` / team context store | Focused member route, member hydration, active member context | Team monitor, team selection/open coordinator | History row mutating another team's focus or assuming route key is global | Use existing focus/open methods; do not add row-local focus state. |
| `WorkspaceAgentRunsTreePanel` -> section state contract | Mapping store selection into presentational row queries | `WorkspaceHistoryWorkspaceSection` | Section importing Pinia stores directly or using run-history internals | Extend the contract with the singular team-run predicate. |
| `WorkspaceHistoryWorkspaceSection` | Stable/transient row class and current semantics | Presentational child row | Child row importing stores or calling open actions | Pass exact current boolean/semantic as props. |

## Dependency Rules

- `WorkspaceAdaptiveLayout` and active-context/team-monitor code may depend on `agentSelectionStore` and team context stores through their existing owners.
- `WorkspaceAgentRunsTreePanel` may depend on `agentSelectionStore` and pass a narrow query through `WorkspaceHistorySectionState`.
- `WorkspaceHistoryWorkspaceSection` may depend on the state contract and projected row data, but must not import `agentSelectionStore`, `runHistoryStore`, or open coordinators for this visual decision.
- `WorkspaceTransientExecutionRow` may depend only on row props and emit contracts; it must not know team or selection stores.
- No caller may treat `memberRouteKey` or display name alone as a selected team target.
- No compatibility wrapper, parallel selected-ID set, route-only fallback, or dual selection path is allowed.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkspaceHistorySectionState.isTeamRunSelected(teamRunId)` (new) | Selected team run at presentation boundary | Answers whether a rendered team owns the authoritative selected team | `teamRunId: string` | Narrow read-only adapter backed by `selectedType === 'team' && selectedRunId === teamRunId`. |
| `isSelectedTeamMember(team,row)` (local section function) | Rendered team-member row | Combines selected team predicate with team-local `memberRouteKey` focus | `(team.teamRunId, row.memberRouteKey)` plus `team.focusedMemberRouteKey` | Not a public store API; no state mutation. |
| Existing `selectTreeRun(row)` / `onSelectTeamMember` | History target opening | Keeps existing selection/focus/hydration behavior | `TeamMemberFocusTarget { teamRunId, memberRouteKey }` | No contract change. |
| Existing workspace execution link | Cross-surface navigation target | Opens selected target from route query | `teamRunId + memberRouteKey` for team; `runId` for agent | No route change. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceHistorySectionState.isTeamRunSelected` | Yes | Yes (`teamRunId`) | Low | Add to existing adapter contract. |
| Local `isSelectedTeamMember` | Yes | Yes (`teamRunId + memberRouteKey`) | Low | Keep local and pure. |
| Existing `selectTreeRun` | Yes | Yes (`RunTreeRow` or team target) | Low | Preserve. |
| Route-only member comparison | No under current behavior | No | High | Remove as selected/current policy. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Viewed run selection | `agentSelectionStore` | Yes | Low | Reuse existing name. |
| Team-local member focus | `focusedMemberRouteKey` | Yes | Medium if used as global selection | Keep team-local meaning explicit in predicate. |
| Presentation query | `isTeamRunSelected` | Yes | Low | Add to section contract; avoid generic `isSelected`. |
| Compound row state | `isSelectedTeamMember` / `isCurrent` | Yes | Low | Keep local, avoid exposing a new store concept. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Viewed-run identity | Agent selection/state | `Reuse` | Already single-valued and drives center view. | N/A |
| Team member focus | Team context/navigation projection | `Reuse` | Already stores team-local focus and hydration. | N/A |
| Row selection presentation query | Workspace history UI boundary | `Extend` | Existing `WorkspaceHistorySectionState` is the correct presentational adapter. | N/A |
| Current-row accessibility state | Workspace history row presentation | `Extend` | Stable/transient row markup already owns visual semantics. | N/A |
| New selection store/helper subsystem | None | `Create New` rejected | Would duplicate authority and widen scope. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent/team selection state | Selected run/type | DS-001, DS-003 | `agentSelectionStore` | `Reuse` | No state shape change. |
| Team runtime/navigation | Team-local focus and projected team nodes | DS-001, DS-002 | `AgentTeamContext`, `runHistoryNavigationProjection` | `Reuse` | No projection change. |
| Workspace history UI | State adapter, row classes, current semantics | DS-002, DS-003 | `WorkspaceAgentRunsTreePanel`, `WorkspaceHistoryWorkspaceSection` | `Extend` | Minimal local behavior correction. |
| Transient history row presentation | Ghost/status/selected emphasis | DS-002 | `WorkspaceTransientExecutionRow` | `Extend` | Keep thin presentational boundary. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/history/workspaceHistorySectionContracts.ts` | Workspace history UI | Tree panel -> section boundary | Add `isTeamRunSelected` contract method | Contract is the narrow adapter surface. | Yes; existing section state. |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspace history UI | Selection adapter | Derive team-run predicate from `agentSelectionStore` | Already wires store and section state. | Yes; existing store. |
| `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history UI | Row presentation owner | Apply compound selected/current predicate to stable/transient rows | One file owns all history-row variants. | Yes; `TeamTreeNode`, execution rows. |
| `components/workspace/history/WorkspaceTransientExecutionRow.vue` | Transient history presentation | Thin row wrapper | Rename/receive current boolean and expose current semantics | One file owns transient markup semantics. | Yes; existing row props. |
| `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Workspace history coverage | Component boundary | Cross-team duplicate-route regression | Test is colocated with target component. | Yes; existing fixtures. |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel*.spec.ts` | Workspace history coverage | Tree panel boundary | Contract/lifecycle assertions if required | Existing selection regression suites are the nearest durable coverage. | Yes; existing mocks. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Team-member current predicate | None; keep local to section | Workspace history UI | It is a presentation composition of existing team node + contract state, not a new domain model. | N/A | N/A | A parallel global selection model or generic helper with ambiguous identity. |
| Selected team query | Existing section contract | Workspace history UI | Tree panel already owns the store-to-view adaptation. | Yes; only team ID crosses boundary. | Yes; no selected-ID copy. | A broad store facade or second selection authority. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceHistorySectionState` | Yes | Yes | Low | Add one singular read-only team predicate rather than duplicating selected IDs. |
| `TeamTreeNode.focusedMemberRouteKey` | Yes, team-local focus | Yes | Medium if read globally | Require team-run gating wherever used for selected/current row presentation. |
| `WorkspaceTransientExecutionRow` current prop | Yes after rename/clarification | Yes | Low | Keep as presentational boolean; do not store it. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspace history UI | Tree panel -> section | `isTeamRunSelected(teamRunId)` contract | Keeps parent-child boundary explicit and testable. | Existing state contract. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspace history UI | Store adapter | Expose selected-team predicate from `agentSelectionStore` | Existing store wiring and section construction live here. | `agentSelectionStore`. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history UI | Row presentation | Compound current predicate, stable-row classes, `aria-current`, transient prop | All workspace-history row variants share this presentation owner. | `TeamTreeNode`, execution rows. |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | Transient history presentation | Thin wrapper | Current/selected emphasis and current semantics while retaining events/ghost state | Keeps transient markup isolated and store-free. | Existing row data. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Workspace history coverage | Component | Duplicate route key across team runs and no-selection/type-switch assertions | Directly verifies the bug's visual invariant. | Existing fixtures. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Workspace history coverage | Tree panel | State-contract/lifecycle regression if needed | Existing regression suite covers multi-team history behavior. | Existing test mocks. |

## Applied Patterns (If Any)

- Existing state-contract injection: `WorkspaceAgentRunsTreePanel` passes `WorkspaceHistorySectionState` to keep `WorkspaceHistoryWorkspaceSection` presentational and store-free.
- Existing compound identity indexing: `runHistoryMemberIndexKey(teamRunId, memberRouteKey)` demonstrates that team/member identity is already modeled as a pair.
- Existing thin presentational wrapper: `WorkspaceTransientExecutionRow` emits `select`/`toggle` and must remain free of store imports.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/` | Folder | Workspace history UI | Navigation tree and row presentation | Existing feature-oriented folder owns the target surface. | Store lifecycle or event-monitor rendering. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | File | Tree panel -> section boundary | Add minimal selected-team query | Existing contract file is the established boundary. | Store mutation or UI layout. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | File | History tree adapter | Bind `agentSelectionStore` selected team to contract | It already creates section state and owns store dependencies. | Row-specific styling details. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | History row presentation | Gate stable/transient current styling by compound identity | It already renders both row classes and their interaction states. | Selection store imports or async open logic. |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | File | Thin transient row wrapper | Render exact current prop and preserve events/ghost semantics | Existing transient path is already isolated here. | Team selection policy or store state. |
| `autobyteus-web/components/workspace/history/__tests__/` | Folder | Workspace history coverage | Durable component/regression tests | Existing colocated strategy. | Production state or test-only product paths. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/` | Mixed Justified | Yes | Low | Existing folder intentionally contains history-tree composition and row presentation; no new folder is needed for a small local predicate. |
| `autobyteus-web/stores/` | Main-Line Domain-Control | Yes | Low | No store file changes; existing selection store remains owner. |
| `autobyteus-web/components/workspace/team/` | Main-Line Domain-Control / center presentation | Yes | Low | No changes; center event-monitor owner remains isolated. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Compound row identity | `isCurrent = state.isTeamRunSelected(team.teamRunId) && row.memberRouteKey === team.focusedMemberRouteKey` | `row.memberRouteKey === team.focusedMemberRouteKey` | The same role can exist in multiple team runs; team ID is required to identify the visible monitor. |
| State boundary | Tree panel passes `isTeamRunSelected(teamRunId)` into the section; section remains store-free. | Section imports `agentSelectionStore` or each row creates its own selected ref. | Keeps the authoritative boundary singular and presentational tests simple. |
| Multi-group rendering | Team A/code_reviewer non-current; Team B/code_reviewer current; Team C/code_reviewer non-current. | Highlight every `code_reviewer` whose team-local focus matches, regardless of selected team. | Mirrors the reported screenshot and the exact regression witness. |
| Focus versus current | A keyboard focus ring may appear on Team A while Team B remains `aria-current="true"`. | Treating focus or hover as a second selected target. | Preserves accessibility interaction feedback without confusing the viewed monitor. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep route-only highlighting as a fallback | Could avoid changing existing focus-based styling for historical rows. | `Rejected` | Replace with the compound selected-team + team-local-focus predicate. |
| Add a parallel set of selected team/member IDs | Could make rendered state explicit. | `Rejected` | Reuse `agentSelectionStore` and existing `TeamTreeNode` identity through the section contract. |
| Add route/persisted selection migration | Could attempt to restore a single target after reload. | `Rejected` | No persisted selection contract exists; keep transient execution-link support unchanged. |
| Compatibility wrapper around old `focused` prop | Could preserve ambiguous prop semantics. | `Rejected` | Rename/clarify the presentational boolean if needed and feed exact current state directly. |

## Derived Layering (If Useful)

- State/owner: `agentSelectionStore` and team context.
- Adapter: `WorkspaceAgentRunsTreePanel` -> `WorkspaceHistorySectionState`.
- Presentation: `WorkspaceHistoryWorkspaceSection` and `WorkspaceTransientExecutionRow`.
- Center rendering remains under `WorkspaceAdaptiveLayout` -> `AgentTeamEventMonitor` -> `AgentEventMonitor`.

This is explanatory only; the ownership and spine rules above govern the design.

## Change / Refactor Sequence

1. Requirements and UI/UX supplement were approved by the user on 2026-08-11; keep this design aligned through review.
2. Extend `WorkspaceHistorySectionState` with `isTeamRunSelected(teamRunId)` and bind it in `WorkspaceAgentRunsTreePanel` to `agentSelectionStore.selectedType/selectedRunId`.
3. Replace route-only stable-row emphasis with a local compound predicate combining selected team ID and the team's focused member route. Add the one current accessibility semantic to the selected row if no existing primitive supplies it.
4. Pass the same exact predicate to `WorkspaceTransientExecutionRow`; clarify/rename its boolean prop if needed and add matching current semantics without changing its ghost/status/expansion behavior.
5. Add/update component and tree-panel regression coverage for duplicate route keys across team runs, agent/team switching, no selection, keyboard activation, and current semantics. The downstream coverage owner decides whether existing durable tests are updated, expanded, or supplemented after code review.
6. Run implementation-scoped checks, then code review. API/E2E coverage investigation and execution follow code review; if durable coverage source changes after that review, route it back through code review before delivery.
7. Remove the old route-only comparison and any stale test assumptions; do not retain a compatibility branch.

## Key Tradeoffs

- **Existing selection store versus new UI target object:** Reusing the store avoids duplicated authority and is sufficient because team ID is already selected there and member focus is already stored on each team context/projection.
- **Parent predicate versus child store access:** A narrow section-state method keeps the row components reusable and prevents boundary bypass.
- **Preserve transient ghost background versus normalize all row colors:** Preserve the existing transient meaning and change only current emphasis; this minimizes unrelated visual churn. Review must ensure current/current-not-current distinction is still clear.
- **`aria-current` versus `aria-selected`:** Use the navigation-oriented current semantic without introducing a listbox/tree selection role redesign.

## Risks

- A future contributor could reuse `focusedMemberRouteKey` as a global selected field; code review should preserve the explicit compound predicate.
- Missing frontend dependencies prevent design-stage execution evidence; downstream setup must report exact environment and test results.
- If the existing transient ghost background is visually mistaken for selection, the implementation may need a proportionate style adjustment, but that should remain within the same UI requirement and not alter transient data semantics.

## Guidance For Implementation

- Keep the implementation localized to the history UI contract/adapter and stable/transient row rendering.
- Prefer an explicit `isTeamRunSelected` name over generic `isSelected` so the identity scope is obvious.
- Use `team.teamRunId` and `displayRow.row.memberRouteKey`; never compare display labels or route key alone.
- Gate selected/current state on `selectionStore.selectedType === 'team'`; when an agent is selected or selection is cleared, no team-member row is current.
- Keep `onSelectTeam`, `onSelectTeamMember`, `selectTreeRun`, hydration, route parsing, center event monitor, status dots, expansion maps, and transient event emits unchanged unless a test exposes a direct contract issue.
- For accessibility, add `aria-current="true"` only to the one current row and preserve existing `role="button"`, keyboard activation, disclosure `aria-expanded`, and focus-visible styling. Avoid `aria-selected` without a matching selection-list role.
- Add regression fixtures where Team A and Team B both focus `code_reviewer` but only Team B is selected; assert Team A does not have selected classes/current semantics and Team B does.
