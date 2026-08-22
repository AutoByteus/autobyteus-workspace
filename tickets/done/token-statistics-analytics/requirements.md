# Token Statistics Analytics — Requirements

## Status

`Approved` — explicitly approved by the user on 2026-08-22 as the locked basis for solution design. On the same date, the user clarified after observing populated analytics that the earlier empty first-run view was expected because the new daily projection had not yet received usage; this clarification retains the SR-001 scope and does not add a retained-lifetime snapshot, backfill, or refresh requirement.

## Goal / Problem Statement

Turn Settings > Token Statistics into a trustworthy analytics surface that answers four user questions quickly:

1. How many tokens and how much estimated API cost did I use this month?
2. Is usage accumulating faster than in the previous comparable period?
3. Which runtime, provider, and runtime/model combination caused most of the usage?
4. Can I inspect and export the supporting numbers without the product overstating what those numbers prove?

The experience must prioritize observed usage in calendar periods, not merely select runs by creation date and show their lifetime totals. It must remain honest about incomplete pricing, mixed currencies, and the fact that application-observed consumption does not reveal or prove a provider's private quota or entitlement policy.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Settings > Token Statistics opens a compact control row with `Task`/`Model`, two date inputs, and Fetch. It defaults to the last seven days. | The page opens to an `Analytics` view for the current UTC calendar month through today, with clear presets/custom range, metric, and runtime/provider/model filters. A secondary `Run details` view retains the current task/run investigation capability. | Settings remains the entry surface; users can still inspect task/team/run rows and model-level details. | REQ-001–REQ-005, REQ-019; AC-001–AC-006, AC-024 |
| BEH-002 | The current model view has a table and one vertical bar chart of estimated total cost by runtime/model. It has no token trend, prior-period comparison, provider filter, contribution share, or monthly pace view. | The Analytics view shows summary facts, a chronological usage trend, a cumulative pace comparison against the prior comparable period, and a ranked driver breakdown with `Runtime + model` as the default grouping and Runtime, Provider, and Model alternatives. Users can switch the analytical metric between tokens and estimated cost. | Runtime/model identity remains visible; exact numeric detail remains available rather than being replaced by graphics alone. | REQ-006–REQ-012; AC-007–AC-016 |
| BEH-003 | Current statistics load one cumulative row per run selected by run creation time (or first-observed fallback) and show that run's lifetime total. The current store no longer retains event-level history, so it cannot truthfully allocate existing lifetime totals across past days or months. | New admitted, normalized token contributions are recorded into durable analytical history by observation time and exact runtime/provider/model identity. Calendar-period analytics use that history. Tracking begins with this feature; pre-feature lifetime totals are not fabricated into historical buckets, and the UI exposes the tracking coverage start. | Existing cumulative run records and lifetime run/team summaries remain authoritative and are not rewritten or discarded. | REQ-013–REQ-018; AC-017–AC-023 |
| BEH-004 | Token/cost tables already preserve input/cache/output/reasoning components, nullable costs, price-missing/partial/local/mixed statuses, and currencies. The existing chart omits unpriced costs with a note. | Every analytical aggregate preserves the same accounting semantics. Token totals never double-count cached input or thinking/reasoning output. Cost graphics and summaries visibly distinguish complete, partial, missing/local, and mixed-currency results; unpriced usage is never silently treated as zero cost. | Existing pricing calculation and stored per-observation cost estimates remain the basis; this feature does not become a provider invoice. | REQ-020–REQ-023; AC-025–AC-029 |
| BEH-005 | No analytics export exists. | The user can export the currently selected analytical period and filters as CSV with exact UTC range boundaries, runtime/provider/model identity snapshots, token components, estimated cost, currency, cost status, and tracking-coverage metadata. | Export is local/user-initiated and does not upload usage data. | REQ-024–REQ-025; AC-030–AC-031 |
| BEH-006 | Each token observation is reconciled, deduplicated, normalized, priced, and committed only to the cumulative run record inside the serialized run transaction. | The same admitted normalized contribution also advances the compact daily analytical projection inside that transaction; suppressed/no-advance observations do not advance either authority. | `TokenUsageRunAccumulator` remains the governing admission/atomicity owner and the cumulative run record remains the lifetime authority. | REQ-013–REQ-016; AC-017–AC-020 |

## Investigation Findings

