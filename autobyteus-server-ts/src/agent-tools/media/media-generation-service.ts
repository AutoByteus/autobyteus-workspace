import type { SpeechGenerationResponse } from "autobyteus-ts/multimedia/utils/response-types.js";
import type { ImageGenerationResponse } from "autobyteus-ts/multimedia/utils/response-types.js";
import type { VideoGenerationResponse } from "autobyteus-ts/multimedia/utils/response-types.js";
import type { MediaOperationOptions } from "autobyteus-ts/multimedia/utils/operation-options.js";
import {
  AudioClientFactory,
  ImageClientFactory,
  VideoClientFactory,
} from "autobyteus-ts";
import type {
  EditImageInput,
  GenerateImageInput,
  GenerateSpeechInput,
  GenerateVideoInput,
  MediaToolExecutionContext,
  MediaToolResult,
} from "./media-tool-contract.js";
import { getMediaModelResolver, type MediaModelResolver } from "./media-tool-model-resolver.js";
import { getMediaPathResolver, type MediaPathResolver } from "./media-tool-path-resolver.js";
import { createGeminiRuntimeResolver } from '../../llm-management/services/gemini-runtime-resolver-adapter.js';
import { createMediaProviderApiKeyResolver } from "../../secret-management/resolution/secret-management-provider-api-key-resolver.js";
import { MediaOperationLease } from './media-operation-lease.js';

type ImageClientLike = {
  generateImage(prompt: string, inputImageUrls?: string[] | null, generationConfig?: Record<string, unknown> | null, options?: MediaOperationOptions): Promise<ImageGenerationResponse>;
  editImage(prompt: string, inputImageUrls: string[], maskUrl?: string | null, generationConfig?: Record<string, unknown> | null, options?: MediaOperationOptions): Promise<ImageGenerationResponse>;
  cleanup?: () => Promise<void> | void;
};
type AudioClientLike = { generateSpeech(prompt: string, generationConfig?: Record<string, unknown> | null, options?: MediaOperationOptions): Promise<SpeechGenerationResponse>; cleanup?: () => Promise<void> | void };
type VideoClientLike = { generateVideo(prompt: string, inputImageUrls?: string[] | null, generationConfig?: Record<string, unknown> | null, options?: MediaOperationOptions): Promise<VideoGenerationResponse>; cleanup?: () => Promise<void> | void };

type MediaGenerationServiceDependencies = {
  modelResolver?: MediaModelResolver;
  pathResolver?: MediaPathResolver;
  createImageClient?: (modelIdentifier: string) => Promise<ImageClientLike>;
  createAudioClient?: (modelIdentifier: string) => Promise<AudioClientLike>;
  createVideoClient?: (modelIdentifier: string) => Promise<VideoClientLike>;
  getServerTimeout?: () => string | number | null | undefined;
  onConfigurationDiagnostic?: (message: string) => void;
};

export const DEFAULT_MEDIA_OPERATION_TIMEOUT_MS = 300_000;
export const MIN_MEDIA_OPERATION_TIMEOUT_MS = 10_000;
export const MAX_MEDIA_OPERATION_TIMEOUT_MS = 3_600_000;
export const MEDIA_OPERATION_TIMEOUT_SETTING = 'MEDIA_OPERATION_TIMEOUT_MS';

const firstUrlOrThrow = (urls: string[] | null | undefined, operation: string): string => {
  const first = Array.isArray(urls) ? urls.find((value) => typeof value === "string" && value.length > 0) : null;
  if (!first) throw new Error(`${operation} did not return a media URL.`);
  return first;
};

const withChildAbortSignal = (parent: AbortSignal | null | undefined): { signal: AbortSignal; abort: () => void; dispose: () => void } => {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason ?? new Error('Media operation cancelled.'));
  if (parent?.aborted) abort();
  else parent?.addEventListener('abort', abort, { once: true });
  return { signal: controller.signal, abort: () => controller.abort(new Error('Media operation timed out.')), dispose: () => parent?.removeEventListener('abort', abort) };
};

export class MediaGenerationService {
  private readonly modelResolver: MediaModelResolver;
  private readonly pathResolver: MediaPathResolver;
  private readonly createImageClient: (modelIdentifier: string) => Promise<ImageClientLike>;
  private readonly createAudioClient: (modelIdentifier: string) => Promise<AudioClientLike>;
  private readonly createVideoClient: (modelIdentifier: string) => Promise<VideoClientLike>;
  private readonly getServerTimeout: () => string | number | null | undefined;
  private readonly onConfigurationDiagnostic: (message: string) => void;
  private readonly currentLeaseByFinalPath = new Map<string, MediaOperationLease>();

