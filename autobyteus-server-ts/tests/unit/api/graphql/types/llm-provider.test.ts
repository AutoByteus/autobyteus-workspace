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
  reloadVideoModels: vi.fn(),
  listAudioModels: vi.fn(),
  listImageModels: vi.fn(),
  listVideoModels: vi.fn(),
}));

const mockLlmProviderService = vi.hoisted(() => ({
  getProviderCredentialStatus: vi.fn(),
  getGeminiCredentialStatus: vi.fn(),
  setGeminiSetup: vi.fn(),
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
    credentialStatus: providerId === 'OPENAI' ? {
      backendHealth: 'READY', storageState: 'CONFIGURED', lifecycle: 'WRITABLE', instructionCode: null,
    } : null,
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
    mockModelCatalogService.reloadVideoModels.mockReset();
    mockModelCatalogService.listAudioModels.mockReset();
    mockModelCatalogService.listImageModels.mockReset();
    mockModelCatalogService.listVideoModels.mockReset();
    mockModelCatalogService.listAudioModels.mockResolvedValue([]);
    mockModelCatalogService.listImageModels.mockResolvedValue([]);
    mockModelCatalogService.listVideoModels.mockResolvedValue([]);

    mockLlmProviderService.getProviderCredentialStatus.mockReset();
    mockLlmProviderService.getGeminiCredentialStatus.mockReset();
    mockLlmProviderService.setGeminiSetup.mockReset();
    mockLlmProviderService.listProvidersWithModels.mockReset();
    mockLlmProviderService.setProviderApiKey.mockReset();
    mockLlmProviderService.probeCustomProvider.mockReset();
    mockLlmProviderService.createCustomProvider.mockReset();
    mockLlmProviderService.deleteCustomProvider.mockReset();
    mockLlmProviderService.reloadProviderModels.mockReset();
    mockLlmProviderService.listProvidersWithModels.mockResolvedValue([]);

    mockBuiltInCatalog.getProvider.mockClear();
  });

  it('returns the rich Gemini setup status through the provider service', async () => {
    const status = {
      mode: 'AI_STUDIO',
      geminiCredentialStatus: {
        backendHealth: 'READY', storageState: 'CONFIGURED', lifecycle: 'WRITABLE', instructionCode: null,
      },
      vertexCredentialStatus: {
        backendHealth: 'READY', storageState: 'MISSING', lifecycle: 'WRITABLE', instructionCode: null,
      },
      vertexProject: null,
      vertexLocation: null,
    };
    mockLlmProviderService.getGeminiCredentialStatus.mockResolvedValue(status);
    const resolver = new LlmProviderResolver();
    await expect(resolver.getGeminiSetupConfig()).resolves.toEqual(status);
  });

  it('saves VERTEX_PROJECT mode through the provider service without raw-key aliases', async () => {
    mockLlmProviderService.setGeminiSetup.mockResolvedValue(undefined);
    const resolver = new LlmProviderResolver();
    const result = await resolver.setGeminiSetupConfig(
      'VERTEX_PROJECT',
      null,
      null,
      'project-id',
      'europe-west4',
    );

    expect(result).toContain('saved successfully');
    expect(mockLlmProviderService.setGeminiSetup).toHaveBeenCalledWith({
      mode: 'VERTEX_PROJECT', project: 'project-id', location: 'europe-west4',
    });
  });

  it('returns rich credential status through the provider service', async () => {
    const status = {
      backendHealth: 'READY', storageState: 'CONFIGURED', lifecycle: 'WRITABLE', instructionCode: null,
    };
    mockLlmProviderService.getProviderCredentialStatus.mockResolvedValue(status);

    const resolver = new LlmProviderResolver();
    const configured = await resolver.getLlmProviderCredentialStatus('OPENAI');

    expect(configured).toEqual(status);
    expect(mockLlmProviderService.getProviderCredentialStatus).toHaveBeenCalledWith('OPENAI');
  });

  it('returns provider objects for availableLlmProvidersWithModels', async () => {
    mockLlmProviderService.listProvidersWithModels.mockImplementation(async (_runtimeKind, mapModel) => [
      {
        provider: {
          id: 'provider_gateway',
          name: 'Internal Gateway',
          providerType: 'OPENAI_COMPATIBLE',
          isCustom: true,
          baseUrl: 'https://gateway.example.com/v1',
          credentialStatus: {
            backendHealth: 'READY', storageState: 'CONFIGURED', lifecycle: 'WRITABLE', instructionCode: null,
          },
          status: 'READY',
          statusMessage: null,
        },
        models: [
          mapModel({
            model_identifier: 'openai-compatible:provider_gateway:model-a',
            display_name: 'model-a',
            description: 'Model A · Efficient for routine tasks',
            value: 'model-a',
            canonical_name: 'model-a',
            provider_id: 'provider_gateway',
            provider_name: 'Internal Gateway',
            provider_type: 'OPENAI_COMPATIBLE',
            runtime: 'openai_compatible',
            host_url: 'https://gateway.example.com/v1',
            max_context_tokens: null,
            active_context_tokens: null,
            max_input_tokens: null,
            max_output_tokens: null,
          }),
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
      description: 'Model A · Efficient for routine tasks',
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

  it('groups video models under built-in provider objects', async () => {
    mockModelCatalogService.listVideoModels.mockResolvedValue([
      {
        modelIdentifier: 'gemini-omni-flash-preview',
        name: 'Gemini Omni Flash Preview',
        value: 'gemini-omni-flash-preview',
        provider: 'GEMINI',
        runtime: 'api',
        hostUrl: null,
        parameterSchema: {
          toJsonSchemaDict: () => ({
            type: 'object',
            properties: {
              aspect_ratio: { type: 'string', enum: ['16:9', '9:16'] },
            },
          }),
        },
      },
    ]);

    const resolver = new LlmProviderResolver();
    const result = await resolver.availableVideoProvidersWithModels('autobyteus');

    expect(mockModelCatalogService.listVideoModels).toHaveBeenCalledWith('autobyteus');
    expect(mockBuiltInCatalog.getProvider).toHaveBeenCalledWith('GEMINI');
    expect(result).toEqual([
      expect.objectContaining({
        provider: expect.objectContaining({ id: 'GEMINI' }),
        models: [
          expect.objectContaining({
            modelIdentifier: 'gemini-omni-flash-preview',
            providerId: 'GEMINI',
            configSchema: expect.objectContaining({
              properties: expect.objectContaining({
                aspect_ratio: expect.objectContaining({ enum: ['16:9', '9:16'] }),
              }),
            }),
          }),
        ],
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
      credentialStatus: {
        backendHealth: 'READY', storageState: 'CONFIGURED', lifecycle: 'WRITABLE', instructionCode: null,
      },
      status: 'READY',
      statusMessage: null,
    });

    const resolver = new LlmProviderResolver();
    const result = await resolver.createCustomLlmProvider({
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'synthetic-test-key',
    }, 'autobyteus');

    expect(mockLlmProviderService.createCustomProvider).toHaveBeenCalledWith({
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'synthetic-test-key',
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

  it('reloads LLM and multimedia model catalogs including video models', async () => {
    const resolver = new LlmProviderResolver();
    const result = await resolver.reloadLlmModels('autobyteus');

    expect(result).toBe('All models (LLM and Multimedia) reloaded successfully.');
    expect(mockModelCatalogService.reloadLlmModels).toHaveBeenCalledWith('autobyteus');
    expect(mockModelCatalogService.reloadAudioModels).toHaveBeenCalledWith('autobyteus');
    expect(mockModelCatalogService.reloadImageModels).toHaveBeenCalledWith('autobyteus');
    expect(mockModelCatalogService.reloadVideoModels).toHaveBeenCalledWith('autobyteus');
  });
});
