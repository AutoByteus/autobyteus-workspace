import { LLMFactory } from 'autobyteus-ts';
import { isBuiltInLlmProviderId } from 'autobyteus-ts/llm/provider-display-names.js';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import {
  getCustomLlmProviderRuntimeSyncService,
  type CustomLlmProviderRuntimeSyncService,
} from '../llm-providers/services/custom-llm-provider-runtime-sync-service.js';

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class AutobyteusLlmModelProvider {
  constructor(
    private readonly customLlmProviderRuntimeSyncService: CustomLlmProviderRuntimeSyncService =
      getCustomLlmProviderRuntimeSyncService(),
  ) {}

  async listModels(): Promise<ModelInfo[]> {
    logger.info('Fetching list of available LLM models from LLMFactory...');
    try {
      await this.customLlmProviderRuntimeSyncService.ensureSyncedForCatalogRead();
      const models = await LLMFactory.listAvailableModels();
      logger.info(`Successfully fetched ${models.length} models from LLMFactory.`);
      return models;
    } catch (error) {
      logger.error(`Failed to list LLM models from LLMFactory: ${String(error)}`);
      return [];
    }
  }

  async refreshModels(): Promise<void> {
    logger.info('Triggering LLMFactory re-initialization to refresh models...');
    try {
      await LLMFactory.reinitialize();
      await this.customLlmProviderRuntimeSyncService.syncSavedProviders();
      logger.info('LLMFactory re-initialized successfully.');
    } catch (error) {
      logger.error(`Failed to re-initialize LLMFactory: ${String(error)}`);
      throw error;
    }
  }

  async refreshModelsForProvider(providerId: string): Promise<number> {
    const normalizedProviderId = providerId.trim();
    if (!normalizedProviderId) {
      throw new Error('providerId must be specified.');
    }

    if (!isBuiltInLlmProviderId(normalizedProviderId)) {
      const report = await this.customLlmProviderRuntimeSyncService.syncSavedProviders();
      const count = report.models.filter((model) => model.providerId === normalizedProviderId).length;
      logger.info(`Reloaded ${count} models for custom provider ${normalizedProviderId}.`);
      return count;
    }

    const reloadableProviders = new Set([
      'LMSTUDIO',
      'AUTOBYTEUS',
      'OLLAMA',
    ]);

    if (!reloadableProviders.has(normalizedProviderId)) {
      logger.info(
        `Provider ${normalizedProviderId} does not support targeted reload. Returning current models without refresh.`,
      );
      const models = await LLMFactory.listModelsByProvider(normalizedProviderId);
      return models.length;
    }

    logger.info(`Reloading models for provider ${normalizedProviderId} via LLMFactory...`);
    try {
      const count = await LLMFactory.reloadModels(normalizedProviderId);
      logger.info(`Reloaded ${count} models for provider ${normalizedProviderId}.`);
      return count;
    } catch (error) {
      logger.error(`Failed to reload models for provider ${normalizedProviderId}: ${String(error)}`);
      throw error;
    }
  }
}