- Current frontend entry: `autobyteus-web/components/settings/TokenUsageStatistics.vue`.
- Current UI queries both task and runtime/model statistics for a selected range and defaults to the preceding seven days.
- `TokenUsageModelStatisticsTable.vue` already renders an estimated-total-cost bar chart through `components/common/BarChart.vue`; the feature is therefore an expansion/replacement of a narrow chart, not a greenfield “first graph.”
- Current backend entry: `TokenUsageStatisticsResolver -> TokenUsageStatisticsProvider -> TokenUsageRunStore -> SqlTokenUsageRunRepository`.
- The repository query explicitly selects runs whose `runCreatedAt` (or `firstObservedAt` fallback) is in range. The page copy correctly says totals are each selected run's lifetime usage.
- Current persistence is deliberately one `TokenUsageRunRecord` per canonical agent run. It retains lifetime totals plus first/latest observation times and identity summaries, but not enough time-distributed data to reconstruct true past monthly usage.
- The admitted payload reaching `TokenUsageRunAccumulator` contains exact `observed_at`, normalized accounting deltas, runtime kind, provider identity, model identity, token components, estimated cost, currency, and pricing status. This is the trustworthy point from which future analytics can be accumulated without retaining raw provider events.
- Current cost semantics already support `estimated`, `partial_price_missing`, `price_missing`, `local_no_api_bill`, and `mixed`; mixed currencies cannot be summed into one trusted number.
- The UI already depends on Chart.js, but `BarChart.vue` owns only a single-series bar shape. Trend, comparison, horizontal/ranked, and accessible chart support will need clearer chart ownership rather than expanding one generic component indefinitely.
- Detailed intended interaction and visual hierarchy are defined in [`ui-ux-spec.md`](./ui-ux-spec.md), the eventual rendered reference is [`prototype.html`](./prototype.html), and every visible analytical datum is audited in [`token-usage-analytics-data-contract.md`](./token-usage-analytics-data-contract.md).
- Post-implementation field evidence shows 87.94M tokens, one active day, and the expected August 22 daily bucket after new usage was recorded. `Partial coverage` and `No comparable data` are correct because tracking began on August 22 and the prior comparison period was uncovered.
- The user confirmed that the earlier empty state occurred before any post-coverage usage existed and accepted the populated result as the completed ticket behavior. The daily-facet projection is therefore not defective; no existing-run lifetime summary, historical backfill, additional table, automatic polling, or other F-006 product correction is required.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/ui-ux-spec.md` | UI/UX specification for dashboard hierarchy, chart semantics, filters, states, responsive behavior, accessibility, and evidence export | REQ-001–REQ-025 | AC-001–AC-035 | `Approved` by user 2026-08-22 | Constrains intended observable behavior but does not replace this requirements doc |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/prototype.html` | Executable HTML reference for the eventual Settings UI, including responsive layout and supported interactions | REQ-001–REQ-025 | AC-001–AC-035 | `Approved` by user 2026-08-22 | Normative layout/interaction reference; illustrative values use the audited fixture shape, not production claims |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/token-usage-analytics-data-contract.md` | Field-by-field current-source and target-query audit for every visible prototype datum | REQ-002–REQ-025 | AC-002, AC-005, AC-007–AC-031 | `Approved` by user 2026-08-22 | Prevents implementation from treating invented UI values or unavailable provider quota facts as supported data |

## Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` / `Feature` with a persisted analytical projection.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` plus `File Placement Or Responsibility Drift` if added only in the current Vue/table/chart components.
- Refactor posture: `Likely Needed` in the statistics read/projection boundary; the authoritative cumulative run store itself should remain intact.
- Evidence basis: the current one-row-per-run storage is healthy for lifetime run accounting but intentionally cannot answer observation-time monthly analytics. The admitted normalized contribution exists only transiently. Accurate time analytics therefore needs a separate owned durable projection written from the authoritative accumulation transaction. On the frontend, the current model table directly owns a chart and the common `BarChart` supports only one narrow chart shape.
- Requirement or scope impact: extend token-usage persistence with a compact analytical history/projection, add a dedicated analytics query contract, and introduce purpose-owned analytics UI/chart components while preserving the cumulative run path.

## Recommendations

1. Make `Analytics` the default because it answers the common “this month / faster than before / what drove it?” questions; keep run/task detail secondary.
2. Use three complementary visual answers rather than one overloaded chart:
   - summary cards for absolute totals and prior-period change;
   - a chronological usage trend plus cumulative comparison line for consumption pace;
   - ranked horizontal bars for contribution share, defaulting to `Runtime + model`.
3. Default to the current calendar month through today and compare it with the same elapsed portion of the previous calendar month. For custom ranges, compare with the immediately preceding equal-duration range.
4. Treat Provider and Runtime as separate dimensions. Runtime means the execution backend (`Codex`, `Claude SDK`, `Autobyteus`); Provider means the model/API provider (`OpenAI`, `Anthropic`, a captured custom-provider name, `Ollama`, or `Unknown`).
5. Store compact time buckets derived only from admitted normalized contributions. Do not restore an unbounded raw-event ledger merely to draw charts.
6. Never allocate existing cumulative lifetime data to guessed historical dates. Show `Tracking since …` and distinguish “no tracked usage” from “tracking did not yet exist.”
7. Include CSV export because the stated user journey includes retaining and publishing evidence. Exported facts must include time basis and coverage/status caveats.
8. Do not label a fast-consumption pattern as provider cheating. The product can demonstrate measured usage pace and changes; quota entitlement and provider-side accounting require independent evidence.

## Scope Classification

`Large`

Although the visible change is a dashboard, accurate calendar-month analytics requires a new durable time projection, transactional write integration, query/aggregation contracts, data-quality semantics, multiple chart forms, filtering, export, and preservation of the existing lifetime-run experience.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001` — Open Token Statistics and immediately understand current-month tokens, estimated cost, and tracking coverage.
- `UC-002` — Compare current consumption pace with the previous comparable period and recognize materially faster/slower accumulation.
- `UC-003` — Filter observed usage by runtime, provider, and model.
- `UC-004` — Rank usage contribution by Runtime, Provider, Model, or Runtime + model and inspect exact values/share.
- `UC-005` — Switch between token and estimated-cost analytics without hiding pricing uncertainty.
- `UC-006` — Inspect existing task/team/run lifetime statistics as a secondary detail workflow.
- `UC-007` — Export selected aggregated analytics to CSV with enough metadata to reproduce and explain the result.
- `UC-008` — Understand loading, no usage, no historical coverage, partial pricing, mixed currency, and query failure states.

