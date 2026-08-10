import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { DEFAULT_QWEN_BASE_URL, SecretValue } from 'autobyteus-ts';
import {
  LlmProviderService,
  QWEN_CONFIGURATION_REPAIR_REQUIRED,
  QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
} from '../../../../src/llm-management/llm-providers/services/llm-provider-service.js';

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
    invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement: vi.fn(),
    invalidateGeminiMetadata: vi.fn(),
  };
  const discovery = { probeEndpoint: vi.fn() };
  const secretManagement = {
    saveForConsumer: vi.fn(),
    removeForConsumer: vi.fn(),
    getStatusForConsumer: vi.fn(),
    resolveForUse: vi.fn(),
  };
  const secretVaultRuntime = {
    requireService: vi.fn(() => secretManagement),
    getHealth: vi.fn(),
  };
  const geminiConfigurationService = {
    getSetupStatus: vi.fn(),
    saveOptionConfiguration: vi.fn(),
    activateOption: vi.fn(),
  };
  let configuredQwenBaseUrl: string | undefined;
  const appConfig = {
    get: vi.fn(() => configuredQwenBaseUrl),
    setDurably: vi.fn((_key: string, value: string) => {
      configuredQwenBaseUrl = value;
      return { persisted: true as const };
    }),
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
    appConfig as any,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    configuredQwenBaseUrl = undefined;
    appConfig.get.mockImplementation(() => configuredQwenBaseUrl);
    appConfig.setDurably.mockImplementation((_key: string, value: string) => {
      configuredQwenBaseUrl = value;
      return { persisted: true as const };
    });
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
    secretManagement.resolveForUse.mockResolvedValue(SecretValue.fromString('previous-key'));
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

  it('rejects a non-derivable custom-provider name before endpoint probing', async () => {
    await expect(createService().probeCustomProvider({
      name: '---', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    })).rejects.toThrow('CUSTOM_PROVIDER_NAME_INVALID');
    expect(discovery.probeEndpoint).not.toHaveBeenCalled();
  });

  it('creates custom metadata and credential, returning only the readable assigned ID', async () => {
    customProviderStore.createProvider.mockResolvedValue({
      id: 'provider_internal_gateway', name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
    });
    await expect(createService().createCustomProvider({
      name: 'Internal Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    })).resolves.toBe('provider_internal_gateway');
    expect(customProviderStore.createProvider).toHaveBeenCalledWith({
      name: 'Internal Gateway', providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
    });
    expect(secretManagement.saveForConsumer).toHaveBeenCalledWith({
      consumer: { kind: 'llm', providerId: 'provider_internal_gateway', credentialSlot: 'apiKey' },
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

  it('deletes a present custom provider through targeted custom runtime synchronization only', async () => {
    customProviderStore.getProviderById.mockResolvedValue({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
    });
    modelCatalogService.reloadLlmModels.mockRejectedValue(
      new Error('AUTOBYTEUS_LLM_DISCOVERY_FAILED'),
    );
    modelCatalogService.reloadLlmModelsForProvider.mockResolvedValue(0);

    await expect(
      createService().deleteCustomProvider('provider_gateway'),
    ).resolves.toBeUndefined();

    expect(secretManagement.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm',
      providerId: 'provider_gateway',
      credentialSlot: 'apiKey',
    });
    expect(customProviderStore.deleteProvider).toHaveBeenCalledWith('provider_gateway');
    expect(modelCatalogService.reloadLlmModelsForProvider).toHaveBeenCalledWith(
      'provider_gateway',
      'autobyteus',
    );
    expect(modelCatalogService.reloadLlmModels).not.toHaveBeenCalled();
    expect(
      secretManagement.removeForConsumer.mock.invocationCallOrder[0],
    ).toBeLessThan(customProviderStore.deleteProvider.mock.invocationCallOrder[0]!);
    expect(
      customProviderStore.deleteProvider.mock.invocationCallOrder[0],
    ).toBeLessThan(modelCatalogService.reloadLlmModelsForProvider.mock.invocationCallOrder[0]!);
  });

  it('does not hide an intrinsic custom runtime synchronization failure after deletion', async () => {
    customProviderStore.getProviderById.mockResolvedValue({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example.com/v1',
    });
    modelCatalogService.reloadLlmModelsForProvider.mockRejectedValue(
      new Error('CUSTOM_PROVIDER_RUNTIME_SYNC_FAILED'),
    );

    await expect(
      createService().deleteCustomProvider('provider_gateway'),
    ).rejects.toThrow('CUSTOM_PROVIDER_RUNTIME_SYNC_FAILED');

    expect(secretManagement.removeForConsumer).toHaveBeenCalledOnce();
    expect(customProviderStore.deleteProvider).toHaveBeenCalledOnce();
    expect(modelCatalogService.reloadLlmModels).not.toHaveBeenCalled();
  });

  it('invalidates AutoByteus discovery after save', async () => {
    await createService().setProviderApiKey('AUTOBYTEUS', 'synthetic-key');
    expect(modelCatalogService.invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement)
      .toHaveBeenCalledOnce();
  });

  it('rejects the obsolete key-only Qwen save path', async () => {
    builtInCatalog.isBuiltInProviderId.mockReturnValue(true);
    await expect(createService().setProviderApiKey('QWEN', 'synthetic-key'))
      .rejects.toThrow('saveQwenConfiguration');
    expect(secretManagement.saveForConsumer).not.toHaveBeenCalled();
  });

  it('projects Qwen default/configured source from setting presence rather than URL equality', async () => {
    secretManagement.getStatusForConsumer.mockResolvedValue('CONFIGURED');
    const service = createService();

    await expect(service.getQwenSetupStatus()).resolves.toEqual({
      effectiveBaseUrl: DEFAULT_QWEN_BASE_URL,
      endpointSource: 'DEFAULT',
      apiKeyConfigured: true,
    });

    configuredQwenBaseUrl = `  ${DEFAULT_QWEN_BASE_URL}  `;
    await expect(service.getQwenSetupStatus()).resolves.toEqual({
      effectiveBaseUrl: DEFAULT_QWEN_BASE_URL,
      endpointSource: 'CONFIGURED',
      apiKeyConfigured: true,
    });
  });

  it('probes, snapshots, saves the key, durably commits the URL, then returns configured status', async () => {
    secretManagement.getStatusForConsumer.mockResolvedValue('CONFIGURED');

    const result = await createService().saveQwenConfiguration({
      baseUrl: ' https://regional.example.com/compatible-mode/v1/ ',
      apiKey: ' new-key ',
    });

    expect(result).toEqual({
      effectiveBaseUrl: 'https://regional.example.com/compatible-mode/v1',
      endpointSource: 'CONFIGURED',
      apiKeyConfigured: true,
    });
    expect(discovery.probeEndpoint).toHaveBeenCalledWith({
      baseUrl: 'https://regional.example.com/compatible-mode/v1',
      apiKey: 'new-key',
    });
    expect(secretManagement.resolveForUse).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'QWEN', credentialSlot: 'apiKey',
    });
    expect(secretManagement.saveForConsumer).toHaveBeenCalledWith({
      consumer: { kind: 'llm', providerId: 'QWEN', credentialSlot: 'apiKey' },
      value: expect.any(SecretValue),
    });
    expect(appConfig.setDurably).toHaveBeenCalledWith(
      'QWEN_BASE_URL',
      'https://regional.example.com/compatible-mode/v1',
    );
    expect(discovery.probeEndpoint.mock.invocationCallOrder[0])
      .toBeLessThan(secretManagement.getStatusForConsumer.mock.invocationCallOrder[0]!);
    expect(secretManagement.saveForConsumer.mock.invocationCallOrder[0])
      .toBeLessThan(appConfig.setDurably.mock.invocationCallOrder[0]!);
  });

  it('writes nothing when Qwen probe fails and does not touch the URL when the new key fails', async () => {
    discovery.probeEndpoint.mockRejectedValueOnce(new Error('Model discovery failed with status 401.'));
    await expect(createService().saveQwenConfiguration({
      baseUrl: 'https://regional.example.com/v1', apiKey: 'bad-key',
    })).rejects.toThrow('status 401');
    expect(secretManagement.getStatusForConsumer).not.toHaveBeenCalled();
    expect(secretManagement.saveForConsumer).not.toHaveBeenCalled();
    expect(appConfig.setDurably).not.toHaveBeenCalled();

    discovery.probeEndpoint.mockResolvedValueOnce([]);
    secretManagement.saveForConsumer.mockRejectedValueOnce(new Error('synthetic vault failure'));
    await expect(createService().saveQwenConfiguration({
      baseUrl: 'https://regional.example.com/v1', apiKey: 'new-key',
    })).rejects.toThrow('previous configuration is still active');
    expect(appConfig.setDurably).not.toHaveBeenCalled();
  });

  it('restores the previous key when durable URL persistence fails', async () => {
    secretManagement.getStatusForConsumer.mockResolvedValue('CONFIGURED');
    appConfig.setDurably.mockImplementationOnce(() => {
      throw new Error('synthetic durable failure');
    });

    await expect(createService().saveQwenConfiguration({
      baseUrl: 'https://regional.example.com/v1', apiKey: 'new-key',
    })).rejects.toMatchObject({
      code: QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
    });

    expect(secretManagement.saveForConsumer).toHaveBeenCalledTimes(2);
    const restored = secretManagement.saveForConsumer.mock.calls[1]?.[0].value as SecretValue;
    expect(restored.revealToTrustedConsumer()).toBe('previous-key');
    expect(secretManagement.removeForConsumer).not.toHaveBeenCalled();
    expect(configuredQwenBaseUrl).toBeUndefined();
  });

  it('removes a newly created key when no previous key existed and reports repair-required on compensation failure', async () => {
    appConfig.setDurably.mockImplementation(() => {
      throw new Error('synthetic durable failure');
    });

    await expect(createService().saveQwenConfiguration({
      baseUrl: 'https://regional.example.com/v1', apiKey: 'new-key',
    })).rejects.toMatchObject({
      code: QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
    });
    expect(secretManagement.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'QWEN', credentialSlot: 'apiKey',
    });

    secretManagement.removeForConsumer.mockRejectedValueOnce(
      new Error('synthetic compensation failure'),
    );
    await expect(createService().saveQwenConfiguration({
      baseUrl: 'https://regional.example.com/v1', apiKey: 'another-key',
    })).rejects.toMatchObject({ code: QWEN_CONFIGURATION_REPAIR_REQUIRED });
  });

  it('returns the actual Gemini state and invalidates optional metadata after commands', async () => {
    const configured = {
      activeMode: 'AI_STUDIO', selection: { kind: 'aiStudio' },
      aiStudioStatus: 'CONFIGURED', vertexExpressStatus: 'MISSING',
      vertexProjectStatus: 'MISSING', project: null, location: null,
    };
    geminiConfigurationService.saveOptionConfiguration.mockResolvedValue(configured);
    geminiConfigurationService.activateOption.mockResolvedValue(configured);
    const service = createService();
    await expect(service.saveGeminiOptionConfiguration(
      { option: 'AI_STUDIO', apiKey: 'synthetic-key' }, true,
    )).resolves.toBe(configured);
    await service.activateGeminiOption('AI_STUDIO');
    expect(modelCatalogService.invalidateGeminiMetadata).toHaveBeenCalledTimes(2);
  });
});
