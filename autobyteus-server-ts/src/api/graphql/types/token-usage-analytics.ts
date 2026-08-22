import { Arg, Field, InputType, Int, ObjectType, Query, Resolver } from "type-graphql";
import type {
  TokenUsageAnalyticsCostQuality,
  TokenUsageAnalyticsInput as DomainInput,
  TokenUsageAnalyticsRangePreset,
  TokenUsageAnalyticsResult,
} from "../../../token-usage/domain/token-usage-analytics.js";
import { TokenUsageAnalyticsProvider } from "../../../token-usage/providers/token-usage-analytics-provider.js";
import {
  TokenUsageCostSummaryAggregateGraphql,
  toTokenUsageCostSummaryAggregateGraphql,
} from "./token-usage-cost-summary.js";

@InputType()
class TokenUsageAnalyticsInputGraphql {
  @Field(() => String)
  rangePreset!: string;
  @Field(() => Date)
  startTime!: Date;
  @Field(() => Date)
  endTimeExclusive!: Date;
  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;
  @Field(() => String, { nullable: true })
  providerKey?: string | null;
  @Field(() => String, { nullable: true })
  modelKey?: string | null;
}

@ObjectType()
class TokenUsageAnalyticsRangeGraphql {
  @Field(() => String)
  startTime!: string;
  @Field(() => String)
  endTimeExclusive!: string;
}

@ObjectType()
class TokenUsageAnalyticsAppliedRangeGraphql extends TokenUsageAnalyticsRangeGraphql {
  @Field(() => String)
  preset!: string;
  @Field(() => String)
  granularity!: string;
}

@ObjectType()
class TokenUsageAnalyticsCoverageGraphql {
  @Field(() => String)
  status!: string;
  @Field(() => String)
  coverageStart!: string;
}

@ObjectType()
class TokenUsageAnalyticsAppliedFiltersGraphql {
  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;
  @Field(() => String, { nullable: true })
  providerKey?: string | null;
  @Field(() => String, { nullable: true })
  modelKey?: string | null;
}

@ObjectType()
class TokenUsageAnalyticsCostQualityGraphql {
  @Field(() => String)
  kind!: string;
  @Field(() => String, { nullable: true })
  currency?: string | null;
  @Field(() => [String])
  missingPriceDimensions!: string[];
}

@ObjectType()
class TokenUsageAnalyticsBucketGraphql {
  @Field(() => String)
  bucketStart!: string;
  @Field(() => String)
  bucketEndExclusive!: string;
  @Field(() => TokenUsageCostSummaryAggregateGraphql)
  aggregate!: TokenUsageCostSummaryAggregateGraphql;
  @Field(() => TokenUsageAnalyticsCostQualityGraphql)
  costQuality!: TokenUsageAnalyticsCostQualityGraphql;
}

@ObjectType()
class TokenUsageAnalyticsBreakdownRowGraphql {
  @Field(() => String)
  rowKey!: string;
  @Field(() => String)
  identityKey!: string;
  @Field(() => String)
  providerKey!: string;
  @Field(() => String)
  modelKey!: string;
  @Field(() => String)
  runtimeKind!: string;
  @Field(() => String, { nullable: true })
  modelProvider?: string | null;
  @Field(() => String, { nullable: true })
  providerName?: string | null;
  @Field(() => String)
  providerDisplayName!: string;
  @Field(() => String, { nullable: true })
  modelIdentifier?: string | null;
  @Field(() => String, { nullable: true })
  modelValue?: string | null;
  @Field(() => String)
  modelDisplayName!: string;
  @Field(() => TokenUsageCostSummaryAggregateGraphql)
  aggregate!: TokenUsageCostSummaryAggregateGraphql;
  @Field(() => TokenUsageAnalyticsCostQualityGraphql)
  costQuality!: TokenUsageAnalyticsCostQualityGraphql;
}

@ObjectType()
class TokenUsageAnalyticsProviderOptionGraphql {
  @Field(() => String)
  key!: string;
  @Field(() => String, { nullable: true })
  modelProvider?: string | null;
  @Field(() => String, { nullable: true })
  providerName?: string | null;
  @Field(() => String)
  displayName!: string;
}

@ObjectType()
class TokenUsageAnalyticsModelOptionGraphql {
  @Field(() => String)
  key!: string;
  @Field(() => String, { nullable: true })
  modelIdentifier?: string | null;
  @Field(() => String, { nullable: true })
  modelValue?: string | null;
  @Field(() => String)
  displayName!: string;
}

@ObjectType()
class TokenUsageAnalyticsFilterOptionsGraphql {
  @Field(() => [String])
  runtimeKinds!: string[];
  @Field(() => [TokenUsageAnalyticsProviderOptionGraphql])
  providers!: TokenUsageAnalyticsProviderOptionGraphql[];
  @Field(() => [TokenUsageAnalyticsModelOptionGraphql])
  models!: TokenUsageAnalyticsModelOptionGraphql[];
}

