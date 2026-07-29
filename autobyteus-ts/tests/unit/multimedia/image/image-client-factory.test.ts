import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageClientFactory } from '../../../../src/multimedia/image/image-client-factory.js';
import { BaseImageClient } from '../../../../src/multimedia/image/base-image-client.js';
import { GeminiImageClient } from '../../../../src/multimedia/image/api/gemini-image-client.js';
import {
  geminiProviderApiKeyResolver,
  geminiRuntimeResolver,
  providerApiKeyResolver,
} from '../../provider-api-key-resolver-test-helpers.js';

vi.mock('../../../../src/utils/gemini-helper.js', () => ({
  selectGeminiRuntimeForResolver: async () => ({ kind: 'aiStudio' }),
  initializeGeminiClientWithRuntime: () => ({
    client: { models: { generateContent: vi.fn() } },
    runtimeInfo: { runtime: 'api_key' }
  })
}));

vi.mock('../../../../src/multimedia/utils/api-utils.js', () => ({
  loadImageFromUrl: async () => Buffer.from('fake')
}));

describe('ImageClientFactory', () => {
  beforeEach(() => {
    ImageClientFactory.reinitialize();
  });

  it('lists available models', () => {
    const models = ImageClientFactory.listModels();
    const identifiers = models.map((model) => model.modelIdentifier);
    expect(identifiers).toContain('gpt-image-1.5');
    expect(identifiers).toContain('gpt-image-2');
    expect(identifiers).toContain('gemini-2.5-flash-image');
    expect(identifiers).toContain('gemini-3.1-flash-lite-image');
    expect(identifiers).toContain('gemini-3.1-flash-image');
    expect(identifiers).toContain('gemini-3-pro-image');
    expect(identifiers).not.toContain('gemini-3.1-flash-image-preview');
    expect(identifiers).not.toContain('gemini-3-pro-image-preview');
  });

  it('creates image client for valid identifier', () => {
    const client = ImageClientFactory.createImageClient(
      'gpt-image-1.5',
      undefined,
      providerApiKeyResolver('synthetic-openai-key'),
    );
    expect(client).toBeInstanceOf(BaseImageClient);
    expect(client.model.modelIdentifier).toBe('gpt-image-1.5');
  });

  it('creates OpenAI gpt-image-2 client with flexible image defaults', () => {
    const client = ImageClientFactory.createImageClient(
      'gpt-image-2',
      undefined,
      providerApiKeyResolver('synthetic-openai-key'),
    );

    expect(client).toBeInstanceOf(BaseImageClient);
    expect(client.model.modelIdentifier).toBe('gpt-image-2');
    expect(client.model.value).toBe('gpt-image-2');
    expect(client.model.defaultConfig.toDict()).toMatchObject({
      n: 1,
      size: 'auto',
      quality: 'auto'
    });
  });

  it.each([
    {
      modelId: 'gemini-2.5-flash-image',
      aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
      imageSizes: undefined,
    },
    {
      modelId: 'gemini-3.1-flash-lite-image',
      aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
      imageSizes: ['1K'],
    },
    {
      modelId: 'gemini-3.1-flash-image',
      aspectRatios: ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'],
      imageSizes: ['512', '1K', '2K', '4K'],
    },
    {
      modelId: 'gemini-3-pro-image',
      aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
      imageSizes: ['1K', '2K', '4K'],
    },
  ])('exposes the documented schema for $modelId', ({ modelId, aspectRatios, imageSizes }) => {
    const model = ImageClientFactory.listModels().find(
      (listedModel) => listedModel.modelIdentifier === modelId,
    );

    expect(model?.parameterSchema.parameters.map((parameter) => parameter.name)).toEqual(
      imageSizes ? ['aspect_ratio', 'image_size'] : ['aspect_ratio'],
    );
    expect(model?.parameterSchema.getParameter('aspect_ratio')?.enumValues).toEqual(aspectRatios);
    expect(model?.parameterSchema.getParameter('image_size')?.enumValues).toEqual(imageSizes);
    expect(model?.parameterSchema.toJsonSchema()).toMatchObject({
      type: 'object',
      required: [],
    });
  });

  it('does not expose the Gemini schema on the separate Imagen catalog entry', () => {
    const model = ImageClientFactory.listModels().find(
      (listedModel) => listedModel.modelIdentifier === 'imagen-4',
    );

    expect(model?.parameterSchema.parameters).toEqual([]);
  });

  it.each([
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
  ])('registers %s with exact provider model id and Gemini client', (modelId) => {
    const model = ImageClientFactory.listModels().find(
      (listedModel) => listedModel.modelIdentifier === modelId
    );

    expect(model).toBeDefined();
    expect(model?.name).toBe(modelId);
    expect(model?.value).toBe(modelId);

    const client = ImageClientFactory.createImageClient(
      modelId,
      undefined,
      geminiProviderApiKeyResolver({ aiStudio: 'synthetic-gemini-key' }),
      geminiRuntimeResolver(),
    );
    expect(client).toBeInstanceOf(GeminiImageClient);
    expect(client.model.modelIdentifier).toBe(modelId);
  });

  it('keeps model definitions credential-independent', () => {
    const model = ImageClientFactory.listModels()
      .find((entry) => entry.modelIdentifier === 'gemini-2.5-flash-image');
    expect(model).toBeDefined();
    expect(model).not.toHaveProperty('credentialProviderId');
    expect(model).not.toHaveProperty('authenticationRequirement');
  });

  it('throws for invalid identifier', () => {
    expect(() => ImageClientFactory.createImageClient(
      'unsupported-image-model-xyz',
      undefined,
      providerApiKeyResolver(),
    ))
      .toThrow('No image model registered');
  });
});
