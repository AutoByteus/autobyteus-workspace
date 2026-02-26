import crypto from 'node:crypto';
import { AutobyteusClient } from '../../../clients/autobyteus-client.js';
import { BaseAudioClient } from '../base-audio-client.js';
import type { AudioModel } from '../audio-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';
import { SpeechGenerationResponse } from '../../utils/response-types.js';

export class AutobyteusAudioClient extends BaseAudioClient {
  private autobyteusClient: AutobyteusClient;
  sessionId: string;

  constructor(model: AudioModel, config: MultimediaConfig) {
    super(model, config);
    if (!model.hostUrl) {
      throw new Error('AutobyteusAudioClient requires a hostUrl in its AudioModel.');
    }

    this.autobyteusClient = new AutobyteusClient(model.hostUrl);
    this.sessionId = crypto.randomUUID();
  }

  async generateSpeech(
    prompt: string,
    generationConfig?: Record<string, unknown>
  ): Promise<SpeechGenerationResponse> {
    const responseData = await this.autobyteusClient.generateSpeech(
      this.model.name,
      prompt,
      generationConfig ?? null,
      this.sessionId
    );

    const audioUrls = Array.isArray(responseData?.audio_urls)
      ? responseData.audio_urls.filter((url): url is string => typeof url === 'string')
      : [];
    if (audioUrls.length === 0) {
      throw new Error('Remote Autobyteus server did not return any audio URLs.');
    }

    return new SpeechGenerationResponse(audioUrls);
  }

  async cleanup(): Promise<void> {
    if (!this.autobyteusClient) {
      return;
    }

    try {
      await this.autobyteusClient.cleanupAudioSession(this.sessionId);
    } catch (error) {
      console.error(`Failed to cleanup remote audio session '${this.sessionId}': ${String(error)}`);
    } finally {
      await this.autobyteusClient.close();
    }
  }
}
