# Design Spec

## Current-State Read
The affected UI is the left Workspaces history tree in `autobyteus-web`. `WorkspaceAgentRunsTreePanel.vue` supplies tree state and actions to `WorkspaceHistoryWorkspaceSection.vue`. Inside an expanded team run, `WorkspaceHistoryWorkspaceSection.vue` renders team member display rows from `visibleTeamExecutionRows(team)`.

Current stable nested team row behavior:
- Stable member rows are rendered inline in `WorkspaceHistoryWorkspaceSection.vue`.
- A row body click/Enter/Space calls `selectTeamDisplayRow(team, displayRow.row)`.
- If the row is an `agent_team` with children, a separate `workspace-team-member-disclosure` button is rendered.
- The disclosure button calls `state.toggleTeamMember(workspaceId, teamRunId, memberRouteKey)` with `.stop`, so only the chevron toggles children.
- Descendant visibility is controlled by `visibleTeamExecutionRows(...)`, which skips deeper rows when a disclosure-bearing row is collapsed.

Current transient task-team row behavior:
- `WorkspaceTransientExecutionRow.vue` renders transient task-agent/task-team rows.
- The root row emits `select`; its disclosure button emits `toggle` with stopped propagation when `hasChildren` is true.

Current ownership boundaries are healthy:
- `useWorkspaceHistoryTreeState.ts` owns expansion state via `isTeamMemberExpanded(...)` and `toggleTeamMember(...)`.
- `useWorkspaceHistorySelectionActions.ts` / `runHistoryStore.selectTreeRun(...)` own selection, focus, and historical member hydration.
- `WorkspaceHistoryWorkspaceSection.vue` owns the stable row activation policy because it composes the row, knows `hasChildren`, and already has both selection and expansion delegates.
- `WorkspaceTransientExecutionRow.vue` is a thin presentational wrapper and should continue to emit events rather than importing stores.

## Intended Change
Change disclosure-bearing nested team row activation so the full row body toggles expansion/collapse while preserving row selection/focus. Keep chevron/disclosure clicks as stopped toggle-only controls to avoid double toggling and to preserve the chevron as a state indicator.

Target behavior:
- Stable nested `agent_team` rows with children: row body click/Enter/Space = toggle expansion + select/focus row.
- Stable leaf rows without children: row body click/Enter/Space = existing select/focus only.
- Stable nested team chevron: toggle expansion only; no row-body selection propagation.
- Transient task-team rows with children: row body click/Enter/Space = toggle expansion + select row; chevron remains toggle-only.
- No backend, data-model, or store-shape changes.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: `WorkspaceHistoryWorkspaceSection.vue` already composes row activation and has both `displayRow.hasChildren` and access to `selectTeamDisplayRow(...)`/`toggleTeamDisplayRow(...)`; `useWorkspaceHistoryTreeState.ts` already owns expansion state; `useWorkspaceHistorySelectionActions.ts` already owns selection/hydration.
- Design response: Compose existing operations at the row activation boundary. Do not move expansion state, duplicate selection policy, or alter store contracts.
- Refactor rationale: No refactor is needed because the owner, boundary, API shape, file placement, and row identity data are already appropriate for this small UI behavior change.
- Intentional deferrals and residual risk, if any: None. A future larger cleanup could extract stable member rows into their own component if this file keeps growing, but this task does not require that split and should not introduce artificial structure.

## Terminology

- `Stable member row`: A team member row derived from persisted/live team member tree data and rendered directly by `WorkspaceHistoryWorkspaceSection.vue`.
- `Nested team row`: A stable member row whose `memberKind` is `agent_team` and whose display row has children.
- `Transient execution row`: A runtime-only task-agent/task-team row rendered by `WorkspaceTransientExecutionRow.vue`.
- `Disclosure-bearing row`: A row where `hasChildren` is true and a chevron/disclosure control is shown.
- `Row body activation`: Click or keyboard activation on the row surface outside explicit child controls.

## Design Reading Order

