import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { GoogleGenAI } from '@google/genai';
import { BaseVideoClient } from '../base-video-client.js';
import { VideoGenerationResponse } from '../../utils/response-types.js';
import { loadMediaReference } from '../../utils/media-reference-loader.js';
import {
  initializeGeminiClientWithRuntime,
  selectGeminiRuntimeForResolver,
} from '../../../utils/gemini-helper.js';
import type { GeminiRuntimeInfo } from '../../../utils/gemini-helper.js';
import { resolveModelForRuntime } from '../../../utils/gemini-model-mapping.js';
import type { VideoModel } from '../video-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';
import type { ProviderApiKeyResolver } from '../../../secrets/provider-api-key-resolver.js';

const VIDEO_TEMP_DIR = path.join(os.tmpdir(), 'autobyteus_video');
const SUPPORTED_ASPECT_RATIOS = new Set(['16:9', '9:16']);
const SUPPORTED_DELIVERIES = new Set(['uri', 'inline']);
const SUPPORTED_VIDEO_CREATION_TASKS = ['text_to_video', 'image_to_video', 'reference_to_video'] as const;
const SUPPORTED_VIDEO_TASK_SET = new Set<string>(SUPPORTED_VIDEO_CREATION_TASKS);
const DEFAULT_VIDEO_MIME_TYPE = 'video/mp4';

type GeminiVideoDelivery = 'uri' | 'inline';
type GeminiVideoCreationTask = typeof SUPPORTED_VIDEO_CREATION_TASKS[number];

type NormalizedVideoConfig = {
  aspectRatio: '16:9' | '9:16';
  delivery: GeminiVideoDelivery;
  task?: GeminiVideoCreationTask;
  pollIntervalMs: number;
  maxPollMs: number;
};

type VideoContentLike = {
  type?: unknown;
  data?: unknown;
  videoBytes?: unknown;
  video_bytes?: unknown;
  mime_type?: unknown;
  mimeType?: unknown;
  uri?: unknown;
  name?: unknown;
  downloadUri?: unknown;
  video?: unknown;
  output_video?: unknown;
  outputVideo?: unknown;
  outputs?: unknown;
  content?: unknown;
  parts?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeVideoTask = (value: unknown): GeminiVideoCreationTask | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      'generation_config.task must be one of: text_to_video, image_to_video, reference_to_video.'
    );
  }

  const task = value.trim().toLowerCase();
  if (task === 'edit') {
    throw new Error(
      "generation_config.task='edit' is not supported by generate_video. Video editing is deferred to a future edit_video tool."
    );
  }
  if (!SUPPORTED_VIDEO_TASK_SET.has(task)) {
    throw new Error(
      'generation_config.task must be one of: text_to_video, image_to_video, reference_to_video.'
    );
  }

  return task as GeminiVideoCreationTask;
};

const readInteger = (
  value: unknown,
  defaultValue: number,
  name: string,
  min: number,
  max: number,
): number => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numericValue) || numericValue < min || numericValue > max) {
    throw new Error(`generation_config.${name} must be an integer between ${min} and ${max}.`);
  }
  return numericValue;
};

const normalizeConfig = (
  baseConfig: Record<string, unknown>,
  generationConfig?: Record<string, unknown>,
): NormalizedVideoConfig => {
  const finalConfig = { ...baseConfig, ...(generationConfig ?? {}) };
  const aspectRatio = readString(finalConfig.aspect_ratio) ?? '16:9';
  if (!SUPPORTED_ASPECT_RATIOS.has(aspectRatio)) {
    throw new Error("generation_config.aspect_ratio must be one of: 16:9, 9:16.");
  }

  const delivery = readString(finalConfig.delivery) ?? 'uri';
  if (!SUPPORTED_DELIVERIES.has(delivery)) {
    throw new Error("generation_config.delivery must be one of: uri, inline.");
  }

  return {
    aspectRatio: aspectRatio as NormalizedVideoConfig['aspectRatio'],
    delivery: delivery as GeminiVideoDelivery,
    task: normalizeVideoTask(finalConfig.task),
    pollIntervalMs: readInteger(finalConfig.poll_interval_ms, 5000, 'poll_interval_ms', 1000, 60000),
    maxPollMs: readInteger(finalConfig.max_poll_ms, 600000, 'max_poll_ms', 60000, 1200000),
  };
};

