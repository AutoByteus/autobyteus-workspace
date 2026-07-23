import { Mistral } from '@mistralai/mistralai';
import { BaseLLM, type LLMInvocationOptions } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { createOpenAICompatibleTokenUsageObservation } from './openai-compatible-token-usage-normalizer.js';
import type { LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';
import { Message } from '../utils/messages.js';
import { convertMistralToolCalls } from '../converters/mistral-tool-call-converter.js';
import { LLMProvider } from '../providers.js';
import { BasePromptRenderer } from '../prompt-renderers/base-prompt-renderer.js';
import { createMistralPromptRendererForToolFormat } from '../prompt-renderers/provider-tool-history-renderer-selection.js';
import { applySafeProviderRequestKwargs } from './provider-request-kwargs.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';

const MISTRAL_CONTROLLED_KWARG_KEYS = new Set(['stream']);

export class MistralLLM extends BaseLLM {
  private clientPromise: Promise<Mistral> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  protected maxTokens: number | null;
  protected _renderer: BasePromptRenderer;

  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
    this.maxTokens = config.maxTokens ?? null;
    this._renderer = createMistralPromptRendererForToolFormat();
  }

  private getClient(): Promise<Mistral> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private async initializeClient(): Promise<Mistral> {
    const secret = await this.apiKeyResolver.resolve(LLMProvider.MISTRAL);
    return new Mistral({ apiKey: secret.revealToTrustedConsumer() });
  }

  private toTokenUsage(usage: unknown): LlmTokenUsageObservation | null {
    return createOpenAICompatibleTokenUsageObservation(usage, this.model);
  }

  protected async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): Promise<CompleteResponse> {
    const formattedMessages = await this._renderer.render(messages);

    const params: any = {
      model: this.model.value,
      messages: formattedMessages,
      temperature: this.config.temperature,
      topP: this.config.topP ?? undefined,
      maxTokens: this.maxTokens ?? undefined,
    };
    applySafeProviderRequestKwargs(params, kwargs, { controlledKeys: MISTRAL_CONTROLLED_KWARG_KEYS });

    if (this.config.extraParams) {
      applySafeProviderRequestKwargs(params, this.config.extraParams, { controlledKeys: MISTRAL_CONTROLLED_KWARG_KEYS });
    }

    try {
      const client = await this.getClient();
      const response = await client.chat.complete(params, options.signal ? { signal: options.signal } as any : undefined);
      const message = response.choices?.[0]?.message;
      let content = '';
      if (typeof message?.content === 'string') {
        content = message.content;
      } else if (Array.isArray(message?.content)) {
        content = message.content
          .filter((part: any) => part?.type === 'text')
          .map((part: any) => part?.text ?? '')
          .join('');
      }

      return new CompleteResponse({
        content,
        usage: this.toTokenUsage(response.usage)
      });
    } catch (error) {
      throw new Error(`Error in Mistral API: ${error}`);
    }
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options: LLMInvocationOptions = {}): AsyncGenerator<ChunkResponse, void, unknown> {
    const formattedMessages = await this._renderer.render(messages);
    const params: any = {
      model: this.model.value,
      messages: formattedMessages,
      temperature: this.config.temperature,
      topP: this.config.topP ?? undefined,
      maxTokens: this.maxTokens ?? undefined,
      stream: true,
    };
    applySafeProviderRequestKwargs(params, kwargs, { controlledKeys: MISTRAL_CONTROLLED_KWARG_KEYS });

    if (this.config.extraParams) {
      applySafeProviderRequestKwargs(params, this.config.extraParams, { controlledKeys: MISTRAL_CONTROLLED_KWARG_KEYS });
    }

    try {
      const client = await this.getClient();
      const stream = await client.chat.stream(params, options.signal ? { signal: options.signal } as any : undefined);
      for await (const event of stream) {
        const chunk = event.data;
        const choice = chunk?.choices?.[0];
        const delta = choice?.delta;

        if (delta?.content) {
          const text = typeof delta.content === 'string'
            ? delta.content
            : (delta.content ?? [])
                .filter((part: any) => part?.type === 'text')
                .map((part: any) => part?.text ?? '')
                .join('');
          if (text) {
            yield new ChunkResponse({ content: text });
          }
        }

        if (delta?.toolCalls) {
          const toolCalls = Array.isArray(delta.toolCalls) ? delta.toolCalls : null;
          const toolDeltas = convertMistralToolCalls(toolCalls);
          if (toolDeltas) {
            yield new ChunkResponse({ content: '', tool_calls: toolDeltas });
          }
        }

        if (chunk?.usage) {
          yield new ChunkResponse({
            content: '',
            is_complete: true,
            usage: this.toTokenUsage(chunk.usage)
          });
        }
      }

    } catch (error) {
      throw new Error(`Error in Mistral streaming: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
  }
}
