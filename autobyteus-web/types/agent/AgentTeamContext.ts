import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { AgentContext } from './AgentContext';
import type { Task, TaskStatus } from '~/types/taskManagement';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

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
  focusedMemberName: string;
  currentStatus: AgentTeamStatus;
  isSubscribed: boolean;
  unsubscribe?: () => void;
  taskPlan: Task[] | null;
  taskStatuses: Record<string, TaskStatus> | null;
}
