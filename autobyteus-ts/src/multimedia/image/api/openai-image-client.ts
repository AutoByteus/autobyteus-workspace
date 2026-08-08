import OpenAI, { toFile, type Uploadable } from 'openai';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { BaseImageClient } from '../base-image-client.js';
import { ImageGenerationResponse } from '../../utils/response-types.js';
import { downloadFileFromUrl } from '../../../utils/download-utils.js';
import type { MediaOperationOptions } from '../../utils/operation-options.js';
import type { ImageModel } from '../image-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';
import type { ProviderApiKeyResolver } from '../../../secrets/provider-api-key-resolver.js';
import { MultimediaProvider } from '../../providers.js';

function mimeTypeFromFormat(outputFormat: string | null | undefined): string {
  const fmt = (outputFormat ?? 'png').toLowerCase();
  if (fmt === 'jpg' || fmt === 'jpeg') {
    return 'image/jpeg';
  }
  if (fmt === 'webp') {
    return 'image/webp';
  }
  return 'image/png';
}

function mimeTypeFromFilePath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }
  if (extension === '.webp') {
    return 'image/webp';
  }
  return 'image/png';
}

function usesGptImageEditPayload(modelValue: string): boolean {
  return modelValue.startsWith('gpt-image-') || modelValue === 'chatgpt-image-latest';
}

function isSupportedGptImageEditQuality(value: unknown): value is string {
  return typeof value === 'string' && ['auto', 'low', 'medium', 'high'].includes(value);
}

async function toOpenAIFileUpload(filePath: string): Promise<Uploadable> {
  return toFile(await fsPromises.readFile(filePath), path.basename(filePath), {
    type: mimeTypeFromFilePath(filePath)
  });
}

async function makeTempFile(extension = 'png'): Promise<string> {
  const tempDir = path.join(os.tmpdir(), 'autobyteus_images');
  await fsPromises.mkdir(tempDir, { recursive: true });
  const suffix = extension.replace(/^\./, '') || 'png';
  return path.join(tempDir, `${crypto.randomUUID()}.${suffix}`);
}

export class OpenAIImageClient extends BaseImageClient {
  private clientPromise: Promise<OpenAI> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;

  constructor(model: ImageModel, config: MultimediaConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
  }

  private async initializeClient(): Promise<OpenAI> {
    const secret = await this.apiKeyResolver.resolve(MultimediaProvider.OPENAI);
    return new OpenAI({
      apiKey: secret.revealToTrustedConsumer(),
      baseURL: 'https://api.openai.com/v1',
    });
  }

