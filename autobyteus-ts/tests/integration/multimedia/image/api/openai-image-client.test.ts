import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ImageGenerationResponse } from '../../../../../src/multimedia/index.js';
import { ImageClientFactory } from '../../../../../src/multimedia/image/image-client-factory.js';
import { skipIfProviderAccessError } from '../../../helpers/provider-access.js';

const apiKey = process.env.OPENAI_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const sampleImagePath = path.resolve(repoRoot, 'tests/assets/sample_image.png');

runIntegration('OpenAIImageClient integration', () => {
  it(
    'generates an image with gpt-image-2',
    { timeout: 60000 },
    async () => {
      const client = ImageClientFactory.createImageClient('gpt-image-2');
      let response: ImageGenerationResponse | null = null;
      try {
        response = await client.generateImage('A simple blue circle icon on a white background', null, {
          size: '1024x1024',
          quality: 'low'
        });
      } catch (error) {
        if (skipIfProviderAccessError('OpenAI', 'gpt-image-2', error)) {
          return;
        }
        throw error;
      }

      if (!response) {
        return;
      }
      expect(response).toBeInstanceOf(ImageGenerationResponse);
      expect(Array.isArray(response.image_urls)).toBe(true);
      expect(response.image_urls.length).toBeGreaterThan(0);
      const first = response.image_urls[0];
      expect(typeof first).toBe('string');
      expect(first.startsWith('data:') || first.startsWith('https://') || first.startsWith('http://')).toBe(true);
    }
  );

  it(
    'edits an image with gpt-image-2',
    { timeout: 60000 },
    async () => {
      if (!fs.existsSync(sampleImagePath)) {
        return;
      }

      const client = ImageClientFactory.createImageClient('gpt-image-2');
      let response: ImageGenerationResponse | null = null;
      try {
        response = await client.editImage('Add a tiny red star in the center.', [sampleImagePath], null, {
          size: '1024x1024',
          quality: 'low'
        });
      } catch (error) {
        if (skipIfProviderAccessError('OpenAI', 'gpt-image-2', error)) {
          return;
        }
        throw error;
      }

      if (!response) {
        return;
      }
      expect(response).toBeInstanceOf(ImageGenerationResponse);
      expect(Array.isArray(response.image_urls)).toBe(true);
      expect(response.image_urls.length).toBeGreaterThan(0);
      const first = response.image_urls[0];
      expect(typeof first).toBe('string');
      expect(first.startsWith('data:') || first.startsWith('https://') || first.startsWith('http://')).toBe(true);
    }
  );

  it(
    'warns when input images are provided to generateImage',
    { timeout: 60000 },
    async () => {
      const client = ImageClientFactory.createImageClient('gpt-image-2');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const response = await client.generateImage('A photo of a cat', ['dummy_path.jpg'], {
          size: '1024x1024',
          quality: 'low'
        });
        expect(response).toBeInstanceOf(ImageGenerationResponse);
        expect(response.image_urls.length).toBeGreaterThan(0);
        const warned = warnSpy.mock.calls.some((call) =>
          String(call[0]).includes('does not support input images')
        );
        expect(warned).toBe(true);
      } catch (error) {
        if (skipIfProviderAccessError('OpenAI', 'gpt-image-2', error)) {
          return;
        }
        throw error;
      } finally {
        warnSpy.mockRestore();
      }
    }
  );
});
