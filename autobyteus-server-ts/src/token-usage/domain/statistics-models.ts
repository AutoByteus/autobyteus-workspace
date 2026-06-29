import type { TokenUsageCostSummaryAggregate } from "../projections/token-usage-cost-summary-aggregate.js";

export type TokenUsageCreatedTimeSource = "RUN_HISTORY" | "FIRST_USAGE_OBSERVED";
export type TokenUsageTaskStatisticsRowKind = "TEAM_RUN" | "AGENT_RUN";

export interface TokenUsageTaskRowDisplayMetadata {
  displayName: string;
  summary: string | null;
  workspaceName: string | null;
  workspaceRootPath: string | null;
  createdAt: string;
  createdTimeSource: TokenUsageCreatedTimeSource;
}

export interface TokenUsageTaskMemberStatisticsRow {
  rowId: string;
  memberRouteKey: string | null;
  memberAgentRunId: string | null;
  memberName: string;
  memberPath: string[];
  agentDefinitionId: string | null;
  createdAt: string;
  createdTimeSource: TokenUsageCreatedTimeSource;
  models: string[];
  runtimeKinds: string[];
  aggregate: TokenUsageCostSummaryAggregate;
}

export interface TokenUsageTaskStatisticsRow extends TokenUsageTaskRowDisplayMetadata {
  rowId: string;
  rowKind: TokenUsageTaskStatisticsRowKind;
  runId: string | null;
  rootTeamRunId: string | null;
  models: string[];
  runtimeKinds: string[];
  aggregate: TokenUsageCostSummaryAggregate;
  members: TokenUsageTaskMemberStatisticsRow[];
}

export interface TokenUsageTaskStatisticsResult {
  rows: TokenUsageTaskStatisticsRow[];
}

export interface TokenUsageRuntimeModelStatisticsRow {
  rowId: string;
  runtimeKind: string;
  modelIdentifier: string;
  aggregate: TokenUsageCostSummaryAggregate;
}
