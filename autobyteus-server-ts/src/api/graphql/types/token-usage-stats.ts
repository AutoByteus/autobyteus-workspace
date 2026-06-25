import { Arg, Field, Float, Int, ObjectType, Query, Resolver } from "type-graphql";
import { TokenUsageStatisticsProvider } from "../../../token-usage/providers/statistics-provider.js";
import type { TokenUsageStats } from "../../../token-usage/domain/models.js";
import { TokenUsageLedgerStore } from "../../../token-usage/providers/token-usage-ledger-store.js";
import type { TokenUsageRunSummaryPayload } from "../../../agent-execution/domain/agent-run-token-usage.js";


@ObjectType()
export class TokenUsageRunSummaryGraphql {
  @Field(() => String)
  runId!: string;

  @Field(() => String, { nullable: true })
  rootTeamRunId?: string | null;

  @Field(() => [String], { nullable: true })
  teamRunPath?: string[] | null;

  @Field(() => String, { nullable: true })
  memberAgentRunId?: string | null;

  @Field(() => [String], { nullable: true })
  memberPath?: string[] | null;

  @Field(() => String, { nullable: true })
  memberRouteKey?: string | null;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => Int)
  grossInputTokens!: number;

  @Field(() => Int)
  standardInputTokens!: number;

  @Field(() => Int)
  cacheMissInputTokens!: number;

  @Field(() => Int)
  cacheReadInputTokens!: number;

  @Field(() => Int)
  cacheCreationInputTokens!: number;

  @Field(() => Int)
  cacheCreation5mInputTokens!: number;

  @Field(() => Int)
  cacheCreation1hInputTokens!: number;

  @Field(() => Int)
  outputTokens!: number;

  @Field(() => Int)
  reasoningOutputTokens!: number;

  @Field(() => Int)
  billableOutputTokens!: number;

  @Field(() => Int)
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

  @Field(() => Int, { nullable: true })
  latestPromptTokens?: number | null;

  @Field(() => Int, { nullable: true })
  effectiveContextWindowTokens?: number | null;

  @Field(() => Float, { nullable: true })
  contextWindowUsagePercent?: number | null;

  @Field(() => String, { nullable: true })
  latestModelProvider?: string | null;

  @Field(() => String, { nullable: true })
  latestModelIdentifier?: string | null;

  @Field(() => String, { nullable: true })
  latestRuntimeKind?: string | null;

  @Field(() => Int)
  usageReportCount!: number;

  @Field(() => String, { nullable: true })
  updatedAt?: string | null;
}

const toTokenUsageRunSummaryGraphql = (summary: TokenUsageRunSummaryPayload): TokenUsageRunSummaryGraphql => ({
  runId: summary.run_id,
  rootTeamRunId: summary.root_team_run_id,
  teamRunPath: summary.team_run_path,
  memberAgentRunId: summary.member_agent_run_id,
  memberPath: summary.member_path,
  memberRouteKey: summary.member_route_key,
  agentDefinitionId: summary.agent_definition_id,
  workspaceId: summary.workspace_id,
  grossInputTokens: summary.gross_input_tokens,
  standardInputTokens: summary.standard_input_tokens,
  cacheMissInputTokens: summary.cache_miss_input_tokens,
  cacheReadInputTokens: summary.cache_read_input_tokens,
  cacheCreationInputTokens: summary.cache_creation_input_tokens,
  cacheCreation5mInputTokens: summary.cache_creation_5m_input_tokens,
  cacheCreation1hInputTokens: summary.cache_creation_1h_input_tokens,
  outputTokens: summary.output_tokens,
  reasoningOutputTokens: summary.reasoning_output_tokens,
  billableOutputTokens: summary.billable_output_tokens,
  totalTokens: summary.total_tokens,
  cacheReadInputTokenRate: summary.cache_read_input_token_rate,
  standardInputTokenRate: summary.standard_input_token_rate,
  cacheCreationInputTokenRate: summary.cache_creation_input_token_rate,
  cacheState: summary.cache_state,
  estimatedApiInputCost: summary.estimated_api_input_cost,
  estimatedApiStandardInputCost: summary.estimated_api_standard_input_cost,
  estimatedApiCacheReadInputCost: summary.estimated_api_cache_read_input_cost,
  estimatedApiCacheCreationInputCost: summary.estimated_api_cache_creation_input_cost,
  estimatedApiCacheCreation5mInputCost: summary.estimated_api_cache_creation_5m_input_cost,
  estimatedApiCacheCreation1hInputCost: summary.estimated_api_cache_creation_1h_input_cost,
  estimatedApiOutputCost: summary.estimated_api_output_cost,
  estimatedApiReasoningOutputCost: summary.estimated_api_reasoning_output_cost,
  estimatedApiTotalCost: summary.estimated_api_total_cost,
  currency: summary.currency,
  apiCostStatus: summary.api_cost_status,
  missingPriceDimensions: summary.missing_price_dimensions,
  pricingPolicyKey: summary.pricing_policy_key,
  selectedPricingTierId: summary.selected_pricing_tier_id,
  latestPromptTokens: summary.latest_prompt_tokens,
  effectiveContextWindowTokens: summary.effective_context_window_tokens,
  contextWindowUsagePercent: summary.context_window_usage_percent,
  latestModelProvider: summary.latest_model_provider,
  latestModelIdentifier: summary.latest_model_identifier,
  latestRuntimeKind: summary.latest_runtime_kind,
  usageReportCount: summary.usage_report_count,
  updatedAt: summary.updated_at,
});

