import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockModelCatalogService = vi.hoisted(() => ({
  listProviderModelCatalogSnapshots: vi.fn(),
  ensureProviderModelCatalog: vi.fn(),
  reloadProviderModelCatalog: vi.fn(),
}));

const mockLlmProviderService = vi.hoisted(() => ({
  listProviderCredentialSettings: vi.fn(),
  getGeminiConfigurationStatus: vi.fn(),
  getQwenSetupStatus: vi.fn(),
  saveQwenConfiguration: vi.fn(),
  saveGeminiOptionConfiguration: vi.fn(),
  activateGeminiOption: vi.fn(),
  setProviderApiKey: vi.fn(),
  probeCustomProvider: vi.fn(),
  createCustomProvider: vi.fn(),
  deleteCustomProvider: vi.fn(),
}));

vi.mock('../../../../../src/llm-management/services/model-catalog-service.js', () => ({
  getModelCatalogService: () => mockModelCatalogService,
}));
vi.mock('../../../../../src/llm-management/llm-providers/services/llm-provider-service.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getLlmProviderService: () => mockLlmProviderService,
}));

import { LlmProviderResolver } from '../../../../../src/api/graphql/types/llm-provider.js';
import {
  QwenConfigurationError,
  QWEN_CONFIGURATION_REPAIR_REQUIRED,
  QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
} from '../../../../../src/llm-management/llm-providers/services/llm-provider-service.js';

