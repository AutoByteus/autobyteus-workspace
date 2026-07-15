# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined after API/E2E design-impact reroute on 2026-06-29.

## Goal / Problem Statement

Preserve the existing active-task master/detail user interface, but make each task's **left task navigator row** feel more live by inserting the responsible agent or agent team directly under the task summary/short description. The full task content and selected reference file content remain on the right detail pane.

The intended structure is:

```text
Task summary / short description        ← text only; click shows task content on right

● Software Engineering Team             ← no indent; responsible agent/team row; status dot
  ● solution_designer                   ← member row; status dot
  ● architecture_reviewer               ← member row; status dot
  ● implementation_engineer             ← member row; status dot

  References                            ← file names stay on the left
    file-a.md                           ← click opens content/preview on right
    screenshot.png

  Technical details                     ← compact/collapsed metadata on the left
```

Important correction: “left side” means the **left navigator column inside the existing active Tasks/task-detail UI**, not the global workspace/run-history tree. The global Workspaces tree must remain a workspace/run navigation surface and must not contain active-task summary blocks, reference rows, or technical-detail rows.

## Investigation Findings

Code investigation found two different “left” surfaces:

1. Global application left panel / Workspaces tree: `AppLeftPanel.vue` -> `WorkspaceAgentRunsTreePanel.vue` -> `WorkspaceHistoryWorkspaceSection.vue`.
2. Active task master/detail surface inside the Team tab: `TeamOverviewPanel.vue` -> `TeamActiveTasksSection.vue`, which already had a left task navigator and a right detail/reference pane before this task.

The previous design incorrectly chose surface (1). API/E2E browser review showed this produced a cluttered, nested Workspaces tree and duplicated task context across left tree, center focus/composer, and right Team tab. This requirements revision corrects the owner to surface (2): the active task UI remains in `TeamActiveTasksSection`, and only the left navigator row structure changes.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change with design correction after reroute
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed at frontend component boundary level
- Evidence basis: User clarification, API/E2E browser screenshot evidence, code read of global Workspaces tree and existing Team active-task split UI.
- Requirement or scope impact: The target container is now explicit. Downstream must undo active-task embedding in the global Workspaces tree and implement the row-order change inside the active task navigator.

## Recommendations

Implement the user's requested structure by evolving the existing Team active-task navigator, not by moving active task navigation into the global Workspaces tree. The task UI should “pretty much stay”: task summary on the left, detail on the right, reference file names on the left opening content on the right. The only structural additions to the task navigator are the responsible agent/team row, optional member rows, and compact technical details below references.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- A user opens the Team tab and expands or views the active Tasks section.
- A task appears in the left task navigator with summary/short description first.
- Under the summary, the navigator shows the responsible agent or agent team with live status dot.
- For responsible agent teams, member rows appear under the team row with live status dots.
- Reference file names remain in the left navigator under the agent/team context and open content/preview in the right detail pane.
- Technical details move to the left navigator below references as compact/collapsed metadata.
- Clicking task summary/reference rows changes the right detail pane without unexpectedly focusing the center conversation/composer.
- Clicking an explicit agent/team/member row may keep the existing focus behavior for that actor.

## Out of Scope

- Backend runtime status model changes unless existing frontend data is insufficient.
- Redesigning the global Workspaces/run-history tree.
- Moving active-task blocks, reference rows, or technical details into the global Workspaces/run-history tree.
- Redesigning the center conversation/composer panel beyond preventing task-summary/reference clicks from unexpectedly changing focus.
- Removing the Team tab or existing Messages/Tasks section shell unless required by implementation cleanup.

## Functional Requirements

- `REQ-001`: The active task UI must remain a task master/detail interface in the Team tab/task detail surface: left task navigator, right task/reference detail pane.
- `REQ-002`: The active-task context must not be rendered inside the global Workspaces/run-history tree. `WorkspaceAgentRunsTreePanel.vue` and `WorkspaceHistoryWorkspaceSection.vue` should remain workspace/run navigation surfaces, not task-detail surfaces.
- `REQ-003`: Each active task navigator item must render in this exact top-to-bottom order: text-only task summary/short description; responsible agent/team row; optional indented team-member rows; References label and file rows; compact/collapsed Technical details.
- `REQ-004`: The task summary/short-description row must be text only. It must not have an agent/team status dot, avatar, large badge, or team-member indentation.
- `REQ-005`: Clicking the task summary/short-description row must select that task and show its full task content in the right detail pane.
- `REQ-006`: Clicking the task summary/short-description row must not focus the responsible agent/team in the center conversation/composer and must not replace the center panel with a focused subteam card.
- `REQ-007`: The responsible target row must appear immediately under the task summary. It represents either a single agent or an agent team.
- `REQ-008`: The responsible target row must not be indented relative to the task summary content block. It is the root actor/team row for the task.
- `REQ-009`: The responsible target row must use the same tiny left-side circular status-dot visual language as the Workspaces tree, including blue animated running, green idle/ready, gray inactive/offline, amber initializing where applicable, and red error.
- `REQ-010`: If the responsible target is an agent team, its member rows must appear underneath the team row and only member rows are indented.
- `REQ-011`: Team member rows must use the same tiny left-side status-dot visual language as the Workspaces tree and compact avatar/initials treatment where applicable.
- `REQ-012`: Clicking an explicit responsible agent/team/member row may focus or open the same underlying target as existing Team/member focus behavior. This focus behavior belongs only to actor rows, not to task summary rows or reference rows.
- `REQ-013`: Reference file names/rows must remain in the left task navigator under the responsible agent/team/member context.
- `REQ-014`: Clicking a reference file row must open or refresh that reference file content/preview in the right detail pane using the existing reference-preview behavior.
- `REQ-015`: Technical details must move from the right detail body into the left task navigator below reference rows as compact metadata collapsed by default.
- `REQ-016`: The right detail pane must render the selected task body or selected reference preview. It must not duplicate the left-side actor/member roster or left-side technical metadata.
- `REQ-017`: Existing active-task entry projection (`deriveActiveTaskEntries`) should remain the source for task description, responsible target, members, status, references, and technical metadata unless investigation proves it lacks required data.
- `REQ-018`: Status-dot presentation must be shared with or extracted from existing Workspaces tree status logic; do not create a divergent, task-only status color mapping.
- `REQ-019`: Long summaries, names, and file paths must be truncated or line-clamped in the left navigator without breaking the split layout; full content remains available on the right.
- `REQ-020`: The implementation must cleanly remove the prior wrong active-task embedding from the global Workspaces tree rather than leaving both global-tree and task-navigator versions active.

