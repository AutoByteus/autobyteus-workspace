import type { AgentContext } from '../context/agent-context.js';
import { BaseShutdownStep } from './base-shutdown-step.js';
import { LLMInstanceCleanupStep } from './llm-instance-cleanup-step.js';
import { ToolCleanupStep } from './tool-cleanup-step.js';
import { McpServerCleanupStep } from './mcp-server-cleanup-step.js';

export class AgentShutdownOrchestrator {
  shutdownSteps: BaseShutdownStep[];

  constructor(steps?: BaseShutdownStep[]) {
    if (!steps) {
      this.shutdownSteps = [
        new LLMInstanceCleanupStep(),
        new ToolCleanupStep(),
        new McpServerCleanupStep()
      ];
    } else {
      this.shutdownSteps = steps;
    }
  }

  async run(context: AgentContext): Promise<boolean> {
    const agentId = context.agentId;

    for (let index = 0; index < this.shutdownSteps.length; index += 1) {
      const step = this.shutdownSteps[index];
      const success = await step.execute(context);
      if (!success) {
        console.error(`Agent '${agentId}': Shutdown step ${step.constructor.name} failed.`);
        return false;
      }
    }

    return true;
  }
}