Read this design in this order:
1. Stable nested team row activation spine.
2. Chevron/disclosure stop-propagation spine.
3. Transient task-team row alignment spine.
4. File-level changes and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace the old select-only row-body behavior for disclosure-bearing nested team rows. Do not keep a mode flag, dual behavior, or compatibility branch that preserves the old chevron-only expansion requirement.
- Obsolete path in scope: stable nested team row body activation that only calls `selectTeamDisplayRow(...)` when `hasChildren` is true.
- No files are removed.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User activates stable nested team row body | Children visibility updates and row remains selected/focused | `WorkspaceHistoryWorkspaceSection.vue` row activation policy | Main requested behavior. |
| DS-002 | Primary End-to-End | User activates stable nested team chevron | Children visibility toggles exactly once without row selection | `WorkspaceHistoryWorkspaceSection.vue` disclosure handler + `useWorkspaceHistoryTreeState.ts` | Prevents double toggle and preserves chevron affordance. |
| DS-003 | Primary End-to-End | User activates transient task-team row body | Transient children visibility updates and row selection emits | `WorkspaceTransientExecutionRow.vue` as presentational event composer | Keeps equivalent disclosure rows consistent. |
| DS-004 | Return-Event | `onSelectTeamMember(...)` completes | Run/team selection event and focused member state update | `useWorkspaceHistorySelectionActions.ts` / `runHistoryStore` | Ensures row-body toggle does not bypass selection/hydration. |

## Primary Execution Spine(s)

- DS-001 Stable row body: `User input -> WorkspaceHistoryWorkspaceSection stable row handler -> toggleTeamDisplayRow -> useWorkspaceHistoryTreeState.toggleTeamMember -> visibleTeamExecutionRows rerender -> selectTeamDisplayRow -> useWorkspaceHistorySelectionActions.onSelectTeamMember -> runHistoryStore.selectTreeRun`
- DS-002 Stable chevron: `User chevron input -> stopped disclosure button handler -> useWorkspaceHistoryTreeState.toggleTeamMember -> visibleTeamExecutionRows rerender`
- DS-003 Transient row body: `User input -> WorkspaceTransientExecutionRow.activateRow -> emit toggle/select -> WorkspaceHistoryWorkspaceSection toggle/select handlers -> tree state + selection actions`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a stable nested team row with children is activated from its body, the row owner first toggles that row's expansion state through the existing tree-state boundary and also sends the same row through the existing member selection path. | User input; stable display row; tree-state expansion; selection/focus action; visible descendants | `WorkspaceHistoryWorkspaceSection.vue` | `useWorkspaceHistoryTreeState` expansion state; `useWorkspaceHistorySelectionActions` hydration/focus |
| DS-002 | When the chevron is clicked, propagation remains stopped so only the expansion boundary runs; selection is intentionally not invoked and no row handler also fires. | User input; disclosure control; tree-state expansion; visible descendants | `WorkspaceHistoryWorkspaceSection.vue` | Event propagation guard |
| DS-003 | A transient task-team row with children composes the same two emitted events from its presentational wrapper: toggle then select. The parent remains the state/action owner. | User input; transient row wrapper; emitted toggle/select; parent handlers; visible descendants | `WorkspaceTransientExecutionRow.vue` as thin facade, parent section as actual state/action owner | Presentational component event API |
| DS-004 | Selection/hydration remains asynchronous and authoritative in the existing selection action path, so expansion changes do not bypass persisted-team open behavior. | Member focus target; run history store; selection event | `useWorkspaceHistorySelectionActions.ts` | Existing run history hydration and `run-selected` emission |

## Spine Actors / Main-Line Nodes

- User row/chevron input.
- Stable team member display row in `WorkspaceHistoryWorkspaceSection.vue`.
- Transient execution row in `WorkspaceTransientExecutionRow.vue`.
- `useWorkspaceHistoryTreeState.toggleTeamMember(...)` for nested expansion state.
- `visibleTeamExecutionRows(...)` for descendant visibility projection.
- `actions.onSelectTeamMember(...)` for selection/focus/hydration.

## Ownership Map

