import { BaseAgentTeamBootstrapStep } from './base-agent-team-bootstrap-step.js';
import { TeamContextInitializationStep } from './team-context-initialization-step.js';
import { TaskNotifierInitializationStep } from './task-notifier-initialization-step.js';
import { AgentConfigurationPreparationStep } from './agent-configuration-preparation-step.js';
import { CoordinatorInitializationStep } from './coordinator-initialization-step.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export class AgentTeamBootstrapper {
  bootstrapSteps: BaseAgentTeamBootstrapStep[];

  constructor(steps?: BaseAgentTeamBootstrapStep[]) {
    this.bootstrapSteps = steps ?? [
      new TeamContextInitializationStep(),
      new TaskNotifierInitializationStep(),
      new AgentConfigurationPreparationStep(),
      new CoordinatorInitializationStep()
    ];
  }

  async run(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(`Team '${teamId}': Bootstrapper starting.`);

    for (const step of this.bootstrapSteps) {
      const stepName = step.constructor.name;
      console.debug(`Team '${teamId}': Executing bootstrap step: ${stepName}`);
      const success = await step.execute(context);
      if (!success) {
        console.error(`Team '${teamId}': Bootstrap step ${stepName} failed.`);
        return false;
      }
    }

    console.info(`Team '${teamId}': All bootstrap steps completed successfully.`);
    if (!context.state.inputEventQueues) {
      console.error(`Team '${teamId}': Bootstrap succeeded but queues not available.`);
      return false;
    }

    return true;
  }
}
