import type { TokenUsageCostSummaryAggregate } from "../projections/token-usage-cost-summary-aggregate.js";
import type { TokenUsageExecutionAddress } from "./execution-address.js";

export type TokenUsageCreatedTimeSource = "RUN_HISTORY" | "FIRST_USAGE_OBSERVED";
export type TokenUsageTaskStatisticsRowKind =
  | "TEAM_RUN"
  | "AGENT_RUN"
  | "MEMBER_RUN"
  | "TASK_TEAM_RUN"
  | "TASK_AGENT_RUN";

export interface TokenUsageTaskRowDisplayMetadata {
  displayName: string;
  summary: string | null;
  createdAt: string;
  createdTimeSource: TokenUsageCreatedTimeSource;
}

export interface TokenUsageTaskStatisticsRow extends TokenUsageTaskRowDisplayMetadata {
  rowId: string;
  rowKind: TokenUsageTaskStatisticsRowKind;
  runId: string | null;
  taskId: string | null;
  executionAddress: TokenUsageExecutionAddress | null;
  models: string[];
  modelDisplayNames: string[];
  runtimeKinds: string[];
  aggregate: TokenUsageCostSummaryAggregate;
  children: TokenUsageTaskStatisticsRow[];
}

export interface TokenUsageTaskStatisticsResult {
  rows: TokenUsageTaskStatisticsRow[];
}

export interface TokenUsageRuntimeModelStatisticsRow {
  rowId: string;
  runtimeKind: string;
  modelIdentifier: string;
  modelDisplayName: string;
  aggregate: TokenUsageCostSummaryAggregate;
}
