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
  effectiveCwd: string;
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
  const hasWorkspaceRoot =
    workspaceRootPath && typeof workspaceRootPath === 'string' && workspaceRootPath.trim().length > 0;
  if (!path.isAbsolute(normalizedCwd) && !hasWorkspaceRoot) {
    throw new Error(
      "Parameter 'cwd' for tool 'run_bash' must be absolute when no workspace root is configured. Configure a workspace or pass an absolute path."
    );
  }

  const resolved = path.isAbsolute(normalizedCwd)
    ? path.resolve(normalizedCwd)
    : path.resolve(path.resolve(workspaceRootPath as string), normalizedCwd);
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
      startedAt: new Date().toISOString(),
      effectiveCwd: resolvedCwd
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
    "Optional working-directory path for this command. Absolute paths are allowed. Relative paths are resolved from the workspace root when available. If omitted, the workspace root is used when available. If a task targets a nested directory, pass that same cwd on every location-sensitive command in that directory, including pwd, git init, redirections, file creation, and scripts.",
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
        'Execute a shell command in a working directory. If cwd is omitted, the workspace root is used. If cwd is provided, it may be absolute or workspace-root-relative. For nested targets, reuse the same cwd on every command that should run there. The result includes effectiveCwd so you can confirm where the command actually ran.',
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
