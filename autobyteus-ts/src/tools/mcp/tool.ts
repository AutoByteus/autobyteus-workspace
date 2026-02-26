import type { ParameterSchema } from '../../utils/parameter-schema.js';
import { BaseTool } from '../base-tool.js';
import { McpServerProxy } from './server/proxy.js';

type AgentContextLike = { agentId: string };

type ToolArguments = Record<string, any>;

export class GenericMcpTool extends BaseTool {
  private serverId: string;
  private remoteToolName: string;
  private instanceName: string;
  private instanceDescription: string;
  private instanceArgumentSchema: ParameterSchema;

  constructor(
    serverId: string,
    remoteToolName: string,
    name: string,
    description: string,
    argument_schema: ParameterSchema
  ) {
    super();
    this.serverId = serverId;
    this.remoteToolName = remoteToolName;
    this.instanceName = name;
    this.instanceDescription = description;
    this.instanceArgumentSchema = argument_schema;
  }

  getName(): string {
    return this.instanceName;
  }

  getDescription(): string {
    return this.instanceDescription;
  }

  getArgumentSchema(): ParameterSchema {
    return this.instanceArgumentSchema;
  }

  static getName(): string {
    return 'call_remote_mcp_tool';
  }

  static getDescription(): string {
    return 'A generic wrapper for executing remote MCP tools.';
  }

  static getArgumentSchema(): ParameterSchema | null {
    return null;
  }

  protected async _execute(context: AgentContextLike, kwargs: ToolArguments = {}): Promise<any> {
    const agentId = context.agentId;
    const proxy = new McpServerProxy(agentId, this.serverId);
    return await proxy.callTool(this.remoteToolName, kwargs);
  }
}
