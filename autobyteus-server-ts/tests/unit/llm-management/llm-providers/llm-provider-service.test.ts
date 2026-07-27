import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { LlmProviderService } from '../../../../src/llm-management/llm-providers/services/llm-provider-service.js';

describe('LlmProviderService', () => {
  const builtInCatalog = {
    listProviders: vi.fn(),
    isBuiltInProviderId: vi.fn(),
  };
  const customProviderStore = {
    listProviders: vi.fn(),
    getProviderById: vi.fn(),
    createProvider: vi.fn(),
    deleteProvider: vi.fn(),
  };
  const customProviderRuntimeSyncService = {
    getStatus: vi.fn(),
    clearUnavailableProviders: vi.fn(),
  };
  const modelCatalogService = {
    listLlmModels: vi.fn(),
    listAudioModels: vi.fn(),
    listImageModels: vi.fn(),
    listVideoModels: vi.fn(),
    reloadLlmModels: vi.fn(),
    reloadLlmModelsForProvider: vi.fn(),
    clearAutobyteusRemoteModels: vi.fn(),
    invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement: vi.fn(),
    invalidateGeminiMetadata: vi.fn(),
  };
  const discovery = { probeEndpoint: vi.fn() };
  const secretManagement = {
    saveForConsumer: vi.fn(),
    removeForConsumer: vi.fn(),
    getStatusForConsumer: vi.fn(),
  };
  const secretVaultRuntime = {
    requireService: vi.fn(() => secretManagement),
    getHealth: vi.fn(),
  };
  const geminiConfigurationService = {
    getSetupStatus: vi.fn(),
    saveOptionConfiguration: vi.fn(),
    activateOption: vi.fn(),
    removeOptionConfiguration: vi.fn(),
  };

  const openAiProvider = {
    id: 'OPENAI',
    name: 'OpenAI',
    providerType: LLMProvider.OPENAI,
    isCustom: false,
    baseUrl: null,
    apiKeyConfigured: false,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  };
  const geminiProvider = {
    id: 'GEMINI',
    name: 'Gemini',
    providerType: LLMProvider.GEMINI,
    isCustom: false,
    baseUrl: null,
    apiKeyConfigured: false,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  };

  const createService = () => new LlmProviderService(
    builtInCatalog as any,
    customProviderStore as any,
    customProviderRuntimeSyncService as any,
    modelCatalogService as any,
    discovery as any,
    secretVaultRuntime as any,
    geminiConfigurationService as any,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    builtInCatalog.listProviders.mockReturnValue([openAiProvider, geminiProvider]);
    builtInCatalog.isBuiltInProviderId.mockImplementation(
      (providerId: string) => ['OPENAI', 'GEMINI', 'AUTOBYTEUS'].includes(providerId),
    );
    customProviderStore.listProviders.mockResolvedValue([]);
    customProviderStore.getProviderById.mockResolvedValue(null);
    customProviderStore.deleteProvider.mockResolvedValue(undefined);
    customProviderRuntimeSyncService.getStatus.mockReturnValue({
      providerId: 'provider_gateway',
      status: 'READY',
      message: null,
      modelCount: 1,
      preservedPreviousModels: false,
    });
    customProviderRuntimeSyncService.clearUnavailableProviders.mockResolvedValue(undefined);
    modelCatalogService.listLlmModels.mockResolvedValue([]);
    modelCatalogService.listAudioModels.mockResolvedValue([]);
    modelCatalogService.listImageModels.mockResolvedValue([]);
    modelCatalogService.listVideoModels.mockResolvedValue([]);
    modelCatalogService.reloadLlmModelsForProvider.mockResolvedValue(1);
    discovery.probeEndpoint.mockResolvedValue([{ id: 'model-a', name: 'Model A' }]);
    secretManagement.saveForConsumer.mockResolvedValue(undefined);
    secretManagement.removeForConsumer.mockResolvedValue(undefined);
    secretVaultRuntime.getHealth.mockResolvedValue({ state: 'READY', instructionCode: null });
    secretManagement.getStatusForConsumer.mockResolvedValue('MISSING');
    geminiConfigurationService.getSetupStatus.mockResolvedValue({
      activeMode: null,
      selection: { kind: 'unconfigured' },
      aiStudioStatus: 'MISSING',
      vertexExpressStatus: 'MISSING',
      vertexProjectStatus: 'MISSING',
      project: null,
      location: null,
    });
  });

  it('composes one provider row with four exact-ID model lists and one credential fact', async () => {
    modelCatalogService.listLlmModels.mockResolvedValue([{
      provider_id: 'OPENAI', name: 'GPT', modelIdentifier: 'gpt',
    }]);
    modelCatalogService.listAudioModels.mockResolvedValue([{
      provider: 'OPENAI', name: 'Whisper', modelIdentifier: 'whisper',
    }]);
    modelCatalogService.listImageModels.mockResolvedValue([{
      provider: 'OPENAI', name: 'Image', modelIdentifier: 'image',
    }]);
    modelCatalogService.listVideoModels.mockResolvedValue([{
      provider: 'GEMINI', name: 'Video', modelIdentifier: 'video',
    }]);
    secretManagement.getStatusForConsumer.mockResolvedValue('CONFIGURED');
    geminiConfigurationService.getSetupStatus.mockResolvedValue({
      activeMode: null,
      selection: { kind: 'unconfigured' },
      aiStudioStatus: 'MISSING',
      vertexExpressStatus: 'CONFIGURED',
      vertexProjectStatus: 'MISSING',
      project: null,
      location: null,
    });

    const result = await createService().listProviderSettings('autobyteus');

    expect(result).toEqual([
      expect.objectContaining({
        provider: expect.objectContaining({ id: 'GEMINI', apiKeyConfigured: true }),
        llmModels: [], audioModels: [], imageModels: [],
        videoModels: [expect.objectContaining({ modelIdentifier: 'video' })],
      }),
      expect.objectContaining({
        provider: expect.objectContaining({ id: 'OPENAI', apiKeyConfigured: true }),
        llmModels: [expect.objectContaining({ modelIdentifier: 'gpt' })],
        audioModels: [expect.objectContaining({ modelIdentifier: 'whisper' })],
        imageModels: [expect.objectContaining({ modelIdentifier: 'image' })],
        videoModels: [],
      }),
    ]);
    expect(secretManagement.getStatusForConsumer).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'OPENAI', credentialSlot: 'apiKey',
    });
  });

  it('rejects orphan catalog rows instead of inventing provider authority', async () => {
    modelCatalogService.listAudioModels.mockResolvedValue([{
      provider: 'ORPHAN', name: 'Orphan', modelIdentifier: 'orphan',
    }]);
    await expect(createService().listProviderSettings('autobyteus'))
      .rejects.toThrow('PROVIDER_SETTINGS_ORPHAN_MODEL');
  });

  it('contains unreadable custom state and clears stale custom runtime rows before catalogs', async () => {
    customProviderStore.listProviders.mockRejectedValue(
      new Error('CUSTOM_PROVIDER_CONFIG_INVALID'),
    );
    modelCatalogService.listLlmModels.mockResolvedValue([{
      provider_id: 'provider_stale',
      name: 'Stale',
      modelIdentifier: 'stale',
    }]);
    customProviderRuntimeSyncService.clearUnavailableProviders.mockRejectedValue(
      new Error('synthetic runtime clear failure'),
    );

    await expect(createService().listProviderSettings('autobyteus')).resolves.toEqual([
      expect.objectContaining({ provider: expect.objectContaining({ id: 'GEMINI' }) }),
      expect.objectContaining({ provider: expect.objectContaining({ id: 'OPENAI' }) }),
    ]);
    expect(customProviderRuntimeSyncService.clearUnavailableProviders).toHaveBeenCalledOnce();
    expect(
      customProviderRuntimeSyncService.clearUnavailableProviders.mock.invocationCallOrder[0],
    ).toBeLessThan(modelCatalogService.listLlmModels.mock.invocationCallOrder[0]!);
    await expect(createService().createCustomProvider({
      name: 'Blocked Until Restart',
      baseUrl: 'https://blocked.synthetic.invalid/v1',
      apiKey: 'synthetic-key',
    })).rejects.toThrow('CUSTOM_PROVIDER_CONFIG_INVALID');
    expect(discovery.probeEndpoint).not.toHaveBeenCalled();
  });

  it('keeps provider catalogs credential-independent when custody is unavailable', async () => {
    secretVaultRuntime.getHealth.mockResolvedValue({ state: 'LOCKED' });
    modelCatalogService.listLlmModels.mockResolvedValue([{
      provider_id: 'OPENAI', provider_name: 'OpenAI', provider_type: LLMProvider.OPENAI,
      name: 'GPT', modelIdentifier: 'gpt',
    }]);
    const rows = await createService().listProvidersWithModels('autobyteus');
    expect(rows.find(({ provider }) => provider.id === 'OPENAI')).toEqual(expect.objectContaining({
      models: [expect.objectContaining({ modelIdentifier: 'gpt' })],
    }));
    expect(secretVaultRuntime.getHealth).not.toHaveBeenCalled();
  });

  it('probes custom providers with constant server type and returns only models', async () => {
    await expect(createService().probeCustomProvider({
      name: ' Internal Gateway ',
      baseUrl: 'https://gateway.example.com/v1/',
      apiKey: ' synthetic-key ',
    })).resolves.toEqual({ discoveredModels: [{ id: 'model-a', name: 'Model A' }] });
    expect(discovery.probeEndpoint).toHaveBeenCalledWith({
      baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    });
  });

  it('rejects normalized provider-name collisions before probing', async () => {
    await expect(createService().probeCustomProvider({
      name: ' openAI ', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    })).rejects.toThrow("conflicts with existing provider 'OpenAI'");
    expect(discovery.probeEndpoint).not.toHaveBeenCalled();
  });

  it('creates custom metadata and credential, returning only the assigned ID', async () => {
    customProviderStore.createProvider.mockResolvedValue({
      id: 'provider_gateway', name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
    });
    await expect(createService().createCustomProvider({
      name: 'Internal Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    })).resolves.toBe('provider_gateway');
    expect(customProviderStore.createProvider).toHaveBeenCalledWith({
      name: 'Internal Gateway', providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
    });
    expect(secretManagement.saveForConsumer).toHaveBeenCalledWith({
      consumer: { kind: 'llm', providerId: 'provider_gateway', credentialSlot: 'apiKey' },
      value: expect.anything(),
    });
  });

  it('compensates custom metadata when credential persistence fails', async () => {
    customProviderStore.createProvider.mockResolvedValue({ id: 'provider_gateway' });
    secretManagement.saveForConsumer.mockRejectedValue(new Error('synthetic vault failure'));
    await expect(createService().createCustomProvider({
      name: 'Internal Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    })).rejects.toThrow('synthetic vault failure');
    expect(customProviderStore.deleteProvider).toHaveBeenCalledWith('provider_gateway');
  });

  it('deletes custom providers idempotently while rejecting built-ins', async () => {
    await expect(createService().deleteCustomProvider('provider_missing')).resolves.toBeUndefined();
    expect(secretManagement.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'provider_missing', credentialSlot: 'apiKey',
    });
    await expect(createService().deleteCustomProvider('OPENAI'))
      .rejects.toThrow("Deleting built-in providers is not supported. Received 'OPENAI'.");
  });

  it('invalidates AutoByteus discovery after save and clears it after remove', async () => {
    await createService().setProviderApiKey('AUTOBYTEUS', 'synthetic-key');
    await createService().removeProviderApiKey('AUTOBYTEUS');
    expect(modelCatalogService.invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement)
      .toHaveBeenCalledOnce();
    expect(modelCatalogService.clearAutobyteusRemoteModels).toHaveBeenCalledOnce();
  });

  it('returns the actual Gemini state and invalidates optional metadata after commands', async () => {
    const configured = {
      activeMode: 'AI_STUDIO', selection: { kind: 'aiStudio' },
      aiStudioStatus: 'CONFIGURED', vertexExpressStatus: 'MISSING',
      vertexProjectStatus: 'MISSING', project: null, location: null,
    };
    geminiConfigurationService.saveOptionConfiguration.mockResolvedValue(configured);
    geminiConfigurationService.activateOption.mockResolvedValue(configured);
    geminiConfigurationService.removeOptionConfiguration.mockResolvedValue(configured);
    const service = createService();
    await expect(service.saveGeminiOptionConfiguration(
      { option: 'AI_STUDIO', apiKey: 'synthetic-key' }, true,
    )).resolves.toBe(configured);
    await service.activateGeminiOption('AI_STUDIO');
    await service.removeGeminiOptionConfiguration('AI_STUDIO');
    expect(modelCatalogService.invalidateGeminiMetadata).toHaveBeenCalledTimes(3);
  });
});
