# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Evaluate and refine the proposed frontend UX change: keep the full task/content detail on the right side, but move the compact live agent/team roster context out from the right-side Team/Tasks emphasis and into the left-side task summary area so users immediately see the task, its responsible agent or agent team, team members, and live status in a structure visually consistent with the work tree.

## Investigation Findings

Code investigation found that the left panel already owns workspace/run/team hierarchy (`AppLeftPanel.vue` -> `WorkspaceAgentRunsTreePanel.vue` -> `WorkspaceHistoryWorkspaceSection.vue`). The right Team tab (`RightSideTabs.vue` -> `TeamOverviewPanel.vue`) currently owns Messages plus active task navigation/details via `TeamActiveTasksSection.vue`. Active delegated task data is already projected by `deriveActiveTaskEntries()` with task description, target agent/team, task status, run ids, reference files, and task-team members.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, modest UI ownership/duplication risk
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination / File Placement Or Responsibility Drift risk if implemented by copy-paste
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed at component/presentation-helper level only
- Evidence basis: User-provided UX proposal and screenshot; code read of left work tree, right Team tab, active task entry projection, and status class ownership.
- Requirement or scope impact: Requirements should preserve right-side detail views while adding compact left-side live task context and reusing/extracting shared presentation logic rather than duplicating status/member rows.

## Recommendations

Recommended product direction: keep the task summary/short-description row as the left-side content selector and keep the full content/details on the right. Move only the compact responsible agent/team/member roster with live status under that task summary row. Start with those left-side roster rows as clickable focus/navigation controls while preserving the right-side detail surface.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- Task list/navigation surface keeps each task's short summary/description as the primary left-side row.
- Clicking the task summary/short-description row continues to show the full task/content detail on the right side.
- Under a task summary, show the assigned/active agent or agent team.
- If the task is handled by an agent team, show team members underneath with live status styling consistent with the work tree.
- Preserve intuitive clickability/navigation behavior for agent/team/member rows where applicable.

## Out of Scope

- Backend runtime status model changes unless existing frontend data is insufficient.
- Full redesign of the work tree.
- Removing right-side tabs until product intent is confirmed.

## Functional Requirements

- `REQ-001`: The left-side workspace/task area should keep the task summary or short description as the primary row for each task.
- `REQ-002`: Clicking the task summary/short-description row should activate the right Team/Tasks detail surface when needed and show or keep the full task/content detail on the right side.
- `REQ-003`: Under the task summary, the UI should show the responsible target: either a single agent or an agent team.
- `REQ-004`: If the responsible target is an agent team, the UI should show the team row as the root roster row directly under the task summary with no extra team-level indentation; only the team's member rows should be indented underneath, using work-tree-consistent indentation, a tiny left-side status circle/dot, avatar/initials, and selected/focused styling where applicable.
- `REQ-005`: Clicking target/member rows should focus or open the same underlying agent/team member target as the existing work-tree/member selection behavior.
- `REQ-006`: The right Team/Tasks content should remain available for messages, full task detail, reference file content/preview, and deeper inspection; only compact navigation/context rows are moved/emphasized on the left.
- `REQ-007`: Status color semantics and the tiny circle/dot affordance must be shared or extracted from existing work-tree presentation logic, not duplicated independently.
- `REQ-008`: The task summary/short-description parent row itself should remain text-only for this scope; do not add an agent/team status dot to the task summary row.
- `REQ-009`: Reference file names/rows should remain in the left-side clickable structure, under the responsible agent/team context, while opening the selected reference file content/preview on the right using the existing behavior.
- `REQ-010`: Technical details should move from the right detail pane into the left-side structure as compact metadata below the reference-file list for the task, collapsed by default in the narrow panel.

## Acceptance Criteria