const hasInputImages = (inputImageUrls?: string[] | null): boolean =>
  Array.isArray(inputImageUrls) &&
  inputImageUrls.some((reference) => typeof reference === 'string' && reference.trim().length > 0);

const assertTaskInputCompatibility = (
  task: GeminiVideoCreationTask | undefined,
  inputImageUrls?: string[] | null,
): void => {
  if (
    (task === 'image_to_video' || task === 'reference_to_video') &&
    !hasInputImages(inputImageUrls)
  ) {
    throw new Error(`generation_config.task='${task}' requires at least one input_images entry.`);
  }
};

const buildProviderGenerationConfig = (
  task: GeminiVideoCreationTask | undefined,
): Record<string, unknown> | undefined => {
  if (!task) {
    return undefined;
  }
  return {
    video_config: {
      task,
    },
  };
};

const normalizeMimeType = (value: unknown): string => {
  const mimeType = readString(value);
  return mimeType ?? DEFAULT_VIDEO_MIME_TYPE;
};

const collectCandidateVideoObjects = (value: unknown, output: VideoContentLike[] = []): VideoContentLike[] => {
  if (!isRecord(value)) {
    return output;
  }

  const candidate = value as VideoContentLike;
  if (
    candidate.type === 'video' ||
    candidate.data ||
    candidate.videoBytes ||
    candidate.video_bytes ||
    candidate.uri ||
    candidate.downloadUri ||
    candidate.output_video ||
    candidate.outputVideo ||
    candidate.video
  ) {
    output.push(candidate);
  }

  for (const key of ['output_video', 'outputVideo', 'video', 'outputs', 'content', 'parts'] as const) {
    const child = candidate[key];
    if (Array.isArray(child)) {
      for (const entry of child) {
        collectCandidateVideoObjects(entry, output);
      }
    } else if (isRecord(child)) {
      collectCandidateVideoObjects(child, output);
    }
  }

  return output;
};

const extractInlineDataUri = (candidate: VideoContentLike): string | null => {
  const data = readString(candidate.data) ?? readString(candidate.videoBytes) ?? readString(candidate.video_bytes);
  if (!data) {
    return null;
  }
  const mimeType = normalizeMimeType(candidate.mime_type ?? candidate.mimeType);
  return `data:${mimeType};base64,${data}`;
};

const getFileState = (file: unknown): string | null => {
  if (!isRecord(file)) {
    return null;
  }
  const rawState = file.state;
  const state = readString(rawState) ?? (isRecord(rawState) ? readString(rawState.name) : null);
  return state ? state.toUpperCase() : null;
};

const getFileFailureMessage = (file: unknown): string => {
  if (!isRecord(file)) {
    return 'unknown file failure';
  }
  const error = isRecord(file.error) ? file.error : null;
  return readString(error?.message) ?? readString(file.error) ?? 'unknown file failure';
};

