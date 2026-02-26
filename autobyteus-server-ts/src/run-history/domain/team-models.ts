export const TEAM_RUN_HISTORY_INDEX_VERSION = 1;

export type TeamRunKnownStatus = "ACTIVE" | "IDLE" | "ERROR";

export type TeamRunDeleteLifecycle = "READY" | "CLEANUP_PENDING";

export interface TeamRunMemberBinding {
  memberRouteKey: string;
  memberName: string;
  memberAgentId: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
  hostNodeId: string | null;
}

export interface TeamRunManifest {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  runVersion: number;
  createdAt: string;
  updatedAt: string;
  memberBindings: TeamRunMemberBinding[];
}

export interface TeamMemberRunManifest {
  version: number;
  teamRunId: string;
  runVersion: number;
  memberRouteKey: string;
  memberName: string;
  memberAgentId: string;
  hostNodeId: string | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
  lastKnownStatus: TeamRunKnownStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRunIndexRow {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  deleteLifecycle: TeamRunDeleteLifecycle;
}

export interface TeamRunIndexFile {
  version: number;
  rows: TeamRunIndexRow[];
}

export interface TeamRunMemberHistoryItem {
  memberRouteKey: string;
  memberName: string;
  memberAgentId: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
  hostNodeId: string | null;
}

export interface TeamRunHistoryItem {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  deleteLifecycle: TeamRunDeleteLifecycle;
  isActive: boolean;
  members: TeamRunMemberHistoryItem[];
}