### Out of Scope

- Provider quota/allowance discovery, remaining-quota calculation, rate-limit API integration, or automatic accusations of provider misconduct.
- Predicting the exact date a private provider quota will be exhausted.
- Reintroducing raw provider-event retention or a per-notification audit ledger.
- Fabricating or probabilistically distributing pre-feature lifetime totals into historical dates/months.
- Provider invoice reconciliation, currency conversion, tax, credits, subscription fees, or non-token charges.
- Cloud upload, public sharing links, scheduled reports, notifications, anomaly alerts, or background exports.
- Per-workspace, per-agent-definition, per-team-member, or per-task filters in the Analytics dashboard; current run details remain available separately.
- Changing provider token limits, runtime behavior, token accounting formulas, pricing catalogs, or the live Token Meter.

### Preserved Behavior Boundary

- Preserve BEH-001's secondary run-detail capability and BEH-004's established token/cost semantics.
- Existing `TokenUsageRunRecord` lifetime totals, task/team hierarchy, model display fallbacks, migration-readiness errors, and live run/team token meter behavior must remain correct.
- The new analytical store is a derived projection and must not become a second authority for lifetime run totals.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- `REQ-001`: Settings > Token Statistics shall provide `Analytics` and `Run details` views, with `Analytics` selected by default.
- `REQ-002`: Analytics shall default to the current UTC calendar month from its first day through the current UTC day.
- `REQ-003`: Analytics shall provide presets for This month, Last month, Last 3 months, Last 12 months, and Custom. `This month` is month start through the current UTC day; `Last month` is the previous complete UTC month; `Last 3 months` begins at the first day of the month two months before the current month and ends after the current UTC day; `Last 12 months` follows the equivalent twelve-calendar-month window. Custom selection shall use inclusive UTC calendar dates translated to a half-open UTC instant range.
- `REQ-004`: Analytics shall use one fixed, visible `UTC` time basis for range boundaries, buckets, comparisons, labels, and export. The UI shall not infer, persist, or display a device IANA timezone as token-usage data.
- `REQ-005`: Runtime, Provider, and Model filters shall be combinable, shall default to All, and shall update every analytical card/chart/table/export consistently.
- `REQ-006`: Summary cards shall show Total tokens, Estimated API cost, Average tokens per active day, and change versus the prior comparable period. Where comparison is unavailable or the prior value is zero, the UI shall say so rather than showing an infinite or misleading percentage.
- `REQ-007`: The principal trend chart shall plot non-cumulative usage chronologically and choose a readable resolution based on range (daily for short ranges, weekly for medium ranges, monthly for long ranges), while preserving exact bucket dates in tooltips and the accessible table.
- `REQ-008`: A consumption-pace comparison shall plot cumulative selected-period usage against the prior comparable period aligned by elapsed calendar position. Month-to-date compares with the same elapsed portion of the preceding month, capped for a shorter month; Last month compares with the preceding complete month; Last 3 months and Custom compare with the immediately preceding equal-duration UTC range; Last 12 months compares with the same calendar window one year earlier.
- `REQ-009`: The breakdown shall use ranked horizontal bars and an exact table, defaulting to `Runtime + model`, with alternatives Runtime, Provider, and Model.
- `REQ-010`: Every breakdown row shall show the identity label, token/cost value, and share of the comparable total. Small remaining categories may be grouped as `Other` in the chart only if the exact table keeps all rows accessible.
- `REQ-011`: Users shall be able to switch the analytical metric between Tokens and Estimated cost; the selected range and filters shall remain stable.
- `REQ-012`: Chart hover/focus details shall show bucket/range, exact formatted value, comparison/breakdown identity, share where applicable, currency/status for cost, and whether the point is complete or partial.
- `REQ-013`: Analytical history shall be derived from each admitted normalized token contribution after cumulative-snapshot reconciliation and pricing calculation, using its normalized `observed_at` time and exact captured runtime/provider/model identity.
- `REQ-014`: Suppressed duplicates, regressed/no-advance cumulative snapshots, and zeroed unrecoverable contributions shall not add token or cost totals to analytics.
- `REQ-015`: The analytical write and authoritative cumulative run-record update shall have one atomic success/failure boundary so charts cannot drift from admitted lifetime accounting.
- `REQ-016`: The analytical representation shall be compact and bounded by time bucket plus analytical identity, not one durable row per provider notification.
- `REQ-017`: Tracking coverage shall begin when the new projection becomes active. Existing lifetime run records shall not be rewritten, deleted, or backfilled into guessed analytical periods.
- `REQ-018`: The API/UI shall expose tracking coverage so a range wholly or partly before tracking began is visibly classified as unavailable/partial coverage rather than zero usage.
- `REQ-019`: Run details shall preserve the current task/team/run table, expansion, sorting, cost breakdown, created-time fallback, migration-readiness error, and current run-created-in-range/lifetime-total semantics with clear explanatory copy.
- `REQ-020`: Token metrics shall use normalized accounting input/output/total values. Cached input is a subset/billing component of input and thinking/reasoning is included in output; neither may be added again to total tokens.
- `REQ-021`: Estimated cost shall use the captured estimate produced for the admitted contribution. Later catalog changes shall not retroactively rewrite historical estimated cost in this ticket.
- `REQ-022`: Partial or missing price dimensions shall remain visible. Unpriced contributions may contribute to token charts but shall not be plotted as zero cost or included in a supposedly complete cost total.
- `REQ-023`: Different currencies shall not be summed into one monetary value. Cost mode shall present per-currency results or a mixed-currency state with exact rows, and shall never perform implicit currency conversion.
- `REQ-024`: `Export CSV` shall export the currently selected UTC analytics range, filters, and grouping at the selected-period identity-breakdown grain shown to the user.
- `REQ-025`: Export rows shall include applied range start/end, runtime kind, raw/captured/provider display identity, raw/value/display model identity, gross input, cached input, output, total tokens, estimated input/output/total cost, currency, cost status, missing price dimensions, usage report count, and tracking coverage start. Export shall be local and user-initiated.

