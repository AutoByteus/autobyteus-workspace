# Token Statistics Analytics — Design Spec

## Status

`Ready for architecture review` — based on the requirements, UI/UX specification, HTML prototype, and data-contract audit approved by the user on 2026-08-22.

## Current-State Read

The current Settings surface is a lifetime-run investigation view, not observation-period analytics:

`Settings > Token Statistics -> TokenUsageStatistics.vue -> tokenUsageStatistics Pinia store -> tokenUsageTaskStatisticsInPeriod / usageStatisticsInPeriod -> TokenUsageStatisticsResolver -> TokenUsageStatisticsProvider -> TokenUsageRunStore -> SqlTokenUsageRunRepository -> token_usage_run_records`

The requested date range selects cumulative run rows by `runCreatedAt` (falling back to `firstObservedAt`) and reports each selected run's lifetime totals. `TokenUsageModelStatisticsTable.vue` additionally renders one cost-only vertical chart through the otherwise-unused `components/common/BarChart.vue`. This path is correct for BEH-001's preserved Run details semantics but cannot answer BEH-002/BEH-003's true monthly questions.

The authoritative write path is:

`runtime observation -> TokenUsageRunStore -> TokenUsageRunAccumulator.serializeRun -> pricing policy -> SqlTokenUsageRunRepository.withRunTransaction -> foldTokenUsageObservation -> save cumulative run record -> transaction commit -> authoritative payload`

`foldTokenUsageObservation` is the only owner that reconciles cumulative snapshots, suppresses duplicate/no-advance observations, calculates normalized accounting fields, and applies captured pricing. Its `CHANGED` result contains the exact observation time and runtime/provider/model identity required by BEH-006. The normalized contribution is currently discarded after advancing the one-row-per-run record.

The cumulative store is healthy for lifetime accounting and must remain authoritative. The structural problem is the absence of a sibling observation-time projection and the temptation to overload the current lifetime statistics provider/page/table/chart with a different subject. The target must preserve the existing run path, reuse the current accounting/cost semantics, and create explicit analytical write/read and frontend ownership.

## Intended Change

Add a compact daily UTC analytical projection keyed by exact captured identity and a homogeneous accounting facet. Advance it only from a `CHANGED` fold result and inside the same Prisma transaction as the cumulative run record. Add one server-owned analytics query that validates the explicit half-open UTC selection, computes its comparable range and display granularity, reads one coherent projection snapshot, and returns coverage, selected/comparison aggregates, trend buckets, exact identity breakdown rows, filter options, active-day count, and explicit cost-quality metadata.

Make `TokenUsageStatistics.vue` a thin two-view coordinator. The approved Analytics view becomes the default and renders the approved HTML hierarchy from a dedicated analytics store/result. The preserved current controls/tables move intact into a Run details view with their run-created/lifetime copy. Replace the embedded model-table chart with feature-owned trend, pace, and ranked-breakdown chart components. Export the successful selected-period breakdown locally as exact CSV.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001–REQ-005, REQ-019; AC-001–AC-006, AC-024 | Open Settings > Token Statistics; switch Analytics/Run details | Investigation `BEH-001`; current Vue/store/query path | Analytics opens by default with UTC monthly controls; Run details preserves the current lifetime-by-created-run workflow | `Settings -> TokenUsageStatistics -> AnalyticsView/RunDetailsView`; DS-002, DS-003 |
| BEH-002 | User | REQ-006–REQ-012; AC-007–AC-016 | Inspect summary/trend/pace/breakdown; change metric/grouping | Investigation `BEH-002`; current model table has only a cost bar chart | Render coherent summary, chronological trend, cumulative comparison, ranked attribution, and exact rows from one analytics result | `AnalyticsView -> analytics store -> GraphQL -> provider -> result -> purpose-owned charts`; DS-002, DS-004 |
| BEH-003 | Contract | REQ-013–REQ-018; AC-017–AC-023 | Query observed usage in a UTC period | Investigation `BEH-003`; current query filters run creation then lifetime totals | Query daily projection by observation time; expose full/partial/unavailable tracking coverage; never backfill lifetime rows | `AnalyticsResolver -> AnalyticsProvider -> AnalyticsRepository/coverage`; DS-002, DS-005 |
| BEH-004 | Contract | REQ-020–REQ-023; AC-025–AC-029 | Aggregate token/cost summaries | Investigation `BEH-004`; `buildTokenUsageRunAggregate` and pricing summaries | Reuse one shared aggregate builder; retain nullable costs, missing/local/mixed status, captured estimates, and no currency conversion | `Facet records -> shared cost-summary aggregation -> explicit analytics cost quality`; DS-002, DS-004 |
| BEH-005 | User | REQ-024–REQ-025; AC-030–AC-031 | Select Export CSV after a successful result | Investigation `BEH-005`; no current path | Serialize the applied range/filter/grouping and exact breakdown rows to a deterministic local CSV; no upload | `AnalyticsView -> CSV serializer -> browser/Electron download`; DS-003 |
| BEH-006 | System | REQ-013–REQ-016; AC-017–AC-020 | Runtime emits a token observation | Investigation `BEH-006`; normalized fold currently advances only the run row | A `CHANGED` authoritative contribution atomically increments the daily analytical facet; `SUPPRESSED` does not | `RunStore -> Accumulator -> fold -> run save + projection increment -> one commit`; DS-001, DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/ui-ux-spec.md` | Journeys, hierarchy, states, accessibility, responsive behavior, copy | REQ-001–REQ-025; AC-001–AC-035 | Governs observable UI behavior and non-happy paths | Approved 2026-08-22 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/prototype.html` | Executable eventual-UI visual/interaction reference | REQ-001–REQ-025; AC-001–AC-035 | Normative visual hierarchy; implementation uses real components/data, not prototype fixture arithmetic | Approved 2026-08-22 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/token-usage-analytics-data-contract.md` | Existing-field and target-result audit | REQ-002–REQ-025; AC-002, AC-005, AC-007–AC-031 | Governs which values are existing, derived, new, or forbidden | Approved 2026-08-22 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/evidence/prototype-desktop.png` | Desktop render evidence | AC-001, AC-007–AC-016, AC-035 | Visual review context only | N/A — evidence |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/evidence/prototype-mobile.png` | Narrow render evidence | AC-035 | Responsive review context only | N/A — evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` / `Feature`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, with `File Placement Or Responsibility Drift` and a small `Shared Structure Looseness` exposed by the new projection.
- Refactor needed now: `Yes`.
- Evidence: the one-row run store intentionally cannot retain observation-time history; the authoritative normalized contribution exists only within the run accumulator transaction; the current statistics provider/query expresses created-run lifetime semantics; the page owns the entire existing workflow; the model detail table owns the only chart; aggregate field constants/types live in the run-record file even though the new analytical subject must reuse them.
- Design response: preserve the cumulative-run owner and public queries, attach a sibling daily analytics projection to the existing admission transaction, add a separate read provider/GraphQL query, extract only the truly shared accounting/aggregate structures, split the page by subject, and remove the superseded embedded/common chart path.
- Refactor rationale: directly extending `TokenUsageStatisticsProvider`, `TokenUsageStatistics.vue`, or `BarChart.vue` would mix two different date meanings, persistence subjects, and UI journeys. Duplicating accounting aggregation would risk token/cost drift.
- Intentional deferrals and residual risk: provider quota/allowance integration, alerts, task/workspace filters, raw-event audit history, currency conversion, and pre-feature monthly reconstruction remain outside scope. Arbitrary custom identity cardinality can grow daily facet rows; the design minimizes this through one row per day/homogeneous facet and indexed server aggregation but intentionally does not merge distinct identities.

