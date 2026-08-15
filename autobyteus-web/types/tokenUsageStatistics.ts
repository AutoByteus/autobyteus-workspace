import type { TokenUsageApiCostStatus, TokenUsageCacheState } from '~/types/tokenUsageMeter';

export type TokenUsageCreatedTimeSource = 'RUN_HISTORY' | 'FIRST_USAGE_OBSERVED';
export type TokenUsageTaskRowKind = 'TEAM_RUN' | 'AGENT_RUN' | 'MEMBER_RUN' | 'TASK_TEAM_RUN' | 'TASK_AGENT_RUN';

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

export interface TokenUsageTaskStatisticsRow {
  rowId: string;
  rowKind: TokenUsageTaskRowKind;
  runId: string | null;
  taskId: string | null;
  rootTeamRunId: string | null;
  displayName: string;
  summary: string | null;
  createdAt: string;
  createdTimeSource: TokenUsageCreatedTimeSource;
  models: string[];
  modelDisplayNames: string[];
  runtimeKinds: string[];
  aggregate: TokenUsageCostSummaryAggregate;
  children: TokenUsageTaskStatisticsRow[];
}

export interface TokenUsageRuntimeModelStatisticsRow {
  rowId: string;
  runtimeKind: string;
  llmModel: string;
  modelDisplayName: string;
  aggregate: TokenUsageCostSummaryAggregate;
}

export type TokenUsageTaskSortKey = 'createdAt' | 'totalCost' | 'input' | 'output' | 'runtime' | 'task';
export type TokenUsageSortDirection = 'asc' | 'desc';

export interface TokenUsageCostAggregate {
  amount: number | null;
  currency: string | null;
  status: TokenUsageApiCostStatus;
}
