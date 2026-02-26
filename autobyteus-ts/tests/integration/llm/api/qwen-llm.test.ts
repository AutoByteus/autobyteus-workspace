import { describe, it, expect } from 'vitest';
import { QwenLLM } from '../../../../src/llm/api/qwen-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.DASHSCOPE_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const buildModel = () =>
  new LLMModel({
    name: 'qwen3-max',
    value: 'qwen3-max',
    canonicalName: 'qwen3-max',
    provider: LLMProvider.QWEN
  });

runIntegration('QwenLLM Integration', () => {
  it('should successfully make a simple completion call', async () => {
    const llm = new QwenLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: 'Hello, Qwen LLM!' });

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
    const llm = new QwenLLM(buildModel());
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

  it('should support public sendUserMessage', async () => {
    const llm = new QwenLLM(buildModel());
    const userMessageText = 'Can you summarize the following text: The quick brown fox jumps over the lazy dog.';
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
    const llm = new QwenLLM(buildModel());
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