| Owner / Node | Owns | Notes |
| --- | --- | --- |
| `WorkspaceHistoryWorkspaceSection.vue` | Stable row structure, stable row activation policy, mapping UI events to state/action delegates | Governing owner for the in-scope stable nested row behavior. |
| `WorkspaceTransientExecutionRow.vue` | Presentational transient row markup and emitted activation events | Thin wrapper; must not own store state or selection policy. |
| `useWorkspaceHistoryTreeState.ts` | Expansion state and identity keys for workspace/team/member rows | Authoritative expansion boundary. |
| `useWorkspaceHistorySelectionActions.ts` | Team/member selection, focus, ancestor reveal, and hydration dispatch | Authoritative selection/focus boundary. |
| `runHistoryStore` | Opening/hydrating selected run/member projections | Must remain behind selection actions. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceTransientExecutionRow.vue` root row | Parent `WorkspaceHistoryWorkspaceSection.vue` plus `useWorkspaceHistoryTreeState`/selection actions | Keeps transient row markup isolated | Expansion storage, run-history selection policy |
| Disclosure button inside stable row | `useWorkspaceHistoryTreeState.toggleTeamMember(...)` | Provides precise chevron target and visual affordance | Row-body selection/focus |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Select-only row body activation for stable disclosure-bearing nested team rows | User expects row body to also expand/collapse; keeping select-only behavior would preserve the usability issue. | `WorkspaceHistoryWorkspaceSection.vue` activation helper composing toggle + select | In This Change | Leaf rows remain select-only because they have no disclosure behavior. |
| Select-only row body activation for transient disclosure-bearing task-team rows | It would make two visually similar disclosure rows behave differently. | `WorkspaceTransientExecutionRow.vue` `activateRow` event composer | In This Change | Only applies when `hasChildren` is true. |

## Return Or Event Spine(s) (If Applicable)

- DS-004 selection return/event path remains unchanged: `actions.onSelectTeamMember(...) -> runHistoryStore.selectTreeRun(...) -> emit run-selected({ type: 'team', runId })`.
- Expansion has synchronous UI state return through Vue reactivity: `toggleTeamMember(...) -> visibleTeamExecutionRows(...) recomputes -> child rows appear/disappear`.

## Bounded Local / Internal Spines (If Applicable)

- `visibleTeamExecutionRows(team)` bounded local projection:
  - `All display rows -> track collapsedDepth -> skip descendant rows deeper than collapsedDepth -> visible row list`.
  - This already enforces child visibility from expansion state and should remain unchanged.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Event propagation guard (`.stop`) | DS-002 | `WorkspaceHistoryWorkspaceSection.vue`, `WorkspaceTransientExecutionRow.vue` | Ensure chevron clicks do not also fire row-body activation | Avoids double toggle and unintended selection | Double-toggle or selection from chevron clicks |
| Keyboard parity | DS-001, DS-003 | Row activation owners | Make Enter/Space match click behavior | Rows advertise button-like activation | Accessibility regression if click-only |
| Test fixture coverage | DS-001..DS-003 | Implementation and review | Verify row body, chevron, leaf-row, and transient behavior | Prevents UX regression | Behavior could be accidentally reverted |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Nested expansion state | `useWorkspaceHistoryTreeState.ts` | Reuse | Already owns `toggleTeamMember` and expansion identity keys. | N/A |
| Team member selection/focus | `useWorkspaceHistorySelectionActions.ts` | Reuse | Already handles focused member selection and run-history hydration. | N/A |
| Stable row rendering | `WorkspaceHistoryWorkspaceSection.vue` | Extend | Existing file owns stable row activation wiring. | N/A |
| Transient row rendering | `WorkspaceTransientExecutionRow.vue` | Extend | Existing presentational component owns transient row root events. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace history UI (`autobyteus-web/components/workspace/history`) | Row rendering, activation event wiring, disclosure controls | DS-001..DS-003 | Workspace history tree | Extend | Local UI behavior change only. |
| Workspace history tree state (`autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`) | Expansion state | DS-001..DS-003 | UI row renderers | Reuse | No changes required unless tests reveal a missing helper. |
| Workspace history selection actions | Selection/focus/hydration | DS-004 | UI row renderers | Reuse | No changes expected. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceHistoryWorkspaceSection.vue` | Workspace history UI | Stable row activation owner | Add helper for stable row body activation based on `hasChildren` | The affected stable row markup and helper functions already live here. | Existing display row types |
| `WorkspaceTransientExecutionRow.vue` | Workspace history UI | Transient row presentational wrapper | Add root activation helper that emits `toggle` when `hasChildren` and always emits `select` | Keeps transient markup behavior local while parent remains state owner. | Existing emit contract |
| `WorkspaceAgentRunsTreePanel.spec.ts` | Test coverage | Panel interaction tests | Update/add end-to-end component assertions for nested row body toggle and chevron no-selection | Existing nested team fixtures live here. | N/A |
| `WorkspaceHistoryWorkspaceSection.spec.ts` | Test coverage | Section component tests | Add focused stable/transient row activation assertions | Directly covers component-level event composition. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Row activation helper logic | N/A | Workspace history UI | Not shared enough to extract; stable and transient owners have different APIs. | N/A | N/A | Generic helper detached from row ownership |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceTeamExecutionDisplayRow` | Yes | N/A | Low | No data-model change. |
| `TeamMemberFocusTarget` | Yes | N/A | Low | Continue passing existing row identity to selection action. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history UI | Stable member row owner | Introduce `activateTeamDisplayRow(team, row, hasChildren)` or equivalent; wire stable row click/Enter/Space to it; keep disclosure `.stop` toggle-only. | It already owns row rendering and delegates. | Existing row and state/action contracts |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | Workspace history UI | Transient row wrapper | Introduce `activateRow()` or equivalent; when `hasChildren`, emit `toggle` before/alongside `select`; otherwise select only. | It owns transient row root activation events. | Existing `select`/`toggle` emits |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Workspace history tests | Panel behavior coverage | Assert nested team row body expands/collapses and selects; assert chevron remains toggle-only/no selection. | Existing fixtures and assertions cover real panel wiring. | N/A |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Workspace history tests | Section behavior coverage | Add stable and transient row activation component tests. | Directly exercises the changed components. | N/A |

## Ownership Boundaries

`WorkspaceHistoryWorkspaceSection.vue` is the stable row activation owner, but it is not the expansion store and not the selection/hydration owner. It should compose the existing boundaries:
- Expansion through `props.state.toggleTeamMember(...)` only.
- Selection/focus through `props.actions.onSelectTeamMember(...)` only.

`WorkspaceTransientExecutionRow.vue` is a thin presentational wrapper. It may decide which events to emit on row activation, but it must not import tree state, stores, or selection actions.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useWorkspaceHistoryTreeState` via section `state` contract | `expandedTeamMembers` map and identity key construction | Workspace history row components | Direct mutation of expansion records from UI components | Extend state contract, not direct store mutation |
| `useWorkspaceHistorySelectionActions` via section `actions` contract | `runHistoryStore.selectTreeRun`, ancestor reveal, run-selected emit | Workspace history row components | Calling run history/hydration internals directly from row components | Extend action contract, not bypassing selection actions |
| `WorkspaceHistoryWorkspaceSection.vue` for stable row activation | Stable row helper and template event mapping | Stable nested member row template | Duplicating click/keyboard behavior inline in multiple places | Add one local helper |
| `WorkspaceTransientExecutionRow.vue` emit API | Presentational event mapping | Parent section | Importing tree state or selection store into transient row component | Emit richer/clearer events to parent |

