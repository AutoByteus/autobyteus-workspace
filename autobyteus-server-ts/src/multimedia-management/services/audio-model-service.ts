import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import { AudioModelProvider } from "../providers/audio-model-provider.js";
import { CachedAudioModelProvider } from "../providers/cached-audio-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class AudioModelService {
  private static instance: AudioModelService | null = null;

  static getInstance(): AudioModelService {
    if (!AudioModelService.instance) {
      AudioModelService.instance = new AudioModelService();
    }
    return AudioModelService.instance;
  }

  static resetInstance(): void {
    AudioModelService.instance = null;
  }

  private provider: CachedAudioModelProvider;

  constructor() {
    const modelProvider = new AudioModelProvider();
    this.provider = new CachedAudioModelProvider(modelProvider);
    logger.info("AudioModelService initialized.");
  }

  async getAvailableModels(): Promise<AudioModel[]> {
    logger.debug("AudioModelService: Requesting list of available models.");
    return this.provider.listModels();
  }

  async reloadModels(): Promise<void> {
    logger.info("AudioModelService: Received request to reload all audio models.");
    await this.provider.refreshModels();
    logger.info("AudioModelService: Model reload process completed.");
  }
}

export const getAudioModelService = (): AudioModelService => AudioModelService.getInstance();
