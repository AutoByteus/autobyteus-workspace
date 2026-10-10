import type { LlmTokenUsageObservation } from './llm-token-usage-observation.js';
import { ToolCallDelta } from './tool-call-delta.js';
import type { ProviderNativeAssistantTurn } from '../provider-native/provider-native-assistant-turn.js';
import { completionStatusOf, type LlmCompletionStatus, type LlmResponseFinish } from './llm-response-finish.js';

export class CompleteResponse {
  /** How the response ended; `null` when the provider did not report it. */
  finish: LlmResponseFinish | null;
  content: string;
  reasoning: string | null;
  usage: LlmTokenUsageObservation | null;
  image_urls: string[];
  audio_urls: string[];
  video_urls: string[];
  providerNativeAssistantTurn: ProviderNativeAssistantTurn | null;

  constructor(data: {
    finish?: LlmResponseFinish | null;
    content: string;
    reasoning?: string | null;
    usage?: LlmTokenUsageObservation | null;
    image_urls?: string[];
    audio_urls?: string[];
    video_urls?: string[];
    providerNativeAssistantTurn?: ProviderNativeAssistantTurn | null;
  }) {
    this.finish = data.finish ?? null;
    this.content = data.content;
    this.reasoning = data.reasoning ?? null;
    this.usage = data.usage ?? null;
    this.image_urls = data.image_urls ?? [];
    this.audio_urls = data.audio_urls ?? [];
    this.video_urls = data.video_urls ?? [];
    this.providerNativeAssistantTurn = data.providerNativeAssistantTurn ?? null;
  }

  /** Read-only projection of `finish` for the compaction report contract. */
  get completionStatus(): LlmCompletionStatus {
    return completionStatusOf(this.finish);
  }

  /** The provider's raw stop string, for the compaction report contract. */
  get completionReason(): string | null {
    return this.finish?.providerReason ?? null;
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
  providerNativeAssistantTurn: ProviderNativeAssistantTurn | null;
  /** Set only on the stream's single terminal chunk (`is_complete`); `null` = unreported. */
  finish: LlmResponseFinish | null;

  constructor(data: {
    content: string;
    reasoning?: string | null;
    is_complete?: boolean;
    usage?: LlmTokenUsageObservation | null;
    image_urls?: string[];
    audio_urls?: string[];
    video_urls?: string[];
    tool_calls?: ToolCallDelta[] | null;
    providerNativeAssistantTurn?: ProviderNativeAssistantTurn | null;
    finish?: LlmResponseFinish | null;
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
    this.finish = data.finish ?? null;
  }
}
