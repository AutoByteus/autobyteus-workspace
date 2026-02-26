import { ImageClientFactory } from "autobyteus-ts/multimedia/image/image-client-factory.js";
import { AutobyteusImageModelProvider } from "autobyteus-ts/multimedia/image/autobyteus-image-provider.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class ImageModelProvider {
  async listModels(): Promise<ImageModel[]> {
    logger.info("Fetching list of available Image models from ImageClientFactory...");
    try {
      logger.info("Awaiting Autobyteus image model discovery before listing models...");
      await AutobyteusImageModelProvider.ensureDiscovered();
      const models = ImageClientFactory.listModels();
      const byProvider = new Map<string, number>();
      const byRuntime = new Map<string, number>();
      for (const model of models) {
        const providerKey = String(model.provider);
        const runtimeKey = String(model.runtime);
        byProvider.set(providerKey, (byProvider.get(providerKey) ?? 0) + 1);
        byRuntime.set(runtimeKey, (byRuntime.get(runtimeKey) ?? 0) + 1);
      }
      const providerSummary = Array.from(byProvider.entries())
        .map(([provider, count]) => `${provider}=${count}`)
        .join(", ");
      const runtimeSummary = Array.from(byRuntime.entries())
        .map(([runtime, count]) => `${runtime}=${count}`)
        .join(", ");
      logger.info(`Successfully fetched ${models.length} image models from ImageClientFactory.`);
      if (models.length > 0) {
        logger.info(`Image models by provider: ${providerSummary || "none"}`);
        logger.info(`Image models by runtime: ${runtimeSummary || "none"}`);
      }
      return models;
    } catch (error) {
      logger.error(`Failed to list Image models from ImageClientFactory: ${String(error)}`);
      return [];
    }
  }

  async refreshModels(): Promise<void> {
    logger.info("Triggering ImageClientFactory re-initialization to refresh models...");
    try {
      ImageClientFactory.reinitialize();
      logger.info("ImageClientFactory re-initialized successfully.");
    } catch (error) {
      logger.error(`Failed to re-initialize ImageClientFactory: ${String(error)}`);
      throw error;
    }
  }
}
