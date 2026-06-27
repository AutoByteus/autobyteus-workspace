# Design Spec

## Current-State Read

The original task already went through architecture review, implementation, code review, and API/E2E for a five-column Team token usage table. The current code state in `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` is no longer the old stacked/card layout. It now renders one semantic table with a scoped horizontal-scroll wrapper, headers `Member`, `Gross input`, `Output`, `Total tokens`, and `Cost`, and a standalone final Cost cell containing total cost/status plus an input/output cost split.

After that validation, the user refined the desired layout and selected Option B: place each token amount together with its corresponding cost. This changes the table's semantic grouping. The stable table and scoped horizontal scrolling remain correct, but the Cost-last five-column contract is now stale.

Current boundaries remain healthy:

- `RightSideTabs.vue` owns right-side tab mounting and should remain unchanged.
- `TokenUsageMeterPanel.vue` owns the Token Meter hierarchy and delegates the Team comparison to `TeamTokenUsageSummary.vue`.
- `useTokenUsageWorkspaceScope.ts` owns data/focus/hydration and already supplies `teamRows` plus `teamTotalSummary`.
- `TokenUsageRunSummary` already contains the needed paired fields: token counts and estimated input/output/total costs.
- `tokenUsageFormatting.ts` already owns cost/status formatting and should be reused.

The design-impact change is therefore local presentation semantics: revise `TeamTokenUsageSummary.vue` from a five-column Cost-last table to a four-logical-column grouped metric table.

## Intended Change

Render the Team comparison as one semantic table with these logical columns:

1. `Member`
2. `Gross Input`
3. `Output`
4. `Total`

Each metric column renders a grouped cell:

- primary line: token count
- secondary line: corresponding cost
- for the `Total` column only: compact overall price status beside or under the total cost; normal estimated rows do not display a status word

Mapping:

| Column | Token value | Cost value | Status display |
| --- | --- | --- | --- |
| `Gross Input` | `summary.grossInputTokens` | `summary.estimatedApiInputCost` | Cost formatted through existing `formatCost`; no separate badge required. |
| `Output` | `summary.outputTokens` | `summary.estimatedApiOutputCost` | Cost formatted through existing `formatCost`; no separate badge required. |
| `Total` | `summary.totalTokens` | `summary.estimatedApiTotalCost` | Cost formatted through existing `formatCost`; show no normal estimate-status label. Exceptional non-normal states may use existing specific text only when the numeric cost alone would be misleading, such as partial, missing, local/no-bill, or mixed price data. |

The table must not render a standalone `Cost` header or fifth Cost cell. Normal rows must not render `Estimate` or `Complete estimate` in the metric cells. The Team subtitle should explain once that the cost sublines are estimated API costs and that Total cost is the input cost plus output cost. Horizontal scrolling remains scoped to the Team table region when the panel is too narrow.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): No broad architecture issue found; this is a UX design-impact reset of presentation semantics.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No architecture refactor needed. A local presentation revision inside `TeamTokenUsageSummary.vue`, its tests, and downstream docs/coverage is required.
- Evidence: API/E2E rerouted after the user explicitly selected Option B. Current implementation has the correct semantic table/scoped scroll owner but encodes the stale five-column Cost-last contract. Existing summary data and formatter boundaries already support the grouped layout.
- Design response: Keep the existing data-flow and semantic table owner. Remove the standalone Cost column. Introduce grouped metric cells pairing token count with matching cost. Remove normal visible estimate-status copy from rows and move estimation explanation to the Team subtitle. Recalibrate CSS/tests/browser validation for a four-logical-column table.
- Refactor rationale: `TeamTokenUsageSummary.vue` remains the correct presentation owner. No new component, store shape, GraphQL query, or backend endpoint is needed.
- Intentional deferrals and residual risk, if any: Sticky columns, sorting, cache breakdown inside each team row, and full Token tab redesign remain out of scope. Residual risk is visual tuning of grouped cell spacing and table minimum width.

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
- Required action: remove the now-stale five-column Cost-last contract from `TeamTokenUsageSummary.vue`, its tests, API/E2E expectations, and docs. Do not retain both five-column and grouped layouts behind width breakpoints or feature flags.
- The old stacked/card branch is already removed and must remain removed.
- Treat removal as first-class design work: grouped token+cost metric cells replace the separate Cost column as the sole in-scope table contract.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Token tab in team workspace | User compares member tokens and corresponding costs in grouped Team table | Token tab presentation boundary (`TokenUsageMeterPanel` delegating to `TeamTokenUsageSummary`) | Shows that only the Team comparison presentation changes while token accounting stays unchanged. |
| DS-002 | Return-Event | Focused team member changes in team context | Focused row and primary summary update in Token tab | `useTokenUsageWorkspaceScope.ts` data boundary | Focused row highlighting must survive the grouped table rewrite. |
| DS-003 | Bounded Local | `TeamTokenUsageSummary` receives rows/summary props | Grouped metric table rows/cells are rendered with formatted values | `TeamTokenUsageSummary.vue` | This local rendering loop owns the stale Cost column and the new token+cost grouped cells. |

