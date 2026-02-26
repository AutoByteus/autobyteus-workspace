import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { OpenAILLM } from '../../../../src/llm/api/openai-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.OPENAI_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const buildModel = () =>
  new LLMModel({
    name: 'gpt-5.2',
    value: 'gpt-5.2',
    canonicalName: 'gpt-5.2',
    provider: LLMProvider.OPENAI
  });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const sampleImagePath = path.resolve(repoRoot, 'tests/assets/sample_image.png');

const writeTempImage = (fileName: string, base64Png: string): string => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openai-img-'));
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64Png, 'base64'));
  return filePath;
};

runIntegration('OpenAILLM Image Integration', () => {
  it('should send a single local image file', async () => {
    if (!fs.existsSync(sampleImagePath)) {
      return;
    }

    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'What color is in this image?',
      image_urls: [sampleImagePath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('blue');
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should send a single image via base64', async () => {
    if (!fs.existsSync(sampleImagePath)) {
      return;
    }

    const imageB64 = fs.readFileSync(sampleImagePath).toString('base64');
    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'What color is in this image?',
      image_urls: [imageB64]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.toLowerCase()).toContain('blue');
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should send multiple local images', async () => {
    const redPixel =
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGP8z4APMOGVHbHSAEEsAROxCnMTAAAAAElFTkSuQmCC';
    const greenPixel =
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAE0lEQVR4nGNkaGDAA5jwSY5caQCnUgCUBZU3vQAAAABJRU5ErkJggg==';

    const img1 = writeTempImage('test_image_1.png', redPixel);
    const img2 = writeTempImage('test_image_2.png', greenPixel);

    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'What colors are in these images?',
      image_urls: [img1, img2]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      const text = response.content.toLowerCase();
      expect(text).toContain('red');
      expect(text).toContain('green');
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream with a single local image file', async () => {
    if (!fs.existsSync(sampleImagePath)) {
      return;
    }

    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'What color is this image?',
      image_urls: [sampleImagePath]
    });

    let completeResponse = '';
    try {
      for await (const chunk of llm.streamUserMessage(userMessage)) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          completeResponse += chunk.content;
        }
      }

      expect(completeResponse.toLowerCase()).toContain('blue');
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should handle invalid image paths gracefully', async () => {
    const llm = new OpenAILLM(buildModel());
    const invalidPath = 'nonexistent/image/path.jpg';
    const userMessage = new LLMUserMessage({
      content: 'What is in this image?',
      image_urls: [invalidPath]
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

  it('should allow cleanup after a multimodal request', async () => {
    if (!fs.existsSync(sampleImagePath)) {
      return;
    }

    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'Test cleanup',
      image_urls: [sampleImagePath]
    });

    await llm.sendUserMessage(userMessage);
    await llm.cleanup();
  }, 120000);
});
