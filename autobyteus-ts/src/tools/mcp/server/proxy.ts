import { McpServerInstanceManager } from '../server-instance-manager.js';

type ToolArguments = Record<string, unknown>;

export class McpServerProxy {
  private agentId: string;
  private serverId: string;
  private instanceManager: McpServerInstanceManager;

  constructor(agentId: string, serverId: string) {
    if (!agentId || !serverId) {
      throw new Error('McpServerProxy requires both agentId and serverId.');
    }

    this.agentId = agentId;
    this.serverId = serverId;
    this.instanceManager = McpServerInstanceManager.getInstance();
  }

  async callTool(toolName: string, argumentsPayload: ToolArguments): Promise<unknown> {
    const realServerInstance = this.instanceManager.getServerInstance(this.agentId, this.serverId);
    return await realServerInstance.callTool(toolName, argumentsPayload);
  }
}
