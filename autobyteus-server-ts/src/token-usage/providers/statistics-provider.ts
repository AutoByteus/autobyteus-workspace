import type {
  TokenUsageRuntimeModelStatisticsRow,
  TokenUsageTaskStatisticsResult,
} from "../domain/statistics-models.js";
import {
  buildTokenUsageCostSummaryAggregate,
  normalizeTokenUsageModelIdentifier,
  normalizeTokenUsageRuntimeKind,
} from "../projections/token-usage-cost-summary-aggregate.js";
import { TokenUsageTaskStatisticsTreeBuilder } from "./task-statistics-tree-builder.js";
import { TokenUsageLedgerStore } from "./token-usage-ledger-store.js";
import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";

type EventGroups = Map<string, TokenUsageUpdatedPayload[]>;

const pushGroupedEvent = (
  groups: EventGroups,
  key: string,
  event: TokenUsageUpdatedPayload,
): void => {
  const events = groups.get(key) ?? [];
  events.push(event);
  groups.set(key, events);
};

export class TokenUsageStatisticsProvider {
  constructor(
    private readonly store = new TokenUsageLedgerStore(),
    private readonly taskTreeBuilder = new TokenUsageTaskStatisticsTreeBuilder(),
  ) {}

  async getTotalCost(startDate: Date, endDate: Date): Promise<number | null> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    return buildTokenUsageCostSummaryAggregate(records).estimated_api_total_cost;
  }

  async getTaskStatisticsInPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<TokenUsageTaskStatisticsResult> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    return { rows: this.taskTreeBuilder.buildRows(records) };
  }

  async getStatisticsPerRuntimeModel(
    startDate: Date,
    endDate: Date,
  ): Promise<TokenUsageRuntimeModelStatisticsRow[]> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    const groups: EventGroups = new Map();

    for (const record of records) {
      const runtimeKind = normalizeTokenUsageRuntimeKind(record.runtime_kind);
      const modelIdentifier = normalizeTokenUsageModelIdentifier(record);
      pushGroupedEvent(groups, `${runtimeKind}\u0000${modelIdentifier}`, record);
    }

    return Array.from(groups.entries()).map(([key, events]) => {
      const [runtimeKind = "Unknown", modelIdentifier = "Unknown"] = key.split("\u0000");
      return {
        rowId: `runtime-model:${runtimeKind}:${modelIdentifier}`,
        runtimeKind,
        modelIdentifier,
        aggregate: buildTokenUsageCostSummaryAggregate(events),
      };
    }).sort((a, b) => (
      (b.aggregate.estimated_api_total_cost ?? -1) - (a.aggregate.estimated_api_total_cost ?? -1) ||
      a.runtimeKind.localeCompare(b.runtimeKind) ||
      a.modelIdentifier.localeCompare(b.modelIdentifier)
    ));
  }
}
