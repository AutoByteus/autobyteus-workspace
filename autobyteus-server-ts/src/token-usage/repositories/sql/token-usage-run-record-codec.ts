import {
  Prisma,
  type TokenUsageRunRecord as PrismaTokenUsageRunRecord,
} from "@prisma/client";
import { isCacheState, type CacheState } from "../../domain/token-usage-component-basis.js";
import {
  TOKEN_USAGE_COST_FIELDS,
  TOKEN_USAGE_TOKEN_FIELDS,
} from "../../domain/token-usage-accounting-summary.js";
import type { TokenUsageRunRecord } from "../../domain/token-usage-run-record.js";
import {
  decodeRecentIdempotencyDigests,
  decodeSnapshotSeriesState,
  encodeRecentIdempotencyDigests,
  encodeSnapshotSeriesState,
} from "./token-usage-compact-state-codec.js";
import {
  decodeTokenUsageIdentitySummary,
  decodeTokenUsagePricingSummary,
  normalizeTokenUsageQualityFlags,
} from "./token-usage-run-summary-codec.js";

export { normalizeTokenUsageQualityFlags } from "./token-usage-run-summary-codec.js";

const toPrismaField = (field: string): string =>
  field.replace(/_([a-z0-9])/g, (_match, character: string) => character.toUpperCase());

export const toPrismaTokenUsageRunRecordData = (
  record: TokenUsageRunRecord,
): Prisma.TokenUsageRunRecordUncheckedCreateInput => ({
  runId: record.runId,
  revision: record.revision,
  persistedAt: record.persistedAt,
  rootTeamRunId: record.rootTeamRunId,
  rootAttributionStatus: record.rootAttributionStatus,
  agentDefinitionId: record.agentDefinitionId,
  workspaceId: record.workspaceId,
  taskId: record.taskId,
  teamName: record.teamName,
  agentName: record.agentName,
  runSummary: record.runSummary,
  runCreatedAt: record.runCreatedAt,
  memberDisplayName: record.memberDisplayName,
  firstObservedAt: record.firstObservedAt,
  latestObservedAt: record.latestObservedAt,
  latestObservationGeneration: record.latestObservation.generation,
  latestObservationOrdinal: record.latestObservation.ordinal,
  usageReportCount: record.usageReportCount,
  ...Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [toPrismaField(field), record.tokenTotals[field]])),
  ...Object.fromEntries(TOKEN_USAGE_COST_FIELDS.map((field) => [toPrismaField(field), record.costTotals[field]])),
  cacheState: record.cacheState,
  currency: record.currency,
  apiCostStatus: record.apiCostStatus,
  pricingSummaryJson: JSON.stringify(record.pricingSummary),
  qualityFlagsJson: JSON.stringify(normalizeTokenUsageQualityFlags(record.qualityFlags)),
  latestRuntimeKind: record.latestRuntimeKind,
  latestModelProvider: record.latestModelProvider,
  latestProviderName: record.latestProviderName,
  latestModelIdentifier: record.latestModelIdentifier,
  latestModelValue: record.latestModelValue,
  identitySummaryJson: JSON.stringify(record.identitySummary),
  latestPromptTokens: record.latestPromptTokens,
  effectiveContextWindowTokens: record.effectiveContextWindowTokens,
  contextWindowUsagePercent: record.contextWindowUsagePercent,
  snapshotSeriesStateJson: encodeSnapshotSeriesState(record.snapshotSeriesState),
  recentIdempotencyDigestsJson: encodeRecentIdempotencyDigests(record.recentIdempotencyDigests),
});

export const fromPrismaTokenUsageRunRecord = (
  record: PrismaTokenUsageRunRecord,
): TokenUsageRunRecord => {
  const cacheState: CacheState = isCacheState(record.cacheState) ? record.cacheState : "unknown";
  const apiCostStatus = ["estimated", "price_missing", "partial_price_missing", "mixed", "local_no_api_bill"].includes(record.apiCostStatus)
    ? record.apiCostStatus as TokenUsageRunRecord["apiCostStatus"]
    : "price_missing";
  const qualityParsed = JSON.parse(record.qualityFlagsJson) as unknown;
  return {
    runId: record.runId,
    revision: record.revision,
    persistedAt: record.persistedAt,
    rootTeamRunId: record.rootTeamRunId,
    rootAttributionStatus: record.rootAttributionStatus === "single" || record.rootAttributionStatus === "mixed"
      ? record.rootAttributionStatus
      : "unknown",
    agentDefinitionId: record.agentDefinitionId,
    workspaceId: record.workspaceId,
    taskId: record.taskId,
    teamName: record.teamName,
    agentName: record.agentName,
    runSummary: record.runSummary,
    runCreatedAt: record.runCreatedAt,
    memberDisplayName: record.memberDisplayName,
    firstObservedAt: record.firstObservedAt,
    latestObservedAt: record.latestObservedAt,
    latestObservation: {
      observedAt: record.latestObservedAt.toISOString(),
      generation: record.latestObservationGeneration === 0 ? 0 : 1,
      ordinal: record.latestObservationOrdinal,
    },
    usageReportCount: record.usageReportCount,
    tokenTotals: Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [
      field,
      record[toPrismaField(field) as keyof PrismaTokenUsageRunRecord] as bigint,
    ])) as TokenUsageRunRecord["tokenTotals"],
    costTotals: Object.fromEntries(TOKEN_USAGE_COST_FIELDS.map((field) => [
      field,
      record[toPrismaField(field) as keyof PrismaTokenUsageRunRecord] as number | null,
    ])) as TokenUsageRunRecord["costTotals"],
    cacheState,
    currency: record.currency,
    apiCostStatus,
    pricingSummary: decodeTokenUsagePricingSummary(record.pricingSummaryJson),
    qualityFlags: normalizeTokenUsageQualityFlags(Array.isArray(qualityParsed)
      ? qualityParsed.filter((item): item is string => typeof item === "string")
      : []),
    latestRuntimeKind: record.latestRuntimeKind,
    latestModelProvider: record.latestModelProvider,
    latestProviderName: record.latestProviderName,
    latestModelIdentifier: record.latestModelIdentifier,
    latestModelValue: record.latestModelValue,
    identitySummary: decodeTokenUsageIdentitySummary(record.identitySummaryJson),
    latestPromptTokens: record.latestPromptTokens,
    effectiveContextWindowTokens: record.effectiveContextWindowTokens,
    contextWindowUsagePercent: record.contextWindowUsagePercent,
    snapshotSeriesState: decodeSnapshotSeriesState(record.snapshotSeriesStateJson),
    recentIdempotencyDigests: decodeRecentIdempotencyDigests(record.recentIdempotencyDigestsJson),
  };
};