## Acceptance Criteria

- `AC-001`: Opening Settings > Token Statistics with tracked data selects Analytics and This month, and shows `UTC` as the fixed calendar time basis.
- `AC-002`: On 2026-08-22 UTC, This month queries `[2026-08-01T00:00:00.000Z, 2026-08-23T00:00:00.000Z)` rather than passing ambiguous bare dates.
- `AC-003`: Selecting Last month, Last 3 months, Last 12 months, or a valid Custom range refreshes all analytical surfaces with the same effective range.
- `AC-004`: A custom end date before its start date is prevented or produces an inline validation message; no browser alert is required.
- `AC-005`: Selecting Runtime=Codex, Provider=OpenAI, and Model=gpt-5.6-sol constrains cards, both charts, breakdown rows, and CSV to that intersection.
- `AC-006`: Switching to Run details retains the existing lifetime-by-run table behavior and clearly states that its range selects runs by creation time.
- `AC-007`: The summary area shows total tokens, estimated cost/status, active-day average, and prior-period change without requiring chart hover.
- `AC-008`: When selected-period tokens are 300M and the comparable prior-period tokens are 5B, the comparison displays 300M, 5B, and an accurate decrease; when the values are reversed it displays the accurate increase.
- `AC-009`: If no comparable covered period exists, the comparison says `No comparable data` (or equivalent), not `0%`.
- `AC-010`: For a one-month range the trend uses daily buckets; for a twelve-month range it uses monthly buckets; tooltips and the exact table retain explicit dates.
- `AC-011`: A month-to-date pace chart aligns day 1…current day against day 1…the same ordinal day of the previous month, capping safely for shorter months.
- `AC-012`: The cumulative endpoint of each pace line equals the corresponding summary total for the same metric/filter/period.
- `AC-013`: Breakdown defaults to Runtime + model and ranks the largest contribution first.
- `AC-014`: Switching breakdown to Provider shows OpenAI/Anthropic/custom provider/Ollama/Unknown labels independently from runtime labels.
- `AC-015`: When chart categories are collapsed into Other, the adjacent exact table still exposes every underlying row and exact value.
- `AC-016`: Switching Tokens/Estimated cost does not reset range, filters, grouping, or view.
- `AC-017`: A normalized contribution observed at `2026-08-01T00:10:00.000Z` appears in the August UTC bucket even if its run was created in July.
- `AC-018`: A run created in August whose only admitted contribution occurred in September contributes to September analytics, not August analytics.
- `AC-019`: A duplicate or no-advance cumulative snapshot leaves both the cumulative run total and analytical totals unchanged.
- `AC-020`: A write failure cannot leave the cumulative run record advanced while the analytical projection is missing the same admitted contribution, or vice versa.
- `AC-021`: Immediately after upgrade, a pre-feature July range does not show existing lifetime totals as July usage; it shows that analytics tracking was unavailable then.
- `AC-022`: A range that begins before tracking and ends after tracking visibly shows partial coverage and the exact tracking-start time.
- `AC-023`: Existing current token run records remain readable and unchanged after the analytical schema is introduced.
- `AC-024`: Task/team expansion, sorting, created-time fallback, and row cost details continue to work in Run details.
- `AC-025`: A contribution with 1,000 gross input tokens including 800 cached input and 200 output tokens reports 1,200 total tokens, not 2,000.
- `AC-026`: Thinking/reasoning tokens reported as a subset of output do not increase total tokens or total cost a second time.
- `AC-027`: Unpriced usage appears in token mode and visibly marks cost as missing in cost mode; it is not rendered as `$0.00`.
- `AC-028`: Partial pricing shows the estimated known amount plus partial status and missing dimensions; it is not labeled complete.
- `AC-029`: USD and EUR contributions are not added into one number; the UI shows separate currency totals or an explicit mixed state with exact rows.
- `AC-030`: Export after applying a range/filter/grouping contains only the visible selected-period identity breakdown and records the exact applied half-open UTC range.
- `AC-031`: Export does not make a network upload and uses a deterministic filename containing the selected date range.
- `AC-032`: Loading uses a non-blocking visible loading state; stale prior results are not presented as if they belong to newly changed filters.
- `AC-033`: Empty covered usage, wholly unavailable historical coverage, partially covered range, query error, and migration-readiness error have distinct, actionable messages.
- `AC-034`: Charts are keyboard reachable, do not rely on color alone, expose text equivalents/exact tables, and provide programmatic names for metric, range, and series.
- `AC-035`: At narrow widths, controls and summary cards stack, charts remain legible without clipping labels, and exact tables remain reachable by horizontal scrolling or an equivalent responsive layout.

