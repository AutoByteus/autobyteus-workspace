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
  inputTokens!: number;

  @Field(() => Int)
  outputTokens!: number;

  @Field(() => Int)
  totalTokens!: number;

  @Field(() => Float, { nullable: true })
  estimatedApiInputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiOutputCost?: number | null;

  @Field(() => Float, { nullable: true })
  estimatedApiTotalCost?: number | null;

  @Field(() => String, { nullable: true })
  currency?: string | null;

  @Field(() => String)
  apiCostStatus!: string;

  @Field(() => Int, { nullable: true })
  latestContextInputTokens?: number | null;

  @Field(() => Int, { nullable: true })
  effectiveContextBudgetTokens?: number | null;

  @Field(() => Float, { nullable: true })
  contextPressurePercent?: number | null;

  @Field(() => String, { nullable: true })
  latestModelProvider?: string | null;

  @Field(() => String, { nullable: true })
  latestModelIdentifier?: string | null;

  @Field(() => String, { nullable: true })
  latestRuntimeKind?: string | null;

  @Field(() => Int)
  eventCount!: number;

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
  inputTokens: summary.input_tokens,
  outputTokens: summary.output_tokens,
  totalTokens: summary.total_tokens,
  estimatedApiInputCost: summary.estimated_api_input_cost,
  estimatedApiOutputCost: summary.estimated_api_output_cost,
  estimatedApiTotalCost: summary.estimated_api_total_cost,
  currency: summary.currency,
  apiCostStatus: summary.api_cost_status,
  latestContextInputTokens: summary.latest_context_input_tokens,
  effectiveContextBudgetTokens: summary.effective_context_budget_tokens,
  contextPressurePercent: summary.context_pressure_percent,
  latestModelProvider: summary.latest_model_provider,
  latestModelIdentifier: summary.latest_model_identifier,
  latestRuntimeKind: summary.latest_runtime_kind,
  eventCount: summary.event_count,
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

  @Field(() => Float, { nullable: true })
  promptCost?: number | null;

  @Field(() => Float, { nullable: true })
  assistantCost?: number | null;

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
  promptCost: stats.promptTokenCost,
  assistantCost: stats.assistantTokenCost,
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
