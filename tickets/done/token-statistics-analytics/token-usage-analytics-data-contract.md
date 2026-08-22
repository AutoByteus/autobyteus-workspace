# Token Usage Analytics — Prototype Data Contract Audit

## Status

`Approved` — field mapping and target read-contract intent were explicitly approved by the user on 2026-08-22; detailed storage and ownership design follows in the design specification.

## Purpose

Prove that every visible value or control in [`prototype.html`](./prototype.html) is either:

1. already present in the authoritative normalized token-usage contribution/current aggregate;
2. a deterministic calculation from those fields; or
3. an explicitly required new analytical metadata/result field.

The prototype's numbers are an internally reconciled illustrative fixture. They are **not** claimed to be the user's production data. The UI shape and field semantics are normative; fixture values are not.

## Current Authoritative Source

The future time projection must consume the **admitted normalized contribution** returned by `foldTokenUsageObservation`, not raw provider events and not the latest cumulative run row.

Current source type: `TokenUsageUpdatedPayload` in:

`autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`

Relevant exact source fields:

| Subject | Exact Existing Fields | Current Semantics |
| --- | --- | --- |
| Observation time | `observed_at` | ISO instant validated by the fold; determines the UTC analytical bucket |
| Admission/deduplication | Fold result `kind`, normalized authoritative payload, `usage_event_id`, `idempotency_key` | Suppressed/no-advance contributions must not advance analytics |
| Runtime | `runtime_kind` | Examples currently supported: `autobyteus`, `codex_app_server`, `claude_agent_sdk`; frontend maps these to Autobyteus, Codex, Claude SDK |
| Provider identity | `model_provider`, `provider_name` | Built-in provider ID and captured custom-provider display snapshot where applicable |
| Model identity | `model_identifier`, `model_value` | Canonical raw/model value pair; existing model-display projection resolves the user-facing label |
| Input/output/total | `accounting_input_tokens`, `accounting_output_tokens`, `accounting_total_tokens` | Normalized additive accounting contribution |
| Cache components | `standard_input_tokens`, `cache_miss_input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `cache_creation_5m_input_tokens`, `cache_creation_1h_input_tokens` | Components/subsets of input; not added again to total |
| Reasoning | `reasoning_output_tokens`, `billable_output_tokens` | Reasoning is an included diagnostic subset under current semantics |
| Cost | `estimated_api_input_cost`, component cost fields, `estimated_api_output_cost`, `estimated_api_reasoning_output_cost`, `estimated_api_total_cost` | Captured estimate produced after current pricing policy is applied |
| Cost quality | `currency`, `api_cost_status`, `missing_price_dimensions`, `pricing_policy_key`, `selected_pricing_tier_id` | Existing complete/partial/missing/local/mixed semantics |
| Report count | One admitted contribution / `usageReportCount` fold increment | Count of admitted usage reports, not user messages |

Current aggregate type reused by the target query and used as the source of the prototype's selected aggregate fields:

- Backend: `TokenUsageCostSummaryAggregate` in `token-usage/projections/token-usage-cost-summary-aggregate.ts`.
- GraphQL: `TokenUsageCostSummaryAggregateGraphql` in `api/graphql/types/token-usage-stats.ts`.
- Frontend: `TokenUsageCostSummaryAggregate` in `autobyteus-web/types/tokenUsageStatistics.ts`.

## Verified Identity Display Rules

The prototype uses the current formatter/projection rules, not invented labels:

| Raw Value | Current Display Rule | Prototype Label |
| --- | --- | --- |
| `runtime_kind=codex_app_server` | `tokenUsageStatisticsUi.ts` runtime map | `Codex` |
| `runtime_kind=claude_agent_sdk` | `tokenUsageStatisticsUi.ts` runtime map | `Claude SDK` |
| `runtime_kind=autobyteus` | `tokenUsageStatisticsUi.ts` runtime map | `Autobyteus` |
| `model_provider=OPENAI` | built-in provider display | `OpenAI` |
| `model_provider=ANTHROPIC` | built-in provider display | `Anthropic` |
| custom provider | captured `provider_name`, else existing custom-provider fallback | Captured/fallback provider label |
| missing provider/model | existing model-display constants/fallback | `Unknown Provider` / `Unknown Model` |

The initial prototype incorrectly rendered the host environment timezone `Europe/Berlin`. That value is not token-usage data and has been removed. The intended analytics contract now uses fixed UTC boundaries and visibly labels `UTC`.

## Visible UI Field Mapping

| Prototype Surface / Value | Source Or Formula | Classification | Exactness Constraint |
| --- | --- | --- | --- |
| Range presets/custom dates | Target request produces explicit `[startTime, endTimeExclusive)` UTC instants | New request contract | No bare date ambiguity |
| `UTC` label | Fixed product contract | Requirement-level constant | No device/environment timezone inference |
| Runtime filter | Distinct `runtime_kind` values in covered analytical rows | Deterministic projection | Use current runtime display map |
| Provider filter | Distinct pair of captured `model_provider`/`provider_name` resolved by existing provider display rules | Deterministic projection | Do not guess provider from model text |
| Model filter | Exact identity plus existing `resolveTokenUsageModelDisplayName` | Deterministic projection | Preserve Unknown/fallback behavior |
| Total tokens | `SUM(accounting_total_tokens)` / aggregate `totalTokens` | Existing field aggregate | Cache/reasoning not double-counted |
| Input / output subline | `SUM(accounting_input_tokens)`, `SUM(accounting_output_tokens)` | Existing field aggregate | Sum equals total under current normalized invariant |
| Estimated API cost | Aggregated captured `estimated_api_total_cost` with `currency` and `api_cost_status` | Existing field aggregate | Nullable/status-aware; no currency conversion |
| Cost status text | `apiCostStatus` + `missingPriceDimensions` | Existing fields | No “percent priced” claim; current data cannot support an exact percent of tokens priced |
| Tokens per active day | selected `totalTokens / COUNT(daily buckets with totalTokens > 0)` | Deterministic derived value | Count from returned daily coverage, not run count |
| Prior-period change | `(selected total - comparison total) / comparison total` | Deterministic derived value | No percentage when comparison is zero/unavailable |
| Usage-over-time bars | Ordered bucket `aggregate.totalTokens` or status-aware estimated cost | New time projection of existing fields | Bucket start/end explicit UTC |
| Consumption pace | Cumulative sum of ordered selected/comparison buckets | Deterministic derived value | Endpoint must equal matching summary total |
| Breakdown value/share | Group by exact identity; value is aggregate; share is row comparable value / selected comparable total | Deterministic derived value | Missing cost has no cost share; partial cost labels known estimate as partial |
| Exact breakdown table | Identity fields + aggregate fields | Existing field families in new period projection | Must not be generated from chart pixels/rounded labels |
| Full/partial/unavailable coverage | Target `coverageStart`, requested range, and returned bucket range | New analytical metadata | Pre-feature history is never classified as zero |
| CSV | Successful exact rows + applied UTC range/filter/grouping and cost-quality fields | Deterministic serialization | No network upload |
| Run details | Existing task/model GraphQL statistics | Existing current contract | Remains run-created-range/lifetime-total semantics |

## Explicitly Unsupported And Therefore Absent

The prototype must not show any of the following because no current authoritative source exists:

- provider monthly quota/allowance;
- remaining quota or quota reset time;
- provider-side rate-limit utilization;
- provider invoice total;
- forecasted exhaustion date;
- a claim that a provider reduced a quota or cheated a customer;
- exact observation-time history before the new analytical projection starts;
- a user/device timezone stored as token-usage data.

## Required Target Query Shape

The design may refine names/file placement, but the implementation must provide one coherent result with these subjects; the frontend must not assemble them from unrelated current calls:

```ts
type TokenUsageAnalyticsCostQuality = {
  kind: 'NO_USAGE' | 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'LOCAL' | 'MIXED_CURRENCY';
  currency: string | null;
  missingPriceDimensions: string[];
};

