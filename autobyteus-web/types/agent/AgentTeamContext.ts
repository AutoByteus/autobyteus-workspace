import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { AgentContext } from './AgentContext';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { TeamRunMetadataAgentMember } from '~/stores/runHistoryTypes';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import type {
  TaskExecutionProjectionStatus,
  TaskExecutionTimelineEntry,
} from '~/services/agentStreaming/teamTaskExecutionProjection';
import type { ConversationTargetSegment } from '~/types/agent/ConversationTargetAddress';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';

export type TeamMemberNodeKind = 'agent' | 'agent_team';

export interface TeamMemberNodeBase {
  memberKind: TeamMemberNodeKind;
  memberName: string;
  displayName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId?: string | null;
  /** True for transient frontend projections of concrete delegated task-agent instances. */
  isTaskAgentInstance?: boolean;
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;
  /** True for transient frontend projections of concrete delegated task-team executions. */
  isTaskTeamInstance?: boolean;
  taskTeamInstanceId?: string | null;
  taskTeamRunId?: string | null;
  logicalTeamRouteKey?: string | null;
  logicalTeamPath?: string[] | null;
  taskExecutionStatus?: TaskExecutionProjectionStatus | null;
  taskTimeline?: TaskExecutionTimelineEntry[];
  /** Delegated task label from the task delegation event contract. */
  taskLabel?: string | null;
  /** Delegated task description from TaskDelegationRecord.description. */
  taskDescription?: string | null;
  /** Task-owned reference files from the delegated task record. */
  taskReferenceFiles?: TeamReferenceFile[];
  /** Normalized original delegate_task input/provenance. */
  taskArguments?: Record<string, unknown> | null;
  /** Display-only delegated task target kind. */
  taskTargetKind?: 'member' | 'team' | string | null;
  /** Display-only delegated task target name. */
  taskTargetName?: string | null;
  /** True for cloned child member nodes scoped under a concrete task-team execution. */
  isTaskTeamChildProjection?: boolean;
  parentTaskTeamRunId?: string | null;
  parentTaskTeamInstanceId?: string | null;
  parentTaskId?: string | null;
  taskTeamRelativeMemberRouteKey?: string | null;
  taskTeamRelativeMemberPath?: string[] | null;
  structuralSourceRouteKey?: string | null;
  structuralSourcePath?: string[] | null;
  /** Frontend-owned canonical conversation path for runtime projections. Not a backend route string. */
  conversationTargetSegments?: ConversationTargetSegment[];
  /** Backend-owned canonical status for structural/non-leaf members. */
  currentStatus?: AgentStatus | null;
  role?: string | null;
  description?: string | null;
}

export interface AgentTeamMemberNode extends TeamMemberNodeBase {
  memberKind: 'agent';
  agentDefinitionId: string;
}

export interface SubTeamMemberNode extends TeamMemberNodeBase {
  memberKind: 'agent_team';
  teamDefinitionId: string;
  teamRunId?: string | null;
  coordinatorMemberRouteKey?: string | null;
  children: TeamMemberNode[];
}

export type TeamMemberNode = AgentTeamMemberNode | SubTeamMemberNode;

export type TeamMemberProjectionLoadState = 'unloaded' | 'loading' | 'loaded' | 'error';

export interface HistoricalTeamHydrationState {
  createdAt: string;
  updatedAt: string;
  memberMetadataByRouteKey: Record<string, TeamRunMetadataAgentMember>;
  memberProjectionLoadStateByRouteKey: Record<string, TeamMemberProjectionLoadState>;
  memberWorkspaceMetadatasByRouteKey: Record<string, WorkspaceMetadata>;
}

/**
 * @interface AgentTeamContext
 * @description Represents the complete state of a single, running agent team run.
 * It encapsulates the run configuration, the state of all member agents, the overall
 * team status, and the current UI focus.
 */
export interface AgentTeamContext {
  teamRunId: string;
  config: TeamRunConfig;
  memberTree: TeamMemberNode[];
  memberNodesByRouteKey: Map<string, TeamMemberNode>;
  leafAgentContextsByRouteKey: Map<string, AgentContext>;
  coordinatorMemberRouteKey?: string | null;
  historicalHydration?: HistoricalTeamHydrationState | null;
  focusedMemberRouteKey: string;
  currentStatus: AgentTeamStatus;
  isSubscribed: boolean;
  unsubscribe?: () => void;
}