const provider = (id: string, isCustom = false) => ({
  id,
  name: id === 'OPENAI' ? 'OpenAI' : id,
  providerType: isCustom ? 'OPENAI_COMPATIBLE' : id,
  isCustom,
  baseUrl: isCustom ? 'https://gateway.example.com/v1' : null,
  catalogMode: isCustom ? 'DISCOVERED' : 'STATIC',
});
const setting = (id: string, apiKeyConfigured: boolean, isCustom = false) => ({
  provider: provider(id, isCustom),
  apiKeyConfigured,
});
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
    mockModelCatalogService.listProviderModelCatalogSnapshots.mockResolvedValue([]);
    mockLlmProviderService.listProviderCredentialSettings.mockResolvedValue([]);
    mockLlmProviderService.getGeminiConfigurationStatus.mockResolvedValue(setupStatus());
    mockLlmProviderService.getQwenSetupStatus.mockResolvedValue({
      effectiveBaseUrl: 'https://default.example/v1',
      endpointSource: 'DEFAULT',
    });
  });

  it('returns credential settings separately from credential-free catalog providers', async () => {
    mockLlmProviderService.listProviderCredentialSettings.mockResolvedValue([
      setting('OPENAI', true),
    ]);

    await expect(new LlmProviderResolver().providerCredentialSettings('autobyteus'))
      .resolves.toEqual([{ provider: provider('OPENAI'), apiKeyConfigured: true }]);
    expect(mockLlmProviderService.listProviderCredentialSettings).toHaveBeenCalledWith('autobyteus');
    expect(mockModelCatalogService.listProviderModelCatalogSnapshots).not.toHaveBeenCalled();
  });

  it('maps tight Gemini setup state and preserves unavailable option status as null', async () => {
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

  it('maps compound Gemini save and activation results without refetch', async () => {
    const setup = setupStatus({
      activeMode: 'AI_STUDIO', selection: { kind: 'aiStudio' }, aiStudioStatus: 'CONFIGURED',
    });
    const commandResult = { setup, credentialSetting: setting('GEMINI', true) };
    mockLlmProviderService.saveGeminiOptionConfiguration.mockResolvedValue(commandResult);
    mockLlmProviderService.activateGeminiOption.mockResolvedValue(commandResult);
    const expected = {
      setup: {
        activeMode: 'AI_STUDIO', aiStudioConfigured: true,
        vertexExpressConfigured: false, vertexProject: null,
      },
      credentialSetting: setting('GEMINI', true),
    };
    const resolver = new LlmProviderResolver();
    await expect(resolver.saveGeminiAiStudio('synthetic-key', true)).resolves.toEqual(expected);
    await expect(resolver.useGeminiMode('AI_STUDIO' as any)).resolves.toEqual(expected);
  });

  it('returns the exact credential setting from an ordinary save', async () => {
    mockLlmProviderService.setProviderApiKey.mockResolvedValue(setting('OPENAI', true));
    await expect(new LlmProviderResolver().saveProviderApiKey('OPENAI', 'synthetic-key'))
      .resolves.toEqual(setting('OPENAI', true));
    expect(mockLlmProviderService.setProviderApiKey).toHaveBeenCalledWith('OPENAI', 'synthetic-key');
  });

  it('maps Qwen setup without a duplicate Boolean and returns compound save state', async () => {
    const commandResult = {
      setup: { effectiveBaseUrl: 'https://regional.example/v1', endpointSource: 'CONFIGURED' },
      credentialSetting: setting('QWEN', true),
    };
    mockLlmProviderService.saveQwenConfiguration.mockResolvedValue(commandResult);
    const resolver = new LlmProviderResolver();

    await expect(resolver.qwenSetupStatus()).resolves.toEqual({
      effectiveBaseUrl: 'https://default.example/v1', endpointSource: 'DEFAULT',
    });
    await expect(resolver.saveQwenConfiguration({
      baseUrl: 'https://regional.example/v1', apiKey: 'synthetic-key',
    })).resolves.toEqual(commandResult);
  });

  it.each([
    [QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED, 'previous configuration is still active'],
    [QWEN_CONFIGURATION_REPAIR_REQUIRED, 'needs repair'],
  ] as const)('allowlists sanitized Qwen failure code %s', async (code, message) => {
    mockLlmProviderService.saveQwenConfiguration.mockRejectedValue(new QwenConfigurationError(code));
    await expect(new LlmProviderResolver().saveQwenConfiguration({
      baseUrl: 'https://regional.example/v1', apiKey: 'synthetic-key',
    })).rejects.toMatchObject({
      message: expect.stringContaining(message),
      extensions: { code },
    });
  });

  it('keeps custom command contracts exact and credential-free on probe', async () => {
    mockLlmProviderService.probeCustomProvider.mockResolvedValue({
      discoveredModels: [{ id: 'model-a', name: 'Model A' }],
    });
    mockLlmProviderService.createCustomProvider.mockResolvedValue(
      setting('provider_gateway', true, true),
    );
    mockLlmProviderService.deleteCustomProvider.mockResolvedValue({
      providerId: 'provider_gateway', deleted: true,
    });
    const resolver = new LlmProviderResolver();
    const input = {
      name: 'Internal Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    };
    await expect(resolver.probeCustomProvider(input)).resolves.toEqual({
      discoveredModels: [{ id: 'model-a', name: 'Model A' }],
    });
    await expect(resolver.createCustomProvider(input))
      .resolves.toEqual(setting('provider_gateway', true, true));
    await expect(resolver.deleteCustomProvider('provider_gateway'))
      .resolves.toEqual({ providerId: 'provider_gateway', deleted: true });
  });

  it('maps local provider snapshots without coupling credential reads', async () => {
    const snapshot = {
      runtimeKind: 'autobyteus',
      ownerProvider: provider('OPENAI'),
      sources: [],
      llmModels: [{
        model_identifier: 'gpt', display_name: 'GPT', description: null,
        value: 'gpt', canonical_name: 'gpt', provider_id: 'OPENAI',
        provider_name: 'OpenAI', provider_type: 'OPENAI', runtime: 'api',
        max_context_tokens: null, active_context_tokens: null,
        max_input_tokens: null, max_output_tokens: null, resolved_model_metadata: null,
      }],
      audioModels: [], imageModels: [], videoModels: [],
    };
    mockModelCatalogService.listProviderModelCatalogSnapshots.mockResolvedValue([snapshot]);

    await expect(new LlmProviderResolver().providerModelCatalogSnapshots('autobyteus'))
      .resolves.toEqual([expect.objectContaining({
        runtimeKind: 'autobyteus',
        ownerProvider: provider('OPENAI'),
        llmModels: [expect.objectContaining({ modelIdentifier: 'gpt', name: 'GPT' })],
      })]);
    expect(mockModelCatalogService.listProviderModelCatalogSnapshots)
      .toHaveBeenCalledWith('autobyteus');
    expect(mockLlmProviderService.listProviderCredentialSettings).not.toHaveBeenCalled();
  });

  it('delegates exact-provider ensure and reload mutations', async () => {
    const snapshot = {
      runtimeKind: 'autobyteus',
      ownerProvider: { ...provider('AUTOBYTEUS'), catalogMode: 'DISCOVERED' },
      sources: [{
        modelKind: 'LLM', state: 'READY', modelCount: 0,
        successfulUnitCount: 1, failedUnitCount: 0, safeMessage: null,
      }],
      llmModels: [], audioModels: [], imageModels: [], videoModels: [],
    };
    mockModelCatalogService.ensureProviderModelCatalog.mockResolvedValue(snapshot);
    mockModelCatalogService.reloadProviderModelCatalog.mockResolvedValue(snapshot);
    const resolver = new LlmProviderResolver();

    await expect(resolver.ensureProviderModelCatalog('AUTOBYTEUS', 'autobyteus'))
      .resolves.toMatchObject({ ownerProvider: { id: 'AUTOBYTEUS' } });
    await expect(resolver.reloadProviderModelCatalog('AUTOBYTEUS', 'autobyteus'))
      .resolves.toMatchObject({ sources: [expect.objectContaining({ state: 'READY' })] });
    expect(mockModelCatalogService.ensureProviderModelCatalog)
      .toHaveBeenCalledWith('AUTOBYTEUS', 'autobyteus');
    expect(mockModelCatalogService.reloadProviderModelCatalog)
      .toHaveBeenCalledWith('AUTOBYTEUS', 'autobyteus');
  });
});
