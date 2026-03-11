import type { AgentRuntimeKind, SkillAccessMode } from '~/types/agent/AgentRunConfig';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation';

export type RunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR';

export interface RunHistoryItem {
  runId: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: RunKnownStatus;
  isActive: boolean;
}

export interface RunHistoryAgentGroup {
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl?: string | null;
  runs: RunHistoryItem[];
}

export interface RunHistoryWorkspaceGroup {
  workspaceRootPath: string;
  workspaceName: string;
  agents: RunHistoryAgentGroup[];
}

export interface RunEditableFieldFlags {
  llmModelIdentifier: boolean;
  llmConfig: boolean;
  autoExecuteTools: boolean;
  skillAccessMode: boolean;
  workspaceRootPath: boolean;
  runtimeKind: boolean;
}

export interface RunManifestConfigPayload {
  agentDefinitionId: string;
  workspaceRootPath: string;
  llmModelIdentifier: string;
  llmConfig?: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode?: SkillAccessMode | null;
  runtimeKind?: AgentRuntimeKind | null;
  runtimeReference?: {
    runtimeKind: string;
    sessionId?: string | null;
    threadId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
}

export interface RunResumeConfigPayload {
  runId: string;
  isActive: boolean;
  manifestConfig: RunManifestConfigPayload;
  editableFields: RunEditableFieldFlags;
}

export type TeamRunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR';
export type TeamRunDeleteLifecycle = 'READY' | 'CLEANUP_PENDING';

export interface TeamRunMemberHistoryItem {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  runtimeKind?: AgentRuntimeKind | null;
  runtimeReference?: {
    runtimeKind: string;
    sessionId?: string | null;
    threadId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  workspaceRootPath?: string | null;
}

export interface TeamRunHistoryItem {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath?: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  deleteLifecycle: TeamRunDeleteLifecycle;
  isActive: boolean;
  members: TeamRunMemberHistoryItem[];
}

export interface TeamRunManifestMemberBinding {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  runtimeKind: AgentRuntimeKind;
  runtimeReference?: {
    runtimeKind: string;
    sessionId?: string | null;
    threadId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
}

export interface TeamRunManifestPayload {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  runVersion: number;
  createdAt: string;
  updatedAt: string;
  memberBindings: TeamRunManifestMemberBinding[];
}

export interface TeamRunResumeConfigPayload {
  teamRunId: string;
  isActive: boolean;
  manifest: TeamRunManifestPayload;
}

export interface TeamMemberTreeRow {
  teamRunId: string;
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  workspaceRootPath: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  isActive: boolean;
  deleteLifecycle: TeamRunDeleteLifecycle;
}

export interface TeamTreeNode {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  isActive: boolean;
  currentStatus: AgentTeamStatus;
  deleteLifecycle: TeamRunDeleteLifecycle;
  focusedMemberName: string;
  members: TeamMemberTreeRow[];
}

export interface ListRunHistoryQueryData {
  listRunHistory: RunHistoryWorkspaceGroup[];
}

export interface ListTeamRunHistoryQueryData {
  listTeamRunHistory: TeamRunHistoryItem[];
}

export interface TeamMemberRunProjectionPayload {
  agentRunId: string;
  conversation: RunProjectionConversationEntry[];
  summary?: string | null;
  lastActivityAt?: string | null;
}

export interface GetTeamMemberRunProjectionQueryData {
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload;
}

export interface GetTeamRunResumeConfigQueryData {
  getTeamRunResumeConfig: {
    teamRunId: string;
    isActive: boolean;
    manifest: unknown;
  };
}

export interface DeleteRunHistoryMutationData {
  deleteRunHistory: {
    success: boolean;
    message: string;
  };
}

export interface DeleteTeamRunHistoryMutationData {
  deleteTeamRunHistory: {
    success: boolean;
    message: string;
  };
}
