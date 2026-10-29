import { expect } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { liveProviderTest } from '../../../../../test-support/test-vault/test-vault.js';
import { anthropicSupportedModelDefinitions } from '../../../../src/llm/anthropic-supported-model-definitions.js';

const live = liveProviderTest('Anthropic');

live.describe('AnthropicLLM Integration', () => {
  const buildModel = () =>
    new LLMModel({
      name: 'claude-haiku-5-5',
      value: 'claude-haiku-5-5',
      canonicalName: 'claude-haiku-5-5',
      provider: LLMProvider.ANTHROPIC
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

  live.it('should filter logicalConversationId from public streamUserMessage provider requests', async () => {
    const llm = new AnthropicLLM(buildModel(), new LLMConfig());
    const userMessage = new LLMUserMessage({ content: 'Reply with exactly: OK' });
    const receivedTokens: string[] = [];

    try {
      for await (const chunk of llm.streamUserMessage(userMessage, {
        logicalConversationId: 'agent_probe'
      })) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
        }
      }

      expect(receivedTokens.join('').length).toBeGreaterThan(0);
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
