# Design Spec

## Current-State Read

Settings > Token Statistics is already split across healthy ownership boundaries:

- `TokenUsageStatistics.vue` owns the settings page controls: grouping select, date range, fetch button, loading/empty states, and delegation to task/model tables.
- `tokenUsageStatisticsStore` owns GraphQL fetching and frontend normalization of task/model statistics rows.
- The backend token-usage statistics provider and GraphQL resolver own ledger-backed task hierarchy, runtime/model aggregation, and cost/status semantics.
- `TokenUsageTaskStatisticsTable.vue` owns local task-table presentation and interactions: sortable top-level rows, expanded children, row detail toggles, visible columns, row metadata, and cost/status presentation in the main row.
- `TokenUsageCostBreakdown.vue` owns expanded row cost details and already renders the cost status badge and missing price dimensions.
- `tokenUsageStatisticsUi.ts` owns formatting for cost cells, status labels/classes, runtime/model labels, cache sublines, thinking-token sublines, dates, and compact numbers.

The current UX defects are local to `TokenUsageTaskStatisticsTable.vue`:

- Sortable headers are button elements but inactive sortable headers have no persistent sort affordance. Only the active header shows `↑` or `↓`.
- `Input Cost`, `Output Cost`, and `Total Cost` each render as hidden-affordance buttons (`hover:underline`) even though all three toggle the same row cost breakdown.
- `Type` duplicates row-kind context already available in row hierarchy and metadata.
- `Status` repeats `Complete estimate` for ordinary `estimated` rows, but price status itself remains meaningful for `partial_price_missing`, `price_missing`, `mixed`, and `local_no_api_bill`.

Constraints the target design must respect:

- Do not change backend token accounting, status derivation, GraphQL schema, or store normalization.
- Continue rendering backend-provided `children`, `executionAddress`, `rowKind`, and `aggregate.apiCostStatus`; do not reconstruct hierarchy in the frontend.
- Preserve existing sorting invariant: sort top-level rows only, and keep expanded children attached to their parent.
- Preserve non-complete cost-status visibility after removing the standalone `Status` column.
- Preserve English/Chinese localization and component test coverage.

## Intended Change

Update the task statistics table so available interactions are transparent and redundant columns are removed:

1. Render persistent sort affordances for every sortable header.
2. Add accessible sort semantics and action labels.
3. Remove the standalone `Type` column and `rowTypeLabel()` usage.
4. Remove the standalone `Status` column, suppress `Complete estimate` in main rows, and show non-complete statuses inline with `Total Cost` plus in the existing cost breakdown.
5. Replace duplicate hover-only cost detail buttons with one explicit, persistently visible row details control in the `Total Cost` cell.
6. Update task-table tests and localization strings for the new behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): No broad design issue found.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect at the presentation/affordance level.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No architecture refactor needed.
- Evidence: The issue is contained to task-table header/cell rendering in `TokenUsageTaskStatisticsTable.vue`; existing store/backend boundaries already provide correct data, hierarchy, and status semantics.
- Design response: Make a local table presentation update, reuse `tokenUsageStatisticsUi.ts` formatting, and preserve existing store/API boundaries.
- Refactor rationale: No new subsystem or boundary is needed. A small local cleanup is required: remove the now-unused `rowTypeLabel()` and duplicate cost-cell buttons.
- Intentional deferrals and residual risk, if any: The model diagnostics table remains unchanged. A future design can standardize sortable-table header components across the app if multiple tables need the same pattern, but this task should not introduce a cross-app abstraction for one table.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove obsolete task-table UI paths included in this scope: standalone `Type` column/cells, standalone `Status` column/cells, `rowTypeLabel()` if no longer used, and duplicate hover-only cost-cell buttons.
- Treat removal as first-class design work: this task is not allowed to keep hidden old cost-cell buttons alongside the new explicit details control.
- Decision rule: no compatibility wrappers or dual-path behavior are needed.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Settings > Token Statistics task grouping | User reads/sorts/simplifies task table rows | Settings Token Statistics page + task table | Shows where fetched token statistics become the improved visible table. |
| DS-002 | Bounded Local | User activates a sortable header | Sorted visible rows update with active sort state | `TokenUsageTaskStatisticsTable.vue` | The header affordance change must preserve sorting behavior and child attachment. |
| DS-003 | Bounded Local | User activates the Total Cost details control | Cost breakdown row appears/disappears | `TokenUsageTaskStatisticsTable.vue` + `TokenUsageCostBreakdown.vue` | The hover-only clickable number problem is solved by a visible detail control. |
| DS-004 | Bounded Local | Row aggregate has non-`estimated` price status | Main row shows compact exception status and details show full status | `TokenUsageTaskStatisticsTable.vue` + `tokenUsageStatisticsUi.ts` | Removing `Status` column must not erase meaningful price-status exceptions. |