## Dependency Rules

Allowed:
- `WorkspaceHistoryWorkspaceSection.vue` may call `props.state.toggleTeamMember(...)` and `props.actions.onSelectTeamMember(...)`.
- `WorkspaceTransientExecutionRow.vue` may emit `toggle` and `select` through its existing emit API.
- Tests may inspect DOM attributes/classes and mocked action/state calls.

Forbidden:
- Do not mutate `expandedTeamMembers` outside `useWorkspaceHistoryTreeState.ts`.
- Do not call `runHistoryStore.selectTreeRun(...)` directly from `WorkspaceHistoryWorkspaceSection.vue` or `WorkspaceTransientExecutionRow.vue`.
- Do not remove `.stop` from chevron/disclosure clicks.
- Do not add compatibility flags to keep old select-only row-body behavior for disclosure-bearing rows.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `state.toggleTeamMember(workspaceId, teamRunId, memberRouteKey)` | Nested team-member expansion | Toggle expansion state | Explicit workspace id + team run id + member route key | Existing boundary. |
| `actions.onSelectTeamMember(member, workspaceId, memberTree)` | Team member focus/selection | Select/hydrate member target | `TeamMemberFocusTarget` plus workspace id and root member tree | Existing boundary. |
| `WorkspaceTransientExecutionRow` emits `select(row)` | Transient row selection | Request parent selection | Transient display row | Existing event. |
| `WorkspaceTransientExecutionRow` emits `toggle(row)` | Transient row expansion | Request parent expansion toggle | Transient display row | Existing event. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `toggleTeamMember` | Yes | Yes | Low | Reuse. |
| `onSelectTeamMember` | Yes | Yes | Low | Reuse. |
| transient `select` emit | Yes | Yes | Low | Reuse. |
| transient `toggle` emit | Yes | Yes | Low | Reuse. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Stable row activation helper | `activateTeamDisplayRow` or similar | Yes | Low | Use a concrete name that says activation, not generic `handleClick`. |
| Existing `toggleTeamDisplayRow` | Keep | Yes | Low | No change. |
| Existing `selectTeamDisplayRow` | Keep | Yes | Low | No change. |
| Transient row activation helper | `activateRow` | Yes in component scope | Low | Keep local to transient component. |

## Applied Patterns (If Any)

