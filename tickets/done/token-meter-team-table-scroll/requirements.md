# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Improve the frontend Token tab's team token usage comparison so it remains clear at narrow panel widths and reads naturally. The earlier approved design kept a separate final `Cost` column. After API/E2E validation, the user refined the desired layout and selected Option B: group each token amount with its corresponding cost inside the same metric column. The target Team table should therefore use logical columns `Member`, `Gross Input`, `Output`, and `Total`, where each metric column shows the token count as the primary value and the matching cost as a subline. Normal rows should not repeat visible `Estimate`/`Complete estimate` wording; the Team section subtitle should explain once that costs are estimated API costs and that Total cost is input cost plus output cost. Horizontal scrolling remains the fallback when the panel is too narrow.

## Investigation Findings

- The affected UI is the team workspace Token tab, mounted through `autobyteus-web/components/layout/RightSideTabs.vue` as `TokenUsageMeterPanel` when the active right-side tab is `usage`.
- `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` is presentation-only and delegates the team comparison region to `TeamTokenUsageSummary` with `rows`, `teamTotalSummary`, loading, and error props from `useTokenUsageWorkspaceScope`.
- `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` is the data boundary for the Token tab. It owns resolving focused team member summary, team member rows, and team total summary. This refined layout does not require store, API, GraphQL, backend, or accounting changes.
- Initial implementation and validation had already replaced the old stacked/card layout with a five-column semantic table: `Member`, `Gross input`, `Output`, `Total tokens`, `Cost`. That implementation is now semantically stale because the user prefers colocated token+cost metric columns.
- The required data already exists on each `TokenUsageRunSummary`: `grossInputTokens` with `estimatedApiInputCost`, `outputTokens` with `estimatedApiOutputCost`, and `totalTokens` with `estimatedApiTotalCost` plus `apiCostStatus`.
- Existing `tokenUsageFormatting` helpers already format token counts, cost values, missing/local/mixed price states, and status labels. The refined layout should reuse those helpers.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broad architecture issue found; this is a design-impact reset of the accepted presentation semantics.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed at architecture level; a local presentation revision inside `TeamTokenUsageSummary.vue` and its tests is expected.
- Evidence basis: The user explicitly selected Option B after seeing/considering the previous five-column design. `TeamTokenUsageSummary.vue` already owns the table presentation, and `useTokenUsageWorkspaceScope.ts` already supplies all summary fields needed for grouped token+cost cells.
- Requirement or scope impact: Replace the separate final `Cost` column with metric columns that pair token amount and corresponding cost. Preserve data inputs, calculations, focus state, team total, statuses, and scoped horizontal scroll.

## Recommendations

- Keep one authoritative semantic table layout at all widths.
- Change Team table headers to `Member`, `Gross Input`, `Output`, and `Total`.
- In each metric column, render a primary token count and a smaller cost subline:
  - `Gross Input`: `grossInputTokens` + `estimatedApiInputCost`.
  - `Output`: `outputTokens` + `estimatedApiOutputCost`.
  - `Total`: `totalTokens` + `estimatedApiTotalCost`, with no normal visible estimate-status word; explain in the Team subtitle that costs are estimated API costs and that Total cost is input cost plus output cost.
- Do not render a separate final `Cost` column or the old `In … · Out …` split inside a cost-only cell.
- Keep the table clean by moving normal estimate wording into the Team subtitle instead of repeating `Estimate`/`Complete estimate` in every row.
- Keep horizontal overflow scoped to the Team comparison table wrapper; recalibrate the minimum width for a four-column grouped table.
- Keep focused-row highlighting, team total final row, loading/error/no-usage states, and existing missing-price/local/mixed/partial price formatting.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-small.

Rationale: This is still a frontend presentation change inside one existing component plus colocated tests and downstream docs/coverage updates. It is a design-impact reset because it changes the accepted UX contract after implementation and API/E2E validation, but it does not expand data ownership or backend scope.

## In-Scope Use Cases

