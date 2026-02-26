import type { AgentContext } from '../context/agent-context.js';
import { BaseShutdownStep } from './base-shutdown-step.js';

export class ToolCleanupStep extends BaseShutdownStep {
  constructor() {
    super();
  }

  async execute(context: AgentContext): Promise<boolean> {
    const agentId = context.agentId;
    const toolInstances = context.toolInstances;

    if (!toolInstances || Object.keys(toolInstances).length === 0) {
      console.debug(`Agent '${agentId}': No tool instances found. Skipping ToolCleanupStep.`);
      return true;
    }

    let allSucceeded = true;

    for (const [toolName, toolInstance] of Object.entries(toolInstances)) {
      try {
        const cleanupFunc = (toolInstance as any).cleanup;
        if (typeof cleanupFunc !== 'function') {
          console.debug(`Agent '${agentId}': Tool '${toolName}' has no cleanup hook. Skipping.`);
          continue;
        }

        const result = cleanupFunc.call(toolInstance);
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (error) {
        allSucceeded = false;
        console.error(`Agent '${agentId}': Error during cleanup of tool '${toolName}': ${error}`);
      }
    }

    return allSucceeded;
  }
}
