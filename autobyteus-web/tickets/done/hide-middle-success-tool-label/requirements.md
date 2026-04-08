# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Reduce clutter in the center agent event monitor by removing textual status labels from inline tool cards so the row width is used for the tool context itself (especially command/path text), while preserving status readability through icon/color styling and leaving the right-side Activity panel unchanged.

## Investigation Findings
- The center inline tool-card renderer is owned by `autobyteus-web/components/conversation/ToolCallIndicator.vue`.
- `ToolCallIndicator.vue` currently renders a textual status label for non-awaiting rows through `{{ statusLabel }}` and uses the same compact row width for tool name, context text, and status text.
- The center renderer is shared by all tool-bearing conversation segment wrappers: generic tool call, write file, edit file, and terminal command. One change there affects the whole middle inline tool-card surface.
- The user’s screenshot shows the practical UX failure clearly: the row spends scarce width on textual status (`SUCCESS`, `FAILED`) instead of the command/context string the user is trying to read.
- `ToolCallIndicator.vue` already has non-text status affordances: icons, status-tinted colors, borders, and error row treatment.
- The right-side Activity panel is owned separately by `autobyteus-web/components/progress/ActivityItem.vue`, which renders its own status chip and short debug hash/id. This is not coupled to the center inline status text.
- There is no dedicated regression test for `ToolCallIndicator.vue`, so the desired middle-row behavior is currently easy to regress silently.

## Recommendations
- Remove textual status labels from the center inline tool-card header for all terminal/non-approval states, not only `success`.
- Preserve center-row status recognition through existing iconography, status color, border styling, and existing error-message row treatment.
- Keep the right-side Activity panel unchanged.
- Add focused component regression coverage proving the center row no longer renders textual status labels while preserving click-to-Activity behavior and visual-state hooks.

## Scope Classification (`Small`/`Medium`/`Large`)
Small

## In-Scope Use Cases
- UC-001: A successful inline tool card in the center monitor shows more command/path/context because no textual status label consumes row width.
- UC-002: A failed inline tool card in the center monitor shows more command/path/context because no textual status label consumes row width.
- UC-003: A running or approved inline tool card in the center monitor does not show textual status, but still remains understandable through icon/color styling.
- UC-004: Clicking a center inline tool card still navigates to the matching right-side Activity item.

## Out of Scope
- Changing right-side Activity panel status chips.
- Removing, relocating, or restyling the right-side debug hash / invocation id.
- Renaming tools or changing human-readable tool labels.
- Broad redesign of inline tool-card layout beyond removing textual status labels and preserving current status affordances.
- Changing activity-feed scrolling or cross-pane navigation behavior beyond preserving today’s behavior.
- Reworking current command/path truncation policy beyond reclaiming the width currently taken by textual status.

## Functional Requirements
- `REQ-001`: The center inline tool-card component must not render textual status labels in its header row for completed, running, approved, denied, or failed states.
- `REQ-002`: The center inline tool-card component must continue to communicate state through existing non-text affordances appropriate to each state, including iconography, color treatment, border treatment, disabled styling, and any existing inline error row.
- `REQ-003`: The center inline tool-card component must continue rendering explicit action buttons for approval-required rows, and this task must not remove or weaken approval affordances.
- `REQ-004`: The change must apply consistently to every center-monitor tool-bearing conversation segment that reuses `ToolCallIndicator.vue`.
- `REQ-005`: The right-side Activity panel presentation, including its textual status chip and short debug hash/id visibility, must remain unchanged.
- `REQ-006`: The center inline tool-card must remain navigable to the matching Activity item after this text-removal change.
- `REQ-007`: Automated regression coverage must verify that the center inline tool-card does not render textual status labels while preserving at least one adjacent non-text state signal and the right-panel non-change boundary.

## Acceptance Criteria
- `AC-001`: Given a center inline tool card in `success` state, the rendered header row shows no textual `success` label.
- `AC-002`: Given a center inline tool card in `error` state, the rendered header row shows no textual `failed` label, while any existing error details row remains available.
- `AC-003`: Given a center inline tool card in `executing`, `approved`, or `denied` state, the rendered header row shows no textual status label.
- `AC-004`: Given a center inline tool card in any non-awaiting state, the rendered card still shows its existing status icon and state styling so the state remains visually understandable.
- `AC-005`: Given a center inline tool card with command/path context available, the row uses the recovered width for tool/context content subject to the existing truncation rules.
- `AC-006`: Given a user click on a center inline tool card after this change, the card still switches the right pane to `progress` and highlights the matching Activity item.
- `AC-007`: Given the same run in the right-side Activity panel, the Activity item still shows its current textual status chip and short debug hash/id.
- `AC-008`: Automated tests cover the center status-text removal behavior and at least one unchanged adjacent behavior.

## Constraints / Dependencies
- The affected behavior is implemented in `autobyteus-web/components/conversation/ToolCallIndicator.vue`.
- Tool-bearing conversation wrappers (`ToolCallSegment`, `WriteFileCommandSegment`, `EditFileCommandSegment`, `TerminalCommandSegment`) share that component, so the change must be safe across all of them.
- The right-side Activity panel is rendered separately by `autobyteus-web/components/progress/ActivityItem.vue`; the implementation should avoid introducing changes there.

## Assumptions
- Existing status icons, tinting, borders, and error-row treatment are sufficient for state recognition in the center row without additional status text.
- The user wants the center row to prioritize readable command/path/context over inline textual state.
- Existing truncation behavior for tool context is acceptable for this task; the requirement is to stop wasting width on textual status labels rather than to redesign truncation itself.

## Risks / Open Questions
- Without a dedicated component test, this UI cleanup could regress silently in later refactors.
- Some states may feel lighter without text, so implementation should preserve the current visual-state differentiation instead of accidentally flattening all rows into the same appearance.

## Requirement-To-Use-Case Coverage
- `REQ-001` -> `UC-001`, `UC-002`, `UC-003`
- `REQ-002` -> `UC-001`, `UC-002`, `UC-003`
- `REQ-003` -> `UC-004`
- `REQ-004` -> `UC-001`, `UC-002`, `UC-003`
- `REQ-005` -> `UC-004`
- `REQ-006` -> `UC-004`
- `REQ-007` -> `UC-001`, `UC-002`, `UC-003`, `UC-004`

## Acceptance-Criteria-To-Scenario Intent
- `AC-001` verifies the user’s original complaint for successful rows.
- `AC-002` verifies the broadened screenshot-driven requirement that failed rows should also stop spending width on textual status.
- `AC-003` verifies the clarified requirement that the center row should not show textual status at all.
- `AC-004` protects usability by proving the center row still visually communicates state.
- `AC-005` verifies the intended benefit: more room for the information the user actually wants to read.
- `AC-006` protects the existing center-to-Activity navigation flow.
- `AC-007` protects the user-requested non-change scope for the right-side Activity panel.
- `AC-008` ensures the change is durably enforced by automated regression coverage.

## Approval Status
Pending user review.
