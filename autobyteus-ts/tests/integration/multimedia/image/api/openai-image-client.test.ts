import { describe, it, expect, vi } from 'vitest';
import { ImageGenerationResponse } from '../../../../../src/multimedia/index.js';
import { ImageClientFactory } from '../../../../../src/multimedia/image/image-client-factory.js';

const apiKey = process.env.OPENAI_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

runIntegration('OpenAIImageClient integration', () => {
  it(
    'generates an image with gpt-image-1.5',
    { timeout: 60000 },
    async () => {
      const client = ImageClientFactory.createImageClient('gpt-image-1.5');
      const response = await client.generateImage('A cute capybara wearing a top hat');

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
      const client = ImageClientFactory.createImageClient('gpt-image-1.5');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const response = await client.generateImage('A photo of a cat', ['dummy_path.jpg']);
        expect(response).toBeInstanceOf(ImageGenerationResponse);
        expect(response.image_urls.length).toBeGreaterThan(0);
        const warned = warnSpy.mock.calls.some((call) =>
          String(call[0]).includes('does not support input images')
        );
        expect(warned).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    }
  );
});
