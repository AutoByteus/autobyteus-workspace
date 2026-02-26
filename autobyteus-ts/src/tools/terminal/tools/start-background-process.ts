import os from 'node:os';
import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { BackgroundProcessManager } from '../background-process-manager.js';
import type { AgentContextLike } from './run-bash.js';

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

function getCwd(context: AgentContextLike | null | undefined): string {
  if (context?.workspace) {
    try {
      const basePath = context.workspace.getBasePath();
      if (basePath && typeof basePath === 'string') {
        return basePath;
      }
    } catch {
      // ignore workspace errors
    }
  }

  return os.tmpdir();
}

export async function startBackgroundProcess(
  context: AgentContextLike | null,
  command: string
): Promise<{ processId: string; status: string }> {
  const manager = getBackgroundManager(context);
  const cwd = getCwd(context);

  const processId = await manager.startProcess(command, cwd);
  return { processId, status: 'started' };
}

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'command',
  type: ParameterType.STRING,
  description: "Parameter 'command' for tool 'start_background_process'.",
  required: true
}));

const TOOL_NAME = 'start_background_process';
let cachedTool: BaseTool | null = null;

export function registerStartBackgroundProcessTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: 'Start a long-running process in the background and return its process_id.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'command']
    })(startBackgroundProcess) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
