import type {
  TokenUsageApiCostStatus,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import { summarizeCacheState } from "../domain/token-usage-component-basis.js";
import {
  distinctValueOrNull,
  mergeDistinctValueWith,
  unknownDistinctValue,
} from "../domain/token-usage-distinct-value-summary.js";
import {
  TOKEN_USAGE_COST_FIELDS,
  TOKEN_USAGE_TOKEN_FIELDS,
  type TokenUsageCostTotals,
  type TokenUsageTokenTotals,
} from "../domain/token-usage-accounting-summary.js";
import type { TokenUsageIdentitySummary, TokenUsageRunRecord } from "../domain/token-usage-run-record.js";
import {
  compareAdmissionMarkers,
  type AdmissionMarker,
} from "../domain/token-usage-snapshot-checkpoint.js";
import {
  emptyTokenUsagePricingSummary,
  mergeTokenUsagePricingSummaries,
  pricingSummaryFromPayload,
} from "./token-usage-pricing-summary.js";

const nullableDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const nullableBigInt = (value: number | null, field: string): bigint | null => {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Token usage field '${field}' is outside JavaScript SafeInt.`);
  }
  return BigInt(value);
};
const nonNegativeBigInt = (value: number | null, field: string): bigint => nullableBigInt(value, field) ?? 0n;
const addCost = (left: number | null, right: number | null): number | null => {
  if (left === null && right === null) return null;
  const result = (left ?? 0) + (right ?? 0);
  if (!Number.isFinite(result)) throw new Error("Token usage cumulative cost is not finite.");
  return result;
};
const firstNonblank = (current: string | null, next: string | null): string | null =>
  current ?? (next?.trim() || null);
const summarizeAdmittedCacheState = (
  record: Pick<TokenUsageRunRecord, "cacheState" | "usageReportCount">,
  next: TokenUsageUpdatedPayload["cache_state"],
): TokenUsageUpdatedPayload["cache_state"] => record.usageReportCount === 0n
  ? next
  : summarizeCacheState([record.cacheState, next]);

export const emptyTokenUsageTokenTotals = (): TokenUsageTokenTotals => Object.fromEntries(
  TOKEN_USAGE_TOKEN_FIELDS.map((field) => [field, 0n]),
) as TokenUsageTokenTotals;

export const emptyTokenUsageCostTotals = (): TokenUsageCostTotals => Object.fromEntries(
  TOKEN_USAGE_COST_FIELDS.map((field) => [field, null]),
) as TokenUsageCostTotals;

export const emptyTokenUsageIdentitySummary = (): TokenUsageIdentitySummary => ({
  runtimeKinds: unknownDistinctValue(),
  modelProviders: unknownDistinctValue(),
  providerNames: unknownDistinctValue(),
  modelIdentifiers: unknownDistinctValue(),
  modelValues: unknownDistinctValue(),
  rootTeamRunIds: unknownDistinctValue(),
});

export const createEmptyRunRecord = (
  payload: TokenUsageUpdatedPayload,
  marker: AdmissionMarker,
): TokenUsageRunRecord => {
  const observedAt = new Date(marker.observedAt);
  if (Number.isNaN(observedAt.getTime())) throw new Error("Token usage observation time is invalid.");
  return {
    runId: payload.run_id,
    revision: 0n,
    persistedAt: new Date(),
    rootTeamRunId: null,
    rootAttributionStatus: "unknown",
    agentDefinitionId: payload.agent_definition_id,
    workspaceId: payload.workspace_id,
    taskId: payload.task_id,
    teamName: payload.team_name,
    agentName: payload.agent_name,
    runSummary: payload.run_summary,
    runCreatedAt: nullableDate(payload.run_created_at),
    memberDisplayName: payload.member_display_name,
    firstObservedAt: observedAt,
    latestObservedAt: observedAt,
    latestObservation: marker,
    usageReportCount: 0n,
    tokenTotals: emptyTokenUsageTokenTotals(),
    costTotals: emptyTokenUsageCostTotals(),
    cacheState: "unknown",
    currency: null,
    apiCostStatus: "price_missing",
    pricingSummary: emptyTokenUsagePricingSummary(),
    qualityFlags: [],
    latestRuntimeKind: null,
    latestModelProvider: null,
    latestProviderName: null,
    latestModelIdentifier: null,
    latestModelValue: null,
    identitySummary: emptyTokenUsageIdentitySummary(),
    latestPromptTokens: null,
    effectiveContextWindowTokens: null,
    contextWindowUsagePercent: null,
    snapshotSeriesState: [],
    recentIdempotencyDigests: [],
  };
};

export const applyTokenUsageContribution = (input: {
  record: TokenUsageRunRecord;
  payload: TokenUsageUpdatedPayload;
  marker: AdmissionMarker;
  incrementReport: boolean;
  incrementRevision: boolean;
}): TokenUsageRunRecord => {
  const { record, payload, marker } = input;
  const isLatest = compareAdmissionMarkers(marker, record.latestObservation) >= 0;
  const identitySummary: TokenUsageIdentitySummary = {
    runtimeKinds: mergeDistinctValueWith(record.identitySummary.runtimeKinds, payload.runtime_kind),
    modelProviders: mergeDistinctValueWith(record.identitySummary.modelProviders, payload.model_provider),
    providerNames: mergeDistinctValueWith(record.identitySummary.providerNames, payload.provider_name),
    modelIdentifiers: mergeDistinctValueWith(record.identitySummary.modelIdentifiers, payload.model_identifier),
    modelValues: mergeDistinctValueWith(record.identitySummary.modelValues, payload.model_value),
    rootTeamRunIds: mergeDistinctValueWith(record.identitySummary.rootTeamRunIds, payload.root_team_run_id),
  };
  const pricingSummary = input.incrementReport
    ? mergeTokenUsagePricingSummaries(record.pricingSummary, pricingSummaryFromPayload(payload))
    : record.pricingSummary;
  const rootSummary = identitySummary.rootTeamRunIds;
  const nextDate = new Date(marker.observedAt);
  return {
    ...record,
    revision: record.revision + (input.incrementRevision ? 1n : 0n),
    persistedAt: new Date(),
    rootTeamRunId: distinctValueOrNull(rootSummary),
    rootAttributionStatus: rootSummary.status,
    agentDefinitionId: firstNonblank(record.agentDefinitionId, payload.agent_definition_id),
    workspaceId: firstNonblank(record.workspaceId, payload.workspace_id),
    taskId: firstNonblank(record.taskId, payload.task_id),
    teamName: firstNonblank(record.teamName, payload.team_name),
    agentName: firstNonblank(record.agentName, payload.agent_name),
    runSummary: firstNonblank(record.runSummary, payload.run_summary),
    runCreatedAt: record.runCreatedAt ?? nullableDate(payload.run_created_at),
    memberDisplayName: firstNonblank(record.memberDisplayName, payload.member_display_name),
    firstObservedAt: nextDate < record.firstObservedAt ? nextDate : record.firstObservedAt,
    latestObservedAt: isLatest ? nextDate : record.latestObservedAt,
    latestObservation: isLatest ? marker : record.latestObservation,
    usageReportCount: record.usageReportCount + (input.incrementReport ? 1n : 0n),
    tokenTotals: Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [
      field,
      record.tokenTotals[field] + (input.incrementReport ? nonNegativeBigInt(payload[field], field) : 0n),
    ])) as TokenUsageTokenTotals,
    costTotals: Object.fromEntries(TOKEN_USAGE_COST_FIELDS.map((field) => [
      field,
      input.incrementReport ? addCost(record.costTotals[field], payload[field]) : record.costTotals[field],
    ])) as TokenUsageCostTotals,
    cacheState: input.incrementReport
      ? summarizeAdmittedCacheState(record, payload.cache_state)
      : record.cacheState,
    currency: distinctValueOrNull(pricingSummary.currencies),
    apiCostStatus: (pricingSummary.apiCostStatuses.status === "single"
      ? pricingSummary.apiCostStatuses.value
      : pricingSummary.apiCostStatuses.status === "mixed" ? "mixed" : "price_missing") as TokenUsageApiCostStatus,
    pricingSummary,
    qualityFlags: [...new Set([...record.qualityFlags, ...payload.quality_flags])],
    latestRuntimeKind: isLatest ? payload.runtime_kind : record.latestRuntimeKind,
    latestModelProvider: isLatest ? payload.model_provider : record.latestModelProvider,
    latestProviderName: isLatest ? payload.provider_name : record.latestProviderName,
    latestModelIdentifier: isLatest ? payload.model_identifier : record.latestModelIdentifier,
    latestModelValue: isLatest ? payload.model_value : record.latestModelValue,
    identitySummary,
    latestPromptTokens: isLatest ? nullableBigInt(payload.latest_prompt_tokens, "latest_prompt_tokens") : record.latestPromptTokens,
    effectiveContextWindowTokens: isLatest
      ? nullableBigInt(payload.effective_context_window_tokens, "effective_context_window_tokens")
      : record.effectiveContextWindowTokens,
    contextWindowUsagePercent: isLatest ? payload.context_window_usage_percent : record.contextWindowUsagePercent,
  };
};
