import type { TokenUsage } from '../../../llm/utils/token-usage.js';
import {
  assertRequiredKeys,
  BaseStreamPayload,
  isRecord,
  parseUsage
} from './stream-event-payload-utils.js';

export class AssistantChunkData extends BaseStreamPayload {
  content: string;
  reasoning?: string;
  is_complete: boolean;
  usage?: TokenUsage;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['content', 'is_complete'], 'AssistantChunkData');
    super(data);
    this.content = String(data.content ?? '');
    this.reasoning = data.reasoning ?? undefined;
    this.is_complete = Boolean(data.is_complete);
    this.usage = data.usage;
    this.image_urls = data.image_urls ?? undefined;
    this.audio_urls = data.audio_urls ?? undefined;
    this.video_urls = data.video_urls ?? undefined;
  }
}

export class AssistantCompleteResponseData extends BaseStreamPayload {
  content: string;
  reasoning?: string;
  usage?: TokenUsage;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['content'], 'AssistantCompleteResponseData');
    super(data);
    this.content = String(data.content ?? '');
    this.reasoning = data.reasoning ?? undefined;
    this.usage = data.usage;
    this.image_urls = data.image_urls ?? undefined;
    this.audio_urls = data.audio_urls ?? undefined;
    this.video_urls = data.video_urls ?? undefined;
  }
}

export const createAssistantChunkData = (chunkObj: unknown): AssistantChunkData => {
  if (!isRecord(chunkObj)) {
    throw new Error(`Cannot create AssistantChunkData from ${typeof chunkObj}`);
  }

  const usage = parseUsage(chunkObj.usage);
  const data = { ...chunkObj, usage };
  return new AssistantChunkData(data);
};

export const createAssistantCompleteResponseData = (
  completeRespObj: unknown
): AssistantCompleteResponseData => {
  if (!isRecord(completeRespObj)) {
    throw new Error(`Cannot create AssistantCompleteResponseData from ${typeof completeRespObj}`);
  }

  const usage = parseUsage(completeRespObj.usage);
  const data = { ...completeRespObj, usage };
  return new AssistantCompleteResponseData(data);
};
