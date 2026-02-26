import type { TokenUsageRecord } from "../domain/models.js";

export interface PersistenceProvider {
  createTokenUsageRecord(
    runId: string,
    role: string,
    tokenCount: number,
    cost: number,
    llmModel?: string | null,
  ): Promise<TokenUsageRecord>;

  getTotalCostInPeriod(startDate: Date, endDate: Date): Promise<number>;

  getUsageRecordsInPeriod(
    startDate: Date,
    endDate: Date,
    llmModel?: string | null,
  ): Promise<TokenUsageRecord[]>;
}
