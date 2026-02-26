import mime from 'mime-types';
import { GoogleGenAI } from '@google/genai';
import { BaseImageClient } from '../base-image-client.js';
import { ImageGenerationResponse } from '../../utils/response-types.js';
import { loadImageFromUrl } from '../../utils/api-utils.js';
import { initializeGeminiClientWithRuntime } from '../../../utils/gemini-helper.js';
import type { GeminiRuntimeInfo } from '../../../utils/gemini-helper.js';
import { resolveModelForRuntime } from '../../../utils/gemini-model-mapping.js';
import type { ImageModel } from '../image-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';

function guessMimeType(source: string): string {
  const mimeType = mime.lookup(source);
  return mimeType || 'image/png';
}

export class GeminiImageClient extends BaseImageClient {
  private client: GoogleGenAI;
  private runtimeInfo: GeminiRuntimeInfo | null;

  constructor(model: ImageModel, config: MultimediaConfig) {
    super(model, config);
    const { client, runtimeInfo } = initializeGeminiClientWithRuntime();
    this.client = client;
    this.runtimeInfo = runtimeInfo;
  }

  async generateImage(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>
  ): Promise<ImageGenerationResponse> {
    try {
      const contentParts: Array<Record<string, unknown> | string> = [prompt];
      if (inputImageUrls && inputImageUrls.length > 0) {
        for (const url of inputImageUrls) {
          try {
            const imageBytes = await loadImageFromUrl(url);
            const mimeType = guessMimeType(url);
            contentParts.push({
              inlineData: {
                data: Buffer.from(imageBytes).toString('base64'),
                mimeType
              }
            });
          } catch (error) {
            console.error(`Skipping image at '${url}' due to loading error: ${error}`);
          }
        }
      }

      const configDict: Record<string, unknown> = { ...(this.config?.params ?? {}) };
      if (generationConfig) {
        Object.assign(configDict, generationConfig);
      }

      if (!configDict.responseModalities) {
        if (this.runtimeInfo?.runtime === 'vertex') {
          configDict.responseModalities = ['TEXT', 'IMAGE'];
        } else {
          configDict.responseModalities = ['IMAGE'];
        }
      }

      const runtimeAdjustedModel = resolveModelForRuntime(
        this.model.value,
        'image',
        this.runtimeInfo?.runtime
      );

      const response = await this.client.models.generateContent({
        model: runtimeAdjustedModel,
        contents: contentParts,
        config: configDict
      });

      const imageUrls: string[] = [];
      const parts = response?.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const inlineData = part?.inlineData;
        const mimeType = inlineData?.mimeType;
        const data = inlineData?.data;
        if (typeof mimeType === 'string' && mimeType.includes('image') && typeof data === 'string') {
          const dataUri = `data:${mimeType};base64,${data}`;
          imageUrls.push(dataUri);
        }
      }

      if (imageUrls.length === 0) {
        const blockReason = response?.promptFeedback?.blockReason;
        if (blockReason) {
          throw new Error(`Image generation failed due to safety settings: ${blockReason}`);
        }
        throw new Error('Gemini API did not return any processable images.');
      }

      return new ImageGenerationResponse(imageUrls, undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Unsupported') && message.includes('location')) {
        throw new Error('Image generation is not supported in your configured region. Please check your Google Cloud project settings.');
      }
      throw new Error(`Google Gemini image generation failed: ${message}`);
    }
  }

  async editImage(
    prompt: string,
    inputImageUrls: string[],
    maskUrl?: string | null,
    generationConfig?: Record<string, unknown>
  ): Promise<ImageGenerationResponse> {
    if (maskUrl) {
      console.warn(
        `The GeminiImageClient for model '${this.model.name}' received a 'mask_url' but does not support explicit masking. The mask will be ignored.`
      );
    }

    return this.generateImage(prompt, inputImageUrls, generationConfig);
  }
}
