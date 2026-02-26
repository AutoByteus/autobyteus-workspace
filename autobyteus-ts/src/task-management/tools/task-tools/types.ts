import type { BaseTaskPlan } from '../../base-task-plan.js';

export type TaskToolTeamContext = {
  state?: {
    taskPlan?: BaseTaskPlan | null;
  };
  teamManager?: {
    dispatchInterAgentMessageRequest: (event: unknown) => Promise<void>;
  } | null;
};

export type TaskToolContext = {
  agentId?: string;
  config?: {
    name?: string;
  };
  customData?: {
    teamContext?: TaskToolTeamContext;
  };
};
