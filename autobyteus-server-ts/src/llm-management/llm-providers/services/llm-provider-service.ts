import {
  OpenAICompatibleEndpointDiscovery,
  SecretValue,
  normalizeOpenAICompatibleEndpointBaseUrl,
} from 'autobyteus-ts';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import type { VideoModel } from 'autobyteus-ts/multimedia/video/video-model.js';
import type { SecretConsumerIdentity } from '../../../secret-management/domain/secret-id.js';
import {
  getSecretVaultRuntime,
  type SecretVaultRuntime,
} from '../../../secret-management/secret-vault-runtime.js';
import {
  RuntimeKind,
  runtimeKindFromString,
} from '../../../runtime-management/runtime-kind-enum.js';
import {
  getModelCatalogService,
  type ModelCatalogService,
} from '../../services/model-catalog-service.js';
import {
  getGeminiConfigurationService,
  type GeminiConfigurationOption,
  type GeminiConfigurationService,
  type GeminiOptionSaveCommand,
  type GeminiSetupStatus,
} from '../../services/gemini-configuration-service.js';
import {
  getBuiltInLlmProviderCatalog,
  type BuiltInLlmProviderCatalog,
} from '../builtins/built-in-llm-provider-catalog.js';
import {
  normalizeProviderName,
  sortProvidersByName,
  type CustomLlmProviderDraftInput,
  type CustomLlmProviderProbeResult,
  type LlmProviderRecord,
  type LlmProviderWithModels,
  type ProviderSettingsGroup,
} from '../domain/models.js';
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from '../stores/custom-llm-provider-store.js';
import {
  getCustomLlmProviderRuntimeSyncService,
  type CustomLlmProviderRuntimeSyncService,
} from './custom-llm-provider-runtime-sync-service.js';

const DEFAULT_RUNTIME_KIND = RuntimeKind.AUTOBYTEUS;

const resolveRuntimeKind = (runtimeKind?: string | null): RuntimeKind =>
  runtimeKindFromString(runtimeKind, DEFAULT_RUNTIME_KIND) ?? DEFAULT_RUNTIME_KIND;

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

const sortModels = <T extends { name: string; modelIdentifier: string }>(models: T[]): T[] =>
  models.slice().sort((left, right) =>
    left.name === right.name
      ? left.modelIdentifier.localeCompare(right.modelIdentifier)
      : left.name.localeCompare(right.name));

export type ProviderSettings = ProviderSettingsGroup<
  ModelInfo,
  AudioModel,
  ImageModel,
  VideoModel
>;

export class LlmProviderService {
  constructor(
    private readonly builtInCatalog: BuiltInLlmProviderCatalog = getBuiltInLlmProviderCatalog(),
    private readonly customProviderStore: CustomLlmProviderStore = getCustomLlmProviderStore(),
    private readonly customProviderRuntimeSyncService: CustomLlmProviderRuntimeSyncService =
      getCustomLlmProviderRuntimeSyncService(),
    private readonly modelCatalogService: ModelCatalogService = getModelCatalogService(),
    private readonly discovery: Pick<typeof OpenAICompatibleEndpointDiscovery, 'probeEndpoint'> =
      OpenAICompatibleEndpointDiscovery,
    private readonly secretVaultRuntime: SecretVaultRuntime = getSecretVaultRuntime(),
    private readonly geminiConfigurationService: GeminiConfigurationService =
      getGeminiConfigurationService(),
  ) {}

  async listProvidersWithModels<TModel extends {
    providerId: string;
    name: string;
    modelIdentifier: string;
  }>(
    runtimeKind?: string | null,
    mapModel?: (model: ModelInfo) => TModel,
  ): Promise<LlmProviderWithModels<TModel>[]> {
    const customProviders = await this.listCustomProvidersForRead(runtimeKind);
    const customProviderIds = new Set(customProviders.map((provider) => provider.id));
    const modelsInfo = this.omitStaleCustomModels(
      await this.modelCatalogService.listLlmModels(runtimeKind).catch(() => []),
      (model) => model.provider_id,
      customProviderIds,
    );
    const providerById = new Map<string, LlmProviderRecord>([
      ...this.builtInCatalog.listProviders().map((provider) => [provider.id, provider] as const),
      ...customProviders.map((provider) => [provider.id, provider] as const),
    ]);
    const groupedModels = new Map<string, TModel[]>();

    for (const model of modelsInfo) {
      const mapped = mapModel ? mapModel(model) : (model as unknown as TModel);
      groupedModels.set(model.provider_id, [
        ...(groupedModels.get(model.provider_id) ?? []),
        mapped,
      ]);
      if (!providerById.has(model.provider_id)) {
        providerById.set(model.provider_id, {
          id: model.provider_id,
          name: model.provider_name,
          providerType: model.provider_type,
          isCustom: model.provider_type === LLMProvider.OPENAI_COMPATIBLE,
          baseUrl: null,
          apiKeyConfigured: false,
          status: model.provider_type === LLMProvider.OPENAI_COMPATIBLE
            ? 'ERROR'
            : 'NOT_APPLICABLE',
          statusMessage: null,
        });
      }
    }

    return sortProvidersByName(Array.from(providerById.values())).map((provider) => ({
      provider,
      models: sortModels(groupedModels.get(provider.id) ?? []),
    }));
  }

