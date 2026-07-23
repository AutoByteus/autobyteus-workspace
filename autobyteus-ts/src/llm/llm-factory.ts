import { BaseLLM } from './base.js';
import { LLMModel, ModelInfo } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig, TokenPricingConfig } from './utils/llm-config.js';
import { applyRawLlmConfigOverrides, type RawLlmConfigOverrides } from './utils/llm-config-overrides.js';
import { OllamaModelProvider } from './ollama-provider.js';
import { LMStudioModelProvider } from './lmstudio-provider.js';
import { ModelMetadataResolver } from './metadata/model-metadata-resolver.js';
import { supportedModelDefinitions, type SupportedModelDefinition } from './supported-model-definitions.js';
import type { CustomLlmProviderRecord } from './custom-llm-provider-config.js';
import {
  OpenAICompatibleEndpointModel,
} from './openai-compatible-endpoint-model.js';
import {
  OpenAICompatibleEndpointModelProvider,
  type OpenAICompatibleEndpointDiscoveryResult,
  type OpenAICompatibleEndpointReloadReport,
} from './openai-compatible-endpoint-provider.js';
import type { ProviderApiKeyResolver } from '../secrets/provider-api-key-resolver.js';

export type LLMFactoryConfigInput = LLMConfig | RawLlmConfigOverrides;

export type PricingStatus = 'trusted' | 'missing' | 'placeholder';

export type ModelPricingTierInfo = {
  tier_id: string | null;
  max_input_tokens: number | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  cached_input_write_5m_price_per_million: number | null;
  cached_input_write_1h_price_per_million: number | null;
  trusted_dimensions: {
    input: boolean;
    output: boolean;
    cached_input_read: boolean;
    cached_input_write: boolean;
    cached_input_write_5m: boolean;
    cached_input_write_1h: boolean;
  };
};

export type ModelPricingInfo = {
  model_identifier: string | null;
  model_value: string | null;
  canonical_name: string | null;
  model_provider: string | null;
  pricing_status: PricingStatus;
  pricing_source: 'autobyteus_model_catalog' | string | null;
  price_config_id: string | null;
  currency: string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  cached_input_write_5m_price_per_million: number | null;
  cached_input_write_1h_price_per_million: number | null;
  input_price_tiers: ModelPricingTierInfo[];
  trusted_dimensions: {
    input: boolean;
    output: boolean;
    cached_input_read: boolean;
    cached_input_write: boolean;
    cached_input_write_5m: boolean;
    cached_input_write_1h: boolean;
  };
  missing_reason?:
    | 'model_not_found'
    | 'pricing_config_absent'
    | 'constructor_default_zero'
    | 'placeholder_price'
    | 'dimension_missing';
};

export type ModelPricingLookupInput = {
  modelIdentifier?: string | null;
  modelValue?: string | null;
  canonicalName?: string | null;
  modelProvider?: LLMProvider | string | null;
};

const buildSupportedModels = async (): Promise<LLMModel[]> => {
  const metadataResolver = new ModelMetadataResolver();

  return Promise.all(
    supportedModelDefinitions.map(async (definition: SupportedModelDefinition) => {
      const metadata = await metadataResolver.resolve({
        provider: definition.provider,
        name: definition.name,
        value: definition.value,
        canonicalName: definition.canonicalName,
      });

      return new LLMModel({
        ...definition,
        ...metadata,
      });
    }),
  );
};

const groupEndpointModelsByEndpoint = (
  models: OpenAICompatibleEndpointModel[],
): Map<string, OpenAICompatibleEndpointModel[]> => {
  const grouped = new Map<string, OpenAICompatibleEndpointModel[]>();

  for (const model of models) {
    const endpointId = model.endpointId;
    const existing = grouped.get(endpointId) ?? [];
    existing.push(model);
    grouped.set(endpointId, existing);
  }

  return grouped;
};

