# Design Spec

## Current-State Read

The Settings shell in `autobyteus-web/pages/settings.vue` owns the left navigation, active settings section, and mounting of `TokenUsageStatistics` for the `token-usage` section. The selected sidebar item remains the visible page identity: `Token Statistics`.

`autobyteus-web/components/settings/TokenUsageStatistics.vue` owns the token statistics control surface and local view state:

- date inputs: `startDate`, `endDate`
- local grouping/table selector: currently `activeTab: 'task' | 'model'`
- fetch action: `fetchStatistics(startDate, endDate)` through `useTokenUsageStatisticsStore`
- visible states: loading, error, task empty, model empty, task table, model table

The current branch already removed the duplicate visible main-content `Token Statistics` title and cleaned stale heading translations. However, the component still has a fragmented control layout:

1. a date/fetch card containing visible `Select Date Range:` and `Usage during period ⓘ`,
2. a separate lower `By Task` / `By Model` tab row with a divider,
3. then the results table or empty state.

That layout misclassifies `By Task` / `By Model` as page navigation. In code, it is local presentation/query state for which result projection/table to show. It belongs to the same token statistics filter/control surface as the date range and fetch action.

The target design must keep the existing data/store/query boundaries intact and only change the local UI structure, copy, and coverage around the Token Statistics controls.

## Intended Change

Replace the separate `By Task` / `By Model` tab row and redundant helper copy with one clean top filter/control card:

```text
[ Task ▾ ]   [ start date 📅 ] to [ end date 📅 ]   [ Fetch Statistics ]
```

Approved visible-copy rules:

- Use `Task` / `Model` in the grouping select, not `By Task` / `By Model`.
- Remove visible `Usage during period ⓘ`.
- Remove visible `Select Date Range:`.
- Do not add visible `Group by:`.
- Use non-visible labels or ARIA labels if accessibility needs names for the select/date inputs.

Behavior remains unchanged:

- default grouping remains task grouping, visibly `Task`;
- selecting `Model` switches to model results without changing dates;
- `Fetch Statistics` still calls the existing fetch path with only start/end dates;
- no store, GraphQL, backend, table-column, or cost calculation change.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, bounded to UI control ownership/presentation.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, local UI-structure refactor only.
- Evidence: `TokenUsageStatistics.vue` keeps `activeTab` as local component state and uses it to choose task vs model projection. The separate tab row visually implies page-level navigation even though the selector is part of the query/presentation controls. The card also renders `Usage during period ⓘ`, which repeats the obvious meaning of date range inputs.
- Design response: Make `TokenUsageStatistics.vue` own one cohesive filter/control card ordered as grouping select -> date range -> fetch; remove stale separate tab-row structure and redundant visible helper/labels.
- Refactor rationale: This is not a subsystem split or data-flow refactor. It is a local UI-boundary correction: controls serving the same token statistics query should be grouped under the same component-owned control surface.
- Intentional deferrals and residual risk, if any: No backend/store/table refactor is needed. Responsive pixel-perfect tuning can remain implementation-level, but wrapping must keep all filter controls inside one card.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read this design from:

1. data-flow spine,
2. ownership/control-surface model,
3. concrete file responsibilities,
4. migration/removal and coverage.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the obsolete visible main-content title path already removed in the current branch; remove the separate lower `By Task` / `By Model` tab row; remove visible `Usage during period ⓘ`; remove visible `Select Date Range:`; remove stale translations/tests/docs that exist only for the old layout.
- Decision rule: do not preserve old and new layouts through flags, wrappers, alternate branches, or compatibility toggles.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Settings > Token Statistics | Task/model statistics result table or empty state | `TokenUsageStatistics.vue` within Settings shell | Defines the visible UI path and which component owns the controls. |
| DS-002 | Bounded Local | User changes grouping select | Corresponding task/model projection is rendered | `TokenUsageStatistics.vue` | Defines grouping as local presentation/query state, not page navigation. |
| DS-003 | Primary End-to-End | User clicks `Fetch Statistics` | Store fetch updates task/model rows for selected date range | `tokenUsageStatisticsStore` behind `TokenUsageStatistics.vue` | Ensures UI cleanup does not change store/query API shape. |

## Primary Execution Spine(s)

