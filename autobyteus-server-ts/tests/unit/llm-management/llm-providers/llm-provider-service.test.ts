import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_QWEN_BASE_URL, SecretValue, resolveQwenBaseUrl } from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  LlmProviderService,
  QWEN_CONFIGURATION_REPAIR_REQUIRED,
  QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
} from '../../../../src/llm-management/llm-providers/services/llm-provider-service.js';

describe('LlmProviderService', () => {
  const provider = (id: LLMProvider, name: string, catalogMode: 'STATIC' | 'DISCOVERED' = 'STATIC') => ({
    id, name, providerType: id, isCustom: false, baseUrl: null, catalogMode,
  });
  const openAiProvider = provider(LLMProvider.OPENAI, 'OpenAI');
  const geminiProvider = provider(LLMProvider.GEMINI, 'Gemini');
  const autobyteusProvider = provider(LLMProvider.AUTOBYTEUS, 'AutoByteus', 'DISCOVERED');
  const qwenProvider = provider(LLMProvider.QWEN, 'Qwen');
  const builtInProviders = [openAiProvider, geminiProvider, autobyteusProvider, qwenProvider];
  const customEndpoint = {
    id: 'provider_internal_gateway',
    name: 'Internal Gateway',
    providerType: LLMProvider.OPENAI_COMPATIBLE,
    baseUrl: 'https://gateway.example.com/v1',
  };

  const builtInCatalog = {
    listProviders: vi.fn(), getProvider: vi.fn(), isBuiltInProviderId: vi.fn(),
  };
  const customProviderStore = {
    listProviders: vi.fn(), getProviderById: vi.fn(), createProvider: vi.fn(), deleteProvider: vi.fn(),
  };
  const modelCatalogService = {
    notifyCredentialRevision: vi.fn(), seedCustomProvider: vi.fn(), removeCustomProvider: vi.fn(),
  };
  const discovery = { probeEndpoint: vi.fn() };
  const secretManagement = {
    saveForConsumer: vi.fn(), removeForConsumer: vi.fn(),
    getStatusForConsumer: vi.fn(), resolveForUse: vi.fn(),
  };
  const secretVaultRuntime = {
    requireService: vi.fn(() => secretManagement), getHealth: vi.fn(),
  };
  const geminiConfigurationService = {
    getSetupStatus: vi.fn(), saveOptionConfiguration: vi.fn(), activateOption: vi.fn(),
  };
  let configuredQwenBaseUrl: string | undefined;
  const appConfig = {
    get: vi.fn(() => configuredQwenBaseUrl),
    setDurably: vi.fn((_key: string, value: string) => {
      configuredQwenBaseUrl = value;
      return { persisted: true as const };
    }),
  };

  const createService = () => new LlmProviderService(
    builtInCatalog as never,
    customProviderStore as never,
    modelCatalogService as never,
    discovery,
    secretVaultRuntime as never,
    geminiConfigurationService as never,
    appConfig as never,
  );
  const missingGeminiSetup = () => ({
    activeMode: null,
    selection: { kind: 'unconfigured' },
    aiStudioStatus: 'MISSING',
    vertexExpressStatus: 'MISSING',
    vertexProjectStatus: 'MISSING',
    project: null,
    location: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    configuredQwenBaseUrl = undefined;
    appConfig.get.mockImplementation(() => configuredQwenBaseUrl);
    appConfig.setDurably.mockImplementation((_key: string, value: string) => {
      configuredQwenBaseUrl = value;
      return { persisted: true as const };
    });
    builtInCatalog.listProviders.mockReturnValue(builtInProviders);
    builtInCatalog.getProvider.mockImplementation((id: string) =>
      builtInProviders.find((candidate) => candidate.id === id));
    builtInCatalog.isBuiltInProviderId.mockImplementation((id: string) =>
      builtInProviders.some((candidate) => candidate.id === id));
    customProviderStore.listProviders.mockResolvedValue([]);
    customProviderStore.getProviderById.mockResolvedValue(null);
    customProviderStore.createProvider.mockResolvedValue(customEndpoint);
    customProviderStore.deleteProvider.mockResolvedValue(undefined);
    modelCatalogService.seedCustomProvider.mockResolvedValue(undefined);
    discovery.probeEndpoint.mockResolvedValue([{ id: 'model-a', name: 'Model A' }]);
    secretManagement.saveForConsumer.mockResolvedValue(undefined);
    secretManagement.removeForConsumer.mockResolvedValue(undefined);
    secretManagement.getStatusForConsumer.mockResolvedValue('CONFIGURED');
    secretManagement.resolveForUse.mockResolvedValue(SecretValue.fromString('previous-key'));
    secretVaultRuntime.getHealth.mockResolvedValue({ state: 'READY', instructionCode: null });
    geminiConfigurationService.getSetupStatus.mockResolvedValue(missingGeminiSetup());
  });

  it('lists credential settings from local authorities with credential-free catalog descriptors', async () => {
    const result = await createService().listProviderCredentialSettings('autobyteus');

    expect(result.find(({ provider: descriptor }) => descriptor.id === LLMProvider.OPENAI))
      .toEqual({ provider: openAiProvider, apiKeyConfigured: true });
    expect(result.find(({ provider: descriptor }) => descriptor.id === LLMProvider.AUTOBYTEUS))
      .toEqual({ provider: autobyteusProvider, apiKeyConfigured: true });
    expect(result[0]?.provider).not.toHaveProperty('apiKeyConfigured');
    expect(modelCatalogService.notifyCredentialRevision).not.toHaveBeenCalled();
    expect(modelCatalogService.seedCustomProvider).not.toHaveBeenCalled();
  });

  it('probes custom providers with normalized input and no returned credential', async () => {
    await expect(createService().probeCustomProvider({
      name: ' Internal Gateway ', baseUrl: 'https://gateway.example.com/v1/', apiKey: ' key ',
    })).resolves.toEqual({ discoveredModels: [{ id: 'model-a', name: 'Model A' }] });
    expect(discovery.probeEndpoint).toHaveBeenCalledWith({
      baseUrl: 'https://gateway.example.com/v1', apiKey: 'key',
    });
  });

  it('creates a custom provider from one probe and seeds that exact prepared result', async () => {
    const result = await createService().createCustomProvider({
      name: 'Internal Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    });

    expect(result).toEqual({
      provider: { ...customEndpoint, isCustom: true, catalogMode: 'DISCOVERED' },
      apiKeyConfigured: true,
    });
    expect(discovery.probeEndpoint).toHaveBeenCalledTimes(1);
    expect(modelCatalogService.seedCustomProvider).toHaveBeenCalledWith(
      customEndpoint, [{ id: 'model-a', name: 'Model A' }],
    );
    expect(secretManagement.saveForConsumer).toHaveBeenCalledWith({
      consumer: { kind: 'llm', providerId: customEndpoint.id, credentialSlot: 'apiKey' },
      value: expect.any(SecretValue),
    });
  });

  it('compensates custom metadata and credential state when persistence or seeding fails', async () => {
    secretManagement.saveForConsumer.mockRejectedValueOnce(new Error('synthetic vault failure'));
    await expect(createService().createCustomProvider({
      name: 'Internal Gateway', baseUrl: customEndpoint.baseUrl, apiKey: 'synthetic-key',
    })).rejects.toThrow('synthetic vault failure');
    expect(customProviderStore.deleteProvider).toHaveBeenCalledWith(customEndpoint.id);
    expect(modelCatalogService.seedCustomProvider).not.toHaveBeenCalled();

    secretManagement.saveForConsumer.mockResolvedValueOnce(undefined);
    modelCatalogService.seedCustomProvider.mockRejectedValueOnce(new Error('synthetic mapping failure'));
    await expect(createService().createCustomProvider({
      name: 'Internal Gateway', baseUrl: customEndpoint.baseUrl, apiKey: 'synthetic-key',
    })).rejects.toThrow('synthetic mapping failure');
    expect(secretManagement.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm', providerId: customEndpoint.id, credentialSlot: 'apiKey',
    });
  });

  it('removes only the exact custom provider source and rejects built-in deletion', async () => {
    customProviderStore.getProviderById.mockResolvedValueOnce(customEndpoint);
    await expect(createService().deleteCustomProvider(customEndpoint.id)).resolves.toEqual({
      providerId: customEndpoint.id, deleted: true,
    });
    expect(secretManagement.removeForConsumer).toHaveBeenCalledBefore(customProviderStore.deleteProvider);
    expect(modelCatalogService.removeCustomProvider).toHaveBeenCalledWith(customEndpoint.id);
    await expect(createService().deleteCustomProvider('OPENAI'))
      .rejects.toThrow("Deleting built-in providers is not supported. Received 'OPENAI'.");
  });

  it('saves ordinary static credentials without model work and schedules AutoByteus separately', async () => {
    await expect(createService().setProviderApiKey('OPENAI', 'synthetic-key')).resolves.toEqual({
      provider: openAiProvider, apiKeyConfigured: true,
    });
    expect(modelCatalogService.notifyCredentialRevision).not.toHaveBeenCalled();

    await expect(createService().setProviderApiKey('AUTOBYTEUS', 'synthetic-key')).resolves.toEqual({
      provider: autobyteusProvider, apiKeyConfigured: true,
    });
    expect(modelCatalogService.notifyCredentialRevision).toHaveBeenCalledWith(LLMProvider.AUTOBYTEUS);
    await expect(createService().setProviderApiKey('QWEN', 'synthetic-key'))
      .rejects.toThrow('saveQwenConfiguration');
  });

  it('probes and commits Qwen configuration without model catalog coupling', async () => {
    const result = await createService().saveQwenConfiguration({
      baseUrl: ' https://regional.example.com/compatible-mode/v1/ ', apiKey: ' new-key ',
    });
    expect(result).toEqual({
      setup: {
        effectiveBaseUrl: 'https://regional.example.com/compatible-mode/v1',
        endpointSource: 'CONFIGURED',
      },
      credentialSetting: { provider: qwenProvider, apiKeyConfigured: true },
    });
    expect(discovery.probeEndpoint).toHaveBeenCalledWith({
      baseUrl: 'https://regional.example.com/compatible-mode/v1', apiKey: 'new-key',
    });
    expect(modelCatalogService.notifyCredentialRevision).not.toHaveBeenCalled();
  });

  it('restores the previous Qwen key when durable URL persistence fails', async () => {
    appConfig.setDurably.mockImplementationOnce(() => { throw new Error('durable failure'); });
    await expect(createService().saveQwenConfiguration({
      baseUrl: 'https://regional.example.com/v1', apiKey: 'new-key',
    })).rejects.toMatchObject({ code: QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED });
    expect(secretManagement.saveForConsumer).toHaveBeenCalledTimes(2);
    const restored = secretManagement.saveForConsumer.mock.calls[1]?.[0].value as SecretValue;
    expect(restored.revealToTrustedConsumer()).toBe('previous-key');
  });

  it('reports repair-required when Qwen compensation also fails', async () => {
    secretManagement.getStatusForConsumer.mockResolvedValue('MISSING');
    appConfig.setDurably.mockImplementation(() => { throw new Error('durable failure'); });
    secretManagement.removeForConsumer.mockRejectedValue(new Error('removal failure'));
    await expect(createService().saveQwenConfiguration({
      baseUrl: 'https://regional.example.com/v1', apiKey: 'new-key',
    })).rejects.toMatchObject({ code: QWEN_CONFIGURATION_REPAIR_REQUIRED });
  });

  it('returns Gemini command state without dynamic catalog activity', async () => {
    const configured = {
      ...missingGeminiSetup(), activeMode: 'AI_STUDIO', selection: { kind: 'aiStudio' },
      aiStudioStatus: 'CONFIGURED',
    };
    geminiConfigurationService.saveOptionConfiguration.mockResolvedValue(configured);
    geminiConfigurationService.activateOption.mockResolvedValue(configured);
    const expected = {
      setup: configured,
      credentialSetting: { provider: geminiProvider, apiKeyConfigured: true },
    };
    const service = createService();
    await expect(service.saveGeminiOptionConfiguration(
      { option: 'AI_STUDIO', apiKey: 'synthetic-key' }, true,
    )).resolves.toEqual(expected);
    await expect(service.activateGeminiOption('AI_STUDIO')).resolves.toEqual(expected);
    expect(modelCatalogService.notifyCredentialRevision).not.toHaveBeenCalled();
  });

  it('projects the default and configured Qwen endpoint source', async () => {
    await expect(createService().getQwenSetupStatus()).resolves.toEqual({
      effectiveBaseUrl: resolveQwenBaseUrl(), endpointSource: 'DEFAULT',
    });
    configuredQwenBaseUrl = `  ${DEFAULT_QWEN_BASE_URL}  `;
    await expect(createService().getQwenSetupStatus()).resolves.toEqual({
      effectiveBaseUrl: DEFAULT_QWEN_BASE_URL, endpointSource: 'CONFIGURED',
    });
  });
});
