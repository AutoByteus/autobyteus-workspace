import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { getBackgroundManager, type AgentContextLike } from '../background-process-context.js';

export async function getProcessOutput(
  context: AgentContextLike | null,
  pid: number,
  lines: number = 100
): Promise<{ output: string; isRunning: boolean; pid: number; status?: string; error?: string }> {
  const manager = getBackgroundManager(context);

  try {
    const result = await manager.getOutput(pid, lines);
    return {
      output: result.output,
      isRunning: result.isRunning,
      pid: result.pid,
      status: result.status
    };
  } catch {
    return {
      output: '',
      isRunning: false,
      pid,
      status: 'exited',
      error: `Process '${pid}' not found. It may have already stopped or never existed.`
    };
  }
}

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'pid',
  type: ParameterType.INTEGER,
  description: "OS PID returned by run_bash backgroundProcesses, start_background_process, or get_background_processes.",
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'lines',
  type: ParameterType.INTEGER,
  description: "Maximum number of recent output lines to return.",
  required: false,
  defaultValue: 100
}));

const TOOL_NAME = 'get_process_output';
let cachedTool: BaseTool | null = null;

export function registerGetProcessOutputTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: 'Get recent captured output from a managed background process by PID.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'pid', 'lines']
    })(getProcessOutput) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