- DS-001: `Settings sidebar selection -> Settings content mount -> TokenStatistics filter card -> TokenStatistics result projection -> Task/Model table or empty state`
- DS-003: `Filter card date inputs -> Fetch action -> tokenUsageStatisticsStore.fetchStatistics(startDate, endDate) -> GraphQL token usage projections -> Store rows -> Table render`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The settings shell selects the Token Statistics section and mounts the component. The component renders a single compact filter card followed by the selected result projection. | Settings shell, Token Statistics control surface, result projection | `TokenUsageStatistics.vue` for controls/results; `pages/settings.vue` for sidebar selection | Localization, component styling, durable UI docs |
| DS-002 | The user changes the first control from `Task` to `Model` or back. The component updates local grouping state and conditionally renders the corresponding table/empty state without altering dates. | Grouping select, local grouping state, conditional result projection | `TokenUsageStatistics.vue` | Accessible non-visible select labels, component tests |
| DS-003 | The user clicks Fetch Statistics. The component validates dates and calls the existing store method with start/end only. The store refreshes both task/model row sets as before. | Date range, fetch action, token usage statistics store, rows, table | `TokenUsageStatistics.vue` initiating; `tokenUsageStatisticsStore` data owner | GraphQL query layer remains unchanged |

## Spine Actors / Main-Line Nodes

- Settings shell (`pages/settings.vue`)
- Token Statistics control surface (`TokenUsageStatistics.vue` filter card)
- Local grouping state (`Task` / `Model` select value)
- Date range state (`startDate`, `endDate`)
- Fetch action (`fetchStatistics`)
- Token usage statistics store (`stores/tokenUsageStatistics.ts`)
- Result table projection (`TokenUsageTaskStatisticsTable`, `TokenUsageModelStatisticsTable`)

## Ownership Map

