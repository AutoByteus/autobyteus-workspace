import {
  LLMFactory,
  type CustomLlmProviderRecord,
  type ModelInfo,
  type OpenAICompatibleEndpointDiscoveredModel,
  type OpenAICompatibleEndpointModel,
} from 'autobyteus-ts';
import { LMStudioModelProvider } from 'autobyteus-ts/llm/lmstudio-provider.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { LLMRuntime } from 'autobyteus-ts/llm/runtimes.js';
import { AudioClientFactory } from 'autobyteus-ts/multimedia/audio/audio-client-factory.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import { ImageClientFactory } from 'autobyteus-ts/multimedia/image/image-client-factory.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import { VideoClientFactory } from 'autobyteus-ts/multimedia/video/video-client-factory.js';
import type { VideoModel } from 'autobyteus-ts/multimedia/video/video-model.js';
import {
  RuntimeKind,
  runtimeKindFromString,
} from '../../runtime-management/runtime-kind-enum.js';
import type { ReadDeadline } from '../../runtime-management/read-deadline.js';
import {
  getBuiltInLlmProviderCatalog,
  type BuiltInLlmProviderCatalog,
} from '../llm-providers/builtins/built-in-llm-provider-catalog.js';
import type {
  LlmProviderDescriptor,
  ModelKind,
  ModelSourceStatus,
  ProviderModelCatalogSnapshot,
} from '../llm-providers/domain/models.js';
import {
  getCustomLlmProviderRuntimeSyncService,
  type CustomLlmProviderRuntimeSyncService,
} from '../llm-providers/services/custom-llm-provider-runtime-sync-service.js';
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from '../llm-providers/stores/custom-llm-provider-store.js';
import { getClaudeModelCatalog, type ClaudeModelCatalog } from './claude-model-catalog.js';
import { getCodexModelCatalog, type CodexModelCatalog } from './codex-model-catalog.js';
import { AntigravityModelCatalog } from './antigravity-model-catalog.js';
import { GrokBuildModelCatalog } from './grok-build-model-catalog.js';
import {
  DynamicModelSourceLifecycle,
  type DynamicSourceSpec,
} from './dynamic-model-source-lifecycle.js';

const DEFAULT_RUNTIME_KIND = RuntimeKind.AUTOBYTEUS;
const sourceKey = (providerId: string, kind: ModelKind): string => `${providerId}:${kind}`;
const normalizeRuntime = (runtimeKind?: string | null): RuntimeKind =>
  runtimeKindFromString(runtimeKind, DEFAULT_RUNTIME_KIND) ?? DEFAULT_RUNTIME_KIND;

export type LocalProviderModelCatalogSnapshot = ProviderModelCatalogSnapshot<
  ModelInfo,
  AudioModel,
  ImageModel,
  VideoModel
>;
export type RuntimeModelSelectionCatalog = Readonly<{
  offeredModels: readonly ModelInfo[];
  findExactCurrent: (identifier: string) => ModelInfo | null;
}>;

export class ModelCatalogService {
  private readonly lifecycle = new DynamicModelSourceLifecycle();

  constructor(
    private readonly builtInCatalog: BuiltInLlmProviderCatalog = getBuiltInLlmProviderCatalog(),
    private readonly customProviderStore: CustomLlmProviderStore = getCustomLlmProviderStore(),
    private readonly customSyncService: CustomLlmProviderRuntimeSyncService =
      getCustomLlmProviderRuntimeSyncService(),
    private readonly claudeModelCatalog: ClaudeModelCatalog = getClaudeModelCatalog(),
    private readonly codexModelCatalog: CodexModelCatalog = getCodexModelCatalog(),
    private readonly antigravityModelCatalog = new AntigravityModelCatalog(),
    private readonly grokBuildModelCatalog = new GrokBuildModelCatalog(),
  ) {}

