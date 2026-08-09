import { OpenAI as OpenAIClient } from 'openai';
import { ResponseStreamEvent } from 'openai/resources/responses/responses.mjs';
import { BaseLLM, type LLMInvocationOptions } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { Message } from '../utils/messages.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { ToolCallDelta } from '../utils/tool-call-delta.js';
import { BasePromptRenderer } from '../prompt-renderers/base-prompt-renderer.js';
import { OpenAIResponsesRenderer } from '../prompt-renderers/openai-responses-renderer.js';
import { createOpenAICompatibleTokenUsageObservation } from './openai-compatible-token-usage-normalizer.js';
import type { LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';

type ResponseInputItem = Record<string, unknown>;
type ResponseOutputItem = Record<string, unknown>;
type ResponseUsage = Record<string, unknown>;

const REASONING_ENCRYPTED_CONTENT_INCLUDE = 'reasoning.encrypted_content';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);


export class OpenAIResponsesLLM extends BaseLLM {
  private clientPromise: Promise<OpenAIClient> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  private readonly apiKeyProviderId: string;
  private readonly baseUrl: string;
  protected maxTokens: number | null;
  protected _renderer: BasePromptRenderer;

  constructor(
    model: LLMModel,
    baseUrl: string,
    config: LLMConfig,
    apiKeyResolver: ProviderApiKeyResolver,
    apiKeyProviderId: string,
  ) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
    this.apiKeyProviderId = apiKeyProviderId;
    this.baseUrl = baseUrl;
    this.maxTokens = config.maxTokens ?? null;
    this._renderer = new OpenAIResponsesRenderer();
  }

  private getClient(): Promise<OpenAIClient> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private async initializeClient(): Promise<OpenAIClient> {
    const secret = await this.apiKeyResolver.resolve(this.apiKeyProviderId);
    return new OpenAIClient({
      apiKey: secret.revealToTrustedConsumer(),
      baseURL: this.baseUrl,
    });
  }

  private createTokenUsage(usageData?: ResponseUsage | null): LlmTokenUsageObservation | null {
    return createOpenAICompatibleTokenUsageObservation(usageData, this.model);
  }

  private extractOutputContent(outputItems: ResponseOutputItem[]): { content: string; reasoning: string | null } {
    const contentChunks: string[] = [];
    const reasoningChunks: string[] = [];

    for (const item of outputItems ?? []) {
      const itemType = (item as ResponseOutputItem | undefined)?.type;
      if (itemType === 'message') {
        for (const part of asArray((item as ResponseOutputItem | undefined)?.content)) {
          if (isRecord(part) && part.type === 'output_text') {
            contentChunks.push(typeof part.text === 'string' ? part.text : '');
          }
        }
      } else if (itemType === 'reasoning') {
        for (const summary of asArray((item as ResponseOutputItem | undefined)?.summary)) {
          if (isRecord(summary) && summary.type === 'summary_text') {
            reasoningChunks.push(typeof summary.text === 'string' ? summary.text : '');
          }
        }
      }
    }

    const content = contentChunks.join('');
    const reasoning = reasoningChunks.length ? reasoningChunks.join('') : null;
    return { content, reasoning };
  }

  private buildReasoningParam(): Record<string, unknown> | null {
    if (!this.config.extraParams) return null;
    const reasoningEffort = this.config.extraParams.reasoning_effort;
    const reasoningSummary = this.config.extraParams.reasoning_summary;

    const reasoning: Record<string, unknown> = {};
    if (reasoningEffort) {
      reasoning.effort = reasoningEffort;
    }
    if (reasoningSummary && reasoningSummary !== 'none') {
      reasoning.summary = reasoningSummary;
    }

    return Object.keys(reasoning).length ? reasoning : null;
  }

  private filterExtraParams(): Record<string, unknown> {
    if (!this.config.extraParams) return {};
    const filtered = { ...this.config.extraParams };
    delete filtered.reasoning_effort;
    delete filtered.reasoning_summary;
    return filtered;
  }

  private normalizeTools(tools: Record<string, unknown>[]): Record<string, unknown>[] {
    return tools.map((tool) => {
      if (tool?.type === 'function' && isRecord(tool.function)) {
        const fn = tool.function as Record<string, unknown>;
        return {
          type: 'function',
          name: typeof fn.name === 'string' ? fn.name : undefined,
          description: typeof fn.description === 'string' ? fn.description : undefined,
          parameters: fn.parameters
        };
      }
      return tool;
    });
  }

  private shouldRequestEncryptedReasoning(
    formattedMessages: ResponseInputItem[],
    kwargs: Record<string, unknown>
  ): boolean {
    if (Array.isArray(kwargs.tools) && kwargs.tools.length > 0) {
      return true;
    }

    return formattedMessages.some((item) =>
      item.type === 'function_call' ||
      item.type === 'function_call_output' ||
      item.type === 'reasoning'
    );
  }

  private ensureReasoningEncryptedContentInclude(params: Record<string, unknown>): void {
    const existingInclude = params.include;
    const include = Array.isArray(existingInclude)
      ? [...existingInclude]
      : typeof existingInclude === 'string'
        ? [existingInclude]
        : [];

    if (!include.includes(REASONING_ENCRYPTED_CONTENT_INCLUDE)) {
      include.push(REASONING_ENCRYPTED_CONTENT_INCLUDE);
    }

    params.include = include;
  }

  protected async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): Promise<CompleteResponse> {
    const formattedMessages = await this._renderer.render(messages);
    const params: Record<string, unknown> = {
      model: this.model.value,
      input: formattedMessages
    };

    if (this.maxTokens !== null) {
      params.max_output_tokens = this.maxTokens;
    }

    const reasoningParam = this.buildReasoningParam();
    if (reasoningParam) {
      params.reasoning = reasoningParam;
    }

    const extraParams = this.filterExtraParams();
    if (Object.keys(extraParams).length) {
      Object.assign(params, extraParams);
    }

    if (Array.isArray(kwargs.tools)) {
      params.tools = this.normalizeTools(kwargs.tools as Record<string, unknown>[]);
    }
    if (kwargs.tool_choice !== undefined) {
      params.tool_choice = kwargs.tool_choice;
    }
    if (this.shouldRequestEncryptedReasoning(formattedMessages, kwargs)) {
      this.ensureReasoningEncryptedContentInclude(params);
    }

    try {
      const requestOptions = options.signal ? { signal: options.signal } : undefined;
      const client = await this.getClient();
      const response: any = await client.responses.create(params as any, requestOptions as any);
      const { content, reasoning } = this.extractOutputContent(response.output ?? []);

      return new CompleteResponse({
        content,
        reasoning: reasoning ?? null,
        usage: this.createTokenUsage(response.usage)
      });
    } catch (error: any) {
      throw new Error(`Error in OPENAI Responses API request: ${error?.message ?? error}`);
    }
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const formattedMessages = await this._renderer.render(messages);
    const params: Record<string, unknown> = {
      model: this.model.value,
      input: formattedMessages,
      stream: true
    };

    if (this.maxTokens !== null) {
      params.max_output_tokens = this.maxTokens;
    }

    const reasoningParam = this.buildReasoningParam();
    if (reasoningParam) {
      params.reasoning = reasoningParam;
    }

    const extraParams = this.filterExtraParams();
    if (Object.keys(extraParams).length) {
      Object.assign(params, extraParams);
    }

    if (Array.isArray(kwargs.tools)) {
      params.tools = this.normalizeTools(kwargs.tools as Record<string, unknown>[]);
    }
    if (kwargs.tool_choice !== undefined) {
      params.tool_choice = kwargs.tool_choice;
    }
    if (this.shouldRequestEncryptedReasoning(formattedMessages, kwargs)) {
      this.ensureReasoningEncryptedContentInclude(params);
    }

    const toolCallState = new Map<
      number,
      {
        call_id?: string;
        name?: string;
        args_seen: boolean;
        emitted: boolean;
        functionCallItem?: Record<string, unknown>;
      }
    >();
    const textDeltaSeen = new Set<string>();
    const summaryDeltaSeen = new Set<string>();

    let accumulatedContent = '';
    let accumulatedReasoning = '';

    try {
      const requestOptions = options.signal ? { signal: options.signal } : undefined;
      const client = await this.getClient();
      const stream = await client.responses.create(params as any, requestOptions as any) as unknown as AsyncIterable<ResponseStreamEvent>;

      for await (const event of stream) {
        const eventType = (event as any)?.type;

        if (eventType === 'response.output_text.delta') {
          textDeltaSeen.add((event as any).item_id);
          accumulatedContent += (event as any).delta ?? '';
          yield new ChunkResponse({ content: (event as any).delta ?? '', reasoning: null });
          continue;
        }

        if (eventType === 'response.output_text.done') {
          if (!textDeltaSeen.has((event as any).item_id)) {
            accumulatedContent += (event as any).text ?? '';
            yield new ChunkResponse({ content: (event as any).text ?? '', reasoning: null });
          }
          continue;
        }

        if (eventType === 'response.reasoning_summary_text.delta') {
          summaryDeltaSeen.add((event as any).item_id);
          accumulatedReasoning += (event as any).delta ?? '';
          yield new ChunkResponse({ content: '', reasoning: (event as any).delta ?? '' });
          continue;
        }

        if (eventType === 'response.reasoning_summary_text.done') {
          if (!summaryDeltaSeen.has((event as any).item_id)) {
            accumulatedReasoning += (event as any).text ?? '';
            yield new ChunkResponse({ content: '', reasoning: (event as any).text ?? '' });
          }
          continue;
        }

        if (eventType === 'response.output_item.added') {
          const item = (event as any).item;
          if (item?.type === 'function_call') {
            toolCallState.set((event as any).output_index, {
              call_id: item.call_id,
              name: item.name,
              args_seen: false,
              emitted: true,
              functionCallItem: item as Record<string, unknown>
            });

            const toolCalls: ToolCallDelta[] = [{
              index: (event as any).output_index,
              call_id: item.call_id,
              name: item.name,
              native_context: {
                provider: 'openai_responses',
                functionCallItem: item as Record<string, unknown>
              }
            }];
            yield new ChunkResponse({ content: '', reasoning: null, tool_calls: toolCalls });
          }
          continue;
        }

        if (eventType === 'response.function_call_arguments.delta') {
          const state = toolCallState.get((event as any).output_index);
          if (state) {
            state.args_seen = true;
            const toolCalls: ToolCallDelta[] = [{
              index: (event as any).output_index,
              arguments_delta: (event as any).delta
            }];
            yield new ChunkResponse({ content: '', reasoning: null, tool_calls: toolCalls });
          }
          continue;
        }

        if (eventType === 'response.function_call_arguments.done') {
          const state = toolCallState.get((event as any).output_index);
          if (state && !state.args_seen) {
            const toolCalls: ToolCallDelta[] = [{
              index: (event as any).output_index,
              arguments_delta: (event as any).arguments
            }];
            yield new ChunkResponse({ content: '', reasoning: null, tool_calls: toolCalls });
            state.args_seen = true;
          }
          continue;
        }

        if (eventType === 'response.completed') {
          const response = (event as any).response;
          const outputItems = response?.output ?? [];

          for (let idx = 0; idx < outputItems.length; idx += 1) {
            const item = outputItems[idx];
            if (item?.type !== 'function_call') continue;

            const nativeContext = {
              provider: 'openai_responses' as const,
              functionCallItem: item as Record<string, unknown>,
              responseOutputItems: outputItems as Record<string, unknown>[]
            };
            let state = toolCallState.get(idx);
            if (!state || !state.emitted) {
              const toolCalls: ToolCallDelta[] = [{
                index: idx,
                call_id: item.call_id,
                name: item.name,
                native_context: nativeContext
              }];
              yield new ChunkResponse({ content: '', reasoning: null, tool_calls: toolCalls });
              toolCallState.set(idx, {
                call_id: item.call_id,
                name: item.name,
                args_seen: false,
                emitted: true,
                functionCallItem: item as Record<string, unknown>
              });
              state = toolCallState.get(idx);
            } else {
              state.functionCallItem = item as Record<string, unknown>;
              const toolCalls: ToolCallDelta[] = [{
                index: idx,
                call_id: item.call_id,
                name: item.name,
                native_context: nativeContext
              }];
              yield new ChunkResponse({ content: '', reasoning: null, tool_calls: toolCalls });
            }

            if (state && !state.args_seen) {
              const toolCalls: ToolCallDelta[] = [{
                index: idx,
                arguments_delta: item.arguments,
                native_context: nativeContext
              }];
              yield new ChunkResponse({ content: '', reasoning: null, tool_calls: toolCalls });
              state.args_seen = true;
            }
          }

          const tokenUsage = this.createTokenUsage(response?.usage ?? null);
          yield new ChunkResponse({ content: '', reasoning: null, is_complete: true, usage: tokenUsage });
          continue;
        }
      }

    } catch (error: any) {
      throw new Error(`Error in OPENAI Responses API streaming: ${error?.message ?? error}`);
    }
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
  }
}
