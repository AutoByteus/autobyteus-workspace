import type { VideoModel } from "autobyteus-ts/multimedia/video/video-model.js";
import { VideoModelProvider } from "../providers/video-model-provider.js";
import { CachedVideoModelProvider } from "../providers/cached-video-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class VideoModelService {
  private static instance: VideoModelService | null = null;

  static getInstance(): VideoModelService {
    if (!VideoModelService.instance) {
      VideoModelService.instance = new VideoModelService();
    }
    return VideoModelService.instance;
  }

  static resetInstance(): void {
    VideoModelService.instance = null;
  }

  private provider: CachedVideoModelProvider;

  constructor() {
    const modelProvider = new VideoModelProvider();
    this.provider = new CachedVideoModelProvider(modelProvider);
    logger.info("VideoModelService initialized.");
  }

  async getAvailableModels(): Promise<VideoModel[]> {
    logger.debug("VideoModelService: Requesting list of available models.");
    return this.provider.listModels();
  }

  async reloadModels(): Promise<void> {
    logger.info("VideoModelService: Received request to reload all video models.");
    await this.provider.refreshModels();
    logger.info("VideoModelService: Model reload process completed.");
  }
}

export const getVideoModelService = (): VideoModelService => VideoModelService.getInstance();
