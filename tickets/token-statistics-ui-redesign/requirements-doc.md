# Token Statistics UI Redesign — Requirements Document

## Document Status

- Status: `Draft — Requirements Visualization Review Pending`
- Package ID: `REQPKG-TSUI-001`
- Current requirements revision ID: `RER-003`
- Request / ticket: Improve the professionalism and usability of Settings > Token Statistics
- Requirements owner: Requirements Engineering
- Date: 2026-08-29
- Approval state and reference: Not yet approved. Product Design returned exploratory Requirements Visualization `RV-003`, including current-contract feasibility proof and removal of one unsupported illustrative field; the user must select or combine Direction A/B and resolve `DEC-001`–`DEC-004` before intended behavior can be approved.
- Source baseline: `origin/personal` at `9d0fd7c570d58da1af2c7a40279327c8a20a8093`

## Problem And Desired Outcome

- **Problem:** The current Token Statistics page exposes the required analytics, but its all-card dashboard treatment, oversized control surface, equal emphasis for high-value and unavailable information, chart whitespace, and very wide exact table produce a visually heavy, generic, and difficult-to-scan experience. In the supplied populated desktop captures, important data competes with low-value chrome, `No comparable data` occupies large surfaces, and exact evidence extends beyond the immediately visible table columns.
- **Affected actors or systems:** Users reviewing token consumption and cost in the desktop/web Settings UI; frontend analytics and Run-details presentation; accessibility and localization presentation. Backend accounting and analytics contracts are preserved.
- **Desired outcome:** A cohesive, polished Token Statistics experience with a clear information hierarchy, compact and understandable controls, legible charts and numbers, disciplined density, and responsive exact evidence. It must look intentional and professional while retaining the current trustworthy analytics semantics and secondary Run-details workflow.
- **Observable definition of success:** In a representative populated state, a user can identify total token use, estimated cost/status, time range/coverage, and the dominant usage driver without decoding dense chrome; unavailable comparison data does not dominate the page; primary breakdown facts remain visible at ordinary desktop widths; every current supported control, state, exact value, disclosure, and export path remains usable and truthful.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Selecting Token Statistics opens two sibling tabs, with `Analytics` selected and `Run details` secondary. The selected Settings navigation item is the only page title. | Retain the two workflows in a visually coherent page shell whose hierarchy and navigation feel deliberate rather than appended above a stack of cards. | Analytics remains the default; Run details remains reachable; no redundant large `Token Statistics` content header; the manually resizable Settings navigation is unchanged. | `TokenUsageStatistics.vue`; `settings.vue`; prior approved `token-statistics-full-width` and `token-statistics-remove-header` requirements. |
| BEH-002 | User | Analytics shows five UTC range presets, Custom dates, Runtime/Provider/Model filters, Tokens/Estimated cost, a selection summary, clear filters, and CSV export in one large always-visible card. Presets and filters refetch one coherent result; metric switching preserves selection. | Make range, filter, metric, applied-context, and export actions compact, clearly grouped, and easy to scan. Secondary controls may use progressive disclosure when their state and discoverability remain clear. | Presets, fixed UTC basis, Custom validation, filter options, coherent result updates, selection persistence, clear filters, and local CSV behavior remain unchanged. | `TokenUsageAnalyticsControls.vue`; `tokenUsageAnalytics.ts`; `TokenUsageAnalyticsStates.spec.ts`. |
| BEH-003 | User | Four equal summary cards precede two equal chart cards. Usage over time is a bar chart; pace is a cumulative current/prior line chart or a large `No comparable data` panel. A ranked horizontal breakdown precedes an exhaustive 12-column table. | Establish a stronger decision hierarchy: emphasize actual totals, trend, and dominant drivers; give unavailable comparison states proportionate treatment; use chart space efficiently; and make primary exact facts visible without sacrificing access to secondary accounting metadata. | Total, cost quality, tokens per active day, prior comparison semantics, chronological buckets, pace comparison, grouping choices, exact rows, and chart text alternatives remain available and traceable to one result. | Supplied captures; `TokenUsageAnalyticsSummaryCards.vue`; `TokenUsageTrendChart.vue`; `TokenUsagePaceChart.vue`; `TokenUsageBreakdown.vue`; `TokenUsageExactBreakdownTable.vue`. |
| BEH-004 | System | Loading skeletons, retryable errors, covered-empty, pre-coverage unavailable, partial/full coverage, price completeness, mixed currency, local/no-bill, and no-comparison states are explicit. Unsafe monetary chart values are omitted rather than plotted as zero. | Present these states with a consistent, calm status language that remains noticeable without overwhelming valid data, and with recovery actions adjacent to the problem. | No state may be suppressed, relabeled as normal zero, or made less truthful. Price/coverage caveats remain textually available and not color-only. | `TokenUsageAnalyticsView.vue`; `TokenUsageAnalyticsCoverage.vue`; `TokenUsageAnalyticsStates.spec.ts`; prior analytics requirements/data contract. |
| BEH-005 | User | Run details selects runs by creation time and shows lifetime totals, with Task/Model grouping, date range, fetch, loading/error/empty states, task hierarchy, model diagnostics, and cost disclosures. Its visual language is older gray UI and differs from Analytics. | Restyle the Run-details surface enough to belong to the same Token Statistics experience, with consistent typography, spacing, controls, state treatment, and evidence density. | Its distinct date semantics, query behavior, grouping, hierarchy, tables, sorting, expansion, cost evidence, and migration guidance do not change. | `TokenUsageRunDetailsView.vue`; task/model table components; `TokenUsageRunDetailsView.spec.ts`; server token-usage documentation. |
| BEH-006 | Contract | Compact values appear in summary/chart contexts and exact values appear in exact tables/export. Formatting currently uses environment-default `Intl` formatting; cost summary allows up to four fractional digits even for large amounts. | Use locale-aware, context-appropriate formatting with restrained summary precision, stable currency treatment, and tabular alignment, while preserving authoritative exact values in evidence surfaces and accessible detail. | Primary exact token values remain SafeInt-exact; local/unpriced/mixed currency is never rendered as an invented `$0`; CSV retains exact contract values. | `TokenUsageAnalyticsSummaryCards.vue`; `tokenUsageStatisticsUi.ts`; exact-table and CSV tests; supplied captures. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Token-usage viewer | Understand how much was used, when, and where it went | Fast scanning, clear hierarchy, trustworthy values and caveats | Must not need hover to understand core facts |
| Evidence-oriented user | Inspect/export exact supporting numbers | Exhaustive exact data and deterministic CSV remain available | Visual simplification cannot remove accounting evidence |
| Run investigator | Find task/team/run lifetime usage | Cohesive secondary Run-details workflow | Analytics period semantics and Run-details creation-time semantics must remain distinct |
| Product Design & Prototyping | Resolve visual hierarchy and interaction density | Reviewable interactive concepts based on the actual frontend baseline | Must bootstrap from the user-approved `origin/personal` baseline and preserve explicit constraints |
| Downstream engineering and validation | Implement and verify the approved experience | Stable observable requirements plus approved UI/UX reference | No backend or data-contract redesign is authorized by this package |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001` — Open Token Statistics and understand the selected period, coverage, total tokens, estimated cost/status, and primary trend quickly.
- `UC-002` — Change a UTC preset or Custom range and apply Runtime, Provider, and Model filters without losing context.
- `UC-003` — Switch Tokens/Estimated cost and interpret partial, missing, local, or mixed-currency evidence truthfully.
- `UC-004` — Recognize a missing prior-period comparison without a large empty surface displacing useful data.
- `UC-005` — Identify dominant runtime/provider/model drivers and inspect exact supporting values at desktop and narrower widths.
- `UC-006` — Export the currently applied analytics evidence as CSV.
- `UC-007` — Navigate to Run details and inspect existing task/model lifetime evidence in a visually coherent secondary view.
- `UC-008` — Understand and recover from loading, empty, uncovered, partial-coverage, pricing, and query-error states.

### Out Of Scope

- Changes to token observation, aggregation, pricing formulas/catalogs, coverage computation, comparison periods, backend queries, GraphQL contracts, persisted schemas/invariants, or CSV contents.
- New quota, budget, forecast, anomaly, alert, notification, scheduled-report, cloud-sharing, invoice-reconciliation, or currency-conversion behavior.
- New Analytics dimensions such as task, workspace, agent definition, or team member.
- Redesign of the live Token Meter or other Settings pages.
- Changes to Settings navigation width policy, automatic navigation collapse, or a new content-area page title/header.
- Reconstructing historical analytics before tracking coverage or treating unpriced/local usage as zero cost.

### Non-Goals

- Creating a new visual brand for AutoByteus.
- Maximizing the number of simultaneously visible controls or columns.
- Replacing exact evidence with charts alone.
- Retaining the current card-for-everything composition merely because its functional behavior is correct.

### Preserved Behavior Boundary

- Preserve the contract and user outcomes of `BEH-001`–`BEH-006`, except for the explicitly authorized presentation and interaction-hierarchy changes in `REQ-001`–`REQ-014`.
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
| REQ-002 | On populated Analytics, the selected period/context, coverage, total tokens, estimated cost/status, usage trend, and dominant driver shall be identifiable without opening a disclosure or relying on hover. | BEH-002–BEH-004 | Must | These are the page's primary user questions. | Prior approved analytics goal; user dissatisfaction with current hierarchy |
| REQ-003 | Range, filters, metric, applied-context, clear, and export controls shall be grouped compactly and responsively. Any progressive disclosure shall expose active-filter count/state and keep all current actions discoverable and keyboard operable. | BEH-002 | Must | The current control card consumes disproportionate vertical and visual attention. | Capture 1; `TokenUsageAnalyticsControls.vue` |
| REQ-004 | Summary presentation shall prioritize actual decision-useful values. An unavailable prior comparison shall remain explicit but shall not receive the same visual weight or footprint as an available primary metric. | BEH-003, BEH-004 | Must | Current equal cards elevate absence over useful data. | Capture 1; `DEC-001` pending visual choice |
| REQ-005 | Trend and pace presentations shall preserve their current analytical meanings, exact accessible evidence, and current/prior distinction while using available space efficiently. When pace comparison is unavailable, the explanation shall be concise and useful data shall not be displaced by a large empty chart region. | BEH-003, BEH-004 | Must | Current empty pace panel is visually dead; chart semantics remain valuable. | Captures; prior analytics UI/UX spec |
| REQ-006 | The usage-driver section shall keep Runtime + model, Runtime, Provider, and Model grouping, ranked contribution, share, and exhaustive exact evidence. At ordinary desktop widths, runtime/provider/model identity, total tokens, estimated cost/status, and share shall be obtainable without unintended clipping; secondary accounting metadata may use a clearly labeled detail/disclosure pattern or contained overflow. | BEH-003 | Must | The current 12-column table makes primary evidence hard to scan. | Capture 2; `TokenUsageExactBreakdownTable.vue`; `DEC-003` |
| REQ-007 | The design shall use a coherent token/color system for trend, comparison, contribution, warning, success, selection, hover, and focus states. Meanings shall not conflict across charts or rely on color alone. | BEH-001, BEH-003, BEH-004 | Must | Current blue/teal/amber surfaces feel assembled rather than systematized. | Captures and current chart configs |
| REQ-008 | Summary numbers shall use locale-aware, context-appropriate compact formatting and restrained precision; currency amounts of ordinary magnitude shall not surface unnecessary machine-like fractional precision. Exact tables, tooltips/text alternatives, and CSV shall retain authoritative values. | BEH-006 | Must | Improves professional legibility without losing evidence. | Capture 1; current `Intl` calls |
| REQ-009 | Layout shall adapt to the available Settings content width, including the manually resized desktop navigation and narrow/mobile-equivalent layouts. Primary controls and facts shall not overlap or be silently clipped; exact-table overflow, where still necessary, shall be contained and clearly usable. | BEH-001–BEH-005 | Must | The content area is user-resizable and evidence tables are dense. | `settings.vue`; prior full-width requirements |
| REQ-010 | Every current loading, error, covered-empty, uncovered, partial/full coverage, price-quality, mixed-currency, local/no-bill, and no-comparison state shall have an intentional visual treatment, truthful text, and relevant recovery/action without exposing stale results as current. | BEH-004 | Must | Visual polish must not erase trust semantics. | Current tests and prior analytics contract |
| REQ-011 | Existing semantic tabs, radiogroups/controls, labels, live announcements, chart text alternatives/exact tables, logical focus order, visible focus, and non-color status cues shall be preserved or improved. Text and essential controls shall meet WCAG 2.1 AA contrast. | BEH-001–BEH-005 | Must | Accessibility is part of professional UI quality. | Current tests and prior UI/UX specification |
| REQ-012 | The redesign shall preserve all current analytics presets, fixed UTC policy, Custom validation, filter options, metric switch, grouping options, one-result coherence, coverage/pricing semantics, exact values, and deterministic local CSV export. | BEH-002–BEH-004, BEH-006 | Must | This task is a presentation redesign, not an analytics-contract change. | Current code/docs/tests |
| REQ-013 | Run details shall receive a compatible visual treatment while preserving its creation-time range meaning, lifetime totals, Task/Model grouping, fetch behavior, hierarchy, sorting, expansion, cost evidence, empty/error/loading states, and migration guidance. | BEH-005 | Should | Avoids a polished Analytics view leading to an obviously legacy secondary view. | Current Run-details code/tests; `DEC-004` |
| REQ-014 | The redesign shall not add a redundant large in-content page title, automatically collapse or resize the Settings navigation, or change navigation policy. | BEH-001 | Must | Carries forward explicit prior user approvals. | `token-statistics-remove-header`; `token-statistics-full-width` |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | Open populated Analytics | The page presents a unified hierarchy in which period/context, coverage, total tokens, estimated cost/status, trend, and dominant driver are visually distinguishable and readable without hover. | No view appears as an unrelated legacy surface. | Approved prototype comparison plus browser/Electron visual check |
| AC-002 | REQ-003, REQ-009 | View Analytics at wide, ordinary desktop, manually narrowed desktop, and narrow/mobile-equivalent widths | All existing range/filter/metric/clear/export actions remain named, reachable, and usable; active context is visible; controls wrap/reflow without overlap or silent clipping. | Progressive controls, if used, indicate active state and restore focus predictably. | Responsive interaction test and accessibility inspection |
| AC-003 | REQ-004 | Selected period has no comparable prior result | `No comparable data` and its reason remain visible but do not occupy a primary-metric-sized card plus a large chart-sized dead region. | When comparison exists, absolute and percentage change plus prior context remain legible. | State fixture visual comparison |
| AC-004 | REQ-005, REQ-010 | Pace is unavailable because coverage/pricing/currency is not comparable | The UI gives a concise truthful reason and does not plot missing values as zero or leave a misleading blank chart. | Comparable token/cost cases retain current/prior differentiated series and exact endpoints. | Component/state test plus prototype review |
| AC-005 | REQ-006, REQ-009 | View a populated breakdown at ordinary desktop width | Primary identity, total token, cost/status, and share facts are visible or immediately obtainable without page-level horizontal overflow; every existing secondary exact field remains accessible. | At narrow widths, overflow/disclosure is contained and keyboard/touch usable. | Responsive table/detail test |
| AC-006 | REQ-006, REQ-012 | Change breakdown grouping or metric | Ranked chart, share, exact evidence, and export context stay consistent with the selected result; local/unpriced/mixed rows remain truthful. | No category disappears from the exhaustive evidence merely because the chart uses Top N + Other. | Existing contract tests plus regression tests |
| AC-007 | REQ-007, REQ-011 | Inspect selected, warning, chart-series, hover, and focus states | Color and typography are consistent, every status has a text/non-color cue, focus is visible, and essential contrast meets WCAG 2.1 AA. | Current/prior series remain distinguishable without color. | Automated contrast where feasible plus keyboard/manual review |
| AC-008 | REQ-008 | Render the supplied high-volume/cost fixture under at least one comma-decimal locale and one dot-decimal locale | Summary values are compact and professionally rounded; ordinary currency totals do not show unnecessary four-decimal precision; exact evidence and CSV retain authoritative values. | Very small nonzero currency amounts may use additional precision sufficient not to appear as zero. | Deterministic locale formatter tests |
| AC-009 | REQ-010, REQ-012 | Exercise loading, retryable error, covered-empty, uncovered, partial coverage, full coverage, price-quality, mixed currency, local/no-bill, and no-comparison fixtures | Each state is intentional, truthful, and visually coherent; current state-specific recovery/action remains available. | Failed or newly applied selections do not leave stale values appearing current. | Component fixture matrix |
| AC-010 | REQ-011 | Navigate the whole page by keyboard/screen-reader landmarks | Tabs, controls, disclosures, status announcements, charts/equivalents, table/detail evidence, and Retry/Export have meaningful names and logical focus order; hover is not required. | Focus is restored to an appropriate trigger when a disclosure closes. | Keyboard and accessibility-tree verification |
| AC-011 | REQ-012 | Compare network/query behavior before and after visual redesign | Presets, Custom range, filters, metric, grouping, result states, and CSV use the same approved analytics contract and semantics; no visual-only interaction invents a server-side fact. | Contract changes are treated as a requirement gap, not bundled into this task. | Existing unit/integration/E2E suite plus request inspection |
| AC-012 | REQ-013 | Open Run details and exercise Task/Model, dates, fetch, expansion/sorting, costs, empty/loading/error states | The view uses the approved visual language while every current Run-details behavior and creation-time/lifetime explanation remains unchanged. | Migration/history errors remain actionable and do not expose internal error tokens. | Existing tests plus approved prototype/state review |
| AC-013 | REQ-014 | Open Token Statistics and resize/navigate Settings | No redundant large in-content page title appears; navigation width changes only by the established manual user interaction and remains mounted across section/view activity. | Narrow breakpoint recovery remains unchanged. | Existing Settings shell regression suite |
| AC-014 | REQ-001–REQ-014 | Review final implementation against the approved Product prototype | Visual hierarchy, state treatment, responsive behavior, and permitted variations match the user-approved UI/UX package; no material visible deviation is undocumented. | Any materially different behavior returns as a requirement/design impact. | Screenshot/reference comparison and UI/UX checklist |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Starting Condition | Steps Or Event Sequence | Expected Outcome | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Token-usage viewer | Populated partial-coverage current month with no comparable prior period, matching supplied captures | Open Token Statistics; scan top summary, trend, and drivers; inspect coverage reason | Actual usage dominates; partial coverage and no comparison are clear but proportionate | REQ-001–REQ-005; AC-001, AC-003, AC-004 |
| SCN-002 | User | Token-usage viewer | Full current and comparison coverage | Switch metric; inspect trend and pace | Current/prior meaning and exact evidence stay clear and consistent | REQ-005, REQ-007, REQ-012; AC-004, AC-006, AC-011 |
| SCN-003 | User | Evidence-oriented user | Multiple runtime/provider/model rows including local/unpriced usage | Change grouping/filter; inspect exact rows; export | Ranked and exact evidence remain exhaustive and truthful; export matches applied context | REQ-003, REQ-006, REQ-012; AC-002, AC-005, AC-006 |
| SCN-004 | User | User on constrained content width | Settings navigation is manually wide or viewport is narrow | Use controls, charts, table/details, and tabs | Layout reflows; no primary task is blocked by clipping or page-level overflow | REQ-003, REQ-009, REQ-011; AC-002, AC-005, AC-010 |
| SCN-005 | User | Run investigator | Analytics is open | Switch to Run details; change grouping/dates; inspect hierarchy/cost; return | Secondary workflow is visually coherent and semantically unchanged | REQ-001, REQ-013; AC-012 |
| SCN-006 | System | Analytics state contract | Query is loading, empty, failed, uncovered, or cost-incomplete | Render state and applicable recovery | Truthful, calm, non-stale state with appropriate action and accessible announcement | REQ-010–REQ-012; AC-009, AC-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: Exploratory brief `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirements-visualization-brief.md` and review record `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirements-visualization-review.md`. The prior specification at `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/done/token-statistics-analytics/ui-ux-spec.md` remains authoritative for analytics semantics, not for the rejected visual treatment.
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: Exploratory visualizer source `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/visualizers/REQPKG-TSUI-001`; clean review URLs: Direction A `http://127.0.0.1:3262/?direction=focus`, Direction B `http://127.0.0.1:3262/?direction=dense`. Canonical prototype repository/root: `/home/autobyteus/workspace/autobyteus-web-prototype`; Product worktree: `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001`. No final `ui-ux-spec.md` exists in exploratory mode.
- Product prototype ticket record and folder (externally owned): `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/prototype-ticket.md`; folder `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001`.
- Prototype revision or commit: Visualization `RV-003` and feasibility audit at `82505829cb62937f5acd479ce17668a66178a7a0`; ticket metadata through `e87642c952412cd06802ca8afe66ffbc3799bade`. Accepted prototype baseline implementation `6ba98942c669329f70ba902db4a2880375ad52ad`; its verified fast-forward integration tip on the prototype repository's `origin/personal` is `16638137bdb8ebe627507dac6c3c8bdbc5edf9d6`.
- UI/UX user-confirmation reference: `N/A — RV-003 awaits user selection; no approval claimed.`
- Approved visual-reference baseline: None yet. `VIS-001`–`VIS-008` are exploratory clarification evidence, not normative final screenshots. The two user-supplied captures remain the rejected current-state baseline.
- Normative visual and interaction details: Pending the user's Direction A/B/hybrid decision and `DEC-001`–`DEC-004` clarifications. `RV-003` presents a focused hierarchy and a dense explorer using only facts mapped to the current source-pin contracts. The unsupported illustrative Run-details model `Runs` count is forbidden because no authoritative current field exists.
- Explicitly illustrative fixture content or permitted implementation variation: Populated fixture values in the supplied captures and visualization may be illustrative; data meanings, state labels, and cost/coverage semantics are not illustrative.
- Required screens/states/transitions/feedback/responsive/accessibility outcomes: Desktop populated partial/no-comparison; desktop full/comparable; compact filter state; breakdown exact evidence; Run details; loading/empty/error; and narrow responsive behavior sufficient to resolve `DEC-001`–`DEC-004`.
- Explicitly unresolved product decisions: `DEC-001`–`DEC-004`.

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
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirements-visualization-review.md` | RV-002 review URLs, covered states, validation, limitations, and decision question | REQ-001–REQ-014; AC-001–AC-014 | Ready for user review | Exploratory only; no user approval yet |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/visual-references` | Direction A/B and state captures `VIS-001`–`VIS-008` | REQ-001–REQ-014; DEC-001–DEC-004 | Exploratory visual evidence | Non-normative until a direction is selected and finalized |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/implementation-feasibility-audit.md` | Field/action mapping to current frontend/server/GraphQL contracts and correction of unsupported `Runs` count | REQ-002–REQ-013; AC-001–AC-012 | `PASS` for RV-003 current-contract feasibility | Supporting evidence; no change to the no-backend-change scope |

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
| DEC-001 | What visual hierarchy best balances totals, trend, coverage, and unavailable comparison without returning to a generic card grid? | This is the primary professional-quality decision and cannot be approved from prose alone. | Compare at least two credible interactive compositions using the supplied populated state. | User, supported by Product Design | Open — visualization needed |
| DEC-002 | How compact should the range/filter/metric/export controls be, and which secondary filters may use progressive disclosure? | Affects scanability, discoverability, and responsive behavior. | Always-visible compact toolbar vs summary + expandable filters; active state must remain explicit. | User, supported by Product Design | Open — visualization needed |
| DEC-003 | How should exact breakdown evidence prioritize primary columns while retaining secondary cost-quality/status/currency fields? | Determines whether the result is both professional and auditable. | Responsive priority table, row detail disclosure, or split summary/evidence treatment; exhaustive evidence mandatory. | User, supported by Product Design | Open — visualization needed |
| DEC-004 | How far should the same visual language be carried into Run details in this package? | Affects scope and cross-tab cohesion. | Full restyle of existing components vs shell/control/state unification with existing dense tables retained. | User, supported by Product Design | Open — visualization needed |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001–REQ-005 | BEH-001–BEH-004 | AC-001–AC-004 | SCN-001, SCN-002, SCN-006 | Supplied capture 1; pending visualization |
| REQ-006 | BEH-003 | AC-005, AC-006 | SCN-003, SCN-004 | Supplied capture 2; prior data contract; pending visualization |
| REQ-007–REQ-009 | BEH-001–BEH-006 | AC-002, AC-005, AC-007, AC-008 | SCN-001–SCN-004 | Both supplied captures; pending visualization |
| REQ-010–REQ-012 | BEH-002–BEH-006 | AC-004, AC-006, AC-009–AC-011 | SCN-001–SCN-004, SCN-006 | Current code/tests and prior approved analytics contract |
| REQ-013 | BEH-005 | AC-012 | SCN-005 | Current Run-details code/tests; pending visualization |
| REQ-014 | BEH-001 | AC-013 | SCN-001, SCN-005 | Prior approved header/navigation requirements |

## Downstream Architecture Input

- Product and system constraints architecture must preserve: Existing analytics and Run-details contracts, fixed UTC semantics, coverage/pricing truthfulness, exact data/export, localization boundary, current Settings navigation policy, and accessibility semantics.
- Decisions intentionally deferred to architecture design: None yet. Target architecture is not being designed during this visualization round.
- Technical facts architecture should verify: Current change appears presentation-focused within existing frontend ownership, but the approved prototype may affect shared formatting/chart/table patterns; routing assessment will be performed only after user approval.
- Known feasibility or integration risks: Dense exact evidence and Chart.js accessibility/responsive behavior; ensuring formatter changes preserve exact tables/CSV; avoiding extra fetches from presentational state changes.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes, subject to DEC-001–DEC-004 visual clarification`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes, at visualization-round fidelity`
- Applicable scenarios are covered: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes for exploratory visualization; final prototype N/A at this stage`
- Applicable UI/UX approval and final visual-reference basis are recorded: `No — pending visualization and later final prototype`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `No`
- Requirements package ready for downstream route: `No`
- Remaining blocker: User selection of Direction A, Direction B, or a hybrid, including control disclosure, exact-evidence treatment, and Run-details unification for `DEC-001`–`DEC-004`; Requirements Engineering will then reconcile the decisions and request final prototype production if warranted.

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
