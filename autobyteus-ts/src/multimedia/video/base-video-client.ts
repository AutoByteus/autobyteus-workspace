import type { MultimediaConfig } from '../utils/multimedia-config.js';
import type { VideoGenerationResponse } from '../utils/response-types.js';
import type { VideoModel } from './video-model.js';

export abstract class BaseVideoClient {
  model: VideoModel;
  config: MultimediaConfig;

  constructor(model: VideoModel, config: MultimediaConfig) {
    this.model = model;
    this.config = config;
  }

  abstract generateVideo(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>,
    ...args: unknown[]
  ): Promise<VideoGenerationResponse>;

  async cleanup(): Promise<void> {
    // optional override
  }
}
