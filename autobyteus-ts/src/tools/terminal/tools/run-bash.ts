import { tool } from '../../functional-tool.js';
import type { BaseTool } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { TerminalResult } from '../types.js';
import { ShellCommandExecutor } from '../command-execution/shell-command-executor.js';
import { getBackgroundManager, type AgentContextLike } from '../background-process-context.js';
import { resolveExecutionCwd } from '../execution-cwd.js';

export { resolveExecutionCwd };
export type { AgentContextLike };

export async function runBash(
  context: AgentContextLike | null,
  command: string,
  cwd?: string | null,
  timeoutSeconds: number = 30
): Promise<TerminalResult> {
  const resolvedCwd = resolveExecutionCwd(context, cwd);
  const executor = new ShellCommandExecutor();
  return executor.execute(command, resolvedCwd, {
    timeoutSeconds,
    backgroundManager: getBackgroundManager(context)
  });
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
  description: "Maximum execution time for the command in seconds.",
  required: false,
  defaultValue: 30
}));

const TOOL_NAME = 'run_bash';
let cachedTool: BaseTool | null = null;

export function registerRunBashTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description:
        'Execute a stateless non-interactive bash command in a working directory. If cwd is omitted, the workspace root is used. If cwd is provided, it may be absolute or workspace-root-relative. Use normal shell syntax such as `command > log.txt 2>&1 &` for long-running background jobs; any live ordinary background descendants are returned as backgroundProcesses with PID identities. The result includes effectiveCwd so you can confirm where the command actually ran.',
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'command', 'cwd', 'timeout_seconds']
    })(runBash) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
