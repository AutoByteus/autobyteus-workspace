import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { AgentContext } from './AgentContext';
import type { Task, TaskStatus } from '~/types/taskManagement';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { TeamRunMetadataAgentMember } from '~/stores/runHistoryTypes';

export type TeamMemberNodeKind = 'agent' | 'agent_team';

export interface TeamMemberNodeBase {
  memberKind: TeamMemberNodeKind;
  memberName: string;
  displayName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId?: string | null;
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
  taskPlan: Task[] | null;
  taskStatuses: Record<string, TaskStatus> | null;
}
