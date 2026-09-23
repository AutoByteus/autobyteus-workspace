import type { LlmTokenUsageObservation } from './llm-token-usage-observation.js';
import { ToolCallDelta } from './tool-call-delta.js';
import type { AnthropicAssistantTurn } from './provider-native-assistant-turn.js';

export class CompleteResponse {
  content: string;
  reasoning: string | null;
  usage: LlmTokenUsageObservation | null;
  image_urls: string[];
  audio_urls: string[];
  video_urls: string[];
  providerNativeAssistantTurn: AnthropicAssistantTurn | null;

  constructor(data: {
    content: string;
    reasoning?: string | null;
    usage?: LlmTokenUsageObservation | null;
    image_urls?: string[];
    audio_urls?: string[];
    video_urls?: string[];
    providerNativeAssistantTurn?: AnthropicAssistantTurn | null;
  }) {
    this.content = data.content;
    this.reasoning = data.reasoning ?? null;
    this.usage = data.usage ?? null;
    this.image_urls = data.image_urls ?? [];
    this.audio_urls = data.audio_urls ?? [];
    this.video_urls = data.video_urls ?? [];
    this.providerNativeAssistantTurn = data.providerNativeAssistantTurn ?? null;
  }

  static fromContent(content: string): CompleteResponse {
    return new CompleteResponse({ content });
  }
}

export class ChunkResponse {
  content: string;
  reasoning: string | null;
  is_complete: boolean;
  usage: LlmTokenUsageObservation | null;
  image_urls: string[];
  audio_urls: string[];
  video_urls: string[];
  tool_calls: ToolCallDelta[] | null;
  providerNativeAssistantTurn: AnthropicAssistantTurn | null;

  constructor(data: {
    content: string;
    reasoning?: string | null;
    is_complete?: boolean;
    usage?: LlmTokenUsageObservation | null;
    image_urls?: string[];
    audio_urls?: string[];
    video_urls?: string[];
    tool_calls?: ToolCallDelta[] | null;
    providerNativeAssistantTurn?: AnthropicAssistantTurn | null;
  }) {
    this.content = data.content;
    this.reasoning = data.reasoning ?? null;
    this.is_complete = data.is_complete ?? false;
    this.usage = data.usage ?? null;
    this.image_urls = data.image_urls ?? [];
    this.audio_urls = data.audio_urls ?? [];
    this.video_urls = data.video_urls ?? [];
    this.tool_calls = data.tool_calls ?? null;
    this.providerNativeAssistantTurn = data.providerNativeAssistantTurn ?? null;
  }
}
