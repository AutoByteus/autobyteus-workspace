import type { ClientOptions as OpenAIClientOptions, OpenAI } from 'openai';
import { BaseLLM, type LLMInvocationOptions } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import {
  buildFinish,
  mapProviderFinish,
  withToolCallsFinish,
  type LlmFinishTable,
  type LlmResponseFinish,
} from '../utils/llm-response-finish.js';
import { Message } from '../utils/messages.js';
import { convertOpenAIToolCalls } from '../converters/openai-tool-call-converter.js';
import { OpenAIChatRenderer } from '../prompt-renderers/openai-chat-renderer.js';
import {
  OpenAICompatibleRequestBuilder,
  type OpenAICompatibleOutputLimitParameter,
} from './openai-compatible-request-builder.js';
import { createOpenAICompatibleTokenUsageObservation } from './openai-compatible-token-usage-normalizer.js';
import type { LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';

// We need to inject the OpenAI client implementation or factory.
// Python implementation constructs `OpenAI` client inside. 
// We should use the official `openai` Node SDK.
import { OpenAI as OpenAIClient } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { ChatCompletionChunk } from 'openai/resources/chat/completions.mjs';

/** OpenAI Chat Completions `finish_reason` → normalized finish. */
export const OPENAI_CHAT_FINISH_TABLE: LlmFinishTable = {
  stop: 'stop',
  tool_calls: 'tool_calls',
  function_call: 'tool_calls',
  length: 'output_limit',
  content_filter: 'content_filter',
};

export class OpenAICompatibleLLM extends BaseLLM {
  private clientPromise: Promise<OpenAIClient> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  private readonly apiKeyProviderId: string;
  private readonly baseUrl: string;
  private readonly clientOptions?: Pick<OpenAIClientOptions, 'fetch' | 'fetchOptions' | 'timeout'>;
  private readonly allowUnauthenticated: boolean;
  protected _renderer: OpenAIChatRenderer;
  /** OpenAI's current name; providers that document only `max_tokens` override it. */
  protected readonly outputLimitParameter: OpenAICompatibleOutputLimitParameter = 'max_completion_tokens';
  /** Providers that document extra `finish_reason` values extend this table. */
  protected readonly finishTable: LlmFinishTable = OPENAI_CHAT_FINISH_TABLE;

  constructor(
    model: LLMModel,
    baseUrl: string,
    config: LLMConfig,
    apiKeyResolver: ProviderApiKeyResolver,
    apiKeyProviderId: string,
    clientOptions?: Pick<OpenAIClientOptions, 'fetch' | 'fetchOptions' | 'timeout'>,
    allowUnauthenticated = false,
  ) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
    this.apiKeyProviderId = apiKeyProviderId;
    this.baseUrl = baseUrl;
    this.clientOptions = clientOptions;
    this.allowUnauthenticated = allowUnauthenticated;
    this._renderer = new OpenAIChatRenderer();
  }

  private async initializeClient(
  ): Promise<OpenAIClient> {
    let apiKey = 'not-required';
    if (this.allowUnauthenticated) {
      try {
        const secret = await this.apiKeyResolver.resolve(this.apiKeyProviderId);
        apiKey = secret.revealToTrustedConsumer();
      } catch {
        // This provider explicitly supports unauthenticated local endpoints.
      }
    } else {
      const secret = await this.apiKeyResolver.resolve(this.apiKeyProviderId);
      apiKey = secret.revealToTrustedConsumer();
    }
    return new OpenAIClient({ apiKey, baseURL: this.baseUrl, ...(this.clientOptions ?? {}) });
  }

  protected getClient(): Promise<OpenAIClient> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private createTokenUsage(usageData?: OpenAIClient.CompletionUsage): LlmTokenUsageObservation | null {
    return createOpenAICompatibleTokenUsageObservation(usageData, this.model);
  }

  private extractReasoningText(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      const parts = value
        .map((item) => this.extractReasoningText(item))
        .filter((item): item is string => Boolean(item));
      return parts.length ? parts.join('') : null;
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const candidates: unknown[] = [
        record.reasoning_content,
        record.reasoning,
        record.text,
        record.content,
        record.summary
      ];

      for (const candidate of candidates) {
        const extracted = this.extractReasoningText(candidate);
        if (extracted) {
          return extracted;
        }
      }
    }

    return null;
  }

  private nonStreamingFinish(finishReason: unknown, message: Record<string, unknown>): LlmResponseFinish | null {
    if (message.refusal) return buildFinish('content_filter', finishReason);
    const calledTools = Boolean((message.tool_calls as unknown[] | undefined)?.length || message.function_call);
    return withToolCallsFinish(mapProviderFinish(this.finishTable, finishReason), calledTools);
  }

  protected getRequestConfig(_kwargs: Record<string, unknown>): LLMConfig {
    return this.config;
  }

  private extractReasoningFromRecord(record: unknown): string | null {
    if (!record || typeof record !== 'object') {
      return null;
    }

    const candidateRecord = record as Record<string, unknown>;
    return (
      this.extractReasoningText(candidateRecord.reasoning_content) ??
      this.extractReasoningText(candidateRecord.reasoning)
    );
  }

  protected async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): Promise<CompleteResponse> {
    const formattedMessages = await this._renderer.render(messages) as ChatCompletionMessageParam[];
    const params = OpenAICompatibleRequestBuilder.build({
      model: this.model.value,
      messages: formattedMessages,
      config: this.getRequestConfig(kwargs),
      maxOutputTokens: this.resolveMaxOutputTokens(),
      outputLimitParameter: this.outputLimitParameter,
      kwargs
    });

    try {
      const requestOptions = { ...(options.signal ? { signal: options.signal } : {}),
        ...(options.retryMode === 'single_attempt' ? { maxRetries: 0 } : {}) };
      const client = await this.getClient();
      const response = await client.chat.completions.create(params as any, requestOptions as any); // Cast for extra params flexibility
      const choice = response.choices[0];
      const message = choice.message;
      
      const content = message.content || "";
      const reasoning = this.extractReasoningFromRecord(message);
      return new CompleteResponse({
        finish: this.nonStreamingFinish(choice.finish_reason, message as unknown as Record<string, unknown>),
        content,
        reasoning,
        usage: this.createTokenUsage(response.usage),
      });
    } catch (e) {
      throw e;
    }
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): AsyncGenerator<ChunkResponse, void, unknown> {
    const formattedMessages = await this._renderer.render(messages) as ChatCompletionMessageParam[];
    const params = OpenAICompatibleRequestBuilder.build({
      model: this.model.value,
      messages: formattedMessages,
      stream: true,
      config: this.getRequestConfig(kwargs),
      maxOutputTokens: this.resolveMaxOutputTokens(),
      outputLimitParameter: this.outputLimitParameter,
      kwargs
    });

    try {
      const requestOptions = { ...(options.signal ? { signal: options.signal } : {}),
        ...(options.retryMode === 'single_attempt' ? { maxRetries: 0 } : {}) };
      const client = await this.getClient();
      const stream = await client.chat.completions.create(params, requestOptions as any) as unknown as AsyncIterable<ChatCompletionChunk>;
      
      let finishReason: string | null = null;
      let emittedToolCalls = false;
      let usage: LlmTokenUsageObservation | null = null;
      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
          const choice = chunk.choices[0];
          const delta = choice.delta;
          // Some providers repeat or follow the reason with usage-only chunks; keep the last one.
          if (choice.finish_reason) finishReason = choice.finish_reason;

          const reasoning = this.extractReasoningFromRecord(delta);
          if (reasoning) {
            yield new ChunkResponse({ content: "", reasoning });
          }

          if (delta?.content) {
            yield new ChunkResponse({ content: delta.content });
          }

          if (delta?.tool_calls) {
            const toolDeltas = convertOpenAIToolCalls(delta.tool_calls as any);
            if (toolDeltas) {
              emittedToolCalls = true;
              yield new ChunkResponse({ content: "", tool_calls: toolDeltas });
            }
          }
        }

        if (chunk.usage) {
          usage = this.createTokenUsage(chunk.usage);
        }
      }

      yield new ChunkResponse({
        content: "",
        is_complete: true,
        usage,
        finish: withToolCallsFinish(mapProviderFinish(this.finishTable, finishReason), emittedToolCalls),
      });
    } catch (e) {
      throw e;
    }
  }
}
