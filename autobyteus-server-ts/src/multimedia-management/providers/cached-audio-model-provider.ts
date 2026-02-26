import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import { AudioModelProvider } from "./audio-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class CachedAudioModelProvider {
  private modelProvider: AudioModelProvider;
  private cache: AudioModel[] | null = null;
  private cachePromise: Promise<void> | null = null;

  constructor(modelProvider: AudioModelProvider) {
    this.modelProvider = modelProvider;
    logger.info("CachedAudioModelProvider initialized.");
  }

  private async ensureCachePopulated(): Promise<void> {
    if (this.cache !== null) {
      return;
    }

    if (!this.cachePromise) {
      this.cachePromise = (async () => {
        logger.info("Populating Audio models cache for the first time...");
        this.cache = await this.modelProvider.listModels();
        logger.info(`Audio models cache populated with ${this.cache.length} items.`);
      })().finally(() => {
        this.cachePromise = null;
      });
    }

    await this.cachePromise;
  }

  async listModels(): Promise<AudioModel[]> {
    await this.ensureCachePopulated();
    return this.cache ? [...this.cache] : [];
  }

  async refreshModels(): Promise<void> {
    logger.info("Refreshing Audio models cache...");
    await this.modelProvider.refreshModels();
    this.cache = await this.modelProvider.listModels();
    logger.info(`Audio models cache refreshed with ${this.cache.length} items.`);
  }

  getCachedCount(): number {
    if (!this.cache) {
      return 0;
    }
    return this.cache.length;
  }
}