  async listProviderModelCatalogSnapshots(
    runtimeKind?: string | null,
  ): Promise<LocalProviderModelCatalogSnapshot[]> {
    const runtime = normalizeRuntime(runtimeKind);
    if (runtime !== RuntimeKind.AUTOBYTEUS) return this.listExternalRuntimeSnapshots(runtime);
    await LLMFactory.ensureInitialized();
    AudioClientFactory.ensureInitialized();
    ImageClientFactory.ensureInitialized();
    VideoClientFactory.ensureInitialized();
    const customProviders = await this.customProviderStore.listProviders().catch(() => []);
    const providers = [
      ...this.builtInCatalog.listProviders(),
      ...customProviders.map((provider) => this.customDescriptor(provider)),
    ].sort((left, right) => left.name.localeCompare(right.name));
    return Promise.all(providers.map((provider) => this.snapshotFor(provider, runtime)));
  }

  async ensureProviderModelCatalog(
    providerId: string,
    runtimeKind?: string | null,
  ): Promise<LocalProviderModelCatalogSnapshot> {
    const provider = await this.requireProvider(providerId, runtimeKind);
    if (provider.catalogMode === 'STATIC') return this.snapshotFor(provider, normalizeRuntime(runtimeKind));
    await this.ensureLlmSource(provider, false);
    return this.snapshotFor(provider, normalizeRuntime(runtimeKind));
  }

  async reloadProviderModelCatalog(
    providerId: string,
    runtimeKind?: string | null,
  ): Promise<LocalProviderModelCatalogSnapshot> {
    const provider = await this.requireProvider(providerId, runtimeKind);
    if (provider.catalogMode !== 'DISCOVERED') throw new Error('STATIC_PROVIDER_RELOAD_NOT_SUPPORTED');
    await this.ensureLlmSource(provider, true);
    return this.snapshotFor(provider, normalizeRuntime(runtimeKind));
  }

  notifySettingsChange(settingKey: string): void {
    const provider = settingKey === 'OLLAMA_HOSTS'
      ? this.builtInCatalog.getProvider(LLMProvider.OLLAMA)
      : settingKey === 'LMSTUDIO_HOSTS'
        ? this.builtInCatalog.getProvider(LLMProvider.LMSTUDIO)
        : null;
    if (!provider) return;
    const key = sourceKey(provider.id, 'LLM');
    this.lifecycle.invalidate(
      key,
      provider.id === LLMProvider.OLLAMA
        ? `ollama|${OllamaModelProvider.getHosts().join(',')}`
        : `lmstudio|${LMStudioModelProvider.getHosts().join(',')}`,
      false,
    );
    if (LLMFactory.sourceModelCount(key) > 0) LLMFactory.removeSourceModels(key);
    void this.ensureLlmSource(provider, false).catch(() => undefined);
  }

  async seedCustomProvider(
    endpoint: CustomLlmProviderRecord,
    discoveredModels: OpenAICompatibleEndpointDiscoveredModel[],
  ): Promise<void> {
    await LLMFactory.ensureInitialized();
    const prepared = await this.customSyncService.prepareRows(endpoint, discoveredModels);
    const spec = this.customSourceSpec(endpoint);
    this.lifecycle.seed(spec, prepared.models);
  }

  removeCustomProvider(providerId: string): void {
    const key = sourceKey(providerId, 'LLM');
    this.lifecycle.remove(key);
    if (LLMFactory.sourceModelCount(key) > 0) LLMFactory.removeSourceModels(key);
  }

  async listLlmModels(runtimeKind?: string | null, workspaceRootPath?: string): Promise<ModelInfo[]> {
    return [...(await this.runtimeModelSelectionCatalog(runtimeKind, workspaceRootPath)).offeredModels];
  }

  async resolveExactCurrentLlmModel(runtimeKind: string | null | undefined, identifier: string, workspaceRootPath?: string): Promise<ModelInfo | null> {
    return (await this.runtimeModelSelectionCatalog(runtimeKind, workspaceRootPath)).findExactCurrent(identifier);
  }

