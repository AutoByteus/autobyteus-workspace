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
import type { LLMModel } from 'autobyteus-ts/llm/models.js';
import { AudioClientFactory } from 'autobyteus-ts/multimedia/audio/audio-client-factory.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import { ImageClientFactory } from 'autobyteus-ts/multimedia/image/image-client-factory.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import { MultimediaRuntime } from 'autobyteus-ts/multimedia/runtimes.js';
import { VideoClientFactory } from 'autobyteus-ts/multimedia/video/video-client-factory.js';
import type { VideoModel } from 'autobyteus-ts/multimedia/video/video-model.js';
import {
  RuntimeKind,
  runtimeKindFromString,
} from '../../runtime-management/runtime-kind-enum.js';
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
import {
  getAutobyteusRemoteModelDiscoveryService,
  type AutobyteusRemoteModel,
  type AutobyteusRemoteModelDiscoveryService,
  type AutobyteusRemoteModelKind,
} from './autobyteus-remote-model-discovery-service.js';
import { getClaudeModelCatalog, type ClaudeModelCatalog } from './claude-model-catalog.js';
import { getCodexModelCatalog, type CodexModelCatalog } from './codex-model-catalog.js';
import {
  DynamicModelSourceLifecycle,
  type DynamicSourceSpec,
} from './dynamic-model-source-lifecycle.js';

const DEFAULT_RUNTIME_KIND = RuntimeKind.AUTOBYTEUS;
const AUTOBYTEUS_KINDS = ['llm', 'audio', 'image'] as const;
const sourceKey = (providerId: string, kind: ModelKind): string => `${providerId}:${kind}`;
const normalizeRuntime = (runtimeKind?: string | null): RuntimeKind =>
  runtimeKindFromString(runtimeKind, DEFAULT_RUNTIME_KIND) ?? DEFAULT_RUNTIME_KIND;

export type LocalProviderModelCatalogSnapshot = ProviderModelCatalogSnapshot<
  ModelInfo,
  AudioModel,
  ImageModel,
  VideoModel
>;

export class ModelCatalogService {
  private readonly lifecycle = new DynamicModelSourceLifecycle();
  private readonly credentialRevisions = new Map<string, number>();

  constructor(
    private readonly builtInCatalog: BuiltInLlmProviderCatalog = getBuiltInLlmProviderCatalog(),
    private readonly customProviderStore: CustomLlmProviderStore = getCustomLlmProviderStore(),
    private readonly customSyncService: CustomLlmProviderRuntimeSyncService =
      getCustomLlmProviderRuntimeSyncService(),
    private readonly remoteDiscoveryService: AutobyteusRemoteModelDiscoveryService =
      getAutobyteusRemoteModelDiscoveryService(),
    private readonly claudeModelCatalog: ClaudeModelCatalog = getClaudeModelCatalog(),
    private readonly codexModelCatalog: CodexModelCatalog = getCodexModelCatalog(),
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
    if (provider.id === LLMProvider.AUTOBYTEUS) {
      await Promise.allSettled(this.startAutobyteusEnsure(false));
    } else {
      await this.ensureLlmSource(provider, false);
    }
    return this.snapshotFor(provider, normalizeRuntime(runtimeKind));
  }

  async reloadProviderModelCatalog(
    providerId: string,
    runtimeKind?: string | null,
  ): Promise<LocalProviderModelCatalogSnapshot> {
    const provider = await this.requireProvider(providerId, runtimeKind);
    if (provider.catalogMode !== 'DISCOVERED') throw new Error('STATIC_PROVIDER_RELOAD_NOT_SUPPORTED');
    if (provider.id === LLMProvider.AUTOBYTEUS) {
      await Promise.allSettled(this.startAutobyteusEnsure(true));
    } else {
      await this.ensureLlmSource(provider, true);
    }
    return this.snapshotFor(provider, normalizeRuntime(runtimeKind));
  }

  notifyCredentialRevision(providerId: string): void {
    const revision = (this.credentialRevisions.get(providerId) ?? 0) + 1;
    this.credentialRevisions.set(providerId, revision);
    if (providerId !== LLMProvider.AUTOBYTEUS) return;
    for (const kind of AUTOBYTEUS_KINDS) {
      const modelKind = kind.toUpperCase() as Exclude<ModelKind, 'VIDEO'>;
      this.lifecycle.invalidate(
        sourceKey(providerId, modelKind),
        this.remoteDiscoveryService.fingerprint(kind, revision),
        true,
      );
    }
    for (const operation of this.startAutobyteusEnsure(false)) {
      void operation.catch(() => undefined);
    }
  }