## Primary Execution Spine(s)

`Settings sidebar -> TokenUsageStatistics.vue -> tokenUsageStatisticsStore -> GraphQL tokenUsageTaskStatisticsInPeriod -> TokenUsageTaskStatisticsTable.vue -> Task table headers/rows/details`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user navigates to the Token Statistics settings page, the page fetches normalized task rows, and the task table renders a simplified column set with visible controls. | Settings page, statistics store, backend statistics query, task table | Settings Token Statistics surface | Localization, tests, docs sync |
| DS-002 | A sortable header exposes a persistent neutral or active indicator; clicking it updates `sortKey`/`sortDirection`, recomputes sorted top-level rows, and leaves child rows under expanded parents. | Sort header, table sort state, visible rows | `TokenUsageTaskStatisticsTable.vue` | Accessible labels, `aria-sort`, neutral/active glyph styling |
| DS-003 | The Total Cost cell renders the row's total cost plus an explicit details toggle. Activating it toggles the row id in `detailRows`, and the next detail row renders `TokenUsageCostBreakdown`. | Total Cost cell, detail row set, cost breakdown | `TokenUsageTaskStatisticsTable.vue` | Button label/state, detail row `colspan` |
| DS-004 | When `aggregate.apiCostStatus !== 'estimated'`, the Total Cost area displays a compact status badge/label using formatter status semantics; the expanded breakdown remains the full detail owner. | Row aggregate status, total cost cell, breakdown | Task table + formatter | Avoid repeated `Complete estimate` for normal rows |

## Spine Actors / Main-Line Nodes

- Settings page (`TokenUsageStatistics.vue`)
- Statistics store (`tokenUsageStatisticsStore`)
- Backend GraphQL token usage statistics query
- Task table (`TokenUsageTaskStatisticsTable.vue`)
- Cost breakdown (`TokenUsageCostBreakdown.vue`)

## Ownership Map