  /**
   * The runtime's offered models. `deadline`: the end time of the read step (the available-agent-runtimes read), passed
   * to the external runtime's catalog; without it, each catalog's usual time-outs.
   */
  async runtimeModelSelectionCatalog(
    runtimeKind?: string | null,
    workspaceRootPath?: string,
    options: Readonly<{ deadline?: ReadDeadline }> = {},
  ): Promise<RuntimeModelSelectionCatalog> {
    const runtime = normalizeRuntime(runtimeKind);
    if (runtime === RuntimeKind.CLAUDE_AGENT_SDK) return this.claudeModelCatalog.selectionCatalog(options);
    const models = runtime === RuntimeKind.CODEX_APP_SERVER
      ? await this.codexModelCatalog.listModels(workspaceRootPath, options)
      : runtime === RuntimeKind.ANTIGRAVITY_CLI
        ? await this.antigravityModelCatalog.listModels(options)
        : runtime === RuntimeKind.GROK_BUILD
          ? await this.grokBuildModelCatalog.listModels(options)
          : runtime === RuntimeKind.AUTOBYTEUS
            ? await LLMFactory.listAvailableModels()
            : (() => { throw new Error(`Unsupported runtime: ${runtime}`); })();
    return { offeredModels: models, findExactCurrent: (id) => models.find((row) => row.model_identifier === id) ?? null };
  }

  async listAudioModels(runtimeKind?: string | null): Promise<AudioModel[]> {
    return normalizeRuntime(runtimeKind) === RuntimeKind.AUTOBYTEUS
      ? AudioClientFactory.listModels()
      : [];
  }

  async listImageModels(runtimeKind?: string | null): Promise<ImageModel[]> {
    return normalizeRuntime(runtimeKind) === RuntimeKind.AUTOBYTEUS
      ? ImageClientFactory.listModels()
      : [];
  }

  async listVideoModels(runtimeKind?: string | null): Promise<VideoModel[]> {
    return normalizeRuntime(runtimeKind) === RuntimeKind.AUTOBYTEUS
      ? VideoClientFactory.listModels()
      : [];
  }

  async waitForIdle(): Promise<void> {
    await this.lifecycle.waitForIdle();
  }

  private async ensureLlmSource(
    provider: LlmProviderDescriptor,
    force: boolean,
  ): Promise<ModelSourceStatus> {
    if (provider.isCustom) {
      const endpoint = await this.customProviderStore.getProviderById(provider.id);
      if (!endpoint) throw new Error('CUSTOM_PROVIDER_NOT_FOUND');
      return this.lifecycle.ensure(this.customSourceSpec(endpoint), force);
    }
    const key = sourceKey(provider.id, 'LLM');
    if (provider.id === LLMProvider.OLLAMA) {
      return this.lifecycle.ensure({
        key,
        modelKind: 'LLM',
        fingerprint: `ollama|${OllamaModelProvider.getHosts().join(',')}`,
        currentModelCount: () => this.llmSourceCount(key),
        prepare: async () => {
          await LLMFactory.ensureInitialized();
          const report = await OllamaModelProvider.discoverModels();
          if (report.successfulHostCount === 0 && report.failedHostCount > 0) {
            throw new Error('OLLAMA_MODEL_DISCOVERY_UNAVAILABLE');
          }
          return {
            models: report.models,
            successfulUnitCount: report.successfulHostCount,
            failedUnitCount: report.failedHostCount,
          };
        },
        commit: (models) => { LLMFactory.replaceSourceModels(key, models); },
      }, force);
    }
    if (provider.id === LLMProvider.LMSTUDIO) {
      return this.lifecycle.ensure({
        key,
        modelKind: 'LLM',
        fingerprint: `lmstudio|${LMStudioModelProvider.getHosts().join(',')}`,
        currentModelCount: () => this.llmSourceCount(key),
        prepare: async () => {
          await LLMFactory.ensureInitialized();
          const report = await LMStudioModelProvider.discoverModels();
          if (report.successfulHostCount === 0 && report.failedHostCount > 0) {
            throw new Error('LMSTUDIO_MODEL_DISCOVERY_UNAVAILABLE');
          }
          return {
            models: report.models,
            successfulUnitCount: report.successfulHostCount,
            failedUnitCount: report.failedHostCount,
          };
        },
        commit: (models) => { LLMFactory.replaceSourceModels(key, models); },
      }, force);
    }
    throw new Error('DYNAMIC_PROVIDER_NOT_SUPPORTED');
  }