  async listProviderSettings(runtimeKind?: string | null): Promise<ProviderSettings[]> {
    const customProviders = await this.listCustomProvidersForRead(runtimeKind);
    const [allLlmModels, allAudioModels, allImageModels, allVideoModels] = await Promise.all([
      this.modelCatalogService.listLlmModels(runtimeKind),
      this.modelCatalogService.listAudioModels(runtimeKind),
      this.modelCatalogService.listImageModels(runtimeKind),
      this.modelCatalogService.listVideoModels(runtimeKind),
    ]);
    const customProviderIds = new Set(customProviders.map((provider) => provider.id));
    const llmModels = this.omitStaleCustomModels(
      allLlmModels,
      (model) => model.provider_id,
      customProviderIds,
    );
    const audioModels = this.omitStaleCustomModels(
      allAudioModels,
      (model) => String(model.provider),
      customProviderIds,
    );
    const imageModels = this.omitStaleCustomModels(
      allImageModels,
      (model) => String(model.provider),
      customProviderIds,
    );
    const videoModels = this.omitStaleCustomModels(
      allVideoModels,
      (model) => String(model.provider),
      customProviderIds,
    );
    const providers = sortProvidersByName([
      ...this.builtInCatalog.listProviders(),
      ...customProviders,
    ]);
    const knownProviderIds = new Set(providers.map((provider) => provider.id));
    this.assertKnownModelProviders(knownProviderIds, [
      ...llmModels.map((model) => model.provider_id),
      ...audioModels.map((model) => String(model.provider)),
      ...imageModels.map((model) => String(model.provider)),
      ...videoModels.map((model) => String(model.provider)),
    ]);

    return Promise.all(providers.map(async (provider) => ({
      provider: {
        ...provider,
        apiKeyConfigured: await this.isProviderApiKeyConfigured(provider.id),
      },
      llmModels: llmModels.filter((model) => model.provider_id === provider.id),
      audioModels: audioModels.filter((model) => String(model.provider) === provider.id),
      imageModels: imageModels.filter((model) => String(model.provider) === provider.id),
      videoModels: videoModels.filter((model) => String(model.provider) === provider.id),
    })));
  }

  async probeCustomProvider(
    input: CustomLlmProviderDraftInput,
  ): Promise<CustomLlmProviderProbeResult> {
    const draft = await this.normalizeDraftInput(input);
    await this.assertProviderNameAvailable(draft.name);
    const discoveredModels = await this.discovery.probeEndpoint({
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
    });
    return {
      discoveredModels: discoveredModels.map(({ id, name }) => ({ id, name })),
    };
  }

  async createCustomProvider(input: CustomLlmProviderDraftInput): Promise<string> {
    const draft = await this.normalizeDraftInput(input);
    await this.assertProviderNameAvailable(draft.name);
    await this.discovery.probeEndpoint({ baseUrl: draft.baseUrl, apiKey: draft.apiKey });

    const createdProvider = await this.customProviderStore.createProvider({
      name: draft.name,
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: draft.baseUrl,
    });
    try {
      await this.secretVaultRuntime.requireService().saveForConsumer({
        consumer: this.customConsumer(createdProvider.id),
        value: SecretValue.fromString(draft.apiKey),
      });
    } catch (error) {
      await this.customProviderStore.deleteProvider(createdProvider.id);
      throw error;
    }
    await this.modelCatalogService.reloadLlmModelsForProvider(
      createdProvider.id,
      RuntimeKind.AUTOBYTEUS,
    );
    return createdProvider.id;
  }

