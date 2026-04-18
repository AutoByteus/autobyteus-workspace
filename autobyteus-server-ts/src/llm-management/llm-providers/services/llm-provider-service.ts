import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import {
  OpenAICompatibleEndpointDiscovery,
  normalizeOpenAICompatibleEndpointBaseUrl,
} from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { appConfigProvider } from '../../../config/app-config-provider.js';
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
  ) {}

  async listProvidersWithModels<TModel extends { providerId: string; name: string; modelIdentifier: string }>(
    runtimeKind?: string | null,
    mapModel?: (model: ModelInfo) => TModel,
  ): Promise<LlmProviderWithModels<TModel>[]> {
    const modelsInfo = await this.modelCatalogService.listLlmModels(runtimeKind);
    const builtInProviders = this.builtInCatalog.listProviders();
    const customProviders = await this.listCustomProviders(runtimeKind);
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
          apiKeyConfigured: model.provider_type !== LLMProvider.OPENAI_COMPATIBLE,
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

    const createdProvider = await this.customProviderStore.createProvider(draft);
    await this.modelCatalogService.reloadLlmModelsForProvider(createdProvider.id, runtimeKind);
    return this.mapCustomProvider(
      createdProvider.id,
      createdProvider.name,
      createdProvider.providerType,
      createdProvider.baseUrl,
      true,
    );
  }

  async deleteCustomProvider(providerId: string, runtimeKind?: string | null): Promise<string> {
    const provider = await this.getCustomProviderOrThrow(providerId, runtimeKind);
    await this.customProviderStore.deleteProvider(provider.id);
    await this.modelCatalogService.reloadLlmModels(runtimeKind);
    return provider.name;
  }

  async setProviderApiKey(providerId: string, apiKey: string): Promise<LlmProviderRecord> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId').toUpperCase();
    const normalizedApiKey = normalizeRequiredString(apiKey, 'apiKey');

    if (!this.builtInCatalog.isBuiltInProviderId(normalizedProviderId)) {
      throw new Error(`Setting API keys is only supported for built-in providers in this ticket. Received '${providerId}'.`);
    }

    appConfigProvider.config.setLlmApiKey(normalizedProviderId, normalizedApiKey);
    return this.builtInCatalog.getProvider(normalizedProviderId);
  }

  async getProviderApiKeyConfigured(providerId: string): Promise<boolean> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    const uppercasedProviderId = normalizedProviderId.toUpperCase();
    if (this.builtInCatalog.isBuiltInProviderId(uppercasedProviderId)) {
      return this.builtInCatalog.getProvider(uppercasedProviderId).apiKeyConfigured;
    }

    const customProvider = await this.customProviderStore.getProviderById(normalizedProviderId);
    return Boolean(customProvider?.apiKey);
  }

  async reloadProviderModels(providerId: string, runtimeKind?: string | null): Promise<number> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    await this.assertProviderExists(normalizedProviderId, runtimeKind);
    return this.modelCatalogService.reloadLlmModelsForProvider(normalizedProviderId, runtimeKind);
  }

  private async listCustomProviders(runtimeKind?: string | null): Promise<LlmProviderRecord[]> {
    if (resolveRuntimeKind(runtimeKind) !== RuntimeKind.AUTOBYTEUS) {
      return [];
    }

    const customProviders = await this.customProviderStore.listProviders();
    return customProviders.map((provider) =>
      this.mapCustomProvider(provider.id, provider.name, provider.providerType, provider.baseUrl, Boolean(provider.apiKey)),
    );
  }

  private mapCustomProvider(
    providerId: string,
    providerName: string,
    providerType: LLMProvider.OPENAI_COMPATIBLE,
    baseUrl: string,
    apiKeyConfigured: boolean,
  ): LlmProviderRecord {
    const status = this.customProviderRuntimeSyncService.getStatus(providerId);
    return {
      id: providerId,
      name: providerName,
      providerType,
      isCustom: true,
      baseUrl,
      apiKeyConfigured,
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
}

let cachedLlmProviderService: LlmProviderService | null = null;

export const getLlmProviderService = (): LlmProviderService => {
  if (!cachedLlmProviderService) {
    cachedLlmProviderService = new LlmProviderService();
  }
  return cachedLlmProviderService;
};
