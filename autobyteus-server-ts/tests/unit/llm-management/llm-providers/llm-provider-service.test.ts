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
  };

  const discovery = {
    probeEndpoint: vi.fn(),
  };

  const createService = () => new LlmProviderService(
    builtInCatalog as any,
    customProviderStore as any,
    customProviderRuntimeSyncService as any,
    modelCatalogService as any,
    discovery as any,
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
    builtInCatalog.isBuiltInProviderId.mockImplementation((providerId: string) => providerId === 'OPENAI');

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
    modelCatalogService.listLlmModels.mockResolvedValue([]);
    modelCatalogService.reloadLlmModels.mockResolvedValue(undefined);
    modelCatalogService.reloadLlmModelsForProvider.mockResolvedValue(2);

    discovery.probeEndpoint.mockReset();
    discovery.probeEndpoint.mockResolvedValue([
      { id: 'model-a', name: 'Model A' },
    ]);
  });

  it('rejects built-in provider name collisions after normalization', async () => {
    const service = createService();

    await expect(service.probeCustomProvider({
      name: '  OpenAI  ',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1/',
      apiKey: 'secret',
    })).rejects.toThrow("Provider name 'OpenAI' conflicts with existing provider 'OpenAI'.");

    expect(discovery.probeEndpoint).not.toHaveBeenCalled();
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
      apiKey: 'secret',
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
      apiKey: 'secret',
    });
    expect(modelCatalogService.reloadLlmModelsForProvider).toHaveBeenCalledWith('provider_gateway', 'autobyteus');
    expect(result).toEqual(expect.objectContaining({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      isCustom: true,
      baseUrl: 'https://gateway.example.com/v1',
      apiKeyConfigured: true,
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
      apiKey: 'secret',
    });

    const service = createService();
    const deletedName = await service.deleteCustomProvider('provider_gateway', 'autobyteus');

    expect(customProviderStore.deleteProvider).toHaveBeenCalledWith('provider_gateway');
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
});
