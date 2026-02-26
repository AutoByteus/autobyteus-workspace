import { BaseTool } from '../base-tool.js';
import { ToolConfig } from '../tool-config.js';

export abstract class ToolFactory {
  abstract createTool(config?: ToolConfig): BaseTool;
}