type TokenUsageAnalyticsInput = {
  rangePreset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'LAST_12_MONTHS' | 'CUSTOM';
  startTime: string;        // explicit inclusive UTC midnight
  endTimeExclusive: string; // explicit exclusive UTC midnight
  runtimeKind?: string;
  providerKey?: string;     // opaque exact-identity key returned by filterOptions
  modelKey?: string;        // opaque exact-identity key returned by filterOptions
};

type TokenUsageAnalyticsResult = {
  appliedRange: {
    preset: TokenUsageAnalyticsInput['rangePreset'];
    startTime: string;       // inclusive ISO UTC instant
    endTimeExclusive: string;// exclusive ISO UTC instant
    granularity: 'DAY' | 'WEEK' | 'MONTH';
  };
  comparisonRange: {
    startTime: string;
    endTimeExclusive: string;
  } | null;
  coverage: {
    status: 'FULL' | 'PARTIAL' | 'UNAVAILABLE';
    coverageStart: string;   // first instant supported by the analytical projection
  };
  comparisonCoverage: {
    status: 'FULL' | 'PARTIAL' | 'UNAVAILABLE';
    coverageStart: string;
  } | null;
  appliedFilters: {
    runtimeKind: string | null;
    providerKey: string | null;
    modelKey: string | null;
  };
  selectedAggregate: TokenUsageCostSummaryAggregateGraphql;
  selectedCostQuality: TokenUsageAnalyticsCostQuality;
  comparisonAggregate: TokenUsageCostSummaryAggregateGraphql | null;
  comparisonCostQuality: TokenUsageAnalyticsCostQuality | null;
  activeDayCount: number;
  trendBuckets: Array<{
    bucketStart: string;
    bucketEndExclusive: string;
    aggregate: TokenUsageCostSummaryAggregateGraphql;
    costQuality: TokenUsageAnalyticsCostQuality;
  }>;
  comparisonBuckets: Array<{
    bucketStart: string;
    bucketEndExclusive: string;
    aggregate: TokenUsageCostSummaryAggregateGraphql;
    costQuality: TokenUsageAnalyticsCostQuality;
  }>;
  breakdownRows: Array<{
    rowKey: string;
    runtimeKind: string;
    modelProvider: string | null;
    providerName: string | null;
    providerDisplayName: string;
    modelIdentifier: string | null;
    modelValue: string | null;
    modelDisplayName: string;
    aggregate: TokenUsageCostSummaryAggregateGraphql;
    costQuality: TokenUsageAnalyticsCostQuality;
  }>;
  filterOptions: {
    runtimeKinds: string[];
    providers: Array<{ key: string; modelProvider: string | null; providerName: string | null; displayName: string }>;
    models: Array<{ key: string; modelIdentifier: string | null; modelValue: string | null; displayName: string }>;
  };
};
```

`providerKey` and `modelKey` are identity values, not user-facing labels. Breakdown rows are separated when one exact identity has different effective currencies/status facets, so mixed currencies remain inspectable rather than being combined. Token-mode presentation may group those rows by the selected display dimension; cost mode must not sum unlike currencies.

This is a target analytical **read contract**, not a commitment to persist this response shape directly. The approved design in [`design-spec.md`](./design-spec.md) owns storage grain, indexes, repository boundaries, and canonical key construction.

## Prototype Fixture Reconciliation

The default fixture embedded in `prototype.html` is internally reconciled:

- runtime/model row total tokens: `189M + 51M + 31.5M + 18M + 10.5M = 300M`;
- input: `185M + 49.8M + 30.7M + 17.4M + 10.1M = 293M`;
- output: `4M + 1.2M + 0.8M + 0.6M + 0.4M = 7M`;
- normalized total: `293M + 7M = 300M`;
- known estimated costs: `$54.20 + $15.60 + $9.80 + $2.81 = $82.41`;
- each known row's `estimatedApiInputCost + estimatedApiOutputCost = estimatedApiTotalCost`; missing cost dimensions stay null rather than becoming zero;
- the DeepSeek row has `estimatedApiTotalCost=null`, `currency=null`, `apiCostStatus=price_missing`; therefore `$82.41` is labeled partial and that row is never displayed as `$0.00`;
- breakdown token shares sum to 100%; cost-mode missing rows have no asserted share;
- trend bucket totals sum to the selected 300M endpoint; the pace endpoint and summary therefore reconcile.
- the fixture-only `PROTOTYPE_COVERAGE_START` is `2025-09-01T00:00:00Z` so the default and supplied presets render as covered; it is not claimed to be a real installation's tracking date. Production must return the actual installation-specific `coverage.coverageStart`.
- the CSV serializer emits the exact required range/filter/grouping, identity, token, cost, cost-quality, report-count, and coverage columns from successful fixture rows. Production must serialize returned query rows; it must not scale or infer chart values client-side.

## Approval Status

Approved by the user on 2026-08-22 with the requirements, UI/UX specification, and HTML prototype.
