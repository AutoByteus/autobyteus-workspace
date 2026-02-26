import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MistralLLM } from '../../../../src/llm/api/mistral-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.MISTRAL_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const buildModel = () =>
  new LLMModel({
    name: 'devstral-2',
    value: 'devstral-2512',
    canonicalName: 'devstral-2',
    provider: LLMProvider.MISTRAL
  });

const buildVisionModel = () =>
  new LLMModel({
    name: 'mistral-large',
    value: 'mistral-large-latest',
    canonicalName: 'mistral-large',
    provider: LLMProvider.MISTRAL
  });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const imagePath = path.resolve(repoRoot, 'tests/assets/sample_image.png');

runIntegration('MistralLLM Integration', () => {
  it('should successfully make a simple completion call', async () => {
    const llm = new MistralLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: 'Hello, Mistral LLM!' });

    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should handle multimodal image input', async () => {
    if (!fs.existsSync(imagePath)) {
      return;
    }

    const llm = new MistralLLM(buildVisionModel());
    const userMessage = new LLMUserMessage({
      content: 'Describe this image in one word.',
      image_urls: [imagePath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream response incrementally', async () => {
    const llm = new MistralLLM(buildModel());
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
    const llm = new MistralLLM(buildModel());
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
    const llm = new MistralLLM(buildModel());
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
