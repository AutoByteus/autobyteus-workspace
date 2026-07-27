import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  listProviderSettings: vi.fn(),
  getGeminiConfigurationStatus: vi.fn(),
  saveGeminiOptionConfiguration: vi.fn(),
  activateGeminiOption: vi.fn(),
  removeGeminiOptionConfiguration: vi.fn(),
  listProvidersWithModels: vi.fn(),
  setProviderApiKey: vi.fn(),
  removeProviderApiKey: vi.fn(),
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
    apiKeyConfigured: false,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  })),
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

const setupStatus = (overrides: Record<string, unknown> = {}) => ({
  activeMode: null,
  selection: { kind: 'unconfigured' },
  aiStudioStatus: 'MISSING',
  vertexExpressStatus: 'MISSING',
  vertexProjectStatus: 'MISSING',
  project: null,
  location: null,
  ...overrides,
});

describe('LlmProviderResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModelCatalogService.listAudioModels.mockResolvedValue([]);
    mockModelCatalogService.listImageModels.mockResolvedValue([]);
    mockModelCatalogService.listVideoModels.mockResolvedValue([]);
    mockLlmProviderService.listProviderSettings.mockResolvedValue([]);
    mockLlmProviderService.listProvidersWithModels.mockResolvedValue([]);
    mockLlmProviderService.getGeminiConfigurationStatus.mockResolvedValue(setupStatus());
  });

  it('maps one canonical provider and all four required model lists', async () => {
    mockLlmProviderService.listProviderSettings.mockResolvedValue([{
      provider: {
        id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false,
        baseUrl: null, apiKeyConfigured: true, status: 'NOT_APPLICABLE', statusMessage: null,
      },
      llmModels: [{
        model_identifier: 'gpt-4.1', display_name: 'GPT 4.1', description: null,
        value: 'gpt-4.1', canonical_name: 'gpt-4.1', provider_id: 'OPENAI',
        provider_name: 'OpenAI', provider_type: 'OPENAI', runtime: 'api',
      }],
      audioModels: [{
        modelIdentifier: 'whisper-1', name: 'Whisper', value: 'whisper-1',
        provider: 'OPENAI', runtime: 'api', hostUrl: null, parameterSchema: null,
      }],
      imageModels: [],
      videoModels: [],
    }]);

    const result = await new LlmProviderResolver().providerSettings('autobyteus');

    expect(result).toEqual([expect.objectContaining({
      provider: expect.objectContaining({ id: 'OPENAI', apiKeyConfigured: true }),
      llmModels: [expect.objectContaining({ modelIdentifier: 'gpt-4.1', providerId: 'OPENAI' })],
      audioModels: [expect.objectContaining({ modelIdentifier: 'whisper-1', providerId: 'OPENAI' })],
      imageModels: [],
      videoModels: [],
    })]);
    expect(mockLlmProviderService.listProviderSettings).toHaveBeenCalledWith('autobyteus');
  });

  it('maps the tight Gemini setup state and preserves unavailable key status as null', async () => {
    mockLlmProviderService.getGeminiConfigurationStatus.mockResolvedValue(setupStatus({
      activeMode: 'VERTEX_PROJECT',
      selection: { kind: 'vertexProject', project: 'project-id', location: 'global' },
      aiStudioStatus: 'UNAVAILABLE',
      vertexExpressStatus: 'CONFIGURED',
      vertexProjectStatus: 'CONFIGURED',
      project: 'project-id',
      location: 'global',
    }));
    await expect(new LlmProviderResolver().getGeminiSetupConfig()).resolves.toEqual({
      activeMode: 'VERTEX_PROJECT',
      aiStudioConfigured: null,
      vertexExpressConfigured: true,
      vertexProject: { project: 'project-id', location: 'global' },
    });
  });

  it('uses three specialized Gemini save commands and returns the authoritative state', async () => {
    const resultStatus = setupStatus({
      activeMode: 'AI_STUDIO', selection: { kind: 'aiStudio' }, aiStudioStatus: 'CONFIGURED',
    });
    mockLlmProviderService.saveGeminiOptionConfiguration.mockResolvedValue(resultStatus);
    const resolver = new LlmProviderResolver();
    await expect(resolver.saveGeminiAiStudio('synthetic-key', true)).resolves.toEqual({
      activeMode: 'AI_STUDIO', aiStudioConfigured: true,
      vertexExpressConfigured: false, vertexProject: null,
    });
    expect(mockLlmProviderService.saveGeminiOptionConfiguration).toHaveBeenCalledWith(
      { option: 'AI_STUDIO', apiKey: 'synthetic-key' }, true,
    );
  });

  it('uses exact mode commands for activate and remove', async () => {
    const status = setupStatus({ activeMode: 'VERTEX_EXPRESS', vertexExpressStatus: 'CONFIGURED' });
    mockLlmProviderService.activateGeminiOption.mockResolvedValue(status);
    mockLlmProviderService.removeGeminiOptionConfiguration.mockResolvedValue(setupStatus());
    const resolver = new LlmProviderResolver();
    await resolver.useGeminiMode('VERTEX_EXPRESS' as any);
    await resolver.removeGeminiConfiguration('VERTEX_EXPRESS' as any);
    expect(mockLlmProviderService.activateGeminiOption).toHaveBeenCalledWith('VERTEX_EXPRESS');
    expect(mockLlmProviderService.removeGeminiOptionConfiguration).toHaveBeenCalledWith('VERTEX_EXPRESS');
  });

  it('returns only Boolean command completion for ordinary save and remove', async () => {
    const resolver = new LlmProviderResolver();
    await expect(resolver.saveProviderApiKey('OPENAI', 'synthetic-key')).resolves.toBe(true);
    await expect(resolver.removeProviderApiKey('OPENAI')).resolves.toBe(true);
    expect(mockLlmProviderService.setProviderApiKey).toHaveBeenCalledWith('OPENAI', 'synthetic-key');
    expect(mockLlmProviderService.removeProviderApiKey).toHaveBeenCalledWith('OPENAI');
  });

  it('keeps custom command contracts tight', async () => {
    mockLlmProviderService.probeCustomProvider.mockResolvedValue({
      discoveredModels: [{ id: 'model-a', name: 'Model A' }],
    });
    mockLlmProviderService.createCustomProvider.mockResolvedValue('provider_gateway');
    const resolver = new LlmProviderResolver();
    const input = {
      name: 'Internal Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    };
    await expect(resolver.probeCustomProvider(input)).resolves.toEqual({
      discoveredModels: [{ id: 'model-a', name: 'Model A' }],
    });
    await expect(resolver.createCustomProvider(input)).resolves.toBe('provider_gateway');
    await expect(resolver.deleteCustomProvider('provider_gateway')).resolves.toBe(true);
    expect(mockLlmProviderService.createCustomProvider).toHaveBeenCalledWith(input);
    expect(mockLlmProviderService.deleteCustomProvider).toHaveBeenCalledWith('provider_gateway');
  });

  it('keeps established LLM catalog queries available without credential projection', async () => {
    mockLlmProviderService.listProvidersWithModels.mockImplementation(async (_kind, mapModel) => [{
      provider: {
        id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false,
        baseUrl: null, apiKeyConfigured: false, status: 'NOT_APPLICABLE', statusMessage: null,
      },
      models: [mapModel({
        model_identifier: 'gpt', display_name: 'GPT', description: null,
        value: 'gpt', canonical_name: 'gpt', provider_id: 'OPENAI',
        provider_name: 'OpenAI', provider_type: 'OPENAI', runtime: 'api',
      })],
    }]);
    const result = await new LlmProviderResolver().availableLlmProvidersWithModels('autobyteus');
    expect(result[0]).toEqual(expect.objectContaining({
      provider: expect.objectContaining({ id: 'OPENAI' }),
      models: [expect.objectContaining({ modelIdentifier: 'gpt' })],
    }));
  });

  it('reloads all catalog kinds and exact-provider models', async () => {
    mockLlmProviderService.reloadProviderModels.mockResolvedValue(3);
    const resolver = new LlmProviderResolver();
    await expect(resolver.reloadLlmModels('autobyteus'))
      .resolves.toBe('All models (LLM and Multimedia) reloaded successfully.');
    await expect(resolver.reloadLlmProviderModels('OPENAI', 'autobyteus'))
      .resolves.toContain('Reloaded 3 models');
    expect(mockModelCatalogService.reloadVideoModels).toHaveBeenCalledWith('autobyteus');
  });
});
