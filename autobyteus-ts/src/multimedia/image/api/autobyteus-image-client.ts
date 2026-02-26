import crypto from 'node:crypto';
import { AutobyteusClient } from '../../../clients/autobyteus-client.js';
import { BaseImageClient } from '../base-image-client.js';
import { ImageGenerationResponse } from '../../utils/response-types.js';
import type { ImageModel } from '../image-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';

export class AutobyteusImageClient extends BaseImageClient {
  private autobyteusClient: AutobyteusClient;
  sessionId: string;

  constructor(model: ImageModel, config: MultimediaConfig) {
    super(model, config);
    if (!model.hostUrl) {
      throw new Error('AutobyteusImageClient requires a hostUrl in its ImageModel.');
    }

    this.autobyteusClient = new AutobyteusClient(model.hostUrl);
    this.sessionId = crypto.randomUUID();
  }

  async generateImage(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>
  ): Promise<ImageGenerationResponse> {
    return this.callRemoteGenerate(prompt, inputImageUrls ?? null, null, generationConfig ?? null);
  }

  async editImage(
    prompt: string,
    inputImageUrls: string[],
    maskUrl?: string | null,
    generationConfig?: Record<string, unknown>
  ): Promise<ImageGenerationResponse> {
    return this.callRemoteGenerate(prompt, inputImageUrls, maskUrl ?? null, generationConfig ?? null);
  }

  private async callRemoteGenerate(
    prompt: string,
    inputImageUrls: string[] | null,
    maskUrl: string | null,
    generationConfig: Record<string, unknown> | null
  ): Promise<ImageGenerationResponse> {
    const responseData = await this.autobyteusClient.generateImage(
      this.model.name,
      prompt,
      inputImageUrls ?? [],
      maskUrl,
      generationConfig ?? null,
      this.sessionId
    );

    const imageUrls = Array.isArray(responseData?.image_urls)
      ? responseData.image_urls.filter((url): url is string => typeof url === 'string')
      : [];
    if (imageUrls.length === 0) {
      throw new Error('Remote Autobyteus server did not return any image URLs.');
    }

    return new ImageGenerationResponse(imageUrls);
  }

  async cleanup(): Promise<void> {
    if (!this.autobyteusClient) {
      return;
    }

    try {
      await this.autobyteusClient.cleanupImageSession(this.sessionId);
    } catch (error) {
      console.error(`Failed to cleanup remote image session '${this.sessionId}': ${String(error)}`);
    } finally {
      await this.autobyteusClient.close();
    }
  }
}
