import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeepSeekLLM as ProductionDeepSeekLLM } from '../../../../src/llm/api/deepseek-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
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

const buildModel = () =>
  new LLMModel({
    name: 'deepseek-v4-flash',
    value: 'deepseek-v4-flash',
    canonicalName: 'deepseek-v4-flash',
    provider: LLMProvider.DEEPSEEK
  });

class DeepSeekLLM extends ProductionDeepSeekLLM {
  constructor(model: LLMModel, config = new LLMConfig()) {
    super(model, llmApiKeyContext(config, 'synthetic-deepseek-key'));
  }
}

const userMessages = [new Message(MessageRole.USER, { content: 'Hello, DeepSeek.' })];

describe('DeepSeekLLM request normalization', () => {
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

  it('maps flat thinking_type to root thinking.type without leaking raw thinking fields', async () => {
    const callerExtraParams = {
      reasoning_effort: 'high',
      thinking_type: 'enabled',
      thinking: { type: 'disabled' },
      extra_body: {
        trace_id: 'trace-1',
        thinking: { provider_note: 'preserve' }
      }
    };
    const originalExtraParams = JSON.parse(JSON.stringify(callerExtraParams));

    const llm = new DeepSeekLLM(
      buildModel(),
      new LLMConfig({
        extraParams: callerExtraParams
      })
    );

    await llm.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.reasoning_effort).toBe('high');
    expect(params.thinking).toEqual({ type: 'enabled' });
    expect(params.extra_body).toEqual({
      trace_id: 'trace-1'
    });
    expect(params).not.toHaveProperty('thinking_type');
    expect(callerExtraParams).toEqual(originalExtraParams);
    expect(llm.config.extraParams).not.toBe(callerExtraParams);
    expect(llm.config.extraParams.extra_body).not.toBe(callerExtraParams.extra_body);
  });

  it('maps disabled thinking without sending OpenAI-style none effort', async () => {
    const llm = new DeepSeekLLM(
      buildModel(),
      new LLMConfig({
        extraParams: {
          thinking_type: 'disabled',
          reasoning_effort: 'high'
        }
      })
    );

    await llm.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.thinking).toEqual({ type: 'disabled' });
    expect(params).not.toHaveProperty('extra_body');
    expect(params).not.toHaveProperty('reasoning_effort');
    expect(params.reasoning_effort).not.toBe('none');
    expect(params).not.toHaveProperty('thinking_type');
  });
});
