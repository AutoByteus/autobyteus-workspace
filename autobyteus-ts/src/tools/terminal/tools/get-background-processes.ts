import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { getBackgroundManager, type AgentContextLike } from '../background-process-context.js';
import type { BackgroundProcessInfo } from '../types.js';

export async function getBackgroundProcesses(
  context: AgentContextLike | null
): Promise<{ processes: BackgroundProcessInfo[] }> {
  const manager = getBackgroundManager(context);
  return { processes: await manager.listProcesses() };
}

const argumentSchema = new ParameterSchema();
const TOOL_NAME = 'get_background_processes';
let cachedTool: BaseTool | null = null;

export function registerGetBackgroundProcessesTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: 'List managed background processes for this agent context. Each process is identified by pid.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context']
    })(getBackgroundProcesses) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
