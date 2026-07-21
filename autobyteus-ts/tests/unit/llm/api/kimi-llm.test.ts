import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KimiLLM as ProductionKimiLLM } from '../../../../src/llm/api/kimi-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../../src/llm/utils/messages.js';
import { llmApiKeyContext } from '../../explicit-auth-test-helpers.js';

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

class KimiLLM extends ProductionKimiLLM {
  constructor(model = buildModel(), config = new LLMConfig()) {
    super(model, llmApiKeyContext(config, 'synthetic-kimi-key'));
  }
}

describe('KimiLLM', () => {
  beforeEach(() => {
    mockCreate.mockReset();
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


  it('returns Kimi thinking reasoning_content for kimi-k2.6 responses', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: 'assistant',
            reasoning_content: 'I should explain the arithmetic invariant.',
            content: '1 + 1 = 2 because adding one item to one item yields two items.'
          }
        }
      ],
      usage: {
        prompt_tokens: 3,
        completion_tokens: 5,
        total_tokens: 8
      }
    });
    const llm = new KimiLLM(buildModel('kimi-k2.6'));

    const response = await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
      new Message(MessageRole.USER, { content: 'Why is 1+1=2?' })
    ]);

    expect(response.reasoning).toBe('I should explain the arithmetic invariant.');
    expect(response.content).toContain('1 + 1 = 2');
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.6',
      temperature: 1
    });
  });

  it('streams Kimi thinking reasoning_content for kimi-k2.7-code responses', async () => {
    mockCreate.mockResolvedValueOnce((async function* () {
      yield { choices: [{ delta: { reasoning_content: 'Plan the implementation. ' } }] };
      yield { choices: [{ delta: { reasoning_content: 'Then return code.' } }] };
      yield { choices: [{ delta: { content: 'function add(a, b) { return a + b; }' } }] };
      yield {
        choices: [],
        usage: {
          prompt_tokens: 4,
          completion_tokens: 6,
          total_tokens: 10
        }
      };
    })());
    const llm = new KimiLLM(buildModel('kimi-k2.7-code'));

    const chunks = [];
    for await (const chunk of llm.streamMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a coding assistant.' }),
      new Message(MessageRole.USER, { content: 'Write an add function.' })
    ])) {
      chunks.push(chunk);
    }

    expect(chunks.map((chunk) => chunk.reasoning).filter(Boolean).join('')).toBe(
      'Plan the implementation. Then return code.'
    );
    expect(chunks.map((chunk) => chunk.content).filter(Boolean).join('')).toContain('function add');
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.7-code',
      temperature: 1.0,
      stream: true
    });
  });

  it('normalizes kimi-k2.7-code-highspeed no-custom-temperature requests to the fixed provider temperature', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2.7-code-highspeed'));

    await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a coding assistant.' }),
      new Message(MessageRole.USER, { content: 'Say pong.' })
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.7-code-highspeed',
      temperature: 1.0
    });
  });

  it('keeps kimi-k2.7-code thinking on and normalizes provider-fixed request parameters', async () => {
    const llm = new KimiLLM(
      buildModel('kimi-k2.7-code'),
      new LLMConfig({
        temperature: 0.7,
        topP: 0.5,
        presencePenalty: 0.8,
        frequencyPenalty: 0.9,
        extraParams: {
          thinking: { type: 'disabled' },
          n: 2
        }
      })
    );

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a coding assistant.' }),
        new Message(MessageRole.USER, { content: 'Write a small TypeScript function.' })
      ],
      null,
      {
        temperature: 0.2,
        top_p: 0.1,
        presence_penalty: 1.0,
        frequency_penalty: 1.0,
        n: 3,
        thinking: { type: 'disabled' }
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.7-code',
      temperature: 1.0,
      top_p: 0.95,
      n: 1,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      thinking: { type: 'enabled' }
    });
  });

  it('normalizes explicit invalid kimi-k2.7-code-highspeed sampling values to fixed provider constraints', async () => {
    const llm = new KimiLLM(
      buildModel('kimi-k2.7-code-highspeed'),
      new LLMConfig({
        temperature: 0.7,
        topP: 0.5,
        presencePenalty: 0.8,
        frequencyPenalty: 0.9,
        extraParams: {
          thinking: { type: 'disabled' },
          n: 2
        }
      })
    );

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a coding assistant.' }),
        new Message(MessageRole.USER, { content: 'Write a small TypeScript function.' })
      ],
      null,
      {
        temperature: 0.2,
        top_p: 0.1,
        presence_penalty: 1.0,
        frequency_penalty: 1.0,
        n: 3,
        thinking: { type: 'disabled' }
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.7-code-highspeed',
      temperature: 1.0,
      top_p: 0.95,
      n: 1,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      thinking: { type: 'enabled' }
    });
  });

  it('does not auto-disable thinking for kimi-k2.7-code tool requests and coerces invalid tool choice', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2.7-code'));

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a tool-using coding assistant.' }),
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
      model: 'kimi-k2.7-code',
      temperature: 1.0,
      tool_choice: 'auto'
    });
    expect(mockCreate.mock.calls[0]?.[0]).not.toMatchObject({
      thinking: { type: 'disabled' }
    });
  });

  it('coerces kimi-k2.7-code forced function-object tool choices to auto', async () => {
    const llm = new KimiLLM(buildModel('kimi-k2.7-code'));

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a tool-using coding assistant.' }),
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
        tool_choice: { type: 'function', function: { name: 'echo_number' } }
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k2.7-code',
      temperature: 1.0,
      tool_choice: 'auto'
    });
  });
});
