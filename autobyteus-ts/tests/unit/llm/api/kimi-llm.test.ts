import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KimiLLM } from '../../../../src/llm/api/kimi-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../../src/llm/utils/messages.js';

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('openai', () => {
  const OpenAI = vi.fn();
  OpenAI.prototype.chat = {
    completions: {
      create: mockCreate
    }
  };
  return { OpenAI };
});

const buildModel = (value = 'kimi-k2.6') =>
  new LLMModel({
    name: value,
    value,
    canonicalName: value,
    provider: LLMProvider.KIMI
  });

describe('KimiLLM', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.KIMI_API_KEY = 'kimi-test-key';
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
      usage: {
        prompt_tokens: 1,
        completion_tokens: 1,
        total_tokens: 2
      }
    });
  });

  it('defaults to the retained kimi-k2.6 model', async () => {
    const llm = new KimiLLM();

    await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
      new Message(MessageRole.USER, { content: 'Say pong.' })
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.6',
      temperature: 1
    });
  });

  it('disables thinking for kimi-k2.6 tool requests when no explicit thinking override is provided', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2.6'));

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a tool-using assistant.' }),
        new Message(MessageRole.USER, { content: 'Call echo_number with 42.' })
      ],
      null,
      {
        tools: [
          {
            type: 'function',
            function: {
              name: 'echo_number',
              parameters: {
                type: 'object',
                properties: { number: { type: 'number' } },
                required: ['number']
              }
            }
          }
        ],
        tool_choice: 'required'
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.6',
      tool_choice: 'required',
      temperature: 0.6,
      thinking: { type: 'disabled' }
    });
  });

  it('disables thinking for kimi-k2.6 continuation turns that include tool messages', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2.6'));

    await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a tool-using assistant.' }),
      new Message(MessageRole.USER, { content: 'Call echo_number with number 42, then wait for tool results.' }),
      new Message(MessageRole.ASSISTANT, {
        content: null,
        tool_payload: new ToolCallPayload([
          {
            id: 'echo_number:0',
            name: 'echo_number',
            arguments: { number: 42 }
          }
        ])
      }),
      new Message(MessageRole.TOOL, {
        content: null,
        tool_payload: new ToolResultPayload('echo_number:0', 'echo_number', { number: 42, ok: true })
      }),
      new Message(MessageRole.USER, {
        content: 'All tool results are available. Provide one short final sentence.'
      })
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.6',
      temperature: 0.6,
      thinking: { type: 'disabled' }
    });
  });

  it('preserves explicit thinking kwargs on kimi-k2.6 tool requests', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2.6'));

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a tool-using assistant.' }),
        new Message(MessageRole.USER, { content: 'Call echo_number with 42.' })
      ],
      null,
      {
        tools: [
          {
            type: 'function',
            function: {
              name: 'echo_number',
              parameters: {
                type: 'object',
                properties: { number: { type: 'number' } },
                required: ['number']
              }
            }
          }
        ],
        thinking: { type: 'enabled' }
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.6',
      temperature: 0.6,
      thinking: { type: 'enabled' }
    });
  });

  it('uses Kimi provider-safe default temperature for kimi-k2.6 non-tool requests', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2.6'));

    await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
      new Message(MessageRole.USER, { content: 'Say pong.' })
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.6',
      temperature: 1
    });
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('thinking');
  });

  it('preserves explicit per-request temperature kwargs for kimi-k2.6', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2.6'));

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
        new Message(MessageRole.USER, { content: 'Say pong.' })
      ],
      null,
      { temperature: 0.9 }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.6',
      temperature: 0.9
    });
  });

  it('does not auto-disable thinking for kimi-k2-thinking', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2-thinking'));

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a tool-using assistant.' }),
        new Message(MessageRole.USER, { content: 'Call echo_number with 42.' })
      ],
      null,
      {
        tools: [
          {
            type: 'function',
            function: {
              name: 'echo_number',
              parameters: {
                type: 'object',
                properties: { number: { type: 'number' } },
                required: ['number']
              }
            }
          }
        ]
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('thinking');
  });
});
