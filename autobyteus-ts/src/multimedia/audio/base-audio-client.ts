import type { MultimediaConfig } from '../utils/multimedia-config.js';
import type { SpeechGenerationResponse } from '../utils/response-types.js';
import type { AudioModel } from './audio-model.js';

export abstract class BaseAudioClient {
  model: AudioModel;
  config: MultimediaConfig;

  constructor(model: AudioModel, config: MultimediaConfig) {
    this.model = model;
    this.config = config;
  }

  abstract generateSpeech(
    prompt: string,
    generationConfig?: Record<string, unknown>,
    ...args: unknown[]
  ): Promise<SpeechGenerationResponse>;

  async cleanup(): Promise<void> {
    // optional override
  }
}
