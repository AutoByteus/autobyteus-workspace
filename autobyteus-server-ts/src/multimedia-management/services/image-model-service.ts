import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import { ImageModelProvider } from "../providers/image-model-provider.js";
import { CachedImageModelProvider } from "../providers/cached-image-model-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class ImageModelService {
  private static instance: ImageModelService | null = null;

  static getInstance(): ImageModelService {
    if (!ImageModelService.instance) {
      ImageModelService.instance = new ImageModelService();
    }
    return ImageModelService.instance;
  }

  static resetInstance(): void {
    ImageModelService.instance = null;
  }

  private provider: CachedImageModelProvider;

  constructor() {
    const modelProvider = new ImageModelProvider();
    this.provider = new CachedImageModelProvider(modelProvider);
    logger.info("ImageModelService initialized.");
  }

  async getAvailableModels(): Promise<ImageModel[]> {
    logger.debug("ImageModelService: Requesting list of available models.");
    return this.provider.listModels();
  }

  async reloadModels(): Promise<void> {
    logger.info("ImageModelService: Received request to reload all image models.");
    await this.provider.refreshModels();
    logger.info("ImageModelService: Model reload process completed.");
  }
}

export const getImageModelService = (): ImageModelService => ImageModelService.getInstance();
