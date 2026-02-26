import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { CachedLlmModelProvider } from "../providers/cached-llm-model-provider.js";
import { LlmModelProvider } from "../providers/llm-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class LlmModelService {
  private static instance: LlmModelService | null = null;

  static getInstance(): LlmModelService {
    if (!LlmModelService.instance) {
      LlmModelService.instance = new LlmModelService();
    }
    return LlmModelService.instance;
  }

  static resetInstance(): void {
    LlmModelService.instance = null;
  }

  private provider: CachedLlmModelProvider;

  constructor() {
    const modelProvider = new LlmModelProvider();
    this.provider = new CachedLlmModelProvider(modelProvider);
    logger.info("LlmModelService initialized.");
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    logger.debug("LlmModelService: Requesting list of available models.");
    return this.provider.listModels();
  }

  async reloadModels(): Promise<void> {
    logger.info("LlmModelService: Received request to reload all LLM models.");
    await this.provider.refreshModels();
    logger.info("LlmModelService: Model reload process completed.");
  }

  async reloadModelsForProvider(provider: LLMProvider): Promise<number> {
    logger.info(`LlmModelService: Received request to reload LLM models for provider ${provider}.`);
    const count = await this.provider.refreshModelsForProvider(provider);
    logger.info(`LlmModelService: Provider ${provider} reload completed with ${count} models.`);
    return count;
  }
}

export const getLlmModelService = (): LlmModelService => LlmModelService.getInstance();
