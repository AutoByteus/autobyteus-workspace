import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts';
import { LLMModel } from 'autobyteus-ts/llm/models.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { LLMRuntime } from 'autobyteus-ts/llm/runtimes.js';
import { AudioClientFactory } from 'autobyteus-ts/multimedia/audio/audio-client-factory.js';
import { ImageClientFactory } from 'autobyteus-ts/multimedia/image/image-client-factory.js';
import { BuiltInLlmProviderCatalog } from '../../../../src/llm-management/llm-providers/builtins/built-in-llm-provider-catalog.js';
import { ModelCatalogService } from '../../../../src/llm-management/services/model-catalog-service.js';

describe('ModelCatalogService', () => {
  const builtInCatalog = new BuiltInLlmProviderCatalog();
  const customProviderStore = {
    listProviders: vi.fn(),
    getProviderById: vi.fn(),
  };
  const customSyncService = {
    prepareProvider: vi.fn(),
    prepareRows: vi.fn(),
  };
  const remoteDiscoveryService = {
    configuredHosts: vi.fn(() => ['https://gateway.example.invalid']),
    fingerprint: vi.fn((kind: string, revision: number) => `${kind}|gateway|credential:${revision}`),
    prepare: vi.fn(),
  };
  const emptyExternalCatalog = { listModels: vi.fn().mockResolvedValue([]) };

  const createService = () => new ModelCatalogService(
    builtInCatalog,
    customProviderStore as never,
    customSyncService as never,
    remoteDiscoveryService as never,
    emptyExternalCatalog as never,
    emptyExternalCatalog as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    LLMFactory.resetForTests();
    AudioClientFactory.reinitialize();
    ImageClientFactory.reinitialize();
    customProviderStore.listProviders.mockResolvedValue([]);
    customProviderStore.getProviderById.mockResolvedValue(null);
    remoteDiscoveryService.configuredHosts.mockReturnValue(['https://gateway.example.invalid']);
    remoteDiscoveryService.fingerprint.mockImplementation(
      (kind: string, revision: number) => `${kind}|gateway|credential:${revision}`,
    );
    remoteDiscoveryService.prepare.mockResolvedValue({
      models: [], successfulUnitCount: 1, failedUnitCount: 0,
    });
  });

  afterEach(() => {
    LLMFactory.resetForTests();
    AudioClientFactory.reinitialize();
    ImageClientFactory.reinitialize();
  });

  it('returns static and cold dynamic registry snapshots without remote discovery', async () => {
    const snapshots = await createService().listProviderModelCatalogSnapshots('autobyteus');
    const openAi = snapshots.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.OPENAI);
    const autobyteus = snapshots.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.AUTOBYTEUS);

    expect(openAi).toMatchObject({
      ownerProvider: { catalogMode: 'STATIC' },
      sources: [],
    });
    expect(openAi?.llmModels.length).toBeGreaterThan(0);
    expect(autobyteus).toMatchObject({
      ownerProvider: { catalogMode: 'DISCOVERED' },
      sources: [
        { modelKind: 'LLM', state: 'IDLE' },
        { modelKind: 'AUDIO', state: 'IDLE' },
        { modelKind: 'IMAGE', state: 'IDLE' },
      ],
    });
    expect(remoteDiscoveryService.prepare).not.toHaveBeenCalled();
  });

  it('rejects reload for a static provider without touching discovery', async () => {
    await expect(createService().reloadProviderModelCatalog(LLMProvider.OPENAI, 'autobyteus'))
      .rejects.toThrow('STATIC_PROVIDER_RELOAD_NOT_SUPPORTED');
    expect(remoteDiscoveryService.prepare).not.toHaveBeenCalled();
  });

  it('projects an AutoByteus-served provider row only through its owning dynamic source', async () => {
    await LLMFactory.ensureInitialized();
    const discovered = new LLMModel({
      name: 'remote-openai-model',
      value: 'remote-openai-model',
      canonicalName: 'remote-openai-model',
      provider: LLMProvider.OPENAI,
      runtime: LLMRuntime.AUTOBYTEUS,
      hostUrl: 'https://gateway.example.invalid/v2',
    });
    LLMFactory.replaceSourceModels('AUTOBYTEUS:LLM', [discovered]);

    const snapshots = await createService().listProviderModelCatalogSnapshots('autobyteus');
    const openAi = snapshots.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.OPENAI)!;
    const autobyteus = snapshots.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.AUTOBYTEUS)!;

    expect(openAi.llmModels.map(({ model_identifier }) => model_identifier))
      .not.toContain(discovered.modelIdentifier);
    expect(autobyteus.llmModels.map(({ model_identifier }) => model_identifier))
      .toEqual([discovered.modelIdentifier]);
  });

  it('ensures the three AutoByteus source kinds once and reuses warm terminal snapshots', async () => {
    const service = createService();

    const first = await service.ensureProviderModelCatalog(LLMProvider.AUTOBYTEUS, 'autobyteus');
    expect(first.sources).toEqual([
      expect.objectContaining({ modelKind: 'LLM', state: 'READY' }),
      expect.objectContaining({ modelKind: 'AUDIO', state: 'READY' }),
      expect.objectContaining({ modelKind: 'IMAGE', state: 'READY' }),
    ]);
    expect(remoteDiscoveryService.prepare.mock.calls.map(([kind]) => kind).sort())
      .toEqual(['audio', 'image', 'llm']);

    await service.ensureProviderModelCatalog(LLMProvider.AUTOBYTEUS, 'autobyteus');
    expect(remoteDiscoveryService.prepare).toHaveBeenCalledTimes(3);
  });

  it('invalidates and schedules all AutoByteus kinds without waiting for their completion', async () => {
    const pending = new Promise(() => undefined);
    remoteDiscoveryService.prepare.mockReturnValue(pending);
    const service = createService();

    expect(() => service.notifyCredentialRevision(LLMProvider.AUTOBYTEUS)).not.toThrow();
    await vi.waitFor(() => expect(remoteDiscoveryService.prepare).toHaveBeenCalledTimes(3));
    expect(remoteDiscoveryService.fingerprint.mock.calls.map(([kind, revision]) => [kind, revision]))
      .toEqual(expect.arrayContaining([
        ['llm', 1], ['audio', 1], ['image', 1],
      ]));
  });

  it('clears the full affected source before a same-authority endpoint replacement that fails', async () => {
    await LLMFactory.ensureInitialized();
    const dynamicModel = (name: string, hostUrl: string) => new LLMModel({
      name, value: name, canonicalName: name,
      provider: LLMProvider.AUTOBYTEUS,
      runtime: LLMRuntime.AUTOBYTEUS,
      hostUrl,
    });
    LLMFactory.replaceSourceModels('AUTOBYTEUS:LLM', [
      dynamicModel('old-path', 'http://gateway.example.invalid/path-a'),
      dynamicModel('peer', 'https://peer.example.invalid'),
    ]);
    remoteDiscoveryService.configuredHosts.mockReturnValue([
      'https://gateway.example.invalid/path-b',
      'https://peer.example.invalid',
    ]);
    remoteDiscoveryService.prepare.mockRejectedValue(new Error('replacement failed'));
    const service = createService();

    service.notifySettingsChange('AUTOBYTEUS_LLM_SERVER_HOSTS');

    await expect(LLMFactory.listSourceModels('AUTOBYTEUS:LLM')).resolves.toEqual([]);
    await service.waitForIdle();
    const snapshot = await service.listProviderModelCatalogSnapshots('autobyteus');
    const autobyteus = snapshot.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.AUTOBYTEUS)!;
    expect(autobyteus.llmModels).toEqual([]);
    expect(autobyteus.sources.find(({ modelKind }) => modelKind === 'LLM'))
      .toMatchObject({ state: 'ERROR', modelCount: 0 });
  });
});