- UC-001: User opens the Token tab in a wide right-side panel and compares per-member token usage with each metric's corresponding cost colocated under that metric.
- UC-002: User narrows the Token tab/right-side panel and can still compare per-member token/cost values by horizontally scrolling the grouped metric table.
- UC-003: User identifies the focused member row in both wide and narrow layouts.
- UC-004: User sees input token usage with input cost, output token usage with output cost, and total token usage with total estimated cost without mentally mapping from a separate Cost column.
- UC-005: User sees loading, unavailable, no-usage, missing-price, partial-estimate, local/no-bill, mixed, and zero-usage states without breaking the grouped table layout.

## Out of Scope

- Changing token accounting, API price estimation, model price lookup, or backend summary queries.
- Changing `useTokenUsageWorkspaceScope.ts`, token usage stores, GraphQL APIs, or server event ingestion unless implementation discovers a direct presentation blocker.
- Redesigning the entire Token tab navigation, right-side tab shell, primary focused-run cards, input breakdown, or pricing details sections.
- Adding sticky columns, sorting, resizing, column hiding, row virtualization, or interactive focus-on-row-click behavior.
- Adding a detailed cache/input cost breakdown inside the Team comparison table. Detailed breakdown remains in the focused primary Token Meter sections.

## Functional Requirements

- REQ-001: The Team section of the Token tab must render member usage as a consistent table-style layout with `Member` as the first column and grouped metric columns for `Gross Input`, `Output`, and `Total`.
- REQ-002: Each grouped metric column must show the token count as the primary value and the corresponding cost as a subordinate value in the same cell.
- REQ-003: The `Gross Input` column must pair `grossInputTokens` with `estimatedApiInputCost`.
- REQ-004: The `Output` column must pair `outputTokens` with `estimatedApiOutputCost`.
- REQ-005: The `Total` column must pair `totalTokens` with `estimatedApiTotalCost`; no normal visible estimate-status word is shown in the row because the Team subtitle explains that costs are estimated.
- REQ-006: At narrow widths, the Team section must not collapse member rows into stacked per-member cards; it must keep the grouped table layout and provide horizontal scrolling inside the Team table region.
- REQ-007: Focused/current member highlighting must remain visible and understandable in the grouped table layout.
- REQ-008: The Team total row, when `teamTotalSummary` is present, must remain the final table row and follow the same grouped metric cell pattern.
- REQ-009: Rows without a summary must preserve the existing loading/unavailable/no-usage messaging within the table layout.
- REQ-010: The implementation must preserve existing token and cost data inputs, calculations, formatting helpers, status labels, and missing-price/local/mixed/partial states.
- REQ-011: The Team table must not render a separate standalone `Cost` column for the in-scope grouped layout.
- REQ-012: The Team section subtitle must explain that displayed costs are estimated API costs and that Total cost is input cost plus output cost.
- REQ-013: Normal estimated rows must not show visible `Estimate` or `Complete estimate` status copy in the metric cells; exceptional statuses may still be displayed when necessary to avoid misleading users.

## Acceptance Criteria

- AC-001: In a wide Token tab, the Team section presents a table with headers `Member`, `Gross Input`, `Output`, and `Total`.
- AC-002: In a narrow Token tab, the Team section still presents the same grouped table headers and columns rather than stacked cards.
- AC-003: In a narrow Token tab where all columns cannot fit, a horizontal scrollbar/overflow path is available at the Team table region, and users can scroll to read all grouped metric columns.
- AC-004: The `Gross Input` cell for a summary row includes the gross input token count and the formatted input cost from `estimatedApiInputCost`.
- AC-005: The `Output` cell for a summary row includes the output token count and the formatted output cost from `estimatedApiOutputCost`.
- AC-006: The `Total` cell for a summary row includes the total token count and formatted total cost from `estimatedApiTotalCost`; normal estimated rows do not display `Estimate` or `Complete estimate`.
- AC-007: No standalone `Cost` header or fifth Cost cell appears in the Team table.
- AC-008: The focused member row remains visually distinguished without obscuring token counts, cost sublines, or column alignment.
- AC-009: Existing missing-price, partial-estimate, local/no-bill, mixed-currency/provider, zero-usage, loading, unavailable, and no-usage states still render without breaking row height or horizontal scroll.
- AC-010: Token/cost numeric values for each member and Team total match the pre-change source data; the change is presentational only.
- AC-011: Component coverage verifies grouped table headers, row attributes/focused state, paired token+cost cell contents, final Team total row, absence of a standalone Cost column, and presence of the scoped horizontal-scroll table wrapper.
- AC-012: The Team subtitle explains the estimate semantics once, for example: costs are estimated API costs and Total cost is input cost plus output cost.
- AC-013: A normal estimated row displays token counts and cost values only; it does not show `Estimate` or `Complete estimate` text in the metric cells.
- AC-014: No new backend/API calls or summary calculations are introduced for this layout change.