- `pages/settings.vue`: owns settings navigation, active section, and page mounting. Must not own Token Statistics filter internals.
- `TokenUsageStatistics.vue`: owns local UI state, filter card structure, grouping state, date inputs, fetch action, loading/error/empty/table selection. It is the governing owner for this change.
- `tokenUsageStatisticsStore`: owns data fetching, normalization, and cached task/model rows. It must not receive new grouping/range-mode arguments for this UI cleanup.
- Table components: own row rendering only. They do not own filter controls.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/settings.vue` token usage mount | `TokenUsageStatistics.vue` | Settings shell selects and displays section content. | Date inputs, grouping state, token statistics fetch semantics. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Separate lower `By Task` / `By Model` tab row | It misclassifies grouping as page navigation and wastes vertical space. | Grouping select inside `TokenUsageStatistics.vue` filter card | In This Change | Remove divider/spacing with it. |
| Visible `By Task` / `By Model` option labels | `By` is redundant once options are in a select/filter context. | Visible `Task` / `Model` select options | In This Change | Translation keys may keep names or be replaced depending localization ownership; visible output must be clean. |
| Visible `Usage during period ⓘ` helper | Date range already communicates period scope. | Date range inputs themselves | In This Change | Remove tooltip/title use and stale translation if no longer referenced. |
| Visible `Select Date Range:` label | The inputs plus `to` communicate the range in this compact control bar. | Non-visible/ARIA labels for accessibility if needed | In This Change | Do not remove accessible naming. |
| Prior delivery conclusions/artifacts from smaller scope | Scope expanded before finalization. | New design/implementation/delivery package | In This Change | Delivery pause report records state. |

## Return Or Event Spine(s) (If Applicable)

- Grouping select event: `select value change -> active grouping state update -> conditional table/empty state render`.
- Fetch event: `button click -> date validation -> store fetch -> reactive row update -> table render`.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `TokenUsageStatistics.vue`

- `Grouping select change -> set active grouping -> render task/model table branch`
- `Mounted -> initialize default date range -> fetchStatistics(startDate, endDate)`
- `Fetch button click -> guard missing dates -> call store -> loading/error/rows drive render branch`

These local spines matter because the layout change must not alter date lifecycle, default grouping, fetch call shape, or conditional table selection.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization | DS-001, DS-002 | `TokenUsageStatistics.vue` | Provide visible labels/options and accessible labels. | UI text must be localizable and stale keys removed. | Stale or redundant visible copy reappears. |
| Component tests | DS-001, DS-002, DS-003 | `TokenUsageStatistics.vue` | Guard layout semantics and behavior. | Prevent regression to title/helper/tab row. | UI structure can drift back unnoticed. |
| Prototype/docs sync | DS-001 | Delivery/docs owner later | Record durable UI expectation after implementation. | Prevent future UI prototype from reintroducing old layout. | Long-lived docs contradict implementation. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Token statistics controls | `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Extend | Existing component already owns controls, grouping, fetch, and table selection. | N/A |
| Token statistics data | `stores/tokenUsageStatistics.ts` | Reuse unchanged | Data behavior does not change. | N/A |
| Task/model rendering | Token usage table components | Reuse unchanged | Table rendering does not change. | N/A |
| Localization | Existing localization catalogs | Extend/cleanup | Existing localized keys should serve new visible/accessibility copy; stale keys removed. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Settings UI | Section selection and mounting | DS-001 | `pages/settings.vue` | Reuse unchanged | Do not move Token Statistics controls into shell. |
| Token Statistics UI | Filter card, grouping state, date state, fetch action, conditional result rendering | DS-001, DS-002, DS-003 | `TokenUsageStatistics.vue` | Extend/cleanup | Primary change target. |
| Token Usage Statistics Store | Fetch/normalize task and model row data | DS-003 | `tokenUsageStatisticsStore` | Reuse unchanged | No API change. |
| Localization | UI and accessibility text | DS-001, DS-002 | Component UI | Extend/cleanup | Remove stale visible-copy keys. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Token Statistics UI | Component boundary | Render clean filter card and preserve local control behavior | Existing component already owns this screen | Existing store/table imports |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Token Statistics UI tests | Component test boundary | Verify clean filter layout and behavior | Existing focused test file | Existing mocks |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` if needed | Localization | Settings catalog | New/changed option or accessibility labels | Existing source catalogs own manual keys | N/A |
| generated settings catalogs if applicable | Localization | Generated catalog | Remove stale generated old-layout keys or reflect generated output | Existing runtime imports generated catalogs | N/A |
| `ui-prototypes/token-statistics-task-cost/*` | Durable UI docs | Prototype docs | Update after implementation/delivery | Existing prototype owns this UI behavior | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| None for this scope | N/A | N/A | Local component cleanup only | N/A | N/A | A new shared UI abstraction for one select |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Existing store row types | Yes | N/A | Low | No change. |
| Local grouping state | Yes | Yes, visible `By` removed from option copy | Low | Keep internal values as `task`/`model`; map to visible `Task` / `Model`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Token Statistics UI | Component boundary | Replace tab row/helper labels with clean filter card ordered grouping select -> dates -> fetch | One component owns this screen's controls | Store and table components |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Token Statistics UI tests | Component test boundary | Assert no duplicate title, no usage helper, no visible `Select Date Range:`, no old tab row, select has `Task` / `Model`, behavior unchanged | Existing tests already cover this screen | Existing mocks |
| Localization catalogs | Localization | Settings UI text boundary | Remove stale old-layout copy; add non-visible/accessibility labels if needed | Existing localization ownership | N/A |
| `tickets/in-progress/token-statistics-remove-header/text-ui-filter-control-design.md` | Task artifact | Design reference | Normative text UI for implementation/review | User requested explicit text UI | N/A |

## Ownership Boundaries

`TokenUsageStatistics.vue` remains the authoritative UI owner for the token statistics control surface. Callers above it, including `pages/settings.vue`, should not know whether the grouping selector is a select, segmented control, or tab row. The store remains the authoritative owner of token usage statistics data fetching and normalization; the UI should not add a grouping argument to the store fetch path.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenUsageStatistics.vue` | grouping state, date inputs, fetch button, render branch | Settings shell | Settings shell directly rendering grouping/date controls | Keep/extend component props/state locally, not shell-owned controls |
| `tokenUsageStatisticsStore.fetchStatistics(startDate, endDate)` | GraphQL queries and row normalization | `TokenUsageStatistics.vue` | UI adding new range/grouping API semantics for layout-only change | Only change if data requirements change, which they do not |

## Dependency Rules

Allowed:

- `pages/settings.vue` imports and mounts `TokenUsageStatistics.vue`.
- `TokenUsageStatistics.vue` imports `useTokenUsageStatisticsStore` and table components.
- `TokenUsageStatistics.vue` uses localization for visible and accessibility text.
- Tests mount `TokenUsageStatistics.vue` with mocked store/localization.

Forbidden:

- Do not move token statistics controls into `pages/settings.vue`.
- Do not make table components own grouping/date controls.
- Do not add a new store/API parameter for grouping or range mode.
- Do not keep old and new grouping layouts simultaneously.
- Do not keep stale visible copy through hidden but still rendered DOM that appears in component text.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `fetchStatistics(startDate, endDate)` in component | Selected date range | Validate and request stats | ISO date strings from date inputs | Unchanged. |
| `store.fetchStatistics(startDate, endDate)` | Token usage data | Fetch task/model projections for date range | start date, end date | Must remain two-argument call. |
| Grouping select change | Result projection | Choose task vs model local view | `task`/`model` internal values | Visible labels are `Task` / `Model`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `store.fetchStatistics(startDate, endDate)` | Yes | Yes | Low | Preserve unchanged. |
| Grouping select | Yes | Yes | Low | Use internal values `task`/`model`; visible labels clean. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Token statistics screen | `TokenUsageStatistics` | Yes | Low | No rename. |
| `activeTab` local state | Proposed internal `selectedGrouping` or `activeGrouping` | Current name is acceptable but tab-biased | Medium | Implementation should rename if low-friction to avoid tab terminology drift. |
| Visible grouping options | `Task`, `Model` | Yes | Low | Remove visible `By`. |

## Applied Patterns (If Any)

- Local select/dropdown control: solves one-of-two grouping selection inside one component owner.
- Existing store pattern: reused unchanged for date-range fetch.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | File | Token Statistics UI | Clean filter card and result projection selection | Existing screen component | Store/query changes or settings shell navigation |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | File | Token Statistics UI tests | Regression coverage for clean filter layout and unchanged behavior | Existing focused component test | Backend/API concerns |
| `autobyteus-web/localization/messages/*/settings*.ts` | File(s) | Localization | Visible/accessibility labels and stale key cleanup | Existing settings localization | Old visible helper/title keys if unused |
| `ui-prototypes/token-statistics-task-cost/` | Folder | Durable UI prototype docs | Update final approved layout after implementation | Existing durable UI spec area | Superseded old tab-row behavior |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/settings` | Main-Line Domain-Control for settings UI | Yes | Low | Existing settings component placement is correct. |
| `components/settings/token-usage` | Result table subcomponents | Yes | Low | No change needed. |
| `localization/messages` | Off-Spine Concern | Yes | Low | Existing text catalogs. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Clean filter card | `[ Task ▾ ] [ start date ] to [ end date ] [ Fetch Statistics ]` | `Group by: [ By Task ▾ ] Select Date Range: [date] Usage during period ⓘ` | Avoids redundant words and keeps controls cohesive. |
| Grouping state | Internal `task`/`model`; visible `Task` / `Model` | Visible `By Task` / `By Model` tab row | Dropdown context already supplies the relationship. |
| Results placement | Filter card, then table/empty state | Filter card, tab row/divider, then table | Removes wasted vertical space. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old tab row while adding select | Could reduce risk by preserving old UI | Rejected | Replace tab row with select only. |
| Keep `Usage during period ⓘ` for explanation | Existing visible helper | Rejected | Remove; date range is self-explanatory. |
| Keep `By Task` / `By Model` labels in dropdown | Existing translation labels | Rejected | Use visible `Task` / `Model`; clean stale visible copy. |
| Feature flag old/new layout | Could support comparison | Rejected | Clean UI replacement only. |

