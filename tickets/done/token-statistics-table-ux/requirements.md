# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Improve the Settings > Token Statistics task table so users can understand available interactions without hover-only discovery, while removing redundant columns that consume width without adding useful information.

The current task table has three UX problems visible in the supplied English and Chinese screenshots:

1. Several column headers are sortable, but inactive sortable headers look like ordinary text. Users only see a sort arrow on the currently sorted column, so the available sort interactions are opaque.
2. Several cost values are clickable to reveal a cost breakdown, but their click affordance appears only on hover. Users cannot know beforehand which numbers are interactive.
3. `Type` and `Status` occupy table width with low value in the common case: `Type` duplicates the hierarchy/row metadata, while `Status` commonly repeats `Complete estimate` for every row.

## Investigation Findings

- `autobyteus-web/components/settings/TokenUsageStatistics.vue` owns the settings page filter card and grouping switch, then delegates task rows to `TokenUsageTaskStatisticsTable.vue`.
- `autobyteus-web/stores/tokenUsageStatistics.ts` fetches both GraphQL statistics projections and normalizes `rowKind`, `children`, `createdTimeSource`, and `aggregate.apiCostStatus` for the table. No backend/API change is needed for this UX improvement.
- `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` currently owns all task-table presentation and local interactions: sort state, top-level row sorting, row expansion, cost-detail expansion, row metadata, and the visible `Type`/`Status` columns.
- Current sortable task-table headers are `Task / Run`, `Runtime`, `Input`, `Output`, `Total Cost`, and `Created Time`. Inactive sortable headers are plain `<button class="font-semibold">` with no persistent icon, label, title, or `aria-sort`; only the active sort key displays `↑` or `↓`.
- Current cost detail toggles are three row cells (`Input Cost`, `Output Cost`, and `Total Cost`), each rendered as a button with only `hover:underline`. They all toggle the same row cost breakdown, creating duplicate hidden click targets.
- `Type` is derived from `rowKind`, but row hierarchy and metadata already expose the same context (`team …id`, `run …id`, `member run …id`, `task team …id`, `task agent …id`) and team rows already show expand/collapse affordances.
- `Status` is `aggregate.apiCostStatus`. It can be meaningful (`partial_price_missing`, `price_missing`, `mixed`, `local_no_api_bill`), so the status information must not disappear. However, the normal `estimated` case renders as `Complete estimate` in every row and is redundant because cost values already represent a complete estimate.
- `TokenUsageCostBreakdown.vue` already shows a status badge inside expanded details, so removing the standalone row-level `Status` column does not remove detailed price-status visibility.
- Existing tests cover task-table sorting, expansion, cost details, first-usage timestamps, mixed runtime/model labels, and model diagnostics. The task-table spec must be updated for removed columns and explicit interaction affordances.
- Local dependencies are not installed in the dedicated worktree, so implementation validation should use the existing project command once dependencies are available: `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts` at minimum.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broad design issue found.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect at the presentation/affordance level.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed.
- Evidence basis: The affected behavior is localized to `TokenUsageTaskStatisticsTable.vue` plus adjacent formatter/localization/tests. Existing page/store/backend boundaries already own the correct concerns.
- Requirement or scope impact: Requirements should change only the task table presentation and local interactions; backend token accounting, GraphQL schema, store normalization, and model diagnostics grouping remain unchanged.

## Recommendations

- Make sortable headers visually discoverable by showing a persistent sort glyph for every sortable header, using a distinct active glyph/state for the current sort key, and adding accessibility labels/`aria-sort`.
- Remove the standalone `Type` column from the task table. Preserve row-kind context through hierarchy, indentation, expand/collapse labels, and existing metadata text.
- Remove the standalone `Status` column from the task table. Suppress repeated `Complete estimate` in normal rows, but surface non-complete price statuses inline with the `Total Cost` cell and keep full status/missing-price detail in the cost breakdown.
- Replace duplicate hover-only cost-cell buttons with one explicit, persistently visible cost-details control in the `Total Cost` cell. `Input Cost` and `Output Cost` should render as plain values; the row-level details control shows the full input/output breakdown.
- Keep the change local to the task table and its tests/localization. Do not change the backend statistics API or token-cost semantics.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user scans the task table and can tell which headers support sorting before hovering or clicking.
- UC-002: A keyboard or screen-reader user can identify the current sort column/direction and activate sorting with accessible labels.
- UC-003: A user can identify the cost-breakdown action without hovering over numeric values.
- UC-004: A user can read task/team rows with less horizontal clutter after redundant `Type` and normal `Status` columns are removed.
- UC-005: A user still sees important non-complete cost-status conditions such as partial price, missing price, mixed estimate, or local/no API bill.
- UC-006: A user expanding a team row still understands parent/member/task-agent context from hierarchy and metadata.

