import { Mistral } from '@mistralai/mistralai';
import { BaseLLM } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { TokenUsage } from '../utils/token-usage.js';
import { Message } from '../utils/messages.js';
import { convertMistralToolCalls } from '../converters/mistral-tool-call-converter.js';
import { LLMProvider } from '../providers.js';
import { MistralPromptRenderer } from '../prompt-renderers/mistral-prompt-renderer.js';

export class MistralLLM extends BaseLLM {
  protected client: Mistral;
  protected maxTokens: number | null;
  protected _renderer: MistralPromptRenderer;

  constructor(model?: LLMModel, llmConfig?: LLMConfig) {
    const effectiveModel =
      model ??
      new LLMModel({
        name: 'mistral-large',
        value: 'mistral-large-latest',
        canonicalName: 'mistral-large',
        provider: LLMProvider.MISTRAL
      });

    const config = llmConfig ?? new LLMConfig();
    super(effectiveModel, config);

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is not set.');
    }

    this.client = new Mistral({ apiKey });
    this.maxTokens = config.maxTokens ?? null;
    this._renderer = new MistralPromptRenderer();
  }

  private toTokenUsage(usage: any): TokenUsage | null {
    if (!usage) return null;
    return {
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0
    };
  }

  protected async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>): Promise<CompleteResponse> {
    const formattedMessages = await this._renderer.render(messages);

    const params: any = {
      model: this.model.value,
      messages: formattedMessages,
      temperature: this.config.temperature,
      topP: this.config.topP ?? undefined,
      maxTokens: this.maxTokens ?? undefined,
      ...kwargs
    };

    if (this.config.extraParams) {
      Object.assign(params, this.config.extraParams);
    }

    try {
      const response = await this.client.chat.complete(params);
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

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>): AsyncGenerator<ChunkResponse, void, unknown> {
    const formattedMessages = await this._renderer.render(messages);
    const params: any = {
      model: this.model.value,
      messages: formattedMessages,
      temperature: this.config.temperature,
      topP: this.config.topP ?? undefined,
      maxTokens: this.maxTokens ?? undefined,
      stream: true,
      ...kwargs
    };

    if (this.config.extraParams) {
      Object.assign(params, this.config.extraParams);
    }

    try {
      const stream = await this.client.chat.stream(params);
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
