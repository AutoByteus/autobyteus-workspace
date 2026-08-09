import crypto from 'node:crypto';
import { AutobyteusClient } from '../../../clients/autobyteus-client.js';
import { BaseImageClient } from '../base-image-client.js';
import { ImageGenerationResponse } from '../../utils/response-types.js';
import type { MediaOperationOptions } from '../../utils/operation-options.js';
import type { ImageModel } from '../image-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';
import type { ProviderApiKeyResolver } from '../../../secrets/provider-api-key-resolver.js';
import { MultimediaProvider } from '../../providers.js';

export class AutobyteusImageClient extends BaseImageClient {
  private clientPromise: Promise<AutobyteusClient> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  sessionId: string;

  constructor(model: ImageModel, config: MultimediaConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, config);
    if (!model.hostUrl) {
      throw new Error('AutobyteusImageClient requires a hostUrl in its ImageModel.');
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

  async generateImage(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>,
    operationOptions?: MediaOperationOptions
  ): Promise<ImageGenerationResponse> {
    return this.callRemoteGenerate(prompt, inputImageUrls ?? null, null, generationConfig ?? null, operationOptions);
  }

  async editImage(
    prompt: string,
    inputImageUrls: string[],
    maskUrl?: string | null,
    generationConfig?: Record<string, unknown>,
    operationOptions?: MediaOperationOptions
  ): Promise<ImageGenerationResponse> {
    return this.callRemoteGenerate(prompt, inputImageUrls, maskUrl ?? null, generationConfig ?? null, operationOptions);
  }

  private async callRemoteGenerate(
    prompt: string,
    inputImageUrls: string[] | null,
    maskUrl: string | null,
    generationConfig: Record<string, unknown> | null,
    operationOptions?: MediaOperationOptions
  ): Promise<ImageGenerationResponse> {
    const client = await this.getClient();
    const responseData = await client.generateImage(
      this.model.name,
      prompt,
      inputImageUrls ?? [],
      maskUrl,
      generationConfig ?? null,
      this.sessionId,
      { signal: operationOptions?.signal ?? undefined }
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
    if (!this.clientPromise) {
      return;
    }

    try {
      const client = await this.clientPromise;
      await client.cleanupImageSession(this.sessionId);
    } catch (error) {
      console.error(`Failed to cleanup remote image session '${this.sessionId}': ${String(error)}`);
    } finally {
      const client = await this.clientPromise;
      await client.close();
    }
  }
}
