import { BaseLLM } from './base.js';
import { LLMModel, ModelInfo } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig } from './utils/llm-config.js';
import {
  buildModelPricingInfo,
  type ModelPricingInfo,
  type ModelPricingLookupInput,
} from './llm-model-pricing.js';
export type {
  PricingStatus,
  ModelPricingTierInfo,
  ModelPricingInfo,
  ModelPricingLookupInput,
} from './llm-model-pricing.js';
import { applyRawLlmConfigOverrides, type RawLlmConfigOverrides } from './utils/llm-config-overrides.js';
import { ModelMetadataResolver } from './metadata/model-metadata-resolver.js';
import { supportedModelDefinitions, type SupportedModelDefinition } from './supported-model-definitions.js';
import type { ProviderApiKeyResolver } from '../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../utils/gemini-runtime.js';

export type LLMFactoryConfigInput = LLMConfig | RawLlmConfigOverrides;

const buildSupportedModels = async (): Promise<LLMModel[]> => {
  const metadataResolver = new ModelMetadataResolver();

  return Promise.all(
    supportedModelDefinitions.map(async (definition: SupportedModelDefinition) => {
      const { staticMetadata, ...runtimeDefinition } = definition;
      const resolved = await metadataResolver.resolve({
        provider: runtimeDefinition.provider,
        name: runtimeDefinition.name,
        value: runtimeDefinition.value,
        canonicalName: runtimeDefinition.canonicalName,
      }, staticMetadata);

      return new LLMModel({
        ...runtimeDefinition,
        maxContextTokens: resolved.maxContextTokens.value,
        maxInputTokens: resolved.maxInputTokens.value,
        maxOutputTokens: resolved.maxOutputTokens.value,
        multimodalCapabilities: staticMetadata.multimodalCapabilities,
        resolvedModelMetadata: resolved,
      });
    }),
  );
};

