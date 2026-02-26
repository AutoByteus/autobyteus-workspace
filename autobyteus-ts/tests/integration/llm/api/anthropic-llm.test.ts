import { describe, it, expect } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.ANTHROPIC_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

runIntegration('AnthropicLLM Integration', () => {
  const buildModel = () =>
    new LLMModel({
      name: 'claude-4.5-sonnet',
      value: 'claude-sonnet-4-5-20250929',
      canonicalName: 'claude-4.5-sonnet',
      provider: LLMProvider.ANTHROPIC
    });

  it('should successfully make a simple completion call', async () => {
    const llm = new AnthropicLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: 'Hello, Claude LLM!' });
    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('not_found_error') || message.includes('claude-sonnet-4-5-20250929')) {
        // Skip if model is not available for this API key.
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream response incrementally', async () => {
    const llm = new AnthropicLLM(buildModel());
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
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('not_found_error') || message.includes('claude-sonnet-4-5-20250929')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public sendUserMessage', async () => {
    const llm = new AnthropicLLM(buildModel());
    const userMessageText = 'Can you summarize the following text: The sun always shines in California.';
    const userMessage = new LLMUserMessage({ content: userMessageText });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('not_found_error') || message.includes('claude-sonnet-4-5-20250929')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public streamUserMessage', async () => {
    const llm = new AnthropicLLM(buildModel());
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
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('not_found_error') || message.includes('claude-sonnet-4-5-20250929')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
