import { BaseBootstrapStep } from './base-bootstrap-step.js';
import { SystemPromptProcessingStep } from './system-prompt-processing-step.js';
import { McpServerPrewarmingStep } from './mcp-server-prewarming-step.js';
import { WorkingContextSnapshotRestoreStep } from './working-context-snapshot-restore-step.js';
import type { AgentContext } from '../context/agent-context.js';

export class AgentBootstrapper {
  bootstrapSteps: BaseBootstrapStep[];

  constructor(steps: BaseBootstrapStep[] | null = null) {
    if (!steps) {
      this.bootstrapSteps = [
        new McpServerPrewarmingStep(),
        new SystemPromptProcessingStep(),
        new WorkingContextSnapshotRestoreStep()
      ];
      console.debug('AgentBootstrapper initialized with default steps.');
    } else {
      this.bootstrapSteps = steps;
      console.debug(`AgentBootstrapper initialized with ${steps.length} custom steps.`);
    }
  }

  async run(context: AgentContext): Promise<boolean> {
    const agentId = context.agentId;
    console.info(`Agent '${agentId}': Bootstrapper starting direct lifecycle execution.`);
    for (const [index, step] of this.bootstrapSteps.entries()) {
      const stepName = step.constructor.name;
      console.info(`Agent '${agentId}': Running bootstrap step ${index} (${stepName}).`);
      const success = await step.execute(context);
      if (!success) {
        console.error(`Agent '${agentId}': Bootstrap step ${stepName} failed.`);
        return false;
      }
    }
    return true;
  }
}