@ObjectType()
class TokenUsageAnalyticsResultGraphql {
  @Field(() => TokenUsageAnalyticsAppliedRangeGraphql)
  appliedRange!: TokenUsageAnalyticsAppliedRangeGraphql;
  @Field(() => TokenUsageAnalyticsRangeGraphql, { nullable: true })
  comparisonRange?: TokenUsageAnalyticsRangeGraphql | null;
  @Field(() => TokenUsageAnalyticsCoverageGraphql)
  coverage!: TokenUsageAnalyticsCoverageGraphql;
  @Field(() => TokenUsageAnalyticsCoverageGraphql, { nullable: true })
  comparisonCoverage?: TokenUsageAnalyticsCoverageGraphql | null;
  @Field(() => TokenUsageAnalyticsAppliedFiltersGraphql)
  appliedFilters!: TokenUsageAnalyticsAppliedFiltersGraphql;
  @Field(() => TokenUsageCostSummaryAggregateGraphql)
  selectedAggregate!: TokenUsageCostSummaryAggregateGraphql;
  @Field(() => TokenUsageAnalyticsCostQualityGraphql)
  selectedCostQuality!: TokenUsageAnalyticsCostQualityGraphql;
  @Field(() => TokenUsageCostSummaryAggregateGraphql, { nullable: true })
  comparisonAggregate?: TokenUsageCostSummaryAggregateGraphql | null;
  @Field(() => TokenUsageAnalyticsCostQualityGraphql, { nullable: true })
  comparisonCostQuality?: TokenUsageAnalyticsCostQualityGraphql | null;
  @Field(() => Int)
  activeDayCount!: number;
  @Field(() => [TokenUsageAnalyticsBucketGraphql])
  trendBuckets!: TokenUsageAnalyticsBucketGraphql[];
  @Field(() => [TokenUsageAnalyticsBucketGraphql])
  comparisonBuckets!: TokenUsageAnalyticsBucketGraphql[];
  @Field(() => [TokenUsageAnalyticsBreakdownRowGraphql])
  breakdownRows!: TokenUsageAnalyticsBreakdownRowGraphql[];
  @Field(() => TokenUsageAnalyticsFilterOptionsGraphql)
  filterOptions!: TokenUsageAnalyticsFilterOptionsGraphql;
}

const preset = (value: string): TokenUsageAnalyticsRangePreset => {
  if (["THIS_MONTH", "LAST_MONTH", "LAST_3_MONTHS", "LAST_12_MONTHS", "CUSTOM"].includes(value)) {
    return value as TokenUsageAnalyticsRangePreset;
  }
  throw new Error("TOKEN_USAGE_ANALYTICS_RANGE_PRESET_INVALID");
};
const compact = (value: string | null | undefined): string | null => value?.trim() || null;
const costQuality = (value: TokenUsageAnalyticsCostQuality): TokenUsageAnalyticsCostQualityGraphql => ({
  kind: value.kind,
  currency: value.currency,
  missingPriceDimensions: value.missingPriceDimensions,
});
const mapResult = (result: TokenUsageAnalyticsResult): TokenUsageAnalyticsResultGraphql => ({
  appliedRange: {
    preset: result.appliedRange.preset,
    startTime: result.appliedRange.startTime.toISOString(),
    endTimeExclusive: result.appliedRange.endTimeExclusive.toISOString(),
    granularity: result.appliedRange.granularity,
  },
  comparisonRange: result.comparisonRange ? {
    startTime: result.comparisonRange.startTime.toISOString(),
    endTimeExclusive: result.comparisonRange.endTimeExclusive.toISOString(),
  } : null,
  coverage: { status: result.coverage.status, coverageStart: result.coverage.coverageStart.toISOString() },
  comparisonCoverage: result.comparisonCoverage ? {
    status: result.comparisonCoverage.status,
    coverageStart: result.comparisonCoverage.coverageStart.toISOString(),
  } : null,
  appliedFilters: result.appliedFilters,
  selectedAggregate: toTokenUsageCostSummaryAggregateGraphql(result.selectedAggregate),
  selectedCostQuality: costQuality(result.selectedCostQuality),
  comparisonAggregate: result.comparisonAggregate ? toTokenUsageCostSummaryAggregateGraphql(result.comparisonAggregate) : null,
  comparisonCostQuality: result.comparisonCostQuality ? costQuality(result.comparisonCostQuality) : null,
  activeDayCount: result.activeDayCount,
  trendBuckets: result.trendBuckets.map((bucket) => ({
    bucketStart: bucket.bucketStart.toISOString(),
    bucketEndExclusive: bucket.bucketEndExclusive.toISOString(),
    aggregate: toTokenUsageCostSummaryAggregateGraphql(bucket.aggregate),
    costQuality: costQuality(bucket.costQuality),
  })),
  comparisonBuckets: result.comparisonBuckets.map((bucket) => ({
    bucketStart: bucket.bucketStart.toISOString(),
    bucketEndExclusive: bucket.bucketEndExclusive.toISOString(),
    aggregate: toTokenUsageCostSummaryAggregateGraphql(bucket.aggregate),
    costQuality: costQuality(bucket.costQuality),
  })),
  breakdownRows: result.breakdownRows.map((row) => ({
    ...row,
    aggregate: toTokenUsageCostSummaryAggregateGraphql(row.aggregate),
    costQuality: costQuality(row.costQuality),
  })),
  filterOptions: result.filterOptions,
});

@Resolver()
export class TokenUsageAnalyticsResolver {
  @Query(() => TokenUsageAnalyticsResultGraphql)
  async tokenUsageAnalytics(
    @Arg("input", () => TokenUsageAnalyticsInputGraphql) input: TokenUsageAnalyticsInputGraphql,
  ): Promise<TokenUsageAnalyticsResultGraphql> {
    const domainInput: DomainInput = {
      rangePreset: preset(input.rangePreset),
      startTime: input.startTime,
      endTimeExclusive: input.endTimeExclusive,
      runtimeKind: compact(input.runtimeKind),
      providerKey: compact(input.providerKey),
      modelKey: compact(input.modelKey),
    };
    return mapResult(await new TokenUsageAnalyticsProvider().getAnalytics(domainInput));
  }
}