- `AC-001`: When a selected/expanded active team has a delegated task assigned to a single agent, the left side shows the task summary row and one child agent row with that agent's live status.
- `AC-002`: When a selected/expanded active team has a delegated task assigned to an agent team, the left side shows the task summary row, then a non-indented team row directly below it, then indented member rows with live statuses.
- `AC-003`: Clicking the task summary row activates the right Team/Tasks detail surface when needed and shows or keeps the full task/content detail on the right side, instead of leaving it hidden behind Messages or another right tab.
- `AC-004`: The compact left rows use the same visual language as the existing work tree screenshot: a tiny status circle/dot positioned on the left side of each agent/team/member row, compact avatars/initials, truncation, and active/focus highlight; indentation starts at member rows, not at the team root row.
- `AC-005`: Selecting a member from the left compact task context focuses the same conversation target that existing team member selection/focus would focus.
- `AC-006`: The right Team/Tasks surface still renders messages, full task details, and selected reference file content/previews after this change.
- `AC-007`: Long task descriptions do not break the left panel layout; they are truncated/line-clamped with full detail remaining available on the right side.
- `AC-008`: Agent/team/member status color mapping remains consistent with work-tree rows, including animated blue for running and green for idle/ready states.
- `AC-009`: The task summary/short-description row does not render a status dot; dots appear only on the responsible agent/team and member rows.
- `AC-010`: The responsible team row is aligned as the root roster row below the text-only task summary; only its members are indented.
- `AC-011`: Reference file names/rows appear under the left-side responsible agent/team context and selecting a reference row opens or keeps its content/preview on the right.
- `AC-012`: Technical details are available from the left-side structure below reference-file rows as compact/collapsible metadata, without crowding the live agent/team/member rows.

## Constraints / Dependencies

- Must align with existing work tree visual/status conventions.
- Must not duplicate divergent status rendering logic if an existing reusable component/model can be reused.
- Must preserve narrow-left-panel usability through truncation and progressive disclosure.
- Must distinguish task execution status from agent/member runtime status.
- Status should be expressed primarily as the small left-side circular dot from the work-tree UX, not as large badges/chips in the compact left roster.
- The task summary/short-description parent row is text-only and should not receive a runtime status dot.
- The responsible agent/team root row should not be additionally indented under the task summary; only children under a team should be indented.
- Reference file names/rows may appear under the responsible agent/team context on the left, but file content/preview remains on the right.
- Technical details should be compact/collapsible below the reference-file list so they do not crowd the live actor roster.

## Assumptions

- The user wants product/design analysis first, not immediate implementation yet.
- The existing frontend already has task summary, team tab, and work tree status components that can be inspected for reuse.

## Risks / Open Questions

- Whether the existing left-side panel has enough horizontal/vertical space for expanded team member details.
- Whether left-side task rows should be context/focus controls only or should also drive the selected task detail in the right panel.
- Whether task context should appear only for the selected/expanded team run or for all active team runs in an expanded workspace.

## Requirement-To-Use-Case Coverage

- Selected/expanded active team shows task-first context: `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-007`, `REQ-008`
- Single-agent delegated task context: `REQ-002`, `REQ-003`, `REQ-005`, `REQ-007`
- Agent-team delegated task context: `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-007`
- Right-side detail preservation: `REQ-002`, `REQ-006`, `REQ-009`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001`: verifies single-agent active task layout.
- `AC-002`: verifies team-delegated active task layout.
- `AC-003`: verifies task-summary row activates/keeps visible the right-side content detail.
- `AC-004`: verifies styling consistency with work tree.
- `AC-005`: verifies focus/click behavior.
- `AC-006`: verifies right panel is preserved.
- `AC-007`: verifies narrow-panel layout resilience.
- `AC-008`: verifies status color consistency.
- `AC-009`: verifies task summary remains text-only without a status dot.
- `AC-010`: verifies team-root alignment and member-only indentation.
- `AC-011`: verifies reference file names remain clickable on the left while content/preview opens on the right.
- `AC-012`: verifies technical details are available on the left as compact/collapsible metadata.

## Approval Status

Approved by user in chat on 2026-06-29; proceed to design.
