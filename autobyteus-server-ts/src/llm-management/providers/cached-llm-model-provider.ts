import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LlmModelProvider } from "./llm-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class CachedLlmModelProvider {
  private modelProvider: LlmModelProvider;
  private cache: ModelInfo[] | null = null;
  private cachePromise: Promise<void> | null = null;

  constructor(modelProvider: LlmModelProvider) {
    this.modelProvider = modelProvider;
    logger.info("CachedLlmModelProvider initialized with an in-memory cache strategy.");
  }

  private async ensureCachePopulated(): Promise<void> {
    if (this.cache !== null) {
      return;
    }

    if (!this.cachePromise) {
      this.cachePromise = (async () => {
        logger.info("Populating LLM models cache for the first time...");
        this.cache = await this.modelProvider.listModels();
        logger.info(`LLM models cache populated with ${this.cache.length} items.`);
      })().finally(() => {
        this.cachePromise = null;
      });
    }

    await this.cachePromise;
  }

  async listModels(): Promise<ModelInfo[]> {
    await this.ensureCachePopulated();
    return this.cache ? [...this.cache] : [];
  }

  async refreshModels(): Promise<void> {
    logger.info("Refreshing LLM models cache...");
    await this.modelProvider.refreshModels();
    this.cache = await this.modelProvider.listModels();
    logger.info(`LLM models cache refreshed with ${this.cache.length} items.`);
  }

  async refreshModelsForProvider(provider: LLMProvider): Promise<number> {
    logger.info(`Refreshing LLM models cache for provider ${provider}...`);
    const count = await this.modelProvider.refreshModelsForProvider(provider);
    this.cache = await this.modelProvider.listModels();
    logger.info(`LLM models cache refreshed with ${this.cache.length} items after provider reload.`);
    return count;
  }
}