- `TokenUsageStatistics.vue` owns page-level controls, grouping choice, date range, fetch action, and empty/loading/error states. It must not own task-table column decisions.
- `tokenUsageStatisticsStore` owns API calls and normalization of incoming statistics data. It must not own visual affordances.
- Backend token usage providers/resolvers own ledger-backed hierarchy, row identities, cost aggregation, and status semantics. They must not change for this presentation task.
- `TokenUsageTaskStatisticsTable.vue` owns task-table column set, sort state, expansion state, detail-toggle state, and main-row presentation. It is the governing owner for this change.
- `tokenUsageStatisticsUi.ts` owns formatting and localized labels for cost/status/runtime/date/number display. Task table should call it rather than hard-coding status text.
- `TokenUsageCostBreakdown.vue` owns expanded cost-breakdown content and detailed status/missing-price visibility.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TokenUsageStatistics.vue` table delegation | `TokenUsageTaskStatisticsTable.vue` | Page chooses task/model grouping and passes rows. | Task table sort/detail column behavior. |
| GraphQL query module | Backend `TokenUsageStatisticsProvider` and frontend store normalization | Thin API document for data fetch. | UI column affordances or hierarchy reconstruction. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `Type` `<th>` and row `<td>` in `TokenUsageTaskStatisticsTable.vue` | Duplicates hierarchy/metadata and consumes width. | Task/run cell hierarchy, indentation, row metadata, expand/collapse labels. | In This Change | Keep `rowKind` data for behavior; remove visible column only. |
| `rowTypeLabel()` in `TokenUsageTaskStatisticsTable.vue` | Used only by removed Type column. | Existing `rowMetadata()` and expand labels. | In This Change | Remove if no references remain. |
| `Status` `<th>` and row `<td>` in `TokenUsageTaskStatisticsTable.vue` | Repeats `Complete estimate` for normal rows. | Inline non-complete status in Total Cost cell and `TokenUsageCostBreakdown.vue`. | In This Change | Do not remove formatter status helpers used by breakdown. |
| Duplicate `Input Cost` / `Output Cost` detail-toggle buttons | Hidden duplicate actions; same target as total cost details. | Single visible Total Cost details control. | In This Change | Input/output cost values become plain text unless explicitly designed as visible controls. |
| Hover-only cost click affordance | Opaque interaction. | Always-visible details icon/link styling and accessible label. | In This Change | No fallback hidden click targets. |
| Detail row `colspan="11"` | Column count changes to 9. | `colspan="9"`. | In This Change | Keep indentation style. |

## Return Or Event Spine(s) (If Applicable)

No async return/event spine is introduced. Existing fetch and render flow remains unchanged.

## Bounded Local / Internal Spines (If Applicable)

- Sort local spine inside `TokenUsageTaskStatisticsTable.vue`:
  `Header button click/keyboard activation -> toggleSort(key) -> sortKey/sortDirection refs -> sortedRows computed -> visibleRows computed -> table rerender`
- Detail local spine inside `TokenUsageTaskStatisticsTable.vue`:
  `Total Cost details button -> toggleDetails(rowId) -> detailRows Set -> detail row v-if -> TokenUsageCostBreakdown`
- Inline exception-status local spine:
  `row.aggregate.apiCostStatus -> status !== estimated check -> formatter.statusClass/formatStatus -> compact badge in Total Cost cell`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization | DS-002, DS-003 | Task table | Provide sort/detail accessible labels in English and Chinese. | Visible controls need locale-aware text. | Hard-coded labels would break localization consistency. |
| Formatting helpers | DS-003, DS-004 | Task table and breakdown | Format cost/status/date/runtime consistently. | Avoid duplicating status mapping. | Divergent status wording/classes between row and breakdown. |
| Component tests | DS-001 through DS-004 | Task table | Lock new header/column/detail behavior. | Prevent regressions to hover-only or redundant columns. | Behavior could regress without visible coverage. |
| Durable docs sync | DS-001 | Delivery engineer | Decide whether Settings docs need updating after implementation. | Column removal changes documented UI behavior. | Docs may preserve stale Type/Status expectations. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Cost/status formatting | `tokenUsageStatisticsUi.ts` | Reuse / small extension if needed | Existing formatter owns status labels/classes and cost cell formatting. | N/A |
| Expanded cost detail | `TokenUsageCostBreakdown.vue` | Reuse | Already shows detailed status and missing price dimensions. | N/A |
| Sort state | `TokenUsageTaskStatisticsTable.vue` | Extend locally | Existing table owns sort state and computed rows. | N/A |
| Cross-table sortable header component | None currently in this feature | Do not create new | One table needs the pattern; a cross-app abstraction would be over-architecture. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Settings Token Statistics frontend | Page/table presentation, task/model grouping, local table interactions | DS-001 through DS-004 | `TokenUsageTaskStatisticsTable.vue` | Extend | Primary implementation scope. |
| Token usage formatting | Cost/status/date/runtime formatting | DS-003, DS-004 | `tokenUsageStatisticsUi.ts` | Reuse / Extend | Only add helper if it reduces duplication. |
| Token usage backend/API | Ledger-backed row/status data | DS-001 | Backend provider/store | Reuse unchanged | No schema/API change. |
| Localization | User-facing labels | DS-002, DS-003 | Task table | Extend | Add English/Chinese labels as needed. |
| Test coverage | Component behavior | DS-001 through DS-004 | Task table | Extend | Update focused specs. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Settings Token Statistics frontend | Task table | Column removal, sort affordances, total-cost details control, inline exception status. | Existing table owner. | Uses formatter. |
| `autobyteus-web/components/settings/token-usage/tokenUsageStatisticsUi.ts` | Token usage formatting | Formatting helper | Optional helper for complete vs exception status or reused status labels. | Existing formatter owner. | N/A |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization | English settings labels | Sort/detail action copy. | Existing locale source. | N/A |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization | Chinese settings labels | Sort/detail action copy. | Existing locale source. | N/A |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Test coverage | Task table spec | Assertions for visible sort controls, removed columns, explicit details toggle, non-complete status preservation. | Existing focused spec. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Sortable header rendering | None for this task | Task table | Not shared yet; keep local. | Yes | Yes | Cross-app table abstraction without multiple users. |
| Status formatting | `tokenUsageStatisticsUi.ts` | Token usage formatting | Already shared by table and breakdown. | Yes | Yes | Duplicate status map in table. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageTaskStatisticsRow.rowKind` | Yes | N/A | Low | Keep as behavioral/context data; remove only redundant visible column. |
| `TokenUsageCostSummaryAggregate.apiCostStatus` | Yes | N/A | Low | Keep as authoritative status; show only exceptions in main row. |
| Local sort helper functions | Yes | Yes | Low | Keep in component unless reused elsewhere. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Settings Token Statistics frontend | Task table | Implement visual sortable headers, remove Type/Status columns, simplify cost details to explicit Total Cost control, adjust colspan, remove unused type-label code. | Existing presentation/interactions owner. | Uses `tokenUsageStatisticsUi.ts`. |
| `autobyteus-web/components/settings/token-usage/tokenUsageStatisticsUi.ts` | Token usage formatting | Formatter | Preserve existing cost/status formatting; optionally add small status predicate/helper if table and breakdown benefit. | Existing formatting owner. | N/A |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization | English settings labels | New sort/detail accessible labels. | Existing source locale file. | N/A |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization | Chinese settings labels | New sort/detail accessible labels. | Existing source locale file. | N/A |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Test coverage | Task table behavior | Update and extend coverage. | Existing focused test file. | N/A |

