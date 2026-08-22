# Token Statistics Analytics — Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements basis and intended-behavior supplements approved by the user on 2026-08-22; architecture-level investigation and design complete; solution package ready for architecture review.
- Investigation Goal: Map current token-statistics data/query/UI behavior, determine which analytical questions are valuable and supportable, and identify the minimum truthful persistence change needed for calendar-month graphs.
- Scope Classification: `Large`
- Scope Classification Rationale: The user-visible dashboard requires a new observation-time analytical projection, atomic write integration, query aggregation, filters/export, multiple accessible chart forms, and preservation of current lifetime-run detail.
- Scope Summary: Current-month tokens/cost, prior-period pace comparison, runtime/provider/model attribution, exact evidence/export, tracking-coverage honesty, and preserved run details.
- Primary Questions Resolved: Current page/data path; current chart capability; date semantics; stored identity/cost fields; why past months cannot be reconstructed; authoritative contribution point for future analytics; runtime vs provider distinction; cost/mixed-currency caveats; intended graph hierarchy.

## Request Context

The user reports that provider allowances can appear to drain much faster than before and wants Token Statistics to show intuitively how many tokens and how much money were used in a month, especially by runtime/provider and model. They want historical comparisons that can support provider reports or public evidence.

Product interpretation:

- The important decision is not “add any graph”; it is to answer how much, how fast compared with before, and which runtime/provider/model drove it.
- Application-observed token consumption can document pace and composition but cannot by itself establish the provider's quota entitlement or prove misconduct.
- A credible answer requires usage observed during a month. The current range instead selects runs created during the range and reports their lifetime totals.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics`
- Current Branch: `codex/token-statistics-analytics`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics`
- Bootstrap Base Branch: `origin/personal` at `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-22 before worktree creation.
- Task Branch: `codex/token-statistics-analytics`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared checkout contains unrelated untracked `.article-work/`. All authoritative artifacts and later changes belong only in this dedicated worktree.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/ui-ux-spec.md` | Define analytical information hierarchy, chart roles, controls, journeys, text, loading/empty/error/coverage states, responsive behavior, accessibility, and export workflow | Intended observable behavior | Requirements; design spec | REQ-001–REQ-025; AC-001–AC-035 | `Approved` | Approved by user 2026-08-22 | Keep aligned during design/rework |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/prototype.html` | Self-contained executable reference for the eventual Settings > Token Statistics layout, responsive hierarchy, and principal interactions | Intended visual and interaction behavior, using an explicitly illustrative reconciled fixture | Requirements; UI/UX spec; design spec | REQ-001–REQ-025; AC-001–AC-035 | `Approved` | Approved by user 2026-08-22 | Keep aligned during design/rework |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/token-usage-analytics-data-contract.md` | Audit every prototype datum against current stored/contribution fields, deterministic formulas, or required target query metadata | Intended contract constraints plus verified current-source evidence | Requirements; UI/UX spec; prototype; design spec | REQ-002–REQ-025; AC-002, AC-005, AC-007–AC-031 | `Approved` | Approved by user 2026-08-22 | Keep aligned during design/rework |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/evidence/prototype-desktop.png` | Rendered desktop evidence for the HTML prototype | Visual check of the default desktop state | Prototype; UI/UX spec | REQ-001–REQ-012; AC-001, AC-007–AC-016, AC-035 | `Evidence` | N/A — generated validation evidence, not behavior authority | Regenerate after any visual change |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/evidence/prototype-mobile.png` | Rendered 500px narrow-layout evidence for the HTML prototype | Visual check of stacked controls/cards/charts at the Chrome headless minimum viewport | Prototype; UI/UX spec | REQ-001–REQ-012; AC-035 | `Evidence` | N/A — generated validation evidence, not behavior authority | Regenerate after any visual change |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-22 | Command | `git remote -v`; `git symbolic-ref refs/remotes/origin/HEAD`; `git branch -vv`; `git worktree list --porcelain`; `git fetch origin --prune` | Resolve fresh base and isolation | Remote default/tracked integration is `origin/personal`; dedicated worktree created from refreshed commit `8ef282ba7` | No |
| 2026-08-22 | Doc | User request in current task | Capture user questions and evidence motivation | Monthly tokens/cost, runtime/provider/model attribution, fast depletion, and evidence are primary | No |
| 2026-08-22 | User approval | User response in current task | Lock the requirements basis before design | User explicitly approved the requirements, UI/UX behavior, HTML prototype, and data-grounding approach and requested a proper design following the design principles | No |
| 2026-08-22 | Team design authority | `.codex/skills/solution-designer/design-principles.md` from the source checkout | Apply required ownership, spine, persisted-data, and clean-boundary guidance before later design | Confirms the design must retain the cumulative-run authority, give the new projection one owner and atomic spine, make the additive persisted-data decision explicit, and avoid stretching existing detail/chart files into mixed responsibilities | Apply after requirements approval |
| 2026-08-22 | Code | `autobyteus-web/pages/settings.vue` | Verify entry surface | Settings renders `TokenUsageStatistics` for section `token-usage` | No |
| 2026-08-22 | Code | `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Inspect current journey and states | Task/Model select; two date inputs; Fetch; defaults last seven days; explicit loading/error/empty states; copy states run-created/lifetime semantics | No |
| 2026-08-22 | Code | `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue`; `components/common/BarChart.vue` | Verify current graph capability and ownership | Existing model table already embeds one total-cost bar chart; common chart supports one single-series vertical bar shape | Yes — design purpose-owned analytics chart components |
| 2026-08-22 | Code | `autobyteus-web/stores/tokenUsageStatistics.ts`; `graphql/queries/token_usage_statistics_queries.ts`; `types/tokenUsageStatistics.ts` | Trace frontend data contract | Store issues task + model GraphQL queries together; aggregates contain full token/cost/status/identity summaries; no time buckets/provider filter/comparison/coverage | No |
| 2026-08-22 | Code | `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Trace API entry and date types | Three statistics queries accept start/end Date; model response groups runtime/model; no analytical result contract | No |
| 2026-08-22 | Code | `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts`; `providers/token-usage-run-store.ts`; `repositories/sql/token-usage-run-repository.ts` | Verify current statistics semantics | Provider loads whole cumulative run records whose `runCreatedAt`/fallback is in range, then groups lifetime totals | No |
| 2026-08-22 | Code | `autobyteus-server-ts/prisma/schema.prisma`; `token-usage/domain/token-usage-run-record.ts`; SQL codecs | Inspect persistence and available historical dimensions | One current row per run stores lifetime token/cost totals, identity summaries, first/latest timestamps; insufficient to distribute existing totals over past periods | No |
| 2026-08-22 | Code | `token-usage/services/token-usage-run-accumulator.ts`; `projections/token-usage-run-fold.ts`; `projections/token-usage-run-record-state.ts` | Identify authoritative write point and admission semantics | Fold reconciles cumulative snapshots, suppresses duplicates/no-advance observations, calculates normalized contribution, and persists current run row transactionally | Yes — design analytical projection in same transaction |
| 2026-08-22 | Code | `agent-execution/domain/agent-run-token-usage.ts`; Codex/Claude usage adapters | Verify contribution fields and identity semantics | Payload has exact observed time, runtime, provider/custom name, model, normalized token components, estimated costs, currency/status; Codex provider=`OPENAI`, Claude=`ANTHROPIC` | No |
| 2026-08-22 | Code | `token-usage/projections/token-usage-run-aggregate.ts`; `token-usage-cost-summary-aggregate.ts` | Verify totals/cost caveats | Total uses accounting total; cached input is a component of input; reasoning is included diagnostic; mixed currency yields no combined cost; price statuses retained | No |
| 2026-08-22 | Test | `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts`; token usage table/store tests; `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`; token-usage GraphQL E2E tests | Locate maintained behavior authority | Tests lock current compact controls, last-week default, task/model empty states, run-created copy, grouping/status semantics | Yes — downstream coverage investigation will classify required changes |
| 2026-08-22 | Doc | `tickets/done/token-usage-one-row-per-agent-run/requirements.md`; `tickets/done/token-statistics-table-ux/requirements.md`; related investigation/design artifacts | Understand deliberate prior tradeoff | Event history was intentionally removed for bounded one-row lifetime accounting; prior approved choice explicitly accepted loss of arbitrary-period usage and noted time buckets would be required to restore it | No |
| 2026-08-22 | Local data, read-only | `sqlite3 -readonly '/Users/normy/Library/Application Support/autobyteus/server-data/db/production.db' '.tables'`; table-name probe | Check whether representative current-schema production rows could ground the prototype fixture | Available local DB is an older schema with `token_usage_records` and no current `token_usage_run_records`; it is not representative of the checked-out implementation and was not used for any production-data claim or fixture value | No — code/current tests remain the structural authority |
| 2026-08-22 | Prototype | `tickets/in-progress/token-statistics-analytics/prototype.html`; `token-usage-analytics-data-contract.md` | Produce and self-audit the requested eventual UI reference | HTML uses current Settings structure and exact existing identity/aggregate field names; target-only range/comparison/coverage/bucket fields are explicitly enumerated; unsupported quota/provider assertions are absent; fixture values reconcile | Approved by user 2026-08-22 |
| 2026-08-22 | Command / browser | Python `html.parser`; `node --check`; headless Chrome desktop/narrow screenshots; browser `run_script` interaction/reconciliation probes | Validate the executable artifact rather than relying on source inspection alone | HTML parses; inline JS passes syntax validation; default totals are 300M tokens/293M input/7M output/$82.41 known partial cost; five rows and 22 daily bars render; Runtime+Provider+Model filter yields the exact 189M intersection; DeepSeek cost mode renders Price missing and no priced chart data; Last month renders 239.4M/31 bars; Run details exposes preserved range copy; screenshots show desktop and stacked narrow hierarchy | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select Settings > Token Statistics; choose Task/Model and dates; Fetch | `settings.vue -> TokenUsageStatistics.vue -> tokenUsageStatistics store -> Apollo task/model queries` | Defaults last seven days; range is shared across Task/Model; explicit loading/error/empty states | Vue component/store/tests |
| BEH-002 | User | Select Model with nonempty results | `TokenUsageStatistics -> TokenUsageModelStatisticsTable -> BarChart -> Chart.js` | Table plus one cost-only bar per runtime/model; null costs omitted/marked; no time or comparison axis | Model table, BarChart, localization |
| BEH-003 | Contract | Query statistics in period | `GraphQL resolver -> TokenUsageStatisticsProvider -> TokenUsageRunStore.listRunsCreatedInRange -> SqlTokenUsageRunRepository -> build aggregate/tree` | Date range selects run creation/fallback; each selected run contributes lifetime total. Current one-row data cannot answer observed usage in month | Resolver/provider/repository/schema/prior ticket |
| BEH-004 | Contract | Aggregate token/cost summaries | `buildTokenUsageRunAggregate` over cumulative records | Accounting total avoids cache/reasoning double count; cost remains nullable/status-aware; different currencies are not combined | Projection code and provider-semantics E2E |
| BEH-005 | User | Export analytics | No Current Path | No export exists | Repository search and current UI |
| BEH-006 | System | Runtime/provider emits token observation during a run | runtime adapter/event pipeline -> context/pricing enrichment -> `TokenUsageRunStore.recordObservation -> TokenUsageRunAccumulator -> foldTokenUsageObservation -> SqlTokenUsageRunRepository.save` | One normalized, deduplicated/reconciled contribution atomically advances cumulative run state; the authoritative payload contains exact analytics dimensions before raw observation is discarded | Domain payload, accumulator, fold, record-state code |

