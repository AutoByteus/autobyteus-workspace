import { Field, Float, Int, ObjectType } from "type-graphql";
import { GraphQLSafeInt } from "graphql-scalars";
import type { TokenUsageCostSummaryAggregate } from "../../../token-usage/projections/token-usage-cost-summary-aggregate.js";
import type { TokenUsageUnitPrices, TokenUsageUnitPriceSummary } from "../../../token-usage/domain/token-usage-unit-price-summary.js";

@ObjectType()
export class TokenUsageUnitPriceSummaryGraphql {
  @Field(() => String)
  status!: string;

  @Field(() => Float, { nullable: true })
  pricePerMillion?: number | null;
}

@ObjectType()
export class TokenUsageUnitPricesGraphql {
  @Field(() => TokenUsageUnitPriceSummaryGraphql)
  standardInput!: TokenUsageUnitPriceSummaryGraphql;

  @Field(() => TokenUsageUnitPriceSummaryGraphql)
  cacheReadInput!: TokenUsageUnitPriceSummaryGraphql;

  @Field(() => TokenUsageUnitPriceSummaryGraphql)
  cacheCreationInput!: TokenUsageUnitPriceSummaryGraphql;

  @Field(() => TokenUsageUnitPriceSummaryGraphql)
  cacheCreation5mInput!: TokenUsageUnitPriceSummaryGraphql;

  @Field(() => TokenUsageUnitPriceSummaryGraphql)
  cacheCreation1hInput!: TokenUsageUnitPriceSummaryGraphql;

  @Field(() => TokenUsageUnitPriceSummaryGraphql)
  output!: TokenUsageUnitPriceSummaryGraphql;

  @Field(() => TokenUsageUnitPriceSummaryGraphql)
  reasoningOutput!: TokenUsageUnitPriceSummaryGraphql;
}

@ObjectType()
export class TokenUsageCostSummaryAggregateGraphql {
  @Field(() => GraphQLSafeInt)
  grossInputTokens!: number;

  @Field(() => GraphQLSafeInt)
  standardInputTokens!: number;

  @Field(() => GraphQLSafeInt)
  cacheMissInputTokens!: number;

  @Field(() => GraphQLSafeInt)
  cacheReadInputTokens!: number;

  @Field(() => GraphQLSafeInt)
  cacheCreationInputTokens!: number;

  @Field(() => GraphQLSafeInt)
  cacheCreation5mInputTokens!: number;

  @Field(() => GraphQLSafeInt)
  cacheCreation1hInputTokens!: number;

  @Field(() => GraphQLSafeInt)
  outputTokens!: number;

  @Field(() => GraphQLSafeInt)
  reasoningOutputTokens!: number;

  @Field(() => GraphQLSafeInt)
  billableOutputTokens!: number;

  @Field(() => GraphQLSafeInt)
  totalTokens!: number;

  @Field(() => Float, { nullable: true })
  cacheReadInputTokenRate?: number | null;

  @Field(() => Float, { nullable: true })
  standardInputTokenRate?: number | null;

  @Field(() => Float, { nullable: true })
  cacheCreationInputTokenRate?: number | null;

  @Field(() => String)
  cacheState!: string;

  @Field(() => Float, { nullable: true })
  estimatedApiInputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiStandardInputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiCacheReadInputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiCacheCreationInputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiCacheCreation5mInputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiCacheCreation1hInputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiOutputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiReasoningOutputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiTotalCost?: number | null;

  @Field(() => String, { nullable: true })
  currency?: string | null;

  @Field(() => String)
  apiCostStatus!: string;

  @Field(() => [String])
  missingPriceDimensions!: string[];

  @Field(() => String, { nullable: true })
  pricingPolicyKey?: string | null;

  @Field(() => String, { nullable: true })
  selectedPricingTierId?: string | null;

  @Field(() => TokenUsageUnitPricesGraphql)
  unitPrices!: TokenUsageUnitPricesGraphql;

  @Field(() => Int)
  usageReportCount!: number;

  @Field(() => String, { nullable: true })
  updatedAt?: string | null;

  @Field(() => [String])
  observedRuntimeKinds!: string[];

