import type { MultimediaConfig } from '../utils/multimedia-config.js';
import type { ImageGenerationResponse } from '../utils/response-types.js';
import type { ImageModel } from './image-model.js';

export abstract class BaseImageClient {
  model: ImageModel;
  config: MultimediaConfig;

  constructor(model: ImageModel, config: MultimediaConfig) {
    this.model = model;
    this.config = config;
  }

  abstract generateImage(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>,
    ...args: unknown[]
  ): Promise<ImageGenerationResponse>;

  abstract editImage(
    prompt: string,
    inputImageUrls: string[],
    maskUrl?: string | null,
    generationConfig?: Record<string, unknown>,
    ...args: unknown[]
  ): Promise<ImageGenerationResponse>;

  async cleanup(): Promise<void> {
    // optional override
  }
}