## Acceptance Criteria

- `AC-001`: In the Team tab's active Tasks UI, the left navigator shows each active task summary/short description as the first row, with no status dot on that summary row.
- `AC-002`: For a single-agent delegated task, the row immediately under the task summary is the responsible agent row with a tiny left status dot.
- `AC-003`: For an agent-team delegated task, the row immediately under the task summary is the responsible team row with a tiny left status dot and no extra team-level indentation.
- `AC-004`: For an agent-team delegated task, member rows appear under the team row, are indented, and each has a tiny left status dot.
- `AC-005`: The left navigator order is summary -> responsible agent/team -> members if any -> References -> reference file rows -> Technical details.
- `AC-006`: Clicking the task summary shows the full task content in the right detail pane and does not focus the center composer/subteam card.
- `AC-007`: Clicking a responsible agent/team/member row performs the explicit actor focus/open behavior and does not change the selected reference unless that is already existing focus behavior.
- `AC-008`: Clicking a reference file row opens that reference content/preview in the right detail pane.
- `AC-009`: Technical details are available below references in a collapsed/compact left-side area and are not duplicated in the main right task body.
- `AC-010`: The global Workspaces/run-history tree does not render task summary blocks, active-task reference rows, or active-task technical details.
- `AC-011`: The global Workspaces/run-history tree keeps its normal workspace/run/team/member rows and may continue to use shared status-dot presentation for those rows.
- `AC-012`: Status colors and animation match Workspaces tree semantics: running blue/animated, idle or ready green, initializing amber/animated, error red, offline/inactive gray.
- `AC-013`: Long task descriptions and long file names remain readable/truncated in the left navigator, while the right detail pane shows the full selected task/reference content.
- `AC-014`: Existing active task master/detail behavior remains: selecting tasks/references changes the right detail pane without requiring the user to inspect the global Workspaces tree.
- `AC-015`: Browser smoke against the nested team fixture no longer shows active-task context embedded beneath expanded Workspaces tree runs.

## Constraints / Dependencies

- The target UI container is `TeamActiveTasksSection` or a component directly owned by that active-task section.
- The global Workspaces tree is forbidden as the host for active-task summary/reference/technical-detail rows.
- The right detail pane remains responsible for full task body and reference content/preview.
- Actor/team/member status uses the tiny dot affordance, not large status chips in the compact left navigator.
- The task summary is text-only; dots belong only to responsible agent/team/member rows.
- The responsible team row is not indented; only member rows under a team are indented.
- Reference file names are left-side navigation rows; file content/preview is right-side detail content.
- Technical details are compact/collapsed below references and must not crowd the live actor/member rows.
- Clean-cut correction is required: do not keep the wrong global-tree active-task UI as a compatibility path.

## Assumptions

- The existing active task projection already contains sufficient task, target, member, status, reference, and technical metadata.
- The existing active task split UI from before the wrong design is the closest product container to the user's intended “left/right” structure.
- Existing Team/member focus behavior can be reused for explicit actor rows.

## Risks / Open Questions

- The active-task navigator width must be tested with realistic long task descriptions and file names.
- If the Team tab's existing Messages/Tasks shell collapses Tasks by default, product may later choose a stronger default, but that is separate from the corrected row structure.
- If status semantics differ between task execution status and actor runtime status, actor/member rows should use actor runtime status and the right task detail may separately show task execution status text.

## Requirement-To-Use-Case Coverage

- Existing task master/detail UI preserved: `REQ-001`, `REQ-003`, `REQ-005`, `REQ-013`, `REQ-014`, `REQ-016`
- Prevent wrong global-tree placement: `REQ-002`, `REQ-020`
- Single-agent delegated task context: `REQ-007`, `REQ-008`, `REQ-009`, `REQ-012`
- Agent-team delegated task context: `REQ-007`, `REQ-008`, `REQ-009`, `REQ-010`, `REQ-011`, `REQ-012`
- Reference and technical detail placement: `REQ-013`, `REQ-014`, `REQ-015`
- Center-panel/focus boundary: `REQ-006`, `REQ-012`
- Shared status semantics: `REQ-018`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` through `AC-005`: verify the exact intended left navigator hierarchy.
- `AC-006` through `AC-008`: verify click behavior boundaries for task summary, actor/member rows, and reference rows.
- `AC-009`: verifies technical detail relocation.
- `AC-010` and `AC-011`: verify the global Workspaces tree is no longer the active-task host.
- `AC-012`: verifies status-dot consistency.
- `AC-013`: verifies layout resilience.
- `AC-014`: verifies the existing task master/detail interaction is preserved.
- `AC-015`: verifies the specific rerouted browser mismatch is fixed.

## Approval Status

The user approved the original product direction in chat on 2026-06-29, then rejected the browser implementation and clarified the exact hierarchy on 2026-06-29. This document is the corrected/refined requirements basis for re-design and re-implementation.
