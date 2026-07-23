import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { LlmProviderService } from '../../../../src/llm-management/llm-providers/services/llm-provider-service.js';

describe('LlmProviderService', () => {
  const builtInCatalog = {
    listProviders: vi.fn(),
    isBuiltInProviderId: vi.fn(),
    getProvider: vi.fn(),
  };

  const customProviderStore = {
    listProviders: vi.fn(),
    getProviderById: vi.fn(),
    createProvider: vi.fn(),
    deleteProvider: vi.fn(),
  };

  const customProviderRuntimeSyncService = {
    getStatus: vi.fn(),
  };

  const modelCatalogService = {
    listLlmModels: vi.fn(),
    reloadLlmModels: vi.fn(),
    reloadLlmModelsForProvider: vi.fn(),
    clearAutobyteusRemoteModels: vi.fn(),
    invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement: vi.fn(),
    invalidateGeminiMetadata: vi.fn(),
  };

  const discovery = {
    probeEndpoint: vi.fn(),
  };

  const secretManagement = {
    saveForConsumer: vi.fn(),
    removeForConsumer: vi.fn(),
    getStatusForConsumer: vi.fn(),
  };

  const secretStorageConfiguration = {
    requireManagementService: vi.fn(() => secretManagement),
    snapshot: vi.fn(),
  };

  const geminiConfigurationService = {
    getSetupStatus: vi.fn(),
    saveOptionConfiguration: vi.fn(),
    removeOptionConfiguration: vi.fn(),
  };

  const createService = () => new LlmProviderService(
    builtInCatalog as any,
    customProviderStore as any,
    customProviderRuntimeSyncService as any,
    modelCatalogService as any,
    discovery as any,
    secretStorageConfiguration as any,
    geminiConfigurationService as any,
  );

  beforeEach(() => {
    builtInCatalog.listProviders.mockReset();
    builtInCatalog.isBuiltInProviderId.mockReset();
    builtInCatalog.getProvider.mockReset();
    builtInCatalog.listProviders.mockReturnValue([
      {
        id: 'OPENAI',
        name: 'OpenAI',
        providerType: LLMProvider.OPENAI,
        isCustom: false,
        baseUrl: null,
        apiKeyConfigured: true,
        status: 'NOT_APPLICABLE',
        statusMessage: null,
      },
    ]);
    builtInCatalog.isBuiltInProviderId.mockImplementation(
      (providerId: string) => providerId === 'OPENAI' || providerId === 'AUTOBYTEUS',
    );
    builtInCatalog.getProvider.mockImplementation((providerId: string) => ({
      id: providerId,
      name: providerId === 'AUTOBYTEUS' ? 'AutoByteus' : 'OpenAI',
      providerType: providerId,
      isCustom: false,
      baseUrl: null,
      credentialStatus: null,
      status: 'NOT_APPLICABLE',
      statusMessage: null,
    }));

    customProviderStore.listProviders.mockReset();
    customProviderStore.getProviderById.mockReset();
    customProviderStore.createProvider.mockReset();
    customProviderStore.deleteProvider.mockReset();
    customProviderStore.listProviders.mockResolvedValue([]);
    customProviderStore.getProviderById.mockResolvedValue(null);
    customProviderStore.deleteProvider.mockResolvedValue(undefined);

    customProviderRuntimeSyncService.getStatus.mockReset();
    customProviderRuntimeSyncService.getStatus.mockReturnValue({
      providerId: 'provider_gateway',
      status: 'READY',
      message: null,
      modelCount: 2,
      preservedPreviousModels: false,
    });

    modelCatalogService.listLlmModels.mockReset();
    modelCatalogService.reloadLlmModels.mockReset();
    modelCatalogService.reloadLlmModelsForProvider.mockReset();
    modelCatalogService.clearAutobyteusRemoteModels.mockReset();
    modelCatalogService.invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement.mockReset();
    modelCatalogService.invalidateGeminiMetadata.mockReset();
    modelCatalogService.listLlmModels.mockResolvedValue([]);
    modelCatalogService.reloadLlmModels.mockResolvedValue(undefined);
    modelCatalogService.reloadLlmModelsForProvider.mockResolvedValue(2);

    discovery.probeEndpoint.mockReset();
    discovery.probeEndpoint.mockResolvedValue([
      { id: 'model-a', name: 'Model A' },
    ]);
    secretManagement.saveForConsumer.mockReset();
    secretManagement.removeForConsumer.mockReset();
    secretManagement.getStatusForConsumer.mockReset();
    secretManagement.getStatusForConsumer.mockResolvedValue({
      health: { state: 'READY' },
      secret: { storageState: 'CONFIGURED', lifecycle: { kind: 'WRITABLE' } },
    });
    secretStorageConfiguration.requireManagementService.mockClear();
    secretStorageConfiguration.snapshot.mockReset();
    secretStorageConfiguration.snapshot.mockResolvedValue({
      health: { state: 'READY' },
      lifecycle: { kind: 'WRITABLE' },
    });
    geminiConfigurationService.getSetupStatus.mockReset();
    geminiConfigurationService.saveOptionConfiguration.mockReset();
    geminiConfigurationService.removeOptionConfiguration.mockReset();
    geminiConfigurationService.getSetupStatus.mockResolvedValue({
      selection: { kind: 'unconfigured' },
      effectiveMode: 'UNCONFIGURED',
      aiStudioStatus: 'MISSING',
      vertexExpressStatus: 'MISSING',
      vertexProjectStatus: 'MISSING',
      project: null,
      location: null,
    });
  });

  it('rejects built-in provider name collisions after normalization', async () => {
    const service = createService();

    await expect(service.probeCustomProvider({
      name: '  OpenAI  ',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1/',
      apiKey: 'synthetic-test-key',
    })).rejects.toThrow("Provider name 'OpenAI' conflicts with existing provider 'OpenAI'.");

    expect(discovery.probeEndpoint).not.toHaveBeenCalled();
  });

  it('projects all Gemini option states and their independent effective mode', async () => {
    geminiConfigurationService.getSetupStatus.mockResolvedValue({
      selection: { kind: 'vertexExpress' },
      effectiveMode: 'VERTEX_EXPRESS',
      aiStudioStatus: 'CONFIGURED',
      vertexExpressStatus: 'CONFIGURED',
      vertexProjectStatus: 'CONFIGURED',
      project: 'synthetic-project',
      location: 'global',
    });

    await expect(createService().getGeminiConfigurationStatus()).resolves.toEqual({
      effectiveMode: 'VERTEX_EXPRESS',
      aiStudioCredentialStatus: {
        backendHealth: 'READY',
        storageState: 'CONFIGURED',
        lifecycle: 'WRITABLE',
        instructionCode: null,
      },
      vertexExpressCredentialStatus: {
        backendHealth: 'READY',
        storageState: 'CONFIGURED',
        lifecycle: 'WRITABLE',
        instructionCode: null,
      },
      vertexProjectStatus: 'CONFIGURED',
      vertexProject: 'synthetic-project',
      vertexLocation: 'global',
    });
  });

  it('invalidates optional Gemini metadata after an option-scoped save or remove', async () => {
    geminiConfigurationService.saveOptionConfiguration.mockResolvedValue({
      operation: 'SAVED',
      option: 'AI_STUDIO',
      effectiveMode: 'VERTEX_EXPRESS',
    });
    geminiConfigurationService.removeOptionConfiguration.mockResolvedValue({
      operation: 'REMOVED',
      option: 'VERTEX_EXPRESS',
      effectiveMode: 'AI_STUDIO',
    });
    const service = createService();

    await expect(service.saveGeminiOptionConfiguration({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-key',
    })).resolves.toEqual({
      operation: 'SAVED',
      option: 'AI_STUDIO',
      effectiveMode: 'VERTEX_EXPRESS',
    });
    await expect(service.removeGeminiOptionConfiguration('VERTEX_EXPRESS')).resolves.toEqual({
      operation: 'REMOVED',
      option: 'VERTEX_EXPRESS',
      effectiveMode: 'AI_STUDIO',
    });

    expect(geminiConfigurationService.saveOptionConfiguration).toHaveBeenCalledWith({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-key',
    });
    expect(geminiConfigurationService.removeOptionConfiguration).toHaveBeenCalledWith(
      'VERTEX_EXPRESS',
    );
    expect(modelCatalogService.invalidateGeminiMetadata).toHaveBeenCalledTimes(2);
  });

  it('preserves built-in provider rows when custody and optional model sources fail', async () => {
    secretManagement.getStatusForConsumer.mockRejectedValue(
      new Error('synthetic status failure'),
    );
    secretStorageConfiguration.snapshot.mockRejectedValue(
      new Error('synthetic custody failure'),
    );
    modelCatalogService.listLlmModels.mockRejectedValue(
      new Error('synthetic model-catalog failure'),
    );
    customProviderStore.listProviders.mockRejectedValue(
      new Error('synthetic custom-provider failure'),
    );

    const result = await createService().listProvidersWithModels('autobyteus');

    expect(result).toEqual([{
      provider: expect.objectContaining({
        id: 'OPENAI',
        credentialStatus: {
          backendHealth: 'UNAVAILABLE',
          storageState: null,
          lifecycle: null,
          instructionCode: 'SECRET_BACKEND_STATUS_UNAVAILABLE',
        },
      }),
      models: [],
    }]);
  });

  it('rejects existing custom provider name collisions after normalization', async () => {
    customProviderStore.listProviders.mockResolvedValue([
      {
        id: 'provider_existing',
        name: 'My Gateway',
        providerType: LLMProvider.OPENAI_COMPATIBLE,
        baseUrl: 'https://existing.example.com/v1',
        apiKey: 'secret',
      },
    ]);

    const service = createService();

    await expect(service.probeCustomProvider({
      name: '  my   gateway ',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1/',
      apiKey: 'synthetic-test-key',
    })).rejects.toThrow("Provider name 'my gateway' conflicts with existing provider 'My Gateway'.");

    expect(discovery.probeEndpoint).not.toHaveBeenCalled();
  });

  it('creates custom providers, reloads the real cache path, and returns provider objects', async () => {
    customProviderStore.createProvider.mockResolvedValue({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'secret',
    });

    const service = createService();
    const result = await service.createCustomProvider({
      name: '  Internal   Gateway ',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1/',
      apiKey: ' secret ',
    }, 'autobyteus');

    expect(discovery.probeEndpoint).toHaveBeenCalledWith({
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'secret',
    });
    expect(customProviderStore.createProvider).toHaveBeenCalledWith({
      name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
    });
    expect(secretManagement.saveForConsumer).toHaveBeenCalledWith({
      consumer: { kind: 'llm', providerId: 'provider_gateway', credentialSlot: 'apiKey' },
      value: expect.anything(),
    });
    expect(modelCatalogService.reloadLlmModelsForProvider).toHaveBeenCalledWith('provider_gateway', 'autobyteus');
    expect(result).toEqual(expect.objectContaining({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      isCustom: true,
      baseUrl: 'https://gateway.example.com/v1',
      credentialStatus: {
        backendHealth: 'READY', storageState: 'CONFIGURED', lifecycle: 'WRITABLE', instructionCode: null,
      },
      status: 'READY',
      statusMessage: null,
    }));
  });

  it('deletes saved custom providers and triggers a full authoritative refresh', async () => {
    customProviderStore.getProviderById.mockResolvedValue({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
    });

    const service = createService();
    const deletedName = await service.deleteCustomProvider('provider_gateway', 'autobyteus');

    expect(customProviderStore.deleteProvider).toHaveBeenCalledWith('provider_gateway');
    expect(secretManagement.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'provider_gateway', credentialSlot: 'apiKey',
    });
    expect(modelCatalogService.reloadLlmModels).toHaveBeenCalledWith('autobyteus');
    expect(modelCatalogService.reloadLlmModelsForProvider).not.toHaveBeenCalled();
    expect(deletedName).toBe('Internal Gateway');
  });

  it('rejects deleting built-in providers through the custom delete lifecycle', async () => {
    const service = createService();

    await expect(service.deleteCustomProvider('OPENAI', 'autobyteus')).rejects.toThrow(
      "Deleting built-in providers is not supported in this ticket. Received 'OPENAI'.",
    );

    expect(customProviderStore.deleteProvider).not.toHaveBeenCalled();
    expect(modelCatalogService.reloadLlmModels).not.toHaveBeenCalled();
  });

  it('treats repeated custom-provider deletion as success without mutating models', async () => {
    customProviderStore.getProviderById.mockResolvedValue(null);
    const service = createService();

    await expect(service.deleteCustomProvider('provider_missing', 'autobyteus'))
      .resolves.toBe('provider_missing');
    expect(secretManagement.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'provider_missing', credentialSlot: 'apiKey',
    });
    expect(customProviderStore.deleteProvider).not.toHaveBeenCalled();
    expect(modelCatalogService.reloadLlmModels).not.toHaveBeenCalled();
  });

  it('removes the AutoByteus credential and clears only gateway runtime catalogs', async () => {
    const service = createService();

    await expect(service.removeProviderApiKey('AUTOBYTEUS')).resolves.toEqual(
      expect.objectContaining({ id: 'AUTOBYTEUS', name: 'AutoByteus' }),
    );
    expect(secretManagement.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey',
    });
    expect(modelCatalogService.clearAutobyteusRemoteModels).toHaveBeenCalledOnce();
  });

  it('invalidates AutoByteus discovery only after credential replacement succeeds', async () => {
    secretManagement.saveForConsumer.mockResolvedValue(undefined);
    const service = createService();

    await expect(service.setProviderApiKey('AUTOBYTEUS', 'synthetic-new-key')).resolves.toEqual(
      expect.objectContaining({ id: 'AUTOBYTEUS', name: 'AutoByteus' }),
    );

    expect(secretManagement.saveForConsumer).toHaveBeenCalledWith({
      consumer: { kind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
      value: expect.anything(),
    });
    expect(modelCatalogService.invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement)
      .toHaveBeenCalledOnce();
    expect(secretManagement.saveForConsumer.mock.invocationCallOrder[0]).toBeLessThan(
      modelCatalogService.invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement
        .mock.invocationCallOrder[0]!,
    );
  });
});