## Constraints / Dependencies

- Existing normalized token/cost accounting and pricing statuses are authoritative inputs; analytics must not recalculate provider observations independently.
- Current Chart.js dependency may be reused; no new visualization dependency is required unless design review finds an evidenced gap.
- SQLite remains the persistence target and token counts may exceed 32-bit integer range; storage and GraphQL transport must preserve existing BigInt/SafeInt protections.
- The application is local-first. No server-side provider quota contract or invoice data is assumed.
- Query result size must be bounded through server-side aggregation appropriate to the selected display resolution; the UI must not load raw contribution history.
- Exact provider/model display fallback rules must reuse or extend the token-usage subsystem's existing display projection.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing `token_usage_run_records`; new compact token-usage analytical history and a tracking-coverage marker in the same local application database.
- Required outcome: `Directly Usable — No Migration` for existing run records; a normal additive schema migration creates new analytical storage, but no app-data transformation/backfill of existing lifetime totals is authorized.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all current cumulative run records unchanged. Do not copy them into dated analytics buckets. Legacy raw-event rows already decommissioned by the prior migration are not recreated.
- Unacceptable data loss or corruption: Any change to existing lifetime totals, run/team attribution, cost statuses, or future admitted contributions; any false historical allocation.
- Relevant availability, maintenance-window, or rollout constraints: Additive schema setup must complete before analytical writes are enabled. Failure must not silently produce divergent accounting; startup/readiness behavior belongs in design while respecting current migration conventions.
- Related requirement and acceptance-criteria IDs: REQ-013–REQ-018, REQ-020–REQ-023; AC-017–AC-023, AC-025–AC-029.