@ObjectType()
export class UsageStatistics {
  @Field(() => String)
  llmModel!: string;

  @Field(() => Int)
  promptTokens!: number;

  @Field(() => Int)
  assistantTokens!: number;

  @Field(() => Int)
  reasoningTokens!: number;

  @Field(() => Float, { nullable: true })
  promptCost?: number | null;

  @Field(() => Float, { nullable: true })
  assistantCost?: number | null;

  @Field(() => Float, { nullable: true })
  reasoningCost?: number | null;

  @Field(() => Float, { nullable: true })
  totalCost?: number | null;

  @Field(() => String, { nullable: true })
  currency?: string | null;

  @Field(() => String)
  apiCostStatus!: string;
}

const toUsageStatistics = (model: string, stats: TokenUsageStats): UsageStatistics => ({
  llmModel: model,
  promptTokens: stats.promptTokens,
  assistantTokens: stats.assistantTokens,
  reasoningTokens: stats.reasoningTokens,
  promptCost: stats.promptTokenCost,
  assistantCost: stats.assistantTokenCost,
  reasoningCost: stats.reasoningTokenCost,
  totalCost: stats.totalCost,
  currency: stats.currency,
  apiCostStatus: stats.apiCostStatus,
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

  @Query(() => [UsageStatistics])
  async usageStatisticsInPeriod(
    @Arg("startTime", () => Date) startTime: Date,
    @Arg("endTime", () => Date) endTime: Date,
  ): Promise<UsageStatistics[]> {
    const provider = new TokenUsageStatisticsProvider();
    const stats = await provider.getStatisticsPerModel(startTime, endTime);
    return Object.entries(stats).map(([model, data]) => toUsageStatistics(model, data));
  }

  @Query(() => TokenUsageRunSummaryGraphql)
  async getAgentRunTokenUsageSummary(
    @Arg("runId", () => String) runId: string,
  ): Promise<TokenUsageRunSummaryGraphql> {
    const store = new TokenUsageLedgerStore();
    return toTokenUsageRunSummaryGraphql(await store.getAgentRunSummary(runId));
  }

  @Query(() => TokenUsageRunSummaryGraphql)
  async getTeamRunTokenUsageSummary(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TokenUsageRunSummaryGraphql> {
    const store = new TokenUsageLedgerStore();
    return toTokenUsageRunSummaryGraphql(await store.getTeamRunSummary(teamRunId));
  }

  @Query(() => TokenUsageRunSummaryGraphql)
  async getTeamMemberTokenUsageSummary(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("memberAgentRunId", () => String, { nullable: true }) memberAgentRunId?: string | null,
    @Arg("memberRouteKey", () => String, { nullable: true }) memberRouteKey?: string | null,
  ): Promise<TokenUsageRunSummaryGraphql> {
    const store = new TokenUsageLedgerStore();
    return toTokenUsageRunSummaryGraphql(await store.getTeamMemberSummary({
      rootTeamRunId: teamRunId,
      memberAgentRunId: memberAgentRunId ?? null,
      memberRouteKey: memberRouteKey ?? null,
    }));
  }

}
