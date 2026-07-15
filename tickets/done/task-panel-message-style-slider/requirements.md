# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Improve the frontend Team tab task detail experience so tasks behave like messages in the right Team panel:

1. The Tasks section must have the same user-adjustable vertical list/detail divider pattern that Messages already has.
2. Opening a task reference file must directly show the file content without a redundant task-specific `Back to task` button. Users should return to task content by clicking the task row again, matching message reference-file behavior.

## Investigation Findings

- The current message UI is owned by `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue`. It already renders a master/detail split with:
  - `data-test="team-communication-split"`
  - a left list whose width is controlled by `leftPaneWidth`
  - a draggable `data-test="team-communication-resize-handle"` separator
  - selected reference files shown directly in the right pane through `TeamCommunicationReferenceViewer`, with no back button.
- The current task UI is owned by `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue`. It renders a task master/detail split, but the left navigator has a hard-coded width (`w-[15.5rem]`) and no resize handle.
- Task reference preview is currently routed through `TeamActiveTasksSection.vue -> TeamTaskReferenceViewer.vue -> TeamReferenceFileViewer.vue` and explicitly passes a localized `back_to_task` label plus a `back` event handler. That is the redundant control shown in the user screenshot.
- `TeamReferenceFileViewer.vue` only exposes the back-button API for the current task wrapper. No other active code path uses its `backLabel` prop or `back` event, so the task-back affordance can be removed cleanly rather than hidden behind compatibility behavior.
- Adding a task resize implementation by copying the message resize block would duplicate UI drag policy. A small shared composable should own horizontal split-pane resizing and be used by both message and task panels.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI consistency improvement
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `TeamCommunicationPanel.vue` owns local split-resize logic; `TeamActiveTasksSection.vue` needs identical behavior; copying it would create two owners for the same drag/clamp policy. Task file preview back behavior is an obsolete task-specific navigation path implemented through `TeamTaskReferenceViewer.vue` and `TeamReferenceFileViewer.vue`.
- Requirement or scope impact: The in-scope implementation should extract/reuse horizontal split resize behavior and remove task-back preview API paths cleanly.

## Recommendations

- Extract the existing Team message horizontal split-resize logic into a small shared composable, then use it from both `TeamCommunicationPanel.vue` and `TeamActiveTasksSection.vue`.
- Add the task resize handle between the task navigator and detail pane using the same visual/ARIA pattern as messages.
- Remove the task reference back-button path from `TeamActiveTasksSection.vue`, `TeamTaskReferenceViewer.vue`, and `TeamReferenceFileViewer.vue`; remove now-unused `back_to_task` localization entries and stale test expectations.
- Update component tests to assert task resizing, direct reference display without back navigation, and return-to-task by clicking the task row.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User opens Team tab, expands Tasks, selects a task, and resizes the task list/detail split horizontally with the same interaction style as the Messages split.
- UC-002: User clicks a task reference file and sees the file content directly in the right detail/preview pane.
- UC-003: User returns from file preview to task content by selecting/clicking the task item again, with no task-specific `Back to task` button.
- UC-004: User continues using existing message split/reference behavior without regression.

## Out of Scope

- Redesigning the overall Team tab section expansion/collapse behavior.
- Changing task creation, delegation, execution, completion, or server APIs.
- Changing task data extraction from team member nodes.
- Unifying all task and message reference-file data models or presentation utilities across the whole frontend. Existing duplication there is noted but not required for this UI fix.
- Mobile Team Messages/Tasks UX changes.

## Functional Requirements

- REQ-001: The task section must provide a vertical draggable divider between the task navigator and task detail pane, equivalent in interaction and styling to the Messages divider.
- REQ-002: The task navigator width must be controlled by component state/composable state rather than a fixed Tailwind width class.
- REQ-003: Task resizing must clamp the navigator width to usable minimum and maximum widths so the list and detail panes remain usable.
- REQ-004: The message section must retain its current resize behavior after resize logic is extracted or reused.
- REQ-005: Selecting a task must show that task's content in the detail pane and clear any selected task reference preview.
- REQ-006: Selecting a task reference file must show the file content directly in the detail pane.
- REQ-007: The task file-preview UI must not render `Back to task` or any equivalent task-specific return button/control.
- REQ-008: The user must be able to return from a task reference-file preview to task content by selecting/clicking the task row again.
- REQ-009: Existing task `Focus` action behavior and task-team member focus rows must remain unchanged when viewing task detail.
- REQ-010: Obsolete task-back localization/test expectations introduced solely for the removed task-back control must be removed.

## Acceptance Criteria

- AC-001: In the Team tab Tasks section, a `role="separator"` vertical resize handle exists between the task navigator and detail pane.
- AC-002: Dragging the task resize handle increases/decreases the task navigator width and clamps at the designed bounds.
- AC-003: Existing message resize tests still pass and message UI remains functionally unchanged.
- AC-004: After clicking a task reference file, the right pane displays the reference viewer and does not show `Back to task` or `data-test="team-reference-viewer-back"`.
- AC-005: After viewing a task reference file, clicking the corresponding task row displays the task body again.
- AC-006: Existing task focus actions still emit the same `select-member` events from task detail/member controls.
- AC-007: Unit/component tests cover the new task resize behavior and revised reference-preview return path.
- AC-008: No `back_to_task` localization key remains referenced by production code.

## Constraints / Dependencies

- Must follow existing Vue/Nuxt, Pinia, Tailwind, and component-test patterns in `autobyteus-web`.
- Must preserve existing server reference content routes:
  - task references: `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`
  - message references: `/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`
- Must avoid compatibility-only dual UI flows for the removed back button.
- Must keep changes bounded to desktop Team tab task/message split and task reference preview code.

## Assumptions

- The requested "slider" is the vertical divider/resizer between list and detail/preview panes inside the Team tab.
- Message implementation is the UX source of truth for expected task interaction style.
- Screenshots are from the current desktop/web frontend.
- It is acceptable for task and message panels to share a small generic horizontal split-resize composable while keeping their separate domain-specific selection/rendering components.

## Risks / Open Questions

- The exact task initial left-pane width should preserve current readability while using message-like bounds. Suggested implementation keeps the current approximate task width (`248px`) unless product review prefers the message default (`232px`).
- Broader duplication between `TeamReferenceFileViewer.vue` and `TeamCommunicationReferenceViewer.vue` remains a deferred cleanup risk, but it is not required to remove the back button or add the task slider.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-001 |
| REQ-003 | UC-001 |
| REQ-004 | UC-004 |
| REQ-005 | UC-003 |
| REQ-006 | UC-002 |
| REQ-007 | UC-002 |
| REQ-008 | UC-003 |
| REQ-009 | UC-001, UC-003 |
| REQ-010 | UC-002 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Verifies the requested message-like vertical resizing affordance exists for tasks. |
| AC-002 | Verifies task split resizing remains usable. |
| AC-003 | Guards against regressions to existing message behavior while sharing resize policy. |
| AC-004 | Verifies redundant back button removal and direct file display. |
| AC-005 | Verifies the message-like return path via item selection. |
| AC-006 | Guards existing task focus behavior. |
| AC-007 | Ensures durable component coverage is updated. |
| AC-008 | Ensures obsolete localization path is decommissioned. |

## Approval Status

Design-ready from explicit user request and code investigation; ready for architecture review. If the user later prefers a different default task navigator width, that can be adjusted without changing the design shape.
