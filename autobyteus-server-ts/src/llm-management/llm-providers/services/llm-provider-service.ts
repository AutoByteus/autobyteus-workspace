import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { SecretValue } from 'autobyteus-ts';
import {
  OpenAICompatibleEndpointDiscovery,
  normalizeOpenAICompatibleEndpointBaseUrl,
} from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  getSecretVaultRuntime,
  type SecretVaultRuntime,
} from '../../../secret-management/secret-vault-runtime.js';
import type { SecretConsumerIdentity } from '../../../secret-management/domain/secret-id.js';
import {
  RuntimeKind,
  runtimeKindFromString,
} from '../../../runtime-management/runtime-kind-enum.js';
import { getModelCatalogService, type ModelCatalogService } from '../../services/model-catalog-service.js';
import {
  getBuiltInLlmProviderCatalog,
  type BuiltInLlmProviderCatalog,
} from '../builtins/built-in-llm-provider-catalog.js';
import type {
  CustomLlmProviderDraftInput,
  CredentialStatusProjection,
  CustomLlmProviderProbeResult,
  LlmProviderRecord,
  LlmProviderWithModels,
} from '../domain/models.js';
import { normalizeProviderName, sortProvidersByName } from '../domain/models.js';
import {
  getCustomLlmProviderRuntimeSyncService,
  type CustomLlmProviderRuntimeSyncService,
} from './custom-llm-provider-runtime-sync-service.js';
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from '../stores/custom-llm-provider-store.js';
import {
  getGeminiConfigurationService,
  type GeminiConfigurationService,
  type GeminiConfigurationOperationResult,
  type GeminiConfigurationOption,
  type GeminiConfigurationState,
  type GeminiOptionSaveCommand,
} from '../../services/gemini-configuration-service.js';

const DEFAULT_RUNTIME_KIND = RuntimeKind.AUTOBYTEUS;

const resolveRuntimeKind = (runtimeKind?: string | null): RuntimeKind =>
  runtimeKindFromString(runtimeKind, DEFAULT_RUNTIME_KIND) ?? DEFAULT_RUNTIME_KIND;

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }
  return normalized;
};

const sortModels = <T extends { name: string; modelIdentifier: string }>(models: T[]): T[] =>
  models
    .slice()
    .sort((left, right) => {
      if (left.name !== right.name) {
        return left.name.localeCompare(right.name);
      }
      return left.modelIdentifier.localeCompare(right.modelIdentifier);
    });

export class LlmProviderService {
  constructor(
    private readonly builtInCatalog: BuiltInLlmProviderCatalog = getBuiltInLlmProviderCatalog(),
    private readonly customProviderStore: CustomLlmProviderStore = getCustomLlmProviderStore(),
    private readonly customProviderRuntimeSyncService: CustomLlmProviderRuntimeSyncService =
      getCustomLlmProviderRuntimeSyncService(),
    private readonly modelCatalogService: ModelCatalogService = getModelCatalogService(),
    private readonly discovery: Pick<typeof OpenAICompatibleEndpointDiscovery, 'probeEndpoint'> =
      OpenAICompatibleEndpointDiscovery,
    private readonly secretVaultRuntime: SecretVaultRuntime =
      getSecretVaultRuntime(),
    private readonly geminiConfigurationService: GeminiConfigurationService =
      getGeminiConfigurationService(),
  ) {}

  async listProvidersWithModels<TModel extends { providerId: string; name: string; modelIdentifier: string }>(
    runtimeKind?: string | null,
    mapModel?: (model: ModelInfo) => TModel,
  ): Promise<LlmProviderWithModels<TModel>[]> {
    const builtInProviderRecords = this.builtInCatalog.listProviders();
    const builtInProviders = await Promise.all(
      builtInProviderRecords.map((provider) => this.withCredentialStatusOrUnavailable(provider)),
    );
    const [modelsInfo, customProviders] = await Promise.all([
      this.modelCatalogService.listLlmModels(runtimeKind).catch(() => []),
      this.listCustomProviders(runtimeKind).catch(() => []),
    ]);
    const providerById = new Map<string, LlmProviderRecord>([
      ...builtInProviders.map((provider) => [provider.id, provider] as const),
      ...customProviders.map((provider) => [provider.id, provider] as const),
    ]);
    const groupedModels = new Map<string, TModel[]>();

    for (const model of modelsInfo) {
      const mapped = mapModel ? mapModel(model) : (model as unknown as TModel);
      const existing = groupedModels.get(model.provider_id) ?? [];
      existing.push(mapped);
      groupedModels.set(model.provider_id, existing);

      if (!providerById.has(model.provider_id)) {
        providerById.set(model.provider_id, {
          id: model.provider_id,
          name: model.provider_name,
          providerType: model.provider_type,
          isCustom: model.provider_type === LLMProvider.OPENAI_COMPATIBLE,
          baseUrl: null,
          credentialStatus: null,
          status: model.provider_type === LLMProvider.OPENAI_COMPATIBLE ? 'ERROR' : 'NOT_APPLICABLE',
          statusMessage: null,
        });
      }
    }

    return sortProvidersByName(Array.from(providerById.values())).map((provider) => ({
      provider,
      models: sortModels(groupedModels.get(provider.id) ?? []),
    }));
  }

