# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Improve the frontend Token tab's team token usage comparison so it remains clear at narrow panel widths. The current responsive card/stacked layout becomes difficult to scan, especially around the cost/last-column details. The target behavior is a stable table-style column layout with member names in the first column, Gross Input / Output / Total Tokens in the middle, Cost in the last column, and horizontal scrolling when the available width is too small.

## Investigation Findings

- The affected UI is the team workspace Token tab, mounted through `autobyteus-web/components/layout/RightSideTabs.vue` as `TokenUsageMeterPanel` when the active right-side tab is `usage`.
- `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` is presentation-only and delegates the team comparison region to `TeamTokenUsageSummary` with `rows`, `teamTotalSummary`, loading, and error props from `useTokenUsageWorkspaceScope`.
- `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` is the data boundary for the Token tab. It owns resolving focused team member summary, team member rows, and team total summary. This change does not require store, API, GraphQL, or accounting changes.
- `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` owns the problematic presentation. Its current CSS hides `.team-token-header` by default, lays rows out as a 3-column/card-like grid with visible per-cell labels, stretches the cost cell full width, and switches to table-like columns only inside `@container (min-width: 46rem)`.
- User screenshots match the code path: narrow containers show stacked member/card rows; wide containers show the desired table header and column alignment.
- Project docs currently describe `TeamTokenUsageSummary.vue` as a compact table/list and mention previous proof for rows without horizontal overflow. That documentation should be revised later to reflect the new intentional scoped horizontal overflow.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broad design issue found.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed at architecture level; local markup/CSS replacement inside the existing presentation owner is expected.
- Evidence basis: `TeamTokenUsageSummary.vue` already owns team comparison presentation and contains the responsive collapse. `useTokenUsageWorkspaceScope.ts` and `TokenUsageMeterPanel.vue` boundaries remain appropriate and should not be expanded.
- Requirement or scope impact: Requirements are presentation-only. Token/cost summaries, formatter semantics, and hydration flow must remain unchanged.

## Recommendations

- Make `TeamTokenUsageSummary.vue` render one authoritative table layout at all widths.
- Replace the narrow stacked/card behavior with a horizontally scrollable table region whose inner table has a minimum width sufficient for all five columns.
- Prefer semantic table markup (`table`, `thead`, `tbody`, `tr`, `th`, `td`) for clearer data-table semantics and simpler column ownership.
- Keep horizontal overflow scoped to the Team comparison table wrapper rather than the whole Token tab.
- Keep focused-row highlighting, team total final row, loading/error/no-usage states, and cost/status formatting.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-small.

Rationale: The change should remain inside one presentation component plus colocated frontend tests. It may require durable documentation updates later because current docs describe the old compact/no-horizontal-overflow behavior.

## In-Scope Use Cases

- UC-001: User opens the Token tab in a wide right-side panel and compares per-member token/cost values in a table.
- UC-002: User narrows the Token tab/right-side panel and can still compare per-member token/cost values by horizontally scrolling the table.
- UC-003: User identifies the focused member row in both wide and narrow layouts.
- UC-004: User sees complete cost information without unclear responsive card wrapping.
- UC-005: User sees loading, unavailable, no-usage, missing-price, local/no-bill, mixed, and zero-usage states without breaking the table layout.

## Out of Scope

- Changing token accounting, API price estimation, model price lookup, or backend summary queries.
- Changing `useTokenUsageWorkspaceScope.ts`, token usage stores, GraphQL APIs, or server event ingestion unless implementation discovers a direct presentation blocker.
- Redesigning the entire Token tab navigation, right-side tab shell, primary focused-run cards, input breakdown, or pricing details sections.
- Adding sticky columns, sorting, resizing, column hiding, row virtualization, or interactive focus-on-row-click behavior.
- Redesigning mobile-native navigation beyond ensuring the existing web/electron Token tab table remains readable through horizontal scrolling.

## Functional Requirements