## Primary Execution Spine(s)

DS-001: `RightSideTabs Token selection -> TokenUsageMeterPanel -> useTokenUsageWorkspaceScope rows/total -> TeamTokenUsageSummary -> Horizontally scrollable grouped token+cost Team table`

DS-002: `Team focus state update -> useTokenUsageWorkspaceScope focused row recompute -> TokenUsageMeterPanel Team props -> TeamTokenUsageSummary focused row styling`

DS-003: `TeamTokenUsageSummary props -> Row rendering loop -> Existing formatters -> Grouped metric cells -> Scoped horizontal scroll wrapper`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The right-side Token tab mounts the Token Meter panel. The panel reads already-owned Token tab scope data and delegates team comparison rendering. The component renders one grouped table and lets its wrapper scroll horizontally if the right pane is too narrow. | Token tab, Token tab scope, Team comparison table | `TokenUsageMeterPanel.vue` for tab hierarchy; `TeamTokenUsageSummary.vue` for team comparison presentation | Formatting, localization, CSS overflow containment |
| DS-002 | When the focused team member changes, the existing scope composable recomputes focused row and primary summary. The grouped table preserves row identity attributes, focused badge, and row highlight. | Focused team row, primary summary, Team table row | `useTokenUsageWorkspaceScope.ts` for data resolution; `TeamTokenUsageSummary.vue` for visual focus | Focused badge, row highlight CSS |
| DS-003 | Inside the component, every row maps to one table row. Summary rows produce `Member`, `Gross Input`, `Output`, and `Total` cells. Each metric cell owns both token count and cost subline. Missing-summary rows span metric columns with the existing loading/error/no-usage state. | Member row, grouped metric cell, Team total row | `TeamTokenUsageSummary.vue` | Existing token/cost formatter helpers, missing/loading state labels |

## Spine Actors / Main-Line Nodes

- Right-side tab shell (`RightSideTabs.vue`)
- Token Meter panel (`TokenUsageMeterPanel.vue`)
- Token tab data boundary (`useTokenUsageWorkspaceScope.ts`)
- Team comparison presentation (`TeamTokenUsageSummary.vue`)
- Grouped metric table cells
- Scoped scrollable table region

## Ownership Map