  @Field(() => [String])
  observedModelIdentifiers!: string[];

  @Field(() => [String])
  observedModelProviders!: string[];
}

const toTokenUsageUnitPriceSummaryGraphql = (
  summary: TokenUsageUnitPriceSummary,
): TokenUsageUnitPriceSummaryGraphql => ({
  status: summary.status,
  pricePerMillion: summary.price_per_million,
});

const toTokenUsageUnitPricesGraphql = (
  unitPrices: TokenUsageUnitPrices,
): TokenUsageUnitPricesGraphql => ({
  standardInput: toTokenUsageUnitPriceSummaryGraphql(unitPrices.standard_input),
  cacheReadInput: toTokenUsageUnitPriceSummaryGraphql(unitPrices.cache_read_input),
  cacheCreationInput: toTokenUsageUnitPriceSummaryGraphql(unitPrices.cache_creation_input),
  cacheCreation5mInput: toTokenUsageUnitPriceSummaryGraphql(unitPrices.cache_creation_5m_input),
  cacheCreation1hInput: toTokenUsageUnitPriceSummaryGraphql(unitPrices.cache_creation_1h_input),
  output: toTokenUsageUnitPriceSummaryGraphql(unitPrices.output),
  reasoningOutput: toTokenUsageUnitPriceSummaryGraphql(unitPrices.reasoning_output),
});

export const toTokenUsageCostSummaryAggregateGraphql = (
  aggregate: TokenUsageCostSummaryAggregate,
): TokenUsageCostSummaryAggregateGraphql => ({
  grossInputTokens: aggregate.gross_input_tokens,
  standardInputTokens: aggregate.standard_input_tokens,
  cacheMissInputTokens: aggregate.cache_miss_input_tokens,
  cacheReadInputTokens: aggregate.cache_read_input_tokens,
  cacheCreationInputTokens: aggregate.cache_creation_input_tokens,
  cacheCreation5mInputTokens: aggregate.cache_creation_5m_input_tokens,
  cacheCreation1hInputTokens: aggregate.cache_creation_1h_input_tokens,
  outputTokens: aggregate.output_tokens,
  reasoningOutputTokens: aggregate.reasoning_output_tokens,
  billableOutputTokens: aggregate.billable_output_tokens,
  totalTokens: aggregate.total_tokens,
  cacheReadInputTokenRate: aggregate.cache_read_input_token_rate,
  standardInputTokenRate: aggregate.standard_input_token_rate,
  cacheCreationInputTokenRate: aggregate.cache_creation_input_token_rate,
  cacheState: aggregate.cache_state,
  estimatedApiInputCost: aggregate.estimated_api_input_cost,
  estimatedApiStandardInputCost: aggregate.estimated_api_standard_input_cost,
  estimatedApiCacheReadInputCost: aggregate.estimated_api_cache_read_input_cost,
  estimatedApiCacheCreationInputCost: aggregate.estimated_api_cache_creation_input_cost,
  estimatedApiCacheCreation5mInputCost: aggregate.estimated_api_cache_creation_5m_input_cost,
  estimatedApiCacheCreation1hInputCost: aggregate.estimated_api_cache_creation_1h_input_cost,
  estimatedApiOutputCost: aggregate.estimated_api_output_cost,
  estimatedApiReasoningOutputCost: aggregate.estimated_api_reasoning_output_cost,
  estimatedApiTotalCost: aggregate.estimated_api_total_cost,
  currency: aggregate.currency,
  apiCostStatus: aggregate.api_cost_status,
  missingPriceDimensions: aggregate.missing_price_dimensions,
  pricingPolicyKey: aggregate.pricing_policy_key,
  selectedPricingTierId: aggregate.selected_pricing_tier_id,
  unitPrices: toTokenUsageUnitPricesGraphql(aggregate.unit_prices),
  usageReportCount: aggregate.usage_report_count,
  updatedAt: aggregate.updated_at,
  observedRuntimeKinds: aggregate.observed_runtime_kinds,
  observedModelIdentifiers: aggregate.observed_model_identifiers,
  observedModelProviders: aggregate.observed_model_providers,
});
