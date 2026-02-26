import { BaseAgentTeamShutdownStep } from './base-agent-team-shutdown-step.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { TeamManager } from '../context/team-manager.js';

export class SubTeamShutdownStep extends BaseAgentTeamShutdownStep {
  async execute(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(`Team '${teamId}': Executing SubTeamShutdownStep.`);

    const teamManager = context.teamManager as TeamManager | null;
    if (!teamManager) {
      console.warn(`Team '${teamId}': No TeamManager found, cannot shut down sub-teams.`);
      return true;
    }

    const allSubTeams = teamManager.getAllSubTeams();
    const runningSubTeams = allSubTeams.filter((team) => team.isRunning);

    if (!runningSubTeams.length) {
      console.info(`Team '${teamId}': No running sub-teams to shut down.`);
      return true;
    }

    console.info(`Team '${teamId}': Shutting down ${runningSubTeams.length} running sub-teams.`);
    const stopTasks = runningSubTeams.map((team) => team.stop(20.0));
    const results = await Promise.allSettled(stopTasks);

    let allSuccessful = true;
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        const team = runningSubTeams[idx];
        console.error(`Team '${teamId}': Error stopping sub-team '${team.name}': ${result.reason}`);
        allSuccessful = false;
      }
    });

    return allSuccessful;
  }
}