- `RightSideTabs.vue`: owns right-side tab selection and mounting. It must not own Token tab table layout details.
- `useTokenUsageWorkspaceScope.ts`: owns Token tab data resolution, focused member selection, loading/error state, and team total lookup. It must not own DOM layout or grouped-cell formatting decisions.
- `TokenUsageMeterPanel.vue`: owns top-level Token Meter hierarchy and passes team comparison props. It must remain presentation-only and must not recalculate prices.
- `TeamTokenUsageSummary.vue`: owns Team comparison layout, grouped metric cell rendering, focused visual state, and scoped horizontal overflow behavior.
- `tokenUsageFormatting`: owns formatting of token counts, costs, statuses, and detail titles. It should be reused unchanged.
- Localization catalogs: own user-visible labels. If the `Total` header does not already have a suitable key, add a focused token-usage key rather than hard-coding.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RightSideTabs.vue` Token tab mount | `TokenUsageMeterPanel.vue` | Routes the right-side tab content. | Team comparison layout or token usage calculation. |
| `TokenUsageMeterPanel.vue` team summary child mount | `TeamTokenUsageSummary.vue` | Places the Team comparison within the Token Meter hierarchy. | Per-row grouped metric behavior or horizontal scroll CSS. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Standalone `Cost` table column in `TeamTokenUsageSummary.vue` | User selected grouping each metric's cost with its token amount. | Grouped metric cells in `TeamTokenUsageSummary.vue`. | In This Change | Remove cost `<col>`, Cost header, and fifth Cost cell for member and total rows. |
| `In … · Out …` split inside final Cost cell | Input/output costs now live under the matching `Gross Input` and `Output` columns. | Gross Input and Output cost sublines. | In This Change | Do not duplicate the split elsewhere. |
| Tests asserting headers `[Member, Gross input, Output, Total tokens, Cost]` | Encodes stale UX contract. | Tests asserting `[Member, Gross input, Output, Total]` and grouped cell contents. | In This Change | Also assert no standalone Cost header/cell. |
| Browser/API-E2E evidence for scroll-to-Cost-column | Evidence validates old contract only. | New grouped-table browser/API-E2E validation. | Follow-up | API/E2E should re-investigate after implementation. |
| Delivery docs wording for five-column table and Cost-last proof | Docs were updated before user selected Option B. | Docs describing grouped metric columns. | Follow-up | Delivery docs sync after new implementation/testing. |
| Old stacked/card responsive branch | Already removed by first implementation and still invalid. | One semantic table with scoped horizontal scroll. | Keep Removed | Do not reintroduce as mobile compatibility behavior. |

## Return Or Event Spine(s) (If Applicable)

DS-002 covers the relevant return/event path: focus changes already flow through team context/store state into `useTokenUsageWorkspaceScope.ts`, then into `TeamTokenUsageSummary.vue` via props. The grouped layout must not introduce a new focus event pathway.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TeamTokenUsageSummary.vue`
- Local spine: `props.rows/teamTotalSummary -> render tbody rows -> render grouped metric cells -> use existing token/cost/status formatters -> apply row classes/data attributes -> table wrapper controls horizontal overflow`
- Why it matters: this is where the stale standalone Cost column lives and where the replacement must remain contained.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Token/cost/status formatting | DS-001, DS-003 | `TeamTokenUsageSummary.vue` | Format token integers, cost strings, status labels, and detail titles. | Keeps display formatting consistent with primary Token Meter cards. | Reimplementing in row rendering could create inconsistent price/missing-state behavior. |
| Localization labels | DS-001, DS-003 | `TeamTokenUsageSummary.vue` | Provide table headers/status labels, including `Total` if a new key is needed. | Avoids hard-coded strings. | Hard-coded labels would violate localization pattern. |
| Scoped horizontal overflow CSS | DS-001, DS-003 | `TeamTokenUsageSummary.vue` | Keep horizontal scrolling inside Team table region. | Prevents the whole right-pane content from sideways scrolling. | If placed on parent shell, other Token tab sections can become awkward or clipped. |
| Component tests | DS-001, DS-002, DS-003 | Token usage frontend components | Guard grouped headers, focused row, grouped token+cost cells, Team total. | Captures the refined presentation contract. | Testing only text presence would miss regression to Cost-last layout. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team token comparison data | `useTokenUsageWorkspaceScope.ts` | Reuse | Already owns focused/team row summaries. | N/A |
| Team comparison presentation | `TeamTokenUsageSummary.vue` | Extend/Modify | Existing local owner of affected UI. | N/A |
| Formatting | `tokenUsageFormatting` | Reuse | Existing formatting contract for token/cost/status text. | N/A |
| Localization | Existing shell message catalogs | Extend if needed | Header label `Total` may need a precise localized key. | N/A |
| Tests | Colocated Vitest component tests | Extend/Modify | Existing coverage for Token Meter and team rows. | N/A |
| Durable docs | Existing `autobyteus-web/docs/*` Token Usage Meter sections | Extend/Modify in delivery | Existing docs already describe the Token tab boundary. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend right-side workspace tabs | Mounting Token tab content | DS-001 | `RightSideTabs.vue` | Reuse unchanged | No layout changes here. |
| Token usage workspace scope | Team row/summary/focused data | DS-001, DS-002 | `useTokenUsageWorkspaceScope.ts` | Reuse unchanged | Keep presentation concerns out. |
| Token usage presentation | Token Meter hierarchy and grouped Team table | DS-001, DS-003 | `TokenUsageMeterPanel.vue`, `TeamTokenUsageSummary.vue` | Extend/Modify | Local component change only. |
| Localization | User-facing shell labels | DS-003 | `TeamTokenUsageSummary.vue` | Extend if needed | Add/adjust `Total` header label only if no existing key fits. |
| Frontend test coverage | Component-level Token tab structure/behavior | DS-001, DS-002, DS-003 | Colocated tests | Extend/Modify | Tests should assert new grouped contract. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Token usage presentation | Team comparison presentation | Convert five-column Cost-last table to four-logical-column grouped token+cost table. | Existing owner of exact UI. | Reuses `tokenUsageFormatting` and existing localization keys. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Frontend test coverage | Token Meter component tests | Update assertions for grouped headers/cells and absence of standalone Cost column. | Existing colocated coverage. | Reuses test builders. |
| `autobyteus-web/localization/messages/en/shell.ts` | Localization | English shell labels | Add `shell.tokenUsage.total` or equivalent if implementation chooses a new `Total` label. | Existing source catalog. | N/A |
| `autobyteus-web/localization/messages/zh-CN/shell.ts` | Localization | Chinese shell labels | Add matching `Total` label if new English key is added. | Existing source catalog. | N/A |
| Generated localization/catalog files, if required by repo workflow | Localization | Generated catalogs | Keep generated catalogs/tests aligned with source messages. | Existing localization workflow. | N/A |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable docs | Token Usage Meter docs | Update stale five-column wording during delivery. | Existing architecture docs. | N/A |
| `autobyteus-web/docs/settings.md` | Durable docs | Duplicated settings docs | Mirror Token Usage Meter wording update. | Existing duplicated docs. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Token/cost/status formatting | Existing `tokenUsageFormatting` | Token usage presentation | Already shared between primary cards and team rows. | Yes | Yes | A new duplicated formatting helper. |
| Grouped metric cell helper | None recommended initially | `TeamTokenUsageSummary.vue` | Repeated markup may be small enough to keep local. If duplication becomes bulky, extract a local render helper inside the component only. | N/A | N/A | A generic cross-feature table/metric framework. |
| Table column definitions | None recommended for this scope | `TeamTokenUsageSummary.vue` | Only used by one component. | N/A | N/A | A generic table schema abstraction. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageTeamMemberRow` | Yes | N/A | Low | Reuse unchanged. |
| `TokenUsageRunSummary` | Yes for this scope | N/A | Low | Reuse unchanged; do not add presentation fields. |
| Potential `Total` localization key | Yes | N/A | Low | Add only one clear key if needed; do not overload `totalTokens` for a token+cost column if label says `Total`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Token usage presentation | Team comparison presentation | Grouped metric table rendering, table wrapper overflow, row/focused/total/status styling, no standalone Cost column. | Existing component owns Team comparison UI. | Yes: existing props, localization, formatters. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Frontend test coverage | Token Meter component coverage | Assert grouped header order, paired token+cost values, focused row attributes, total final row, no Cost column, scroll wrapper. | Existing tests already build team contexts and summaries. | Yes: existing test helpers. |
| `autobyteus-web/localization/messages/en/shell.ts` and `zh-CN/shell.ts` if needed | Localization | Shell Token tab labels | Add localized `Total` header key if implementation does not reuse an existing suitable key. | User-facing header text belongs in catalogs. | N/A |
| Generated localization/catalog files if required | Localization | Generated message artifacts | Keep generated catalogs consistent with source message additions. | Existing localization build/test flow. | N/A |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable docs | Token Usage Meter docs | Documentation wording update during delivery. | Existing docs source. | N/A |
| `autobyteus-web/docs/settings.md` | Durable docs | Settings docs mirror | Documentation wording update matching architecture docs. | Existing duplicated docs source. | N/A |

## Ownership Boundaries

The authoritative boundary for Token tab data remains `useTokenUsageWorkspaceScope.ts`. `TeamTokenUsageSummary.vue` must continue receiving already-resolved row data via props and must not call stores, fetch summaries, compute focused member identity, or recalculate token/cost totals.

The authoritative boundary for Team comparison presentation is `TeamTokenUsageSummary.vue`. It owns the grouped cell markup and CSS. Parent components should not render alternate Team table cells or pass preformatted display fragments.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useTokenUsageWorkspaceScope.ts` | Store reads, hydration requests, focused member resolution, team row construction | `TokenUsageMeterPanel.vue` | `TeamTokenUsageSummary.vue` directly reading stores or resolving team focus. | Add explicit returned fields to the composable, not direct child store reads. |
| `TeamTokenUsageSummary.vue` | Table markup, grouped metric cells, horizontal overflow CSS, row presentation | `TokenUsageMeterPanel.vue` | Parent rendering Cost vs grouped-cell variants or applying table breakpoint classes. | Add props only if a real presentation contract is missing. |
| `tokenUsageFormatting` | Token/cost/status formatting helpers | `TokenUsageMeterPanel.vue`, `TeamTokenUsageSummary.vue` | Recreating missing/local/mixed cost formatting inside table cells. | Extend formatter helper if a new display primitive is genuinely needed. |
| Localization catalogs | User-facing labels | Vue components | Hard-coded `Total` label in component/test only. | Add a localized message key. |

