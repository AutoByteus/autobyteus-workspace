import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { AgentContext } from './AgentContext';
import type { Task, TaskStatus } from '~/types/taskManagement';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { TeamRunMetadataMember } from '~/stores/runHistoryTypes';

export type TeamMemberProjectionLoadState = 'unloaded' | 'loading' | 'loaded' | 'error';

export interface HistoricalTeamHydrationState {
  createdAt: string;
  updatedAt: string;
  memberMetadataByRouteKey: Record<string, TeamRunMetadataMember>;
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
  members: Map<string, AgentContext>;
  coordinatorMemberRouteKey?: string | null;
  historicalHydration?: HistoricalTeamHydrationState | null;
  focusedMemberName: string;
  currentStatus: AgentTeamStatus;
  isSubscribed: boolean;
  unsubscribe?: () => void;
  taskPlan: Task[] | null;
  taskStatuses: Record<string, TaskStatus> | null;
}