## Design Health Assessment Evidence

- Change posture: `Larger Requirement` / Feature.
- Candidate root cause classification: `Boundary Or Ownership Issue` for missing observation-time projection; `File Placement Or Responsibility Drift` if dashboard logic is placed inside current table/common bar component.
- Refactor posture evidence summary: Keep the current cumulative-run owner. Add a sibling analytical projection owned by token usage and written from the same admission transaction. Split frontend analytics into purpose-owned surfaces; do not overload `BarChart.vue` or `TokenUsageModelStatisticsTable.vue`.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Prior one-row requirement + current schema | Event history removal was intentional; one row per run is efficient and healthy for lifetime totals | Do not reverse the prior refactor or rebuild raw event storage | Design compact analytical projection |
| Accumulator/fold | Authoritative normalized delta exists after reconciliation inside run transaction | This is the correct single write boundary for future analytics | Specify atomic write spine |
| Statistics provider/repository | Range query expresses run-created/lifetime semantics and groups full records | Current API cannot be stretched into true time-series without lying | Add explicit analytics query subject; preserve run query |
| Current model table/common chart | Table owns one chart and common component owns only one shape | Adding trend/comparison/breakdown here would mix responsibilities | Define chart/data component ownership in design |
| Cost aggregate | Mixed currency and partial pricing have explicit semantics | Analytics contract must carry quality metadata, not just numeric arrays | Make quality/status first-class |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | Settings section router/layout | Correct entry owner | Minimal/no structural change expected |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Entire token-statistics page controls/state branching | Suitable page facade but should not own all analytics chart transforms | Keep as thin view coordinator |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | Model table + cost chart | Chart concern is embedded in a detail table | Remove/replace embedded chart when analytics owns graphs |
| `autobyteus-web/components/common/BarChart.vue` | Generic single-series bar wrapper | Too narrow for line/comparison/horizontal accessible analytics; broadening generically risks mixed responsibility | Design purpose-owned chart wrappers/config builders |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Fetch/normalize task and model statistics | One store could remain subsystem owner but contract must split analytics from run details clearly | Design explicit analytics state/query boundary |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Task/model query documents/fragments | Existing aggregate fragment reusable; no analytics contract | Add explicit analytics query/fragment |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL DTO/resolver for token usage | Large file already owns several DTOs/resolvers; analytics additions may trigger responsibility split | Assess file split in design |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Lifetime task/runtime-model statistics | Correct existing owner for current semantics, not a raw time-series source | Add separate analytics provider under same subsystem |
| `autobyteus-server-ts/src/token-usage/services/token-usage-run-accumulator.ts` | Serialize and transactionally fold run observations | Correct authoritative integration owner | Extend transaction work to update projection atomically |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-run-fold.ts` | Normalize/admit/suppress observation into authoritative contribution | Must remain source of admission decision; analytics must not duplicate it | Consume fold result, do not reimplement |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-run-repository.ts` | Current run persistence/range list | Transaction type can support sibling repository within same transaction | Keep run repo focused; separate analytics repository |
| `autobyteus-server-ts/prisma/schema.prisma` | SQLite schema | Needs additive compact analytics model and indexes; existing run model preserved | No historical backfill |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-22 | Static trace | `rg`/`sed`/`cat` commands recorded in Source Log | Confirmed production paths without mutating runtime/data | Runtime launch not needed to establish the data-model limitation; downstream implementation should visually validate dashboard |
| 2026-08-22 | Read-only local DB probe | `sqlite3 -readonly ... production.db` | Local database contains only the retired `token_usage_records` shape, not current `token_usage_run_records` | No current-schema production dataset is available locally; using it would falsely mix legacy data with the current contract, so the prototype deliberately uses a labeled illustrative fixture | None |
| 2026-08-22 | Browser interaction probe | Open local `prototype.html`; programmatically change runtime/provider/model, metric, range, and view; query rendered DOM | Cross-surface filter, unpriced-cost, preset, and Run-details states update consistently; fixture arithmetic reconciles (`300,000,000 = 293,000,000 + 7,000,000`; known input/output cost parts sum to `$82.41`) | None before user review |
| 2026-08-22 | Architecture trace | `token-usage-run-accumulator.ts`; `token-usage-run-fold.ts`; `token-usage-run-record-state.ts`; SQL run repository | Verify transaction/admission boundary and concurrency implications | Per-run queue serializes only one run; fold owns CHANGED/SUPPRESSED; current repository opens one Prisma transaction. Different runs can target the same analytical bucket, so analytical persistence needs a single atomic SQL upsert rather than application read-modify-write | Reflected in design DS-001/DS-006 |
| 2026-08-22 | Architecture trace | `token-usage-run-aggregate.ts`; `token-usage-pricing-summary.ts`; `token-usage-cost-summary-aggregate.ts`; `token-usage-run-record.ts` | Find reusable accounting authority | Aggregate construction already centralizes SafeInt, nullable cost, pricing summary, cache, and mixed-currency rules, but generic constants/types are located under the run-record subject | Extract a tight shared accounting summary and reuse one aggregate builder |
| 2026-08-22 | Architecture trace | `prisma/schema.prisma`; Prisma migrations; `startup/migrations.ts`; `token-usage-current-schema-readiness.ts`; `server-runtime.ts` | Determine persisted-data rollout boundary | Startup deploys checked-in Prisma migrations before Prisma initialization and performs fatal current-schema checks; additive empty analytics tables plus a once-only coverage marker fit this path and need no app-data backfill | Extend readiness and initialize coverage before serving requests |
| 2026-08-22 | Architecture trace | GraphQL token-usage resolver/schema; web codegen configuration; current query/store/component/tests | Determine API/client ownership and removal scope | Current GraphQL file is already broad; generated web types are repository practice; current store/page mix only run-detail subjects; `BarChart.vue` has one caller | Add separate analytics resolver/query/store/view, extract shared DTO, and delete the superseded sole-use chart |