## Assumptions

- Each admitted normalized contribution has sufficient runtime, provider/model (or explicit Unknown), token, cost/status, and observation-time data for future analytical bucketing.
- UTC calendar boundaries are acceptable for this evidence-oriented view and avoid inventing or depending on a user-timezone preference that the current token-statistics contract does not contain.
- Provider label precedence can reuse captured custom-provider name and model-provider identity without a new remote lookup.
- The selected-period CSV is an aggregated evidence artifact, not a raw provider log or invoice.

## Risks / Open Questions

- The principal product limitation is unavoidable: exact month-by-month history before feature activation no longer exists in current storage.
- A provider may account quota tokens differently from the application's normalized usage; this dashboard can show application-observed consumption but cannot alone prove a quota reduction.
- Very high cardinality from arbitrary custom provider/model values must be bounded safely without merging distinct identities incorrectly.
- Cost charts with mixed currencies and incomplete pricing require careful UI hierarchy to remain useful without implying a false total.
- The user may later want alerts, quota targets, or workspace/task filters; those are separate requirements.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001–REQ-007, REQ-017–REQ-018, REQ-020–REQ-023.
- UC-002: REQ-006–REQ-008, REQ-017–REQ-018.
- UC-003: REQ-003–REQ-005, REQ-013.
- UC-004: REQ-009–REQ-012.
- UC-005: REQ-011–REQ-012, REQ-020–REQ-023.
- UC-006: REQ-001, REQ-019.
- UC-007: REQ-024–REQ-025.
- UC-008: REQ-017–REQ-018, REQ-022–REQ-023 and UI/UX non-happy-path requirements.

## Acceptance-Criteria-To-Scenario Intent

- AC-001–AC-006 cover entry, UTC range semantics, filtering, validation, and preserved run details.
- AC-007–AC-016 cover summary, trend, pace comparison, breakdown, and metric continuity.
- AC-017–AC-023 cover observation-time correctness, deduplication, atomicity, coverage honesty, and preservation.
- AC-024–AC-029 cover preserved detail behavior and exact token/cost semantics.
- AC-030–AC-031 cover evidence export.
- AC-032–AC-035 cover loading/error/empty distinctions, accessibility, and responsive behavior.

## Approval Status

Approved by the user on 2026-08-22 together with the linked UI/UX specification, executable HTML prototype, and prototype data-contract audit. The user subsequently confirmed from a populated live result that initial emptiness before the first post-coverage usage was expected and that the ticket is working/done. That clarification rejects the proposed F-006 retained-lifetime expansion and leaves BEH-001–BEH-006, REQ-001–REQ-025, and AC-001–AC-035 as the complete authority. Scope-changing proposals still require renewed user approval.
