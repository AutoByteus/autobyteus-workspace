import { VideoClientFactory } from "autobyteus-ts/multimedia/video/video-client-factory.js";
import type { VideoModel } from "autobyteus-ts/multimedia/video/video-model.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class VideoModelProvider {
  async listModels(): Promise<VideoModel[]> {
    logger.info("Fetching list of available Video models from VideoClientFactory...");
    try {
      const models = VideoClientFactory.listModels();
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
      logger.info(`Successfully fetched ${models.length} video models from VideoClientFactory.`);
      if (models.length > 0) {
        logger.info(`Video models by provider: ${providerSummary || "none"}`);
        logger.info(`Video models by runtime: ${runtimeSummary || "none"}`);
      }
      return models;
    } catch (error) {
      logger.error(`Failed to list Video models from VideoClientFactory: ${String(error)}`);
      return [];
    }
  }

  async refreshModels(): Promise<void> {
    logger.info("Triggering VideoClientFactory re-initialization to refresh models...");
    try {
      VideoClientFactory.reinitialize();
      logger.info("VideoClientFactory re-initialized successfully.");
    } catch (error) {
      logger.error(`Failed to re-initialize VideoClientFactory: ${String(error)}`);
      throw error;
    }
  }
}
