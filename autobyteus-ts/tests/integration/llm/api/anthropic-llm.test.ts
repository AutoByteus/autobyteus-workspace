import { expect } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { liveProviderTest } from '../../../../../test-support/test-vault/test-vault.js';
import { anthropicSupportedModelDefinitions } from '../../../../src/llm/anthropic-supported-model-definitions.js';
import { LLMFactory } from '../../../../src/llm/llm-factory.js';

const live = liveProviderTest('Anthropic');

live.describe('AnthropicLLM Integration', () => {
  const buildModel = () =>
    new LLMModel({
      name: 'claude-haiku-5-5',
      value: 'claude-haiku-5-5',
      canonicalName: 'claude-haiku-5-5',
      provider: LLMProvider.ANTHROPIC,
      maxOutputTokens: 128_000
    });

  live.it('should successfully make a simple completion call', async () => {
    const llm = new AnthropicLLM(buildModel(), new LLMConfig());
    const userMessage = new LLMUserMessage({ content: 'Hello, Claude LLM!' });
    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  live.it('should stream response incrementally', async () => {
    const llm = new AnthropicLLM(buildModel(), new LLMConfig());
    const userMessage = new LLMUserMessage({ content: 'Please write a short greeting.' });
    const receivedTokens: string[] = [];
    let completeResponse = '';

    try {
      for await (const chunk of (llm as any)._streamUserMessageToLLM(userMessage, {})) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
          completeResponse += chunk.content;
        }
      }

      expect(receivedTokens.length).toBeGreaterThan(0);
      expect(completeResponse.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  live.it('should support public sendUserMessage', async () => {
    const llm = new AnthropicLLM(buildModel(), new LLMConfig());
    const userMessageText = 'Can you summarize the following text: The sun always shines in California.';
    const userMessage = new LLMUserMessage({ content: userMessageText });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  live.it('should support public streamUserMessage', async () => {
    const llm = new AnthropicLLM(buildModel(), new LLMConfig());
    const userMessageText = 'Please list three benefits of using Python.';
    const userMessage = new LLMUserMessage({ content: userMessageText });
    const receivedTokens: string[] = [];
    let completeResponse = '';

    try {
      for await (const chunk of llm.streamUserMessage(userMessage)) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
          completeResponse += chunk.content;
        }
      }

      expect(receivedTokens.length).toBeGreaterThan(0);
      expect(completeResponse.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});

/**
 * Every catalog Claude row accepts an explicit effort (`output_config.effort`) at the highest level
 * with thinking on. Rows with a thinking switch also accept thinking off with a stored `max`: off
 * sends the off shape and no effort. A stored config key no schema declares (a saved run's
 * `thinking_display`) is never sent. Anthropic rejecting a request fails the case.
 */
live.describe('AnthropicLLM effort per catalog model', () => {
  const effortCases = anthropicSupportedModelDefinitions.flatMap((definition) => {
    const properties = (definition.configSchema?.toJsonSchema() as { properties?: Record<string, unknown> } | undefined)
      ?.properties ?? {};
    const hasSwitch = 'thinking_enabled' in properties;
    return [
      { label: 'effort on', definition, extraParams: hasSwitch ? { thinking_enabled: true, reasoning_effort: 'max' } : { reasoning_effort: 'max' } },
      ...(hasSwitch ? [{ label: 'thinking off', definition, extraParams: { thinking_enabled: false, reasoning_effort: 'max' } }] : []),
      { label: 'stored config', definition, extraParams: { ...(hasSwitch ? { thinking_enabled: true } : {}), reasoning_effort: 'high', thinking_display: 'summarized' } },
    ];
  });

  for (const { label, definition, extraParams } of effortCases) {
    live.it(`${label}: accepts ${JSON.stringify(extraParams)} on ${definition.value}`, async () => {
      const llm = new AnthropicLLM(new LLMModel(definition), new LLMConfig({ maxTokens: 2048, extraParams }));
      try {
        const response = await llm.sendUserMessage(new LLMUserMessage({ content: 'Reply with exactly: OK' }));
        expect(response).toBeInstanceOf(CompleteResponse);
      } finally {
        await llm.cleanup();
      }
    }, 180000);
  }
});

/**
 * Stored Off and stored stale keys through the factory, as a run activation builds the adapter
 * (AC-001, AC-002, AC-004). Thinking Off must really turn thinking off: the response reports no
 * thinking tokens. The prompt is the probe's (evidence/probe-results-2026-11-10.md, PRB-A2); a
 * thinking model spends thinking tokens on it, an Off row does not.
 */
live.describe('AnthropicLLM stored thinking choices through the factory', () => {
  const PROMPT = 'Is 391 prime? Answer yes or no with the factorization, one line.';
  const ask = async (modelIdentifier: string, stored: Record<string, unknown>) => {
    const llm = await LLMFactory.createLLM(modelIdentifier, { max_tokens: 2000, ...stored });
    try {
      const response = await llm.sendUserMessage(new LLMUserMessage({ content: PROMPT }));
      expect(response).toBeInstanceOf(CompleteResponse);
      return response;
    } finally {
      await llm.cleanup();
    }
  };

  for (const modelIdentifier of ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-5-5']) {
    live.it(`Off with a stored effort turns thinking off on ${modelIdentifier} (AC-001, AC-004)`, async () => {
      const response = await ask(modelIdentifier, { thinking_enabled: false, reasoning_effort: 'max' });
      expect(response.usage?.reasoning_output_tokens ?? 0).toBe(0);
    }, 180000);
  }

  live.it('Off with a stored effort is accepted on claude-sonnet-5-5 (between_tools) (AC-004)', async () => {
    const response = await ask('claude-sonnet-5-5', { thinking_enabled: false, reasoning_effort: 'xhigh' });
    expect(response.content.length).toBeGreaterThan(0);
  }, 180000);

  for (const modelIdentifier of ['claude-fable-5', 'claude-fable-5-1']) {
    live.it(`a stored Off switch and effort resume on ${modelIdentifier} without failing (AC-002)`, async () => {
      const response = await ask(modelIdentifier, { thinking_enabled: false, reasoning_effort: 'max', thinking_display: 'summarized' });
      expect(response.content.length).toBeGreaterThan(0);
    }, 180000);
  }
});
