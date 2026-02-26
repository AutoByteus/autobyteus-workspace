import type { ParameterSchema } from '../../utils/parameter-schema.js';
import { ToolFactory } from '../factory/tool-factory.js';
import { GenericMcpTool } from './tool.js';
import type { ToolConfig } from '../tool-config.js';
import type { BaseTool } from '../base-tool.js';

export class McpToolFactory extends ToolFactory {
  private serverId: string;
  private remoteToolName: string;
  private registeredToolName: string;
  private toolDescription: string;
  private toolArgumentSchema: ParameterSchema;

  constructor(
    serverId: string,
    remoteToolName: string,
    registeredToolName: string,
    toolDescription: string,
    toolArgumentSchema: ParameterSchema
  ) {
    super();
    this.serverId = serverId;
    this.remoteToolName = remoteToolName;
    this.registeredToolName = registeredToolName;
    this.toolDescription = toolDescription;
    this.toolArgumentSchema = toolArgumentSchema;
  }

  createTool(_config?: ToolConfig): BaseTool {
    return new GenericMcpTool(
      this.serverId,
      this.remoteToolName,
      this.registeredToolName,
      this.toolDescription,
      this.toolArgumentSchema
    );
  }
}
