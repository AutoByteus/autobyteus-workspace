# Design Spec

## Current-State Read

The Token tab is mounted by `autobyteus-web/components/layout/RightSideTabs.vue` when the active right-side tab is internal id `usage`. `TokenUsageMeterPanel.vue` owns the Token Meter presentation hierarchy and delegates team-specific comparison rendering to `TeamTokenUsageSummary.vue` when `useTokenUsageWorkspaceScope.ts` reports a team context.

`useTokenUsageWorkspaceScope.ts` is the correct Token tab data boundary. It resolves the focused leaf member, per-member `teamRows`, primary summary, team total summary, and loading/error state. It does not own layout and should not change for this request.

The unclear narrow behavior is local to `TeamTokenUsageSummary.vue`:

- `.team-token-header` is hidden by default.
- `.team-token-row` defaults to a compact/card-like CSS grid with three metric columns.
- `.team-token-member-cell` and `.team-token-cost-cell` span the full row width.
- Per-cell `.team-token-metric-label` text is visible in the narrow layout.
- `@container (min-width: 46rem)` switches the same rows into the clear table-like layout shown in the user's wide screenshot.

This means the current owner, data boundary, formatting helpers, and file placement are healthy. The obsolete part is the local responsive presentation branch that collapses the Team comparison into cards instead of preserving table columns with horizontal scroll.

## Intended Change

Replace the narrow stacked/card responsive presentation in `TeamTokenUsageSummary.vue` with one authoritative table presentation at all widths. The Team section should render columns in this order:

1. Member
2. Gross Input
3. Output
4. Total Tokens
5. Cost

When the available width is below the table's readable minimum width, only the Team table region should scroll horizontally. The rest of the Token tab remains vertically scrollable and should not become horizontally scrollable.

Prefer semantic table markup so the visual model, accessibility model, and tests all align with the user's requested table shape.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): No broad design issue found.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No architecture refactor needed. Local presentation markup/CSS replacement is required inside the existing owner.
- Evidence: `TeamTokenUsageSummary.vue` already owns this comparison UI and contains the exact breakpoint behavior that produced the reported issue. Upstream `TokenUsageMeterPanel.vue` and `useTokenUsageWorkspaceScope.ts` remain well-separated and should not absorb layout work.
- Design response: Keep the data-flow and component ownership intact. Replace the old card/list branch with a scoped scrollable table inside `TeamTokenUsageSummary.vue`, and update colocated component tests to assert the new table structure.
- Refactor rationale: No cross-file architecture refactor is justified. Converting local markup from article/div-grid rows to semantic table rows is a component-internal presentation rewrite, not a subsystem ownership change.
- Intentional deferrals and residual risk, if any: Sticky columns, sorting, row click-to-focus, and full Token tab redesign are deferred/out of scope. Residual risk is limited to visual tuning of table minimum width/cost column width, which implementation and downstream visual validation should check.

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
- Required action: remove the obsolete narrow stacked/card branch in `TeamTokenUsageSummary.vue`. Do not keep old cards behind a smaller breakpoint while adding a new table path.
- Treat removal as first-class design work: the table is the single presentation path for team comparison rows. Scoped horizontal scroll replaces the previous collapse.
- Decision rule: the design is invalid if it depends on dual rendering paths for old narrow card rows and new table rows.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Token tab in team workspace | User compares member tokens/costs in Team table | Token tab presentation boundary (`TokenUsageMeterPanel` delegating to `TeamTokenUsageSummary`) | Shows where the layout change belongs without changing token accounting. |
| DS-002 | Return-Event | Focused team member changes in team context | Focused row and primary summary update in Token tab | `useTokenUsageWorkspaceScope.ts` data boundary | Focused row highlight must survive the table rewrite. |
| DS-003 | Bounded Local | `TeamTokenUsageSummary` receives rows/summary props | Table rows/cells are rendered with formatted values | `TeamTokenUsageSummary.vue` | This local rendering loop owns the old card branch and the new table/scroll behavior. |

