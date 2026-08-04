import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { AgentContext } from './AgentContext';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamRunMetadataAgentMember } from '~/stores/runHistoryTypes';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import type { TaskExecutionProjectionStatus, TaskExecutionTimelineEntry } from '~/services/agentStreaming/teamTaskExecutionProjection';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { AgentTeamAddress, TeamExecutionAddress } from './TeamExecutionAddress';

export interface TeamRunNodeBase {
  kind: 'agent' | 'agent_team';
  address: AgentTeamAddress;
  displayName: string;
  role?: string | null;
  description?: string | null;
  executionAddress?: TeamExecutionAddress | null;
  taskId?: string | null;
  taskExecutionStatus?: TaskExecutionProjectionStatus | null;
  taskTimeline?: TaskExecutionTimelineEntry[];
  taskLabel?: string | null;
  taskDescription?: string | null;
  taskReferenceFiles?: TeamReferenceFile[];
  taskArguments?: Record<string, unknown> | null;
  taskTargetKind?: 'agent' | 'agent_team' | string | null;
  taskTargetAddress?: AgentTeamAddress | null;
  isTaskExecution?: boolean;
}

export interface AgentTeamMemberNode extends TeamRunNodeBase {
  kind: 'agent';
  agentDefinitionId: string;
  agentRunId: string;
  currentStatus?: AgentStatus | null;
}

export interface SubTeamMemberNode extends TeamRunNodeBase {
  kind: 'agent_team';
  teamDefinitionId: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  children: TeamMemberNode[];
}

export type TeamMemberNode = AgentTeamMemberNode | SubTeamMemberNode;
export type TeamMemberProjectionLoadState = 'unloaded' | 'loading' | 'loaded' | 'error';

export interface HistoricalTeamHydrationState {
  createdAt: string;
  updatedAt: string;
  memberMetadataByAddress: Record<string, TeamRunMetadataAgentMember>;
  memberProjectionLoadStateByAddress: Record<string, TeamMemberProjectionLoadState>;
  memberWorkspaceMetadatasByAddress: Record<string, WorkspaceMetadata>;
}

export interface AgentTeamContext {
  teamRunId: string;
  config: TeamRunConfig;
  rootTeam: SubTeamMemberNode;
  memberNodesByAddress: Map<AgentTeamAddress, TeamMemberNode>;
  agentExecutionsByKey: Map<string, AgentContext>;
  historicalHydration?: HistoricalTeamHydrationState | null;
  focusedExecutionAddress: TeamExecutionAddress;
  isActive: boolean;
  isSubscribed: boolean;
  unsubscribe?: () => void;
}
