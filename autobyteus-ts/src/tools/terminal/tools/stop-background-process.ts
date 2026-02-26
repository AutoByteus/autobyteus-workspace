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

export async function stopBackgroundProcess(
  context: AgentContextLike | null,
  processId: string
): Promise<{ status: string; processId: string }> {
  const manager = getBackgroundManager(context);
  const success = await manager.stopProcess(processId);
  return { status: success ? 'stopped' : 'not_found', processId };
}

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'process_id',
  type: ParameterType.STRING,
  description: "Parameter 'process_id' for tool 'stop_background_process'.",
  required: true
}));

const TOOL_NAME = 'stop_background_process';
let cachedTool: BaseTool | null = null;

export function registerStopBackgroundProcessTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: 'Stop a running background process.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'process_id']
    })(stopBackgroundProcess) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
