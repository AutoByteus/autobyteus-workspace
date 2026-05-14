import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { getBackgroundManager, type AgentContextLike } from '../background-process-context.js';

export async function stopBackgroundProcess(
  context: AgentContextLike | null,
  pid: number
): Promise<{ status: string; pid: number }> {
  const manager = getBackgroundManager(context);
  const success = await manager.stopProcess(pid);
  return { status: success ? 'stopped' : 'not_found', pid };
}

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'pid',
  type: ParameterType.INTEGER,
  description: "OS PID returned by run_bash backgroundProcesses, start_background_process, or get_background_processes.",
  required: true
}));

const TOOL_NAME = 'stop_background_process';
let cachedTool: BaseTool | null = null;

export function registerStopBackgroundProcessTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: 'Stop a managed background process by PID.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'pid']
    })(stopBackgroundProcess) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
