import { BaseAgentTeamBootstrapStep } from './base-agent-team-bootstrap-step.js';
import { TaskPlan } from '../../task-management/index.js';
import { EventType } from '../../events/event-types.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export class TeamContextInitializationStep extends BaseAgentTeamBootstrapStep {
  async execute(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(`Team '${teamId}': Executing TeamContextInitializationStep.`);

    try {
      if (!context.state.taskPlan) {
        const taskPlan = new TaskPlan(teamId);
        context.state.taskPlan = taskPlan as any;
        console.info(`Team '${teamId}': TaskPlan initialized and attached to team state.`);

        const statusManager: any = context.statusManager;
        const notifier = statusManager?.notifier;
        if (notifier) {
          notifier.subscribeFrom(
            taskPlan as any,
            EventType.TASK_PLAN_TASKS_CREATED,
            notifier.handleAndPublishTaskPlanEvent
          );
          notifier.subscribeFrom(
            taskPlan as any,
            EventType.TASK_PLAN_STATUS_UPDATED,
            notifier.handleAndPublishTaskPlanEvent
          );
          console.info(`Team '${teamId}': Successfully bridged TaskPlan events to the team notifier.`);
        } else {
          console.warn(
            `Team '${teamId}': Notifier not found in StatusManager. Cannot bridge TaskPlan events.`
          );
        }
      } else {
        console.warn(`Team '${teamId}': TaskPlan already exists. Skipping initialization.`);
      }

      return true;
    } catch (error) {
      console.error(
        `Team '${teamId}': Critical failure during team context initialization: ${error}`
      );
      return false;
    }
  }
}
