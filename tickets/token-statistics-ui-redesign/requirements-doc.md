# Token Statistics UI Redesign — Requirements Document

## Document Status

- Status: `Draft — RV-005 Terminology And Detail Decision Pending`
- Package ID: `REQPKG-TSUI-001`
- Current requirements revision ID: `RER-006`
- Request / ticket: Improve the professionalism and usability of Settings > Token Statistics
- Requirements owner: Requirements Engineering
- Date: 2026-08-29
- Approval state and reference: Not yet approved. The user explicitly removed all visible prior-period comparison messaging, the standalone contributor presentation, and all visible `driver` terminology. RV-005 reflects those removals and retains exact identity evidence only as secondary `Detailed usage`; `DEC-007` terminology and `DEC-008` secondary grouping placement remain unresolved.
- Source baseline: `origin/personal` at `9d0fd7c570d58da1af2c7a40279327c8a20a8093`

## Problem And Desired Outcome

- **Problem:** The current Token Statistics page exposes the required analytics, but its all-card dashboard treatment, oversized control surface, equal emphasis for high-value and unavailable information, chart whitespace, and very wide exact table produce a visually heavy, generic, and difficult-to-scan experience. In the supplied populated desktop captures, important data competes with low-value chrome, `No comparable data` occupies large surfaces, and exact evidence extends beyond the immediately visible table columns.
- **Affected actors or systems:** Users reviewing token consumption and cost in the desktop/web Settings UI; frontend analytics and Run-details presentation; accessibility and localization presentation. Backend accounting and analytics contracts are preserved.
- **Desired outcome:** A cohesive, polished Token Statistics experience with a clear information hierarchy, compact and understandable controls, legible charts and numbers, disciplined density, and responsive exact evidence. It must look intentional and professional while retaining the current trustworthy analytics semantics and secondary Run-details workflow.
- **Observable definition of success:** In a representative populated state, a user can identify total token use or spend for the selected month, daily token/spend movement, total/standard/cached input composition, cache hit rate, output, and price/coverage quality without decoding dense chrome. Exact runtime/model identity evidence is available only as secondary `Detailed usage`; no prior-period comparison or `driver` messaging is visible. Every retained truth state, exact value, disclosure, and export path remains usable and truthful.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Selecting Token Statistics opens two sibling tabs, with `Analytics` selected and `Run details` secondary. The selected Settings navigation item is the only page title. | Retain the two workflows in a visually coherent page shell whose hierarchy and navigation feel deliberate rather than appended above a stack of cards. | Analytics remains the default; Run details remains reachable; no redundant large `Token Statistics` content header; the manually resizable Settings navigation is unchanged. | `TokenUsageStatistics.vue`; `settings.vue`; prior approved `token-statistics-full-width` and `token-statistics-remove-header` requirements. |
| BEH-002 | User | Analytics shows five UTC range presets, Custom dates, Runtime/Provider/Model filters, Tokens/Estimated cost, a selection summary, clear filters, and CSV export in one large always-visible card. Presets and filters refetch one coherent result; metric switching preserves selection. | Make range, filter, metric, applied-context, and export actions compact, clearly grouped, and easy to scan. Secondary controls may use progressive disclosure when their state and discoverability remain clear. | Presets, fixed UTC basis, Custom validation, filter options, coherent result updates, selection persistence, clear filters, and local CSV behavior remain unchanged. | `TokenUsageAnalyticsControls.vue`; `tokenUsageAnalytics.ts`; `TokenUsageAnalyticsStates.spec.ts`. |
| BEH-003 | User | Four equal summary cards precede two equal chart cards. Usage over time is a bar chart; pace is a cumulative current/prior line chart or a large `No comparable data` panel. A ranked horizontal breakdown precedes an exhaustive 12-column table. | Make the primary hierarchy answer total tokens/spend, daily tokens/spend, and cache-aware token composition. Within-month daily buckets use a point-marked line. Show no visible prior-period comparison, standalone contributor panel, or `driver` terminology. Retain exact runtime/model identity evidence only as secondary `Detailed usage`, with final grouping placement governed by `DEC-008`. | Exact accounting, cost/coverage truth, current selection coherence, chronological buckets, accessible text evidence, and CSV remain traceable to one result. Cache-read tokens stay a subset of total input; no unavailable cache rate is rendered as 0%. The comparison contract may remain unused by this UI. | Supplied captures; current components; RI-001; RV-005 user-directed removals. |
| BEH-004 | System | Loading skeletons, retryable errors, covered-empty, pre-coverage unavailable, partial/full coverage, price completeness, mixed currency, local/no-bill, and no-comparison states are explicit. Unsafe monetary chart values are omitted rather than plotted as zero. | Present retained loading, result, coverage, and pricing states with a consistent, calm status language that remains noticeable without overwhelming valid data, and keep recovery actions adjacent to the problem. Do not render comparison availability because visible comparison is removed. | No retained state may be suppressed, relabeled as normal zero, or made less truthful. Price/coverage caveats remain textually available and not color-only. | `TokenUsageAnalyticsView.vue`; `TokenUsageAnalyticsCoverage.vue`; `TokenUsageAnalyticsStates.spec.ts`; prior analytics requirements/data contract; RV-005. |
| BEH-005 | User | Run details selects runs by creation time and shows lifetime totals, with Task/Model grouping, date range, fetch, loading/error/empty states, task hierarchy, model diagnostics, and cost disclosures. Its visual language is older gray UI and differs from Analytics. | Restyle the Run-details surface enough to belong to the same Token Statistics experience, with consistent typography, spacing, controls, state treatment, and evidence density. | Its distinct date semantics, query behavior, grouping, hierarchy, tables, sorting, expansion, cost evidence, and migration guidance do not change. | `TokenUsageRunDetailsView.vue`; task/model table components; `TokenUsageRunDetailsView.spec.ts`; server token-usage documentation. |
| BEH-006 | Contract | Compact values appear in summary/chart contexts and exact values appear in exact tables/export. Formatting currently uses environment-default `Intl` formatting; cost summary allows up to four fractional digits even for large amounts. | Use locale-aware, context-appropriate formatting with restrained summary precision, stable currency treatment, and tabular alignment, while preserving authoritative exact values in evidence surfaces and accessible detail. | Primary exact token values remain SafeInt-exact; local/unpriced/mixed currency is never rendered as an invented `$0`; CSV retains exact contract values. | `TokenUsageAnalyticsSummaryCards.vue`; `tokenUsageStatisticsUi.ts`; exact-table and CSV tests; supplied captures. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Token-usage viewer | Understand monthly/daily tokens or spend and cache-aware token composition | Fast scanning, clear hierarchy, trustworthy values and caveats | Must not need hover to understand core facts; cache efficiency is primary |
| Evidence-oriented user | Inspect/export exact supporting numbers | Exhaustive exact data and deterministic CSV remain available | Visual simplification cannot remove accounting evidence |
| Run investigator | Find task/team/run lifetime usage | Cohesive secondary Run-details workflow | Analytics period semantics and Run-details creation-time semantics must remain distinct |
| Product Design & Prototyping | Resolve visual hierarchy and interaction density | Reviewable interactive concepts based on the actual frontend baseline | Must bootstrap from the user-approved `origin/personal` baseline and preserve explicit constraints |
| Downstream engineering and validation | Implement and verify the approved experience | Stable observable requirements plus approved UI/UX reference | No backend or data-contract redesign is authorized by this package |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001` — Open Token Statistics and understand the selected period, coverage, total tokens, estimated cost/status, and primary trend quickly.
- `UC-002` — Change a UTC preset or Custom range and apply Runtime, Provider, and Model filters without losing context.
- `UC-003` — Switch Tokens/Estimated cost and interpret partial, missing, local, or mixed-currency evidence truthfully.
- `UC-004` — Use Analytics without visible prior-period comparison percentages, callouts, charts, or unavailable-comparison messaging.
- `UC-005` — Inspect runtime/provider/model identity only as secondary `Detailed usage`, never as a primary contributor/driver callout.
- `UC-006` — Export the currently applied analytics evidence as CSV.
- `UC-007` — Navigate to Run details and inspect existing task/model lifetime evidence in a visually coherent secondary view.
- `UC-008` — Understand and recover from loading, empty, uncovered, partial-coverage, pricing, and query-error states.
- `UC-009` — Understand total input, standard/cache-miss-rate input, cached-read input, cache hit rate, and output, including truthful unavailable/unsupported cache reporting.

### Out Of Scope

- Changes to token observation, aggregation, pricing formulas/catalogs, coverage computation, comparison periods, backend queries, GraphQL contracts, persisted schemas/invariants, or CSV contents.
- New quota, budget, forecast, anomaly, alert, notification, scheduled-report, cloud-sharing, invoice-reconciliation, or currency-conversion behavior.
- New Analytics dimensions such as task, workspace, agent definition, or team member.
- Redesign of the live Token Meter or other Settings pages.
- Changes to Settings navigation width policy, automatic navigation collapse, or a new content-area page title/header.
- Reconstructing historical analytics before tracking coverage or treating unpriced/local usage as zero cost.
- Visible prior-period comparison percentages, callouts, pace charts, or `No comparable data` messaging on Analytics.
- Standalone dominant-contributor panels or user-facing `driver` terminology.

### Non-Goals

- Creating a new visual brand for AutoByteus.
- Maximizing the number of simultaneously visible controls or columns.
- Replacing exact evidence with charts alone.
- Retaining the current card-for-everything composition merely because its functional behavior is correct.

### Preserved Behavior Boundary

- Preserve the contract and user outcomes of `BEH-001`–`BEH-006`, except for the explicitly authorized presentation and interaction-hierarchy changes in `REQ-001`–`REQ-016`. `DEC-005` and `DEC-006` are resolved removals/secondary placement; only `DEC-002`, `DEC-004`, `DEC-007`, and `DEC-008` remain open.
- Existing analytics selection/query coherence, cost/coverage truthfulness, local CSV export, exact numeric evidence, and Run-details lifetime semantics are cross-cutting invariants.
- Prior approval to omit a redundant in-content page heading and to keep Settings navigation resizing manual remains authoritative unless the user explicitly changes it.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. Requirements Engineering must update this canonical package and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Token Statistics shall present Analytics and Run details as one cohesive, professional product surface with a clear visual hierarchy, disciplined spacing, consistent typography, restrained color, and consistent control/state treatment. | BEH-001, BEH-005 | Must | Direct user request; current views use visibly different styling. | User request and captures |
| REQ-002 | On populated Analytics, the selected period/context, coverage, monthly total for the selected Tokens/Cost metric, daily movement for that metric, token composition, cache hit rate/state, and output shall be identifiable without opening a disclosure or relying on hover. A dominant contributor is not a required primary fact. | BEH-002–BEH-004 | Must | These are the user's clarified primary questions. | RI-001 user feedback |
| REQ-003 | Range, filters, metric, applied-context, clear, and export controls shall be grouped compactly and responsively. Any progressive disclosure shall expose active-filter count/state and keep all current actions discoverable and keyboard operable. | BEH-002 | Must | The current control card consumes disproportionate vertical and visual attention. | Capture 1; `TokenUsageAnalyticsControls.vue` |
| REQ-004 | Summary presentation shall prioritize current-period totals, spend/status, and cache-aware token composition. Analytics shall render no visible prior-period percentage, comparison callout, comparison chart, or unavailable-comparison messaging. Increased consumption shall not be styled as success. | BEH-003, BEH-004 | Must | Direct user removal of prior-period presentation. | RI-001; RV-005 user decision |
| REQ-005 | The primary trend shall show daily Tokens or Cost for the applied range using the existing metric switch, exact accessible evidence, and truthful cost-quality rules. No current/prior pace chart or prior-series overlay shall appear. | BEH-003, BEH-004 | Must | Daily consumption/spend is primary; user removed prior comparison. | RV-005 user decision; REQ-015 |
| REQ-006 | Remove `Dominant driver`, `Usage drivers`, and all other user-facing `driver` terminology and standalone contributor panels. Retain exact runtime/model identity, token, cost/status, share, and secondary accounting evidence under the neutral secondary label `Detailed usage`; avoid implying that any first row is a context-free global fact. Whether grouping controls remain immediately visible or move behind deeper disclosure is governed by `DEC-008`. | BEH-003 | Must | Direct user removal of contributor/driver presentation while preserving auditable identity detail. | RI-001; RV-005; `DEC-008` |
| REQ-007 | The design shall use a coherent token/color system for daily trend, composition, warning, selection, hover, and focus states. Meanings shall not conflict across surfaces or rely on color alone. | BEH-001, BEH-003, BEH-004 | Must | Current blue/teal/amber surfaces feel assembled rather than systematized. | Captures and current chart configs |
| REQ-008 | Summary numbers shall use locale-aware, context-appropriate compact formatting and restrained precision; currency amounts of ordinary magnitude shall not surface unnecessary machine-like fractional precision. Exact tables, tooltips/text alternatives, and CSV shall retain authoritative values. | BEH-006 | Must | Improves professional legibility without losing evidence. | Capture 1; current `Intl` calls |
| REQ-009 | Layout shall adapt to the available Settings content width, including the manually resized desktop navigation and narrow/mobile-equivalent layouts. Primary controls and facts shall not overlap or be silently clipped; exact-table overflow, where still necessary, shall be contained and clearly usable. | BEH-001–BEH-005 | Must | The content area is user-resizable and evidence tables are dense. | `settings.vue`; prior full-width requirements |
| REQ-010 | Every retained loading, error, covered-empty, uncovered, partial/full coverage, price-quality, mixed-currency, and local/no-bill state shall have an intentional visual treatment, truthful text, and relevant recovery/action without exposing stale results as current. Comparison/no-comparison state is not rendered because visible comparison is removed. | BEH-004 | Must | Visual polish must not erase trust semantics while honoring the user's removal. | Current tests, prior analytics contract, RV-005 |
| REQ-011 | Existing semantic tabs, radiogroups/controls, labels, live announcements, chart text alternatives/exact tables, logical focus order, visible focus, and non-color status cues shall be preserved or improved. Text and essential controls shall meet WCAG 2.1 AA contrast. | BEH-001–BEH-005 | Must | Accessibility is part of professional UI quality. | Current tests and prior UI/UX specification |
| REQ-012 | The redesign shall preserve all current analytics presets, fixed UTC policy, Custom validation, filter options, Tokens/Cost metric switch, one-result coherence, coverage/pricing/cache truth semantics, exact values, secondary Detailed usage evidence, and deterministic local CSV export. The current comparison data contract may remain returned but shall not be rendered. Grouping placement is governed by `DEC-008`; no backend/GraphQL/persistence change is authorized. | BEH-002–BEH-004, BEH-006 | Must | Preserve trusted contracts without forcing removed presentation. | Current code/docs/tests; RI-001; RV-005 |
| REQ-013 | Run details shall receive a compatible visual treatment while preserving its creation-time range meaning, lifetime totals, Task/Model grouping, fetch behavior, hierarchy, sorting, expansion, cost evidence, empty/error/loading states, and migration guidance. | BEH-005 | Should | Avoids a polished Analytics view leading to an obviously legacy secondary view. | Current Run-details code/tests; `DEC-004` |
| REQ-014 | The redesign shall not add a redundant large in-content page title, automatically collapse or resize the Settings navigation, or change navigation policy. | BEH-001 | Must | Carries forward explicit prior user approvals. | `token-statistics-remove-header`; `token-statistics-full-width` |
| REQ-015 | For a within-month trend returned at daily granularity, Usage over time shall render one line/curve through the chronological buckets with a visible point marker for every daily bucket, restrained date guides/labels, and exact emphasized values. It shall use neither vertical bars nor area fill; accessible text shall expose the complete daily bucket series so the connecting line is not the sole evidence or mistaken for continuously measured accounting volume. | BEH-003 | Must | Direct user preference, validated as supported by current `trendBuckets` and DAY range policy. | RV-004 clarification and validation `VAL-016` |
| REQ-016 | The primary token-composition summary shall expose Total input (`grossInputTokens`), Standard input (`standardInputTokens`), Cached input (`cacheReadInputTokens`), Cache hit rate (`cacheReadInputTokenRate`), and Output (`outputTokens`) using the current aggregate. Cache hit rate means cached-read input divided by total accounting input. Positive and zero-reported states may show a percentage; not-reported, unsupported/local, and unknown states shall show truthful text rather than an invented `0%`. Standard input is the current standard/cache-miss-rate component and excludes cached reads and cache-write components; the final user-facing label awaits `DEC-007`. | BEH-003, BEH-006 | Must | Cache efficiency is a primary price-sensitive question and all fields already exist. | RI-001 feasibility mapping; current component-basis/aggregate contract; `DEC-007` |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-016 | Open populated Analytics | The page presents a unified hierarchy in which period/context, coverage, monthly Tokens/Cost total, daily metric trend, total/standard/cached input, cache hit state/rate, and output are distinguishable and readable without hover; no dominant-driver panel is present. | No view appears as an unrelated legacy surface. | Approved prototype comparison plus browser/Electron visual check |
| AC-002 | REQ-003, REQ-009 | View Analytics at wide, ordinary desktop, manually narrowed desktop, and narrow/mobile-equivalent widths | All existing range/filter/metric/clear/export actions remain named, reachable, and usable; active context is visible; controls wrap/reflow without overlap or silent clipping. | Progressive controls, if used, indicate active state and restore focus predictably. | Responsive interaction test and accessibility inspection |
| AC-003 | REQ-004 | Review Analytics in comparable and non-comparable fixtures | Zero visible prior/previous/comparison percentage, callout, pace chart, unavailable-comparison message, or success-colored consumption change appears. | Current-period coverage and pricing caveats remain truthful. | Forbidden-term/state fixture plus approved prototype review |
| AC-004 | REQ-005, REQ-010, REQ-015 | Switch Tokens/Cost on a daily-granularity range | The single primary point-marked line switches between daily token totals and comparable estimated daily cost using existing quality/currency rules and exact accessible buckets. | Unsafe/unavailable monetary buckets are explained, not plotted as zero; no prior series or pace chart appears. | Component/state test plus prototype review |
| AC-005 | REQ-006, REQ-009 | Open the primary Analytics canvas and then `Detailed usage` | No `Dominant driver`/`Usage drivers` panel or terminology appears. Retained identity facts are obtainable from an intuitive secondary surface without page-level overflow. | At narrow widths, disclosure/overflow remains keyboard/touch usable. | Responsive prototype/detail test |
| AC-006 | REQ-006, REQ-012 | Open `Detailed usage` and exercise the placement/grouping behavior approved under `DEC-008` | Secondary identity/share/exact evidence and export context stay consistent with applied filters/metric; no `driver` term or standalone contributor callout appears; the first row is never presented as a context-free global fact. | Local/unpriced/mixed rows remain truthful and exhaustive evidence is not lost. | Existing contract tests plus regression tests |
| AC-007 | REQ-007, REQ-011 | Inspect selected, warning, chart-series, composition, hover, and focus states | Color and typography are consistent, every status has a text/non-color cue, focus is visible, and essential contrast meets WCAG 2.1 AA. | Daily-series and composition meanings remain distinguishable without color. | Automated contrast where feasible plus keyboard/manual review |
| AC-008 | REQ-008 | Render the supplied high-volume/cost fixture under at least one comma-decimal locale and one dot-decimal locale | Summary values are compact and professionally rounded; ordinary currency totals do not show unnecessary four-decimal precision; exact evidence and CSV retain authoritative values. | Very small nonzero currency amounts may use additional precision sufficient not to appear as zero. | Deterministic locale formatter tests |
| AC-009 | REQ-010, REQ-012 | Exercise loading, retryable error, covered-empty, uncovered, partial/full coverage, price-quality, mixed currency, and local/no-bill fixtures | Each retained state is intentional, truthful, and visually coherent; current state-specific recovery/action remains available; comparison availability does not create visible messaging. | Failed or newly applied selections do not leave stale values appearing current. | Component fixture matrix |
| AC-010 | REQ-011 | Navigate the whole page by keyboard/screen-reader landmarks | Tabs, controls, disclosures, status announcements, charts/equivalents, table/detail evidence, and Retry/Export have meaningful names and logical focus order; hover is not required. | Focus is restored to an appropriate trigger when a disclosure closes. | Keyboard and accessibility-tree verification |
| AC-011 | REQ-012, REQ-016 | Compare network/query behavior before and after visual redesign | Presets, Custom range, filters, metric, cache composition/state, retained secondary Detailed-usage evidence/grouping, result states, and CSV use the current approved analytics contract and semantics; no visual-only interaction invents a server-side fact or false cache percentage, and returned comparison data is not rendered. | Contract changes are treated as a requirement gap, not bundled into this task. | Existing unit/integration/E2E suite plus request inspection |
| AC-012 | REQ-013 | Open Run details and exercise Task/Model, dates, fetch, expansion/sorting, costs, empty/loading/error states | The view uses the approved visual language while every current Run-details behavior and creation-time/lifetime explanation remains unchanged. | Migration/history errors remain actionable and do not expose internal error tokens. | Existing tests plus approved prototype/state review |
| AC-013 | REQ-014 | Open Token Statistics and resize/navigate Settings | No redundant large in-content page title appears; navigation width changes only by the established manual user interaction and remains mounted across section/view activity. | Narrow breakpoint recovery remains unchanged. | Existing Settings shell regression suite |
| AC-014 | REQ-001–REQ-016 | Review final implementation against the approved Product prototype | Visual hierarchy, state treatment, responsive behavior, and permitted variations match the user-approved UI/UX package; no material visible deviation is undocumented. | Any materially different behavior returns as a requirement/design impact. | Screenshot/reference comparison and UI/UX checklist |
| AC-015 | REQ-015 | Open `This month` with a 29-day daily-bucket result | Usage over time renders exactly one chronological trend line, 29 visible point markers, no vertical usage bars, no area fill, restrained guides for representative dates, and an accessible label/text equivalent containing all 29 daily buckets. | Other range granularities retain exact chronological bucket evidence and require an explicit approved presentation if they do not use the daily-point form. | Deterministic chart fixture and accessibility inspection |
| AC-016 | REQ-016 | Render positive, zero-reported, not-reported, unsupported/local, and unknown cache-state fixtures | Total input, Standard/input-at-standard-rate, Cached input, Cache hit rate/state, and Output use authoritative aggregate fields. Positive/zero-reported states show the authoritative percentage; other states show `Not reported`, `Not supported for local usage`, or equivalent truthful text, never synthetic `0%`. | Cache-write tokens remain available in secondary exact accounting and are not silently folded into Standard or Cached input. | Contract fixture matrix plus approved prototype review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Starting Condition | Steps Or Event Sequence | Expected Outcome | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Token-usage viewer | Populated partial-coverage current month with no comparable prior period, matching supplied captures | Open Token Statistics; scan monthly total, daily-point trend, cache-aware composition, and coverage reason | Actual current usage dominates; the within-month trend has one marker per daily bucket; total/standard/cached input, cache state/rate, and output are clear; no contributor or unavailable-comparison panel competes for primary attention | REQ-001–REQ-005, REQ-015, REQ-016; AC-001, AC-003, AC-004, AC-015, AC-016 |
| SCN-002 | User | Token-usage viewer | Full current coverage and complete cost evidence | Switch Tokens/Cost; inspect monthly total, daily trend, and composition | Total and daily chart switch coherently; token composition/cache truth remains clear; no prior-period message or series appears | REQ-004, REQ-005, REQ-007, REQ-012, REQ-016; AC-003, AC-004, AC-011, AC-016 |
| SCN-003 | User | Evidence-oriented user | Multiple runtime/provider/model rows including local/unpriced usage | Apply filters; open `Detailed usage`; use the approved grouping/disclosure treatment; inspect exact rows; export | Secondary identity evidence remains contextual and truthful without a dominant-driver claim; export matches applied context | REQ-003, REQ-006, REQ-012; AC-002, AC-005, AC-006 |
| SCN-004 | User | User on constrained content width | Settings navigation is manually wide or viewport is narrow | Use controls, charts, table/details, and tabs | Layout reflows; no primary task is blocked by clipping or page-level overflow | REQ-003, REQ-009, REQ-011; AC-002, AC-005, AC-010 |
| SCN-005 | User | Run investigator | Analytics is open | Switch to Run details; change grouping/dates; inspect hierarchy/cost; return | Secondary workflow is visually coherent and semantically unchanged | REQ-001, REQ-013; AC-012 |
| SCN-006 | System | Analytics state contract | Query is loading, empty, failed, uncovered, or cost-incomplete | Render state and applicable recovery | Truthful, calm, non-stale state with appropriate action and accessible announcement | REQ-010–REQ-012; AC-009, AC-010 |
| SCN-007 | System | Cache accounting contract | Aggregate cache state is positive, zero-reported, not-reported, unsupported/local, or unknown | Render token composition | Authoritative tokens and rate/status are shown; unavailable reporting is never converted to 0%; cache writes remain distinct in exact accounting | REQ-016; AC-016 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: Exploratory brief `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirements-visualization-brief.md` and review record `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirements-visualization-review.md`. The prior specification at `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/done/token-statistics-analytics/ui-ux-spec.md` remains authoritative for analytics semantics, not for the rejected visual treatment.
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: Exploratory visualizer source `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/visualizers/REQPKG-TSUI-001`; clean review URLs: Direction A `http://127.0.0.1:3262/?direction=focus`, Direction B `http://127.0.0.1:3262/?direction=dense`. Canonical prototype repository/root: `/home/autobyteus/workspace/autobyteus-web-prototype`; Product worktree: `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001`. No final `ui-ux-spec.md` exists in exploratory mode.
- Product prototype ticket record and folder (externally owned): `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/prototype-ticket.md`; folder `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001`.
- Prototype revision or commit: Current visualizer is `RV-005`: content commit `fc6bace64c964ddcd1642a2b08f5a5e61703a86f`, review metadata commit `25a7d5c654f2243798e01d9684892cbffd867130`. It incorporates Requirement Impact `RI-001` and the user's explicit removals; browser validation is 18/18. RV-003 feasibility and RV-004 daily-trend decisions remain intact. Accepted prototype baseline implementation `6ba98942c669329f70ba902db4a2880375ad52ad`; its verified fast-forward integration tip on the prototype repository's `origin/personal` is `16638137bdb8ebe627507dac6c3c8bdbc5edf9d6`.
- UI/UX user-confirmation reference: The user selected the daily point-marked line, removed all visible prior-period comparison messaging, removed the standalone contributor presentation, removed all visible `driver` terminology, and kept monthly Tokens/Cost, daily Tokens/Cost, estimated cost/status, and input/output composition primary. RV-005 reflects those decisions. No overall UI/UX or requirements approval is claimed.
- Approved visual-reference baseline: None yet. `VIS-001`–`VIS-008` are exploratory clarification evidence, not normative final screenshots. The two user-supplied captures remain the rejected current-state baseline.
- Normative visual and interaction details: `REQ-004`–`REQ-006` fix the no-comparison/no-driver/secondary-identity decisions; `REQ-015` fixes the daily point-marked line; `REQ-016` fixes cache-accounting truth. RV-005 is valid exploratory evidence for the removals but is not a final normative prototype. The next focused revision must apply the resolved `DEC-007` terminology and `DEC-008` Detailed-usage placement to the required cache-aware composition. The unsupported illustrative Run-details model `Runs` count remains forbidden.
- Explicitly illustrative fixture content or permitted implementation variation: Populated fixture values in the supplied captures and visualization may be illustrative; data meanings, state labels, and cost/coverage semantics are not illustrative.
- Required screens/states/transitions/feedback/responsive/accessibility outcomes: Desktop populated partial coverage; desktop complete-cost; comparable and non-comparable fixtures with no comparison presentation; Tokens/Cost daily trend; positive/zero/unreported/unsupported/unknown cache states; compact filter state; secondary identity evidence; Run details; loading/empty/error; and narrow responsive behavior.
- Explicitly unresolved product decisions: `DEC-002`, `DEC-004`, `DEC-007`, and `DEC-008`. `DEC-001`, `DEC-003`, `DEC-005`, and `DEC-006` are resolved by the user's hierarchy/removal decisions represented in RV-005.

