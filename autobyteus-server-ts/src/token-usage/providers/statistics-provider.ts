import { TokenUsageStats } from "../domain/models.js";
import { TokenUsageLedgerStore } from "./token-usage-ledger-store.js";
import type {
  TokenUsageApiCostStatus,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";

const addNullableCost = (current: number | null, next: number | null): number | null => {
  if (current === null && next === null) return null;
  return (current ?? 0) + (next ?? 0);
};

const summarizeCostStatus = (events: TokenUsageUpdatedPayload[]): TokenUsageApiCostStatus => {
  if (events.length === 0) return "price_missing";
  const statuses = new Set(events.map((event) => event.api_cost_status));
  return statuses.size === 1 ? events[0]!.api_cost_status : "mixed";
};

const currencySummary = (events: TokenUsageUpdatedPayload[]): { currency: string | null; mixed: boolean } => {
  const currencies = Array.from(new Set(events.map((event) => event.currency).filter((value): value is string => Boolean(value))));
  if (currencies.length > 1) return { currency: null, mixed: true };
  return { currency: currencies[0] ?? null, mixed: false };
};

const sumCost = (
  events: TokenUsageUpdatedPayload[],
  select: (event: TokenUsageUpdatedPayload) => number | null,
): number | null => events.reduce((sum, event) => addNullableCost(sum, select(event)), null as number | null);

const groupByModel = (records: TokenUsageUpdatedPayload[]): Map<string, TokenUsageUpdatedPayload[]> => {
  const statsByModel = new Map<string, TokenUsageUpdatedPayload[]>();
  for (const record of records) {
    const modelKey = record.model_identifier ?? record.model_value ?? "unknown";
    const events = statsByModel.get(modelKey) ?? [];
    events.push(record);
    statsByModel.set(modelKey, events);
  }
  return statsByModel;
};

export class TokenUsageStatisticsProvider {
  constructor(private readonly store = new TokenUsageLedgerStore()) {}

  async getTotalCost(startDate: Date, endDate: Date): Promise<number | null> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    if (currencySummary(records).mixed) return null;
    return sumCost(records, (record) => record.estimated_api_total_cost);
  }

  async getStatisticsPerModel(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, TokenUsageStats>> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    const statsByModel = new Map<string, TokenUsageStats>();

    for (const [model, events] of groupByModel(records)) {
      const { currency, mixed } = currencySummary(events);
      statsByModel.set(model, new TokenUsageStats({
        promptTokens: events.reduce((sum, record) => sum + (record.accounting_input_tokens ?? 0), 0),
        assistantTokens: events.reduce((sum, record) => sum + (record.accounting_output_tokens ?? 0), 0),
        reasoningTokens: events.reduce((sum, record) => sum + (record.reasoning_output_tokens ?? 0), 0),
        promptTokenCost: mixed ? null : sumCost(events, (record) => record.estimated_api_input_cost),
        assistantTokenCost: mixed ? null : sumCost(events, (record) => record.estimated_api_output_cost),
        reasoningTokenCost: mixed ? null : sumCost(events, (record) => record.estimated_api_reasoning_output_cost),
        totalCost: mixed ? null : sumCost(events, (record) => record.estimated_api_total_cost),
        currency,
        apiCostStatus: mixed ? "mixed" : summarizeCostStatus(events),
        eventCount: events.length,
      }));
    }

    return Object.fromEntries(statsByModel.entries());
  }
}
