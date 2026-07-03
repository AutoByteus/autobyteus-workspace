import type { VideoModel } from "autobyteus-ts/multimedia/video/video-model.js";
import { VideoModelProvider } from "./video-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class CachedVideoModelProvider {
  private modelProvider: VideoModelProvider;
  private cache: VideoModel[] | null = null;
  private cachePromise: Promise<void> | null = null;

  constructor(modelProvider: VideoModelProvider) {
    this.modelProvider = modelProvider;
    logger.info("CachedVideoModelProvider initialized.");
  }

  private async ensureCachePopulated(): Promise<void> {
    if (this.cache !== null) {
      return;
    }

    if (!this.cachePromise) {
      this.cachePromise = (async () => {
        logger.info("Populating Video models cache for the first time...");
        this.cache = await this.modelProvider.listModels();
        logger.info(`Video models cache populated with ${this.cache.length} items.`);
      })().finally(() => {
        this.cachePromise = null;
      });
    }

    await this.cachePromise;
  }

  async listModels(): Promise<VideoModel[]> {
    await this.ensureCachePopulated();
    return this.cache ? [...this.cache] : [];
  }

  async refreshModels(): Promise<void> {
    logger.info("Refreshing Video models cache...");
    await this.modelProvider.refreshModels();
    this.cache = await this.modelProvider.listModels();
    logger.info(`Video models cache refreshed with ${this.cache.length} items.`);
  }

  getCachedCount(): number {
    if (!this.cache) {
      return 0;
    }
    return this.cache.length;
  }
}
