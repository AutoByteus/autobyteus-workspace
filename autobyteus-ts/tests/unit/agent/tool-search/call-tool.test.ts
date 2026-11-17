import { describe, expect, it } from 'vitest';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import {
  CALL_TOOL_NAME,
  CallTool,
  buildCallToolDefinition,
  toCalledToolInvocation,
  toModelToolCall,
  toModelToolName,
} from '../../../../src/agent/tool-search/call-tool.js';
import { ToolSchemaProvider } from '../../../../src/tools/usage/providers/tool-schema-provider.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const nativeContext = { provider: 'anthropic', block: { type: 'tool_use' } } as never;
const callToolInvocation = (args: Record<string, unknown>, options: { argumentsParseError?: string | null } = {}) =>
  new ToolInvocation(CALL_TOOL_NAME, args, 'call_1', 'turn_1', nativeContext, options);

describe('call-tool contract: model → real (toCalledToolInvocation)', () => {
  it('turns a call_tool call of exactly {name, arguments} into the real invocation with the same id', () => {
    const real = toCalledToolInvocation(callToolInvocation({
      name: 'update_task',
      arguments: { task_id: 'autobyteus-77', status: 'DONE' },
    }));

    expect(real).not.toBeNull();
    expect(real!.name).toBe('update_task');
    expect(real!.arguments).toEqual({ task_id: 'autobyteus-77', status: 'DONE' });
    expect(real!.id).toBe('call_1');
    expect(real!.turnId).toBe('turn_1');
    expect(real!.calledThrough).toBe(CALL_TOOL_NAME);
    expect(real!.nativeToolCallContext).toBe(nativeContext);
    expect(real!.argumentsParseError).toBeNull();
  });

  it.each([
    ['no name', { arguments: {} }],
    ['an empty name', { name: '  ', arguments: {} }],
    ['a name with spaces around it', { name: ' update_task', arguments: {} }],
    ['a name that is not a string', { name: 7, arguments: {} }],
    ['no arguments', { name: 'update_task' }],
    ['arguments that are a string', { name: 'update_task', arguments: '{"task_id":"x"}' }],
    ['arguments that are an array', { name: 'update_task', arguments: [] }],
    ['arguments that are null', { name: 'update_task', arguments: null }],
    ['another key', { name: 'update_task', arguments: {}, reason: 'close it' }],
  ])('keeps a call_tool call with %s as a call_tool invocation', (_label, args) => {
    expect(toCalledToolInvocation(callToolInvocation(args as Record<string, unknown>))).toBeNull();
  });

  it('never converts a call whose arguments could not be parsed, nor a call of another tool', () => {
    expect(toCalledToolInvocation(callToolInvocation({}, { argumentsParseError: 'Unexpected end of JSON input' }))).toBeNull();
    expect(toCalledToolInvocation(new ToolInvocation('update_task', { name: 'x', arguments: {} }, 'call_2', 'turn_1'))).toBeNull();
  });
});

describe('call-tool contract: real → the model form (toModelToolCall)', () => {
  it('is the identity for a direct call', () => {
    expect(toModelToolCall('read_file', { path: 'a.txt' }, null)).toEqual({ name: 'read_file', arguments: { path: 'a.txt' } });
    expect(toModelToolName('read_file', null)).toBe('read_file');
  });

  it('rebuilds exactly what the model sent for a call through call_tool (the conversion round-trips)', () => {
    const modelArgs = { name: 'update_task', arguments: { task_id: 'autobyteus-77', status: 'DONE' } };
    const real = toCalledToolInvocation(callToolInvocation(structuredClone(modelArgs)))!;

    expect(toModelToolCall(real.name, real.arguments, real.calledThrough)).toEqual({ name: CALL_TOOL_NAME, arguments: modelArgs });
    expect(toModelToolName(real.name, real.calledThrough)).toBe(CALL_TOOL_NAME);
  });

  it('refuses a marker it does not know', () => {
    expect(() => toModelToolName('update_task', 'proxy_tool')).toThrow(/unknown tool 'proxy_tool'/);
  });
});

describe('the call_tool tool', () => {
  it('answers a call that reached it (a malformed one) with how to call, without checking a schema first', async () => {
    const tool = new CallTool();
    const preparation = await tool.prepareExecution({}, { arguments: 'x', extra: 1 });
    expect(preparation).toEqual({ toolName: CALL_TOOL_NAME, args: { arguments: 'x', extra: 1 }, resultExecutionMode: 'in_process' });

    await expect(tool.execute({}, { arguments: 'x', extra: 1 })).rejects.toThrow(
      'call_tool ran no tool: "name" is missing or not a tool name; "arguments" is missing or not an object; it has other keys (extra). ' +
      'Call it with exactly {"name": "<the tool\'s exact name>", "arguments": {<the tool\'s arguments>}}; find the tool and its argument schema with search_tools.',
    );
  });

  it('declares name and a free-form arguments object, open on every provider format', () => {
    const [openAi] = new ToolSchemaProvider().formatDefinitions([buildCallToolDefinition()], LLMProvider.DEEPSEEK);
    const parameters = (openAi.function as Record<string, any>).parameters;
    expect(parameters.required).toEqual(['name', 'arguments']);
    expect(parameters.additionalProperties).toBe(false);
    expect(parameters.properties.name.type).toBe('string');
    expect(parameters.properties.arguments.type).toBe('object');
    expect(parameters.properties.arguments).not.toHaveProperty('additionalProperties');

    const [anthropic] = new ToolSchemaProvider().formatDefinitions([buildCallToolDefinition()], LLMProvider.ANTHROPIC);
    expect((anthropic.input_schema as Record<string, any>).properties.arguments).toEqual({
      type: 'object', description: "The found tool's arguments, as its argument schema describes them.",
    });
  });
});