  async deleteCustomProvider(providerId: string): Promise<void> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    if (this.builtInCatalog.isBuiltInProviderId(normalizedProviderId.toUpperCase())) {
      throw new Error(`Deleting built-in providers is not supported. Received '${providerId}'.`);
    }
    const provider = await this.customProviderStore.getProviderById(normalizedProviderId);
    await this.secretVaultRuntime.requireService().removeForConsumer(
      this.customConsumer(provider?.id ?? normalizedProviderId),
    );
    if (provider) await this.customProviderStore.deleteProvider(provider.id);
    await this.modelCatalogService.reloadLlmModels(RuntimeKind.AUTOBYTEUS);
  }

  async removeProviderApiKey(providerId: string): Promise<void> {
    const normalizedProviderId = this.requireBuiltInProviderId(providerId);
    await this.secretVaultRuntime.requireService().removeForConsumer(
      this.builtInConsumer(normalizedProviderId),
    );
    if (normalizedProviderId === LLMProvider.AUTOBYTEUS) {
      await this.modelCatalogService.clearAutobyteusRemoteModels();
    }
  }

  async setProviderApiKey(providerId: string, apiKey: string): Promise<void> {
    const normalizedProviderId = this.requireBuiltInProviderId(providerId);
    await this.secretVaultRuntime.requireService().saveForConsumer({
      consumer: this.builtInConsumer(normalizedProviderId),
      value: SecretValue.fromString(normalizeRequiredString(apiKey, 'apiKey')),
    });
    if (normalizedProviderId === LLMProvider.AUTOBYTEUS) {
      this.modelCatalogService.invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement();
    }
  }

  async reloadProviderModels(providerId: string, runtimeKind?: string | null): Promise<number> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    await this.assertProviderExists(normalizedProviderId, runtimeKind);
    return this.modelCatalogService.reloadLlmModelsForProvider(normalizedProviderId, runtimeKind);
  }

  async getGeminiConfigurationStatus(): Promise<GeminiSetupStatus> {
    return this.geminiConfigurationService.getSetupStatus();
  }

  async saveGeminiOptionConfiguration(
    input: GeminiOptionSaveCommand,
    activateAfterSave: boolean,
  ): Promise<GeminiSetupStatus> {
    const result = await this.geminiConfigurationService.saveOptionConfiguration(
      input,
      activateAfterSave,
    );
    this.modelCatalogService.invalidateGeminiMetadata();
    return result;
  }

  async activateGeminiOption(option: GeminiConfigurationOption): Promise<GeminiSetupStatus> {
    const result = await this.geminiConfigurationService.activateOption(option);
    this.modelCatalogService.invalidateGeminiMetadata();
    return result;
  }

  async removeGeminiOptionConfiguration(
    option: GeminiConfigurationOption,
  ): Promise<GeminiSetupStatus> {
    const result = await this.geminiConfigurationService.removeOptionConfiguration(option);
    this.modelCatalogService.invalidateGeminiMetadata();
    return result;
  }

  private async listCustomProviders(runtimeKind?: string | null): Promise<LlmProviderRecord[]> {
    if (resolveRuntimeKind(runtimeKind) !== RuntimeKind.AUTOBYTEUS) return [];
    return (await this.customProviderStore.listProviders()).map((provider) =>
      this.mapCustomProvider(
        provider.id,
        provider.name,
        provider.providerType,
        provider.baseUrl,
      ));
  }

  private async listCustomProvidersForRead(
    runtimeKind?: string | null,
  ): Promise<LlmProviderRecord[]> {
    try {
      return await this.listCustomProviders(runtimeKind);
    } catch {
      await this.customProviderRuntimeSyncService.clearUnavailableProviders().catch(() => undefined);
      return [];
    }
  }

  private omitStaleCustomModels<T>(
    models: T[],
    providerIdFor: (model: T) => string,
    currentCustomProviderIds: ReadonlySet<string>,
  ): T[] {
    return models.filter((model) => {
      const providerId = providerIdFor(model);
      return !providerId.startsWith('provider_') || currentCustomProviderIds.has(providerId);
    });
  }

  private mapCustomProvider(
    providerId: string,
    providerName: string,
    providerType: LLMProvider.OPENAI_COMPATIBLE,
    baseUrl: string,
  ): LlmProviderRecord {
    const status = this.customProviderRuntimeSyncService.getStatus(providerId);
    return {
      id: providerId,
      name: providerName,
      providerType,
      isCustom: true,
      baseUrl,
      apiKeyConfigured: false,
      status: status.status,
      statusMessage: status.message ?? null,
    };
  }

  private async isProviderApiKeyConfigured(providerId: string): Promise<boolean> {
    if (providerId === LLMProvider.OLLAMA) return false;
    if (providerId === LLMProvider.GEMINI) {
      const setup = await this.geminiConfigurationService.getSetupStatus();
      return setup.aiStudioStatus === 'CONFIGURED'
        || setup.vertexExpressStatus === 'CONFIGURED'
        || setup.vertexProjectStatus === 'CONFIGURED';
    }
    const uppercasedProviderId = providerId.toUpperCase();
    if (this.builtInCatalog.isBuiltInProviderId(uppercasedProviderId)) {
      return this.isConsumerConfigured(this.builtInConsumer(uppercasedProviderId));
    }
    const customProvider = await this.customProviderStore.getProviderById(providerId);
    return customProvider
      ? this.isConsumerConfigured(this.customConsumer(customProvider.id))
      : false;
  }

  private async isConsumerConfigured(consumer: SecretConsumerIdentity): Promise<boolean> {
    try {
      if ((await this.secretVaultRuntime.getHealth()).state !== 'READY') return false;
      return await this.secretVaultRuntime.requireService().getStatusForConsumer(consumer)
        === 'CONFIGURED';
    } catch {
      return false;
    }
  }

  private assertKnownModelProviders(knownProviderIds: Set<string>, modelProviderIds: string[]): void {
    if (modelProviderIds.some((providerId) => !knownProviderIds.has(providerId))) {
      throw new Error('PROVIDER_SETTINGS_ORPHAN_MODEL');
    }
  }

  private async assertProviderNameAvailable(providerName: string): Promise<void> {
    const normalizedName = normalizeProviderName(providerName);
    const existingNames = new Map<string, string>();
    for (const provider of this.builtInCatalog.listProviders()) {
      existingNames.set(normalizeProviderName(provider.name), provider.name);
    }
    for (const provider of await this.customProviderStore.listProviders()) {
      existingNames.set(normalizeProviderName(provider.name), provider.name);
    }
    const existing = existingNames.get(normalizedName);
    if (existing) {
      throw new Error(`Provider name '${providerName}' conflicts with existing provider '${existing}'.`);
    }
  }

  private async assertProviderExists(providerId: string, runtimeKind?: string | null): Promise<void> {
    if (this.builtInCatalog.isBuiltInProviderId(providerId.toUpperCase())) return;
    if (resolveRuntimeKind(runtimeKind) !== RuntimeKind.AUTOBYTEUS) {
      throw new Error(`Provider '${providerId}' is not available for runtime '${runtimeKind}'.`);
    }
    if (!await this.customProviderStore.getProviderById(providerId)) {
      throw new Error(`Unknown provider '${providerId}'.`);
    }
  }

  private async normalizeDraftInput(input: CustomLlmProviderDraftInput): Promise<{
    name: string;
    baseUrl: string;
    apiKey: string;
  }> {
    return {
      name: normalizeRequiredString(input.name, 'name').replace(/\s+/g, ' '),
      baseUrl: normalizeOpenAICompatibleEndpointBaseUrl(input.baseUrl),
      apiKey: normalizeRequiredString(input.apiKey, 'apiKey'),
    };
  }

  private requireBuiltInProviderId(providerId: string): LLMProvider {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId').toUpperCase();
    if (!this.builtInCatalog.isBuiltInProviderId(normalizedProviderId)) {
      throw new Error(`Unsupported built-in provider '${providerId}'.`);
    }
    return normalizedProviderId;
  }

  private customConsumer(providerId: string): SecretConsumerIdentity {
    return { kind: 'llm', providerId, credentialSlot: 'apiKey' };
  }

  private builtInConsumer(providerId: string): SecretConsumerIdentity {
    if (providerId === LLMProvider.GEMINI) {
      throw new Error('GEMINI_CREDENTIAL_SLOT_REQUIRES_SETUP_COMMAND');
    }
    return { kind: 'llm', providerId, credentialSlot: 'apiKey' };
  }
}

let cachedLlmProviderService: LlmProviderService | null = null;

export const getLlmProviderService = (): LlmProviderService => {
  cachedLlmProviderService ??= new LlmProviderService();
  return cachedLlmProviderService;
};