## External / Public Source Findings

No external source was required. This feature reports the application's own recorded data and its current code is the authoritative contract. No external provider quota policy is assumed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for requirements investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: refreshed remote refs and created dedicated worktree/branch.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **A graph already exists, but answers the wrong class of question.** It ranks estimated cost by runtime/model for selected created runs; it cannot show consumption over time or pace.
2. **The current range is not “usage during period.”** It is deliberately “runs created during period, lifetime totals.” This is truthful for task investigation but unsuitable for monthly allowance analysis.
3. **Historical monthly distribution has been irreversibly compacted.** The store holds first/latest observation and cumulative totals, not enough timestamps/deltas to reconstruct monthly facts. Any historical backfill would be fabricated.
4. **The right future source exists.** After cumulative reconciliation and price calculation, `foldTokenUsageObservation` returns the admitted normalized contribution with exact observation time and identity. This supports compact time aggregation without raw event retention.
5. **Runtime and Provider are distinct.** Examples: runtime `codex_app_server` with provider `OPENAI`; runtime `claude_agent_sdk` with provider `ANTHROPIC`; runtime `autobyteus` may use a custom provider name, remote provider, or local Ollama.
6. **Token and cost need different honesty rules.** All admitted usage can contribute to tokens. Cost can be complete, partial, missing, local/no-bill, or incomparable across currencies.
7. **Pace is more diagnostic than totals alone.** A cumulative comparison aligned by elapsed period directly reveals “we reached X tokens much earlier this month,” while a chronological non-cumulative trend shows spike timing and a ranked breakdown shows cause.
8. **Evidence needs context.** Export must include the exact half-open UTC range, filters, grouping, identity snapshots, coverage start, and price status; otherwise a CSV total can be misread as a provider bill or full historical record.
9. **The host timezone was not a legitimate datum.** An early prototype copied `Europe/Berlin` from the execution environment even though no token-statistics contract stores a user timezone. It was removed. The intended view now uses a fixed, visible UTC basis that can be derived exactly from `observed_at` and requested ISO instants.
10. **Prototype values are not production claims.** The available local DB is a legacy incompatible schema. The HTML fixture is therefore explicit, structurally aligned, and internally reconciled; its numbers/model examples exist only to render the intended states. The data-contract supplement distinguishes every existing field, deterministic result, and required new field.
11. **Cross-run writes require atomic facet upsert.** Existing in-process serialization is keyed by `runId`; two runs can legitimately contribute to the same UTC day/runtime/provider/model. A load/merge/save analytics row would lose updates. The target uses a homogeneous accounting facet and SQL `ON CONFLICT DO UPDATE` inside the existing run transaction.
12. **Nullable identity tuples are not safe uniqueness keys in SQLite.** Provider/model snapshot fields can be null, and SQLite unique constraints permit multiple null tuples. The target returns opaque provider/model keys and persists a non-null canonical facet digest while retaining raw snapshot columns for display/evidence.
13. **Coverage needs a singleton marker independent of first usage.** Deriving tracking start from the earliest bucket would misclassify installations that had no usage immediately after upgrade. Startup initializes one persisted coverage instant after the analytical schema passes readiness.
14. **One shared aggregate authority is necessary.** Token totals, nullable costs, missing dimensions, and mixed currencies already have nontrivial semantics. The target extracts the generic accounting source/builder rather than duplicating calculations for analytics.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: `token_usage_run_records`, one wide cumulative row per canonical run. Prior production evidence recorded 1,269 runs after compacting ~154k event rows; current volume scales by runs, not notifications.
- Relevant code-model, serialization, semantic, or physical-store change: Add a compact daily analytical subject keyed by non-null canonical facet digest and storing exact runtime/provider/model snapshots plus homogeneous pricing/cache signature; add one singleton tracking-coverage row; leave current run row unchanged.
- Normal readers and writers, including unknown/extra-field behavior: Run writer is `TokenUsageRunAccumulator` + SQL repository; statistics readers load full run records. Prisma schema controls SQLite.
- Representative direct-read or compatibility evidence: Existing current run records already satisfy preserved lifetime behavior; they cannot satisfy new historical analytics because only first/latest timestamps remain.
- Required semantics and invariants preserved by direct use: `Yes` for existing run/lifetime data; `No` for true past monthly allocation. Evidence: schema/domain record and prior one-row ticket.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Local SQLite; raw per-notification retention was removed for size/boundedness. New projection must remain compact and local. It is durable evidence and should not be silently rebuilt from current lifetime rows.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Transforming current lifetime rows into past buckets would be cheap but semantically false; therefore prohibited. Additive schema creation plus tracking-start marker is sufficient.
- Existing migration framework or lifecycle constraints: Prisma schema migration/startup readiness already exists. The design uses an additive schema migration, extends the fatal current-schema readiness check, and initializes coverage once before serving requests. Existing historical token migration readiness remains preserved.

