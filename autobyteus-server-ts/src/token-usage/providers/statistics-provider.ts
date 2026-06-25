import { TokenUsageStats } from "../domain/models.js";
import { TokenUsageLedgerStore } from "./token-usage-ledger-store.js";
import type { TokenUsageApiCostStatus } from "../../agent-execution/domain/agent-run-token-usage.js";

const addNullableCost = (current: number | null, next: number | null): number | null => {
  if (current === null && next === null) return null;
  return (current ?? 0) + (next ?? 0);
};

const mergeCostStatus = (
  current: TokenUsageApiCostStatus,
  next: TokenUsageApiCostStatus,
  priorEventCount: number,
): TokenUsageApiCostStatus => {
  if (priorEventCount === 0) return next;
  return current === next ? current : "mixed";
};

const mergeCurrency = (
  current: string | null,
  next: string | null,
  priorEventCount: number,
): string | null => {
  if (!next) return current;
  if (priorEventCount === 0 || !current) return next;
  return current === next ? current : null;
};

export class TokenUsageStatisticsProvider {
  constructor(private readonly store = new TokenUsageLedgerStore()) {}

  async getTotalCost(startDate: Date, endDate: Date): Promise<number | null> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    return records.reduce(
      (total, record) => addNullableCost(total, record.estimated_api_total_cost),
      null as number | null,
    );
  }

  async getStatisticsPerModel(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, TokenUsageStats>> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    const statsByModel = new Map<string, TokenUsageStats>();

    for (const record of records) {
      const modelKey = record.model_identifier ?? record.model_value ?? "unknown";
      const current = statsByModel.get(modelKey) ?? new TokenUsageStats();
      current.promptTokens += record.accounting_input_tokens ?? 0;
      current.assistantTokens += record.accounting_output_tokens ?? 0;
      current.promptTokenCost = addNullableCost(current.promptTokenCost, record.estimated_api_input_cost);
      current.assistantTokenCost = addNullableCost(current.assistantTokenCost, record.estimated_api_output_cost);
      current.totalCost = addNullableCost(current.totalCost, record.estimated_api_total_cost);
      current.currency = mergeCurrency(current.currency, record.currency, current.eventCount);
      current.apiCostStatus = mergeCostStatus(current.apiCostStatus, record.api_cost_status, current.eventCount);
      current.eventCount += 1;
      statsByModel.set(modelKey, current);
    }

    return Object.fromEntries(statsByModel.entries());
  }
}
