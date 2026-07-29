import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { GeminiImageClient } from '../../../../../src/multimedia/image/api/gemini-image-client.js';
import { ImageClientFactory } from '../../../../../src/multimedia/image/image-client-factory.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';
import {
  geminiProviderApiKeyResolver,
  geminiRuntimeResolver,
} from '../../../provider-api-key-resolver-test-helpers.js';

const generateContentMock = vi.fn();

vi.mock('../../../../../src/utils/gemini-helper.js', () => ({
  selectGeminiRuntimeForResolver: async () => ({ kind: 'aiStudio' }),
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

const createClient = (
  modelId = 'gemini-3.1-flash-image',
  config = new MultimediaConfig(),
): GeminiImageClient => {
  const model = ImageClientFactory.listModels().find(
    (listedModel) => listedModel.modelIdentifier === modelId,
  );
  if (!model) {
    throw new Error(`Test model '${modelId}' was not found.`);
  }

  return new GeminiImageClient(
    model,
    config,
    geminiProviderApiKeyResolver({ aiStudio: 'synthetic-gemini-key' }),
    geminiRuntimeResolver(),
  );
};

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

    const client = createClient('gemini-2.5-flash-image');

    const response = await client.generateImage('draw a cat');
    expect(response.image_urls[0]).toBe('data:image/png;base64,abcd');
    const request = generateContentMock.mock.calls[0]?.[0];
    expect(request.config).toEqual({ responseModalities: ['IMAGE'] });
  });

  it('translates supported image controls into the SDK image config', async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'abcd' } }] } }],
    });

    const client = createClient();
    await client.generateImage('draw a wide cat', undefined, {
      aspect_ratio: '16:9',
      image_size: '2K',
    });

    const request = generateContentMock.mock.calls[0]?.[0];
    expect(request.config).toMatchObject({
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '2K',
      },
    });
    expect(request.config).not.toHaveProperty('responseFormat');
    expect(request.config).not.toHaveProperty('aspect_ratio');
    expect(request.config).not.toHaveProperty('image_size');
  });

  it('uses the same image-control translation for editing references', async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'edited' } }] } }],
    });

    const client = createClient();
    await client.editImage('make the cat blue', ['https://example.com/cat.png'], null, {
      aspect_ratio: '4:5',
      image_size: '4K',
    });

    const request = generateContentMock.mock.calls[0]?.[0];
    expect(request.config.imageConfig).toEqual({
      aspectRatio: '4:5',
      imageSize: '4K',
    });
    expect(request.contents).toEqual([
      'make the cat blue',
      {
        inlineData: {
          data: Buffer.from('fake').toString('base64'),
          mimeType: 'image/png',
        },
      },
    ]);
  });

  it('preserves unrelated config fields while applying per-call controls', async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'abcd' } }] } }],
    });

    const client = createClient('gemini-3.1-flash-image', new MultimediaConfig({
      aspect_ratio: '1:1',
      unrelatedConfig: {
        mediaResolution: 'high',
      },
      imageConfig: { existing: true },
    }));
    await client.generateImage('draw a cat', undefined, { image_size: '1K' });

    const request = generateContentMock.mock.calls[0]?.[0];
    expect(request.config.unrelatedConfig).toEqual({
      mediaResolution: 'high',
    });
    expect(request.config.imageConfig).toEqual({
      existing: true,
      aspectRatio: '1:1',
      imageSize: '1K',
    });
  });

  it('rejects image control values outside the selected model schema', async () => {
    const client = createClient();

    await expect(client.generateImage('draw a cat', undefined, {
      aspect_ratio: '2:1',
    })).rejects.toThrow('generation_config.aspect_ratio must be one of');
  });

  it('serializes the supported SDK image config into the raw Generate Content request', async () => {
    let requestBody: Record<string, any> | undefined;
    const fetchMock = vi.fn(async (_input: any, init: any) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ candidates: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const ai = new GoogleGenAI({
      apiKey: 'synthetic-gemini-key',
    });

    try {
      await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: 'raw serializer probe',
        config: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '1:4',
            imageSize: '2K',
          },
        },
      });
    } finally {
      vi.unstubAllGlobals();
    }

    expect(requestBody?.generationConfig).toMatchObject({
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '1:4',
        imageSize: '2K',
      },
    });
    expect(requestBody?.generationConfig).not.toHaveProperty('responseFormat');
  });
});