## Ownership Boundaries

- The frontend table may choose how to present existing fields, but it must not mutate or reinterpret backend cost-status semantics.
- The table may suppress `estimated` status copy in the main row, but non-`estimated` status must flow from `aggregate.apiCostStatus` through existing formatter semantics.
- The table may remove visible `Type`, but it must still use backend/store `rowKind` for row metadata, hierarchy, and accessibility.
- The store and GraphQL query boundaries are not too thin for this task; adding UI-specific API fields would be a boundary bypass.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Backend token usage statistics API | Ledger query, task tree builder, aggregate status | `tokenUsageStatisticsStore` | Task table reconstructing hierarchy from display names or memory paths. | Add backend/API fields in a separate requirement if truly needed. |
| `tokenUsageStatisticsStore` | GraphQL fetch and normalization | Settings page/table components | Components issuing parallel ad hoc GraphQL statistics queries for same data. | Extend store normalization. |
| `tokenUsageStatisticsUi.ts` | Status/cost/date/runtime formatting | Task table and breakdown | Duplicating status label/class logic in table. | Add formatter helper. |
| `TokenUsageTaskStatisticsTable.vue` | Column rendering, sort/detail expansion state | Settings page | Page manipulating row expansion or column logic. | Add props/events only if page-level behavior is required. |

## Dependency Rules

Allowed:

- `TokenUsageStatistics.vue` may import and render `TokenUsageTaskStatisticsTable.vue` and pass normalized rows.
- `TokenUsageTaskStatisticsTable.vue` may import `TokenUsageCostBreakdown.vue`, `useLocalization`, and `tokenUsageStatisticsUi.ts` helpers.
- `TokenUsageTaskStatisticsTable.vue` may depend on `TokenUsageTaskStatisticsRow` and sort-key types.
- Tests may mount the task table with fixture rows and mocked localization.

Forbidden:

- Do not add backend fields, store fields, or GraphQL variables for this presentation-only change.
- Do not duplicate cost-status mapping in the table if the formatter already owns it.
- Do not leave old hidden cost-cell buttons active after adding an explicit details control.
- Do not remove status semantics from `TokenUsageCostBreakdown.vue` or the formatter.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `GET_TOKEN_USAGE_TASK_STATISTICS` | Task statistics data | Fetch backend-provided rows/children/aggregates. | `startTime`, `endTime` | Unchanged. |
| `TokenUsageTaskStatisticsTable` props | Task table rendering | Accept normalized task rows. | `rows: TokenUsageTaskStatisticsRow[]` | Unchanged. |
| `toggleSort(key)` | Task table sort state | Change current sort key/direction. | `TokenUsageTaskSortKey` | Existing behavior preserved. |
| `toggleDetails(rowId)` | Task table detail state | Toggle one row breakdown. | `rowId: string` | Triggered by explicit Total Cost control. |
| Formatter methods | Display formatting | Convert status/cost/runtime/date to localized display strings. | Aggregate/status values | Reuse existing methods. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageTaskStatisticsTable` props | Yes | Yes | Low | No change. |
| `toggleSort(key)` | Yes | Yes | Low | Add accessible labels around it; do not change shape. |
| `toggleDetails(rowId)` | Yes | Yes | Low | Keep rowId explicit; change only visible trigger. |
| GraphQL task statistics query | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Task table | `TokenUsageTaskStatisticsTable` | Yes | Low | Keep. |
| Cost breakdown | `TokenUsageCostBreakdown` | Yes | Low | Keep. |
| Sort indicator helper | `sortIndicator` / proposed `sortIcon`, `sortAriaSort`, `sortButtonLabel` | Yes | Low | Name helpers by concrete output. |
| Inline status predicate | proposed `shouldShowInlineStatus` | Yes | Low | Use only if helper is added. |

## Applied Patterns (If Any)

- Local presentation helper functions inside `TokenUsageTaskStatisticsTable.vue`: solve repeated header/accessibility rendering without introducing a new cross-app component.
- Existing formatter pattern in `tokenUsageStatisticsUi.ts`: centralizes display formatting and status labels.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | File | Task table | Table columns, visible sort controls, row expansion, explicit total-cost details control, inline exception status. | Existing file already owns these concerns. | Backend querying, price calculation, hierarchy reconstruction. |
| `autobyteus-web/components/settings/token-usage/tokenUsageStatisticsUi.ts` | File | Token usage formatter | Existing cost/status formatting; optional small helper. | Existing shared formatting owner. | Table state or row expansion logic. |
| `autobyteus-web/localization/messages/en/settings.ts` | File | English settings locale | New task-table action/accessibility strings. | Existing source locale. | Component logic. |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | File | Chinese settings locale | New task-table action/accessibility strings. | Existing source locale. | Component logic. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | File | Task table test coverage | Updated behavior assertions. | Existing focused spec. | Backend integration tests. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/token-usage` | Main-Line Domain-Control / UI presentation | Yes | Low | Token statistics UI components already grouped here. |
| `autobyteus-web/localization/messages` | Off-Spine Concern | Yes | Low | Locale source files are central by language/domain. |
| `autobyteus-web/stores` | Main-Line State Boundary | Yes | Low | No change. |
| `autobyteus-server-ts/src/token-usage` | Backend domain/provider | Yes | Low | No change. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Sortable header | `Task / Run ↕` when inactive; `Created Time ↓` when active; header exposes `aria-sort="descending"`. | A plain text-looking `Task / Run` button with no icon until after click. | Users must know a header is sortable before hover/click. |
| Cost detail control | `Total Cost: 0.4563 $ ▸` with persistent underline/icon and `aria-expanded=false`. | `Input Cost`, `Output Cost`, and `Total Cost` all as invisible buttons until hover. | One clear row-level action replaces three hidden duplicates. |
| Status simplification | Estimated row shows just `0.4563 $`; partial row shows `0.4563 $ partial est.` or a compact `Partial` badge. | Every row shows a green `Complete estimate` pill. | Normal state should be quiet; exceptions should remain visible. |
| Type removal | Team row uses chevron + `team …id`; member row is indented with `↳` + `member run …id`. | Separate `Type` column repeating `Team`/`Agent` for each row. | The identity is already available in row context. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old `Type` column behind a feature flag | Avoid changing existing table shape. | Rejected | Remove the column outright; hierarchy/metadata provide context. |
| Keep old `Status` column but hide complete rows | Preserve column for exceptions. | Rejected | Remove column and show non-complete exceptions inline with Total Cost and in details. |
| Keep old hidden cost buttons while adding a new details control | Preserve all existing click targets. | Rejected | Replace with one explicit Total Cost details control. |
| Add backend `isSortable` metadata | Make table more declarative. | Rejected | Sortable keys are local table behavior; backend should not own this UI affordance. |

