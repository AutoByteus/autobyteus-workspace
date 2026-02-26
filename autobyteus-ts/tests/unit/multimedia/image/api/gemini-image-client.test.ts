import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiImageClient } from '../../../../../src/multimedia/image/api/gemini-image-client.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';

const generateContentMock = vi.fn();

vi.mock('../../../../../src/utils/gemini-helper.js', () => ({
  initializeGeminiClientWithRuntime: () => ({
    client: { models: { generateContent: generateContentMock } },
    runtimeInfo: { runtime: 'api_key' }
  })
}));

vi.mock('../../../../../src/utils/gemini-model-mapping.js', () => ({
  resolveModelForRuntime: (modelValue: string) => modelValue
}));

vi.mock('../../../../../src/multimedia/utils/api-utils.js', () => ({
  loadImageFromUrl: async () => Buffer.from('fake')
}));

describe('GeminiImageClient', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it('returns data URIs from inline image data', async () => {
    generateContentMock.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: 'abcd'
                }
              }
            ]
          }
        }
      ]
    });

    const model = { name: 'gemini-image', value: 'gemini-2.5-flash-image' } as any;
    const client = new GeminiImageClient(model, new MultimediaConfig());

    const response = await client.generateImage('draw a cat');
    expect(response.image_urls[0]).toBe('data:image/png;base64,abcd');
  });
});
