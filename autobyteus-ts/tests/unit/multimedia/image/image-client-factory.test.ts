import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageClientFactory } from '../../../../src/multimedia/image/image-client-factory.js';
import { BaseImageClient } from '../../../../src/multimedia/image/base-image-client.js';

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
  });

  it('lists available models', () => {
    const models = ImageClientFactory.listModels();
    const identifiers = models.map((model) => model.modelIdentifier);
    expect(identifiers).toContain('gpt-image-1.5');
    expect(identifiers).toContain('gemini-2.5-flash-image');
  });

  it('creates image client for valid identifier', () => {
    const client = ImageClientFactory.createImageClient('gpt-image-1.5');
    expect(client).toBeInstanceOf(BaseImageClient);
    expect(client.model.modelIdentifier).toBe('gpt-image-1.5');
  });

  it('throws for invalid identifier', () => {
    expect(() => ImageClientFactory.createImageClient('unsupported-image-model-xyz'))
      .toThrow('No image model registered');
  });
});
