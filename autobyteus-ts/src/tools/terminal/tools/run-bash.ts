import { tool } from '../../functional-tool.js';
import type { BaseTool, ToolExecutionOptions } from '../../base-tool.js';
import { ToolCategory } from '../../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { defaultToolRegistry } from '../../registry/tool-registry.js';
import { TerminalResult, type BackgroundCommandStarted } from '../types.js';
import { getBackgroundManager, type AgentContextLike } from '../background-process-context.js';
import { resolveExecutionCwd } from '../execution-cwd.js';

export { resolveExecutionCwd };
export type { AgentContextLike };

export async function runBash(
  context: AgentContextLike | null,
  command: string,
  cwd?: string | null,
  timeoutSeconds: number = 30,
  runInBackground: boolean = false,
  executionOptions: ToolExecutionOptions = {}
): Promise<TerminalResult | BackgroundCommandStarted> {
  const resolvedCwd = resolveExecutionCwd(context, cwd);
  const manager = getBackgroundManager(context);
  if (runInBackground) {
    const { call, started } = await manager.run(command, resolvedCwd, { background: true, signal: executionOptions.signal });
    const task = started[0];
    if (!task) throw new Error(`Background command did not start: ${(call.stderr || 'no start reported').trim()}`);
    return { pid: task.pid, status: 'running', effectiveCwd: resolvedCwd, outputFile: task.outputFile };
  }
  // Ends of this agent's background tasks seen during this call are reported here, not in a later notice.
  const mark = manager.markCallStart();
  const { call, started } = await manager.run(command, resolvedCwd, {
    background: false, timeoutSeconds, signal: executionOptions.signal });
  const ended = await manager.takeEndsSince(mark);
  return new TerminalResult(call.stdout, call.stderr, call.exitCode, call.timedOut, resolvedCwd, started, ended);
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
  description: 'Optional working directory for the command.',
  required: false
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'timeout_seconds',
  type: ParameterType.INTEGER,
  description: "Maximum time in seconds for the command's foreground part. Does not apply with run_in_background.",
  required: false,
  defaultValue: 30
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'run_in_background',
  type: ParameterType.BOOLEAN,
  description: 'Run the command in the background: the call returns at once with its pid and outputFile, and you are notified when it ends.',
  required: false,
  defaultValue: false
}));

const TOOL_NAME = 'run_bash';
let cachedTool: BaseTool | null = null;

export function registerRunBashTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: [
        'Execute a non-interactive bash command in a working directory. Any provided cwd must be an absolute path to an existing accessible local directory, including one outside the workspace. If cwd is omitted, the workspace root is used when available, otherwise the system temporary directory. cwd applies only to this invocation and does not change workspace identity or persist across calls. The result includes effectiveCwd so you can confirm where the command actually ran.',
        'For long-running work (builds, test suites, dev servers) set run_in_background: the call returns at once with the command\'s pid and outputFile, and when it ends you are told its exit code (or signal) and last output lines, without polling. Read its output with `tail -n 50 <outputFile>` and stop it with `kill <pid>`, which stops everything the command started.',
        'An `&` job of a foreground command that is still running when the foreground part ends is a background task too: the call returns, the result lists it in backgroundTasksStarted, and you are told when it ends. `kill <pid>` on such a job stops that process only; use run_in_background when you need to stop a command together with the processes it starts. Tasks started by one call share its outputFile. A background task that ends while one of your run_bash calls runs is reported in that call\'s backgroundTasksEnded instead of a later notice. Processes that detach themselves (nohup, setsid, disown) are not tracked. Background commands are stopped and their output files removed when your run ends.',
      ].join('\n\n'),
      argumentSchema,
      category: ToolCategory.SYSTEM,
      paramNames: ['context', 'command', 'cwd', 'timeout_seconds', 'run_in_background', 'executionOptions']
    })(runBash) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
