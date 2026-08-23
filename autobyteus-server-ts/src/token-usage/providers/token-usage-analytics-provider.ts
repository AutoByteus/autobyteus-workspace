import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from "../../llm-management/llm-providers/stores/custom-llm-provider-store.js";
import type {
  TokenUsageAnalyticsDailyFacet,
  TokenUsageAnalyticsInput,
  TokenUsageAnalyticsResult,
} from "../domain/token-usage-analytics.js";
import {
  buildTokenUsageCostSummaryAggregate,
  type TokenUsageCostSummaryAggregate,
} from "../projections/token-usage-cost-summary-aggregate.js";
import {
  EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT,
  resolveTokenUsageModelDisplayName,
  resolveTokenUsageProviderDisplayName,
  type TokenUsageModelDisplayContext,
} from "../projections/token-usage-model-display-projection.js";
import { SqlTokenUsageAnalyticsRepository } from "../repositories/sql/token-usage-analytics-repository.js";
import {
  assertTokenUsageAnalyticsBucketReconciliation,
  buildTokenUsageAnalyticsBuckets,
  tokenUsageAnalyticsCostQuality,
  tokenUsageAnalyticsCoverageFor,
  tokenUsageAnalyticsPartitionKey,
} from "../services/token-usage-analytics-aggregation-policy.js";
import { TokenUsageAnalyticsRangePolicy } from "../services/token-usage-analytics-range-policy.js";

export class TokenUsageAnalyticsProvider {
  constructor(
    private readonly repository = new SqlTokenUsageAnalyticsRepository(),
    private readonly rangePolicy = new TokenUsageAnalyticsRangePolicy(),
    private readonly customProviderStore: Pick<CustomLlmProviderStore, "listProviders"> = getCustomLlmProviderStore(),
  ) {}

  async getAnalytics(input: TokenUsageAnalyticsInput, now = new Date()): Promise<TokenUsageAnalyticsResult> {
    const plan = this.rangePolicy.plan(input, now);
    const snapshot = await this.repository.readSnapshot(plan, input);
    const selectedAggregate = buildTokenUsageCostSummaryAggregate(snapshot.selectedFacets);
    const comparisonAggregate = plan.comparison ? buildTokenUsageCostSummaryAggregate(snapshot.comparisonFacets) : null;
    const trendBuckets = buildTokenUsageAnalyticsBuckets(snapshot.selectedFacets, plan.selected, plan.granularity);
    const comparisonBuckets = plan.comparison ? buildTokenUsageAnalyticsBuckets(snapshot.comparisonFacets, plan.comparison, plan.granularity) : [];
    assertTokenUsageAnalyticsBucketReconciliation(trendBuckets, plan.selected, selectedAggregate, "SELECTED");
    if (comparisonAggregate && plan.comparison) {
      assertTokenUsageAnalyticsBucketReconciliation(comparisonBuckets, plan.comparison, comparisonAggregate, "COMPARISON");
    }
    const displayContext = await this.loadDisplayContext(snapshot.filterFacets);
    const breakdownRows = this.buildBreakdown(snapshot.selectedFacets, displayContext);
    const breakdownTokenTotal = breakdownRows.reduce((sum, row) => sum + row.aggregate.total_tokens, 0);
    if (!Number.isSafeInteger(breakdownTokenTotal) || breakdownTokenTotal !== selectedAggregate.total_tokens) {
      throw new Error("TOKEN_USAGE_ANALYTICS_BREAKDOWN_RECONCILIATION_FAILED");
    }
    return {
      appliedRange: { ...plan.selected, preset: plan.preset, granularity: plan.granularity },
      comparisonRange: plan.comparison,
      coverage: tokenUsageAnalyticsCoverageFor(plan.selected, snapshot.coverageStart),
      comparisonCoverage: plan.comparison ? tokenUsageAnalyticsCoverageFor(plan.comparison, snapshot.coverageStart) : null,
      appliedFilters: { runtimeKind: input.runtimeKind, providerKey: input.providerKey, modelKey: input.modelKey },
      selectedAggregate,
      selectedCostQuality: tokenUsageAnalyticsCostQuality(snapshot.selectedFacets, selectedAggregate),
      comparisonAggregate,
      comparisonCostQuality: comparisonAggregate ? tokenUsageAnalyticsCostQuality(snapshot.comparisonFacets, comparisonAggregate) : null,
      activeDayCount: new Set(snapshot.selectedFacets
        .filter((facet) => facet.tokenTotals.accounting_total_tokens > 0n)
        .map((facet) => facet.bucketStart.toISOString())).size,
      trendBuckets,
      comparisonBuckets,
      breakdownRows,
      filterOptions: this.buildFilterOptions(snapshot.filterFacets, displayContext),
    };
  }