## Terminology

- **Daily analytical facet**: one UTC day plus exact runtime/provider/model identity plus one homogeneous cache/pricing signature. It accumulates many admitted contributions atomically; it is not a provider-event ledger.
- **Identity key**: deterministic SHA-256 key of a length-delimited canonical tuple. Separate provider/model/full keys allow exact opaque filter values without using display labels as identity.
- **Accounting facet key**: deterministic key covering the full identity plus cache state and captured pricing summary (currency, status, missing dimensions, policy/tier, unit-price statuses/values). It permits contention-safe numeric upsert while preserving later cost-quality merging.
- **Coverage start**: the persisted instant at which this installation successfully initializes the analytical projection capability; it is not the timestamp of the first usage row.
- **Run details**: the preserved current view whose range selects runs by creation/fallback time and whose totals are lifetime totals.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- In-scope clean cut: the model-detail table no longer owns a graph. `components/common/BarChart.vue` has no other caller and is deleted. No analytics implementation reads the retired raw ledger, fabricates buckets from cumulative run records, dual-writes a raw event ledger, or falls back to run-created lifetime statistics.
- Preserved, not legacy: the existing task/model GraphQL queries and cumulative run statistics remain because the approved Run details view still requires them. They are renamed/repositioned internally by subject where useful; their public semantics do not masquerade as analytics.
- Existing `TokenUsageLedgerEvent` schema declaration and its migration-only readers remain outside this change because the current skip-version app-data migration owns them and normal runtime does not. The new projection must not depend on them.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: existing `token_usage_run_records` contains one cumulative record per canonical run (prior representative evidence: 1,269 run rows after compacting roughly 154k event rows). New SQLite subjects are one singleton coverage row and daily analytical facet rows.
- Relevant change: additive Prisma tables/indexes plus an atomic projection write. Existing run records and their serialization do not change meaning.
- Normal reader/writer evidence: `TokenUsageRunAccumulator` reads/folds/saves the current run in one interactive transaction; current statistics readers load run rows. Neither can reconstruct past periods. Startup already runs checked-in Prisma migrations before Prisma initialization and performs token-usage schema readiness checks.
- Required invariants: existing run records remain directly readable; cumulative lifetime totals remain authoritative; no old row is copied into a dated bucket; each `CHANGED` contribution advances run and analytics together; suppressed/no-advance observations advance neither; captured costs are not repriced.
- Constraints: local SQLite, no raw event restoration, bounded projection, SafeInt checks at GraphQL conversion, fatal current-schema failure rather than silent divergence.
- Decision: `Directly Usable — No Migration` for existing run data, with a normal additive schema migration for empty new tables.
- Rationale: transforming existing lifetime rows would create false history and violate AC-021. Creating empty tables/indexes has low I/O and no bulk rewrite; runtime inserts the coverage singleton once after schema verification. A data migration, backfill, dual read, or rebuild is both unnecessary and semantically wrong.
- Supported criteria: REQ-013–REQ-018, REQ-020–REQ-023; AC-017–AC-023, AC-025–AC-029.

No `Migration Plan` section applies because no existing application data is transformed.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-006, BEH-004 | Runtime token observation | One committed cumulative run row plus daily facet increment | `TokenUsageRunAccumulator` | Enforces authoritative admission and atomic projection consistency |
| DS-002 | Primary End-to-End | BEH-001–BEH-004 | Analytics screen selection | Coherent analytics result rendered | `TokenUsageAnalyticsProvider` for server result; `TokenUsageAnalyticsView` for presentation lifecycle | Carries the main user analytics request across UI/API/storage |
| DS-003 | Primary End-to-End | BEH-001, BEH-005 | View switch or Export action | Preserved Run details UI or local CSV | `TokenUsageStatistics.vue` for view selection; `TokenUsageAnalyticsCsv` for export | Keeps unlike workflows and side effects explicit |
| DS-004 | Return-Event | BEH-002, BEH-004 | Analytics GraphQL result | Cards/charts/table/accessibility equivalents | `TokenUsageAnalyticsView` | Ensures every surface consumes one applied result and exact status |
| DS-005 | Bounded Local | BEH-002–BEH-004 | Validated analytics request | Range plan plus selected/comparison/breakdown result | `TokenUsageAnalyticsProvider` | Server-owned comparison, coverage, grouping, and cost-quality derivation |
| DS-006 | Bounded Local | BEH-006 | Per-run serialized work | Fold/save/projection transaction outcome | `TokenUsageRunAccumulator` | Existing serialization and one transaction determine exactly-once behavior |
| DS-007 | Bounded Local | BEH-001, BEH-002 | Frontend selection change | Latest-request-only store commit | `tokenUsageAnalytics` Pinia store | Prevents stale results from being labeled as a new selection |

## Primary Execution Spine(s)

**DS-001 — Write:**

`Runtime adapter/event pipeline -> TokenUsageRunStore -> TokenUsageRunAccumulator -> foldTokenUsageObservation -> SqlTokenUsageRunRepository.save + TokenUsageAnalyticsProjectionWriter.record -> SqlTokenUsageAnalyticsRepository.incrementFacet -> one Prisma transaction commit -> authoritative payload`

**DS-002 — Read/render:**

`Settings Token Statistics -> TokenUsageStatistics.vue -> TokenUsageAnalyticsView -> tokenUsageAnalytics Pinia store -> tokenUsageAnalytics GraphQL query -> TokenUsageAnalyticsResolver -> TokenUsageAnalyticsProvider -> TokenUsageAnalyticsRepository snapshot -> shared aggregate/range/cost-quality projections -> GraphQL result -> store -> summary/charts/exact table`

**DS-003 — Secondary actions:**

`TokenUsageStatistics view tab -> TokenUsageRunDetailsView -> preserved run statistics store/current GraphQL queries -> current tables`

