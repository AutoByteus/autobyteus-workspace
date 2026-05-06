import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageClientFactory } from '../../../../src/multimedia/image/image-client-factory.js';
import { BaseImageClient } from '../../../../src/multimedia/image/base-image-client.js';
import { GeminiImageClient } from '../../../../src/multimedia/image/api/gemini-image-client.js';

vi.mock('../../../../src/utils/gemini-helper.js', () => ({
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
    process.env.OPENAI_API_KEY = 'test-key';
    ImageClientFactory.reinitialize();
  });

  it('lists available models', () => {
    const models = ImageClientFactory.listModels();
    const identifiers = models.map((model) => model.modelIdentifier);
    expect(identifiers).toContain('gpt-image-1.5');
    expect(identifiers).toContain('gpt-image-2');
    expect(identifiers).toContain('gemini-2.5-flash-image');
    expect(identifiers).toContain('gemini-3.1-flash-image-preview');
    expect(identifiers).toContain('gemini-3-pro-image-preview');
  });

  it('creates image client for valid identifier', () => {
    const client = ImageClientFactory.createImageClient('gpt-image-1.5');
    expect(client).toBeInstanceOf(BaseImageClient);
    expect(client.model.modelIdentifier).toBe('gpt-image-1.5');
  });

  it('creates OpenAI gpt-image-2 client with flexible image defaults', () => {
    const client = ImageClientFactory.createImageClient('gpt-image-2');

    expect(client).toBeInstanceOf(BaseImageClient);
    expect(client.model.modelIdentifier).toBe('gpt-image-2');
    expect(client.model.value).toBe('gpt-image-2');
    expect(client.model.defaultConfig.toDict()).toMatchObject({
      n: 1,
      size: 'auto',
      quality: 'auto'
    });
  });

  it('registers Gemini 3.1 Flash Image Preview with exact provider model id and Gemini client', () => {
    const model = ImageClientFactory.listModels().find(
      (listedModel) => listedModel.modelIdentifier === 'gemini-3.1-flash-image-preview'
    );

    expect(model).toBeDefined();
    expect(model?.name).toBe('gemini-3.1-flash-image-preview');
    expect(model?.value).toBe('gemini-3.1-flash-image-preview');

    const client = ImageClientFactory.createImageClient('gemini-3.1-flash-image-preview');
    expect(client).toBeInstanceOf(GeminiImageClient);
    expect(client.model.modelIdentifier).toBe('gemini-3.1-flash-image-preview');
  });

  it('throws for invalid identifier', () => {
    expect(() => ImageClientFactory.createImageClient('unsupported-image-model-xyz'))
      .toThrow('No image model registered');
  });
});
