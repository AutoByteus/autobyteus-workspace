import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { BackgroundProcessManager } from '../background-process-manager.js';
import { resolveExecutionCwd, type AgentContextLike } from './run-bash.js';

let defaultBackgroundManager: BackgroundProcessManager | null = null;

function getBackgroundManager(context: AgentContextLike | null | undefined): BackgroundProcessManager {
  if (!context) {
    if (!defaultBackgroundManager) {
      defaultBackgroundManager = new BackgroundProcessManager();
    }
    return defaultBackgroundManager;
  }

  const contextRecord = context as Record<string, unknown>;
  const existing = contextRecord._backgroundProcessManager as BackgroundProcessManager | undefined;

  if (!existing) {
    const manager = new BackgroundProcessManager();
    contextRecord._backgroundProcessManager = manager;
    return manager;
  }

  if (!contextRecord._backgroundProcessManager) {
    contextRecord._backgroundProcessManager = existing;
  }

  return existing;
}
export async function startBackgroundProcess(
  context: AgentContextLike | null,
  command: string,
  cwd?: string | null
): Promise<{ processId: string; status: string; effectiveCwd: string }> {
  const manager = getBackgroundManager(context);
  const resolvedCwd = resolveExecutionCwd(context, cwd);

  const processId = await manager.startProcess(command, resolvedCwd);
  return { processId, status: 'started', effectiveCwd: resolvedCwd };
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
  description:
    "Optional working-directory path for this process. Absolute paths are allowed. Relative paths are resolved from the workspace root when available. If omitted, the workspace root is used when available. If a task targets a nested directory, pass that same cwd on every location-sensitive command in that directory.",
  required: false
}));

const TOOL_NAME = 'start_background_process';
let cachedTool: BaseTool | null = null;

export function registerStartBackgroundProcessTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description:
        'Start a long-running process in a working directory and return its process_id. If cwd is omitted, the workspace root is used. If cwd is provided, it may be absolute or workspace-root-relative. The result includes effectiveCwd so you can confirm where the process started.',
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
