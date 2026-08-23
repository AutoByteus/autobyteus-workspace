import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { getBackgroundManager, type AgentContextLike } from '../background-process-context.js';
import { resolveExecutionCwd } from '../execution-cwd.js';
import type { BackgroundProcessInfo } from '../types.js';

export async function startBackgroundProcess(
  context: AgentContextLike | null,
  command: string,
  cwd?: string | null
): Promise<BackgroundProcessInfo> {
  const manager = getBackgroundManager(context);
  const resolvedCwd = resolveExecutionCwd(context, cwd);
  return manager.startCommand(command, resolvedCwd);
}

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'command',
  type: ParameterType.STRING,
  description: "Shell command to execute in the background.",
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'cwd',
  type: ParameterType.STRING,
  description: 'Optional working directory for the process.',
  required: false
}));

const TOOL_NAME = 'start_background_process';
let cachedTool: BaseTool | null = null;

export function registerStartBackgroundProcessTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description:
        'Start a long-running non-interactive shell command in a working directory and return its PID as pid. Any provided cwd must be an absolute path to an existing accessible local directory, including one outside the workspace. If cwd is omitted, the workspace root is used when available, otherwise the system temporary directory. cwd applies only to this process and does not change workspace identity or persist across calls. The result includes effectiveCwd so you can confirm where the process started.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'command', 'cwd']
    })(startBackgroundProcess) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
