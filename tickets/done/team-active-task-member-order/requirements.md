# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

In the Team tab's Tasks section, task-team member focus rows are currently rendered after the task description. When the task description is long, users must scroll to the bottom of the detail pane before discovering additional focusable task-team members. The UI should remain clean and professional: do not add explanatory labels, helper text, or new visual concepts. Reorder the existing controls so task-team member focus rows appear near the beginning of the selected task detail.

## Investigation Findings

- `TeamActiveTasksSection.vue` renders selected task details in this order: header/status/primary Focus, waiting notice, `MarkdownRenderer` task body, task-team member focus rows, technical details.
- The member focus rows already have sufficient styling to communicate they are clickable/focusable; the issue is placement, not missing explanation.
- The waiting notice appears when `isWaitingStatus(selectedEntry.statusLabel)` matches `/waiting|approval|input|action/i`, for example `Awaiting review`.
- Existing tests already cover that member rows are focus controls and emit `select-member`; coverage should be updated to assert ordering/visibility before body content.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broader design issue
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: The current component already owns the active task detail layout and member focus rows; the requested behavior is a local template order change.
- Requirement or scope impact: Keep existing controls and behavior; only move task-team member rows above long task description content.

## Recommendations

Move existing task-team member focus rows above the task description inside the selected task detail pane, directly after the header/waiting notice area. Do not add a heading such as "Focus targets" and do not add new explanatory text.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: User opens a task-team task with a long description and can immediately see available member focus rows near the top of the task detail.
- UC-002: User clicks an existing member focus row and the same `select-member` event behavior occurs as before.
- UC-003: User opens a task-agent task and sees no task-team member rows, preserving existing task-agent behavior.

## Out of Scope

- New labels, text, tooltips, counters, or section headings for focus targets.
- Changes to task selection, focus routing, activity state, task status semantics, or message sending.
- Sticky headers or additional responsive layout redesign.
- Backend/API changes.

## Functional Requirements

- REQ-001: In `TeamActiveTasksSection`, when the selected task is a task team with members, render the existing member focus rows before the task description markdown.
- REQ-002: Preserve the existing member focus row visual style and focus behavior.
- REQ-003: Preserve the selected task header, status chip, primary Focus button, waiting notice, task description rendering, reference preview behavior, and technical details behavior.
- REQ-004: Do not introduce additional visible copy for member focus rows.

## Acceptance Criteria

- AC-001: For a selected task-team entry with members, DOM/render order places `[data-test="active-task-member-row"]` before `[data-test="active-task-task-body"]`.
- AC-002: Clicking `[data-test="active-task-member-row"]` still emits `select-member` with that member's route key.
- AC-003: For selected task-agent entries, no member focus rows render.
- AC-004: The UI does not render new focus-target labels or explanatory text.
- AC-005: Existing task reference preview and primary Focus button behavior remain unchanged.

## Constraints / Dependencies

- Vue/Nuxt frontend in `autobyteus-web`.
- Existing tests use Vue Test Utils selectors in `components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` and `TeamFocusSendWorkflow.spec.ts`.

## Assumptions

- The desired product behavior is exactly a reorder of current UI elements, not a new member summary or sticky action bar.
- Existing row styling is considered sufficient to communicate clickability.

## Risks / Open Questions

- Very large member lists could push the description lower; this is acceptable for this change because member discovery is the priority and no new UI concept is requested.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001
- REQ-002 -> UC-002
- REQ-003 -> UC-003
- REQ-004 -> UC-001, UC-002

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the main layout order change.
- AC-002 validates no focus behavior regression.
- AC-003 validates task-agent behavior remains clean.
- AC-004 validates the professional/no-redundant-text constraint.
- AC-005 validates surrounding task detail behavior remains intact.

## Approval Status

Approved by user in chat on 2026-06-29: "lets do the change" and clarified that "only the order has changed."
