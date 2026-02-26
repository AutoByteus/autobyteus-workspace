import { BaseAgentTeamBootstrapStep } from './base-agent-team-bootstrap-step.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { TeamManager } from '../context/team-manager.js';

export class CoordinatorInitializationStep extends BaseAgentTeamBootstrapStep {
  async execute(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(`Team '${teamId}': Executing CoordinatorInitializationStep.`);

    try {
      const teamManager = context.teamManager as TeamManager | null;
      if (!teamManager) {
        throw new Error('TeamManager not found in team context. It should be created by the factory.');
      }

      const coordinatorName = context.config.coordinatorNode.name;
      const coordinator = await teamManager.ensureCoordinatorIsReady(coordinatorName);

      if (!coordinator) {
        throw new Error(
          `TeamManager failed to return a ready coordinator agent for '${coordinatorName}'.`
        );
      }

      console.info(
        `Team '${teamId}': Coordinator '${coordinatorName}' initialized and started via TeamManager.`
      );
      return true;
    } catch (error) {
      console.error(`Team '${teamId}': Failed to initialize coordinator agent: ${error}`);
      return false;
    }
  }
}
