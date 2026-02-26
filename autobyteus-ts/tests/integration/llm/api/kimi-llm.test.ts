import { describe, it, expect } from 'vitest';
import { KimiLLM } from '../../../../src/llm/api/kimi-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.KIMI_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const buildModel = () =>
  new LLMModel({
    name: 'kimi-latest',
    value: 'kimi-latest',
    canonicalName: 'kimi-latest',
    provider: LLMProvider.KIMI
  });

runIntegration('KimiLLM Integration', () => {
  it('should successfully make a simple completion call', async () => {
    const llm = new KimiLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: "Hello, Kimi LLM! Please respond with 'pong'." });

    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('pong');
      expect(response.usage).toBeTruthy();
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream response incrementally', async () => {
    const llm = new KimiLLM(buildModel());
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

        if (chunk.is_complete) {
          expect(chunk.usage).toBeTruthy();
        }
      }

      expect(receivedTokens.length).toBeGreaterThan(1);
      expect(completeResponse.length).toBeGreaterThan(10);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public sendUserMessage', async () => {
    const llm = new KimiLLM(buildModel());
    const userMessageText = 'Who developed the programming language Python?';
    const userMessage = new LLMUserMessage({ content: userMessageText });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('guido van rossum');
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public streamUserMessage', async () => {
    const llm = new KimiLLM(buildModel());
    const userMessageText = 'Please list three popular web frameworks for Python.';
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

      expect(receivedTokens.length).toBeGreaterThan(1);
      expect(completeResponse.toLowerCase()).toContain('django');
      expect(completeResponse.toLowerCase()).toContain('flask');
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
