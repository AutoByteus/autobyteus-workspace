import type { ClientOptions as OpenAIClientOptions, OpenAI } from 'openai';
import { BaseLLM, type LLMInvocationOptions } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import {
  requireApiKeyAuthentication,
  type LLMConstructionContext,
} from '../llm-construction-context.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { Message } from '../utils/messages.js';
import { convertOpenAIToolCalls } from '../converters/openai-tool-call-converter.js';
import { OpenAIChatRenderer } from '../prompt-renderers/openai-chat-renderer.js';
import { OpenAICompatibleRequestBuilder } from './openai-compatible-request-builder.js';
import { createOpenAICompatibleTokenUsageObservation } from './openai-compatible-token-usage-normalizer.js';
import type { LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';

// We need to inject the OpenAI client implementation or factory.
// Python implementation constructs `OpenAI` client inside. 
// We should use the official `openai` Node SDK.
import { OpenAI as OpenAIClient } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { ChatCompletionChunk } from 'openai/resources/chat/completions.mjs';

export class OpenAICompatibleLLM extends BaseLLM {
  protected client: OpenAIClient;
  protected _renderer: OpenAIChatRenderer;

  constructor(
    model: LLMModel,
    baseUrl: string,
    context: LLMConstructionContext,
    clientOptions?: Pick<OpenAIClientOptions, 'fetch' | 'fetchOptions' | 'timeout'>,
    allowUnauthenticated = false,
  ) {
    super(model, context.config);
    const apiKey = context.authentication.kind === 'none' && allowUnauthenticated
      ? 'not-required'
      : requireApiKeyAuthentication(context.authentication, model.providerName);

    this.client = new OpenAIClient({
      apiKey,
      baseURL: baseUrl,
      ...(clientOptions ?? {})
    });
    this._renderer = new OpenAIChatRenderer();
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
      kwargs
    });

    try {
      const requestOptions = options.signal ? { signal: options.signal } : undefined;
      const response = await this.client.chat.completions.create(params as any, requestOptions as any); // Cast for extra params flexibility
      const choice = response.choices[0];
      const message = choice.message;
      
      const content = message.content || "";
      const reasoning = this.extractReasoningFromRecord(message);
      return new CompleteResponse({
        content,
        reasoning,
        usage: this.createTokenUsage(response.usage),
      });
    } catch (e) {
      throw new Error(`Error in API request: ${e}`);
    }
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): AsyncGenerator<ChunkResponse, void, unknown> {
    const formattedMessages = await this._renderer.render(messages) as ChatCompletionMessageParam[];
    const params = OpenAICompatibleRequestBuilder.build({
      model: this.model.value,
      messages: formattedMessages,
      stream: true,
      config: this.getRequestConfig(kwargs),
      kwargs
    });

    try {
      const requestOptions = options.signal ? { signal: options.signal } : undefined;
      const stream = await this.client.chat.completions.create(params, requestOptions as any) as unknown as AsyncIterable<ChatCompletionChunk>;
      
      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
           const delta = chunk.choices[0].delta;

           const reasoning = this.extractReasoningFromRecord(delta);
           if (reasoning) {
             yield new ChunkResponse({ content: "", reasoning });
           }
           
           // Handle content
           if (delta.content) {
             yield new ChunkResponse({ content: delta.content });
           }

           // Handle tool calls
           if (delta.tool_calls) {
             const toolDeltas = convertOpenAIToolCalls(delta.tool_calls as any);
             if (toolDeltas) {
               yield new ChunkResponse({ content: "", tool_calls: toolDeltas });
             }
           }
        }

        if (chunk.usage) {
           yield new ChunkResponse({ 
             content: "", is_complete: true, usage: this.createTokenUsage(chunk.usage) 
           });
        }
      }

    } catch (e) {
      throw new Error(`Error in API streaming: ${e}`);
    }
  }
}
