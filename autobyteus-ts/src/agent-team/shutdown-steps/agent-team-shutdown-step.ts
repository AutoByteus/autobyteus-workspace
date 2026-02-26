import { BaseAgentTeamShutdownStep } from './base-agent-team-shutdown-step.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { TeamManager } from '../context/team-manager.js';

export class AgentTeamShutdownStep extends BaseAgentTeamShutdownStep {
  async execute(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(`Team '${teamId}': Executing AgentTeamShutdownStep.`);

    const teamManager = context.teamManager as TeamManager | null;
    if (!teamManager) {
      console.warn(`Team '${teamId}': No TeamManager found, cannot shut down agents.`);
      return true;
    }

    const allAgents = teamManager.getAllAgents();
    if (!allAgents.length) {
      console.info(`Team '${teamId}': No managed agents to shut down.`);
      return true;
    }

    console.info(`Team '${teamId}': Shutting down ${allAgents.length} managed agents.`);
    return teamManager.shutdownManagedAgents(10.0);
  }
}
