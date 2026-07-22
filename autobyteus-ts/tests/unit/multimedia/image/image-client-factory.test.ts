import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageClientFactory } from '../../../../src/multimedia/image/image-client-factory.js';
import { BaseImageClient } from '../../../../src/multimedia/image/base-image-client.js';
import { GeminiImageClient } from '../../../../src/multimedia/image/api/gemini-image-client.js';
import {
  apiKeyAuthentication,
  geminiAiStudioAuthentication,
} from '../../explicit-auth-test-helpers.js';

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
    const client = ImageClientFactory.createImageClient('gpt-image-1.5', {
      authentication: apiKeyAuthentication('synthetic-openai-key'),
    });
    expect(client).toBeInstanceOf(BaseImageClient);
    expect(client.model.modelIdentifier).toBe('gpt-image-1.5');
  });

  it('creates OpenAI gpt-image-2 client with flexible image defaults', () => {
    const client = ImageClientFactory.createImageClient('gpt-image-2', {
      authentication: apiKeyAuthentication('synthetic-openai-key'),
    });

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

    const client = ImageClientFactory.createImageClient(modelId, {
      authentication: geminiAiStudioAuthentication('synthetic-gemini-key'),
    });
    expect(client).toBeInstanceOf(GeminiImageClient);
    expect(client.model.modelIdentifier).toBe(modelId);
  });

  it('describes Gemini construction with only credential ownership and exact mode requirement', () => {
    const target = ImageClientFactory.describeConstructionTarget('gemini-2.5-flash-image');
    expect(target).toEqual({
      credentialProviderId: 'GEMINI',
      authenticationRequirement: { kind: 'geminiAuthenticationMode' },
    });
    expect(Object.keys(target).sort()).toEqual(['authenticationRequirement', 'credentialProviderId']);
  });

  it('throws for invalid identifier', () => {
    expect(() => ImageClientFactory.createImageClient('unsupported-image-model-xyz'))
      .toThrow('No image model registered');
  });
});
