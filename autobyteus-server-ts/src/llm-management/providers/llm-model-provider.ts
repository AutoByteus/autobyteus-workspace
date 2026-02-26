import { LLMFactory } from "autobyteus-ts";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class LlmModelProvider {
  async listModels(): Promise<ModelInfo[]> {
    logger.info("Fetching list of available LLM models from LLMFactory...");
    try {
      const models = await LLMFactory.listAvailableModels();
      logger.info(`Successfully fetched ${models.length} models from LLMFactory.`);
      return models;
    } catch (error) {
      logger.error(`Failed to list LLM models from LLMFactory: ${String(error)}`);
      return [];
    }
  }

  async refreshModels(): Promise<void> {
    logger.info("Triggering LLMFactory re-initialization to refresh models...");
    try {
      await LLMFactory.reinitialize();
      logger.info("LLMFactory re-initialized successfully.");
    } catch (error) {
      logger.error(`Failed to re-initialize LLMFactory: ${String(error)}`);
      throw error;
    }
  }

  async refreshModelsForProvider(provider: LLMProvider): Promise<number> {
    const reloadableProviders = new Set<LLMProvider>([
      LLMProvider.LMSTUDIO,
      LLMProvider.AUTOBYTEUS,
      LLMProvider.OLLAMA,
    ]);

    if (!reloadableProviders.has(provider)) {
      logger.info(
        `Provider ${provider} does not support targeted reload. Returning current models without refresh.`,
      );
      const models = await LLMFactory.listModelsByProvider(provider);
      return models.length;
    }

    logger.info(`Reloading models for provider ${provider} via LLMFactory...`);
    try {
      const count = await LLMFactory.reloadModels(provider);
      logger.info(`Reloaded ${count} models for provider ${provider}.`);
      return count;
    } catch (error) {
      logger.error(`Failed to reload models for provider ${provider}: ${String(error)}`);
      throw error;
    }
  }
}
