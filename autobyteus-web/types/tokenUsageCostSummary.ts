import type { TokenUsageApiCostStatus, TokenUsageCacheState } from '~/types/tokenUsageMeter';

export interface TokenUsageCostSummaryAggregate {
  grossInputTokens: number;
  standardInputTokens: number;
  cacheMissInputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  cacheCreation5mInputTokens: number;
  cacheCreation1hInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  billableOutputTokens: number;
  totalTokens: number;
  cacheReadInputTokenRate: number | null;
  standardInputTokenRate: number | null;
  cacheCreationInputTokenRate: number | null;
  cacheState: TokenUsageCacheState;
  estimatedApiInputCost: number | null;
  estimatedApiStandardInputCost: number | null;
  estimatedApiCacheReadInputCost: number | null;
  estimatedApiCacheCreationInputCost: number | null;
  estimatedApiCacheCreation5mInputCost: number | null;
  estimatedApiCacheCreation1hInputCost: number | null;
  estimatedApiOutputCost: number | null;
  estimatedApiReasoningOutputCost: number | null;
  estimatedApiTotalCost: number | null;
  currency: string | null;
  apiCostStatus: TokenUsageApiCostStatus;
  missingPriceDimensions: string[];
  pricingPolicyKey: string | null;
  selectedPricingTierId: string | null;
  usageReportCount: number;
  updatedAt: string | null;
  observedRuntimeKinds: string[];
  observedModelIdentifiers: string[];
  observedModelProviders: string[];
}