  constructor(dependencies: MediaGenerationServiceDependencies = {}) {
    this.modelResolver = dependencies.modelResolver ?? getMediaModelResolver();
    this.pathResolver = dependencies.pathResolver ?? getMediaPathResolver();
    this.createImageClient = dependencies.createImageClient ?? ((modelIdentifier) => Promise.resolve(ImageClientFactory.createImageClient(modelIdentifier, undefined, createMediaProviderApiKeyResolver("image"), ImageClientFactory.requiresGeminiRuntimeResolver(modelIdentifier) ? createGeminiRuntimeResolver() : undefined)));
    this.createAudioClient = dependencies.createAudioClient ?? ((modelIdentifier) => Promise.resolve(AudioClientFactory.createAudioClient(modelIdentifier, undefined, createMediaProviderApiKeyResolver("audio"), AudioClientFactory.requiresGeminiRuntimeResolver(modelIdentifier) ? createGeminiRuntimeResolver() : undefined)));
    this.createVideoClient = dependencies.createVideoClient ?? ((modelIdentifier) => Promise.resolve(VideoClientFactory.createVideoClient(modelIdentifier, undefined, createMediaProviderApiKeyResolver("video"), VideoClientFactory.requiresGeminiRuntimeResolver(modelIdentifier) ? createGeminiRuntimeResolver() : undefined)));
    this.getServerTimeout = dependencies.getServerTimeout ?? (() => process.env[MEDIA_OPERATION_TIMEOUT_SETTING]);
    this.onConfigurationDiagnostic = dependencies.onConfigurationDiagnostic ?? ((message) => console.warn(`[MEDIA_CONFIG] ${message}`));
  }

  async generateImage(context: MediaToolExecutionContext, input: GenerateImageInput, options: MediaOperationOptions & { mediaOperationTimeoutMs?: number | null } = {}): Promise<MediaToolResult> {
    const timeoutMs = this.resolveTimeout(options.mediaOperationTimeoutMs);
    const outputPath = this.pathResolver.resolveOutputFilePath(input.output_file_path, context);
    const inputImages = this.pathResolver.resolveInputImageReferences(input.input_images, context);
    return this.runBoundedMediaOperation(options, outputPath, timeoutMs, async (lease, operationOptions) => {
      const resolvedModel = this.modelResolver.resolve("image_generation");
      const client = await this.createImageClient(resolvedModel.modelIdentifier);
      try {
        const response = await client.generateImage(input.prompt, inputImages.length > 0 ? inputImages : undefined, input.generation_config ?? undefined, operationOptions);
        await this.pathResolver.writeGeneratedMediaFromUrl(firstUrlOrThrow(response.image_urls, "Image generation"), lease.stagingPath, operationOptions);
        return { file_path: outputPath };
      } finally {
        await this.cleanupClient(client);
      }
    });
  }

  async editImage(context: MediaToolExecutionContext, input: EditImageInput, options: MediaOperationOptions = {}): Promise<MediaToolResult> {
    const resolvedModel = this.modelResolver.resolve("image_edit");
    const outputPath = this.pathResolver.resolveOutputFilePath(input.output_file_path, context);
    const inputImages = this.pathResolver.resolveInputImageReferences(input.input_images, context);
    const maskImage = input.mask_image ? this.pathResolver.resolveInputImageReference(input.mask_image, context) : null;
    return this.runUnboundedMediaOperation(options, outputPath, async (operationOptions) => {
      const client = await this.createImageClient(resolvedModel.modelIdentifier);
      try {
        const response = await client.editImage(input.prompt, inputImages, maskImage, input.generation_config ?? undefined, operationOptions);
        await this.pathResolver.writeGeneratedMediaFromUrl(firstUrlOrThrow(response.image_urls, "Image editing"), outputPath, operationOptions);
        return { file_path: outputPath };
      } finally { await this.cleanupClient(client); }
    });
  }

  async generateSpeech(context: MediaToolExecutionContext, input: GenerateSpeechInput, options: MediaOperationOptions = {}): Promise<MediaToolResult> {
    const resolvedModel = this.modelResolver.resolve("speech_generation");
    const outputPath = this.pathResolver.resolveOutputFilePath(input.output_file_path, context);
    return this.runUnboundedMediaOperation(options, outputPath, async (operationOptions) => {
      const client = await this.createAudioClient(resolvedModel.modelIdentifier);
      try {
        const response = await client.generateSpeech(input.prompt, input.generation_config ?? undefined, operationOptions);
        await this.pathResolver.writeGeneratedMediaFromUrl(firstUrlOrThrow(response.audio_urls, "Speech generation"), outputPath, operationOptions);
        return { file_path: outputPath };
      } finally { await this.cleanupClient(client); }
    });
  }

