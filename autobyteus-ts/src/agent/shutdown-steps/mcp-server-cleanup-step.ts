import type { AgentContext } from '../context/agent-context.js';
import { BaseShutdownStep } from './base-shutdown-step.js';
import { McpServerInstanceManager } from '../../tools/mcp/server-instance-manager.js';

export class McpServerCleanupStep extends BaseShutdownStep {
  private instanceManager: McpServerInstanceManager;

  constructor(instanceManager?: McpServerInstanceManager) {
    super();
    this.instanceManager = instanceManager ?? new McpServerInstanceManager();
  }

  async execute(context: AgentContext): Promise<boolean> {
    const agentId = context.agentId;
    try {
      await this.instanceManager.cleanupMcpServerInstancesForAgent(agentId);
      return true;
    } catch (error: any) {
      const message = error?.message ?? String(error);
      console.error(`Agent '${agentId}': Critical failure during McpServerCleanupStep: ${message}`);
      return false;
    }
  }
}
