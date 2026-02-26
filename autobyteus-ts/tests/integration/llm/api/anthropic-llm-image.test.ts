import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const apiKey = process.env.ANTHROPIC_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const buildModel = () =>
  new LLMModel({
    name: 'claude-4.5-sonnet',
    value: 'claude-sonnet-4-5-20250929',
    canonicalName: 'claude-4.5-sonnet',
    provider: LLMProvider.ANTHROPIC
  });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const sampleImagePath = path.resolve(repoRoot, 'tests/assets/sample_image.png');

const writeTempImage = (fileName: string, base64Png: string): string => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-img-'));
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64Png, 'base64'));
  return filePath;
};

runIntegration('AnthropicLLM Image Integration', () => {
  it('should send a single local image file', async () => {
    if (!fs.existsSync(sampleImagePath)) {
      return;
    }

    const llm = new AnthropicLLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: "What is in this image? Reply with 'image' in the text.",
      image_urls: [sampleImagePath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
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

  it('should send a single image via base64', async () => {
    if (!fs.existsSync(sampleImagePath)) {
      return;
    }

    const imageB64 = fs.readFileSync(sampleImagePath).toString('base64');
    const llm = new AnthropicLLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'Describe this image shortly.',
      image_urls: [imageB64]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
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

  it('should send multiple local images', async () => {
    if (!fs.existsSync(sampleImagePath)) {
      return;
    }

    const img1 = sampleImagePath;
    const img2 = sampleImagePath;

    const llm = new AnthropicLLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'What do you see in these images?',
      image_urls: [img1, img2]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
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

  it('should stream with a single local image file', async () => {
    if (!fs.existsSync(sampleImagePath)) {
      return;
    }

    const llm = new AnthropicLLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'What is in this image?',
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

  it('should tolerate unsupported MIME types and still respond', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-bmp-'));
    const bmpPath = path.join(tmpDir, 'test.bmp');
    fs.writeFileSync(bmpPath, Buffer.from('BM' + '\x00'.repeat(50)));

    const llm = new AnthropicLLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'Ignore the image failure, just say hello.',
      image_urls: [bmpPath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.toLowerCase()).toContain('hello');
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