  async probeCustomProvider(input: CustomLlmProviderDraftInput): Promise<CustomLlmProviderProbeResult> {
    const draft = await this.normalizeDraftInput(input);
    await this.assertProviderNameAvailable(draft.name);
    const discoveredModels = await this.discovery.probeEndpoint({
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
    });

    return {
      name: draft.name,
      providerType: draft.providerType,
      baseUrl: draft.baseUrl,
      discoveredModels: discoveredModels.map((model) => ({
        id: model.id,
        name: model.name,
      })),
    };
  }

  async createCustomProvider(
    input: CustomLlmProviderDraftInput,
    runtimeKind?: string | null,
  ): Promise<LlmProviderRecord> {
    const draft = await this.normalizeDraftInput(input);
    await this.assertProviderNameAvailable(draft.name);

    await this.discovery.probeEndpoint({
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
    });

    const createdProvider = await this.customProviderStore.createProvider({
      name: draft.name,
      providerType: draft.providerType,
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
    await this.modelCatalogService.reloadLlmModelsForProvider(createdProvider.id, runtimeKind);
    return this.mapCustomProvider(
      createdProvider.id,
      createdProvider.name,
      createdProvider.providerType,
      createdProvider.baseUrl,
      await this.getCredentialStatus(this.customConsumer(createdProvider.id)),
    );
  }

  async deleteCustomProvider(providerId: string, runtimeKind?: string | null): Promise<string> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    if (this.builtInCatalog.isBuiltInProviderId(normalizedProviderId.toUpperCase())) {
      throw new Error(`Deleting built-in providers is not supported in this ticket. Received '${providerId}'.`);
    }
    if (resolveRuntimeKind(runtimeKind) !== RuntimeKind.AUTOBYTEUS) {
      throw new Error(`Provider '${providerId}' is not available for runtime '${runtimeKind ?? DEFAULT_RUNTIME_KIND}'.`);
    }
    const provider = await this.customProviderStore.getProviderById(normalizedProviderId);
    if (!provider) {
      await this.secretVaultRuntime
        .requireService()
        .removeForConsumer(this.customConsumer(normalizedProviderId));
      return normalizedProviderId;
    }
    await this.secretVaultRuntime
      .requireService()
      .removeForConsumer(this.customConsumer(provider.id));
    await this.customProviderStore.deleteProvider(provider.id);
    await this.modelCatalogService.reloadLlmModels(runtimeKind);
    return provider.name;
  }

  async removeProviderApiKey(providerId: string): Promise<LlmProviderRecord> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId').toUpperCase();
    if (!this.builtInCatalog.isBuiltInProviderId(normalizedProviderId)) {
      throw new Error(`Removing API keys is only supported for built-in providers. Received '${providerId}'.`);
    }
    await this.secretVaultRuntime
      .requireService()
      .removeForConsumer(this.builtInConsumer(normalizedProviderId));
    if (normalizedProviderId === LLMProvider.AUTOBYTEUS) {
      await this.modelCatalogService.clearAutobyteusRemoteModels();
    }
    return this.withCredentialStatus(this.builtInCatalog.getProvider(normalizedProviderId));
  }

  async setProviderApiKey(providerId: string, apiKey: string): Promise<LlmProviderRecord> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId').toUpperCase();
    const normalizedApiKey = normalizeRequiredString(apiKey, 'apiKey');

    if (!this.builtInCatalog.isBuiltInProviderId(normalizedProviderId)) {
      throw new Error(`Setting API keys is only supported for built-in providers in this ticket. Received '${providerId}'.`);
    }

