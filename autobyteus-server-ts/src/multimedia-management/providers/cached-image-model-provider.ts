import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import { ImageModelProvider } from "./image-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class CachedImageModelProvider {
  private modelProvider: ImageModelProvider;
  private cache: ImageModel[] | null = null;
  private cachePromise: Promise<void> | null = null;

  constructor(modelProvider: ImageModelProvider) {
    this.modelProvider = modelProvider;
    logger.info("CachedImageModelProvider initialized.");
  }

  private async ensureCachePopulated(): Promise<void> {
    if (this.cache !== null) {
      return;
    }

    if (!this.cachePromise) {
      this.cachePromise = (async () => {
        logger.info("Populating Image models cache for the first time...");
        this.cache = await this.modelProvider.listModels();
        logger.info(`Image models cache populated with ${this.cache.length} items.`);
      })().finally(() => {
        this.cachePromise = null;
      });
    }

    await this.cachePromise;
  }

  async listModels(): Promise<ImageModel[]> {
    await this.ensureCachePopulated();
    return this.cache ? [...this.cache] : [];
  }

  async refreshModels(): Promise<void> {
    logger.info("Refreshing Image models cache...");
    await this.modelProvider.refreshModels();
    this.cache = await this.modelProvider.listModels();
    logger.info(`Image models cache refreshed with ${this.cache.length} items.`);
  }

  getCachedCount(): number {
    if (!this.cache) {
      return 0;
    }
    return this.cache.length;
  }
}
