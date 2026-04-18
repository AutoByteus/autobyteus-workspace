import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = vi.hoisted(() => ({
  get: vi.fn<(key: string) => string>(),
  set: vi.fn<(key: string, value: string) => void>(),
  getLlmApiKey: vi.fn<(provider: string) => string | null>(),
  setLlmApiKey: vi.fn<(provider: string, apiKey: string) => void>(),
}));

const mockModelCatalogService = vi.hoisted(() => ({
  reloadLlmModels: vi.fn(),
  reloadAudioModels: vi.fn(),
  reloadImageModels: vi.fn(),
  listAudioModels: vi.fn(),
  listImageModels: vi.fn(),
}));

const mockLlmProviderService = vi.hoisted(() => ({
  getProviderApiKeyConfigured: vi.fn(),
  listProvidersWithModels: vi.fn(),
  setProviderApiKey: vi.fn(),
  probeCustomProvider: vi.fn(),
  createCustomProvider: vi.fn(),
  deleteCustomProvider: vi.fn(),
  reloadProviderModels: vi.fn(),
}));

const mockBuiltInCatalog = vi.hoisted(() => ({
  getProvider: vi.fn((providerId: string) => ({
    id: providerId,
    name: providerId === 'OPENAI' ? 'OpenAI' : providerId,
    providerType: providerId,
    isCustom: false,
    baseUrl: null,
    apiKeyConfigured: providerId === 'OPENAI',
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  })),
}));

vi.mock('../../../../../src/config/app-config-provider.js', () => ({
  appConfigProvider: {
    get config() {
      return mockConfig;
    },
  },
}));

vi.mock('../../../../../src/llm-management/services/model-catalog-service.js', () => ({
  getModelCatalogService: () => mockModelCatalogService,
}));

vi.mock('../../../../../src/llm-management/llm-providers/services/llm-provider-service.js', () => ({
  getLlmProviderService: () => mockLlmProviderService,
}));

vi.mock('../../../../../src/llm-management/llm-providers/builtins/built-in-llm-provider-catalog.js', () => ({
  getBuiltInLlmProviderCatalog: () => mockBuiltInCatalog,
}));

import { LlmProviderResolver } from '../../../../../src/api/graphql/types/llm-provider.js';

