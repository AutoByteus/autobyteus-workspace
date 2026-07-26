import { Singleton } from '../../utils/singleton.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { MultimediaProvider } from '../providers.js';
import { VideoModel } from './video-model.js';
import { BaseVideoClient } from './base-video-client.js';
import { GeminiVideoClient } from './api/gemini-video-client.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { MultimediaRuntime } from '../runtimes.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../../utils/gemini-runtime.js';

export const GEMINI_OMNI_FLASH_VIDEO_MODEL_ID = 'gemini-omni-flash-preview';

export class VideoClientFactory extends Singleton {
  protected static instance?: VideoClientFactory;

  private static modelsByIdentifier: Map<string, VideoModel> = new Map();
  private static initialized = false;

  constructor() {
    super();
    if (VideoClientFactory.instance) {
      return VideoClientFactory.instance;
    }
    VideoClientFactory.instance = this;
  }

  static ensureInitialized(): void {
    if (!VideoClientFactory.initialized) {
      VideoClientFactory.initializeRegistry();
      VideoClientFactory.initialized = true;
    }
  }

  static reinitialize(): void {
    VideoClientFactory.initialized = false;
    VideoClientFactory.modelsByIdentifier.clear();
    VideoClientFactory.ensureInitialized();
  }

  private static initializeRegistry(): void {
    const geminiOmniVideoSchema = new ParameterSchema([
      new ParameterDefinition({
        name: 'aspect_ratio',
        type: ParameterType.ENUM,
        defaultValue: '16:9',
        enumValues: ['16:9', '9:16'],
        description: 'The generated video aspect ratio. Gemini Omni Flash currently supports 16:9 and 9:16.'
      }),
      new ParameterDefinition({
        name: 'delivery',
        type: ParameterType.ENUM,
        defaultValue: 'uri',
        enumValues: ['uri', 'inline'],
        description: 'How Gemini should deliver the generated video. URI delivery is recommended for larger MP4 outputs.'
      }),
      new ParameterDefinition({
        name: 'task',
        type: ParameterType.ENUM,
        enumValues: ['text_to_video', 'image_to_video', 'reference_to_video'],
        description:
          'Optional Gemini Omni creation task hint. Use text_to_video for prompt-only creation, image_to_video for animating input_images, or reference_to_video for subject/reference images. Video editing is intentionally deferred to a future edit_video tool.'
      }),
      new ParameterDefinition({
        name: 'poll_interval_ms',
        type: ParameterType.INTEGER,
        defaultValue: 5000,
        minValue: 1000,
        maxValue: 60000,
        description: 'Polling interval in milliseconds while waiting for URI-delivered video files to become active.'
      }),
      new ParameterDefinition({
        name: 'max_poll_ms',
        type: ParameterType.INTEGER,
        defaultValue: 600000,
        minValue: 60000,
        maxValue: 1200000,
        description: 'Maximum time in milliseconds to wait for URI-delivered video files.'
      })
    ]);

    const geminiOmniFlashVideoModel = new VideoModel({
      name: GEMINI_OMNI_FLASH_VIDEO_MODEL_ID,
      value: GEMINI_OMNI_FLASH_VIDEO_MODEL_ID,
      provider: MultimediaProvider.GEMINI,
      clientClass: GeminiVideoClient,
      parameterSchema: geminiOmniVideoSchema,
      description:
        'Gemini Omni Flash Preview video generation model for text-to-video, image-to-video, and reference-image-to-video prompts. Outputs MP4 video; .mp4 output paths are recommended.'
    });

    VideoClientFactory.registerModel(geminiOmniFlashVideoModel);
  }

  static registerModel(model: VideoModel): void {
    const identifier = model.modelIdentifier;
    VideoClientFactory.modelsByIdentifier.set(identifier, model);
  }

  private static requireModel(modelIdentifier: string): VideoModel {
    VideoClientFactory.ensureInitialized();
    const model = VideoClientFactory.modelsByIdentifier.get(modelIdentifier);
    if (!model) {
      throw new Error(
        `No video model registered with the name '${modelIdentifier}'. Available models: ${Array.from(
          VideoClientFactory.modelsByIdentifier.keys()
        )}`
      );
    }
    return model;
  }


  static requiresGeminiRuntimeResolver(modelIdentifier: string): boolean {
    const model = VideoClientFactory.requireModel(modelIdentifier);
    return model.runtime === MultimediaRuntime.API
      && model.provider === MultimediaProvider.GEMINI;
  }

  static createVideoClient(
    modelIdentifier: string,
    configOverride: MultimediaConfig | null | undefined,
    apiKeyResolver: ProviderApiKeyResolver,
    geminiRuntimeResolver?: GeminiRuntimeResolver,
  ): BaseVideoClient {
    return VideoClientFactory.requireModel(modelIdentifier).createClient(configOverride, apiKeyResolver, geminiRuntimeResolver);
  }

  static listModels(): VideoModel[] {
    VideoClientFactory.ensureInitialized();
    return Array.from(VideoClientFactory.modelsByIdentifier.values());
  }
}

export const videoClientFactory = VideoClientFactory.getInstance();