## Constraints / Dependencies / Compatibility Facts

- One cumulative run row remains the authoritative lifetime accounting subject.
- Analytical projection must use admitted contributions and share the run transaction; asynchronous best-effort duplication would allow drift.
- Query aggregation must be server-owned and bounded; frontend must not load raw history.
- Existing GraphQL uses SafeInt scalars for token values; aggregated token volumes may approach JavaScript SafeInt and must retain overflow handling.
- Custom provider/model display can change externally, but usage payload captures provider name/model identity. Historical evidence should use captured identity rather than silently relabel through current configuration where that would alter meaning.
- No current provider quota/entitlement API is part of the application contract.

## Open Unknowns / Risks

- Very high custom-identity or pricing-signature cardinality can grow daily facet rows; the design remains one row per day/facet rather than per notification and uses server-side/indexed aggregation, but this remains an operational residual risk.
- Pre-feature history limitation must be prominent enough that users do not interpret missing history as zero consumption.

## Notes For Architecture Reviewer

Ready for architecture review. The approved basis is `requirements.md`, `ui-ux-spec.md`, `prototype.html`, and `token-usage-analytics-data-contract.md`; `design-spec.md` defines the sibling daily-facet projection, atomic write/read spines, explicit analytics query, frontend ownership, and removal of the embedded/sole-use generic chart. Review should particularly verify the homogeneous facet key/upsert design, coverage initialization, shared aggregate extraction, mixed-currency result contract, and clean separation from Run details.