## Dependency Rules

Allowed:

- `RightSideTabs.vue` may mount `TokenUsageMeterPanel.vue`.
- `TokenUsageMeterPanel.vue` may call `useTokenUsageWorkspaceScope()` and pass resulting props to `TeamTokenUsageSummary.vue`.
- `TeamTokenUsageSummary.vue` may use existing localization and `tokenUsageFormatting` helpers.
- `TeamTokenUsageSummary.vue` may read existing summary fields on its props to render grouped metric cells.
- Tests may mount `TokenUsageMeterPanel.vue` and inspect rendered grouped Team table structure.

Forbidden:

- `TeamTokenUsageSummary.vue` must not fetch token usage, read stores directly, or calculate summaries.
- `TokenUsageMeterPanel.vue` must not duplicate Team row table rendering or construct preformatted metric fragments.
- The implementation must not keep the stale five-column Cost-last table as a compatibility path.
- The implementation must not reintroduce old stacked/card rows.
- The implementation must not change backend/server token accounting APIs for this presentation request.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamTokenUsageSummary` props | Team usage comparison presentation | Render rows, team total, loading/error state | `TokenUsageTeamMemberRow[]`, `TokenUsageRunSummary | null`, loading/error flags | Preserve prop contract. |
| `createTokenUsageFormatter(t)` | Token/cost display formatting | Format values and statuses | Numeric summary fields and `apiCostStatus`/currency | Reuse unchanged. |
| `useTokenUsageWorkspaceScope()` returned fields | Token tab data scope | Provide primary/team usage state | Active run/team context from stores | Reuse unchanged. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamTokenUsageSummary` props | Yes | Yes | Low | No prop change expected. |
| `useTokenUsageWorkspaceScope()` | Yes | Yes | Low | No change. |
| `tokenUsageFormatting` helpers | Yes | N/A | Low | No change. |
| New/selected `Total` localization key | Yes | N/A | Low | Add if needed; keep meaning specific to total metric column. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team comparison component | `TeamTokenUsageSummary` | Yes | Low | Keep. |
| Table wrapper | `team-token-table-scroll` / `data-test="team-token-table-scroll"` | Yes | Low | Keep. |
| Table element | `team-token-table` / `data-test="team-token-table"` | Yes | Low | Keep. |
| Grouped metric cell | Proposed `team-token-metric-cell` with token/cost children | Yes | Low | Use concrete metric naming. |
| Stale cost cell | `team-token-cost-cell` | No for target | High | Remove or repurpose only if renamed semantically; prefer remove. |
| Normal estimate status copy | `Estimate` / `Complete estimate` in row cells | No for target | Medium | Move estimate explanation to the Team subtitle; show exceptional statuses only when needed. |