  async generateVideo(context: MediaToolExecutionContext, input: GenerateVideoInput, options: MediaOperationOptions = {}): Promise<MediaToolResult> {
    const resolvedModel = this.modelResolver.resolve("video_generation");
    const outputPath = this.pathResolver.resolveOutputFilePath(input.output_file_path, context);
    const inputImages = this.pathResolver.resolveInputImageReferences(input.input_images, context);
    return this.runUnboundedMediaOperation(options, outputPath, async (operationOptions) => {
      const client = await this.createVideoClient(resolvedModel.modelIdentifier);
      try {
        const response = await client.generateVideo(input.prompt, inputImages.length > 0 ? inputImages : undefined, input.generation_config ?? undefined, operationOptions);
        await this.pathResolver.writeGeneratedMediaFromUrl(firstUrlOrThrow(response.video_urls, "Video generation"), outputPath, operationOptions);
        return { file_path: outputPath };
      } finally { await this.cleanupClient(client); }
    });
  }

  private resolveTimeout(explicit: number | null | undefined): number {
    const candidates = [explicit, this.getServerTimeout(), DEFAULT_MEDIA_OPERATION_TIMEOUT_MS];
    for (const candidate of candidates) {
      const value = typeof candidate === 'number' ? candidate : Number(candidate);
      if (Number.isInteger(value) && value >= MIN_MEDIA_OPERATION_TIMEOUT_MS && value <= MAX_MEDIA_OPERATION_TIMEOUT_MS) return value;
      if (candidate !== null && candidate !== undefined && String(candidate).trim() !== '') {
        this.onConfigurationDiagnostic(`Ignoring invalid ${MEDIA_OPERATION_TIMEOUT_SETTING} value '${String(candidate)}'; expected an integer from ${MIN_MEDIA_OPERATION_TIMEOUT_MS} to ${MAX_MEDIA_OPERATION_TIMEOUT_MS}.`);
      }
    }
    return DEFAULT_MEDIA_OPERATION_TIMEOUT_MS;
  }

  private async runBoundedMediaOperation<T>(options: MediaOperationOptions, outputPath: string, timeoutMs: number, operation: (lease: MediaOperationLease, options: MediaOperationOptions) => Promise<T>): Promise<T> {
    const deadlineAt = Date.now() + timeoutMs;
    const lease = new MediaOperationLease(options.turnId ?? null, options.invocationId ?? null, outputPath, deadlineAt);
    const previous = this.currentLeaseByFinalPath.get(outputPath);
    previous?.revoke();
    this.currentLeaseByFinalPath.set(outputPath, lease);
    const child = withChildAbortSignal(options.signal);
    const operationOptions = { ...options, signal: child.signal, deadlineAt };
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      if (child.signal.aborted) throw new Error('Media operation was cancelled.');
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { lease.revoke(); child.abort(); reject(new Error(`Media operation timed out after ${timeoutMs}ms.`)); }, timeoutMs); });
      const cancellation = new Promise<never>((_, reject) => {
        if (child.signal.aborted) reject(new Error('Media operation was cancelled.'));
        else child.signal.addEventListener('abort', () => reject(new Error('Media operation was cancelled.')), { once: true });
      });
      cancellation.catch(() => undefined);
      const task = operation(lease, operationOptions);
      task.catch(() => undefined);
      const result = await Promise.race([task, timeout, cancellation]);
      if (!lease.canPublish(this.currentLeaseByFinalPath.get(outputPath))) throw new Error('Media operation completed after its publication lease was revoked.');
      await fsRename(lease.stagingPath, outputPath);
      lease.state = 'published';
      return result;
    } finally {
      if (timer) clearTimeout(timer);
      lease.revoke();
      child.dispose();
      await this.cleanupLease(lease);
      if (this.currentLeaseByFinalPath.get(outputPath)?.token === lease.token) this.currentLeaseByFinalPath.delete(outputPath);
    }
  }

  private async runUnboundedMediaOperation<T>(options: MediaOperationOptions, _outputPath: string, operation: (options: MediaOperationOptions) => Promise<T>): Promise<T> {
    const child = withChildAbortSignal(options.signal);
    try { return await operation({ ...options, signal: child.signal }); }
    finally { child.dispose(); }
  }

  private async cleanupLease(lease: MediaOperationLease): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      await Promise.race([lease.cleanup(), new Promise<void>((resolve) => { timer = setTimeout(resolve, 5000); })]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async cleanupClient(client: { cleanup?: () => Promise<void> | void }): Promise<void> {
    if (!client.cleanup) return;
    const cleanup = Promise.resolve().then(() => client.cleanup!());
    cleanup.catch((error) => console.warn(`[MEDIA_CLEANUP] ${String(error)}`));
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      await Promise.race([cleanup, new Promise<void>((resolve) => { timer = setTimeout(resolve, 5000); })]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

const fsRename = async (source: string, target: string): Promise<void> => {
  const fs = await import('node:fs/promises');
  await fs.mkdir((await import('node:path')).dirname(target), { recursive: true });
  await fs.rename(source, target);
};

let cachedMediaGenerationService: MediaGenerationService | null = null;
export const getMediaGenerationService = (): MediaGenerationService => {
  if (!cachedMediaGenerationService) cachedMediaGenerationService = new MediaGenerationService();
  return cachedMediaGenerationService;
};
