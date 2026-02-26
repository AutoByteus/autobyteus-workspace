import { Arg, Field, Float, Int, ObjectType, Query, Resolver } from "type-graphql";
import { TokenUsageStatisticsProvider } from "../../../token-usage/providers/statistics-provider.js";
import type { TokenUsageStats } from "../../../token-usage/domain/models.js";

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
}

const toUsageStatistics = (model: string, stats: TokenUsageStats): UsageStatistics => ({
  llmModel: model,
  promptTokens: stats.promptTokens,
  assistantTokens: stats.assistantTokens,
  promptCost: stats.promptTokenCost,
  assistantCost: stats.assistantTokenCost,
  totalCost: stats.totalCost,
});

@Resolver()
export class TokenUsageStatisticsResolver {
  @Query(() => Float)
  async totalCostInPeriod(
    @Arg("startTime", () => Date) startTime: Date,
    @Arg("endTime", () => Date) endTime: Date,
  ): Promise<number> {
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
}