const isRawConfigRecord = (value: unknown): value is RawLlmConfigOverrides =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export class LLMFactory {
  private static modelsByProvider = new Map<LLMProvider, LLMModel[]>();
  private static modelsByIdentifier = new Map<string, LLMModel>();
  private static initialized = false;
  private static openAICompatibleEndpointProvider = new OpenAICompatibleEndpointModelProvider();
  private static lastKnownGoodOpenAICompatibleEndpointModelsByEndpoint = new Map<
    string,
    OpenAICompatibleEndpointModel[]
  >();

  static async ensureInitialized(): Promise<void> {
    if (!LLMFactory.initialized) {
      await LLMFactory.initializeRegistry();
      LLMFactory.initialized = true;
    }
  }

  static async reinitialize(): Promise<void> {
    await LLMFactory.ensureInitialized();
    const retainedGatewayModels = Array.from(LLMFactory.modelsByIdentifier.values())
      .filter((model) => model.runtime === LLMRuntime.AUTOBYTEUS);
    LLMFactory.modelsByProvider.clear();
    LLMFactory.modelsByIdentifier.clear();
    await LLMFactory.initializeRegistry();
    for (const model of retainedGatewayModels) LLMFactory.registerModel(model);
    LLMFactory.initialized = true;
  }

  static resetForTests(): void {
    LLMFactory.initialized = false;
    LLMFactory.modelsByProvider.clear();
    LLMFactory.modelsByIdentifier.clear();
    LLMFactory.lastKnownGoodOpenAICompatibleEndpointModelsByEndpoint.clear();
  }

  private static async initializeRegistry(): Promise<void> {
    const supportedModels = await buildSupportedModels();

    for (const model of supportedModels) {
      LLMFactory.registerModel(model);
    }

    await OllamaModelProvider.discoverAndRegister();
    await LMStudioModelProvider.discoverAndRegister();
  }

  private static replaceProviderModels(provider: LLMProvider, models: LLMModel[]): void {
    const currentProviderModels = LLMFactory.modelsByProvider.get(provider) ?? [];
    for (const model of currentProviderModels) {
      LLMFactory.modelsByIdentifier.delete(model.modelIdentifier);
    }

    LLMFactory.modelsByProvider.set(provider, []);

    for (const model of models) {
      LLMFactory.registerModel(model);
    }
  }

  static registerModel(model: LLMModel): void {
    const identifier = model.modelIdentifier;
    const existing = LLMFactory.modelsByIdentifier.get(identifier);
    if (existing) {
      const providerModels = LLMFactory.modelsByProvider.get(existing.provider);
      if (providerModels) {
        const index = providerModels.indexOf(existing);
        if (index !== -1) {
          providerModels.splice(index, 1);
        }
      }
    }

    LLMFactory.modelsByIdentifier.set(identifier, model);
    const providerModels = LLMFactory.modelsByProvider.get(model.provider) ?? [];
    providerModels.push(model);
    LLMFactory.modelsByProvider.set(model.provider, providerModels);
  }

  static async syncOpenAICompatibleEndpointModels(
    discoveryResults: OpenAICompatibleEndpointDiscoveryResult[],
  ): Promise<OpenAICompatibleEndpointReloadReport> {
    await LLMFactory.ensureInitialized();

    const report = await LLMFactory.openAICompatibleEndpointProvider.reloadSavedEndpoints(
      discoveryResults,
      LLMFactory.lastKnownGoodOpenAICompatibleEndpointModelsByEndpoint,
    );

    LLMFactory.replaceProviderModels(LLMProvider.OPENAI_COMPATIBLE, report.models);
    LLMFactory.lastKnownGoodOpenAICompatibleEndpointModelsByEndpoint =
      groupEndpointModelsByEndpoint(report.models);

    return report;
  }

  private static composeEffectiveConfig(model: LLMModel, configInput?: LLMFactoryConfigInput): LLMConfig {
    const config = model.defaultConfig ? model.defaultConfig.clone() : new LLMConfig();

    if (configInput instanceof LLMConfig) {
      config.mergeWith(configInput);
      return config;
    }

    if (isRawConfigRecord(configInput)) {
      applyRawLlmConfigOverrides(config, configInput);
    }

    return config;
  }

  static async syncRuntimeModels(runtime: LLMRuntime, models: LLMModel[]): Promise<number> {
    await LLMFactory.ensureInitialized();
    if (models.some((model) => model.runtime !== runtime)) {
      throw new Error('LLM_RUNTIME_MODEL_SYNC_INVALID');
    }
    for (const current of Array.from(LLMFactory.modelsByIdentifier.values())) {
      if (current.runtime !== runtime) continue;
      LLMFactory.modelsByIdentifier.delete(current.modelIdentifier);
      const providerModels = LLMFactory.modelsByProvider.get(current.provider);
      if (!providerModels) continue;
      LLMFactory.modelsByProvider.set(
        current.provider,
        providerModels.filter((model) => model !== current),
      );
    }
    for (const model of models) LLMFactory.registerModel(model);
    return models.length;
  }

  static async createLLM(
    modelIdentifier: string,
    configInput: LLMFactoryConfigInput | undefined,
    apiKeyResolver: ProviderApiKeyResolver,
  ): Promise<BaseLLM> {
    await LLMFactory.ensureInitialized();

    const model = LLMFactory.modelsByIdentifier.get(modelIdentifier);
    if (model) {
      const LLMClass = model.llmClass;
      if (!LLMClass) {
        throw new Error(`Model '${model.modelIdentifier}' does not have an LLM class registered yet.`);
      }
      const config = LLMFactory.composeEffectiveConfig(model, configInput);
      return new LLMClass(model, config, apiKeyResolver);
    }

    const foundByName = Array.from(LLMFactory.modelsByIdentifier.values()).filter(
      (entry) => entry.name === modelIdentifier,
    );
    if (foundByName.length > 1) {
      const identifiers = foundByName.map((entry) => entry.modelIdentifier);
      throw new Error(
        `The model name '${modelIdentifier}' is ambiguous. Please use one of the unique model identifiers: ${identifiers}`,
      );
    }

    throw new Error(`Model with identifier '${modelIdentifier}' not found.`);
  }

  static async listAvailableModels(): Promise<ModelInfo[]> {
    await LLMFactory.ensureInitialized();
    const models = Array.from(LLMFactory.modelsByIdentifier.values()).sort((a, b) =>
      a.modelIdentifier.localeCompare(b.modelIdentifier),
    );
    return models.map((model) => model.toModelInfo());
  }

  static async listModelsByProvider(provider: LLMProvider): Promise<ModelInfo[]> {
    await LLMFactory.ensureInitialized();
    const models = Array.from(LLMFactory.modelsByIdentifier.values())
      .filter((model) => model.provider === provider)
      .sort((a, b) => a.modelIdentifier.localeCompare(b.modelIdentifier));
    return models.map((model) => model.toModelInfo());
  }

  static async listModelsByRuntime(runtime: LLMRuntime): Promise<ModelInfo[]> {
    await LLMFactory.ensureInitialized();
    const models = Array.from(LLMFactory.modelsByIdentifier.values())
      .filter((model) => model.runtime === runtime)
      .sort((a, b) => a.modelIdentifier.localeCompare(b.modelIdentifier));
    return models.map((model) => model.toModelInfo());
  }

  static async getCanonicalName(modelIdentifier: string): Promise<string | null> {
    await LLMFactory.ensureInitialized();
    const model = LLMFactory.modelsByIdentifier.get(modelIdentifier);
    if (model) {
      return model.canonicalName;
    }

    console.warn(`Could not find model with identifier '${modelIdentifier}' to get its canonical name.`);
    return null;
  }

  static async getProvider(modelIdentifier: string): Promise<LLMProvider | null> {
    await LLMFactory.ensureInitialized();

    const model = LLMFactory.modelsByIdentifier.get(modelIdentifier);
    if (model) {
      return model.provider;
    }

    const foundByName = Array.from(LLMFactory.modelsByIdentifier.values()).filter(
      (entry) => entry.name === modelIdentifier,
    );
    if (foundByName.length === 1) {
      return foundByName[0]?.provider ?? null;
    }
    if (foundByName.length > 1) {
      const identifiers = foundByName.map((entry) => entry.modelIdentifier);
      throw new Error(
        `The model name '${modelIdentifier}' is ambiguous. Please use one of the unique model identifiers: ${identifiers}`,
      );
    }

    console.warn(`Could not find model with identifier '${modelIdentifier}' to get its provider.`);
    return null;
  }


  static async getModelPricingInfo(input: ModelPricingLookupInput): Promise<ModelPricingInfo | null> {
    await LLMFactory.ensureInitialized();
    const model = LLMFactory.findModelForPricingLookup(input);
    if (!model) {
      return {
        model_identifier: input.modelIdentifier ?? null,
        model_value: input.modelValue ?? null,
        canonical_name: input.canonicalName ?? null,
        model_provider: input.modelProvider ? String(input.modelProvider) : null,
        pricing_status: 'missing',
        pricing_source: null,
        price_config_id: null,
        currency: null,
        input_price_per_million: null,
        output_price_per_million: null,
        cached_input_read_price_per_million: null,
        cached_input_write_price_per_million: null,
        cached_input_write_5m_price_per_million: null,
        cached_input_write_1h_price_per_million: null,
        input_price_tiers: [],
        trusted_dimensions: {
          input: false,
          output: false,
          cached_input_read: false,
          cached_input_write: false,
          cached_input_write_5m: false,
          cached_input_write_1h: false,
        },
        missing_reason: 'model_not_found',
      };
    }

    const pricingConfig = model.defaultConfig?.pricingConfig;
    if (!(pricingConfig instanceof TokenPricingConfig)) {
      return LLMFactory.buildMissingPricingInfo(model, 'pricing_config_absent');
    }

    const tierInfos = pricingConfig.inputTokenPricingTiers.map((tier): ModelPricingTierInfo => ({
      tier_id: tier.tierId ?? null,
      max_input_tokens: tier.maxInputTokens ?? null,
      input_price_per_million: tier.inputTokenPricing ?? null,
      output_price_per_million: tier.outputTokenPricing ?? null,
      cached_input_read_price_per_million: tier.cachedInputReadTokenPricing ?? null,
      cached_input_write_price_per_million: tier.cachedInputWriteTokenPricing ?? null,
      cached_input_write_5m_price_per_million: tier.cachedInputWrite5mTokenPricing ?? null,
      cached_input_write_1h_price_per_million: tier.cachedInputWrite1hTokenPricing ?? null,
      trusted_dimensions: {
        input: tier.inputTokenPricing !== undefined,
        output: tier.outputTokenPricing !== undefined,
        cached_input_read: tier.cachedInputReadTokenPricing !== undefined,
        cached_input_write: tier.cachedInputWriteTokenPricing !== undefined,
        cached_input_write_5m: tier.cachedInputWrite5mTokenPricing !== undefined,
        cached_input_write_1h: tier.cachedInputWrite1hTokenPricing !== undefined,
      },
    }));
    const inputTrusted = pricingConfig.inputTokenPricingTrusted;
    const outputTrusted = pricingConfig.outputTokenPricingTrusted;
    const status: PricingStatus = inputTrusted && outputTrusted ? 'trusted' : 'missing';
    const missingReason = status === 'trusted'
      ? undefined
      : (!inputTrusted && !outputTrusted ? 'pricing_config_absent' : 'dimension_missing');

    return {
      model_identifier: model.modelIdentifier,
      model_value: model.value,
      canonical_name: model.canonicalName,
      model_provider: model.provider,
      pricing_status: status,
      pricing_source: status === 'trusted'
        ? pricingConfig.pricingSource ?? 'autobyteus_model_catalog'
        : null,
      price_config_id: status === 'trusted'
        ? `autobyteus_model_catalog:${model.provider}:${model.canonicalName}`
        : null,
      currency: status === 'trusted' ? pricingConfig.currency : null,
      input_price_per_million: inputTrusted ? pricingConfig.inputTokenPricing : null,
      output_price_per_million: outputTrusted ? pricingConfig.outputTokenPricing : null,
      cached_input_read_price_per_million: pricingConfig.cachedInputReadTokenPricingTrusted
        ? pricingConfig.cachedInputReadTokenPricing
        : null,
      cached_input_write_price_per_million: pricingConfig.cachedInputWriteTokenPricingTrusted
        ? pricingConfig.cachedInputWriteTokenPricing
        : null,
      cached_input_write_5m_price_per_million: pricingConfig.cachedInputWrite5mTokenPricingTrusted
        ? pricingConfig.cachedInputWrite5mTokenPricing
        : null,
      cached_input_write_1h_price_per_million: pricingConfig.cachedInputWrite1hTokenPricingTrusted
        ? pricingConfig.cachedInputWrite1hTokenPricing
        : null,
      input_price_tiers: status === 'trusted' ? tierInfos : [],
      trusted_dimensions: {
        input: inputTrusted,
        output: outputTrusted,
        cached_input_read: pricingConfig.cachedInputReadTokenPricingTrusted,
        cached_input_write: pricingConfig.cachedInputWriteTokenPricingTrusted,
        cached_input_write_5m: pricingConfig.cachedInputWrite5mTokenPricingTrusted,
        cached_input_write_1h: pricingConfig.cachedInputWrite1hTokenPricingTrusted,
      },
      ...(missingReason ? { missing_reason: missingReason } : {}),
    };
  }

  private static buildMissingPricingInfo(
    model: LLMModel,
    missingReason: NonNullable<ModelPricingInfo['missing_reason']>,
  ): ModelPricingInfo {
    return {
      model_identifier: model.modelIdentifier,
      model_value: model.value,
      canonical_name: model.canonicalName,
      model_provider: model.provider,
      pricing_status: 'missing',
      pricing_source: null,
      price_config_id: null,
      currency: null,
      input_price_per_million: null,
      output_price_per_million: null,
      cached_input_read_price_per_million: null,
      cached_input_write_price_per_million: null,
      cached_input_write_5m_price_per_million: null,
      cached_input_write_1h_price_per_million: null,
      input_price_tiers: [],
      trusted_dimensions: {
        input: false,
        output: false,
        cached_input_read: false,
        cached_input_write: false,
        cached_input_write_5m: false,
        cached_input_write_1h: false,
      },
      missing_reason: missingReason,
    };
  }

  private static findModelForPricingLookup(input: ModelPricingLookupInput): LLMModel | null {
    const candidates = Array.from(LLMFactory.modelsByIdentifier.values());
    const provider = input.modelProvider ? String(input.modelProvider) : null;
    const exactKeys = [input.modelIdentifier, input.modelValue, input.canonicalName]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    const direct = exactKeys
      .map((key) => LLMFactory.modelsByIdentifier.get(key) ?? null)
      .find((candidate): candidate is LLMModel => {
        if (!candidate) return false;
        return !provider || candidate.provider === provider;
      });
    if (direct) return direct;

    return candidates.find((model) => {
      if (provider && model.provider !== provider) return false;
      return exactKeys.some((key) =>
        model.modelIdentifier === key ||
        model.value === key ||
        model.name === key ||
        model.canonicalName === key
      );
    }) ?? null;
  }

  static async reloadModels(provider: LLMProvider): Promise<number> {
    await LLMFactory.ensureInitialized();

    const providerHandlers: Partial<Record<LLMProvider, { getModels: () => Promise<LLMModel[]> }>> = {
      [LLMProvider.LMSTUDIO]: LMStudioModelProvider,
      [LLMProvider.OLLAMA]: OllamaModelProvider,
    };

    const handler = providerHandlers[provider];
    if (!handler) {
      const currentCount = LLMFactory.modelsByProvider.get(provider)?.length ?? 0;
      console.warn(`Reloading is not supported for provider: ${provider}`);
      return currentCount;
    }

    let newModels: LLMModel[] = [];
    try {
      newModels = await handler.getModels();
    } catch (error) {
      console.error(
        `Failed to fetch models for ${provider}. Registry for this provider is unchanged.`,
        error instanceof Error ? error.message : error,
      );
      return LLMFactory.modelsByProvider.get(provider)?.length ?? 0;
    }

    LLMFactory.replaceProviderModels(provider, newModels);
    return newModels.length;
  }
}

export const defaultLlmFactory = LLMFactory;