  private customSourceSpec(
    endpoint: CustomLlmProviderRecord,
  ): DynamicSourceSpec<OpenAICompatibleEndpointModel> {
    const key = sourceKey(endpoint.id, 'LLM');
    return {
      key,
      modelKind: 'LLM',
      fingerprint: `${endpoint.id}|${endpoint.baseUrl}`,
      currentModelCount: () => this.llmSourceCount(key),
      prepare: async () => {
        await LLMFactory.ensureInitialized();
        const prepared = await this.customSyncService.prepareProvider(endpoint.id);
        return { models: prepared.models, successfulUnitCount: 1, failedUnitCount: 0 };
      },
      commit: (models) => { LLMFactory.replaceSourceModels(key, models); },
    };
  }

  private async snapshotFor(
    provider: LlmProviderDescriptor,
    runtime: RuntimeKind,
  ): Promise<LocalProviderModelCatalogSnapshot> {
    const dynamic = provider.catalogMode === 'DISCOVERED';
    const llmKey = sourceKey(provider.id, 'LLM');
    const llmModels = dynamic
      ? await LLMFactory.listSourceModels(llmKey)
      : (await LLMFactory.listModelsByProvider(provider.providerType))
        .filter((model) => model.runtime === LLMRuntime.API);
    const audioModels = AudioClientFactory.listModels()
      .filter((model) => String(model.provider) === provider.id);
    const imageModels = ImageClientFactory.listModels()
      .filter((model) => String(model.provider) === provider.id);
    const videoModels = VideoClientFactory.listModels()
      .filter((model) => String(model.provider) === provider.id);
    const sourceStatuses = dynamic
      ? [this.lifecycle.status(llmKey, 'LLM', llmModels.length)]
      : [];
    return {
      runtimeKind: runtime,
      ownerProvider: provider,
      sources: sourceStatuses,
      llmModels,
      audioModels,
      imageModels,
      videoModels,
    };
  }

  private async listExternalRuntimeSnapshots(runtime: RuntimeKind): Promise<LocalProviderModelCatalogSnapshot[]> {
    const models = [...(await this.runtimeModelSelectionCatalog(runtime)).offeredModels];
    const grouped = new Map<string, ModelInfo[]>();
    for (const model of models) grouped.set(model.provider_id, [
      ...(grouped.get(model.provider_id) ?? []),
      model,
    ]);
    return Array.from(grouped.entries()).map(([providerId, llmModels]) => ({
      runtimeKind: runtime,
      ownerProvider: {
        id: providerId,
        name: llmModels[0]!.provider_name,
        providerType: llmModels[0]!.provider_type,
        isCustom: false,
        baseUrl: null,
        catalogMode: 'STATIC',
      },
      sources: [],
      llmModels,
      audioModels: [],
      imageModels: [],
      videoModels: [],
    }));
  }

  private async requireProvider(
    providerId: string,
    runtimeKind?: string | null,
  ): Promise<LlmProviderDescriptor> {
    if (normalizeRuntime(runtimeKind) !== RuntimeKind.AUTOBYTEUS) {
      throw new Error('DYNAMIC_PROVIDER_NOT_AVAILABLE_FOR_RUNTIME');
    }
    const normalized = providerId.trim();
    const upper = normalized.toUpperCase();
    if (this.builtInCatalog.isBuiltInProviderId(upper)) return this.builtInCatalog.getProvider(upper);
    const custom = await this.customProviderStore.getProviderById(normalized);
    if (!custom) throw new Error('UNKNOWN_MODEL_PROVIDER');
    return this.customDescriptor(custom);
  }

  private customDescriptor(provider: CustomLlmProviderRecord): LlmProviderDescriptor {
    return {
      id: provider.id,
      name: provider.name,
      providerType: provider.providerType,
      isCustom: true,
      baseUrl: provider.baseUrl,
      catalogMode: 'DISCOVERED',
    };
  }

  private llmSourceCount(key: string): number {
    return LLMFactory.sourceModelCount(key);
  }
}

let cachedModelCatalogService: ModelCatalogService | null = null;
export const getModelCatalogService = (): ModelCatalogService => {
  cachedModelCatalogService ??= new ModelCatalogService();
  return cachedModelCatalogService;
};
