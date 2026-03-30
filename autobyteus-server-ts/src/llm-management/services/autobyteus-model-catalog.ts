import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { CachedAutobyteusLlmModelProvider } from "../providers/cached-autobyteus-llm-model-provider.js";
import { AutobyteusLlmModelProvider } from "../providers/autobyteus-llm-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class AutobyteusModelCatalog {
  private static instance: AutobyteusModelCatalog | null = null;

  static getInstance(): AutobyteusModelCatalog {
    if (!AutobyteusModelCatalog.instance) {
      AutobyteusModelCatalog.instance = new AutobyteusModelCatalog();
    }
    return AutobyteusModelCatalog.instance;
  }

  static resetInstance(): void {
    AutobyteusModelCatalog.instance = null;
  }

  private provider: CachedAutobyteusLlmModelProvider;

  constructor() {
    const modelProvider = new AutobyteusLlmModelProvider();
    this.provider = new CachedAutobyteusLlmModelProvider(modelProvider);
    logger.info("AutobyteusModelCatalog initialized.");
  }

  async listModels(): Promise<ModelInfo[]> {
    logger.debug("AutobyteusModelCatalog: Requesting list of available models.");
    return this.provider.listModels();
  }

  async reloadModels(): Promise<void> {
    logger.info("AutobyteusModelCatalog: Received request to reload all LLM models.");
    await this.provider.refreshModels();
    logger.info("AutobyteusModelCatalog: Model reload process completed.");
  }

  async reloadModelsForProvider(provider: LLMProvider): Promise<number> {
    logger.info(`AutobyteusModelCatalog: Received request to reload LLM models for provider ${provider}.`);
    const count = await this.provider.refreshModelsForProvider(provider);
    logger.info(`AutobyteusModelCatalog: Provider ${provider} reload completed with ${count} models.`);
    return count;
  }
}

export const getAutobyteusModelCatalog = (): AutobyteusModelCatalog =>
  AutobyteusModelCatalog.getInstance();
