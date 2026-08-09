import mime from 'mime-types';
import { GoogleGenAI } from '@google/genai';
import { BaseImageClient } from '../base-image-client.js';
import { ImageGenerationResponse } from '../../utils/response-types.js';
import { loadImageFromUrl } from '../../utils/api-utils.js';
import {
  initializeGeminiClientWithRuntime,
} from '../../../utils/gemini-helper.js';
import type { MediaOperationOptions } from '../../utils/operation-options.js';
import type { GeminiRuntimeInfo } from '../../../utils/gemini-helper.js';
import { resolveModelForRuntime } from '../../../utils/gemini-model-mapping.js';
import type { ImageModel } from '../image-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';
import type { ProviderApiKeyResolver } from '../../../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../../../utils/gemini-runtime.js';

type GeminiImageConfigField = 'aspect_ratio' | 'image_size';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readImageConfigValue = (
  config: Record<string, unknown>,
  field: GeminiImageConfigField,
  enumValues: string[] | undefined,
): string | undefined => {
  const value = config[field];
  if (value === undefined || value === null) {
    return undefined;
  }

  if (
    typeof value !== 'string' ||
    (enumValues && enumValues.length > 0 && !enumValues.includes(value))
  ) {
    const allowedValues = enumValues && enumValues.length > 0
      ? ` one of: ${enumValues.join(', ')}`
      : ' a string';
    throw new Error(`generation_config.${field} must be${allowedValues}.`);
  }

  return value;
};

const normalizeImageGenerationConfig = (
  baseConfig: Record<string, unknown>,
  generationConfig: Record<string, unknown> | undefined,
  model: ImageModel,
): Record<string, unknown> => {
  const configDict: Record<string, unknown> = {
    ...baseConfig,
    ...(generationConfig ?? {}),
  };
  const modelSchema = model.parameterSchema;
  const aspectRatioParameter = modelSchema?.getParameter('aspect_ratio');
  const imageSizeParameter = modelSchema?.getParameter('image_size');
  const aspectRatio = aspectRatioParameter
    ? readImageConfigValue(configDict, 'aspect_ratio', aspectRatioParameter.enumValues)
    : undefined;
  const imageSize = imageSizeParameter
    ? readImageConfigValue(configDict, 'image_size', imageSizeParameter.enumValues)
    : undefined;

  if (aspectRatioParameter) {
    delete configDict.aspect_ratio;
  }
  if (imageSizeParameter) {
    delete configDict.image_size;
  }

  if (aspectRatio === undefined && imageSize === undefined) {
    return configDict;
  }

  const imageConfig = isRecord(configDict.imageConfig)
    ? { ...configDict.imageConfig }
    : {};
  configDict.imageConfig = {
    ...imageConfig,
    ...(aspectRatio === undefined ? {} : { aspectRatio }),
    ...(imageSize === undefined ? {} : { imageSize }),
  };

  return configDict;
};

function guessMimeType(source: string): string {
  const mimeType = mime.lookup(source);
  return mimeType || 'image/png';
}

export class GeminiImageClient extends BaseImageClient {
  private clientPromise: Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  private readonly runtimeResolver: GeminiRuntimeResolver;

  constructor(model: ImageModel, config: MultimediaConfig, apiKeyResolver: ProviderApiKeyResolver, runtimeResolver?: GeminiRuntimeResolver) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
    if (!runtimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_REQUIRED');
    this.runtimeResolver = runtimeResolver;
  }

  private getClient(): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private async initializeClient(): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
    const selection = await this.runtimeResolver();
    return initializeGeminiClientWithRuntime(selection, this.apiKeyResolver);
  }

  async generateImage(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>,
    operationOptions?: MediaOperationOptions
  ): Promise<ImageGenerationResponse> {
    try {
      const { client, runtimeInfo } = await this.getClient();
      const contentParts: Array<Record<string, unknown> | string> = [prompt];
      if (inputImageUrls && inputImageUrls.length > 0) {
        for (const url of inputImageUrls) {
          try {
            const imageBytes = await loadImageFromUrl(url, operationOptions?.signal ?? undefined);
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

      const configDict = normalizeImageGenerationConfig(
        this.config?.params ?? {},
        generationConfig,
        this.model,
      );

      if (!configDict.responseModalities) {
        if (runtimeInfo.runtime === 'vertex') {
          configDict.responseModalities = ['TEXT', 'IMAGE'];
        } else {
          configDict.responseModalities = ['IMAGE'];
        }
      }

      const runtimeAdjustedModel = resolveModelForRuntime(
        this.model.value,
        'image',
        runtimeInfo.runtime
      );

      const response = await (client.models.generateContent as any)({
        model: runtimeAdjustedModel,
        contents: contentParts,
        config: configDict
      }, { signal: operationOptions?.signal ?? undefined } as any);

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
    generationConfig?: Record<string, unknown>,
    operationOptions?: MediaOperationOptions
  ): Promise<ImageGenerationResponse> {
    if (maskUrl) {
      console.warn(
        `The GeminiImageClient for model '${this.model.name}' received a 'mask_url' but does not support explicit masking. The mask will be ignored.`
      );
    }

    return this.generateImage(prompt, inputImageUrls, generationConfig, operationOptions);
  }
}
