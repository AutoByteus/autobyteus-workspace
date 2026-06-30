# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Settings > Token Statistics should make better use of the main content area and present token-statistics controls according to their actual role, with clean visible copy.

The earlier direct cleanup removed the redundant visible main-content `Token Statistics` page header because the selected left settings navigation item already identifies the page. The user has now expanded the layout requirement:

- `Task` / `Model` is a result grouping choice, not page navigation.
- The grouping choice should be a normal select/dropdown-style control with clean visible option labels `Task` and `Model`, not `By Task` and `By Model`.
- The grouping select should appear first because it chooses the result perspective.
- The date range should come after the grouping select because it scopes that selected perspective.
- `Usage during period ⓘ` should be removed because it is obvious from the date range.
- Visible copy should be minimal; do not add redundant visible labels such as `Group by:` or unnecessary explanatory text.

The improved page should therefore start with one compact filter/control card containing:

- grouping select (`Task` / `Model`) first,
- start date and end date controls second,
- fetch action last.

The separate tab row below the filter card and the usage-period tooltip/helper should be removed so the results table moves upward and the controls read as one clean filter/query surface.

## Investigation Findings

- User-provided screenshot shows current/previous layout: a top controls card with date range, `Usage during period ⓘ`, and fetch action, then a separate `By Task` / `By Model` tab row, then the table.
- The first direct implementation already removed the duplicate visible page title in `autobyteus-web/components/settings/TokenUsageStatistics.vue` and cleaned stale heading translations.
- Current `TokenUsageStatistics.vue` still renders `By Task` / `By Model` as a separate tab row after the date controls card and still renders `Usage during period ⓘ` inside the card. These are the new design concerns.
- `activeTab` in `TokenUsageStatistics.vue` is a local presentation/query-state selector that chooses between task rows and model rows. It does not perform independent routing and does not require a separate page-tab region.
- Existing component tests already verify default task grouping, switching to model grouping, date editing, fetch behavior, empty states, and no visible duplicate title. They will need to be updated to assert the grouping control is a select/dropdown with visible `Task` / `Model` options inside the filter card, the usage-period helper is removed, and the old tab row/border is not reintroduced.
- Delivery had already started for the earlier smaller scope. That finalization has been paused because this expanded scope supersedes the earlier delivery-ready state.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, but bounded to UI control ownership/presentation.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, local UI-structure refactor only.
- Evidence basis: `By Task` / `By Model` currently appears as a page-level tab row even though it is controlled by local `activeTab` state inside the token statistics query/view component and behaves as a result grouping selector alongside date range. The usage-period helper repeats what the date range already communicates.
- Requirement or scope impact: The target design should treat token statistics controls as one cohesive filter surface, ordered as grouping -> date range -> fetch, and remove stale/redundant presentation structure.

## Recommendations

- Keep the already implemented visible page-header removal and stale heading translation cleanup.
- Replace the separate `By Task` / `By Model` tab row with a compact select/dropdown-style control whose visible options are `Task` and `Model` inside the top filter card.
- Put the grouping select first, before the date range.
- Remove the visible `Usage during period ⓘ` helper entirely.
- Remove visible redundant labels such as `Group by:` and `Select Date Range:`; use non-visible/ARIA labels if needed for accessibility.
- Keep the selector behavior unchanged: default to task grouping, visibly shown as `Task`; switching to model grouping, visibly shown as `Model`, updates the displayed table/empty state without changing date inputs or refetching unless the user clicks `Fetch Statistics`.
- Preserve token statistics store/query behavior, table components, rows, costs, empty states, loading/error states, and sidebar navigation.
- Update durable component coverage and relevant prototype/docs expectations so the old separate tab row and redundant usage helper are not reintroduced.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-small

Rationale: The code change is still localized to the Token Statistics component/tests/localization/prototype docs, but the layout semantics are broader than the initial direct title removal and should be design-reviewed.

## In-Scope Use Cases

- UC-001: A user opens Settings > Token Statistics and sees the main content begin with one compact filter/control card, not a repeated page title, redundant helper text, or separate grouping tab row.
- UC-002: A user selects the result grouping from a dropdown-style control, then selects a date range, then fetches statistics.
- UC-003: A user switches between `Task` and `Model`; date range values remain unchanged and the corresponding table/empty state is displayed.
- UC-004: A user can still fetch statistics and use existing task/model result views after the layout change.

## Out of Scope

- Changing token statistics data fetching, aggregation, cost calculations, GraphQL queries, or table column definitions.
- Adding new filter dimensions beyond the existing grouping selector and date range.
- Renaming the left settings navigation item.
- Redesigning other settings pages.
- Introducing compatibility flags or old/new dual layout modes.
- Changing backend token usage semantics.

## Text UI Reference

A text-based UI design for the filter/control area is maintained at:

`/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/text-ui-filter-control-design.md`

This artifact is normative for the expanded layout intent: one clean filter/control card ordered as grouping select -> date range -> fetch action; grouping options visibly read `Task` and `Model`; no separate lower `By Task` / `By Model` tab row; no visible `Usage during period`; no visible `Group by:`; no visible `Select Date Range:`.

## Functional Requirements

