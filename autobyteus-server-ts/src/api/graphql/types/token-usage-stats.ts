import { Arg, Field, Float, Int, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON, GraphQLSafeInt } from "graphql-scalars";
import type { TokenUsageRunSummaryPayload } from "../../../agent-execution/domain/agent-run-token-usage.js";
import type {
  TokenUsageCostSummaryAggregate,
} from "../../../token-usage/projections/token-usage-cost-summary-aggregate.js";
import type {
  TokenUsageUnitPrices,
  TokenUsageUnitPriceSummary,
} from "../../../token-usage/domain/token-usage-unit-price-summary.js";
import type {
  TokenUsageRuntimeModelStatisticsRow,
  TokenUsageTaskStatisticsRow,
} from "../../../token-usage/domain/statistics-models.js";
import { TokenUsageRunStore } from "../../../token-usage/providers/token-usage-run-store.js";
import { TokenUsageStatisticsProvider } from "../../../token-usage/providers/statistics-provider.js";

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

@ObjectType()
export class TokenUsageRunSummaryGraphql extends TokenUsageCostSummaryAggregateGraphql {
  @Field(() => String)
  runId!: string;

  @Field(() => String, { nullable: true })
  rootTeamRunId?: string | null;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => GraphQLSafeInt, { nullable: true })
  latestPromptTokens?: number | null;

  @Field(() => GraphQLSafeInt, { nullable: true })
  effectiveContextWindowTokens?: number | null;

  @Field(() => Float, { nullable: true })
  contextWindowUsagePercent?: number | null;

  @Field(() => String, { nullable: true })
  latestModelProvider?: string | null;

  @Field(() => String, { nullable: true })
  latestModelIdentifier?: string | null;

  @Field(() => String, { nullable: true })
  latestRuntimeKind?: string | null;
}

@ObjectType()
export class TokenUsageTaskStatisticsRowGraphql {
  @Field(() => String)
  rowId!: string;

  @Field(() => String)
  rowKind!: string;

  @Field(() => String, { nullable: true })
  runId?: string | null;

  @Field(() => String, { nullable: true })
  taskId?: string | null;

  @Field(() => String, { nullable: true })
  rootTeamRunId?: string | null;

  @Field(() => String)
  displayName!: string;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  createdTimeSource!: string;

  @Field(() => [String])
  models!: string[];

  @Field(() => [String])
  modelDisplayNames!: string[];

  @Field(() => [String])
  runtimeKinds!: string[];

  @Field(() => TokenUsageCostSummaryAggregateGraphql)
  aggregate!: TokenUsageCostSummaryAggregateGraphql;

  @Field(() => [TokenUsageTaskStatisticsRowGraphql])
  children!: TokenUsageTaskStatisticsRowGraphql[];
}

@ObjectType()
export class TokenUsageTaskStatisticsResultGraphql {
  @Field(() => [TokenUsageTaskStatisticsRowGraphql])
  rows!: TokenUsageTaskStatisticsRowGraphql[];
}

@ObjectType()
export class UsageStatistics {
  @Field(() => String)
  runtimeKind!: string;

  @Field(() => String)
  llmModel!: string;

  @Field(() => String)
  modelDisplayName!: string;

  @Field(() => GraphQLSafeInt)
  inputTokens!: number;

  @Field(() => GraphQLSafeInt)
  promptTokens!: number;

  @Field(() => GraphQLSafeInt)
  cacheReadInputTokens!: number;

  @Field(() => GraphQLSafeInt)
  cacheCreationInputTokens!: number;

  @Field(() => Float, { nullable: true })
  cacheReadInputTokenRate?: number | null;

  @Field(() => String)
  cacheState!: string;

  @Field(() => GraphQLSafeInt)
  outputTokens!: number;

  @Field(() => GraphQLSafeInt)
  assistantTokens!: number;

  @Field(() => GraphQLSafeInt)
  thinkingTokens!: number;

  @Field(() => GraphQLSafeInt)
  reasoningTokens!: number;

  @Field(() => Float, { nullable: true })
  inputCost?: number | null;

  @Field(() => Float, { nullable: true })
  promptCost?: number | null;

  @Field(() => Float, { nullable: true })
  outputCost?: number | null;

  @Field(() => Float, { nullable: true })
  assistantCost?: number | null;

  @Field(() => Float, { nullable: true })
  thinkingCost?: number | null;

