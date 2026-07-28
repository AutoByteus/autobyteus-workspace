import crypto from 'node:crypto';
import { AutobyteusClient } from '../../../clients/autobyteus-client.js';
import { BaseAudioClient } from '../base-audio-client.js';
import type { AudioModel } from '../audio-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';
import { SpeechGenerationResponse } from '../../utils/response-types.js';
import type { ProviderApiKeyResolver } from '../../../secrets/provider-api-key-resolver.js';
import { MultimediaProvider } from '../../providers.js';

export class AutobyteusAudioClient extends BaseAudioClient {
  private clientPromise: Promise<AutobyteusClient> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  sessionId: string;

  constructor(model: AudioModel, config: MultimediaConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, config);
    if (!model.hostUrl) {
      throw new Error('AutobyteusAudioClient requires a hostUrl in its AudioModel.');
    }

    this.apiKeyResolver = apiKeyResolver;
    this.sessionId = crypto.randomUUID();
  }

  private getClient(): Promise<AutobyteusClient> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private async initializeClient(): Promise<AutobyteusClient> {
    const secret = await this.apiKeyResolver.resolve(MultimediaProvider.AUTOBYTEUS);
    return new AutobyteusClient(this.model.hostUrl!, secret.revealToTrustedConsumer());
  }

  async generateSpeech(
    prompt: string,
    generationConfig?: Record<string, unknown>
  ): Promise<SpeechGenerationResponse> {
    const client = await this.getClient();
    const responseData = await client.generateSpeech(
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
    if (!this.clientPromise) {
      return;
    }

    try {
      const client = await this.clientPromise;
      await client.cleanupAudioSession(this.sessionId);
    } catch (error) {
      console.error(`Failed to cleanup remote audio session '${this.sessionId}': ${String(error)}`);
    } finally {
      const client = await this.clientPromise;
      await client.close();
    }
  }
}
