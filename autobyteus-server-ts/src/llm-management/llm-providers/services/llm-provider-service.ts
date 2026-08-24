import {
  buildCustomProviderId,
  OpenAICompatibleEndpointDiscovery,
  QWEN_BASE_URL_ENV_VAR,
  SecretValue,
  normalizeOpenAICompatibleEndpointBaseUrl,
  resolveQwenBaseUrl,
} from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import type { SecretConsumerIdentity } from '../../../secret-management/domain/secret-id.js';
import { appConfigProvider } from '../../../config/app-config-provider.js';
import type { AppConfig } from '../../../config/app-config.js';
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
  type DeleteCustomProviderResult,
  type LlmProviderDescriptor,
  type ProviderCredentialSetting,
  type QwenConfigurationInput,
  type QwenConfigurationCommandResult,
  type QwenSetupStatus,
} from '../domain/models.js';
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from '../stores/custom-llm-provider-store.js';

const DEFAULT_RUNTIME_KIND = RuntimeKind.AUTOBYTEUS;

export const QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED =
  'QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED';
export const QWEN_CONFIGURATION_REPAIR_REQUIRED =
  'QWEN_CONFIGURATION_REPAIR_REQUIRED';

export class QwenConfigurationError extends Error {
  constructor(
    readonly code:
      | typeof QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED
      | typeof QWEN_CONFIGURATION_REPAIR_REQUIRED,
  ) {
    super(code);
    this.name = 'QwenConfigurationError';
  }
}

const resolveRuntimeKind = (runtimeKind?: string | null): RuntimeKind =>
  runtimeKindFromString(runtimeKind, DEFAULT_RUNTIME_KIND) ?? DEFAULT_RUNTIME_KIND;

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export type GeminiConfigurationCommandResult = {
  setup: GeminiSetupStatus;
  credentialSetting: ProviderCredentialSetting;
};

export class LlmProviderService {
  constructor(
    private readonly builtInCatalog: BuiltInLlmProviderCatalog = getBuiltInLlmProviderCatalog(),
    private readonly customProviderStore: CustomLlmProviderStore = getCustomLlmProviderStore(),
    private readonly modelCatalogService: ModelCatalogService = getModelCatalogService(),
    private readonly discovery: Pick<typeof OpenAICompatibleEndpointDiscovery, 'probeEndpoint'> =
      OpenAICompatibleEndpointDiscovery,
    private readonly secretVaultRuntime: SecretVaultRuntime = getSecretVaultRuntime(),
    private readonly geminiConfigurationService: GeminiConfigurationService =
      getGeminiConfigurationService(),
    private readonly appConfig: Pick<AppConfig, 'get' | 'setDurably'> =
      appConfigProvider.config,
  ) {}

  async listProviderCredentialSettings(
    runtimeKind?: string | null,
  ): Promise<ProviderCredentialSetting[]> {
    const customProviders = await this.listCustomProvidersForRead(runtimeKind);
    const providers = sortProvidersByName([
      ...this.builtInCatalog.listProviders(),
      ...customProviders,
    ]);
    return Promise.all(providers.map(async (provider) => ({
      provider,
      apiKeyConfigured: await this.isProviderApiKeyConfigured(provider.id),
    })));
  }

  async getProviderCredentialSetting(
    providerId: string,
    runtimeKind?: string | null,
  ): Promise<ProviderCredentialSetting> {
    const setting = (await this.listProviderCredentialSettings(runtimeKind))
      .find(({ provider }) => provider.id === providerId);
    if (!setting) throw new Error(`Unknown provider '${providerId}'.`);
    return setting;
  }

  async probeCustomProvider(
    input: CustomLlmProviderDraftInput,
  ): Promise<CustomLlmProviderProbeResult> {
    const draft = await this.normalizeDraftInput(input);
    buildCustomProviderId(draft.name);
    await this.assertProviderNameAvailable(draft.name);
    const discoveredModels = await this.discovery.probeEndpoint({
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
    });
    return {
      discoveredModels: discoveredModels.map(({ id, name }) => ({ id, name })),
    };
  }

  async createCustomProvider(
    input: CustomLlmProviderDraftInput,
  ): Promise<ProviderCredentialSetting> {
    const draft = await this.normalizeDraftInput(input);
    buildCustomProviderId(draft.name);
    await this.assertProviderNameAvailable(draft.name);
    const discoveredModels = await this.discovery.probeEndpoint({
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
    });

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
    try {
      await this.modelCatalogService.seedCustomProvider(createdProvider, discoveredModels);
    } catch (error) {
      await this.secretVaultRuntime.requireService().removeForConsumer(
        this.customConsumer(createdProvider.id),
      );
      await this.customProviderStore.deleteProvider(createdProvider.id);
      throw error;
    }
    return {
      provider: this.mapCustomProvider(
        createdProvider.id,
        createdProvider.name,
        createdProvider.providerType,
        createdProvider.baseUrl,
      ),
      apiKeyConfigured: true,
    };
  }

