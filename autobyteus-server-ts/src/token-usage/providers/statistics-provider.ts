import type {
  TokenUsageRuntimeModelStatisticsRow,
  TokenUsageTaskStatisticsResult,
} from "../domain/statistics-models.js";
import type { TokenUsageRunRecord } from "../domain/token-usage-run-record.js";
import { distinctValueLabel } from "../domain/token-usage-distinct-value-summary.js";
import { buildTokenUsageRunAggregate } from "../projections/token-usage-run-aggregate.js";
import { TokenUsageTaskStatisticsTreeBuilder } from "./task-statistics-tree-builder.js";
import { TokenUsageRunStore } from "./token-usage-run-store.js";
import {
  EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT,
  resolveTokenUsageModelDisplayName,
  type TokenUsageModelDisplayContext,
} from "../projections/token-usage-model-display-projection.js";
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from "../../llm-management/llm-providers/stores/custom-llm-provider-store.js";

type RecordGroups = Map<string, TokenUsageRunRecord[]>;
const label = (record: TokenUsageRunRecord, field: "runtimeKinds" | "modelIdentifiers"): string =>
  distinctValueLabel(record.identitySummary[field]);
const modelLabel = (record: TokenUsageRunRecord): string => record.identitySummary.modelIdentifiers.status === "unknown"
  ? distinctValueLabel(record.identitySummary.modelValues)
  : label(record, "modelIdentifiers");
const displayIdentity = (record: TokenUsageRunRecord) => ({
  runtime_kind: label(record, "runtimeKinds"),
  model_provider: record.identitySummary.modelProviders.status === "single"
    ? record.identitySummary.modelProviders.value : null,
  provider_name: record.identitySummary.providerNames.status === "single"
    ? record.identitySummary.providerNames.value : null,
  model_identifier: modelLabel(record),
  model_value: record.identitySummary.modelValues.status === "single"
    ? record.identitySummary.modelValues.value : null,
});

export class TokenUsageStatisticsProvider {
  constructor(
    private readonly store = new TokenUsageRunStore(),
    private readonly taskTreeBuilder = new TokenUsageTaskStatisticsTreeBuilder(),
    private readonly customProviderStore: Pick<CustomLlmProviderStore, "listProviders"> = getCustomLlmProviderStore(),
  ) {}

  private async loadDisplayContext(records: TokenUsageRunRecord[]): Promise<TokenUsageModelDisplayContext> {
    const needsProviderLookup = records.some((record) => {
      const identity = displayIdentity(record);
      return identity.runtime_kind.trim().toLowerCase() === "autobyteus" && !identity.provider_name?.trim();
    });
    if (!needsProviderLookup) return EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT;
    try {
      const providers = await this.customProviderStore.listProviders();
      return {
        customProviderNames: new Map(providers.map((provider) => [provider.id, provider.name] as const)),
        providerMapLoadFailed: false,
      };
    } catch {
      return { ...EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT, providerMapLoadFailed: true };
    }
  }

  async getTotalCost(startDate: Date, endDate: Date): Promise<number | null> {
    const records = await this.store.listRunsCreatedInRange(startDate, endDate);
    return buildTokenUsageRunAggregate(records).estimated_api_total_cost;
  }

  async getTaskStatisticsInPeriod(startDate: Date, endDate: Date): Promise<TokenUsageTaskStatisticsResult> {
    const records = await this.store.listRunsCreatedInRange(startDate, endDate);
    return { rows: this.taskTreeBuilder.buildRows(records, await this.loadDisplayContext(records)) };
  }

  async getStatisticsPerRuntimeModel(startDate: Date, endDate: Date): Promise<TokenUsageRuntimeModelStatisticsRow[]> {
    const records = await this.store.listRunsCreatedInRange(startDate, endDate);
    const displayContext = await this.loadDisplayContext(records);
    const groups: RecordGroups = new Map();
    for (const record of records) {
      const key = `${label(record, "runtimeKinds")}\u0000${modelLabel(record)}`;
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    return [...groups.entries()].map(([key, rows]) => {
      const [runtimeKind = "Unknown", modelIdentifier = "Unknown"] = key.split("\u0000");
      const identities = rows.map(displayIdentity);
      const identity = identities.every((candidate) => JSON.stringify(candidate) === JSON.stringify(identities[0]))
        ? identities[0] ?? null
        : null;
      return {
        rowId: `runtime-model:${runtimeKind}:${modelIdentifier}`,
        runtimeKind,
        modelIdentifier,
        modelDisplayName: identity
          ? resolveTokenUsageModelDisplayName(identity, displayContext)
          : modelIdentifier,
        aggregate: buildTokenUsageRunAggregate(rows),
      };
    }).sort((left, right) =>
      (right.aggregate.estimated_api_total_cost ?? -1) - (left.aggregate.estimated_api_total_cost ?? -1) ||
      left.runtimeKind.localeCompare(right.runtimeKind) ||
      left.modelIdentifier.localeCompare(right.modelIdentifier));
  }
}