    await this.secretVaultRuntime.requireService().saveForConsumer({
      consumer: this.builtInConsumer(normalizedProviderId),
      value: SecretValue.fromString(normalizedApiKey),
    });
    if (normalizedProviderId === LLMProvider.AUTOBYTEUS) {
      this.modelCatalogService.invalidateAutobyteusRemoteDiscoveryAfterCredentialReplacement();
    }
    return this.withCredentialStatus(this.builtInCatalog.getProvider(normalizedProviderId));
  }

  async getProviderCredentialStatus(providerId: string): Promise<CredentialStatusProjection | null> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    const uppercasedProviderId = normalizedProviderId.toUpperCase();
    if (this.builtInCatalog.isBuiltInProviderId(uppercasedProviderId)) {
      return (await this.withCredentialStatus(this.builtInCatalog.getProvider(uppercasedProviderId)))
        .credentialStatus;
    }

    const customProvider = await this.customProviderStore.getProviderById(normalizedProviderId);
    if (!customProvider) return null;
    return this.getCredentialStatus(this.customConsumer(customProvider.id));
  }

  async reloadProviderModels(providerId: string, runtimeKind?: string | null): Promise<number> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    await this.assertProviderExists(normalizedProviderId, runtimeKind);
    return this.modelCatalogService.reloadLlmModelsForProvider(normalizedProviderId, runtimeKind);
  }

  async getGeminiConfigurationStatus(): Promise<{
    activeMode: GeminiConfigurationOption | null;
    aiStudioCredentialStatus: CredentialStatusProjection;
    vertexExpressCredentialStatus: CredentialStatusProjection;
    vertexProjectStatus: GeminiConfigurationState;
    vertexProject: string | null;
    vertexLocation: string | null;
  }> {
    const setup = await this.geminiConfigurationService.getSetupStatus();
    return {
      activeMode: setup.activeMode,
      aiStudioCredentialStatus: await this.getCredentialStatus({
        kind: 'llm', providerId: LLMProvider.GEMINI, credentialSlot: 'geminiAiStudioApiKey',
      }),
      vertexExpressCredentialStatus: await this.getCredentialStatus({
        kind: 'llm', providerId: LLMProvider.GEMINI, credentialSlot: 'geminiVertexExpressApiKey',
      }),
      vertexProjectStatus: setup.vertexProjectStatus,
      vertexProject: setup.project,
      vertexLocation: setup.location,
    };
  }

  async saveGeminiOptionConfiguration(
    input: GeminiOptionSaveCommand,
  ): Promise<GeminiConfigurationOperationResult> {
    const result = await this.geminiConfigurationService.saveOptionConfiguration(input);
    this.modelCatalogService.invalidateGeminiMetadata();
    return result;
  }

  async activateGeminiOption(
    option: GeminiConfigurationOption,
  ): Promise<GeminiConfigurationOperationResult> {
    const result = await this.geminiConfigurationService.activateOption(option);
    this.modelCatalogService.invalidateGeminiMetadata();
    return result;
  }

  async saveAndActivateGeminiOption(
    input: GeminiOptionSaveCommand,
  ): Promise<GeminiConfigurationOperationResult> {
    const result = await this.geminiConfigurationService.saveAndActivateOption(input);
    this.modelCatalogService.invalidateGeminiMetadata();
    return result;
  }

  async removeGeminiOptionConfiguration(
    option: GeminiConfigurationOption,
  ): Promise<GeminiConfigurationOperationResult> {
    const result = await this.geminiConfigurationService.removeOptionConfiguration(option);
    this.modelCatalogService.invalidateGeminiMetadata();
    return result;
  }

  private async listCustomProviders(runtimeKind?: string | null): Promise<LlmProviderRecord[]> {
    if (resolveRuntimeKind(runtimeKind) !== RuntimeKind.AUTOBYTEUS) {
      return [];
    }

    const customProviders = await this.customProviderStore.listProviders();
    return Promise.all(customProviders.map(async (provider) =>
      this.mapCustomProvider(
        provider.id,
        provider.name,
        provider.providerType,
        provider.baseUrl,
        await this.getCredentialStatus(this.customConsumer(provider.id)),
      ),
    ));
  }

  private mapCustomProvider(
    providerId: string,
    providerName: string,
    providerType: LLMProvider.OPENAI_COMPATIBLE,
    baseUrl: string,
    credentialStatus: CredentialStatusProjection,
  ): LlmProviderRecord {
    const status = this.customProviderRuntimeSyncService.getStatus(providerId);
    return {
      id: providerId,
      name: providerName,
      providerType,
      isCustom: true,
      baseUrl,
      credentialStatus,
      status: status.status,
      statusMessage: status.message ?? null,
    };
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
    if (this.builtInCatalog.isBuiltInProviderId(providerId.toUpperCase())) {
      return;
    }

    await this.getCustomProviderOrThrow(providerId, runtimeKind);
  }

  private async getCustomProviderOrThrow(providerId: string, runtimeKind?: string | null) {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    if (this.builtInCatalog.isBuiltInProviderId(normalizedProviderId.toUpperCase())) {
      throw new Error(`Deleting built-in providers is not supported in this ticket. Received '${providerId}'.`);
    }

    if (resolveRuntimeKind(runtimeKind) !== RuntimeKind.AUTOBYTEUS) {
      throw new Error(`Provider '${providerId}' is not available for runtime '${runtimeKind ?? DEFAULT_RUNTIME_KIND}'.`);
    }

    const provider = await this.customProviderStore.getProviderById(normalizedProviderId);
    if (!provider) {
      throw new Error(`Unknown provider '${providerId}'.`);
    }

    return provider;
  }

  private async normalizeDraftInput(input: CustomLlmProviderDraftInput): Promise<{
    name: string;
    providerType: LLMProvider.OPENAI_COMPATIBLE;
    baseUrl: string;
    apiKey: string;
  }> {
    const providerType = normalizeRequiredString(input.providerType, 'providerType').toUpperCase();
    if (providerType !== LLMProvider.OPENAI_COMPATIBLE) {
      throw new Error(`Unsupported providerType '${input.providerType}'.`);
    }

    return {
      name: normalizeRequiredString(input.name, 'name').replace(/\s+/g, ' '),
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: normalizeOpenAICompatibleEndpointBaseUrl(input.baseUrl),
      apiKey: normalizeRequiredString(input.apiKey, 'apiKey'),
    };
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

  private async getCredentialStatus(consumer: SecretConsumerIdentity): Promise<CredentialStatusProjection> {
    const health = await this.secretVaultRuntime.getHealth();
    if (health.state !== 'READY') {
      return {
        vaultHealth: health.state,
        storageState: null,
        instructionCode: health.instructionCode,
      };
    }
    try {
      return {
        vaultHealth: 'READY',
        storageState: await this.secretVaultRuntime.requireService().getStatusForConsumer(consumer),
        instructionCode: null,
      };
    } catch {
      return {
        vaultHealth: 'UNAVAILABLE',
        storageState: null,
        instructionCode: 'SECRET_CONSUMER_BINDING_INVALID',
      };
    }
  }

  private async withCredentialStatus(provider: LlmProviderRecord): Promise<LlmProviderRecord> {
    if (provider.id === LLMProvider.OLLAMA) return provider;
    if (provider.id === LLMProvider.GEMINI) {
      const setup = await this.geminiConfigurationService.getSetupStatus();
      if (setup.activeMode === 'VERTEX_PROJECT') {
        return { ...provider, credentialStatus: await this.workloadCredentialStatus(
          setup.vertexProjectStatus === 'CONFIGURED',
        ) };
      }
      if (setup.activeMode === 'VERTEX_EXPRESS') {
        return { ...provider, credentialStatus: await this.getCredentialStatus({
          kind: 'llm', providerId: LLMProvider.GEMINI,
          credentialSlot: 'geminiVertexExpressApiKey',
        }) };
      }
      if (setup.activeMode === 'AI_STUDIO') {
        return { ...provider, credentialStatus: await this.getCredentialStatus({
          kind: 'llm', providerId: LLMProvider.GEMINI,
          credentialSlot: 'geminiAiStudioApiKey',
        }) };
      }
      return { ...provider, credentialStatus: await this.workloadCredentialStatus(false) };
    }
    return { ...provider, credentialStatus: await this.getCredentialStatus(this.builtInConsumer(provider.id)) };
  }

  private async withCredentialStatusOrUnavailable(provider: LlmProviderRecord): Promise<LlmProviderRecord> {
    try {
      return await this.withCredentialStatus(provider);
    } catch {
      return {
        ...provider,
        credentialStatus: {
          vaultHealth: 'UNAVAILABLE',
          storageState: null,
          instructionCode: 'SECRET_VAULT_STATUS_UNAVAILABLE',
        },
      };
    }
  }

  private async workloadCredentialStatus(configured: boolean): Promise<CredentialStatusProjection> {
    const health = await this.secretVaultRuntime.getHealth();
    return {
      vaultHealth: health.state,
      storageState: configured ? 'CONFIGURED' : 'MISSING',
      instructionCode: 'instructionCode' in health ? health.instructionCode : null,
    };
  }

}

let cachedLlmProviderService: LlmProviderService | null = null;

export const getLlmProviderService = (): LlmProviderService => {
  if (!cachedLlmProviderService) {
    cachedLlmProviderService = new LlmProviderService();
  }
  return cachedLlmProviderService;
};