## Applied Patterns (If Any)

- Presentation component pattern: `TeamTokenUsageSummary.vue` remains a pure presentation component over props.
- Semantic table pattern: use native table semantics because the subject is row/column comparison data.
- Grouped metric cell pattern: each metric column owns the token amount and matching cost together.
- Scoped overflow container: keep horizontal scroll localized to the component-owned table region.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | File | Team comparison presentation | Render semantic grouped metric table, row states, Team total final row, focused styling, scoped horizontal scroll. | Existing component owns affected UI. | Store reads, data hydration, pricing calculations, duplicate formatter logic, stale Cost column. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | File | Token Meter component tests | Verify grouped table structure and existing focused/team behavior. | Existing colocated tests already cover this component path. | Browser-layout assertions that JSDOM cannot prove. |
| `autobyteus-web/localization/messages/en/shell.ts` | File | English shell labels | Add/update `Total` metric label if needed. | Existing Token tab labels live here. | Hard-coded UI-only test labels. |
| `autobyteus-web/localization/messages/zh-CN/shell.ts` | File | Chinese shell labels | Add/update corresponding label if needed. | Existing Token tab labels live here. | Divergent key set from English. |
| `autobyteus-web/docs/agent_execution_architecture.md` | File | Durable architecture docs | Delivery-stage wording update for grouped metric table behavior. | Existing Token Usage Meter docs. | Stale five-column Cost-last wording. |
| `autobyteus-web/docs/settings.md` | File | Durable settings/docs mirror | Delivery-stage wording update matching architecture docs. | Existing duplicated Token Usage Meter docs. | Conflicting wording from architecture docs. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/` | Presentation | Yes | Low | Token usage UI components are already colocated here. |
| `autobyteus-web/composables/` | Presentation data boundary/composable | Yes | Low | No change; data boundary remains separate. |
| `autobyteus-web/localization/messages/` | Localization | Yes | Low | User-facing labels belong here if a new Total label is needed. |
| `autobyteus-web/docs/` | Durable docs | Yes | Low | Delivery docs sync only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Header shape | `Member | Gross Input | Output | Total` | `Member | Gross Input | Output | Total Tokens | Cost` | Captures the user's Option B grouping. |
| Gross Input cell | Token line `117.1K`; cost subline `In $0.0676` or `$0.0676` under the same Gross Input column. | Input token count in one column and input cost hidden in a separate Cost split. | User wants token and corresponding cost together. |
| Output cell | Token line `238`; cost subline `Out $0.0071` or `$0.0071` under Output. | Output cost only visible in a far-right Cost cell. | Keeps reading natural by metric. |
| Total cell | Token line `117.3K`; cost subline `$0.0747`. | Total token count in one column and total cost in a separate standalone Cost column, or redundant visible estimate-status copy such as `$0.0747 Complete estimate` / `$0.0747 Estimate`. | Total owns the aggregate cost without redundant wording; the header explains costs are estimates. |
| Missing summary row | `<tr><th scope="row">Member</th><td colspan="3">Loading token usage…</td></tr>` | Render status block outside the table or span four metric columns from old five-column shape. | Keeps table shape coherent after column-count change. |
| Ownership | `TeamTokenUsageSummary` changes DOM/CSS only. | `useTokenUsageWorkspaceScope` returns preformatted display fragments. | Keeps data boundary clean. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep five-column Cost-last table and add grouped cost sublines too | Could preserve previous implementation and tests. | Rejected | Remove standalone Cost column; grouped metric cells become authoritative. |
| Support both five-column and grouped table via breakpoint/feature flag | Could avoid immediate docs/test churn. | Rejected | One grouped table layout at all widths; scoped horizontal scroll handles narrow panels. |
| Reintroduce old stacked/card narrow layout with grouped labels | Could avoid horizontal scrolling on small widths. | Rejected | User requested table/scroll direction; card collapse was original problem. |
| Add backend/store display fields for grouped cells | Could make presentation easy. | Rejected | Existing summary fields already map directly to grouped cells. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

Layering is unchanged:

`Right-side tab shell -> Token tab presentation -> Token tab scope composable -> stores/API` for data, with `TeamTokenUsageSummary.vue` as a leaf presentation component. The revised implementation should only touch the leaf presentation layer, localization if needed, and colocated tests.

## Migration / Refactor Sequence

1. Update the Team section subtitle/copy so it explains once that table costs are estimated API costs and Total cost is input cost plus output cost.
2. In `TeamTokenUsageSummary.vue`, preserve the semantic table wrapper and row identity hooks from the current implementation:
   - Keep `data-test="team-token-table-scroll"` and `data-test="team-token-table"`.
   - Keep `data-test="team-token-row"`, `data-focused`, and `data-member-route-key` on member rows.
   - Keep `data-test="team-token-total-row"` for final Team total row.
3. Change table columns:
   - Remove the Cost `<col>` and Cost `<th>`.
   - Change the total header from `Total tokens` to `Total` using a localized label. Add a precise localization key if needed.
   - Update empty/no-summary row `colspan` from `4` metric columns in the five-column table to `3` metric columns after `Member`.
4. Introduce grouped metric cell markup:
   - Gross Input cell: token value + input cost subline.
   - Output cell: token value + output cost subline.
   - Total cell: total token value + total cost; do not show normal estimate-status copy.
   - Use existing `formatCompactInteger`, `formatTokenDetail`, `formatCost`, and `formatStatus`.
5. Update scoped CSS:
   - Recalibrate table `min-width` for four logical columns.
   - Replace cost-cell specific width/classes with grouped metric cell classes.
   - Keep numeric alignment and focused/total row backgrounds.
   - Ensure cost sublines remain readable and associated with their token values.
6. Update `TokenUsageMeterPanel.spec.ts`:
   - Assert header order `Member`, `Gross input`, `Output`, `Total`.
   - Assert no `Cost` header and no fifth Cost cell.
   - Assert reviewer/lead rows have four cells (`th + 3 td`).
   - Assert Gross Input cell contains input token count and input cost; Output cell contains output token count and output cost; Total cell contains total token count and total cost, and normal estimated rows show neither `Estimate` nor `Complete estimate`.
   - Preserve assertions for focused primary summary, row `data-focused`, route key, scroll wrapper/table hooks, and Team total final row.
7. If a new localization key is added, update source and generated localization artifacts/tests according to the repo's existing localization workflow.
8. Run targeted frontend tests when dependencies are available, following `autobyteus-web/AGENTS.md`: `pnpm test:nuxt --run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` from `autobyteus-web` or equivalent workspace command. Include localization tests if localization files/generated catalogs are changed.
9. Code review must re-review the updated component/tests/localization.
10. API/E2E must produce a fresh coverage investigation and browser validation against the grouped contract because prior API/E2E evidence targeted the stale Cost-last contract.
11. Delivery docs sync should update `autobyteus-web/docs/agent_execution_architecture.md` and `autobyteus-web/docs/settings.md` to describe grouped metric columns, not Cost-last columns.

## Key Tradeoffs

- Grouped metric columns vs. separate Cost column: grouped columns make reading more natural by pairing amount and cost immediately. This is preferred because the user selected Option B explicitly.
- Header-level estimate explanation vs. per-row estimate wording: explaining once in the Team subtitle keeps rows clean while still telling users the money values are estimated API costs. Component costs still use existing `formatCost` so missing/local/mixed cases remain visible at the component level.
- Four columns vs. five columns: four logical columns reduce horizontal scroll pressure but each metric cell becomes denser. This aligns with the user's preference.
- No sticky columns: simpler and less risky for this scope. Sticky behavior can be revisited separately.

## Risks

- The first grouped implementation pass may need width and typography tuning for token/cost sublines.
- If `formatCost` returns `Mixed currencies/providers` or `Local / no API bill` in multiple metric cells, the row may become text-heavy. Implementation may need subline styling to keep exceptional statuses readable without adding normal estimate wording.
- Tests running in JSDOM cannot prove actual overflow rendering; browser/e2e evidence should cover the constrained-width case.
- Existing delivery docs changes in the worktree are stale and must be updated after implementation.

## Guidance For Implementation

- Keep the implementation focused on `TeamTokenUsageSummary.vue`, its colocated Token Meter tests, and localization only if needed.
- Do not change `useTokenUsageWorkspaceScope.ts`, stores, GraphQL, backend token summary types, or price calculations.
- Do not preserve a standalone Cost column.
- Do not reintroduce card/list responsive rows.
- Prefer local helper functions inside `TeamTokenUsageSummary.vue` only if needed to avoid repeated grouped-cell expressions; do not create a generic table framework.
- Use clear class names such as `team-token-metric-primary`, `team-token-metric-cost`, and `team-token-metric-status` rather than keeping stale `team-token-cost-cell` as the main semantic owner.
- Preserve row data-test hooks so downstream tests and browser probes can continue locating rows.
- For price statuses:
  - Use `formatCost(componentCost, currency, apiCostStatus)` for component cost sublines.
  - Do not show normal `estimated` status text in the Total cell; use exceptional status text only when necessary to avoid misleading users, while keeping the row clean.
  - Let null component costs render through existing `formatCost` as `price missing`.
- Recalibrate browser validation from “scroll to Cost column” to “scroll across grouped metric columns and verify Total remains reachable/readable.”