  private getClient(): Promise<OpenAI> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  async generateImage(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>,
    operationOptions?: MediaOperationOptions
  ): Promise<ImageGenerationResponse> {
    if (inputImageUrls && inputImageUrls.length > 0) {
      console.warn(
        'The OpenAI images.generate API does not support input images. Provided inputs will be ignored.'
      );
    }

    try {
      const finalConfig = { ...(this.config.toDict?.() ?? {}) } as Record<string, unknown>;
      if (generationConfig) {
        Object.assign(finalConfig, generationConfig);
      }
      finalConfig.n = 1;

      const size = typeof finalConfig.size === 'string' ? finalConfig.size : '1024x1024';
      const quality = typeof finalConfig.quality === 'string' ? finalConfig.quality : 'standard';

      const request: Record<string, unknown> = {
        model: this.model.value,
        prompt,
        n: 1,
        size,
        quality
      };

      if (typeof finalConfig.output_format === 'string') {
        request.output_format = finalConfig.output_format;
      }
      if (typeof finalConfig.output_compression === 'string') {
        request.output_compression = finalConfig.output_compression;
      }

      const client = await this.getClient();
      const response = await client.images.generate(
        request as unknown as OpenAI.Images.ImageGenerateParams,
        { signal: operationOptions?.signal ?? undefined }
      ) as OpenAI.Images.ImagesResponse;
      const outputFormat = typeof finalConfig.output_format === 'string' ? finalConfig.output_format : 'png';
      const mimeType = mimeTypeFromFormat(outputFormat);

      const imageUrls: string[] = [];
      for (const img of response.data ?? []) {
        if (img.url) {
          imageUrls.push(img.url);
        } else if (img.b64_json) {
          imageUrls.push(`data:${mimeType};base64,${img.b64_json}`);
        }
      }

      const revisedPrompt = response.data?.[0]?.revised_prompt ?? null;
      if (imageUrls.length === 0) {
        throw new Error('OpenAI API did not return any image data.');
      }

      return new ImageGenerationResponse(imageUrls, revisedPrompt ?? undefined);
    } catch (error) {
      throw new Error(`OpenAI image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async editImage(
    prompt: string,
    inputImageUrls: string[],
    maskUrl?: string | null,
    generationConfig?: Record<string, unknown>,
    operationOptions?: MediaOperationOptions
  ): Promise<ImageGenerationResponse> {
    if (!inputImageUrls || inputImageUrls.length === 0) {
      throw new Error('At least one input image URL must be provided for editing.');
    }

    const sourceUrl = inputImageUrls[0];
    if (inputImageUrls.length > 1) {
      console.warn('OpenAI edit endpoint supports a single input image; extra inputs are ignored.');
    }

    let tempImagePath: string | null = null;
    let tempMaskPath: string | null = null;

    try {
      const finalConfig = { ...(this.config.toDict?.() ?? {}) } as Record<string, unknown>;
      if (generationConfig) {
        Object.assign(finalConfig, generationConfig);
      }
      finalConfig.n = 1;

      let sourcePath = sourceUrl;
      if (!fs.existsSync(sourcePath)) {
        tempImagePath = await makeTempFile('png');
        await downloadFileFromUrl(sourceUrl, tempImagePath, { signal: operationOptions?.signal ?? undefined });
        sourcePath = tempImagePath;
      }

      let maskPath: string | null = null;
      if (maskUrl) {
        maskPath = maskUrl;
        if (!fs.existsSync(maskPath)) {
          tempMaskPath = await makeTempFile('png');
          await downloadFileFromUrl(maskUrl, tempMaskPath, { signal: operationOptions?.signal ?? undefined });
          maskPath = tempMaskPath;
        }
      }

      const size = typeof finalConfig.size === 'string' ? finalConfig.size : '1024x1024';
      const n = typeof finalConfig.n === 'number' ? finalConfig.n : 1;
      const imageUpload = await toOpenAIFileUpload(sourcePath);
      const isGptImageEditRequest = usesGptImageEditPayload(this.model.value);

      const request: Record<string, unknown> = {
        image: isGptImageEditRequest ? [imageUpload] : imageUpload,
        prompt,
        model: this.model.value,
        n,
        size
      };

      if (maskPath) {
        request.mask = await toOpenAIFileUpload(maskPath);
      }
      if (isGptImageEditRequest) {
        if (isSupportedGptImageEditQuality(finalConfig.quality)) {
          request.quality = finalConfig.quality;
        }
        if (typeof finalConfig.output_format === 'string') {
          request.output_format = finalConfig.output_format;
        }
        if (typeof finalConfig.output_compression === 'string') {
          request.output_compression = finalConfig.output_compression;
        }
      }

      const client = await this.getClient();
      const response = await client.images.edit(
        request as unknown as OpenAI.Images.ImageEditParams,
        { signal: operationOptions?.signal ?? undefined }
      ) as OpenAI.Images.ImagesResponse;
      const outputFormat = typeof finalConfig.output_format === 'string' ? finalConfig.output_format : 'png';
      const mimeType = mimeTypeFromFormat(outputFormat);

      const imageUrls: string[] = [];
      for (const img of response.data ?? []) {
        if (img.url) {
          imageUrls.push(img.url);
        } else if (img.b64_json) {
          imageUrls.push(`data:${mimeType};base64,${img.b64_json}`);
        }
      }

      if (imageUrls.length === 0) {
        throw new Error('OpenAI API did not return any edited image data.');
      }

      return new ImageGenerationResponse(imageUrls);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('does not support image editing')) {
        throw new Error(`The model '${this.model.value}' does not support the image editing endpoint.`);
      }
      throw new Error(`OpenAI image editing failed: ${message}`);
    } finally {
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try {
          await fsPromises.unlink(tempImagePath);
        } catch {
          // ignore
        }
      }
      if (tempMaskPath && fs.existsSync(tempMaskPath)) {
        try {
          await fsPromises.unlink(tempMaskPath);
        } catch {
          // ignore
        }
      }
    }
  }
}