## Primary Execution Spine(s)

DS-001: `RightSideTabs Token selection -> TokenUsageMeterPanel -> useTokenUsageWorkspaceScope rows/total -> TeamTokenUsageSummary -> Horizontally scrollable Team comparison table`

DS-002: `Team focus state update -> useTokenUsageWorkspaceScope focused row recompute -> TokenUsageMeterPanel primary summary/Team props -> TeamTokenUsageSummary focused row styling`

DS-003: `TeamTokenUsageSummary props -> Row rendering loop -> Existing formatters -> Semantic table cells -> Scoped horizontal scroll wrapper`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The right-side Token tab mounts the Token Meter panel. The panel reads already-owned Token tab scope data and delegates team comparison rendering to the team summary component. The component renders one table layout and lets its wrapper scroll horizontally if the right pane is too narrow. | Token tab, Token tab scope, Team comparison table | `TokenUsageMeterPanel.vue` for tab hierarchy; `TeamTokenUsageSummary.vue` for team comparison presentation | Formatting, localization, CSS overflow containment |
| DS-002 | When the focused team member changes, the existing scope composable recomputes which row is focused and which summary is primary. The table must preserve row identity attributes and focused styling. | Focused team row, primary summary, Team table row | `useTokenUsageWorkspaceScope.ts` for data resolution; `TeamTokenUsageSummary.vue` for visual focus | Focused badge, row highlight CSS |
| DS-003 | Inside the component, every row is mapped to one table row. Summary rows produce numeric/cost cells; missing summary rows produce a member header cell plus a status cell spanning the remaining columns. Team total renders as the final row. | Member row, Team total row, Cost cell | `TeamTokenUsageSummary.vue` | Existing token/cost formatter helpers, missing/loading state labels |

## Spine Actors / Main-Line Nodes

- Right-side tab shell (`RightSideTabs.vue`)
- Token Meter panel (`TokenUsageMeterPanel.vue`)
- Token tab data boundary (`useTokenUsageWorkspaceScope.ts`)
- Team comparison presentation (`TeamTokenUsageSummary.vue`)
- Scoped scrollable table region

## Ownership Map