  notifySettingsChange(settingKey: string): void {
    if (settingKey === 'AUTOBYTEUS_LLM_SERVER_HOSTS') {
      for (const kind of AUTOBYTEUS_KINDS) {
        const modelKind = kind.toUpperCase() as Exclude<ModelKind, 'VIDEO'>;
        const key = sourceKey(LLMProvider.AUTOBYTEUS, modelKind);
        this.lifecycle.invalidate(
          key,
          this.remoteDiscoveryService.fingerprint(
            kind,
            this.credentialRevisions.get(LLMProvider.AUTOBYTEUS) ?? 0,
          ),
          false,
        );
        this.removeAutobyteusSource(kind, key);
      }
      for (const operation of this.startAutobyteusEnsure(false)) {
        void operation.catch(() => undefined);
      }
      return;
    }
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

  async listLlmModels(runtimeKind?: string | null): Promise<ModelInfo[]> {
    const runtime = normalizeRuntime(runtimeKind);
    if (runtime === RuntimeKind.CLAUDE_AGENT_SDK) return this.claudeModelCatalog.listModels();
    if (runtime === RuntimeKind.CODEX_APP_SERVER) return this.codexModelCatalog.listModels();
    return LLMFactory.listAvailableModels();
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

  private startAutobyteusEnsure(force: boolean): Promise<ModelSourceStatus>[] {
    return AUTOBYTEUS_KINDS.map((kind) => this.lifecycle.ensure(
      this.autobyteusSourceSpec(kind),
      force,
    ));
  }

  private autobyteusSourceSpec(
    kind: AutobyteusRemoteModelKind,
  ): DynamicSourceSpec<AutobyteusRemoteModel> {
    const modelKind = kind.toUpperCase() as Exclude<ModelKind, 'VIDEO'>;
    const key = sourceKey(LLMProvider.AUTOBYTEUS, modelKind);
    const revision = this.credentialRevisions.get(LLMProvider.AUTOBYTEUS) ?? 0;
    return {
      key,
      modelKind,
      fingerprint: this.remoteDiscoveryService.fingerprint(kind, revision),
      currentModelCount: () => this.autobyteusSourceCount(kind, key),
      prepare: async () => {
        if (kind === 'llm') await LLMFactory.ensureInitialized();
        return this.remoteDiscoveryService.prepare(kind);
      },
      commit: (models) => this.commitAutobyteusSource(kind, key, models),
    };
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
    const revision = this.credentialRevisions.get(endpoint.id) ?? 0;
    return {
      key,
      modelKind: 'LLM',
      fingerprint: `${endpoint.id}|${endpoint.baseUrl}|credential:${revision}`,
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
    const audioKey = sourceKey(provider.id, 'AUDIO');
    const imageKey = sourceKey(provider.id, 'IMAGE');
    const audioModels = provider.id === LLMProvider.AUTOBYTEUS
      ? AudioClientFactory.listSourceModels(audioKey)
      : AudioClientFactory.listModels().filter((model) =>
        model.runtime === MultimediaRuntime.API && String(model.provider) === provider.id);
    const imageModels = provider.id === LLMProvider.AUTOBYTEUS
      ? ImageClientFactory.listSourceModels(imageKey)
      : ImageClientFactory.listModels().filter((model) =>
        model.runtime === MultimediaRuntime.API && String(model.provider) === provider.id);
    const videoModels = VideoClientFactory.listModels()
      .filter((model) => String(model.provider) === provider.id);
    const sourceStatuses = dynamic
      ? provider.id === LLMProvider.AUTOBYTEUS
        ? [
            this.lifecycle.status(llmKey, 'LLM', llmModels.length),
            this.lifecycle.status(audioKey, 'AUDIO', audioModels.length),
            this.lifecycle.status(imageKey, 'IMAGE', imageModels.length),
          ]
        : [this.lifecycle.status(llmKey, 'LLM', llmModels.length)]
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
    const models = runtime === RuntimeKind.CLAUDE_AGENT_SDK
      ? await this.claudeModelCatalog.listModels()
      : await this.codexModelCatalog.listModels();
    const grouped = new Map<string, ModelInfo[]>();
    for (const model of models) grouped.set(model.provider_id, [
      ...(grouped.get(model.provider_id) ?? []),
      model,
    ]);
    return Array.from(grouped.entries()).map(([providerId, llmModels]) => ({
      runtimeKind: runtime,
      ownerProvider: {
        id: providerId,
        name: llmModels[0]?.provider_name ?? providerId,
        providerType: llmModels[0]?.provider_type ?? LLMProvider.AUTOBYTEUS,
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

  private autobyteusSourceCount(kind: AutobyteusRemoteModelKind, key: string): number {
    if (kind === 'llm') return this.llmSourceCount(key);
    if (kind === 'audio') return AudioClientFactory.listSourceModels(key).length;
    return ImageClientFactory.listSourceModels(key).length;
  }

  private commitAutobyteusSource(
    kind: AutobyteusRemoteModelKind,
    key: string,
    models: readonly AutobyteusRemoteModel[],
  ): void {
    if (kind === 'llm') {
      LLMFactory.replaceSourceModels(key, models as readonly LLMModel[]);
      return;
    }
    if (kind === 'audio') {
      AudioClientFactory.replaceSourceModels(key, models as readonly AudioModel[]);
      return;
    }
    ImageClientFactory.replaceSourceModels(key, models as readonly ImageModel[]);
  }

  private removeAutobyteusSource(
    kind: AutobyteusRemoteModelKind,
    key: string,
  ): void {
    if (kind === 'llm') {
      if (LLMFactory.sourceModelCount(key) > 0) LLMFactory.removeSourceModels(key);
      return;
    }
    if (kind === 'audio') {
      AudioClientFactory.removeSourceModels(key);
      return;
    }
    ImageClientFactory.removeSourceModels(key);
  }
}

let cachedModelCatalogService: ModelCatalogService | null = null;
export const getModelCatalogService = (): ModelCatalogService => {
  cachedModelCatalogService ??= new ModelCatalogService();
  return cachedModelCatalogService;
};
