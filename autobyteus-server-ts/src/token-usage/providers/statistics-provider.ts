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
import {
  buildTokenUsageModelDisplayEntries,
  EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT,
  type TokenUsageModelDisplayContext,
} from "../projections/token-usage-model-display-projection.js";
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from "../../llm-management/llm-providers/stores/custom-llm-provider-store.js";
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
    private readonly customProviderStore: Pick<CustomLlmProviderStore, "listProviders"> = getCustomLlmProviderStore(),
  ) {}

  private async loadDisplayContext(events: TokenUsageUpdatedPayload[]): Promise<TokenUsageModelDisplayContext> {
    const requiresLegacyProviderLookup = events.some((event) => (
      normalizeTokenUsageRuntimeKind(event.runtime_kind).trim().toLowerCase() === "autobyteus" &&
      !event.provider_name?.trim()
    ));
    if (!requiresLegacyProviderLookup) return EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT;

    try {
      const providers = await this.customProviderStore.listProviders();
      return {
        customProviderNames: new Map(
          providers.map((provider) => [provider.id, provider.name] as const),
        ),
        providerMapLoadFailed: false,
      };
    } catch {
      return {
        ...EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT,
        providerMapLoadFailed: true,
      };
    }
  }

  async getTotalCost(startDate: Date, endDate: Date): Promise<number | null> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    return buildTokenUsageCostSummaryAggregate(records).estimated_api_total_cost;
  }

  async getTaskStatisticsInPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<TokenUsageTaskStatisticsResult> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    const displayContext = await this.loadDisplayContext(records);
    return { rows: this.taskTreeBuilder.buildRows(records, displayContext) };
  }

  async getStatisticsPerRuntimeModel(
    startDate: Date,
    endDate: Date,
  ): Promise<TokenUsageRuntimeModelStatisticsRow[]> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    const displayContext = await this.loadDisplayContext(records);
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
        modelDisplayName: this.resolveModelDisplayName(events, displayContext),
        aggregate: buildTokenUsageCostSummaryAggregate(events),
      };
    }).sort((a, b) => (
      (b.aggregate.estimated_api_total_cost ?? -1) - (a.aggregate.estimated_api_total_cost ?? -1) ||
      a.runtimeKind.localeCompare(b.runtimeKind) ||
      a.modelIdentifier.localeCompare(b.modelIdentifier)
    ));
  }

  private resolveModelDisplayName(
    events: TokenUsageUpdatedPayload[],
    displayContext: TokenUsageModelDisplayContext,
  ): string {
    return buildTokenUsageModelDisplayEntries(events, displayContext)[0]?.modelDisplayName ?? "Unknown";
  }
}