- REQ-001: The Team section of the Token tab must render member usage as a consistent table-style column layout with Member as the first column and Cost as the last column.
- REQ-002: The table must include columns for Gross Input, Output, Total Tokens, and Cost, preserving existing value and formatting semantics.
- REQ-003: At narrow widths, the Team section must not collapse member rows into stacked per-member cards; it must keep the table layout and provide horizontal scrolling.
- REQ-004: Horizontal scrolling must be contained to the Team table region so the rest of the Token tab layout remains vertically scrollable and usable.
- REQ-005: Focused/current member highlighting must remain visible and understandable in the table layout.
- REQ-006: The Team total row, when `teamTotalSummary` is present, must remain the final table row and align with the same columns.
- REQ-007: Rows without a summary must preserve the existing loading/unavailable/no-usage messaging within the table layout.
- REQ-008: The implementation must preserve existing token and cost data inputs, calculations, formatting helpers, status labels, and missing-price/local/mixed states.
- REQ-009: Table markup or equivalent structure must keep column labels available at narrow widths so users do not have to infer what the values mean after scrolling.

## Acceptance Criteria

- AC-001: In a wide Token tab, the Team section presents a table with headers Member, Gross Input, Output, Total Tokens, and Cost.
- AC-002: In a narrow Token tab, the Team section still presents the same table headers and columns rather than stacked cards.
- AC-003: In a narrow Token tab where all columns cannot fit, a horizontal scrollbar/overflow path is available at the Team table region, and users can scroll to see the Cost column.
- AC-004: The Cost column remains the last column, and its main cost plus input/output cost detail text remains associated with the correct member row.
- AC-005: The focused member row remains visually distinguished without obscuring row values or column alignment.
- AC-006: Existing missing-price, partial-estimate, local/no-bill, mixed-currency/provider, zero-usage, loading, unavailable, and no-usage states still render without breaking row height or horizontal scroll.
- AC-007: Token/cost numeric values for each member and Team total match the pre-change source data; the change is presentational only.
- AC-008: Component coverage verifies the table headers, row attributes/focused state, final Team total row, and presence of the scoped horizontal-scroll table wrapper.
- AC-009: No new backend/API calls or summary calculations are introduced for this layout change.

## Constraints / Dependencies

- Must work in the existing Vue/Nuxt frontend and scoped CSS setup.
- Must preserve the existing right-pane shell, Token tab data flow, and formatting helper contracts.
- Must avoid backend/API changes unless implementation discovers the current UI cannot get required data from existing props/state.
- Must preserve accessibility basics for tabular data: headers, row/column association, and keyboard/trackpad access to the horizontally scrollable region.
- Must respect existing Token tab vertical scrolling; horizontal overflow should not escape to the whole app shell.

## Assumptions

- The screenshots represent the active `TeamTokenUsageSummary.vue` implementation in `autobyteus-web`.
- The current wide table layout is the desired mental model and should become authoritative across widths.
- A scoped table minimum width around the current wide breakpoint is acceptable because the user prefers horizontal scrolling over card collapse.
- Existing test infrastructure can validate structure, but precise scrollbar visual behavior may need manual or browser/e2e evidence downstream.

## Risks / Open Questions

- OQ-001: Exact minimum table width/column widths may need minor visual tuning during implementation to balance readable costs against excessive horizontal scrolling.
- OQ-002: JSDOM component tests cannot fully prove real scrollbar rendering; downstream API/E2E/visual validation should inspect a constrained-width Token tab.
- OQ-003: Existing tests currently assert row text contains metric labels; those expectations may need to be updated if semantic table headers replace per-row labels.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases Covered |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002, UC-004, UC-005 |
| REQ-003 | UC-002, UC-004 |
| REQ-004 | UC-002 |
| REQ-005 | UC-003 |
| REQ-006 | UC-001, UC-002 |
| REQ-007 | UC-005 |
| REQ-008 | UC-001, UC-002, UC-004, UC-005 |
| REQ-009 | UC-001, UC-002, UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Wide panel maintains the already-clear comparison layout. |
| AC-002 | Narrow panel no longer switches to unclear stacked cards. |
| AC-003 | User can reach the rightmost Cost column through scoped horizontal scrolling. |
| AC-004 | Cost details remain tied to each member row. |
| AC-005 | Focused row affordance remains intact after table layout change. |
| AC-006 | Non-happy-path price/usage states are still readable in table form. |
| AC-007 | Downstream validation can distinguish presentation change from accounting changes. |
| AC-008 | Component tests guard the new structure despite limited layout measurement in JSDOM. |
| AC-009 | The implementation does not create accidental data-flow or backend scope expansion. |

## Approval Status

Design-ready based on the user's explicit requested direction: keep the Team token usage comparison as a column/table layout and use horizontal scrolling when width is too small. No blocking user clarification remains.