- `RightSideTabs.vue`: owns right-side tab selection and mounting. It must not own Token tab layout details.
- `useTokenUsageWorkspaceScope.ts`: owns Token tab data resolution, focused member selection, loading/error state, and team total lookup. It must not own DOM layout or responsive behavior.
- `TokenUsageMeterPanel.vue`: owns top-level Token Meter hierarchy and passes team comparison props. It must remain presentation-only and must not recalculate prices.
- `TeamTokenUsageSummary.vue`: owns Team comparison layout, row rendering, focused visual state, and scoped horizontal overflow behavior. This is the implementation owner for the change.
- `tokenUsageFormatting`: owns formatting of token counts, costs, statuses, and detail titles. It should be reused unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RightSideTabs.vue` Token tab mount | `TokenUsageMeterPanel.vue` | Routes the right-side tab content. | Team comparison layout or token usage calculation. |
| `TokenUsageMeterPanel.vue` team summary child mount | `TeamTokenUsageSummary.vue` | Places the Team comparison within the Token Meter hierarchy. | Per-row table column behavior or horizontal scroll CSS. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Default narrow card/list grid in `TeamTokenUsageSummary.vue` | It is the reported unclear behavior and conflicts with the requested table mental model. | One authoritative table layout in `TeamTokenUsageSummary.vue`. | In This Change | Remove/replace CSS that makes member/cost cells span full width and rows use `repeat(3, ...)` card layout. |
| Hidden-by-default Team header | Column labels must remain available at narrow widths. | Always-rendered table `<thead>` / header row. | In This Change | Header may scroll with table; no separate sticky header required. |
| `@container (min-width: 46rem)` as behavior switch | The table should not be conditional on width. | Table min-width plus wrapper `overflow-x: auto`. | In This Change | Container query can be removed if no remaining use. |
| Per-row visible metric labels used only for card layout | Table headers own the column labels. | Semantic table headers. | In This Change | Tests should not require each data row to contain repeated labels. |
| Stale docs phrase about rows without horizontal overflow | New behavior intentionally uses scoped horizontal overflow. | Delivery docs sync update. | Follow-up | Delivery owns durable docs refresh, but implementation handoff should flag it. |

## Return Or Event Spine(s) (If Applicable)

DS-002 covers the relevant return/event path: focus changes already flow through team context/store state into `useTokenUsageWorkspaceScope.ts`, then into `TeamTokenUsageSummary.vue` via props. This change must not introduce a new focus event pathway.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TeamTokenUsageSummary.vue`
- Local spine: `props.rows/teamTotalSummary -> render tbody rows -> use existing formatters -> apply row classes/data attributes -> table wrapper controls horizontal overflow`
- Why it matters: this is where the old responsive card behavior lives and where the replacement must remain contained.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Token/cost formatting | DS-001, DS-003 | `TeamTokenUsageSummary.vue` | Format token integers, cost strings, status labels, and detail titles. | Keeps display formatting consistent with primary Token Meter cards. | Reimplementing in row rendering could create inconsistent price/missing-state behavior. |
| Localization labels | DS-001, DS-003 | `TeamTokenUsageSummary.vue` | Provide existing header/status labels. | Avoids hard-coded strings and new unnecessary messages. | Hard-coded labels would violate localization pattern. |
| Scoped horizontal overflow CSS | DS-001, DS-003 | `TeamTokenUsageSummary.vue` | Keep horizontal scrolling inside Team table region. | Prevents the whole right-pane content from sideways scrolling. | If placed on parent shell, other Token tab sections can become awkward or clipped. |
| Component tests | DS-001, DS-002, DS-003 | Token usage frontend components | Guard table headers, focused row, Team total, scroll wrapper. | Captures requested presentation contract. | Testing only data text would miss regression back to card layout. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team token comparison data | `useTokenUsageWorkspaceScope.ts` | Reuse | Already owns focused/team row summaries. | N/A |
| Team comparison presentation | `TeamTokenUsageSummary.vue` | Extend/Modify | Existing local owner of affected UI. | N/A |
| Formatting | `tokenUsageFormatting` | Reuse | Existing formatting contract for token/cost/status text. | N/A |
| Tests | Colocated Vitest component tests | Extend/Modify | Existing coverage for Token Meter and team rows. | N/A |
| Durable docs | Existing `autobyteus-web/docs/*` Token Usage Meter sections | Extend/Modify in delivery | Existing docs already describe the Token tab boundary. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend right-side workspace tabs | Mounting Token tab content | DS-001 | `RightSideTabs.vue` | Reuse unchanged | No layout changes here. |
| Token usage workspace scope | Team row/summary/focused data | DS-001, DS-002 | `useTokenUsageWorkspaceScope.ts` | Reuse unchanged | Keep presentation concerns out. |
| Token usage presentation | Token Meter hierarchy and Team table | DS-001, DS-003 | `TokenUsageMeterPanel.vue`, `TeamTokenUsageSummary.vue` | Extend/Modify | Local component change only. |
| Frontend test coverage | Component-level Token tab structure/behavior | DS-001, DS-002, DS-003 | Colocated tests | Extend/Modify | Tests should assert new structure. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Token usage presentation | Team comparison presentation | Convert Team comparison to semantic table and scoped horizontal scroll; preserve focused/team total/missing states. | Existing owner of exact UI. | Reuses `tokenUsageFormatting` and existing localization keys. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Frontend test coverage | Token Meter component tests | Update/extend tests for table headers, scroll wrapper, row attributes, Team total. | Existing colocated coverage. | Reuses test builders. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable docs | Token Usage Meter docs | Update stale wording after implementation/test state is known. | Existing architecture docs mention the component. | N/A |
| `autobyteus-web/docs/settings.md` | Durable docs | Duplicated settings docs | Mirror Token Usage Meter wording update. | Existing duplicated docs. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Token/cost/status formatting | Existing `tokenUsageFormatting` | Token usage presentation | Already shared between primary cards and team rows. | Yes | Yes | A new duplicated formatting helper. |
| Table column definitions | None recommended for this scope | `TeamTokenUsageSummary.vue` | Only used by one component. | N/A | N/A | A generic table framework or over-abstracted column schema. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageTeamMemberRow` | Yes | N/A | Low | Reuse unchanged. |
| `TokenUsageRunSummary` | Yes for this scope | N/A | Low | Reuse unchanged; do not add presentation fields. |
| Table column CSS variables/classes | Yes if kept local | N/A | Low | Keep local to component; do not promote shared structure. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Token usage presentation | Team comparison presentation | Single table rendering path, table wrapper overflow, row/focused/total/cost/status styling. | Existing component owns Team comparison UI. | Yes: existing props, localization, formatters. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Frontend test coverage | Token Meter component coverage | Assert headers/order, semantic/scoped table wrapper, focused row attributes, total final row, no data-flow changes. | Existing tests already build team contexts and summaries. | Yes: existing test helpers. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable docs | Token Usage Meter docs | Documentation wording update during delivery. | Existing docs source. | N/A |
| `autobyteus-web/docs/settings.md` | Durable docs | Settings docs mirror | Documentation wording update during delivery. | Existing duplicated docs source. | N/A |

## Ownership Boundaries

The authoritative boundary for Token tab data remains `useTokenUsageWorkspaceScope.ts`. `TeamTokenUsageSummary.vue` must continue receiving already-resolved row data via props and must not call stores, fetch summaries, compute focused member identity, or recalculate token/cost totals.

The authoritative boundary for Team comparison presentation is `TeamTokenUsageSummary.vue`. Parent components should not reach into its table internals or duplicate responsive behavior.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useTokenUsageWorkspaceScope.ts` | Store reads, hydration requests, focused member resolution, team row construction | `TokenUsageMeterPanel.vue` | `TeamTokenUsageSummary.vue` directly reading stores or resolving team focus. | Add explicit returned fields to the composable, not direct child store reads. |
| `TeamTokenUsageSummary.vue` | Table markup, cost cell layout, horizontal overflow CSS, row presentation | `TokenUsageMeterPanel.vue` | Parent applying breakpoint-specific row/table classes or rendering an alternate team table. | Add props/events only if a real presentation contract is missing. |
| `tokenUsageFormatting` | Token/cost/status formatting helpers | `TokenUsageMeterPanel.vue`, `TeamTokenUsageSummary.vue` | Recreating cost/missing-price formatting inside table cells. | Extend formatter helper if a new display primitive is genuinely needed. |