  @Field(() => Float, { nullable: true })
  reasoningCost?: number | null;

  @Field(() => Float, { nullable: true })
  totalCost?: number | null;

  @Field(() => String, { nullable: true })
  currency?: string | null;

  @Field(() => String)
  apiCostStatus!: string;

  @Field(() => TokenUsageCostSummaryAggregateGraphql)
  aggregate!: TokenUsageCostSummaryAggregateGraphql;
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

const toTokenUsageCostSummaryAggregateGraphql = (
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

const summaryAggregate = (summary: TokenUsageRunSummaryPayload): TokenUsageCostSummaryAggregate => ({
  gross_input_tokens: summary.gross_input_tokens,
  standard_input_tokens: summary.standard_input_tokens,
  cache_miss_input_tokens: summary.cache_miss_input_tokens,
  cache_read_input_tokens: summary.cache_read_input_tokens,
  cache_creation_input_tokens: summary.cache_creation_input_tokens,
  cache_creation_5m_input_tokens: summary.cache_creation_5m_input_tokens,
  cache_creation_1h_input_tokens: summary.cache_creation_1h_input_tokens,
  output_tokens: summary.output_tokens,
  reasoning_output_tokens: summary.reasoning_output_tokens,
  billable_output_tokens: summary.billable_output_tokens,
  total_tokens: summary.total_tokens,
  cache_read_input_token_rate: summary.cache_read_input_token_rate,
  standard_input_token_rate: summary.standard_input_token_rate,
  cache_creation_input_token_rate: summary.cache_creation_input_token_rate,
  cache_state: summary.cache_state,
  estimated_api_input_cost: summary.estimated_api_input_cost,
  estimated_api_standard_input_cost: summary.estimated_api_standard_input_cost,
  estimated_api_cache_read_input_cost: summary.estimated_api_cache_read_input_cost,
  estimated_api_cache_creation_input_cost: summary.estimated_api_cache_creation_input_cost,
  estimated_api_cache_creation_5m_input_cost: summary.estimated_api_cache_creation_5m_input_cost,
  estimated_api_cache_creation_1h_input_cost: summary.estimated_api_cache_creation_1h_input_cost,
  estimated_api_output_cost: summary.estimated_api_output_cost,
  estimated_api_reasoning_output_cost: summary.estimated_api_reasoning_output_cost,
  estimated_api_total_cost: summary.estimated_api_total_cost,
  currency: summary.currency,
  api_cost_status: summary.api_cost_status,
  missing_price_dimensions: summary.missing_price_dimensions,
  pricing_policy_key: summary.pricing_policy_key,
  selected_pricing_tier_id: summary.selected_pricing_tier_id,
  unit_prices: summary.unit_prices,
  usage_report_count: summary.usage_report_count,
  updated_at: summary.updated_at,
  observed_runtime_kinds: summary.latest_runtime_kind ? [summary.latest_runtime_kind] : [],
  observed_model_identifiers: summary.latest_model_identifier ? [summary.latest_model_identifier] : [],
  observed_model_providers: summary.latest_model_provider ? [summary.latest_model_provider] : [],
});

const toTokenUsageRunSummaryGraphql = (summary: TokenUsageRunSummaryPayload): TokenUsageRunSummaryGraphql => ({
  ...toTokenUsageCostSummaryAggregateGraphql(summaryAggregate(summary)),
  runId: summary.run_id,
  rootTeamRunId: summary.root_team_run_id,
  agentDefinitionId: summary.agent_definition_id,
  workspaceId: summary.workspace_id,
  latestPromptTokens: summary.latest_prompt_tokens,
  effectiveContextWindowTokens: summary.effective_context_window_tokens,
  contextWindowUsagePercent: summary.context_window_usage_percent,
  latestModelProvider: summary.latest_model_provider,
  latestModelIdentifier: summary.latest_model_identifier,
  latestRuntimeKind: summary.latest_runtime_kind,
});

const toTaskRow = (row: TokenUsageTaskStatisticsRow): TokenUsageTaskStatisticsRowGraphql => ({
  rowId: row.rowId,
  rowKind: row.rowKind,
  runId: row.runId,
  taskId: row.taskId,
  rootTeamRunId: row.rootTeamRunId,
  displayName: row.displayName,
  summary: row.summary,
  createdAt: row.createdAt,
  createdTimeSource: row.createdTimeSource,
  models: row.models,
  modelDisplayNames: row.modelDisplayNames,
  runtimeKinds: row.runtimeKinds,
  aggregate: toTokenUsageCostSummaryAggregateGraphql(row.aggregate),
  children: row.children.map(toTaskRow),
});

const toUsageStatistics = (row: TokenUsageRuntimeModelStatisticsRow): UsageStatistics => ({
  runtimeKind: row.runtimeKind,
  llmModel: row.modelIdentifier,
  modelDisplayName: row.modelDisplayName,
  inputTokens: row.aggregate.gross_input_tokens,
  promptTokens: row.aggregate.gross_input_tokens,
  cacheReadInputTokens: row.aggregate.cache_read_input_tokens,
  cacheCreationInputTokens: row.aggregate.cache_creation_input_tokens,
  cacheReadInputTokenRate: row.aggregate.cache_read_input_token_rate,
  cacheState: row.aggregate.cache_state,
  outputTokens: row.aggregate.output_tokens,
  assistantTokens: row.aggregate.output_tokens,
  thinkingTokens: row.aggregate.reasoning_output_tokens,
  reasoningTokens: row.aggregate.reasoning_output_tokens,
  inputCost: row.aggregate.estimated_api_input_cost,
  promptCost: row.aggregate.estimated_api_input_cost,
  outputCost: row.aggregate.estimated_api_output_cost,
  assistantCost: row.aggregate.estimated_api_output_cost,
  thinkingCost: row.aggregate.estimated_api_reasoning_output_cost,
  reasoningCost: row.aggregate.estimated_api_reasoning_output_cost,
  totalCost: row.aggregate.estimated_api_total_cost,
  currency: row.aggregate.currency,
  apiCostStatus: row.aggregate.api_cost_status,
  aggregate: toTokenUsageCostSummaryAggregateGraphql(row.aggregate),
});

@Resolver()
export class TokenUsageStatisticsResolver {
  @Query(() => Float, { nullable: true })
  async totalCostInPeriod(
    @Arg("startTime", () => Date) startTime: Date,
    @Arg("endTime", () => Date) endTime: Date,
  ): Promise<number | null> {
    const provider = new TokenUsageStatisticsProvider();
    return provider.getTotalCost(startTime, endTime);
  }

  @Query(() => TokenUsageTaskStatisticsResultGraphql)
  async tokenUsageTaskStatisticsInPeriod(
    @Arg("startTime", () => Date) startTime: Date,
    @Arg("endTime", () => Date) endTime: Date,
  ): Promise<TokenUsageTaskStatisticsResultGraphql> {
    const provider = new TokenUsageStatisticsProvider();
    const result = await provider.getTaskStatisticsInPeriod(startTime, endTime);
    return { rows: result.rows.map(toTaskRow) };
  }

  @Query(() => [UsageStatistics])
  async usageStatisticsInPeriod(
    @Arg("startTime", () => Date) startTime: Date,
    @Arg("endTime", () => Date) endTime: Date,
  ): Promise<UsageStatistics[]> {
    const provider = new TokenUsageStatisticsProvider();
    const stats = await provider.getStatisticsPerRuntimeModel(startTime, endTime);
    return stats.map(toUsageStatistics);
  }

  @Query(() => TokenUsageRunSummaryGraphql)
  async getAgentRunTokenUsageSummary(
    @Arg("runId", () => String) runId: string,
  ): Promise<TokenUsageRunSummaryGraphql> {
    const store = new TokenUsageRunStore();
    return toTokenUsageRunSummaryGraphql(await store.getAgentRunSummary(runId));
  }

  @Query(() => TokenUsageRunSummaryGraphql)
  async getTeamRunTokenUsageSummary(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TokenUsageRunSummaryGraphql> {
    const store = new TokenUsageRunStore();
    return toTokenUsageRunSummaryGraphql(await store.getTeamRunSummary(teamRunId));
  }

  @Query(() => TokenUsageRunSummaryGraphql)
  async getTeamMemberTokenUsageSummary(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<TokenUsageRunSummaryGraphql> {
    const store = new TokenUsageRunStore();
    return toTokenUsageRunSummaryGraphql(await store.getTeamMemberSummary({
      rootTeamRunId: teamRunId,
      agentRunId,
    }));
  }
}