`Export CSV -> TokenUsageAnalyticsCsv.serialize(successful applied result + UI grouping) -> Blob download -> local file`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The existing per-run queue resolves pricing, opens the run transaction, folds once, saves the changed run, then hands only the authoritative changed contribution to the projection writer before commit. Any failure rolls back both writes. | Run store, accumulator, fold, run record, daily analytical facet | `TokenUsageRunAccumulator` | pricing, identity/facet projection, SQL atomic upsert |
| DS-002 | The UI sends explicit UTC range/preset plus opaque filter keys. The provider validates and plans range/comparison/granularity, reads coverage and aggregate facets within one read transaction, builds exact result DTOs, and returns a single context used by every surface. | Analytics selection, query, provider, result, view | `TokenUsageAnalyticsProvider` / `TokenUsageAnalyticsView` | range policy, display identity, cost quality, chart presentation |
| DS-003 | The page selects one of two semantically distinct workflows. Export is a local derivative of the last successful analytics result; Run details uses existing lifetime queries. | View selection, run details, CSV artifact | Page coordinator / CSV serializer | browser download, existing run tables |
| DS-004 | The store commits only the newest response and the view derives cards/series/rows without inventing coverage or pricing facts. | Successful analytics result, rendered surfaces | `TokenUsageAnalyticsView` | formatting, Chart.js adapter, live announcements |
| DS-005 | The provider applies the one approved range policy, groups daily facets to display buckets and exact breakdown rows, calculates active days and cost quality, and classifies selected/comparison coverage. | Query plan, snapshot, analytics result | `TokenUsageAnalyticsProvider` | repository SQL and display context |
| DS-006 | Per-run serialization plus fold suppression controls whether the transaction has a projection write. An atomic SQL upsert handles cross-run contention on the same facet. | Run queue, fold result, transaction | `TokenUsageRunAccumulator` | SQLite conflict-safe increment |
| DS-007 | Each selection increments a request token; prior results become explicitly loading/stale-hidden and out-of-order responses cannot overwrite the latest selection. | Selection, request token, applied result | Analytics Pinia store | Apollo client/network error normalization |

## Spine Actors / Main-Line Nodes

- `TokenUsageRunStore`: current public token-observation and run-summary facade; remains thin around readiness/capture/accumulator.
- `TokenUsageRunAccumulator`: governing owner of serialized admission and atomic accounting write sequencing.
- `TokenUsageAnalyticsProjectionWriter`: owned projection command boundary; canonicalizes the changed contribution and delegates persistence.
- `TokenUsageAnalyticsProvider`: governing read owner for range policy, coherent snapshot aggregation, coverage, identity display, and result invariants.
- `TokenUsageAnalyticsResolver`: thin GraphQL transport boundary.
- `TokenUsageStatistics.vue`: thin view selector.
- `TokenUsageAnalyticsView`: frontend analytics presentation coordinator for one store result.
- `TokenUsageRunDetailsView`: preserved lifetime workflow owner.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `TokenUsageRunAccumulator` | per-run serialization, fold invocation, transaction ordering, run save + projection write atomicity, returned authoritative summary | range analytics, GraphQL DTOs, chart presentation |
| `TokenUsageAnalyticsProjectionWriter` | coverage initialization, canonical daily/facet contribution shape, call to atomic increment | fold admission/deduplication, cumulative run state, read aggregation |
| `SqlTokenUsageAnalyticsRepository` | SQLite schema-shaped write/read operations and one coherent read transaction | comparison policy, display labels, product claims |
| `TokenUsageAnalyticsProvider` | request validation/range plan, coverage classification, selected/comparison aggregation, display identity, filter options, active-day/cost-quality invariants | SQL encoding, frontend state |
| `TokenUsageAnalyticsResolver` | GraphQL input/output mapping | business aggregation or persistence |
| Analytics Pinia store | selection, latest-request lifecycle, successful result/error state | range-policy reimplementation or pricing/coverage inference |
| `TokenUsageAnalyticsView` | approved layout, child composition, selection emissions, coherent render states | server facts, raw persistence rows |
| `TokenUsageRunDetailsView` | current created-run/lifetime controls and table states | observation-time analytics |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TokenUsageRunStore.recordObservation` | `TokenUsageRunAccumulator` | readiness/display capture public entry | analytical storage or duplicated admission policy |
| `TokenUsageAnalyticsResolver` | `TokenUsageAnalyticsProvider` | GraphQL schema/DTO adaptation | range/comparison/grouping logic |
| `TokenUsageStatistics.vue` | analytics/run child owners | selects the approved view and preserves session selection | query normalization, charts, or run-detail logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Embedded chart block/import/computeds in `TokenUsageModelStatisticsTable.vue` | Graphs move to observation-period Analytics; retaining it duplicates/misstates the analytical story | Feature-owned analytics charts | In This Change | Keep the exact model table for Run details |
| `autobyteus-web/components/common/BarChart.vue` | Its sole caller is removed; broadening it would create a generic mixed-purpose chart boundary | `analytics/TokenUsageTrendChart.vue`, `TokenUsagePaceChart.vue`, `TokenUsageBreakdown.vue` | In This Change | Delete, do not wrap |
| Monolithic page-owned run workflow in `TokenUsageStatistics.vue` | Page becomes a two-subject thin coordinator | `TokenUsageRunDetailsView.vue` | In This Change | Preserve behavior/copy/tests under new owner |
| Combined task/model store name and query-file responsibility | These contracts now specifically serve Run details while analytics has one separate query | `tokenUsageRunStatistics` store/query file plus analytics store/query | In This Change | Public GraphQL query names remain |
| Run-record-only location of generic accounting constants/types | New projection needs the same exact fields without depending on run-specific structure | `domain/token-usage-accounting-summary.ts` | In This Change | Pure source move; no serialized shape change |
| Any proposed cumulative-row fallback for analytics | Would fabricate date semantics | No fallback; coverage states | In This Change | Prohibited path, never added |

## Return Or Event Spine(s)

**DS-004:**

`Sql analytics snapshot -> TokenUsageAnalyticsProvider result -> GraphQL mapper -> Apollo response -> latest-request store commit -> TokenUsageAnalyticsView -> summary/trend/pace/breakdown/exact table/live status`

All rendered surfaces receive the same `appliedRange`, filters, coverage, selected aggregate, comparison, and rows. A failed or superseded response cannot partially update one chart.

## Bounded Local / Internal Spines

- Parent owner: `TokenUsageRunAccumulator` (DS-006).
  - `runQueues[runId] -> resolve pricing -> withRunTransaction -> fold -> if CHANGED save run and increment facet -> commit/rollback -> release queue`.
  - This matters because fold admission must happen once and all derived accounting must share its transaction outcome.
- Parent owner: `TokenUsageAnalyticsProvider` (DS-005).
  - `validate request -> create range plan -> read coherent snapshot -> group facet sources -> shared aggregate -> coverage/cost-quality/display projection -> invariant checks -> result`.
- Parent owner: Analytics Pinia store (DS-007).
  - `selection mutation -> requestSequence++ -> loading/no-current-result -> network -> commit only if sequence current -> success/error`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Pricing policy/calculator | DS-001 | Accumulator/fold | Existing captured pricing calculation | Remains accounting authority | Analytics might reprice history |
| Analytics identity/facet projection | DS-001, DS-006 | Projection writer | Canonical tuple keys, UTC day, homogeneous pricing/cache signature | Avoid nullable unique-key bugs and cross-run lost updates | Repository or accumulator would duplicate domain identity rules |
| Atomic SQL facet upsert | DS-001, DS-006 | Projection writer | `INSERT ... ON CONFLICT DO UPDATE` numeric increments/null-cost semantics/max observed time | Per-run queues do not serialize different runs sharing a facet | Read-modify-write can lose concurrent contributions |
| Range/granularity policy | DS-002, DS-005 | Analytics provider | Preset comparison and DAY/WEEK/MONTH selection | One source for UI/API semantics | Client/server comparison drift |
| Display identity projection | DS-002, DS-005 | Analytics provider | Reuse captured/custom/built-in/Unknown rules | Historical labels stay truthful | Guessing provider from model text |
| Shared aggregate builder | DS-001, DS-002 | Run and analytics providers | Token/cost/pricing merge, SafeInt, mixed currency | Prevent duplicate accounting semantics | Run and analytics totals diverge |
| Cost-quality projection | DS-002, DS-004 | Analytics provider | COMPLETE/PARTIAL/MISSING/LOCAL/MIXED_CURRENCY display contract | UI must not infer status from loose calls | False $0 or combined currency |
| Chart presentation builders | DS-004 | Analytics view/chart components | Convert exact result buckets to Chart.js configs/accessible text | Keep canvas mechanics out of store | Store becomes presentation blob |
| CSV serializer | DS-003 | Analytics view | Exact headers, RFC-style escaping, deterministic UTC filename | Local evidence export | Export built from rounded chart pixels |
| Localization | DS-002–DS-004 | UI components | All new visible strings in en/zh-CN catalogs | Existing localization boundary | Hard-coded prototype strings leak into product |

## Ownership Boundaries

1. **Admission boundary:** only `foldTokenUsageObservation` decides `CHANGED` versus `SUPPRESSED` and produces the authoritative contribution. The projection writer must not deduplicate, compare cumulative snapshots, or recalculate pricing.
2. **Atomicity boundary:** `TokenUsageRunAccumulator` owns the one Prisma transaction. Both repositories are mechanisms inside that boundary; neither caller nor event pipeline writes analytical rows independently.
3. **Persistence boundary:** the analytics repository owns table/raw-SQL shapes. Provider and GraphQL code consume domain facet/snapshot records, not Prisma rows.
4. **Read policy boundary:** `TokenUsageAnalyticsProvider` owns comparison, coverage, grouping, filter options, and cost quality. The resolver is a mapper and the UI does not reconstruct these facts from current run queries.
5. **Frontend subject boundary:** Analytics and Run details have separate stores/query files/components. `TokenUsageStatistics.vue` selects them but does not merge their date meanings.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanisms | Upstream Callers | Forbidden Bypass Shape | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenUsageRunAccumulator.recordObservation` | run queue, fold, run repo, projection writer, transaction | `TokenUsageRunStore` | store/event handler calling analytics repo directly | add a narrow accumulator/projection-writer operation |
| `TokenUsageAnalyticsProjectionWriter` | identity/facet projector, analytics repo increment, coverage initialization | accumulator; server startup for initialize only | accumulator constructing SQL keys or server runtime calling repository | extend writer command contract |
| `TokenUsageAnalyticsProvider.getAnalytics` | range policy, repository snapshot, aggregate/display/cost-quality projection | GraphQL resolver | resolver/UI calling repository or current statistics provider | extend explicit analytics result/input |
| Analytics Pinia store | Apollo request lifecycle/latest response | Analytics view | child charts querying GraphQL independently | add store result fields/action |
| `TokenUsageRunDetailsView` | preserved run store/current tables | page coordinator | Analytics view reusing lifetime rows | keep separate view/query |

