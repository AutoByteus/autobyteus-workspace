import { BaseTool, type ToolExecutionOptions, type ToolExecutionPreparation } from '../../tools/base-tool.js';
import { ToolDefinition } from '../../tools/registry/tool-definition.js';
import { ToolOrigin } from '../../tools/tool-origin.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../utils/parameter-schema.js';
import { ToolInvocation } from '../tool-invocation.js';

/**
 * The call-tool contract: a searchable tool's definition is not in the agent's requests, so the
 * model calls it through the declared `call_tool` with `{name, arguments}`. This file owns that
 * name, its schema and both directions of the conversion. Only the conversation sent back to the
 * model keeps the model's form; everything else sees the real tool.
 */
export const CALL_TOOL_NAME = 'call_tool';

export const TOOL_SEARCH_CATEGORY = 'tool_search';

const CALL_TOOL_DESCRIPTION =
  "Call a tool that search_tools found. name: the tool's exact name; arguments: an object matching that tool's argument schema.";

const callToolArgumentSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({
    name: 'name',
    type: ParameterType.STRING,
    description: "The found tool's exact name.",
    required: true,
  }),
  new ParameterDefinition({
    name: 'arguments',
    type: ParameterType.OBJECT,
    description: "The found tool's arguments, as its argument schema describes them.",
    required: true,
  }),
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** What keeps `args` from being exactly `{name: <non-empty string>, arguments: <object>}`; empty when it is. */
const callArgumentProblems = (args: Record<string, unknown>): string[] => {
  const problems: string[] = [];
  const { name } = args;
  if (typeof name !== 'string' || !name.trim()) problems.push('"name" is missing or not a tool name');
  else if (name !== name.trim()) problems.push('"name" has spaces around it');
  if (!isPlainObject(args.arguments)) problems.push('"arguments" is missing or not an object');
  const otherKeys = Object.keys(args).filter((key) => key !== 'name' && key !== 'arguments');
  if (otherKeys.length) problems.push(`it has other keys (${otherKeys.join(', ')})`);
  return problems;
};

/**
 * Model → real. A `call_tool` call whose arguments are exactly `{name, arguments}` becomes an
 * invocation of that tool with the same id, marked `calledThrough: 'call_tool'`; any other call
 * returns `null` and stays a `call_tool` invocation. The exact shape keeps the model's form
 * derivable from the real invocation without loss (`toModelToolCall`).
 */
export const toCalledToolInvocation = (invocation: ToolInvocation): ToolInvocation | null => {
  if (invocation.name !== CALL_TOOL_NAME || invocation.argumentsParseError !== null) return null;
  if (callArgumentProblems(invocation.arguments).length) return null;
  return new ToolInvocation(
    invocation.arguments.name as string,
    invocation.arguments.arguments as Record<string, unknown>,
    invocation.id,
    invocation.turnId,
    invocation.nativeToolCallContext,
    { calledThrough: CALL_TOOL_NAME },
  );
};

/** The name of the tool the model called: the real tool's, or `call_tool` when it was called through it. */
export const toModelToolName = (toolName: string, calledThrough: string | null): string => {
  if (calledThrough === null) return toolName;
  if (calledThrough === CALL_TOOL_NAME) return CALL_TOOL_NAME;
  throw new Error(`Tool '${toolName}' was called through an unknown tool '${calledThrough}'.`);
};

/** Real → the model's form: the call as the model made it. Identity when `calledThrough` is null. */
export const toModelToolCall = (
  toolName: string,
  args: Record<string, unknown>,
  calledThrough: string | null,
): { name: string; arguments: Record<string, unknown> } => calledThrough === null
  ? { name: toolName, arguments: args }
  : { name: toModelToolName(toolName, calledThrough), arguments: { name: toolName, arguments: args } };

/**
 * The `call_tool` tool. A well-formed call never reaches it: it is converted at stream end. So a
 * call that does reach it is malformed: it takes the arguments as they are (no schema check, which
 * would answer without saying how to call) and fails with how to call.
 */
export class CallTool extends BaseTool {
  static getName(): string {
    return CALL_TOOL_NAME;
  }

  static getDescription(): string {
    return CALL_TOOL_DESCRIPTION;
  }

  static getArgumentSchema(): ParameterSchema {
    return callToolArgumentSchema();
  }

  override async prepareExecution(
    _context: unknown,
    args: Record<string, unknown> = {},
    _options: ToolExecutionOptions = {},
  ): Promise<ToolExecutionPreparation<Record<string, unknown>>> {
    return { toolName: CALL_TOOL_NAME, args, resultExecutionMode: 'in_process' };
  }

  protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<never> {
    const problems = callArgumentProblems(args);
    throw new Error(
      `call_tool ran no tool: ${problems.join('; ')}. Call it with exactly ` +
      `{"name": "<the tool's exact name>", "arguments": {<the tool's arguments>}}; ` +
      'find the tool and its argument schema with search_tools.',
    );
  }
}

export const buildCallToolDefinition = (): ToolDefinition => new ToolDefinition(
  CALL_TOOL_NAME,
  CALL_TOOL_DESCRIPTION,
  ToolOrigin.LOCAL,
  TOOL_SEARCH_CATEGORY,
  callToolArgumentSchema,
  () => null,
  { toolClass: CallTool },
);
