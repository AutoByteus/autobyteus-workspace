import { BaseAgentTeamBootstrapStep } from './base-agent-team-bootstrap-step.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { TeamManager } from '../context/team-manager.js';
import { AgentConfig } from '../../agent/context/agent-config.js';

export class CoordinatorInitializationStep extends BaseAgentTeamBootstrapStep {
  private shouldInitializeCoordinatorLocally(context: AgentTeamContext): boolean {
    const coordinatorDefinition = context.config.coordinatorNode.nodeDefinition;
    if (!(coordinatorDefinition instanceof AgentConfig)) {
      return true;
    }
    const customData = coordinatorDefinition.initialCustomData;
    if (!customData || typeof customData !== 'object') {
      return true;
    }
    const placement = (customData as Record<string, unknown>).teamMemberPlacement;
    if (!placement || typeof placement !== 'object') {
      return true;
    }
    const isLocal = (placement as Record<string, unknown>).isLocalToCurrentNode;
    return typeof isLocal === 'boolean' ? isLocal : true;
  }

  async execute(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(`Team '${teamId}': Executing CoordinatorInitializationStep.`);

    try {
      const teamManager = context.teamManager as TeamManager | null;
      if (!teamManager) {
        throw new Error('TeamManager not found in team context. It should be created by the factory.');
      }

      const coordinatorName = context.config.coordinatorNode.name;
      if (!this.shouldInitializeCoordinatorLocally(context)) {
        console.info(
          `Team '${teamId}': Skipping coordinator initialization for non-local coordinator '${coordinatorName}'.`
        );
        return true;
      }
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
