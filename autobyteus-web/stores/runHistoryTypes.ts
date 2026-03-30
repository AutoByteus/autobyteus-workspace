import type { AgentRuntimeKind, SkillAccessMode } from '~/types/agent/AgentRunConfig';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation';

export type RunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR' | 'TERMINATED';

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
  teamRuns: TeamRunHistoryItem[];
}

export interface RunEditableFieldFlags {
  llmModelIdentifier: boolean;
  llmConfig: boolean;
  autoExecuteTools: boolean;
  skillAccessMode: boolean;
  workspaceRootPath: boolean;
  runtimeKind: boolean;
}

export interface RunMetadataConfigPayload {
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
  metadataConfig: RunMetadataConfigPayload;
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

export interface TeamRunMetadataMemberBinding {
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

export interface TeamRunMetadataPayload {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  runVersion: number;
  createdAt: string;
  updatedAt: string;
  memberBindings: TeamRunMetadataMemberBinding[];
}

export interface TeamRunResumeConfigPayload {
  teamRunId: string;
  isActive: boolean;
  metadata: TeamRunMetadataPayload;
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

export interface ListWorkspaceRunHistoryQueryData {
  listWorkspaceRunHistory: RunHistoryWorkspaceGroup[];
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
    metadata: unknown;
  };
}

export interface DeleteStoredRunMutationData {
  deleteStoredRun: {
    success: boolean;
    message: string;
  };
}

export interface DeleteStoredTeamRunMutationData {
  deleteStoredTeamRun: {
    success: boolean;
    message: string;
  };
}