## Quality And Non-Functional Requirements

| Quality ID | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| QR-001 | Accessibility | WCAG 2.1 AA contrast for text/essential UI; full keyboard operation; visible focus; programmatic names; status not color-only; chart facts available in text/table form. | Both Token Statistics views and all material states | Automated checks plus keyboard/accessibility-tree review |
| QR-002 | Compatibility | Approved presentation and interactions behave equivalently in supported browser and Electron surfaces. | Desktop, manually resized content area, and narrow/mobile-equivalent layout | Browser/Electron E2E and screenshot checks |
| QR-003 | Performance | Presentation-only interactions shall not add network requests beyond the existing fetch triggers or introduce visibly janky chart/layout transitions in the representative high-volume fixture. | Metric/grouping/disclosure/view interaction | Request inspection and runtime observation |
| QR-004 | Localization | Labels shall use existing localization boundaries; dates, numbers, compact notation, percentages, and currencies shall be checked in comma-decimal and dot-decimal locales without overlap or misleading rounding. | Summary, charts, tables/details, controls | Localization and snapshot/component tests |
| QR-005 | Reliability | A result from an earlier selection shall never appear unlabeled as current after a new applied selection begins loading or fails. | Analytics controls and state replacement | Existing state tests plus regression coverage |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: Existing token usage records, analytical projections, pricing/coverage evidence, query contracts, and locally generated CSV contents.
- Loss, reset, rebuild, or regeneration that is acceptable: No production data loss/reset. Transient presentational state may reset on page remount as it does today unless the approved prototype states otherwise.
- Retention, privacy, compliance, volume, downtime, or operational constraints: No new telemetry, upload, sharing, or retained user preference is authorized.
- Unknowns requiring downstream investigation: None material for Requirements Visualization. Implementation must confirm no visual refactor changes query triggers or exact value formatting.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Token usage analytics GraphQL result | Applied/comparison ranges, coverage, aggregates, buckets, breakdown rows, filters, and cost-quality metadata remain the one coherent source. | Current generated types/store and prior approved data contract | No contract change authorized |
| Run-details query/store | Creation-time selection with lifetime totals and existing task/model evidence remains intact. | Current code/tests/docs | Visual unification must not blur period semantics |
| Chart.js | Current chart meanings and accessible equivalents must remain achievable. | Current components/package dependency | Exact target chart composition is a Product Design decision |
| Localization runtime and `Intl` | Presentation follows active product locale and supports compact/exact formats. | Current localization/formatting code | Current environment-default formatting should be checked against active-locale behavior downstream |
| Settings resizable shell | Content must work at user-selected navigation widths; no automatic width changes. | Prior approved full-width requirements and current `settings.vue` | Dense exact data must adapt without altering shell policy |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_71b4437ade9940c4912d2d7a39ea7186/requirements_engineering_team_a245406e04604ce28e52af265218b458/requirements_engineer_9dd659bd74f940469dd4932c55ebf19d/context_files/ctx_7a228aa2bc49__image.png` | Rejected current-state desktop top/mid analytics capture | REQ-001–REQ-005, REQ-007–REQ-009 | Current-state evidence | User supplied; not a desired-state approval basis |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_71b4437ade9940c4912d2d7a39ea7186/requirements_engineering_team_a245406e04604ce28e52af265218b458/requirements_engineer_9dd659bd74f940469dd4932c55ebf19d/context_files/ctx_38f329cd9412__image.png` | Rejected current-state breakdown/table capture | REQ-006–REQ-009 | Current-state evidence | User supplied; not a desired-state approval basis |
| `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/done/token-statistics-analytics/ui-ux-spec.md` | Existing analytics semantics and previously approved/current visual baseline | REQ-002–REQ-012 | Partially superseded | Semantics preserved; visual treatment reopened by this request |
| `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/done/token-statistics-analytics/token-usage-analytics-data-contract.md` | Visible-field/source and truthfulness contract | REQ-005, REQ-006, REQ-008, REQ-010, REQ-012 | Preserved evidence | Previously approved and unchanged by this UI request |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirements-visualization-review.md` | RV-005 review URLs, user-directed removals, covered states, daily trend, validation, limitations, and remaining terminology/detail decision | REQ-001–REQ-016; AC-001–AC-016 | Awaiting focused user decision | RV-005 is exploratory, not final or approved; 18/18 Chromium checks pass |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/validation/browser-validation.json` | Deterministic RV-005 browser evidence, including daily-line and forbidden-term checks | REQ-004–REQ-006, REQ-009, REQ-011, REQ-015; AC-003–AC-006, AC-015 | `PASS` 18/18 | Supporting evidence; no final approval |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/visual-references` | Direction A/B and state captures `VIS-001`–`VIS-008`, updated through RV-005 | REQ-001–REQ-016; DEC-001–DEC-008 | Retained exploratory evidence | User-directed removals and daily trend are usable clarification evidence; exact final hierarchy is still non-normative |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/implementation-feasibility-audit.md` | Field/action mapping to current frontend/server/GraphQL contracts and correction of unsupported `Runs` count | REQ-002–REQ-013; AC-001–AC-012 | `PASS` for RV-003 current-contract feasibility | Supporting evidence; no change to the no-backend-change scope |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirement-impact.md` | RI-001 conflict and RV-005 record for the no-comparison/no-driver hierarchy plus feasible cache-composition mapping | REQ-002, REQ-004–REQ-006, REQ-012, REQ-016; AC-001, AC-003–AC-006, AC-011, AC-016 | Canonical removals resolved; terminology/detail pending | No final prototype/implementation use until remaining decisions and approval |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | “Token Statistics page” includes visual coherence for both Analytics and its sibling Run details, with Analytics as the primary redesign focus. | The page shell exposes both workflows; redesigning only one risks an obviously inconsistent result. | User review of Requirements Visualization / Requirements Engineering | Pending |
| ASM-002 | The user wants the current functionality and trusted analytics semantics preserved, not a new analytics feature set. | The complaint is specifically visual/professional quality. | Requirements approval / user | Pending but strongly supported |
| ASM-003 | The prior no-redundant-header and manual-navigation decisions remain in force. | No new request reverses those explicit approvals. | Requirements approval / user | Pending but evidence-backed |
| ASM-004 | `origin/personal` at the recorded source pin is the required bootstrap baseline. | User explicitly clarified the bootstrap source. | Product Design bootstrap report | Confirmed by user 2026-08-29 |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | What visual hierarchy should lead populated Analytics? | Determines the user's first answers and prevents equal-card clutter. | Monthly Tokens/Cost total and cost/status; daily Tokens/Cost point-marked line; total/standard/cached input, cache hit state/rate, and output. No prior-period or contributor callout. | User, supported by Product Design | **Resolved** — user decision represented in RV-005 and REQ-002/004–006/015/016 |
| DEC-002 | How compact should the range/filter/metric/export controls be, and which secondary filters may use progressive disclosure? | Affects scanability, discoverability, and responsive behavior. | Always-visible compact toolbar vs summary + expandable filters; active state must remain explicit. | User, supported by Product Design | Open — visualization needed |
| DEC-003 | How should exact identity evidence relate to the primary composition view? | The former ranked breakdown competed with the user's actual questions. | Keep cache-aware composition primary; retain exact runtime/model/accounting evidence only under neutral `Detailed usage`, with placement governed by `DEC-008`. | User, supported by Product Design | **Resolved** — RV-005/REQ-006; placement detail remains DEC-008 |
| DEC-004 | How far should the same visual language be carried into Run details in this package? | Affects scope and cross-tab cohesion. | Full restyle of existing components vs shell/control/state unification with existing dense tables retained. | User, supported by Product Design | Open — visualization needed |
| DEC-005 | Should contributor identity/ranking be removed completely from Analytics or retained only as optional secondary detail? | Determines whether exact identity evidence remains accessible without recreating the rejected contributor concept. | Retain exact identity evidence under `Detailed usage`; remove standalone top-contributor presentation and all `driver` terms. | User | **Resolved** — user decision represented in RV-005 and REQ-006 |
| DEC-006 | Should prior-period comparison be removed, retained only as opt-in detail, or shown as a neutral secondary annotation? | Affects hierarchy, state burden, and meaning. | Remove every visible prior-period percentage, callout, chart/series, and unavailable-comparison message. The existing returned contract may remain unused. | User | **Resolved** — explicit user removal represented in RV-005 and REQ-004/005/010/012 |
| DEC-007 | What label should represent `standardInputTokens`? | `Uncached input` is intuitive but can be mistaken to include cache-write tokens; `Standard input` maps precisely to the standard/cache-miss-rate component. | **Recommended:** `Standard input`, helper `Input charged at the standard/cache-miss rate; excludes cached reads and cache writes.` Alternative: `Uncached input` with the same explicit definition. | User | Open — focused decision required after RV-005 |
| DEC-008 | Where should `Detailed usage` and its Runtime/Provider/Model grouping appear? | Exact investigation remains useful, but these controls must not dominate the monthly/daily/cache primary questions. | **Recommended:** collapsed/deeper `Detailed usage`, clearly discoverable, with grouping inside and default `Runtime + model`. Alternative: always-visible secondary section below the primary trend/composition. Both remove `driver` wording. | User | Open — focused decision required after RV-005 |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001–REQ-005 | BEH-001–BEH-004 | AC-001–AC-004 | SCN-001, SCN-002, SCN-006 | Supplied capture 1; pending visualization |
| REQ-006 | BEH-003 | AC-005, AC-006 | SCN-003, SCN-004 | Supplied capture 2; prior data contract; pending visualization |
| REQ-007–REQ-009 | BEH-001–BEH-006 | AC-002, AC-005, AC-007, AC-008 | SCN-001–SCN-004 | Both supplied captures; pending visualization |
| REQ-010–REQ-012 | BEH-002–BEH-006 | AC-004, AC-006, AC-009–AC-011 | SCN-001–SCN-004, SCN-006 | Current code/tests and prior approved analytics contract |
| REQ-013 | BEH-005 | AC-012 | SCN-005 | Current Run-details code/tests; pending visualization |
| REQ-014 | BEH-001 | AC-013 | SCN-001, SCN-005 | Prior approved header/navigation requirements |
| REQ-015 | BEH-003 | AC-015 | SCN-001 | RV-004/RV-005 review record, `VIS-001`/`VIS-002`, browser validation `VAL-016` |
| REQ-016 | BEH-003, BEH-006 | AC-001, AC-011, AC-016 | SCN-001, SCN-002, SCN-007 | RI-001/RV-005, current aggregate/component-basis contract, feasibility audit |

## Downstream Architecture Input

- Product and system constraints architecture must preserve: Existing analytics and Run-details contracts, fixed UTC semantics, coverage/pricing truthfulness, exact data/export, localization boundary, current Settings navigation policy, and accessibility semantics.
- Decisions intentionally deferred to architecture design: None yet. Target architecture is not being designed during this visualization round.
- Technical facts architecture should verify: Current change appears presentation-focused within existing frontend ownership, but the approved prototype may affect shared formatting/chart/table patterns; routing assessment will be performed only after user approval.
- Known feasibility or integration risks: Dense exact evidence and Chart.js accessibility/responsive behavior; ensuring formatter changes preserve exact tables/CSV; avoiding extra fetches from presentational state changes.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Partially — no-comparison/no-driver/secondary identity decisions are explicit; DEC-007 terminology and DEC-008 placement remain material`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Partially — Detailed-usage placement and visible input terminology await decisions`
- Applicable scenarios are covered: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes, including RI-001 and RV-005; exploratory evidence is explicitly non-normative`
- Applicable UI/UX approval and final visual-reference basis are recorded: `No — pending visualization and later final prototype`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `No`
- Requirements package ready for downstream route: `No`
- Remaining blocker: User resolution of `DEC-007` input terminology and `DEC-008` Detailed-usage placement, followed by a focused Product revision that exposes the required cache-aware composition. Control disclosure (`DEC-002`) and Run-details unification (`DEC-004`) also remain open before final approval. RV-005 is exploratory and must not be treated as the implementation direction.

## Architecture Design Routing Assessment

Not yet performed. The package is Draft and the Readiness Gate has not passed because material visual decisions and user approval are pending.

- Assessment status: `Blocked pending requirements visualization and user approval`
- Assessment owner and date: Requirements Engineering; pending
- Preliminary task size: `N/A — assessment not yet permitted`
- Preliminary architectural risk: `N/A — assessment not yet permitted`
- Structural surfaces reviewed: Current frontend page/components, analytics store/types, Settings shell, tests, prior UI/UX/data-contract artifacts.
- Payload/content surfaces reviewed: User captures, localization labels, analytics result fields, exact table/export evidence.
- Structural-impact triggers: `Unknown until approved interaction/UI scope is fixed`
- Evidence paths: See investigation notes and Supplemental Artifacts.
- Decision rationale: Routing assessment occurs only after explicit approval and a passed readiness gate.
- Selected route: `N/A — Requirements Visualization first`
- Outcome classification: `Requirements Visualization Needed`
- Direct-route conditions all satisfied: `N/A — not assessed`
- Architecture design, review, and design-revision artifacts: `N/A — not applicable at this stage`
- Downstream re-entry trigger: Approved/clarified visual decisions and explicit user approval of the reconciled requirements package.
