import { OpenAI as OpenAIClient } from 'openai';
import { ResponseStreamEvent } from 'openai/resources/responses/responses.mjs';
import { BaseLLM } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { Message } from '../utils/messages.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { TokenUsage } from '../utils/token-usage.js';
import { ToolCallDelta } from '../utils/tool-call-delta.js';
import { OpenAIResponsesRenderer } from '../prompt-renderers/openai-responses-renderer.js';

type ResponseInputItem = Record<string, unknown>;
type ResponseOutputItem = Record<string, unknown>;
type ResponseUsage = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);

export class OpenAIResponsesLLM extends BaseLLM {
  protected client: OpenAIClient;
  protected maxTokens: number | null;
  protected _renderer: OpenAIResponsesRenderer;

  constructor(
    model: LLMModel,
    apiKeyEnvVar: string,
    baseUrl: string,
    llmConfig?: LLMConfig,
    apiKeyDefault?: string
  ) {
    const effectiveConfig = model.defaultConfig ? model.defaultConfig.clone() : new LLMConfig();
    if (llmConfig) {
      effectiveConfig.mergeWith(llmConfig);
    }

    let apiKey = process.env[apiKeyEnvVar];
    if ((!apiKey || apiKey === '') && apiKeyDefault) {
      apiKey = apiKeyDefault;
    }

    if (!apiKey) {
      throw new Error(`Missing API key. Set env var ${apiKeyEnvVar} or provide apiKeyDefault.`);
    }

    super(model, effectiveConfig);

    this.client = new OpenAIClient({ apiKey, baseURL: baseUrl });
    this.maxTokens = effectiveConfig.maxTokens ?? null;
    this._renderer = new OpenAIResponsesRenderer();
  }

  private createTokenUsage(usageData?: ResponseUsage | null): TokenUsage | null {
    if (!usageData) return null;
    return {
      prompt_tokens: asNumber(usageData.input_tokens),
      completion_tokens: asNumber(usageData.output_tokens),
      total_tokens: asNumber(usageData.total_tokens)
    };
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

  protected async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
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

    try {
      const response: any = await this.client.responses.create(params as any);
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
    kwargs: Record<string, unknown>
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

    const toolCallState = new Map<number, { call_id?: string; name?: string; args_seen: boolean; emitted: boolean }>();
    const textDeltaSeen = new Set<string>();
    const summaryDeltaSeen = new Set<string>();

    let accumulatedContent = '';
    let accumulatedReasoning = '';

    try {
      const stream = await this.client.responses.create(params as any) as unknown as AsyncIterable<ResponseStreamEvent>;

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
              emitted: true
            });

            const toolCalls: ToolCallDelta[] = [{
              index: (event as any).output_index,
              call_id: item.call_id,
              name: item.name
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

            let state = toolCallState.get(idx);
            if (!state || !state.emitted) {
              const toolCalls: ToolCallDelta[] = [{
                index: idx,
                call_id: item.call_id,
                name: item.name
              }];
              yield new ChunkResponse({ content: '', reasoning: null, tool_calls: toolCalls });
              toolCallState.set(idx, {
                call_id: item.call_id,
                name: item.name,
                args_seen: false,
                emitted: true
              });
              state = toolCallState.get(idx);
            }

            if (state && !state.args_seen) {
              const toolCalls: ToolCallDelta[] = [{
                index: idx,
                arguments_delta: item.arguments
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