describe('LlmProviderResolver', () => {
  beforeEach(() => {
    mockConfig.get.mockReset();
    mockConfig.set.mockReset();
    mockConfig.getLlmApiKey.mockReset();
    mockConfig.setLlmApiKey.mockReset();
    mockConfig.get.mockImplementation(() => '');

    mockModelCatalogService.reloadLlmModels.mockReset();
    mockModelCatalogService.reloadAudioModels.mockReset();
    mockModelCatalogService.reloadImageModels.mockReset();
    mockModelCatalogService.listAudioModels.mockReset();
    mockModelCatalogService.listImageModels.mockReset();
    mockModelCatalogService.listAudioModels.mockResolvedValue([]);
    mockModelCatalogService.listImageModels.mockResolvedValue([]);

    mockLlmProviderService.getProviderApiKeyConfigured.mockReset();
    mockLlmProviderService.listProvidersWithModels.mockReset();
    mockLlmProviderService.setProviderApiKey.mockReset();
    mockLlmProviderService.probeCustomProvider.mockReset();
    mockLlmProviderService.createCustomProvider.mockReset();
    mockLlmProviderService.deleteCustomProvider.mockReset();
    mockLlmProviderService.reloadProviderModels.mockReset();
    mockLlmProviderService.listProvidersWithModels.mockResolvedValue([]);

    mockBuiltInCatalog.getProvider.mockClear();
  });

  it('infers AI_STUDIO when only Gemini API key is present', () => {
    mockConfig.get.mockImplementation((key: string) => ({
      GEMINI_API_KEY: 'gemini-key',
      VERTEX_AI_API_KEY: '',
      VERTEX_AI_PROJECT: '',
      VERTEX_AI_LOCATION: '',
    }[key] ?? ''));

    const resolver = new LlmProviderResolver();
    const setup = resolver.getGeminiSetupConfig();

    expect(setup.mode).toBe('AI_STUDIO');
    expect(setup.geminiApiKeyConfigured).toBe(true);
    expect(setup.vertexApiKeyConfigured).toBe(false);
    expect(setup.vertexProject).toBeNull();
    expect(setup.vertexLocation).toBeNull();
  });

  it('saves VERTEX_PROJECT mode and clears non-selected Gemini fields', () => {
    const resolver = new LlmProviderResolver();
    const result = resolver.setGeminiSetupConfig(
      'VERTEX_PROJECT',
      null,
      null,
      'project-id',
      'europe-west4',
    );

    expect(result).toContain('saved successfully');
    expect(mockConfig.set).toHaveBeenCalledWith('VERTEX_AI_PROJECT', 'project-id');
    expect(mockConfig.set).toHaveBeenCalledWith('VERTEX_AI_LOCATION', 'europe-west4');
    expect(mockConfig.set).toHaveBeenCalledWith('GEMINI_API_KEY', '');
    expect(mockConfig.set).toHaveBeenCalledWith('VERTEX_AI_API_KEY', '');
  });

  it('returns configured status through the provider service', async () => {
    mockLlmProviderService.getProviderApiKeyConfigured.mockResolvedValue(true);

    const resolver = new LlmProviderResolver();
    const configured = await resolver.getLlmProviderApiKeyConfigured('OPENAI');

    expect(configured).toBe(true);
    expect(mockLlmProviderService.getProviderApiKeyConfigured).toHaveBeenCalledWith('OPENAI');
  });

  it('returns provider objects for availableLlmProvidersWithModels', async () => {
    mockLlmProviderService.listProvidersWithModels.mockResolvedValue([
      {
        provider: {
          id: 'provider_gateway',
          name: 'Internal Gateway',
          providerType: 'OPENAI_COMPATIBLE',
          isCustom: true,
          baseUrl: 'https://gateway.example.com/v1',
          apiKeyConfigured: true,
          status: 'READY',
          statusMessage: null,
        },
        models: [
          {
            modelIdentifier: 'openai-compatible:provider_gateway:model-a',
            name: 'model-a',
            value: 'model-a',
            canonicalName: 'model-a',
            providerId: 'provider_gateway',
            providerName: 'Internal Gateway',
            providerType: 'OPENAI_COMPATIBLE',
            runtime: 'openai_compatible',
            hostUrl: 'https://gateway.example.com/v1',
            configSchema: null,
            maxContextTokens: null,
            activeContextTokens: null,
            maxInputTokens: null,
            maxOutputTokens: null,
          },
        ],
      },
    ]);

    const resolver = new LlmProviderResolver();
    const result = await resolver.availableLlmProvidersWithModels('autobyteus');

    expect(mockLlmProviderService.listProvidersWithModels).toHaveBeenCalledWith('autobyteus', expect.any(Function));
    expect(result).toHaveLength(1);
    expect(result[0]?.provider).toEqual(expect.objectContaining({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      isCustom: true,
    }));
    expect(result[0]?.models[0]).toEqual(expect.objectContaining({
      providerId: 'provider_gateway',
      providerName: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
    }));
  });

  it('groups multimedia models under built-in provider objects', async () => {
    mockModelCatalogService.listAudioModels.mockResolvedValue([
      {
        modelIdentifier: 'whisper-1',
        name: 'Whisper',
        value: 'whisper-1',
        provider: 'OPENAI',
        runtime: 'api',
        hostUrl: null,
        parameterSchema: null,
      },
    ]);

    const resolver = new LlmProviderResolver();
    const result = await resolver.availableAudioProvidersWithModels('autobyteus');

    expect(mockBuiltInCatalog.getProvider).toHaveBeenCalledWith('OPENAI');
    expect(result).toEqual([
      expect.objectContaining({
        provider: expect.objectContaining({ id: 'OPENAI', name: 'OpenAI' }),
        models: [expect.objectContaining({ modelIdentifier: 'whisper-1', providerId: 'OPENAI' })],
      }),
    ]);
  });

  it('creates custom providers through the provider service', async () => {
    mockLlmProviderService.createCustomProvider.mockResolvedValue({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      isCustom: true,
      baseUrl: 'https://gateway.example.com/v1',
      apiKeyConfigured: true,
      status: 'READY',
      statusMessage: null,
    });

    const resolver = new LlmProviderResolver();
    const result = await resolver.createCustomLlmProvider({
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'secret',
    }, 'autobyteus');

    expect(mockLlmProviderService.createCustomProvider).toHaveBeenCalledWith({
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'secret',
    }, 'autobyteus');
    expect(result).toEqual(expect.objectContaining({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      isCustom: true,
    }));
  });

  it('deletes custom providers through the provider service', async () => {
    mockLlmProviderService.deleteCustomProvider.mockResolvedValue('Internal Gateway');

    const resolver = new LlmProviderResolver();
    const result = await resolver.deleteCustomLlmProvider('provider_gateway', 'autobyteus');

    expect(mockLlmProviderService.deleteCustomProvider).toHaveBeenCalledWith('provider_gateway', 'autobyteus');
    expect(result).toBe('Deleted custom provider Internal Gateway successfully.');
  });

  it('reloads provider models through the provider service', async () => {
    mockLlmProviderService.reloadProviderModels.mockResolvedValue(3);

    const resolver = new LlmProviderResolver();
    const result = await resolver.reloadLlmProviderModels('provider_gateway', 'autobyteus');

    expect(mockLlmProviderService.reloadProviderModels).toHaveBeenCalledWith('provider_gateway', 'autobyteus');
    expect(result).toContain('Reloaded 3 models for provider provider_gateway successfully.');
  });
});