## Dependency Rules

Allowed:

- `RightSideTabs.vue` may mount `TokenUsageMeterPanel.vue`.
- `TokenUsageMeterPanel.vue` may call `useTokenUsageWorkspaceScope()` and pass resulting props to `TeamTokenUsageSummary.vue`.
- `TeamTokenUsageSummary.vue` may use existing localization and `tokenUsageFormatting` helpers.
- Tests may mount `TokenUsageMeterPanel.vue` and inspect rendered Team table structure.

Forbidden:

- `TeamTokenUsageSummary.vue` must not fetch token usage, read stores directly, or calculate summaries.
- `TokenUsageMeterPanel.vue` must not duplicate Team row table rendering or breakpoint CSS.
- The implementation must not keep old narrow card markup as an alternate compatibility path.
- The implementation must not change backend/server token accounting APIs for this presentation request.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamTokenUsageSummary` props | Team usage comparison presentation | Render rows, team total, loading/error state | `TokenUsageTeamMemberRow[]`, `TokenUsageRunSummary | null`, loading/error flags | Preserve prop contract unless implementation finds a direct UI blocker. |
| `createTokenUsageFormatter(t)` | Token/cost display formatting | Format values and statuses | Numeric summary fields and `apiCostStatus`/currency | Reuse unchanged. |
| `useTokenUsageWorkspaceScope()` returned fields | Token tab data scope | Provide primary/team usage state | Active run/team context from stores | Reuse unchanged. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamTokenUsageSummary` props | Yes | Yes | Low | No change. |
| `useTokenUsageWorkspaceScope()` | Yes | Yes | Low | No change. |
| `tokenUsageFormatting` helpers | Yes | N/A | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team comparison component | `TeamTokenUsageSummary` | Yes | Low | Keep. |
| Table wrapper | Proposed `team-token-table-scroll` / `data-test="team-token-table-scroll"` | Yes | Low | Use concrete scroll/table naming. |
| Table element | Proposed `team-token-table` / `data-test="team-token-table"` | Yes | Low | Use concrete table naming. |
| Focused badge | `team-token-focused-badge` | Yes | Low | Keep. |