  async deleteCustomProvider(providerId: string): Promise<DeleteCustomProviderResult> {
    const normalizedProviderId = normalizeRequiredString(providerId, 'providerId');
    if (this.builtInCatalog.isBuiltInProviderId(normalizedProviderId.toUpperCase())) {
      throw new Error(`Deleting built-in providers is not supported. Received '${providerId}'.`);
    }
    const provider = await this.customProviderStore.getProviderById(normalizedProviderId);
    await this.secretVaultRuntime.requireService().removeForConsumer(
      this.customConsumer(provider?.id ?? normalizedProviderId),
    );
    if (provider) await this.customProviderStore.deleteProvider(provider.id);
    const removedProviderId = provider?.id ?? normalizedProviderId;
    this.modelCatalogService.removeCustomProvider(removedProviderId);
    return { providerId: removedProviderId, deleted: true };
  }

  async setProviderApiKey(
    providerId: string,
    apiKey: string,
  ): Promise<ProviderCredentialSetting> {
    const normalizedProviderId = this.requireBuiltInProviderId(providerId);
    if (normalizedProviderId === LLMProvider.QWEN) {
      throw new Error('Qwen credentials must be saved with saveQwenConfiguration.');
    }
    await this.secretVaultRuntime.requireService().saveForConsumer({
      consumer: this.builtInConsumer(normalizedProviderId),
      value: SecretValue.fromString(normalizeRequiredString(apiKey, 'apiKey')),
    });
    if (normalizedProviderId === LLMProvider.AUTOBYTEUS) {
      this.modelCatalogService.notifyCredentialRevision(normalizedProviderId);
    }
    return this.getProviderCredentialSetting(normalizedProviderId, RuntimeKind.AUTOBYTEUS);
  }

  async getQwenSetupStatus(): Promise<QwenSetupStatus> {
    const configuredBaseUrl = this.appConfig.get(QWEN_BASE_URL_ENV_VAR)?.trim() || undefined;
    return {
      effectiveBaseUrl: resolveQwenBaseUrl(configuredBaseUrl),
      endpointSource: configuredBaseUrl ? 'CONFIGURED' : 'DEFAULT',
    };
  }

  async saveQwenConfiguration(
    input: QwenConfigurationInput,
  ): Promise<QwenConfigurationCommandResult> {
    const baseUrl = normalizeOpenAICompatibleEndpointBaseUrl(
      normalizeRequiredString(input.baseUrl, 'baseUrl'),
    );
    const apiKey = normalizeRequiredString(input.apiKey, 'apiKey');
    await this.discovery.probeEndpoint({ baseUrl, apiKey });

    const consumer = this.builtInConsumer(LLMProvider.QWEN);
    const secretService = this.secretVaultRuntime.requireService();
    let previousSecret: SecretValue | null = null;
    try {
      if (await secretService.getStatusForConsumer(consumer) === 'CONFIGURED') {
        previousSecret = await secretService.resolveForUse(consumer);
      }
      await secretService.saveForConsumer({
        consumer,
        value: SecretValue.fromString(apiKey),
      });
    } catch {
      throw new Error('Could not save Qwen configuration. Your previous configuration is still active.');
    }

    try {
      this.appConfig.setDurably(QWEN_BASE_URL_ENV_VAR, baseUrl);
    } catch {
      try {
        if (previousSecret) {
          await secretService.saveForConsumer({ consumer, value: previousSecret });
        } else {
          await secretService.removeForConsumer(consumer);
        }
      } catch {
        throw new QwenConfigurationError(QWEN_CONFIGURATION_REPAIR_REQUIRED);
      }
      throw new QwenConfigurationError(
        QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
      );
    }

    return {
      setup: await this.getQwenSetupStatus(),
      credentialSetting: await this.getProviderCredentialSetting(
        LLMProvider.QWEN,
        RuntimeKind.AUTOBYTEUS,
      ),
    };
  }

  async getGeminiConfigurationStatus(): Promise<GeminiSetupStatus> {
    return this.geminiConfigurationService.getSetupStatus();
  }

  async saveGeminiOptionConfiguration(
    input: GeminiOptionSaveCommand,
    activateAfterSave: boolean,
  ): Promise<GeminiConfigurationCommandResult> {
    const result = await this.geminiConfigurationService.saveOptionConfiguration(
      input,
      activateAfterSave,
    );
    return this.geminiCommandResult(result);
  }

  async activateGeminiOption(
    option: GeminiConfigurationOption,
  ): Promise<GeminiConfigurationCommandResult> {
    const result = await this.geminiConfigurationService.activateOption(option);
    return this.geminiCommandResult(result);
  }

  private async listCustomProviders(
    runtimeKind?: string | null,
  ): Promise<LlmProviderDescriptor[]> {
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
  ): Promise<LlmProviderDescriptor[]> {
    try {
      return await this.listCustomProviders(runtimeKind);
    } catch {
      return [];
    }
  }

  private mapCustomProvider(
    providerId: string,
    providerName: string,
    providerType: LLMProvider.OPENAI_COMPATIBLE,
    baseUrl: string,
  ): LlmProviderDescriptor {
    return {
      id: providerId,
      name: providerName,
      providerType,
      isCustom: true,
      baseUrl,
      catalogMode: 'DISCOVERED',
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

  private geminiCommandResult(setup: GeminiSetupStatus): GeminiConfigurationCommandResult {
    return {
      setup,
      credentialSetting: {
        provider: this.builtInCatalog.getProvider(LLMProvider.GEMINI),
        apiKeyConfigured: setup.aiStudioStatus === 'CONFIGURED'
          || setup.vertexExpressStatus === 'CONFIGURED'
          || setup.vertexProjectStatus === 'CONFIGURED',
      },
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
