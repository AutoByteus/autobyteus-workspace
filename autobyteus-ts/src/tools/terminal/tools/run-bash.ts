import os from 'node:os';
import path from 'node:path';
import { statSync } from 'node:fs';
import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { TerminalResult } from '../types.js';
import { TerminalSessionManager } from '../terminal-session-manager.js';
import { BackgroundProcessManager } from '../background-process-manager.js';

export type AgentContextLike = { workspaceRootPath?: string | null; agentId?: string };
export type RunBashBackgroundResult = {
  mode: 'background';
  processId: string;
  command: string;
  status: 'started';
  startedAt: string;
};

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

function isWithinRoot(rootPath: string, candidatePath: string): boolean {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function ensureDirectoryExists(directoryPath: string): void {
  let stats;
  try {
    stats = statSync(directoryPath);
  } catch (error) {
    throw new Error(`Working directory '${directoryPath}' does not exist.`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Working directory '${directoryPath}' is not a directory.`);
  }
}

export function resolveExecutionCwd(
  context: AgentContextLike | null | undefined,
  cwd?: string | null
): string {
  const workspaceRootPath = context?.workspaceRootPath;

  if (cwd === undefined || cwd === null) {
    const defaultCwd =
      workspaceRootPath && typeof workspaceRootPath === 'string' && workspaceRootPath.trim().length > 0
        ? path.resolve(workspaceRootPath)
        : os.tmpdir();
    ensureDirectoryExists(defaultCwd);
    return defaultCwd;
  }

  if (typeof cwd !== 'string' || cwd.trim().length === 0) {
    throw new Error("Parameter 'cwd' for tool 'run_bash' must be a non-empty string when provided.");
  }

  const normalizedCwd = cwd.trim();
  if (!path.isAbsolute(normalizedCwd)) {
    throw new Error("Parameter 'cwd' for tool 'run_bash' must be an absolute path when provided. Omit 'cwd' to use the workspace root.");
  }

  const resolved = path.resolve(normalizedCwd);
  ensureDirectoryExists(resolved);
  return resolved;
}

export async function runBash(
  context: AgentContextLike | null,
  command: string,
  cwd?: string | null,
  timeoutSeconds: number = 30,
  background: boolean = false
): Promise<TerminalResult | RunBashBackgroundResult> {
  const resolvedCwd = resolveExecutionCwd(context, cwd);

  if (background) {
    const manager = getBackgroundManager(context);
    const processId = await manager.startProcess(command, resolvedCwd);
    return {
      mode: 'background',
      processId,
      command,
      status: 'started',
      startedAt: new Date().toISOString()
    };
  }

  const manager = new TerminalSessionManager();
  try {
    await manager.ensureStarted(resolvedCwd);
    return await manager.executeCommand(command, timeoutSeconds);
  } finally {
    await manager.close().catch(() => undefined);
  }
}

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'command',
  type: ParameterType.STRING,
  description: "Shell command to execute.",
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'cwd',
  type: ParameterType.STRING,
  description:
    "Optional working-directory path for this command. If provided, it must be an absolute filesystem path such as '/Users/alice/project' or '/tmp/scratch-task'. If omitted, the workspace root is used when available.",
  required: false
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'timeout_seconds',
  type: ParameterType.INTEGER,
  description: "Maximum execution time for a foreground command in seconds.",
  required: false,
  defaultValue: 30
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'background',
  type: ParameterType.BOOLEAN,
  description: "Whether to start the command asynchronously and return a process handle.",
  required: false,
  defaultValue: false
}));

const TOOL_NAME = 'run_bash';
let cachedTool: BaseTool | null = null;

export function registerRunBashTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description:
        'Execute a shell command in a working directory. If cwd is omitted, the workspace root is used. If cwd is provided, it must be an absolute path such as /Users/alice/project or /tmp/scratch-task.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'command', 'cwd', 'timeout_seconds', 'background']
    })(runBash) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