  private buildBreakdown(facets: TokenUsageAnalyticsDailyFacet[], context: TokenUsageModelDisplayContext) {
    const groups = new Map<string, TokenUsageAnalyticsDailyFacet[]>();
    for (const facet of facets) {
      const key = `${facet.identityKey}:${tokenUsageAnalyticsPartitionKey(facet)}`;
      groups.set(key, [...(groups.get(key) ?? []), facet]);
    }
    return [...groups.entries()].map(([rowKey, rows]) => {
      const identity = rows[0]!;
      const aggregate = buildTokenUsageCostSummaryAggregate(rows);
      const event = {
        runtime_kind: identity.runtimeKind,
        model_provider: identity.modelProvider,
        provider_name: identity.providerName,
        model_identifier: identity.modelIdentifier,
        model_value: identity.modelValue,
      };
      return {
        rowKey,
        identityKey: identity.identityKey,
        providerKey: identity.providerKey,
        modelKey: identity.modelKey,
        runtimeKind: identity.runtimeKind,
        modelProvider: identity.modelProvider,
        providerName: identity.providerName,
        providerDisplayName: resolveTokenUsageProviderDisplayName(event, context),
        modelIdentifier: identity.modelIdentifier,
        modelValue: identity.modelValue,
        modelDisplayName: resolveTokenUsageModelDisplayName(event, context),
        aggregate,
        costQuality: tokenUsageAnalyticsCostQuality(rows, aggregate),
      };
    }).sort((left, right) => right.aggregate.total_tokens - left.aggregate.total_tokens || left.rowKey.localeCompare(right.rowKey));
  }

  private buildFilterOptions(facets: TokenUsageAnalyticsDailyFacet[], context: TokenUsageModelDisplayContext) {
    const providers = new Map<string, TokenUsageAnalyticsDailyFacet>();
    const models = new Map<string, TokenUsageAnalyticsDailyFacet>();
    for (const facet of facets) {
      providers.set(facet.providerKey, facet);
      models.set(facet.modelKey, facet);
    }
    return {
      runtimeKinds: [...new Set(facets.map((facet) => facet.runtimeKind))].sort(),
      providers: [...providers.entries()].map(([key, facet]) => ({
        key,
        modelProvider: facet.modelProvider,
        providerName: facet.providerName,
        displayName: resolveTokenUsageProviderDisplayName({
          model_provider: facet.modelProvider,
          provider_name: facet.providerName,
          model_identifier: facet.modelIdentifier,
          model_value: facet.modelValue,
        }, context),
      })).sort((left, right) => left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key)),
      models: [...models.entries()].map(([key, facet]) => ({
        key,
        modelIdentifier: facet.modelIdentifier,
        modelValue: facet.modelValue,
        displayName: resolveTokenUsageModelDisplayName({
          runtime_kind: facet.runtimeKind,
          model_provider: facet.modelProvider,
          provider_name: facet.providerName,
          model_identifier: facet.modelIdentifier,
          model_value: facet.modelValue,
        }, context),
      })).sort((left, right) => left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key)),
    };
  }

  private async loadDisplayContext(facets: TokenUsageAnalyticsDailyFacet[]): Promise<TokenUsageModelDisplayContext> {
    const needsLookup = facets.some((facet) => facet.runtimeKind.toLowerCase() === "autobyteus" && !facet.providerName);
    if (!needsLookup) return EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT;
    try {
      const providers = await this.customProviderStore.listProviders();
      return { customProviderNames: new Map(providers.map((provider) => [provider.id, provider.name] as const)) };
    } catch {
      return { ...EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT, providerMapLoadFailed: true };
    }
  }
}
