import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";

export const TEAM_RUN_HISTORY_INDEX_VERSION = 1;

export type TeamRunKnownStatus = "ACTIVE" | "IDLE" | "ERROR";

export type TeamRunDeleteLifecycle = "READY" | "CLEANUP_PENDING";

export interface TeamRunMemberBinding {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  runtimeReference: TeamMemberRuntimeReference | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
}

export interface TeamMemberRuntimeReference {
  runtimeKind: RuntimeKind;
  sessionId: string | null;
  threadId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface TeamRunManifest {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string | null;
  coordinatorMemberRouteKey: string;
  runVersion: number;
  createdAt: string;
  updatedAt: string;
  memberBindings: TeamRunMemberBinding[];
}

export interface TeamRunIndexRow {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string | null;
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
  memberRunId: string;
  runtimeKind: RuntimeKind;
  runtimeReference: TeamMemberRuntimeReference | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
}

export interface TeamRunHistoryItem {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  deleteLifecycle: TeamRunDeleteLifecycle;
  isActive: boolean;
  members: TeamRunMemberHistoryItem[];
}

export interface TeamMemberRunManifest {
  version: number;
  teamRunId: string;
  runVersion: number;
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  runtimeReference: TeamMemberRuntimeReference | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
  lastKnownStatus: TeamRunKnownStatus;
  createdAt: string;
  updatedAt: string;
}
