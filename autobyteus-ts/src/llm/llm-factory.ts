import { BaseLLM } from './base.js';
import { LLMModel, ModelInfo } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig } from './utils/llm-config.js';
import { OllamaModelProvider } from './ollama-provider.js';
import { LMStudioModelProvider } from './lmstudio-provider.js';
import { AutobyteusModelProvider } from './autobyteus-provider.js';
import { ModelMetadataResolver } from './metadata/model-metadata-resolver.js';
import { supportedModelDefinitions, type SupportedModelDefinition } from './supported-model-definitions.js';

const buildSupportedModels = async (): Promise<LLMModel[]> => {
  const metadataResolver = new ModelMetadataResolver();

  return Promise.all(
    supportedModelDefinitions.map(async (definition: SupportedModelDefinition) => {
      const metadata = await metadataResolver.resolve({
        provider: definition.provider,
        name: definition.name,
        value: definition.value,
        canonicalName: definition.canonicalName
      });

      return new LLMModel({
        ...definition,
        ...metadata
      });
    })
  );
};

export class LLMFactory {
  private static modelsByProvider = new Map<LLMProvider, LLMModel[]>();
  private static modelsByIdentifier = new Map<string, LLMModel>();
  private static initialized = false;

  static async ensureInitialized(): Promise<void> {
    if (!LLMFactory.initialized) {
      await LLMFactory.initializeRegistry();
      LLMFactory.initialized = true;
    }
  }

  static async reinitialize(): Promise<void> {
    LLMFactory.initialized = false;
    LLMFactory.modelsByProvider.clear();
    LLMFactory.modelsByIdentifier.clear();
    await LLMFactory.ensureInitialized();
  }

  private static async initializeRegistry(): Promise<void> {
    const supportedModels = await buildSupportedModels();

    for (const model of supportedModels) {
      LLMFactory.registerModel(model);
    }

    await OllamaModelProvider.discoverAndRegister();
    await LMStudioModelProvider.discoverAndRegister();
    await AutobyteusModelProvider.discoverAndRegister();
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

  static async createLLM(modelIdentifier: string, llmConfig?: LLMConfig): Promise<BaseLLM> {
    await LLMFactory.ensureInitialized();

    const model = LLMFactory.modelsByIdentifier.get(modelIdentifier);
    if (model) {
      const LLMClass = model.llmClass;
      if (!LLMClass) {
        throw new Error(`Model '${model.modelIdentifier}' does not have an LLM class registered yet.`);
      }
      const config = model.defaultConfig ? model.defaultConfig.clone() : new LLMConfig();
      if (llmConfig) {
        config.mergeWith(llmConfig);
      }
      return new LLMClass(model, config);
    }

    const foundByName = Array.from(LLMFactory.modelsByIdentifier.values()).filter(
      (entry) => entry.name === modelIdentifier
    );
    if (foundByName.length > 1) {
      const identifiers = foundByName.map((entry) => entry.modelIdentifier);
      throw new Error(
        `The model name '${modelIdentifier}' is ambiguous. Please use one of the unique model identifiers: ${identifiers}`
      );
    }

    throw new Error(`Model with identifier '${modelIdentifier}' not found.`);
  }

  static async listAvailableModels(): Promise<ModelInfo[]> {
    await LLMFactory.ensureInitialized();
    const models = Array.from(LLMFactory.modelsByIdentifier.values()).sort((a, b) =>
      a.modelIdentifier.localeCompare(b.modelIdentifier)
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
      (entry) => entry.name === modelIdentifier
    );
    if (foundByName.length === 1) {
      return foundByName[0]?.provider ?? null;
    }
    if (foundByName.length > 1) {
      const identifiers = foundByName.map((entry) => entry.modelIdentifier);
      throw new Error(
        `The model name '${modelIdentifier}' is ambiguous. Please use one of the unique model identifiers: ${identifiers}`
      );
    }

    console.warn(`Could not find model with identifier '${modelIdentifier}' to get its provider.`);
    return null;
  }

  static async reloadModels(provider: LLMProvider): Promise<number> {
    await LLMFactory.ensureInitialized();

    const providerHandlers: Partial<Record<LLMProvider, { getModels: () => Promise<LLMModel[]> }>> = {
      [LLMProvider.LMSTUDIO]: LMStudioModelProvider,
      [LLMProvider.AUTOBYTEUS]: AutobyteusModelProvider,
      [LLMProvider.OLLAMA]: OllamaModelProvider
    };

    const handler = providerHandlers[provider];
    if (!handler) {
      const currentCount = LLMFactory.modelsByProvider.get(provider)?.length ?? 0;
      console.warn(`Reloading is not supported for provider: ${provider}`);
      return currentCount;
    }

    const currentProviderModels = LLMFactory.modelsByProvider.get(provider) ?? [];
    const idsToRemove = currentProviderModels.map((model) => model.modelIdentifier);

    console.log(`Clearing ${idsToRemove.length} models for provider ${provider} before discovery.`);

    for (const id of idsToRemove) {
      LLMFactory.modelsByIdentifier.delete(id);
    }
    LLMFactory.modelsByProvider.delete(provider);

    let newModels: LLMModel[] = [];
    try {
      newModels = await handler.getModels();
    } catch (error: any) {
      console.error(`Failed to fetch models for ${provider}. Registry for this provider is now empty.`, error?.message ?? error);
      return 0;
    }

    console.log(`Registering ${newModels.length} new models for provider ${provider}.`);
    for (const model of newModels) {
      LLMFactory.registerModel(model);
    }

    return newModels.length;
  }
}

export const defaultLlmFactory = LLMFactory;