## Derived Layering (If Useful)

- Backend/data layer: token-usage statistics provider and GraphQL resolver; unchanged.
- Frontend state layer: `tokenUsageStatisticsStore`; unchanged.
- Frontend presentation/control layer: `TokenUsageTaskStatisticsTable.vue`; changed.
- Formatting/localization off-spine: `tokenUsageStatisticsUi.ts` and locale files; reused/extended.

## Migration / Refactor Sequence

1. In `TokenUsageTaskStatisticsTable.vue`, add local helper functions for sortable header state/action text:
   - active/inactive icon (`↑`, `↓`, `↕` or equivalent),
   - `aria-sort` value (`ascending`, `descending`, `none`/omitted as appropriate),
   - localized sort action label.
2. Update sortable header markup to use persistent button styling, visible icons, keyboard focus styling, and accessible labels.
3. Remove `Type` header/cells and `rowTypeLabel()` if unused.
4. Remove `Status` header/cells.
5. Change `Input Cost` and `Output Cost` cells from buttons to plain formatted values.
6. Change `Total Cost` cell to a persistently visible details button/control that includes the formatted total cost, visible detail affordance, `aria-label`, and `aria-expanded`.
7. Add inline non-complete status rendering near Total Cost using existing formatter status text/class; hide it for `apiCostStatus === 'estimated'`.
8. Update detail row `colspan` from `11` to `9`.
9. Add/update English and Chinese localization strings for sort/detail labels if not using existing copy.
10. Update `TokenUsageTaskStatisticsTable.spec.ts` fixtures/messages/assertions:
    - no `Type`/`Status` headers,
    - visible inactive sort indicators,
    - accessible active sort state,
    - explicit Total Cost details button opens breakdown,
    - non-complete status remains visible,
    - child attachment after sorting still passes.
11. Run focused tests when dependencies are available:
    - `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts`
    - Add model-table/store tests only if touched.

## Key Tradeoffs

- Removing `Type` improves scanability and width, but row-kind labels are no longer available in a dedicated column. This is acceptable because the row hierarchy and metadata already expose the same context.
- Removing standalone `Status` avoids repeated low-value `Complete estimate`, but non-complete statuses must be carefully preserved inline and in details.
- Replacing three cost-cell buttons with one Total Cost details control reduces duplicate interactions and hidden affordances, but users can no longer click input/output cost values directly. This is intentional because all three old buttons triggered the same row details.
- Keeping sort helpers local avoids over-abstracting, at the cost of some repeated template markup.

## Risks

- Accessibility regressions if icons are purely visual without labels. Mitigation: add `aria-label`, `aria-sort`, and testable attributes/text.
- Status regression if non-estimated states are hidden along with the Status column. Mitigation: inline exception badge plus existing breakdown status.
- Column-count mismatch could break detail-row layout. Mitigation: update `colspan` and tests.
- Locale fallback/missing key risk. Mitigation: update English and Chinese locale files plus test mocks.

## Guidance For Implementation

- Treat this as a localized `autobyteus-web` task-table change.
- Do not touch backend token usage code unless a test reveals a pre-existing unrelated problem.
- Prefer clear, simple Tailwind styling already used in the table. Suggested header button style: inline-flex with gap, rounded/focus ring, persistent neutral icon for inactive sortable headers, stronger text/icon for active header.
- Use existing formatter methods for status/cost labels. If adding a helper, place it in `tokenUsageStatisticsUi.ts` only if it is used by more than one rendering path; otherwise keep a local table predicate.
- Preserve `TokenUsageCostBreakdown.vue` status display.
- Keep tests focused on user-observable behavior rather than brittle class names where possible.
