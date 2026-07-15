import { describe, expect, it } from 'vitest';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import {
  WorkingContextCompactionOutputValidationError,
  WorkingContextCompactionOutputValidator,
} from '../../../src/memory/compaction/working-context-compaction-output-validator.js';
import { WorkingContext } from '../../../src/memory/working-context.js';

const validator = new WorkingContextCompactionOutputValidator();
const system = () => new Message(MessageRole.SYSTEM, { content: 'System', metadata: { stable: { yes: true } } });
const baseline = () => new WorkingContext([system(), new Message(MessageRole.USER, { content: 'old' })]);

const expectCode = (action: () => void, code: string) => {
  try {
    action();
    throw new Error('Expected validation to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(WorkingContextCompactionOutputValidationError);
    expect((error as WorkingContextCompactionOutputValidationError).code).toBe(code);
  }
};

describe('WorkingContextCompactionOutputValidator', () => {
  it('accepts unchanged head and complete multi-call native tool protocol', () => {
    const current = baseline();
    const input = current.copy();
    const next = new WorkingContext([
      system(),
      new Message(MessageRole.ASSISTANT, {
        tool_payload: new ToolCallPayload([
          { id: 'a', name: 'first', arguments: {}, nativeToolCallContext: { provider: 'anthropic', toolUseBlock: { id: 'a' } } },
          { id: 'b', name: 'second', arguments: { nested: { x: 1 } }, nativeToolCallContext: { provider: 'openai_responses', responseOutputItems: [{ id: 'b' }] } },
        ]),
      }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'first', { ok: true }) }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('b', 'second', ['done']) }),
      new Message(MessageRole.USER, { content: 'continue' }),
    ]);
    expect(() => validator.assertValid(current, input, next)).not.toThrow();
  });

  it('rejects the strategy input instance, even when its content is otherwise valid', () => {
    const current = baseline();
    const input = current.copy();
    expectCode(() => validator.assertValid(current, input, input), 'aliased-context');
  });

  it('compares the leading system run against the stable baseline', () => {
    const current = baseline();
    const input = current.copy();
    input.replaceMessage(0, new Message(MessageRole.SYSTEM, { content: 'mutated input' }));
    expectCode(
      () => validator.assertValid(current, input, new WorkingContext(input.buildMessages())),
      'changed-required-head',
    );
  });

  it('reports a stable message-shape invariant before comparing a malformed leading head', () => {
    const current = baseline();
    const malformed = new WorkingContext([
      { role: MessageRole.SYSTEM, content: 'System' } as Message,
    ]);

    expectCode(
      () => validator.assertValid(current, current.copy(), malformed),
      'invalid-message-shape',
    );
  });

  it.each([
    ['omitted', new WorkingContext([
      new Message(MessageRole.USER, { content: 'replacement' }),
    ])],
    ['reordered', new WorkingContext([
      new Message(MessageRole.SYSTEM, { content: 'System B' }),
      new Message(MessageRole.SYSTEM, { content: 'System A' }),
      new Message(MessageRole.USER, { content: 'replacement' }),
    ])],
  ])('keeps the head invariant for valid %s leading output', (_label, next) => {
    const current = new WorkingContext([
      new Message(MessageRole.SYSTEM, { content: 'System A' }),
      new Message(MessageRole.SYSTEM, { content: 'System B' }),
      new Message(MessageRole.USER, { content: 'old' }),
    ]);
    expectCode(
      () => validator.assertValid(current, current.copy(), next),
      'changed-required-head',
    );
  });

  it('rejects role/payload mismatches and invalid provider-native call context', () => {
    const current = baseline();
    const input = current.copy();
    const invalidRole = new WorkingContext([system(), new Message(MessageRole.USER, {
      tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]),
    })]);
    expectCode(() => validator.assertValid(current, input, invalidRole), 'invalid-message-shape');

    const invalidNative = new WorkingContext([system(), new Message(MessageRole.ASSISTANT, {
      tool_payload: new ToolCallPayload([{
        id: 'a',
        name: 'tool',
        arguments: {},
        nativeToolCallContext: { provider: 'unknown' } as any,
      }]),
    }), new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'tool', null) })]);
    expectCode(() => validator.assertValid(current, input, invalidNative), 'invalid-message-shape');
  });

  it.each([
    ['orphan result', [new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'tool', null) })]],
    ['partial batch', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]) }),
    ]],
    ['duplicate call id', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([
        { id: 'a', name: 'first', arguments: {} },
        { id: 'a', name: 'second', arguments: {} },
      ]) }),
    ]],
    ['blank call id', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([
        { id: '  ', name: 'tool', arguments: {} },
      ]) }),
    ]],
    ['ordinary message before result', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]) }),
      new Message(MessageRole.USER, { content: 'too soon' }),
    ]],
    ['duplicate result', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]) }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'tool', null) }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'tool', null) }),
    ]],
    ['mismatched tool name', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]) }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'other', null) }),
    ]],
  ])('rejects invalid tool protocol: %s', (_label, body) => {
    const current = baseline();
    expectCode(
      () => validator.assertValid(current, current.copy(), new WorkingContext([system(), ...body])),
      'invalid-tool-protocol',
    );
  });
});
