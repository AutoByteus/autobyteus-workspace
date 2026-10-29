import type { AgentContext } from '../context/agent-context.js';
import { BaseShutdownStep } from './base-shutdown-step.js';
import { cleanupToolInstance } from '../context/agent-tool-instances.js';

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
      if (!(await cleanupToolInstance(agentId, toolName, toolInstance))) allSucceeded = false;
    }

    return allSucceeded;
  }
}
