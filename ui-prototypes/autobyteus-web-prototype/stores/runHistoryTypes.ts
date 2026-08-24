import type { AgentRuntimeKind, SkillAccessMode } from '~/types/agent/AgentRunConfig';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation';
import type { RunProjectionActivityEntry } from '~/services/runHydration/runProjectionActivityHydration';
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts';

export type RunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR' | 'TERMINATED';

export interface RunHistoryItem {
  runId: string;
  summary: string;
  createdAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
  status: AgentStatus;
  isActive: boolean;
  shouldConnectStream?: boolean;
  statusSource?: string;
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
  agentDefinitions: RunHistoryAgentGroup[];
  teamDefinitions: TeamRunHistoryDefinitionGroup[];
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

export type TeamRunDeleteLifecycle = 'READY' | 'CLEANUP_PENDING';

export interface TeamRunMemberHistoryItem {
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  status: AgentStatus;
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
  coordinatorAddress: string;
  workspaceRootPath?: string | null;
  summary: string;
  createdAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
  isActive: boolean;
  rootTeam: TeamRunExecutionTreeDto['root_team'];
  members: TeamRunMemberHistoryItem[];
}

export interface TeamRunHistoryDefinitionGroup {
  teamDefinitionId: string;
  teamDefinitionName: string;
  runs: TeamRunHistoryItem[];
}

export interface TeamRunResumeConfigPayload {
  teamRunId: string;
  isActive: boolean;
  executionTree: TeamRunExecutionTreeDto;
}

export interface TeamRunExecutionCheckpointPayload {
  rootTeamRunId: string;
  changeSequence: number;
  hasOpenExecutionWork: boolean;
}

export interface TeamMemberTreeRow {
  teamRunId: string;
  kind: 'agent' | 'agent_team';
  memberAddress: string;
  displayName: string;
  agentRunId?: string | null;
  teamDefinitionId?: string | null;
  teamRunIdForNode?: string | null;
  coordinatorAddress?: string | null;
  workspaceRootPath: string | null;
  summary: string;
  lastActivityAt: string;
  currentStatus: AgentStatus | null;
  isActive: boolean;
  deleteLifecycle: TeamRunDeleteLifecycle;
  children: TeamMemberTreeRow[];
}

export interface TeamMemberFocusTarget {
  teamRunId: string;
  memberAddress: string;
  agentRunId: string;
}

export interface RunHistoryTeamExecutionRowBase {
  teamRunId: string;
  memberAddress: string;
  agentRunId: string | null;
  teamRunIdForNode: string | null;
  rowKey: string;
  memberKind: TeamMemberTreeRow['kind'];
  displayName: string;
  depth: number;
  hasChildren: boolean;
}

export interface RunHistoryStableExecutionRow extends RunHistoryTeamExecutionRowBase {
  kind: 'stable_member';
  row: TeamMemberTreeRow;
}

export interface RunHistoryTransientExecutionRow extends RunHistoryTeamExecutionRowBase {
  kind: 'transient_execution';
  transientKind: 'task_agent' | 'task_team' | 'task_team_child';
  currentStatus: AgentStatus | string | null;
}

export type RunHistoryTeamExecutionRow =
  | RunHistoryStableExecutionRow
  | RunHistoryTransientExecutionRow;

export interface TeamTreeNode {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string;
  summary: string;
  lastActivityAt: string;
  isActive: boolean;
  deleteLifecycle: TeamRunDeleteLifecycle;
  focusedAgentRunId: string;
  rootTeam: TeamMemberTreeRow;
  members: TeamMemberTreeRow[];
  executionRows: RunHistoryTeamExecutionRow[];
}

export interface ListWorkspaceRunHistoryQueryData {
  listWorkspaceRunHistory: RunHistoryWorkspaceGroup[];
}

export interface GetWorkspaceRunHistoryQueryData {
  workspaceRunHistory: RunHistoryWorkspaceGroup;
}

export interface TeamMemberRunProjectionPayload {
  agentRunId: string;
  conversation: RunProjectionConversationEntry[];
  activities: RunProjectionActivityEntry[];
  summary?: string | null;
  lastActivityAt?: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

export interface GetTeamMemberRunProjectionQueryData {
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload;
}

export interface GetTeamRunResumeConfigQueryData {
  getTeamRunResumeConfig: {
    teamRunId: string;
    isActive: boolean;
    executionTree: unknown;
  };
}

export interface GetTeamRunExecutionCheckpointQueryData {
  getTeamRunExecutionCheckpoint: TeamRunExecutionCheckpointPayload;
}

export interface DeleteStoredRunMutationData {
  deleteStoredRun: {
    success: boolean;
    message: string;
  };
}

export interface ArchiveStoredRunMutationData {
  archiveStoredRun: {
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

export interface ArchiveStoredTeamRunMutationData {
  archiveStoredTeamRun: {
    success: boolean;
    message: string;
  };
}


export interface GetTaskDelegationRecordsQueryData {
  getTaskDelegationRecords: unknown[];
}