## Dependency Rules

- Runtime/event code may call `TokenUsageRunStore`; it must not depend on analytical repository or GraphQL types.
- Accumulator may call fold, run repository, and projection writer inside its transaction. Projection writer may call only analytical identity projection and analytical repository.
- Analytics repository may depend on Prisma and domain codecs; it must not import provider/UI/GraphQL policy.
- Analytics provider may depend on repository, range/aggregate/display projections, and existing custom-provider store through the current display-context boundary.
- GraphQL analytics types may depend on domain result and shared GraphQL aggregate mapper; domain/provider code must not import GraphQL classes.
- Frontend store may depend on the analytics query/generated operation types and frontend normalization; components depend on store/domain view models, never on Apollo directly.
- Run details must not call `tokenUsageAnalytics`; Analytics must not call `usageStatisticsInPeriod`/`tokenUsageTaskStatisticsInPeriod` as a fallback.
- Display labels are never accepted as filter identities. The UI sends opaque `providerKey`/`modelKey` and raw `runtimeKind` values returned by `filterOptions`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TokenUsageAnalyticsProjectionWriter.initializeCoverage(now)` | projection lifecycle | create singleton coverage start if absent | singleton only | called after schema verification before serving requests |
| `TokenUsageAnalyticsProjectionWriter.record(tx, payload)` | one admitted contribution | project and atomically increment daily facet | authoritative `TokenUsageUpdatedPayload` from `CHANGED` fold | never accepts raw observation |
| `SqlTokenUsageAnalyticsRepository.incrementFacet(tx, facet)` | persisted facet | contention-safe additive upsert | `bucketStart + facetKey`, with exact raw identity columns | facet key is non-null; no nullable unique tuple |
| `SqlTokenUsageAnalyticsRepository.readSnapshot(plan)` | coherent analytical rows | read coverage, selected/comparison facet aggregates, active days, and filter identities in one read transaction | explicit half-open ranges + optional runtime/provider/model keys | returns domain records, not product DTO |
| `TokenUsageAnalyticsProvider.getAnalytics(input)` | analytical result | validate/plan/aggregate/project one coherent result | `rangePreset + startTime + endTimeExclusive + filters` | grouping remains UI presentation state; exact rows support all groupings |
| GraphQL `tokenUsageAnalytics(input)` | transport result | expose one coherent analytics contract | explicit enum/preset, ISO instants, opaque keys | distinct from run-created queries |
| `tokenUsageAnalyticsStore.fetch(selection)` | frontend result lifecycle | latest-request-only network fetch | applied range preset/custom dates/filter keys | clears/hides mismatched prior result |
| `serializeTokenUsageAnalyticsCsv(result, grouping)` | selected-period evidence | exact local CSV bytes/name | successful result + current grouping enum | full values, no abbreviated chart labels |

### GraphQL input shape

```ts
TokenUsageAnalyticsInput {
  rangePreset: THIS_MONTH | LAST_MONTH | LAST_3_MONTHS | LAST_12_MONTHS | CUSTOM
  startTime: DateTime              // inclusive UTC midnight
  endTimeExclusive: DateTime       // exclusive UTC midnight
  runtimeKind: String?
  providerKey: String?
  modelKey: String?
}
```

The provider rejects `start >= end`, non-midnight UTC boundaries, a preset/range mismatch, or malformed opaque keys. A well-formed key that has no row in the newly selected range produces an empty filtered result (with Clear filters available), not a transport error. Custom dates are inclusive in the UI and converted to explicit half-open instants before the query.

### Range/granularity policy

- `THIS_MONTH`: UTC month start through the day after current UTC date; comparison is previous month start through the same elapsed ordinal, capped at prior month end.
- `LAST_MONTH`: previous complete UTC month; comparison is the complete month before it.
- `LAST_3_MONTHS`: first of the month two months before current through day after current; comparison is the immediately preceding equal-duration range.
- `LAST_12_MONTHS`: first of the month eleven months before current through day after current; comparison is the same calendar window shifted one year earlier with safe leap-day capping.
- `CUSTOM`: supplied inclusive UTC dates converted to half-open instants; comparison is immediately preceding equal duration.
- Granularity: span `<= 62` days => `DAY`; span `63–180` days => `WEEK`; span `> 180` days => `MONTH`. Weekly buckets are seven-day intervals anchored to the applied range start; monthly buckets are UTC calendar months clipped to the applied range.

### Cost-quality and comparison policy

The provider derives `TokenUsageAnalyticsCostQuality` from the underlying homogeneous facets in this precedence order; the UI consumes it without reinterpreting raw statuses:

1. `NO_USAGE` when `usageReportCount === 0` and `totalTokens === 0`.
2. `MIXED_CURRENCY` when priced facets contain more than one non-null currency. No combined monetary total/chart/comparison is emitted.
3. `LOCAL` when every contributing facet is `local_no_api_bill`.
4. `MISSING` when usage exists, no facet has a non-null estimated total cost, and at least one facet is missing pricing.
5. `PARTIAL` when at least one known estimate exists and any non-local facet has missing/partial pricing or missing price dimensions.
6. `COMPLETE` otherwise, including a combination of completely priced remote usage and explicitly local/no-bill usage. `currency` is the single priced currency or null when no monetary cost applies.

Exact breakdown rows partition one identity by `CURRENCY:<currency>`, `LOCAL`, or `UNPRICED`; pricing-policy changes within the same partition are merged through the shared pricing summary. This prevents USD/EUR or local/unpriced rows from becoming one ambiguous line.

Percentage and cumulative pace comparison is considered comparable only when selected and comparison coverage are both `FULL`, the prior value is non-zero, and the metric is monetarily comparable. Token mode is monetarily irrelevant. Cost mode may compare `COMPLETE` or `PARTIAL` known estimates only when both sides have the same single currency, and labels the result partial if either side is partial. `NO_USAGE`, `MISSING`, `LOCAL`, `MIXED_CURRENCY`, or partial/unavailable coverage produces the approved `No comparable data`/explanatory state rather than a rate.

## Interface Boundary Check

| Interface | Singular? | Explicit identity? | Ambiguous risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Projection writer `record` | Yes | Yes | Low | Accept only authoritative changed contribution |
| Repository `incrementFacet` | Yes | Yes | Low | Use non-null digest key plus stored raw tuple |
| Provider `getAnalytics` | Yes | Yes | Low | One analytics subject/input/result |
| GraphQL `tokenUsageAnalytics` | Yes | Yes | Low | Opaque keys; no display-label selectors |
| Preserved run statistics queries | Yes per existing subject | Yes | Low | Keep separate from analytics; do not add range mode |
| CSV serializer | Yes | Yes | Low | Consume applied result, not chart state |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Cumulative lifetime record | `TokenUsageRunRecord` | Yes | Low | Preserve |
| Observation-time row | `TokenUsageAnalyticsDailyFacet` | Yes | Low | Avoid `Event`/`Ledger` names |
| Read owner | `TokenUsageAnalyticsProvider` | Yes | Low | Do not merge with lifetime statistics provider |
| Write boundary | `TokenUsageAnalyticsProjectionWriter` | Yes | Low | Keep admission in accumulator |
| UI secondary workflow | `TokenUsageRunDetailsView` | Yes | Low | Avoid generic `LegacyView` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability | Decision | Why | If New, Why Existing Is Not Right |
| --- | --- | --- | --- | --- |
| Admission/dedup/pricing | token-usage fold/accumulator | Reuse | Already authoritative | N/A |
| Atomic persistence | existing Prisma run transaction | Extend | Projection must share commit boundary | N/A |
| Token/cost aggregation | current run aggregate/pricing summaries | Extend/extract shared core | Exact established semantics | N/A |
| Identity display | token-usage model display projection | Extend | Captured custom/built-in/Unknown rules exist | N/A |
| Schema rollout | Prisma migrations/current-schema readiness | Extend | Established startup contract | N/A |
| Visualization | Chart.js/vue-chartjs | Reuse | Dependency already shipped | N/A |
| New analytical history | cumulative run store | Create sibling projection | Run rows lack time distribution and must remain lifetime authority | Existing store cannot answer period usage truthfully |
| Frontend analytics lifecycle | current run statistics Pinia store | Create sibling store | Different query/selection/loading semantics | Reusing would mix two subjects |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Spine IDs | Governing Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token-usage accounting | fold, shared accounting summary, cumulative run record | DS-001, DS-006 | Accumulator | Extend/refactor | Extract generic accounting types only |
| Server token-usage analytics | daily facets, coverage, range plan, aggregation, filters | DS-001, DS-002, DS-005 | Projection writer/provider | Create sub-capability within token usage | No raw ledger |
| GraphQL token usage | analytics input/result mapping and preserved run queries | DS-002 | Analytics/run resolvers | Extend/split shared DTO | One new query |
| Startup/database | additive tables, readiness, coverage initialization | DS-001 | server runtime/projection writer | Extend | Fatal if current analytical schema unavailable |
| Web token-usage analytics | store, presentation, charts, export | DS-002–DS-004, DS-007 | Analytics view/store | Create subfolder/capability | Follows approved prototype |
| Web run statistics | current task/model workflow | DS-003 | Run details view/store | Refactor/rename | Semantics preserved |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `domain/token-usage-accounting-summary.ts` | server accounting | shared domain | field constants/totals/pricing/aggregate-source interfaces | one reusable accounting vocabulary | N/A |
| `domain/token-usage-analytics.ts` | server analytics | analytical subject | keys, facet records, filters, range/result types | one domain subject family | accounting summary |
| `projections/token-usage-analytics-contribution.ts` | server analytics | projection writer | canonical UTC day/opaque keys/facet signature | one pure transform | accounting/pricing summary |
| `repositories/sql/token-usage-analytics-repository.ts` | persistence | repository | atomic upsert/coherent read SQL | one table boundary | analytics domain |
| `providers/token-usage-analytics-provider.ts` | server analytics | read owner | range snapshot to result | one use-case owner | range/aggregate/display |
| `services/token-usage-analytics-range-policy.ts` | server analytics | provider concern | preset/comparison/granularity | pure policy | analytics domain |
| `api/graphql/types/token-usage-cost-summary.ts` | transport | shared mapper | aggregate DTO/decorators/mapping | reused by two resolvers | server aggregate |
| `api/graphql/types/token-usage-analytics.ts` | transport | analytics resolver | analytics GraphQL input/result/query | one transport subject | shared mapper |
| `analytics/*.vue` | web analytics | presentation owners | controls/status/cards/charts/breakdown | split by visible responsibility | shared analytics types |
| `stores/tokenUsageAnalytics.ts` | web analytics | store | selection/network/latest response | one store subject | generated query types |
| `utils/tokenUsageAnalyticsCsv.ts` | web analytics | export concern | exact CSV/name/download data | pure serializer boundary | analytics result |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| token/cost field constants and summary source | `domain/token-usage-accounting-summary.ts` | server token usage | run and analytics must aggregate identically | Yes | Yes | a run-specific or GraphQL DTO |
| cost summary aggregation | `projections/token-usage-cost-summary-aggregate.ts` | server token usage | both sources need SafeInt/pricing/mixed-currency rules | Yes | Yes | query orchestration |
| GraphQL cost DTO/mapping | `api/graphql/types/token-usage-cost-summary.ts` | GraphQL token usage | run and analytics expose same aggregate | Yes | Yes | domain business logic |
| frontend aggregate type/normalizer/fragment | `types/tokenUsageCostSummary.ts` + fragment/normalizer | web token usage | run and analytics share exact transport fields | Yes | Yes | mixed run/analytics state |
| number/runtime/cost formatting | existing `tokenUsageStatisticsUi.ts` (rename only if responsibility broadens) | web token usage | established formatting semantics | Yes | Yes | chart/range policy owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure | Clear meaning? | Redundant removed? | Overlap risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageAccountingSummarySource` | Yes | Yes | Low | contain only fields consumed by aggregate builder |
| `TokenUsageAnalyticsIdentity` | Yes | Yes | Low | raw/captured fields plus opaque keys; display labels remain derived |
| `TokenUsageAnalyticsCostQuality` | Yes | Yes | Low | one enum/status contract; no duplicate boolean flags |
| `TokenUsageCostSummaryAggregateGraphql` | Yes | Yes | Low | extract without changing public field meanings |
| Frontend `TokenUsageAnalyticsResult` | Yes | Yes | Low | derive from generated operation; no parallel ad hoc payload types |

## Final File Responsibility Mapping

| File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/prisma/schema.prisma` + new migration SQL | persistence rollout | Prisma schema | add facet/coverage tables and indexes only | canonical physical schema | N/A |
| `src/startup/token-usage-current-schema-readiness.ts` | startup | readiness boundary | verify run + analytical tables/unique/index contract | token usage current schema gate | N/A |
| `src/server-runtime.ts` | startup | runtime coordinator | call projection coverage initialization after readiness | existing startup spine | writer |
| `src/token-usage/domain/token-usage-accounting-summary.ts` | accounting | shared domain | tight reusable accounting types/constants/source | shared authority | N/A |
| `src/token-usage/domain/token-usage-run-record.ts` | accounting | run record | run-only record fields importing shared accounting vocabulary | remains one run subject | shared accounting |
| `src/token-usage/domain/token-usage-analytics.ts` | analytics | analytics domain | input/range/keys/facet/snapshot/result types | one subject | shared accounting |
| `src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | accounting | shared aggregate | type + generic builder + analytics cost-quality projection | one accounting concern | shared accounting |
| `src/token-usage/projections/token-usage-run-aggregate.ts` | accounting | run projection | adapt run records to shared builder; build run summary | run-only result | shared builder |
| `src/token-usage/projections/token-usage-analytics-contribution.ts` | analytics | writer concern | canonicalize key/day/facet from authoritative payload | pure contribution projection | shared accounting/pricing |
| `src/token-usage/services/token-usage-analytics-projection-writer.ts` | analytics | command boundary | initialize coverage and record changed facet | one write boundary | repository/projection |
| `src/token-usage/services/token-usage-analytics-range-policy.ts` | analytics | provider concern | validate ranges and compute comparison/granularity/buckets | one policy | analytics types |
| `src/token-usage/repositories/sql/token-usage-analytics-record-codec.ts` | persistence | repository mechanism | Prisma/raw row to domain facet source and JSON validation | isolates persistence shape | analytics domain |
| `src/token-usage/repositories/sql/token-usage-analytics-repository.ts` | persistence | repository boundary | atomic upsert and coherent snapshot queries | one storage subject | codec |
| `src/token-usage/services/token-usage-run-accumulator.ts` | accounting | write governor | call writer on CHANGED inside run transaction | preserves admission spine | projection writer |
| `src/token-usage/providers/token-usage-analytics-provider.ts` | analytics | read governor | build coherent result, coverage/filter/display/cost quality | one read use case | range/repository/aggregate |
| `src/api/graphql/types/token-usage-cost-summary.ts` | GraphQL | shared transport | shared aggregate DTO/mappers extracted from current file | transport reuse | aggregate |
| `src/api/graphql/types/token-usage-stats.ts` | GraphQL run details | existing resolver | current run summary/task/model queries only | preserved subject | shared DTO |
| `src/api/graphql/types/token-usage-analytics.ts` | GraphQL analytics | analytics resolver | input/result types and one query mapper | explicit subject | provider/shared DTO |
| `src/api/graphql/schema.ts` | GraphQL | schema registry | register analytics resolver | existing registry | resolver |
| `autobyteus-web/types/tokenUsageCostSummary.ts` | web shared | transport view model | aggregate type/normalizer | shared exact data | generated type |
| `autobyteus-web/types/tokenUsageAnalytics.ts` | web analytics | analytics model | selection/result/grouping/presentation types | one subject | shared aggregate |
| `autobyteus-web/types/tokenUsageRunStatistics.ts` | web run details | run model | current task/model/sort types | explicit preserved subject | shared aggregate |
| `autobyteus-web/graphql/queries/token_usage_cost_summary_fragment.ts` | web GraphQL | shared fragment | aggregate fields | no duplicated fragment | N/A |
| `autobyteus-web/graphql/queries/token_usage_analytics_queries.ts` | web analytics | query contract | one analytics operation | one subject | shared fragment |
| `autobyteus-web/graphql/queries/token_usage_run_statistics_queries.ts` | web run details | query contract | existing task/model operations | preserved subject | shared fragment |
| `autobyteus-web/stores/tokenUsageAnalytics.ts` | web analytics | store | selection/latest request/result/error | one lifecycle | generated operation |
| `autobyteus-web/stores/tokenUsageRunStatistics.ts` | web run details | store | current dual run queries | preserved lifecycle | run types |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | web settings | thin facade | tabs and session view selection | no child logic | two views |
| `.../token-usage/TokenUsageRunDetailsView.vue` | web run details | view owner | current controls/loading/error/empty/tables | preserved workflow | run store/tables |
| `.../token-usage/analytics/TokenUsageAnalyticsView.vue` | web analytics | view coordinator | approved hierarchy/state composition | one presentation owner | analytics store/children |
| `.../analytics/TokenUsageAnalyticsControls.vue` | web analytics | control surface | preset/custom/filter/metric/export events and validation | one control responsibility | selection types |
| `.../analytics/TokenUsageAnalyticsCoverage.vue` | web analytics | status surface | coverage/pricing notices | one status responsibility | result metadata |
| `.../analytics/TokenUsageAnalyticsSummaryCards.vue` | web analytics | summary surface | four non-hover facts | one summary responsibility | result aggregates |
| `.../analytics/TokenUsageTrendChart.vue` | web analytics | trend surface | Chart.js chronological bars + accessible description | one chart meaning | buckets |
| `.../analytics/TokenUsagePaceChart.vue` | web analytics | comparison surface | cumulative current/prior lines + textual change | one chart meaning | buckets |
| `.../analytics/TokenUsageBreakdown.vue` | web analytics | attribution surface | grouping, horizontal bars, exhaustive exact table | one analytical question | breakdown rows |
| `autobyteus-web/utils/tokenUsageAnalyticsCsv.ts` | web analytics | export concern | deterministic exact CSV | pure and testable | result |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | localization | catalogs | all new approved strings | established boundary | N/A |
| `autobyteus-web/generated/graphql.ts` | generated | codegen | regenerated schema/operation types | repository convention | GraphQL schema/docs |

## Applied Patterns

- **Projection:** the daily analytical facet is a derived, compact observation-time projection; the cumulative run record stays authoritative for lifetime totals.
- **Repository:** `SqlTokenUsageAnalyticsRepository` owns persistence mechanics behind domain records.
- **Policy:** range/comparison/granularity rules live in one pure policy used by the provider.
- **Thin facade:** GraphQL resolver and page component only adapt/select; they do not own business policy.
- **Atomic upsert:** one SQL conflict operation prevents cross-run lost updates while the enclosing transaction guarantees run/projection atomicity.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/domain/` | Folder | token-usage domain | tight accounting/run/analytics structures | current subsystem authority | Prisma/GraphQL/UI |
| `.../projections/` | Folder | pure token-usage projections | fold, shared aggregate, analytics contribution mapping | existing projection capability | database access |
| `.../services/` | Folder | write/policy control | accumulator, writer, range policy | application sequencing/policy | GraphQL decorators |
| `.../providers/` | Folder | public read/store boundaries | analytics provider and existing statistics provider | current provider convention | raw SQL |
| `.../repositories/sql/` | Folder | SQLite persistence | analytics/run repository and codecs | established persistence depth | comparison/UI logic |
| `autobyteus-server-ts/src/api/graphql/types/` | Folder | GraphQL transport | shared aggregate and subject-specific resolvers | existing schema organization | domain accounting policy |
| `autobyteus-web/components/settings/token-usage/analytics/` | Folder | analytics presentation | approved dashboard components | visible feature depth | Apollo/Prisma |
| `autobyteus-web/components/settings/token-usage/` | Folder | token-usage settings | Run details and shared formatting/tables | established feature area | generic app charts |

## Folder Boundary Check

| Path / Folder | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| server `domain/` | Main-Line Domain-Control | Yes | Low | pure semantic structures |
| server `projections/` | Off-Spine Concern | Yes | Low | deterministic mapping/aggregation |
| server `repositories/sql/` | Persistence-Provider | Yes | Low | all table/raw SQL isolated |
| server GraphQL `types/` | Transport | Yes | Medium | current convention is flat; split shared/run/analytics files prevents one 700-line mixed file |
| web analytics component folder | Mixed Justified presentation depth | Yes | Low | controls/cards/charts are one feature surface, not separate architectural layers |
| web stores/graphql/types | Main-Line client data boundary | Yes | Low | separate analytics and Run details subjects |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Atomic write | `fold CHANGED -> save run + increment daily facet -> commit` | event listener asynchronously writes analytics after run commit | Avoids permanent drift |
| Exact identity | filter option `{ key: providerKey, displayName: 'OpenAI' }` and query by key | query by display label or guess provider from model string | Labels are not identity |
| Nullable unique identity | `UNIQUE(bucket_start, facet_key)` with non-null digest | `UNIQUE(bucket_start, provider_name?, model_identifier?)` | SQLite permits duplicate NULL tuples |
| Cost | selected aggregate `MIXED_CURRENCY`, no combined chart, exact currency-separated rows | add USD + EUR or render missing cost as `$0` | Preserves financial honesty |
| UI ownership | thin page -> AnalyticsView / RunDetailsView | one component with two date meanings and every chart/table branch | Keeps workflows understandable |
| Chart reuse | three feature-owned components sharing pure formatters | broaden sole-use `common/BarChart` into a universal optional-prop chart | Avoids generic mixed responsibility |
| History | new empty projection + coverage start | distribute cumulative run totals between first/latest timestamps | Prevents fabricated evidence |

### Daily facet shape

```ts
interface TokenUsageAnalyticsDailyFacet {
  bucketStart: Date;             // exact UTC midnight
  facetKey: string;              // full identity + accounting signature digest
  identityKey: string;
  providerKey: string;
  modelKey: string;
  runtimeKind: string;
  modelProvider: string | null;
  providerName: string | null;
  modelIdentifier: string | null;
  modelValue: string | null;
  cacheState: CacheState;
  pricingSummary: TokenUsagePricingSummary; // homogeneous, canonical JSON
  tokenTotals: TokenUsageTokenTotals;
  costTotals: TokenUsageCostTotals;
  usageReportCount: bigint;
  latestObservedAt: Date;
}
```

The facet signature contains no raw provider event, prompt, run ID, task ID, or user content.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Read old ledger events for historical graphs | Could show pre-feature months | Rejected | Start empty projection and expose coverage |
| Infer buckets from cumulative run first/latest dates | Existing rows are available | Rejected | No backfill; exact future observation-time writes only |
| Analytics `rangeMode` branch inside current statistics queries/provider | Could reuse endpoint | Rejected | New `tokenUsageAnalytics` query and provider |
| Asynchronous/best-effort analytics event handler | Lower write-path coupling | Rejected | Projection increment inside run transaction |
| Reuse display labels as filters | Simpler UI payload | Rejected | Opaque provider/model keys returned by filter options |
| Keep embedded model chart as secondary graph | Already implemented | Rejected | Remove it; Analytics owns all graphs |
| Keep `BarChart.vue` wrapper | Avoid deletion | Rejected | Delete sole-use component; purpose-owned charts |
| Reprice historical projection on read | Could reflect current catalog | Rejected | Store captured estimates/signatures at admission |

## Derived Layering (Explanatory Only)

- Server transport: GraphQL analytics resolver/DTOs.
- Server use-case control: analytics provider, projection writer, accumulator.
- Domain/projection: range/identity/accounting/aggregate semantics.
- Persistence: Prisma schema, repository, codecs.
- Client data boundary: generated GraphQL operation, Pinia stores.
- Client presentation: Settings page facade, Analytics/Run details views, feature charts/export.

Dependency direction follows the ownership rules above; these layer labels do not authorize bypassing owners.

## Change / Refactor Sequence

1. Extract the shared accounting-summary constants/types and generic cost-summary aggregate builder; keep run record/API outputs behaviorally identical.
2. Add analytics domain types, canonical identity/facet projection, Prisma models/migration, SQL codec/repository, schema readiness checks, and coverage initialization.
3. Add projection writer and update the accumulator so only `CHANGED` fold results save the run and increment the facet inside the existing transaction. Verify suppression, retry rollback, and concurrent cross-run upsert invariants.
4. Add range policy and analytics provider. Build selected/comparison/coverage/filter/bucket/breakdown results with shared aggregation and explicit cost quality. Add the separate GraphQL resolver/query and extract shared aggregate DTO mapping.
5. Regenerate frontend GraphQL types from the updated live schema; extract shared frontend aggregate types/normalization and split existing Run details store/query naming.
6. Extract `TokenUsageRunDetailsView.vue`, reduce `TokenUsageStatistics.vue` to the tabs/session coordinator, and make Analytics the default without fetching Run details until selected.
7. Build the analytics store and approved controls/coverage/cards/trend/pace/breakdown components. Use Tailwind/current Settings tokens and Chart.js while matching `prototype.html` hierarchy/responsiveness/accessibility.
8. Add exact local CSV serialization/download from the last successful result. Add en/zh-CN localization strings.
9. Remove the model table's chart logic and delete the now-unused common `BarChart.vue`; remove old combined store/query filenames after imports/tests are moved.
10. Run implementation-scoped unit/component/integration/type checks and visually compare desktop/narrow rendered UI to the approved prototype. Do not add API/E2E coverage in the implementation stage; downstream coverage investigation owns those durable decisions.

No temporary dual read/write or compatibility wrapper may remain after the sequence.

## Key Tradeoffs

- **Daily facet vs raw event ledger:** daily facets cannot answer per-notification forensics, but that is out of scope and was deliberately removed. They answer calendar analytics while keeping storage bounded.
- **Facet signature vs one row per identity/day:** homogeneous pricing/cache facets may create more than one row for the same identity/day, but enable atomic numeric upsert and exact later merging without lost JSON read-modify-write updates.
- **Separate query vs extending current queries:** one new query adds schema surface but preserves clear date semantics and returns a coherent result rather than coordinating several calls.
- **Server-owned policy vs client inference:** the result is larger, but comparison/coverage/cost quality cannot drift across cards and charts.
- **Purpose-owned charts vs universal common chart:** minor component duplication in Chart.js setup is preferable to one optional-prop generic component with unclear semantics; pure formatting/config utilities may be shared inside the analytics folder when genuinely identical.

## Risks

1. **Cross-run contention:** per-run queues do not protect one shared facet. Mitigation: one SQL `ON CONFLICT DO UPDATE` inside the run transaction; never read-modify-write the facet in application code.
2. **SQLite nullable uniqueness:** nullable identity tuples could duplicate. Mitigation: non-null canonical digest keys plus stored raw fields.
3. **Hash canonicalization drift:** a field-order/null-normalization change could split identity. Mitigation: versioned, length-delimited tuple format with fixed field order and unit tests; no JSON object iteration.
4. **Mixed/incomplete cost misrepresentation:** aggregate total may be null or partial. Mitigation: server-owned cost-quality enum, currency-separated exact breakdown rows, no combined mixed-currency chart, no `$0` substitution.
5. **SafeInt overflow:** long-period aggregation may exceed JavaScript SafeInt. Mitigation: BigInt persistence/SQL totals, existing checked conversion, explicit GraphQL error rather than rounding.
6. **High identity/pricing cardinality:** many custom identities or pricing changes increase facets. Mitigation: daily/facet rather than event rows, indexes, SQL pre-aggregation, exact identity preservation; monitor as residual operational risk.
7. **Startup/schema failure:** serving writes without analytics tables would cause drift. Mitigation: extend fatal current-schema readiness and initialize coverage before request serving.
8. **Out-of-order UI responses:** rapid filter changes could render mismatched data. Mitigation: latest-request sequence and applied selection returned by server.
9. **Prototype fixture confusion:** the HTML contains illustrative values. Mitigation: implementation uses generated types/real query only; data contract remains the field authority.

## Guidance For Implementation

- Treat the approved HTML as the rendered target, not as reusable production JavaScript. Do not copy its fixture scaling logic.
- Keep fixed UTC explicit everywhere; never reintroduce the host/device IANA timezone.
- Implement canonical keys from raw captured fields, not resolved display names. Persist both keys and raw snapshots.
- Construct the facet only after the fold returns `CHANGED`. Do not try to make the analytical writer independently idempotent using event IDs; the run fold remains the one admission authority.
- Preserve nullable cost semantics in SQL: when both accumulated and incoming cost fields are null, remain null; otherwise add `COALESCE` values. Never coerce an all-unpriced facet to zero cost.
- The repository read snapshot should execute coverage, selected/comparison aggregates, active-day count, breakdown, and filter-option reads within one Prisma read transaction. Use SQL pre-aggregation for long monthly ranges; never return persistence facets to the browser.
- Assert provider invariants before mapping: ordered non-overlapping buckets within the applied range, selected trend endpoint equals selected aggregate, comparison endpoint equals comparison aggregate, and exact breakdown token totals reconcile with the selected aggregate.
- Use generated GraphQL operation types in the new frontend store. Avoid a second hand-maintained payload schema.
- When cost quality is `MIXED_CURRENCY`, show the approved explanatory state and currency-separated exact rows; do not draw a combined monetary line/bar.
- Use text/table alternatives as the accessibility authority for canvas charts. Current/prior series must differ by style/markers and color.
- CSV must use full numeric values and exact ISO UTC range/coverage fields. Escape every cell, make the filename deterministic from applied inclusive dates, and initiate no network request.
- Preserve current Run details loading/empty/migration error/sorting/expansion behavior and exact explanatory copy while moving it to its own component/store name.