const isRawConfigRecord = (value: unknown): value is RawLlmConfigOverrides =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export class LLMFactory {
  private static modelsByProvider = new Map<LLMProvider, LLMModel[]>();
  private static modelsByIdentifier = new Map<string, LLMModel>();
  private static initialized = false;
  private static initializing: Promise<void> | null = null;
  private static modelIdsBySource = new Map<string, Set<string>>();
  private static sourceByModelId = new Map<string, string>();

  static async ensureInitialized(): Promise<void> {
    if (LLMFactory.initialized) return;
    LLMFactory.initializing ??= LLMFactory.initializeRegistry().then(() => {
      LLMFactory.initialized = true;
    }).finally(() => {
      LLMFactory.initializing = null;
    });
    await LLMFactory.initializing;
  }

  static async reinitialize(): Promise<void> {
    await LLMFactory.initializing;
    LLMFactory.modelsByProvider.clear();
    LLMFactory.modelsByIdentifier.clear();
    LLMFactory.modelIdsBySource.clear();
    LLMFactory.sourceByModelId.clear();
    await LLMFactory.initializeRegistry();
    LLMFactory.initialized = true;
  }

  static resetForTests(): void {
    LLMFactory.initialized = false;
    LLMFactory.initializing = null;
    LLMFactory.modelsByProvider.clear();
    LLMFactory.modelsByIdentifier.clear();
    LLMFactory.modelIdsBySource.clear();
    LLMFactory.sourceByModelId.clear();
  }

  private static async initializeRegistry(): Promise<void> {
    const supportedModels = await buildSupportedModels();

    for (const model of supportedModels) {
      LLMFactory.registerModel(model);
    }

  }

  private static removeModel(identifier: string): void {
    const current = LLMFactory.modelsByIdentifier.get(identifier);
    if (!current) return;
    LLMFactory.modelsByIdentifier.delete(identifier);
    const providerModels = LLMFactory.modelsByProvider.get(current.provider) ?? [];
    LLMFactory.modelsByProvider.set(
      current.provider,
      providerModels.filter((model) => model.modelIdentifier !== identifier),
    );
    const source = LLMFactory.sourceByModelId.get(identifier);
    if (source) LLMFactory.modelIdsBySource.get(source)?.delete(identifier);
    LLMFactory.sourceByModelId.delete(identifier);
  }

  static registerModel(model: LLMModel): void {
    const identifier = model.modelIdentifier;
    if (LLMFactory.modelsByIdentifier.has(identifier)) LLMFactory.removeModel(identifier);

    LLMFactory.modelsByIdentifier.set(identifier, model);
    const providerModels = LLMFactory.modelsByProvider.get(model.provider) ?? [];
    providerModels.push(model);
    LLMFactory.modelsByProvider.set(model.provider, providerModels);
  }

  static replaceSourceModels(sourceId: string, models: readonly LLMModel[]): number {
    if (!LLMFactory.initialized) throw new Error('LLM_FACTORY_NOT_INITIALIZED');
    const source = sourceId.trim();
    if (!source) throw new Error('LLM_MODEL_SOURCE_REQUIRED');
    const identifiers = new Set<string>();
    for (const model of models) {
      const identifier = model.modelIdentifier;
      if (identifiers.has(identifier)) throw new Error(`LLM_MODEL_SOURCE_DUPLICATE:${identifier}`);
      identifiers.add(identifier);
      const existingOwner = LLMFactory.sourceByModelId.get(identifier);
      const existing = LLMFactory.modelsByIdentifier.get(identifier);
      if (existing && existingOwner !== source) {
        throw new Error(`LLM_MODEL_SOURCE_COLLISION:${identifier}`);
      }
    }

    for (const identifier of LLMFactory.modelIdsBySource.get(source) ?? []) {
      LLMFactory.removeModel(identifier);
    }
    LLMFactory.modelIdsBySource.set(source, new Set());
    for (const model of models) {
      LLMFactory.registerModel(model);
      LLMFactory.sourceByModelId.set(model.modelIdentifier, source);
      LLMFactory.modelIdsBySource.get(source)!.add(model.modelIdentifier);
    }
    return models.length;
  }

  static removeSourceModels(sourceId: string): void {
    LLMFactory.replaceSourceModels(sourceId, []);
  }

  static retainSourceModels(
    sourceId: string,
    predicate: (model: LLMModel) => boolean,
  ): number {
    const source = sourceId.trim();
    const retained = Array.from(LLMFactory.modelIdsBySource.get(source) ?? [])
      .map((identifier) => LLMFactory.modelsByIdentifier.get(identifier))
      .filter((model): model is LLMModel => model !== undefined && predicate(model));
    return LLMFactory.replaceSourceModels(source, retained);
  }

  static sourceModelCount(sourceId: string): number {
    return LLMFactory.modelIdsBySource.get(sourceId.trim())?.size ?? 0;
  }

  static async listSourceModels(sourceId: string): Promise<ModelInfo[]> {
    await LLMFactory.ensureInitialized();
    return Array.from(LLMFactory.modelIdsBySource.get(sourceId.trim()) ?? [])
      .map((identifier) => LLMFactory.modelsByIdentifier.get(identifier))
      .filter((model): model is LLMModel => Boolean(model))
      .sort((left, right) => left.modelIdentifier.localeCompare(right.modelIdentifier))
      .map((model) => model.toModelInfo());
  }

  static async hasRegisteredModel(modelIdentifier: string): Promise<boolean> {
    await LLMFactory.ensureInitialized();
    return LLMFactory.modelsByIdentifier.has(modelIdentifier);
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

  static async requiresGeminiRuntimeResolver(modelIdentifier: string): Promise<boolean> {
    await LLMFactory.ensureInitialized();
    return LLMFactory.modelsByIdentifier.get(modelIdentifier)?.provider === LLMProvider.GEMINI;
  }

  static async createLLM(
    modelIdentifier: string,
    configInput: LLMFactoryConfigInput | undefined,
    apiKeyResolver: ProviderApiKeyResolver,
    geminiRuntimeResolver?: GeminiRuntimeResolver,
  ): Promise<BaseLLM> {
    await LLMFactory.ensureInitialized();

    const model = LLMFactory.modelsByIdentifier.get(modelIdentifier);
    if (model) {
      const LLMClass = model.llmClass;
      if (!LLMClass) {
        throw new Error(`Model '${model.modelIdentifier}' does not have an LLM class registered yet.`);
      }
      const config = LLMFactory.composeEffectiveConfig(model, configInput);
      if (model.provider === LLMProvider.GEMINI) {
        if (!geminiRuntimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_REQUIRED');
        return new LLMClass(model, config, apiKeyResolver, geminiRuntimeResolver);
      }
      if (geminiRuntimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_NOT_ALLOWED');
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


  static async getModelPricingInfo(input: ModelPricingLookupInput): Promise<ModelPricingInfo> {
    await LLMFactory.ensureInitialized();
    return buildModelPricingInfo(Array.from(LLMFactory.modelsByIdentifier.values()), input);
  }

  static async reloadModels(provider: LLMProvider): Promise<number> {
    await LLMFactory.ensureInitialized();

    const [{ LMStudioModelProvider }, { OllamaModelProvider }] = await Promise.all([
      import('./lmstudio-provider.js'),
      import('./ollama-provider.js'),
    ]);
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

    await LLMFactory.replaceSourceModels(String(provider), newModels);
    return newModels.length;
  }
}

export const defaultLlmFactory = LLMFactory;
