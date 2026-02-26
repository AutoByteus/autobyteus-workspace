import { describe, it, expect } from 'vitest';
import { ZhipuLLM } from '../../../../src/llm/api/zhipu-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.ZHIPU_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const buildModel = () =>
  new LLMModel({
    name: 'glm-4.7',
    value: 'glm-4.7',
    canonicalName: 'glm-4.7',
    provider: LLMProvider.ZHIPU
  });

runIntegration('ZhipuLLM Integration', () => {
  it('should successfully make a simple completion call', async () => {
    const llm = new ZhipuLLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'Hello, Zhipu LLM! Please respond with a short greeting.'
    });

    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream response incrementally', async () => {
    const llm = new ZhipuLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: 'Please write a short two-sentence greeting.' });
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

  it('should support public sendUserMessage', async () => {
    const llm = new ZhipuLLM(buildModel());
    const userMessageText = 'Can you summarize the origin of the Python programming language?';
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

  it('should support public streamUserMessage', async () => {
    const llm = new ZhipuLLM(buildModel());
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
