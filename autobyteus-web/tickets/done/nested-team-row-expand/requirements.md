# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Users currently need to target the small chevron on a nested agent-team row in the left Workspaces/Teams tree to reveal that team's members. That makes a common action unnecessarily precise. Clicking the nested team row itself should toggle expansion/collapse, while the chevron remains visible as the expand-state indicator and continues to work as an explicit toggle target.

## Investigation Findings
- The user-provided screenshot shows a nested team member row such as `StudentStudyGroup` with a chevron, status dot, avatar, label, `TEAM` badge, and child members (`student_one`, `student_two`).
- The affected UI is the workspace history tree under `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`.
- Stable nested member rows currently use row body activation for selection/focus only: `@click="selectTeamDisplayRow(team, displayRow.row)"`.
- Stable nested team rows with children expose a separate disclosure button (`data-test="workspace-team-member-disclosure"`) whose click stops propagation and calls `state.toggleTeamMember(...)`.
- Expansion state is already owned by `useWorkspaceHistoryTreeState.ts` through `isTeamMemberExpanded(...)` and `toggleTeamMember(...)`; no new store or data model is needed.
- Transient task-team rows use `WorkspaceTransientExecutionRow.vue`, which already receives `hasChildren`/`expanded` and emits separate `select` and `toggle` events. Its row activation is currently select-only while its chevron is toggle-only.
- Existing tests already assert the current split behavior for nested rows and disclosure controls in `WorkspaceAgentRunsTreePanel.spec.ts` and `WorkspaceHistoryWorkspaceSection.spec.ts`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: The correct UI row owner already has access to row identity, child/disclosure state, selection action, and tree-state toggle. The existing expansion store boundary remains correct.
- Requirement or scope impact: Implement as a localized activation-policy change in the workspace history tree components, with test updates for row-body toggle and no double-toggle on chevron click.

## Recommendations
- Add a single activation helper for workspace team display rows that preserves selection/focus and, only when `hasChildren` is true, also toggles the row's expansion state.
- Keep chevron/disclosure clicks as `stop`ped toggle-only interactions so they continue to toggle exactly once and do not also trigger row selection.
- Apply the same row-activation policy to transient task-team rows that expose children, because they share the same row/disclosure affordance in the same tree.
- Cover both stable nested team rows and chevron propagation behavior with focused component tests.

## Scope Classification (`Small`/`Medium`/`Large`)
Small

## In-Scope Use Cases
- UC-001: A user clicks a collapsed nested agent-team row's main body and its children become visible.
- UC-002: A user clicks an expanded nested agent-team row's main body and its children become hidden.
- UC-003: A user clicks the chevron on a nested agent-team row and receives the same toggle-only behavior as before.
- UC-004: A user clicks a nested agent-team row body and the existing select/focus behavior for that row remains intact.
- UC-005: A user activates a nested team row through keyboard Enter/Space and receives the same row activation semantics as click.
- UC-006: A transient task-team disclosure row, if present in the workspace history tree, follows the same row-body toggle affordance when it has children.

## Out of Scope
- Backend APIs, persistence, or team metadata model changes.
- Redesigning the sidebar tree layout, icons, badges, status dots, timestamps, or row hierarchy.
- Changing top-level workspace, agent-definition, team-definition, or team-run group expansion policy.
- Changing unrelated Activity, Files, Team, Terminal, Token, or center-panel behavior.
- Adding new context menus or hover actions to nested team rows.

## Functional Requirements
- FR-001: A stable nested agent-team member row with children must toggle its expanded/collapsed state when the user clicks the row's main body.
- FR-002: A stable nested agent-team member row with children must retain existing select/focus behavior when its row body is clicked.
- FR-003: The nested team row chevron must remain visible and must continue to indicate the current expanded/collapsed state.
- FR-004: Clicking the nested team row chevron must toggle expansion exactly once and must not also invoke the row-body select/focus handler.
- FR-005: Stable nested member rows without children must remain select-only and must not gain expansion behavior.
- FR-006: Keyboard activation of a stable nested team row with children through Enter or Space must match click activation.
- FR-007: Transient task-team rows with children in the same workspace history tree must use the same row-body toggle-plus-select policy; transient rows without children remain select-only.
- FR-008: Existing independent action controls in the tree must continue to stop propagation and must not accidentally toggle nested team expansion.

## Acceptance Criteria
- AC-001: Given a collapsed stable nested agent-team row with hidden children, when the user clicks the row body outside the chevron, then the row becomes selected/focused and its children become visible.
- AC-002: Given an expanded stable nested agent-team row with visible children, when the user clicks the row body outside the chevron, then the row remains/selects as the focused target and its children become hidden.
- AC-003: Given a stable nested agent-team row, when the user clicks its chevron, then expansion state toggles exactly once, the chevron visual state updates, and member selection/focus is not invoked from that chevron click.
- AC-004: Given a stable nested agent/leaf row without children, when the user clicks the row body, then existing select/focus behavior runs and expansion state is unchanged.
- AC-005: Given a stable nested agent-team row with children, when the user presses Enter or Space while the row has focus, then row-body activation toggles expansion and preserves selection/focus behavior.
- AC-006: Given a transient task-team row with children, when the user clicks the row body, then it emits/selects the transient row and toggles its child visibility; clicking its chevron remains toggle-only.
- AC-007: Given any separate row action control in the workspace history tree, when the user clicks that action, then the action's existing behavior is preserved and nested team expansion does not change accidentally.

## Constraints / Dependencies
- Must be implemented within the existing `autobyteus-web` workspace history tree boundaries.
- Must reuse `useWorkspaceHistoryTreeState` for expansion state; do not introduce a parallel expansion store.
- Must avoid nested handlers that cause double toggling when the chevron is clicked.
- Must preserve existing team member selection/hydration behavior routed through `actions.onSelectTeamMember(...)`.

## Assumptions
- “Nested agent team row” refers to agent-team member rows inside an expanded team run, such as the `StudentStudyGroup` row in the screenshot.
- Row body means the clickable row surface excluding explicit child action controls such as the chevron/disclosure button.
- The intended row-body behavior is toggle-plus-select/focus for rows that have children, not toggle-only.

## Risks / Open Questions
- Low risk: combining toggle and selection could surprise users who want selection without collapsing. The user request explicitly prefers row click to open/collapse, so this is accepted for rows with children.
- Low risk: transient task-team rows are less visible in the screenshot, but they share the same disclosure affordance; aligning them avoids inconsistent row behavior.

## Requirement-To-Use-Case Coverage
- FR-001 covers UC-001 and UC-002.
- FR-002 covers UC-004.
- FR-003 covers UC-003.
- FR-004 covers UC-003 and propagation safety.
- FR-005 covers non-team/leaf row preservation.
- FR-006 covers UC-005.
- FR-007 covers UC-006.
- FR-008 covers action-control safety across UC-001 through UC-006.

## Acceptance-Criteria-To-Scenario Intent
- AC-001 verifies row-body expand plus selection.
- AC-002 verifies row-body collapse plus selection.
- AC-003 verifies chevron behavior and no double toggle/selection propagation.
- AC-004 verifies leaf member rows remain unchanged.
- AC-005 verifies keyboard parity for row activation.
- AC-006 verifies transient task-team row consistency.
- AC-007 verifies child/action-control propagation safety.

## Approval Status
Design-ready based on the user's explicit requested behavior and no blocking open questions.