const normalizeGeminiFileName = (value: string): string | null => {
  const withoutSuffix = value.trim().split(/[?#]/, 1)[0]?.replace(/:download$/, '') ?? '';
  if (!withoutSuffix) {
    return null;
  }

  const match = /(?:^|\/)(files\/[^/:\s]+)$/.exec(withoutSuffix);
  return match?.[1] ?? null;
};

const getFileNameForPolling = (candidate: VideoContentLike): string | null => {
  const name = readString(candidate.name);
  if (name) {
    return normalizeGeminiFileName(name) ?? name;
  }
  const uri = readString(candidate.uri) ?? readString(candidate.downloadUri);
  return uri ? normalizeGeminiFileName(uri) ?? uri : null;
};

export class GeminiVideoClient extends BaseVideoClient {
  private clientPromise: Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  private tempFiles: string[] = [];

  constructor(model: VideoModel, config: MultimediaConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
  }

  private getClient(): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private async initializeClient(): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
    const selection = await selectGeminiRuntimeForResolver(this.apiKeyResolver);
    return initializeGeminiClientWithRuntime(selection, this.apiKeyResolver);
  }

  async generateVideo(
    prompt: string,
    inputImageUrls?: string[] | null,
    generationConfig?: Record<string, unknown>,
  ): Promise<VideoGenerationResponse> {
    try {
      const { client, runtimeInfo } = await this.getClient();
      const normalizedConfig = normalizeConfig(this.config.toDict?.() ?? {}, generationConfig);
      assertTaskInputCompatibility(normalizedConfig.task, inputImageUrls);
      const runtimeAdjustedModel = resolveModelForRuntime(
        this.model.value,
        'video',
        runtimeInfo.runtime,
      );
      const providerGenerationConfig = buildProviderGenerationConfig(normalizedConfig.task);
      const request = {
        model: runtimeAdjustedModel,
        input: await this.buildInteractionInput(prompt, inputImageUrls),
        response_format: {
          type: 'video',
          delivery: normalizedConfig.delivery,
          aspect_ratio: normalizedConfig.aspectRatio,
        },
        response_mime_type: DEFAULT_VIDEO_MIME_TYPE,
        background: false,
        store: false,
        stream: false,
        ...(providerGenerationConfig ? { generation_config: providerGenerationConfig } : {}),
      };

      const interaction = await client.interactions.create(request as never);
      const videoUrl = await this.extractGeneratedVideoUrl(interaction, normalizedConfig);
      return new VideoGenerationResponse([videoUrl]);
    } catch (error) {
      throw new Error(`Google Gemini video generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async buildInteractionInput(
    prompt: string,
    inputImageUrls?: string[] | null,
  ): Promise<string | Array<Record<string, unknown>>> {
    if (!inputImageUrls || inputImageUrls.length === 0) {
      return prompt;
    }

    const parts: Array<Record<string, unknown>> = [];
    for (const reference of inputImageUrls) {
      const loaded = await loadMediaReference(reference, { fallbackMimeType: 'image/png' });
      parts.push({
        type: 'image',
        data: loaded.base64,
        mime_type: loaded.mimeType,
      });
    }
    parts.push({ type: 'text', text: prompt });
    return parts;
  }

  private async extractGeneratedVideoUrl(
    interaction: unknown,
    config: NormalizedVideoConfig,
  ): Promise<string> {
    const candidates = collectCandidateVideoObjects(interaction);
    for (const candidate of candidates) {
      const inlineDataUri = extractInlineDataUri(candidate);
      if (inlineDataUri) {
        return inlineDataUri;
      }
    }

    for (const candidate of candidates) {
      const uri = readString(candidate.uri) ?? readString(candidate.downloadUri);
      if (uri) {
        return this.downloadUriVideo(candidate, config);
      }
    }

    throw new Error('Gemini Interactions API did not return a processable video.');
  }

  private async downloadUriVideo(
    outputVideo: VideoContentLike,
    config: NormalizedVideoConfig,
  ): Promise<string> {
    const fileName = getFileNameForPolling(outputVideo);
    let downloadable: unknown = outputVideo;

    if (fileName) {
      downloadable = await this.pollFileUntilActive(fileName, config);
    }

    await fs.mkdir(VIDEO_TEMP_DIR, { recursive: true });
    const downloadPath = path.join(VIDEO_TEMP_DIR, `${crypto.randomUUID()}.mp4`);
    const { client } = await this.getClient();
    await client.files.download({ file: downloadable as never, downloadPath });
    this.tempFiles.push(downloadPath);
    return downloadPath;
  }

  private async pollFileUntilActive(fileName: string, config: NormalizedVideoConfig): Promise<unknown> {
    const startedAt = Date.now();
    let lastFile: unknown = { name: fileName };
    const { client } = await this.getClient();

    while (Date.now() - startedAt <= config.maxPollMs) {
      lastFile = await client.files.get({ name: fileName });
      const state = getFileState(lastFile);
      if (state === 'ACTIVE' || !state) {
        return lastFile;
      }
      if (state === 'FAILED') {
        throw new Error(`Gemini video file '${fileName}' failed while processing: ${getFileFailureMessage(lastFile)}`);
      }
      await sleep(config.pollIntervalMs);
    }

    throw new Error(`Timed out waiting for Gemini video file '${fileName}' to become active.`);
  }

  override async cleanup(): Promise<void> {
    const files = [...this.tempFiles];
    this.tempFiles = [];
    await Promise.all(files.map(async (filePath) => {
      await fs.rm(filePath, { force: true });
    }));
  }
}
