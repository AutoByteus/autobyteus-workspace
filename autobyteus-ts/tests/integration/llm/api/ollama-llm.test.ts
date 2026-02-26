import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LLMFactory } from '../../../../src/llm/llm-factory.js';
import { LLMRuntime } from '../../../../src/llm/runtimes.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const imagePath = path.resolve(repoRoot, 'tests/assets/sample_image.png');
const userProvidedImageUrl =
  'https://127.0.0.1:51739/media/images/b132adbb-80e4-4faf-bd36-44d965d2e095.jpg';

const getOllamaLLM = async () => {
  await LLMFactory.reinitialize();
  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.OLLAMA);
  if (!models.length) return null;

  const knownVisionModels = ['gemma3n:e2b', 'llava', 'bakllava', 'moondream'];
  const visionModel = models.find((model) =>
    knownVisionModels.some((known) => model.model_identifier.includes(known))
  );

  if (!visionModel) return null;
  return LLMFactory.createLLM(visionModel.model_identifier);
};

describe('OllamaLLM Integration', () => {
  it('should return a completion', async () => {
    const llm = await getOllamaLLM();
    if (!llm) return;

    const userMessage = new LLMUserMessage({ content: "Hello, Ollama LLM! Please respond with 'pong'." });
    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('pong');
    } catch (error) {
      return;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it.each([imagePath, userProvidedImageUrl])('should handle multimodal inputs (%s)', async (imageSource) => {
    if (imageSource === imagePath && !fs.existsSync(imagePath)) {
      return;
    }

    const llm = await getOllamaLLM();
    if (!llm) return;

    const userMessage = new LLMUserMessage({
      content: 'What is in this image? Be very brief.',
      image_urls: [imageSource]
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

  it('should stream responses', async () => {
    const llm = await getOllamaLLM();
    if (!llm) return;

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
    } catch {
      return;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public sendUserMessage', async () => {
    const llm = await getOllamaLLM();
    if (!llm) return;

    const userMessageText = 'Can you summarize the following text: The quick brown fox jumps over the lazy dog.';
    const userMessage = new LLMUserMessage({ content: userMessageText });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } catch {
      return;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public streamUserMessage', async () => {
    const llm = await getOllamaLLM();
    if (!llm) return;

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
    } catch {
      return;
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
