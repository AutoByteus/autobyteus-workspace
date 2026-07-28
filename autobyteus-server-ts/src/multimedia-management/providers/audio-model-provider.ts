import { AudioClientFactory } from "autobyteus-ts/multimedia/audio/audio-client-factory.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import {
  getAutobyteusRemoteModelDiscoveryService,
  type AutobyteusRemoteModelDiscoveryService,
} from "../../llm-management/services/autobyteus-remote-model-discovery-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class AudioModelProvider {
  constructor(
    private readonly remoteDiscoveryService: AutobyteusRemoteModelDiscoveryService =
      getAutobyteusRemoteModelDiscoveryService(),
  ) {}

  async listModels(): Promise<AudioModel[]> {
    logger.info("Fetching list of available Audio models from AudioClientFactory...");
    try {
      try {
        await this.remoteDiscoveryService.ensureDiscovered("audio");
      } catch {
        logger.error("AUTOBYTEUS_AUDIO_DISCOVERY_FAILED");
      }
      const models = AudioClientFactory.listModels();
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
      logger.info(`Successfully fetched ${models.length} audio models from AudioClientFactory.`);
      if (models.length > 0) {
        logger.info(`Audio models by provider: ${providerSummary || "none"}`);
        logger.info(`Audio models by runtime: ${runtimeSummary || "none"}`);
      }
      return models;
    } catch (error) {
      logger.error(`Failed to list Audio models from AudioClientFactory: ${String(error)}`);
      return [];
    }
  }

  async refreshModels(): Promise<void> {
    logger.info("Triggering AudioClientFactory re-initialization to refresh models...");
    try {
      AudioClientFactory.reinitialize();
      await this.remoteDiscoveryService.refresh("audio");
      logger.info("AudioClientFactory re-initialized successfully.");
    } catch (error) {
      logger.error(`Failed to re-initialize AudioClientFactory: ${String(error)}`);
      throw error;
    }
  }
}
