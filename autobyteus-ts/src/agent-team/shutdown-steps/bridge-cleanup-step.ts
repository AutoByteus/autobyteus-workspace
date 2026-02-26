import { BaseAgentTeamShutdownStep } from './base-agent-team-shutdown-step.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export class BridgeCleanupStep extends BaseAgentTeamShutdownStep {
  async execute(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(`Team '${teamId}': Executing BridgeCleanupStep.`);

    const multiplexer: any = context.multiplexer;
    if (!multiplexer) {
      console.warn(`Team '${teamId}': No AgentEventMultiplexer found, cannot shut down event bridges.`);
      return true;
    }

    try {
      await multiplexer.shutdown();
      return true;
    } catch (error) {
      console.error(
        `Team '${teamId}': Error shutting down agent event bridges via multiplexer: ${error}`
      );
      return false;
    }
  }
}
