import { describe, it, expect } from 'vitest';
import { GrokLLM } from '../../../../src/llm/api/grok-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.GROK_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const buildModel = () =>
  new LLMModel({
    name: 'grok-4-1-fast-reasoning',
    value: 'grok-4-1-fast-reasoning',
    canonicalName: 'grok-4-1-fast-reasoning',
    provider: LLMProvider.GROK
  });

runIntegration('GrokLLM Integration', () => {
  it('should successfully make a simple completion call', async () => {
    const llm = new GrokLLM(buildModel());
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

  it('should stream response incrementally', async () => {
    const llm = new GrokLLM(buildModel());
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
