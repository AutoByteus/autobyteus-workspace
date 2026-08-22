import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KimiLLM } from '../../../../src/llm/api/kimi-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('openai', () => {
  const OpenAI = vi.fn();
  OpenAI.prototype.chat = { completions: { create: mockCreate } };
  return { OpenAI };
});

const buildModel = () => new LLMModel({
  name: 'kimi-k3',
  value: 'kimi-k3',
  canonicalName: 'kimi-k3',
  provider: LLMProvider.KIMI,
});

describe('KimiLLM K3 request policy', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  });

  it('always enables K3 thinking and uses the configured reasoning effort', async () => {
    const llm = new KimiLLM(buildModel(), new LLMConfig({
      extraParams: { reasoning_effort: 'low', thinking_type: 'disabled' },
    }), providerApiKeyResolver());

    await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are helpful.' }),
      new Message(MessageRole.USER, { content: 'Say pong.' }),
    ]);

    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k3',
      thinking: { type: 'enabled', reasoning_effort: 'low' },
    });
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('thinking_type');
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('reasoning_effort');
  });

  it('falls back to max for unsupported request effort values', async () => {
    const llm = new KimiLLM(buildModel(), new LLMConfig(), providerApiKeyResolver());
    await llm.sendMessages([
      new Message(MessageRole.USER, { content: 'Say pong.' }),
    ], null, { reasoning_effort: 'medium' });

    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'kimi-k3',
      thinking: { type: 'enabled', reasoning_effort: 'max' },
    });
  });
});