## Derived Layering (If Useful)

UI shell -> Token Statistics component -> Store -> GraphQL/backend. This task only changes the Token Statistics component UI layer and localization/test/docs around it.

## Migration / Refactor Sequence

1. Keep current committed duplicate-title removal and stale heading cleanup.
2. In `TokenUsageStatistics.vue`, replace the lower tab-row buttons with a select/dropdown inside the top filter card as the first control.
3. Use internal grouping values compatible with current render branches (`'task' | 'model'`), but visible labels `Task` / `Model`.
4. Remove visible `Select Date Range:` label and `Usage during period ⓘ` span/title from the filter card.
5. Preserve date inputs, `to`, fetch button, mounted default date initialization, and fetch call shape.
6. Update tests to assert:
   - no visible duplicate page title;
   - no visible `Usage during period`;
   - no visible `Select Date Range:`;
   - no lower tab-row structure;
   - first control/select shows `Task` by default and can switch to `Model`;
   - fetch still passes only start/end dates;
   - task/model table branches still render correctly.
7. Remove stale localization keys or add non-visible/accessibility labels through existing localization conventions as needed.
8. Update durable UI prototype/docs during delivery after implementation passes review and validation.

## Key Tradeoffs

- A select/dropdown is more compact and cleaner than two buttons, but it adds one click to switch grouping. The user explicitly prefers the select-style control for this clean filter bar.
- Removing visible labels improves clarity and space usage but increases the need for correct accessible labeling. Use non-visible labels/ARIA rather than reintroducing redundant visible text.
- Renaming internal `activeTab` to `selectedGrouping` improves semantic clarity; implementation should do it if the edit remains small and local.

## Risks

- Accessibility regression if visible labels are removed without replacement accessible names. Mitigation: keep `id`/label pairs with `sr-only` or ARIA labels.
- Tests may use visible text selectors that need updating from `By Task`/`By Model` to `Task`/`Model`.
- Existing localization keys for `byTask`/`byModel` may still be used elsewhere only in this component; update or replace carefully and run localization audit.
- Prior delivery Electron build is stale relative to expanded design; delivery should rebuild if user verification needs packaged artifacts.

## Guidance For Implementation

- Prefer a native `<select>` or existing project select styling if available; keep it compact and visually aligned with date inputs.
- Use visible options `Task` and `Model` only.
- Keep non-visible accessible labels for the select and date inputs.
- Do not add visible helper text.
- Remove old lower tab-row markup entirely.
- Keep table components and store unchanged.
- Update tests before handoff to code review.
