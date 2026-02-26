import { TokenUsageStats } from "../domain/models.js";
import { PersistenceProxy } from "./persistence-proxy.js";

export class TokenUsageStatisticsProvider {
  private proxy: PersistenceProxy;

  constructor() {
    this.proxy = new PersistenceProxy();
  }

  async getTotalCost(startDate: Date, endDate: Date): Promise<number> {
    return this.proxy.getTotalCostInPeriod(startDate, endDate);
  }

  async getStatisticsPerModel(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, TokenUsageStats>> {
    const records = await this.proxy.getUsageRecordsInPeriod(startDate, endDate);
    const statsByModel = new Map<string, TokenUsageStats>();

    for (const record of records) {
      const modelKey = record.llmModel ?? "unknown";
      const current = statsByModel.get(modelKey) ?? new TokenUsageStats();

      if (record.role === "user") {
        current.promptTokens += record.tokenCount;
        current.promptTokenCost += record.cost;
      } else if (record.role === "assistant") {
        current.assistantTokens += record.tokenCount;
        current.assistantTokenCost += record.cost;
      }

      current.totalCost += record.cost;
      statsByModel.set(modelKey, current);
    }

    return Object.fromEntries(statsByModel.entries());
  }
}
