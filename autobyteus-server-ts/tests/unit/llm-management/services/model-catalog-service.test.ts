import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts';
import { LLMModel } from 'autobyteus-ts/llm/models.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
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
  const emptyExternalCatalog = { listModels: vi.fn().mockResolvedValue([]) };
  let ollamaHosts: string[];
  let discoverOllamaModels: ReturnType<typeof vi.spyOn>;

  const createService = () => new ModelCatalogService(
    builtInCatalog,
    customProviderStore as never,
    customSyncService as never,
    emptyExternalCatalog as never,
    emptyExternalCatalog as never,
  );
  const ollamaModel = (name: string, hostUrl: string, provider = LLMProvider.OLLAMA) => new LLMModel({
    name, value: name, canonicalName: name, provider, runtime: LLMRuntime.OLLAMA, hostUrl,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    LLMFactory.resetForTests();
    AudioClientFactory.reinitialize();
    ImageClientFactory.reinitialize();
    customProviderStore.listProviders.mockResolvedValue([]);
    customProviderStore.getProviderById.mockResolvedValue(null);
    ollamaHosts = ['http://ollama.example.invalid:11434'];
    vi.spyOn(OllamaModelProvider, 'getHosts').mockImplementation(() => ollamaHosts);
    discoverOllamaModels = vi.spyOn(OllamaModelProvider, 'discoverModels')
      .mockResolvedValue({ models: [], successfulHostCount: 1, failedHostCount: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    LLMFactory.resetForTests();
    AudioClientFactory.reinitialize();
    ImageClientFactory.reinitialize();
  });

  it('keeps Claude offered snapshots and exact-current lookup behind one catalog authority', async () => {
    const raw = ['default', 'opus'].map((model_identifier) => ({ model_identifier,
      provider_id: 'ANTHROPIC', provider_name: 'Anthropic', provider_type: 'ANTHROPIC' }));
    const selectionCatalog = vi.fn(async () => ({ offeredModels: [raw[1]],
      findExactCurrent: (id: string) => raw.find((model) => model.model_identifier === id) ?? null }));
    const service = new ModelCatalogService(builtInCatalog, customProviderStore as never,
      customSyncService as never, { selectionCatalog } as never, emptyExternalCatalog as never);
    expect((await service.listLlmModels('claude_agent_sdk')).map((model) => model.model_identifier)).toEqual(['opus']);
    expect((await service.listProviderModelCatalogSnapshots('claude_agent_sdk'))[0]?.llmModels
      .map((model) => model.model_identifier)).toEqual(['opus']);
    expect((await service.resolveExactCurrentLlmModel('claude_agent_sdk', 'default'))?.model_identifier).toBe('default');
    expect(selectionCatalog).toHaveBeenCalledTimes(3);
  });

  it('returns static and cold dynamic registry snapshots without discovery and without a remote AutoByteus provider', async () => {
    const snapshots = await createService().listProviderModelCatalogSnapshots('autobyteus');
    const openAi = snapshots.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.OPENAI);
    const ollama = snapshots.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.OLLAMA);

    expect(openAi).toMatchObject({
      ownerProvider: { catalogMode: 'STATIC' },
      sources: [],
    });
    expect(openAi?.llmModels.length).toBeGreaterThan(0);
    expect(openAi?.imageModels.length).toBeGreaterThan(0);
    expect(ollama).toMatchObject({
      ownerProvider: { catalogMode: 'DISCOVERED' },
      sources: [{ modelKind: 'LLM', state: 'IDLE' }],
    });
    expect(snapshots.map(({ ownerProvider }) => ownerProvider.id)).not.toContain('AUTOBYTEUS');
    expect(discoverOllamaModels).not.toHaveBeenCalled();
  });

  it('rejects reload for a static provider without touching discovery', async () => {
    await expect(createService().reloadProviderModelCatalog(LLMProvider.OPENAI, 'autobyteus'))
      .rejects.toThrow('STATIC_PROVIDER_RELOAD_NOT_SUPPORTED');
    expect(discoverOllamaModels).not.toHaveBeenCalled();
  });

  it('rejects ensure and reload for the removed remote AutoByteus provider as an unknown provider', async () => {
    const service = createService();
    await expect(service.ensureProviderModelCatalog('AUTOBYTEUS', 'autobyteus')).rejects.toThrow('UNKNOWN_MODEL_PROVIDER');
    await expect(service.reloadProviderModelCatalog('AUTOBYTEUS', 'autobyteus')).rejects.toThrow('UNKNOWN_MODEL_PROVIDER');
    expect(discoverOllamaModels).not.toHaveBeenCalled();
  });

  it('projects a dynamically served provider row only through its owning dynamic source', async () => {
    await LLMFactory.ensureInitialized();
    const discovered = ollamaModel('served-openai-model', 'http://ollama.example.invalid:11434', LLMProvider.OPENAI);
    LLMFactory.replaceSourceModels('OLLAMA:LLM', [discovered]);

    const snapshots = await createService().listProviderModelCatalogSnapshots('autobyteus');
    const openAi = snapshots.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.OPENAI)!;
    const ollama = snapshots.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.OLLAMA)!;

    expect(openAi.llmModels.map(({ model_identifier }) => model_identifier))
      .not.toContain(discovered.modelIdentifier);
    expect(ollama.llmModels.map(({ model_identifier }) => model_identifier))
      .toEqual([discovered.modelIdentifier]);
  });

  it('ensures a dynamic provider source once and reuses the warm terminal snapshot', async () => {
    const service = createService();

    const first = await service.ensureProviderModelCatalog(LLMProvider.OLLAMA, 'autobyteus');
    expect(first.sources).toEqual([expect.objectContaining({ modelKind: 'LLM', state: 'READY' })]);
    expect(discoverOllamaModels).toHaveBeenCalledOnce();

    await service.ensureProviderModelCatalog(LLMProvider.OLLAMA, 'autobyteus');
    expect(discoverOllamaModels).toHaveBeenCalledOnce();
  });

  it('ignores a leftover remote AutoByteus host setting change', async () => {
    const service = createService();
    service.notifySettingsChange('AUTOBYTEUS_LLM_SERVER_HOSTS');
    await service.waitForIdle();
    expect(discoverOllamaModels).not.toHaveBeenCalled();
  });

  it('clears the full affected source before an endpoint replacement that fails', async () => {
    await LLMFactory.ensureInitialized();
    LLMFactory.replaceSourceModels('OLLAMA:LLM', [
      ollamaModel('old-host-model', 'http://ollama.example.invalid:11434'),
      ollamaModel('peer-model', 'http://peer.example.invalid:11434'),
    ]);
    ollamaHosts = ['http://replacement.example.invalid:11434', 'http://peer.example.invalid:11434'];
    discoverOllamaModels.mockRejectedValue(new Error('replacement failed'));
    const service = createService();

    service.notifySettingsChange('OLLAMA_HOSTS');

    await expect(LLMFactory.listSourceModels('OLLAMA:LLM')).resolves.toEqual([]);
    await service.waitForIdle();
    const snapshot = await service.listProviderModelCatalogSnapshots('autobyteus');
    const ollama = snapshot.find(({ ownerProvider }) => ownerProvider.id === LLMProvider.OLLAMA)!;
    expect(ollama.llmModels).toEqual([]);
    expect(ollama.sources).toEqual([expect.objectContaining({ modelKind: 'LLM', state: 'ERROR', modelCount: 0 })]);
  });
});
