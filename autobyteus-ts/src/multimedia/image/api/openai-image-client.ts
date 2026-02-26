import OpenAI from 'openai';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { BaseImageClient } from '../base-image-client.js';
import { ImageGenerationResponse } from '../../utils/response-types.js';
import { downloadFileFromUrl } from '../../../utils/download-utils.js';
import type { ImageModel } from '../image-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';

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

async function makeTempFile(extension = 'png'): Promise<string> {
  const tempDir = path.join(os.tmpdir(), 'autobyteus_images');
  await fsPromises.mkdir(tempDir, { recursive: true });
  const suffix = extension.replace(/^\./, '') || 'png';
  return path.join(tempDir, `${crypto.randomUUID()}.${suffix}`);
}

export class OpenAIImageClient extends BaseImageClient {
  private client: OpenAI;

  constructor(model: ImageModel, config: MultimediaConfig) {
    super(model, config);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }

    this.client = new OpenAI({ apiKey, baseURL: 'https://api.openai.com/v1' });
  }

  async generateImage(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>
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

      const response = await this.client.images.generate(
        request as unknown as OpenAI.Images.ImageGenerateParams
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
    generationConfig?: Record<string, unknown>
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
        await downloadFileFromUrl(sourceUrl, tempImagePath);
        sourcePath = tempImagePath;
      }

      let maskPath: string | null = null;
      if (maskUrl) {
        maskPath = maskUrl;
        if (!fs.existsSync(maskPath)) {
          tempMaskPath = await makeTempFile('png');
          await downloadFileFromUrl(maskUrl, tempMaskPath);
          maskPath = tempMaskPath;
        }
      }

      const size = typeof finalConfig.size === 'string' ? finalConfig.size : '1024x1024';
      const n = typeof finalConfig.n === 'number' ? finalConfig.n : 1;

      const request: Record<string, unknown> = {
        image: fs.createReadStream(sourcePath),
        prompt,
        model: this.model.value,
        n,
        size
      };

      if (maskPath) {
        request.mask = fs.createReadStream(maskPath);
      }
      if (typeof finalConfig.output_format === 'string') {
        request.output_format = finalConfig.output_format;
      }
      if (typeof finalConfig.output_compression === 'string') {
        request.output_compression = finalConfig.output_compression;
      }

      const response = await this.client.images.edit(
        request as unknown as OpenAI.Images.ImageEditParams
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