## Applied Patterns (If Any)

- Presentation component pattern: `TeamTokenUsageSummary.vue` remains a pure presentation component over props.
- Semantic table pattern: use native table semantics because the subject is explicitly tabular row/column data.
- Scoped overflow container: keep horizontal scroll localized to the component-owned table region.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | File | Team comparison presentation | Render semantic table, table header, body rows, total row, empty/loading/error rows, focused styling, and scoped horizontal scroll. | Existing component owns the affected UI. | Store reads, data hydration, pricing calculations, duplicate formatter logic. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | File | Token Meter component tests | Verify table structure and existing focused/team behavior. | Existing colocated tests already cover this component path. | Browser-layout assertions that JSDOM cannot prove. |
| `autobyteus-web/docs/agent_execution_architecture.md` | File | Durable architecture docs | Delivery-stage wording update for new scrollable table behavior. | Existing Token Usage Meter docs. | Implementation-only details that will drift. |
| `autobyteus-web/docs/settings.md` | File | Durable settings/docs mirror | Delivery-stage wording update matching architecture docs. | Existing duplicated Token Usage Meter docs. | Conflicting wording from architecture docs. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/` | Presentation | Yes | Low | Token usage UI components are already colocated here. |
| `autobyteus-web/composables/` | Presentation data boundary/composable | Yes | Low | No change; data boundary remains separate. |
| `autobyteus-web/docs/` | Durable docs | Yes | Low | Delivery docs sync only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Narrow layout | `<div class="team-token-table-scroll"><table class="team-token-table" style="min-width: 46rem">...</table></div>` | Hide header, render member/cost as full-width stacked card blocks, and rely on per-row labels. | Clarifies that horizontal scroll replaces responsive collapse. |
| Missing summary row | `<tr><th scope="row">Member</th><td colspan="4">Loading token usage…</td></tr>` | Render a separate card/status block outside the table. | Keeps row identity and table shape even for non-happy-path states. |
| Cost cell | Last `<td>` contains main cost/status and input/output split with nowrap/min-width. | Move cost below all columns on narrow widths. | The user specifically called out the last/cost column as unclear. |
| Ownership | `TeamTokenUsageSummary` changes DOM/CSS only. | `useTokenUsageWorkspaceScope` starts returning display column fragments or CSS flags. | Keeps data boundary clean. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old card layout below a smaller breakpoint and table above it | Could preserve previous compact/mobile behavior. | Rejected | One table layout at all widths; scoped horizontal scroll handles narrow panels. |
| Add a second table only for narrow mode while keeping existing card markup | Could reduce risk to wide mode. | Rejected | Replace component markup/CSS with one authoritative table to avoid dual paths. |
| Add backend/store fields for table columns | Could make columns explicit in data. | Rejected | Columns are presentation of existing summary fields; use existing props and formatter helpers. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

Layering is straightforward and unchanged:

`Right-side tab shell -> Token tab presentation -> Token tab scope composable -> stores/API` for data, with `TeamTokenUsageSummary.vue` as a leaf presentation component. The implementation should only touch the leaf presentation layer and its colocated tests.

## Migration / Refactor Sequence

1. In `TeamTokenUsageSummary.vue`, replace article/div card rows with one semantic table structure:
   - wrapper `div` with `data-test="team-token-table-scroll"`, `overflow-x: auto`, and table-region border/radius.
   - table with `data-test="team-token-table"`, `thead`, `tbody`, and minimum width.
   - member rows as `<tr data-test="team-token-row" ...>` preserving `data-focused` and `data-member-route-key`.
   - team total as final `<tr data-test="team-token-total-row">`.
   - no-members/no-summary states as table rows/cells rather than out-of-table blocks.
2. Reuse existing formatter calls and localization keys exactly; do not alter value calculations.
3. Replace scoped CSS:
   - remove `container-type` and `@container` behavior switch if no longer needed.
   - add table cell alignment, widths/min-widths, no-wrap cost details, row borders/backgrounds, focused-row left indicator, and total-row styling.
   - ensure wrapper, not parent panel, owns horizontal overflow.
4. Update `TokenUsageMeterPanel.spec.ts`:
   - assert header order: Member, Gross input, Output, Total tokens, Cost.
   - assert scroll wrapper/table test hooks exist.
   - preserve assertions for focused primary summary, row `data-focused`, row route key, cost/status text, and Team total.
   - remove/update expectations that require metric labels inside each row if semantic headers now own labels.
5. Run targeted frontend tests when dependencies are available, following `autobyteus-web/AGENTS.md`: `pnpm test:nuxt --run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` from `autobyteus-web` or equivalent workspace command.
6. Downstream API/E2E/visual validation should inspect a constrained-width Token tab and verify the table scrolls horizontally to the Cost column.
7. Delivery docs sync should update `autobyteus-web/docs/agent_execution_architecture.md` and `autobyteus-web/docs/settings.md` to replace stale compact/no-horizontal-overflow wording with scoped horizontal-scroll table behavior.

## Key Tradeoffs

- Semantic table vs. div-grid: semantic table is a larger local markup change, but it matches the requested mental model, improves accessibility, and removes breakpoint-specific card logic. This is preferred.
- Horizontal scroll vs. responsive wrapping: horizontal scroll preserves column comparability and cost clarity, at the cost of requiring sideways scroll on narrow panels. This matches the user's requested behavior.
- No sticky first/cost column: simpler and less risky for this scope. Sticky behavior can be revisited separately if users need it after the basic table/scroll fix.

## Risks

- The first implementation pass may need width tuning for the cost column and total table minimum width.
- Mac overlay scrollbars may be visually subtle; validation should confirm trackpad/mouse horizontal scrolling is discoverable enough in the table region.
- Tests running in JSDOM cannot prove actual overflow rendering; browser/e2e evidence should cover the constrained-width case.
- Docs currently mention previous no-horizontal-overflow proof; failing to update docs during delivery would leave stale guidance.

## Guidance For Implementation

- Keep the implementation focused on `TeamTokenUsageSummary.vue` and its colocated Token Meter tests.
- Use one table rendering path; do not add a new narrow-only branch.
- Preserve all existing `data-test` hooks used downstream where practical (`team-token-usage-summary`, `team-token-row`, `team-token-total-row`) and add table-specific hooks (`team-token-table-scroll`, `team-token-table`).
- Preserve `data-focused` and `data-member-route-key` on member rows.
- Keep formatting calls exactly tied to existing helpers: `formatCompactInteger`, `formatTokenDetail`, `formatCost`, and `formatStatus`.
- For row backgrounds in a table, apply focused/total background to child cells if row-level background/box-shadow does not render consistently.
- For the focused left indicator, prefer a left inset border/box-shadow on the first cell of the focused row so it remains visible after the markup conversion.
- Do not alter `useTokenUsageWorkspaceScope.ts`, stores, GraphQL, backend token summary types, or price calculations unless implementation discovers an unavoidable blocker and routes back for design review.
