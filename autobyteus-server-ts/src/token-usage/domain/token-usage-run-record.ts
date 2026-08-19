import type {
  TokenUsageApiCostStatus,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import type { CacheState } from "./token-usage-component-basis.js";
import type { DistinctValueSummary } from "./token-usage-distinct-value-summary.js";
import type { TokenUsageUnitPrices } from "./token-usage-unit-price-summary.js";
import type {
  AdmissionMarker,
  RecentTokenUsageIdentityDigest,
  SnapshotSeriesCheckpoint,
} from "./token-usage-snapshot-checkpoint.js";

export const TOKEN_USAGE_TOKEN_FIELDS = [
  "accounting_input_tokens",
  "accounting_output_tokens",
  "accounting_total_tokens",
  "standard_input_tokens",
  "cache_miss_input_tokens",
  "cache_read_input_tokens",
  "cache_creation_input_tokens",
  "cache_creation_5m_input_tokens",
  "cache_creation_1h_input_tokens",
  "reasoning_output_tokens",
  "billable_input_tokens",
  "billable_output_tokens",
] as const;

export type TokenUsageTokenField = typeof TOKEN_USAGE_TOKEN_FIELDS[number];
export type TokenUsageTokenTotals = Record<TokenUsageTokenField, bigint>;

export const TOKEN_USAGE_COST_FIELDS = [
  "estimated_api_input_cost",
  "estimated_api_standard_input_cost",
  "estimated_api_cache_read_input_cost",
  "estimated_api_cache_creation_input_cost",
  "estimated_api_cache_creation_5m_input_cost",
  "estimated_api_cache_creation_1h_input_cost",
  "estimated_api_output_cost",
  "estimated_api_reasoning_output_cost",
  "estimated_api_total_cost",
] as const;

export type TokenUsageCostField = typeof TOKEN_USAGE_COST_FIELDS[number];
export type TokenUsageCostTotals = Record<TokenUsageCostField, number | null>;

export const TOKEN_USAGE_UNIT_PRICE_FIELDS = [
  "standard_input",
  "cache_read_input",
  "cache_creation_input",
  "cache_creation_5m_input",
  "cache_creation_1h_input",
  "output",
  "reasoning_output",
] as const;
export type TokenUsageUnitPriceField = typeof TOKEN_USAGE_UNIT_PRICE_FIELDS[number];

export interface TokenUsagePricingSummary {
  currencies: DistinctValueSummary<string>;
  apiCostStatuses: DistinctValueSummary<string>;
  pricingPolicyKeys: DistinctValueSummary<string>;
  selectedPricingTierIds: DistinctValueSummary<string>;
  missingPriceDimensions: string[];
  unitPrices: TokenUsageUnitPrices;
}

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