- Presentational component event emitter: `WorkspaceTransientExecutionRow.vue` remains a thin wrapper that emits `toggle`/`select` and does not own state.
- Local activation helper: a small local helper composes expansion and selection operations in the stable row owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | Stable workspace history row owner | Stable nested team row body activation and disclosure stop-propagation | Existing owner of stable member row markup and visible row projection | Store state mutation, run-history hydration internals |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | File | Transient row wrapper | Transient row activation event composition | Existing owner of transient row root events | Direct store/action imports |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | File | Panel interaction test suite | Real panel-level nested team row behavior | Existing nested team fixture and coverage | Overly broad backend setup |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | File | Section component test suite | Focused component-level row activation behavior | Existing direct component tests | Duplicated full panel setup |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/history` | Main-Line Domain-Control for workspace history UI | Yes | Low | Existing folder owns workspace history tree components. |
| `composables/useWorkspaceHistoryTreeState.ts` | State/control off-spine concern serving UI | Yes | Low | No path change. |
| `composables/useWorkspaceHistorySelectionActions.ts` | Selection/hydration control | Yes | Low | No path change. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Stable row body activation | `@click="activateTeamDisplayRow(team, displayRow.row, displayRow.hasChildren)"`; helper toggles only when `hasChildren`, then selects. | Inline duplicate calls in click, Enter, and Space handlers with slightly different ordering. | Keeps pointer and keyboard behavior consistent. |
| Chevron behavior | `@click.stop="state.toggleTeamMember(...)"` remains on disclosure button. | Removing `.stop` so chevron click toggles, bubbles to row, and toggles again. | Prevents double toggle. |
| Transient wrapper | `activateRow()` emits `toggle` only when `props.hasChildren`, then emits `select`. | Importing `useWorkspaceHistoryTreeState` into `WorkspaceTransientExecutionRow.vue`. | Preserves parent-owned state boundary. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep row body select-only and add a larger invisible chevron hit area | Could reduce precision without changing row semantics | Rejected | User explicitly expects row click to expand/collapse; implement row-body activation. |
| Add a feature flag or setting for old row-click behavior | Could preserve old behavior | Rejected | Scope is a direct UX improvement; no dual behavior. |
| Let chevron click bubble and rely on row handler | Simpler-looking template | Rejected | Would double-toggle or select unintentionally. Keep stopped chevron handler. |

## Derived Layering (If Useful)

- UI layer: `WorkspaceHistoryWorkspaceSection.vue` / `WorkspaceTransientExecutionRow.vue` compose events.
- UI state layer: `useWorkspaceHistoryTreeState.ts` owns expansion.
- Selection/hydration layer: `useWorkspaceHistorySelectionActions.ts` and `runHistoryStore` own focus/open behavior.

This layering follows ownership; UI components do not bypass state or selection boundaries.

## Migration / Refactor Sequence

1. In `WorkspaceHistoryWorkspaceSection.vue`, add a local stable row activation helper that accepts `(team, row, hasChildren)`.
   - If `hasChildren`, call `toggleTeamDisplayRow(team, row)`.
   - Always call `selectTeamDisplayRow(team, row)` to preserve focus/selection.
2. Replace stable row body `@click`, `@keydown.enter`, and `@keydown.space.prevent` handlers with the helper.
3. Keep the stable disclosure button click stopped and toggle-only.
4. In `WorkspaceTransientExecutionRow.vue`, add a local `activateRow()` helper.
   - If `props.hasChildren`, emit `toggle` with `props.row`.
   - Always emit `select` with `props.row`.
   - Wire click/Enter/Space on the root row to this helper.
5. Keep transient disclosure button click stopped and toggle-only.
6. Update/add targeted tests:
   - Stable nested team row body expands, collapses, and selects.
   - Stable chevron toggles without selection and does not double toggle.
   - Stable leaf row remains select-only.
   - Transient task-team row body toggles and selects; transient chevron remains toggle-only.
7. Run focused frontend tests before implementation handoff:
   - `pnpm -C autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`

## Key Tradeoffs

- Row body click now collapses an expanded nested team row even if the user only intended to select it. This is accepted because the requested behavior explicitly treats row click as expand/collapse for nested teams.
- Implementing a full child row component extraction would improve file size but is unnecessary for this small behavior change and would add review risk.

## Risks

- Double toggle if `.stop` is accidentally removed from chevron/disclosure controls.
- Selection regression if row body activation toggles but fails to call `selectTeamDisplayRow(...)`.
- Transient task-team inconsistency if stable rows are updated but transient rows keep select-only row-body behavior.

## Guidance For Implementation

- Keep the code change small and local.
- Prefer one helper per component instead of duplicating click/keyboard logic.
- Toggle before or alongside selection; do not await selection before showing expansion because row expansion should feel immediate and selection action already catches errors.
- Do not change store contracts unless a type error requires a local type adjustment; the known interfaces already expose required operations.
- Validate with focused component tests; broad backend/API tests are not expected for this UI-only change.