## Out of Scope

- Backend token accounting, price calculation, cost status derivation, or GraphQL schema changes.
- Adding new sort keys beyond the currently supported task-table sort keys.
- Changing the model diagnostics table unless required by shared test/localization fallout.
- CSV export, per-turn drilldown, or new backend detail queries.
- Reintroducing page headings, range-mode selectors, or other previously removed Token Statistics controls.

## Functional Requirements

- REQ-001: The task table shall make every sortable column header visibly interactive without requiring hover. Current sortable columns are `Task / Run`, `Runtime`, `Input`, `Output`, `Total Cost`, and `Created Time`.
- REQ-002: The active sort header shall visibly show the current sort direction (`ascending` or `descending`) and non-active sortable headers shall show a neutral sort affordance.
- REQ-003: Sortable headers shall provide accessible sort state and action text, including `aria-sort` on the owning header or equivalent accessible semantics.
- REQ-004: Non-sortable headers shall not be rendered as buttons and shall not show a sort affordance.
- REQ-005: Existing task-table sorting behavior shall remain: default sort is `Created Time` descending; selecting a new sort key uses the existing default direction for that key; clicking the same sort key toggles direction; sorting reorders top-level rows only and keeps expanded children attached to their parent.
- REQ-006: The task table shall remove the standalone `Type` column and its cells.
- REQ-007: Removing `Type` shall not remove the backend/store `rowKind` data or row-kind-specific behavior. Row expansion, row metadata, and accessibility labels shall still distinguish teams, standalone runs, members, task teams, and task agents where relevant.
- REQ-008: The task table shall remove the standalone `Status` column and its cells.
- REQ-009: Rows whose `aggregate.apiCostStatus` is `estimated` shall not show repeated `Complete estimate` copy in the main row.
- REQ-010: Rows whose `aggregate.apiCostStatus` is not `estimated` shall keep visible status information in the main row, preferably as a compact inline badge or label in/near the `Total Cost` cell.
- REQ-011: The expanded cost breakdown shall continue to show the full price status and missing price dimensions using existing status semantics.
- REQ-012: Cost breakdown shall be available through a persistently visible, row-level control in the `Total Cost` cell. The control shall not rely on hover-only underline styling.
- REQ-013: `Input Cost` and `Output Cost` shall render as plain cost values unless they receive their own always-visible, accessible affordance. The preferred target behavior is a single `Total Cost` details control to avoid three duplicate row-detail toggles.
- REQ-014: The cost-details control shall expose accessible labels and expanded/collapsed state for the target row.
- REQ-015: The detail row column span and table layout shall be updated to match the reduced column count after removing `Type` and `Status`.
- REQ-016: English and Chinese localization shall include any new sort/cost-detail action text required by the updated controls.
- REQ-017: Existing cost formatting, cache sublines, thinking-token sublines, created-time fallback labels, runtime/model mixed labels, and team/member expansion behavior shall remain intact.
- REQ-018: Durable frontend tests shall be updated or added to cover the visible sort affordances, removal of `Type`/`Status`, explicit cost-detail control, and preservation of non-complete status visibility.

## Acceptance Criteria

