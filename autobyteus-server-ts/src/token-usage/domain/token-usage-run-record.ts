import type { TokenUsageApiCostStatus, TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type { CacheState } from "./token-usage-component-basis.js";
import type { DistinctValueSummary } from "./token-usage-distinct-value-summary.js";
import type { TokenUsageCostTotals, TokenUsagePricingSummary, TokenUsageTokenTotals } from "./token-usage-accounting-summary.js";
import type {
  AdmissionMarker,
  RecentTokenUsageIdentityDigest,
  SnapshotSeriesCheckpoint,
} from "./token-usage-snapshot-checkpoint.js";

export interface TokenUsageIdentitySummary {
  runtimeKinds: DistinctValueSummary<string>;
  modelProviders: DistinctValueSummary<string>;
  providerNames: DistinctValueSummary<string>;
  modelIdentifiers: DistinctValueSummary<string>;
  modelValues: DistinctValueSummary<string>;
  rootTeamRunIds: DistinctValueSummary<string>;
}

export interface TokenUsageRunRecord {
  runId: string;
  revision: bigint;
  persistedAt: Date;
  rootTeamRunId: string | null;
  rootAttributionStatus: "unknown" | "single" | "mixed";
  agentDefinitionId: string | null;
  workspaceId: string | null;
  taskId: string | null;
  teamName: string | null;
  agentName: string | null;
  runSummary: string | null;
  runCreatedAt: Date | null;
  memberDisplayName: string | null;
  firstObservedAt: Date;
  latestObservedAt: Date;
  latestObservation: AdmissionMarker;
  usageReportCount: bigint;
  tokenTotals: TokenUsageTokenTotals;
  costTotals: TokenUsageCostTotals;
  cacheState: CacheState;
  currency: string | null;
  apiCostStatus: TokenUsageApiCostStatus;
  pricingSummary: TokenUsagePricingSummary;
  qualityFlags: string[];
  latestRuntimeKind: string | null;
  latestModelProvider: string | null;
  latestProviderName: string | null;
  latestModelIdentifier: string | null;
  latestModelValue: string | null;
  identitySummary: TokenUsageIdentitySummary;
  latestPromptTokens: bigint | null;
  effectiveContextWindowTokens: bigint | null;
  contextWindowUsagePercent: number | null;
  snapshotSeriesState: SnapshotSeriesCheckpoint[];
  recentIdempotencyDigests: RecentTokenUsageIdentityDigest[];
}

export type TokenUsageFoldObservation = Readonly<{
  payload: TokenUsageUpdatedPayload;
}>;
