import type { TokenUsageApiCostStatus } from '~/types/tokenUsageMeter';

export type TokenUsageCreatedTimeSource = 'RUN_HISTORY' | 'FIRST_USAGE_OBSERVED';
export type TokenUsageTaskRowKind = 'TEAM_RUN' | 'AGENT_RUN' | 'MEMBER_RUN' | 'TASK_TEAM_RUN' | 'TASK_AGENT_RUN';

export type { TokenUsageCostSummaryAggregate } from '~/types/tokenUsageCostSummary';
import type { TokenUsageCostSummaryAggregate } from '~/types/tokenUsageCostSummary';

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
