import { expect } from 'vitest';
import { GrokLLM } from '../../../../src/llm/api/grok-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { liveProviderTest } from '../../../../../test-support/test-vault/test-vault.js';

const live = liveProviderTest('Grok');

const buildModel = () =>
  new LLMModel({
    name: 'grok-4.7',
    value: 'grok-4.7',
    canonicalName: 'grok-4.7',
    provider: LLMProvider.GROK
  });

live.describe('GrokLLM Integration', () => {
  live.it('should successfully make a simple completion call', async () => {
    const llm = new GrokLLM(buildModel(), new LLMConfig());
    const userMessage = new LLMUserMessage({ content: 'Say hello in five words.' });

    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      const wordCount = response.content.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(0);
      expect(wordCount).toBeLessThanOrEqual(10);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  live.it('should stream response incrementally', async () => {
    const llm = new GrokLLM(buildModel(), new LLMConfig());
    const userMessage = new LLMUserMessage({ content: 'List three colors.' });
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
});
