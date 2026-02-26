import { describe, it, expect } from 'vitest';
import { LLMFactory } from '../../../../src/llm/llm-factory.js';
import { LLMRuntime } from '../../../../src/llm/runtimes.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.AUTOBYTEUS_API_KEY;
const host = process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;
const forcedTextModelId = process.env.AUTOBYTEUS_LLM_MODEL_ID;
const forcedImageModelId = process.env.AUTOBYTEUS_LLM_IMAGE_MODEL_ID;
const runIntegration = apiKey && host ? describe : describe.skip;

const findAutobyteusModel = async (isImageModel = false) => {
  await LLMFactory.ensureInitialized();
  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.AUTOBYTEUS);
  if (!models.length) {
    return null;
  }

  if (!isImageModel && forcedTextModelId) {
    const match = models.find((model) => model.model_identifier === forcedTextModelId);
    if (!match) {
      throw new Error(`Forced AUTOBYTEUS_LLM_MODEL_ID not found: ${forcedTextModelId}`);
    }
    return match;
  }

  if (isImageModel && forcedImageModelId) {
    const match = models.find((model) => model.model_identifier === forcedImageModelId);
    if (!match) {
      throw new Error(`Forced AUTOBYTEUS_LLM_IMAGE_MODEL_ID not found: ${forcedImageModelId}`);
    }
    return match;
  }

  if (isImageModel && forcedTextModelId && !forcedImageModelId) {
    // Only a text model was forced; skip image tests.
    return null;
  }

  for (const modelInfo of models) {
    const displayName = modelInfo.display_name ?? '';
    const isPreview = displayName.includes('preview') || displayName.includes('image');
    if (isImageModel && isPreview) return modelInfo;
    if (!isImageModel && !isPreview) return modelInfo;
  }

  return null;
};

runIntegration('AutobyteusLLM Integration', () => {
  it('should perform a basic completion', async () => {
    const modelInfo = await findAutobyteusModel(false);
    if (!modelInfo) return;

    const llm = await LLMFactory.createLLM(modelInfo.model_identifier);
    try {
      const response = await llm.sendUserMessage(new LLMUserMessage({ content: "Hello, please respond with 'pong'" }));
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('pong');
      expect(response.usage).toBeTruthy();
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream responses', async () => {
    const modelInfo = await findAutobyteusModel(false);
    if (!modelInfo) return;

    const llm = await LLMFactory.createLLM(modelInfo.model_identifier);
    try {
      const stream = llm.streamUserMessage(new LLMUserMessage({ content: 'Hello, write a short poem' }));
      let fullResponse = '';
      let finalChunkReceived = false;

      for await (const chunk of stream) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        fullResponse += chunk.content ?? '';
        if (chunk.is_complete) {
          finalChunkReceived = true;
          expect(chunk.usage).toBeTruthy();
        }
      }

      expect(fullResponse.length).toBeGreaterThan(10);
      expect(finalChunkReceived).toBe(true);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream image URLs for image models', async () => {
    const modelInfo = await findAutobyteusModel(true);
    if (!modelInfo) return;

    const llm = await LLMFactory.createLLM(modelInfo.model_identifier);
    try {
      const stream = llm.streamUserMessage(
        new LLMUserMessage({ content: 'Generate an image of a cat programming on a laptop.' })
      );

      let fullResponse = '';
      const imageUrls: string[] = [];
      let finalChunkReceived = false;

      for await (const chunk of stream) {
        if (chunk.content) {
          fullResponse += chunk.content;
        }
        if (chunk.image_urls?.length) {
          imageUrls.push(...chunk.image_urls);
        }
        if (chunk.is_complete) {
          finalChunkReceived = true;
          expect(chunk.usage).toBeTruthy();
        }
      }

      expect(finalChunkReceived).toBe(true);
      expect(fullResponse.length).toBeGreaterThan(0);
      expect(imageUrls.length).toBeGreaterThan(0);
      for (const url of imageUrls) {
        expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
      }
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should surface validation errors for empty requests', async () => {
    const modelInfo = await findAutobyteusModel(false);
    if (!modelInfo) return;

    const llm = await LLMFactory.createLLM(modelInfo.model_identifier);
    try {
      await expect(async () => {
        const userMessage = new LLMUserMessage({ content: '' });
        await llm.sendUserMessage(userMessage);
      }).rejects.toThrow();
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
