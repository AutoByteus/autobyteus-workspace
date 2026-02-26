import os from 'node:os';
import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { TerminalResult } from '../types.js';
import { TerminalSessionManager } from '../terminal-session-manager.js';
import { BackgroundProcessManager } from '../background-process-manager.js';

type WorkspaceLike = { getBasePath: () => string };
export type AgentContextLike = { workspace?: WorkspaceLike | null; agentId?: string };
export type RunBashBackgroundResult = {
  mode: 'background';
  processId: string;
  command: string;
  status: 'started';
  startedAt: string;
};

let defaultTerminalManager: TerminalSessionManager | null = null;
let defaultBackgroundManager: BackgroundProcessManager | null = null;

function getTerminalManager(context: AgentContextLike | null | undefined): TerminalSessionManager {
  if (!context) {
    if (!defaultTerminalManager) {
      defaultTerminalManager = new TerminalSessionManager();
    }
    return defaultTerminalManager;
  }

  const contextRecord = context as Record<string, unknown>;
  const existing = contextRecord._terminalSessionManager as TerminalSessionManager | undefined;

  if (!existing) {
    const manager = new TerminalSessionManager();
    contextRecord._terminalSessionManager = manager;
    return manager;
  }

  if (!contextRecord._terminalSessionManager) {
    contextRecord._terminalSessionManager = existing;
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

export async function runBash(
  context: AgentContextLike | null,
  command: string,
  timeoutSeconds: number = 30,
  background: boolean = false
): Promise<TerminalResult | RunBashBackgroundResult> {
  const cwd = getCwd(context);

  if (background) {
    const manager = getBackgroundManager(context);
    const processId = await manager.startProcess(command, cwd);
    return {
      mode: 'background',
      processId,
      command,
      status: 'started',
      startedAt: new Date().toISOString()
    };
  }

  const manager = getTerminalManager(context);
  await manager.ensureStarted(cwd);
  return manager.executeCommand(command, timeoutSeconds);
}

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'command',
  type: ParameterType.STRING,
  description: "Parameter 'command' for tool 'run_bash'.",
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'timeout_seconds',
  type: ParameterType.INTEGER,
  description: "Parameter 'timeout_seconds' for tool 'run_bash'.",
  required: false,
  defaultValue: 30
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'background',
  type: ParameterType.BOOLEAN,
  description: "Parameter 'background' for tool 'run_bash'.",
  required: false,
  defaultValue: false
}));

const TOOL_NAME = 'run_bash';
let cachedTool: BaseTool | null = null;

export function registerRunBashTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: 'Execute a shell command in a stateful terminal session.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'command', 'timeout_seconds', 'background']
    })(runBash) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
