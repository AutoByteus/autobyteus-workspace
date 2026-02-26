import { BaseAgentTeamShutdownStep } from './base-agent-team-shutdown-step.js';
import { BridgeCleanupStep } from './bridge-cleanup-step.js';
import { SubTeamShutdownStep } from './sub-team-shutdown-step.js';
import { AgentTeamShutdownStep } from './agent-team-shutdown-step.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export class AgentTeamShutdownOrchestrator {
  shutdownSteps: BaseAgentTeamShutdownStep[];

  constructor(steps?: BaseAgentTeamShutdownStep[]) {
    this.shutdownSteps = steps ?? [
      new BridgeCleanupStep(),
      new SubTeamShutdownStep(),
      new AgentTeamShutdownStep()
    ];
  }

  async run(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(`Team '${teamId}': Shutdown orchestrator starting.`);

    let allSuccessful = true;
    for (const step of this.shutdownSteps) {
      const success = await step.execute(context);
      if (!success) {
        console.error(`Team '${teamId}': Shutdown step ${step.constructor.name} failed.`);
        allSuccessful = false;
      }
    }

    console.info(`Team '${teamId}': Shutdown orchestration completed.`);
    return allSuccessful;
  }
}