- AC-001: On the task table, all sortable headers display a persistent sort indicator before hover; inactive sortable headers are distinguishable from non-sortable headers.
- AC-002: The current active sort column displays the correct `↑` or `↓` direction indicator, and clicking it toggles the sort direction.
- AC-003: The task table exposes accessible sort state/action text for sortable headers; at least the active header reports the current direction through `aria-sort` or equivalent tested semantics.
- AC-004: `Model(s)`, `Input Cost`, and `Output Cost` headers remain non-sortable unless implementation explicitly adds supported sort behavior; if non-sortable, they are not buttons.
- AC-005: The task table no longer renders `Type` or `Status` headers.
- AC-006: Task rows no longer render standalone `Type` badges such as `Team`, `Agent`, or `Member`; users still see team/run/member identity from row hierarchy and metadata.
- AC-007: Rows with complete estimated pricing no longer show repeated `Complete estimate` / `完整预估` copy in the main table row.
- AC-008: Rows with `partial_price_missing`, `price_missing`, `mixed`, or `local_no_api_bill` still expose that status in the main row and in the expanded cost breakdown.
- AC-009: The row cost breakdown can be opened from an always-visible control in `Total Cost` without hovering a number; the control has an accessible label and expanded/collapsed state.
- AC-010: Opening the row cost breakdown still renders `Cost breakdown`, input breakdown, output breakdown, included thinking-token copy, total input cost, total estimated API cost, and missing price dimensions when present.
- AC-011: Sorting by `Total Cost` after expanding a team keeps member rows attached beneath their team parent.
- AC-012: Removing columns does not change the data fetch variables, GraphQL query shape, store normalization, or backend token usage projection.
- AC-013: The focused task-table component tests pass after updating expectations for the new column set and controls.

## Constraints / Dependencies

- The task branch is `codex/token-statistics-table-ux` in dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux`.
- Base branch is `origin/personal` at bootstrap commit `56e4fadc6084a60ae423d72e8f4b2797066120f5`.
- Existing token usage backend and GraphQL schema already provide all required row-kind and price-status data.
- The table must continue to work in English and Chinese locales.
- Local dependencies were not installed during design investigation; downstream implementation should run focused tests in an environment with dependencies available.

## Assumptions

- The user is asking for a UX recommendation and implementation direction, not for a configurable user preference.
- Removing `Type` and `Status` as standalone columns is acceptable if their meaningful information is preserved elsewhere.
- `Complete estimate` is the normal/no-action status and can be suppressed in the main task table.
- Non-complete price statuses are exceptions and must remain visible.

## Risks / Open Questions

- If another user relies on clicking `Input Cost` or `Output Cost` specifically to open the breakdown, replacing those duplicate hidden controls with one explicit `Total Cost` details control is a behavior change. This is intentional to reduce hidden affordances and duplicate row actions.
- The implementation should verify that no test or accessibility path depends on the removed `rowTypeLabel` function after the Type column is removed.
- Existing generated localization files include older Token Statistics labels; implementation should follow the project’s localization update pattern and avoid stale source/test expectations.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases Covered |
| --- | --- |
| REQ-001, REQ-002, REQ-003, REQ-004, REQ-005 | UC-001, UC-002 |
| REQ-006, REQ-007 | UC-004, UC-006 |
| REQ-008, REQ-009, REQ-010, REQ-011 | UC-004, UC-005 |
| REQ-012, REQ-013, REQ-014 | UC-003 |
| REQ-015 | UC-004 |
| REQ-016 | UC-001, UC-002, UC-003 |
| REQ-017 | UC-005, UC-006 |
| REQ-018 | UC-001 through UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001, AC-002, AC-003, AC-004 | Users can discover and operate sorting visually and accessibly. |
| AC-005, AC-006, AC-007 | Redundant columns/copy are removed from the main table. |
| AC-008, AC-010 | Meaningful non-complete price status and details remain visible. |
| AC-009 | Cost detail interaction is visible without hover. |
| AC-011 | Existing parent/child sorting invariant remains intact. |
| AC-012 | Scope remains frontend/table presentation; backend contract is unchanged. |
| AC-013 | Durable component coverage reflects the updated behavior. |

## Approval Status

Design-ready. The user explicitly asked whether the `Type` and `Status` columns are needed and asked for a recommendation; this requirements basis proceeds with the solution-designer recommendation to remove those standalone columns while preserving meaningful non-complete status information inline.
