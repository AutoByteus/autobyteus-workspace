import { AudioClientFactory } from "autobyteus-ts/multimedia/audio/audio-client-factory.js";
import { ImageClientFactory } from "autobyteus-ts/multimedia/image/image-client-factory.js";
import type { SpeechGenerationResponse } from "autobyteus-ts/multimedia/utils/response-types.js";
import type { ImageGenerationResponse } from "autobyteus-ts/multimedia/utils/response-types.js";
import type {
  EditImageInput,
  GenerateImageInput,
  GenerateSpeechInput,
  MediaToolExecutionContext,
  MediaToolResult,
} from "./media-tool-contract.js";
import { getMediaModelResolver, type MediaModelResolver } from "./media-tool-model-resolver.js";
import { getMediaPathResolver, type MediaPathResolver } from "./media-tool-path-resolver.js";

type ImageClientLike = {
  generateImage(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown> | null,
  ): Promise<ImageGenerationResponse>;
  editImage(
    prompt: string,
    inputImageUrls: string[],
    maskUrl?: string | null,
    generationConfig?: Record<string, unknown> | null,
  ): Promise<ImageGenerationResponse>;
  cleanup?: () => Promise<void> | void;
};

type AudioClientLike = {
  generateSpeech(
    prompt: string,
    generationConfig?: Record<string, unknown> | null,
  ): Promise<SpeechGenerationResponse>;
  cleanup?: () => Promise<void> | void;
};

type MediaGenerationServiceDependencies = {
  modelResolver?: MediaModelResolver;
  pathResolver?: MediaPathResolver;
  createImageClient?: (modelIdentifier: string) => ImageClientLike;
  createAudioClient?: (modelIdentifier: string) => AudioClientLike;
};

const firstUrlOrThrow = (urls: string[] | null | undefined, operation: string): string => {
  const first = Array.isArray(urls) ? urls.find((value) => typeof value === "string" && value.length > 0) : null;
  if (!first) {
    throw new Error(`${operation} did not return a media URL.`);
  }
  return first;
};

export class MediaGenerationService {
  private readonly modelResolver: MediaModelResolver;
  private readonly pathResolver: MediaPathResolver;
  private readonly createImageClient: (modelIdentifier: string) => ImageClientLike;
  private readonly createAudioClient: (modelIdentifier: string) => AudioClientLike;

  constructor(dependencies: MediaGenerationServiceDependencies = {}) {
    this.modelResolver = dependencies.modelResolver ?? getMediaModelResolver();
    this.pathResolver = dependencies.pathResolver ?? getMediaPathResolver();
    this.createImageClient = dependencies.createImageClient ??
      ((modelIdentifier) => ImageClientFactory.createImageClient(modelIdentifier));
    this.createAudioClient = dependencies.createAudioClient ??
      ((modelIdentifier) => AudioClientFactory.createAudioClient(modelIdentifier));
  }

  async generateImage(
    context: MediaToolExecutionContext,
    input: GenerateImageInput,
  ): Promise<MediaToolResult> {
    const resolvedModel = this.modelResolver.resolve("image_generation");
    const outputPath = this.pathResolver.resolveOutputFilePath(input.output_file_path, context);
    const inputImages = this.pathResolver.resolveInputImageReferences(input.input_images, context);
    const client = this.createImageClient(resolvedModel.modelIdentifier);

    try {
      const response = await client.generateImage(
        input.prompt,
        inputImages.length > 0 ? inputImages : undefined,
        input.generation_config ?? undefined,
      );
      await this.pathResolver.writeGeneratedMediaFromUrl(
        firstUrlOrThrow(response.image_urls, "Image generation"),
        outputPath,
      );
      return { file_path: outputPath };
    } finally {
      await client.cleanup?.();
    }
  }

  async editImage(
    context: MediaToolExecutionContext,
    input: EditImageInput,
  ): Promise<MediaToolResult> {
    const resolvedModel = this.modelResolver.resolve("image_edit");
    const outputPath = this.pathResolver.resolveOutputFilePath(input.output_file_path, context);
    const inputImages = this.pathResolver.resolveInputImageReferences(input.input_images, context);
    const maskImage = input.mask_image
      ? this.pathResolver.resolveInputImageReference(input.mask_image, context)
      : null;
    const client = this.createImageClient(resolvedModel.modelIdentifier);

    try {
      const response = await client.editImage(
        input.prompt,
        inputImages,
        maskImage,
        input.generation_config ?? undefined,
      );
      await this.pathResolver.writeGeneratedMediaFromUrl(
        firstUrlOrThrow(response.image_urls, "Image editing"),
        outputPath,
      );
      return { file_path: outputPath };
    } finally {
      await client.cleanup?.();
    }
  }

  async generateSpeech(
    context: MediaToolExecutionContext,
    input: GenerateSpeechInput,
  ): Promise<MediaToolResult> {
    const resolvedModel = this.modelResolver.resolve("speech_generation");
    const outputPath = this.pathResolver.resolveOutputFilePath(input.output_file_path, context);
    const client = this.createAudioClient(resolvedModel.modelIdentifier);

    try {
      const response = await client.generateSpeech(
        input.prompt,
        input.generation_config ?? undefined,
      );
      await this.pathResolver.writeGeneratedMediaFromUrl(
        firstUrlOrThrow(response.audio_urls, "Speech generation"),
        outputPath,
      );
      return { file_path: outputPath };
    } finally {
      await client.cleanup?.();
    }
  }
}

let cachedMediaGenerationService: MediaGenerationService | null = null;

export const getMediaGenerationService = (): MediaGenerationService => {
  if (!cachedMediaGenerationService) {
    cachedMediaGenerationService = new MediaGenerationService();
  }
  return cachedMediaGenerationService;
};