- FR-001: The Token Statistics settings page must not render the redundant visible in-page `Token Statistics` header above the controls.
- FR-002: The left settings navigation must continue to show and highlight the selected `Token Statistics` item.
- FR-003: The top controls card must contain, in order, the `Task` / `Model` grouping select, start/end date controls, and fetch action.
- FR-004: The grouping selector must be presented as a select/dropdown-style control with visible options `Task` and `Model`, not as a separate page-tab row or two-button segmented control.
- FR-004a: The grouping selector must not include `By` in the visible dropdown option labels; use `Task` and `Model` only.
- FR-005: The separate lower `By Task` / `By Model` tab row and its divider/spacing must be removed so the results area starts immediately after the controls card spacing.
- FR-006: The visible `Usage during period ⓘ` helper must be removed.
- FR-007: The controls card must not add redundant visible explanatory copy such as `By Task`, `By Model`, `Group by:`, or `Select Date Range:`; if accessible labels are needed, they should be non-visible/ARIA-only.
- FR-008: Default grouping must remain task grouping, visibly shown as `Task`.
- FR-009: Switching grouping must continue to display the task table for `Task` and model table for `Model` without changing selected dates.
- FR-010: Fetching statistics must continue to use the selected date range exactly as before and must not introduce a new grouping/range-mode API argument.
- FR-011: Existing loading, error, task-empty, model-empty, task-table, and model-table behavior must remain unchanged aside from vertical placement.
- FR-012: Stale localization/test/doc artifacts for the old visible header, old usage-period helper, or old separate tab-row layout must not remain.

## Acceptance Criteria

- AC-001: When Settings > Token Statistics is selected, the main content has no visible large `Token Statistics` heading above the controls.
- AC-002: The highlighted left navigation item still reads `Token Statistics`.
- AC-003: The first visible control in the top controls/filter card is a select/dropdown showing `Task` or `Model`.
- AC-004: The start/end date controls appear after the grouping select.
- AC-005: The top controls/filter card does not show `Usage during period`, `Group by:`, or `Select Date Range:` as visible text.
- AC-006: There is no separate lower `By Task` / `By Model` tab row/divider between the controls card and results table.
- AC-007: The results table/empty state appears closer to the controls than in the referenced screenshot because the duplicate heading, redundant helper, and separate tab row have been removed.
- AC-008: Default load still shows `Task` selected and renders task rows after the default date fetch.
- AC-009: Switching the select to `Model` still renders model rows and keeps the selected date range intact.
- AC-010: Clicking `Fetch Statistics` still calls the existing fetch path with only start and end dates.
- AC-011: Focused component coverage fails if the old separate tab-row layout or usage-period helper is reintroduced.
- AC-012: Localization literal audit remains clean; no stale heading, usage-helper, or old-layout-only translation artifacts remain.

## Constraints / Dependencies

- Must use the existing `TokenUsageStatistics.vue` component ownership for date inputs, grouping state, fetch behavior, and table selection.
- Must preserve existing data-store/query boundaries; no backend or GraphQL change is required.
- Must avoid compatibility wrappers, feature flags, or dual-path rendering for the old layout.
- Must coordinate with paused delivery artifacts from the prior smaller scope before final delivery resumes.

## Assumptions

- `Task` / `Model` is a result grouping/presentation selector rather than a separate page navigation concept.
- A compact select/dropdown inside the filter card is cleaner than a segmented control or separate tab row.
- Users understand that date inputs scope usage to that period; no visible usage-period helper is needed.
- Existing table components can remain unchanged because the scope is control placement and layout semantics.

## Risks / Open Questions

- The grouping select should stay visually minimal: use only selected value text (`Task` / `Model`) and a dropdown affordance.
- Control row wrapping should be checked for narrower settings content widths.
- Removing visible labels means accessibility must be preserved with non-visible/ARIA labels where needed.
- Delivery-generated Electron build artifacts from the prior candidate are now only prior-scope evidence; delivery should rebuild after the expanded implementation lands if user verification needs a packaged app.

## Requirement-To-Use-Case Coverage

| Requirement | Covers Use Case(s) |
| --- | --- |
| FR-001 | UC-001 |
| FR-002 | UC-001 |
| FR-003 | UC-001, UC-002 |
| FR-004 | UC-001, UC-002 |
| FR-004a | UC-001, UC-002 |
| FR-005 | UC-001 |
| FR-006 | UC-001 |
| FR-007 | UC-001, UC-002 |
| FR-008 | UC-003, UC-004 |
| FR-009 | UC-003, UC-004 |
| FR-010 | UC-002, UC-004 |
| FR-011 | UC-004 |
| FR-012 | UC-001 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Guards the already-approved duplicate title removal. |
| AC-002 | Verifies sidebar-owned page identity remains visible. |
| AC-003 | Verifies grouping is a select/dropdown, appears first, and uses clean `Task` / `Model` visible labels. |
| AC-004 | Verifies date range follows grouping. |
| AC-005 | Verifies redundant visible helper/labels are removed. |
| AC-006 | Guards against retaining the stale separate tab row. |
| AC-007 | Verifies the intended vertical-space improvement. |
| AC-008 | Preserves default behavior. |
| AC-009 | Preserves grouping switch behavior and date state. |
| AC-010 | Preserves API/store boundary shape. |
| AC-011 | Adds durable regression coverage for the layout semantics. |
| AC-012 | Ensures cleanup follows the no-stale-code principle. |

## Approval Status

Approved by user on 2026-06-30. Expanded clean filter-control layout approved: `Task` / `Model` dropdown first, date range second, fetch action last; remove duplicate page header, usage-period helper, visible `Select Date Range:` label, visible `Group by:` label, and separate `By Task` / `By Model` tab row.