## Constraints / Dependencies

- Must work in the existing Vue/Nuxt frontend and scoped CSS setup.
- Must preserve the existing right-pane shell, Token tab data flow, and formatting helper contracts.
- Must avoid backend/API changes unless implementation discovers the current UI cannot get required data from existing props/state.
- Must preserve accessibility basics for tabular data: headers, row/column association, and keyboard/trackpad access to the horizontally scrollable region.
- Must respect existing Token tab vertical scrolling; horizontal overflow should not escape to the whole app shell.
- Must treat the previous five-column Cost-last table as stale for this branch after the user's Option B direction.

## Assumptions

- The user's Option B approval is authoritative for this design reset.
- `Gross Input` cost means `estimatedApiInputCost`, `Output` cost means `estimatedApiOutputCost`, and `Total` cost means `estimatedApiTotalCost`.
- Existing `formatCost` behavior is acceptable for missing/partial/local/mixed states. In the compact Team table, normal `estimated` status should not be shown per row; the Team subtitle carries the estimate explanation instead. Exceptional statuses may still appear when necessary to avoid misleading users.
- A four-column grouped table can use a smaller minimum width than the previous five-column table, but horizontal scrolling should remain available when needed.

## Risks / Open Questions

- OQ-001: Exact grouped-cell spacing and table minimum width may need visual tuning during implementation.
- OQ-002: JSDOM component tests cannot fully prove real scrollbar rendering; downstream API/E2E/visual validation should inspect a constrained-width Token tab.
- OQ-003: If a partial estimate has only one component cost available, the unavailable component cost should display through existing `formatCost` semantics (for example `price missing`) while the Total column status indicates `Partial estimate`.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases Covered |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002, UC-004 |
| REQ-003 | UC-001, UC-004, UC-005 |
| REQ-004 | UC-001, UC-004, UC-005 |
| REQ-005 | UC-001, UC-004, UC-005 |
| REQ-006 | UC-002 |
| REQ-007 | UC-003 |
| REQ-008 | UC-001, UC-002, UC-004 |
| REQ-009 | UC-005 |
| REQ-010 | UC-001, UC-002, UC-004, UC-005 |
| REQ-011 | UC-001, UC-002, UC-004 |
| REQ-012 | UC-001, UC-002, UC-004 |
| REQ-013 | UC-001, UC-002, UC-004, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Wide panel uses the new grouped metric column contract. |
| AC-002 | Narrow panel no longer switches to unclear stacked cards. |
| AC-003 | User can access all grouped metric columns through scoped horizontal scrolling. |
| AC-004 | Input tokens and input cost are visually paired. |
| AC-005 | Output tokens and output cost are visually paired. |
| AC-006 | Total tokens and total cost are visually paired without redundant normal estimate wording. |
| AC-007 | Tests and reviewers can detect regression to the stale Cost-last contract. |
| AC-008 | Focused row affordance remains intact after grouped-cell layout change. |
| AC-009 | Non-happy-path price/usage states are still readable in grouped table form. |
| AC-010 | Downstream validation can distinguish presentation change from accounting changes. |
| AC-011 | Component tests guard the new structure despite limited layout measurement in JSDOM. |
| AC-012 | The table stays clean because estimate wording is explained once in the section subtitle. |
| AC-013 | Reviewers can detect redundant status-copy regressions in normal rows. |
| AC-014 | The implementation does not create accidental data-flow or backend scope expansion. |

## Approval Status

Refined and design-ready based on the user's explicit Option B direction: token amount and corresponding cost should be grouped together in the same metric column because it is the most natural reading layout. No blocking user clarification remains.
