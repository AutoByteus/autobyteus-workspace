import Anthropic from '@anthropic-ai/sdk';
import { BaseLLM } from '../base.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../utils/response-types.js';
import { TokenUsage } from '../utils/token-usage.js';
import { Message, MessageRole } from '../utils/messages.js';
import { convertAnthropicToolCall } from '../converters/anthropic-tool-call-converter.js';
import { AnthropicPromptRenderer } from '../prompt-renderers/anthropic-prompt-renderer.js';
import type {
  ContentBlock,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageParam,
  RawMessageStreamEvent,
  ToolUnion
} from '@anthropic-ai/sdk/resources/messages/messages.js';

const splitSystemMessages = (messages: Message[]): { systemPrompt: string | null; remaining: Message[] } => {
  const systemParts = messages
    .filter((msg) => msg.role === MessageRole.SYSTEM)
    .map((msg) => msg.content)
    .filter((content): content is string => Boolean(content));
  const systemPrompt = systemParts.length ? systemParts.join('\n') : null;
  const remaining = messages.filter((msg) => msg.role !== MessageRole.SYSTEM);
  return { systemPrompt, remaining };
};

const buildThinkingParam = (extraParams: Record<string, unknown> | null | undefined): Record<string, unknown> | null => {
  if (!extraParams) return null;
  const enabled = extraParams.thinking_enabled;
  if (enabled !== true) return null;
  const budgetRaw = extraParams.thinking_budget_tokens;
  const budget = typeof budgetRaw === 'number' ? budgetRaw : Number(budgetRaw ?? 1024);
  return { type: 'enabled', budget_tokens: Number.isFinite(budget) ? budget : 1024 };
};

const splitClaudeContentBlocks = (blocks: ContentBlock[] | null | undefined): { content: string; thinking: string } => {
  const contentSegments: string[] = [];
  const thinkingSegments: string[] = [];

  for (const block of blocks ?? []) {
    const candidate = block as { type?: string; text?: string; thinking?: string; redacted_thinking?: string };
    if (candidate?.type === 'text' && candidate.text) {
      contentSegments.push(candidate.text);
    } else if (candidate?.type === 'thinking' && candidate.thinking) {
      thinkingSegments.push(candidate.thinking);
    } else if (candidate?.type === 'redacted_thinking' && candidate.redacted_thinking) {
      thinkingSegments.push(candidate.redacted_thinking);
    }
  }

  return { content: contentSegments.join(''), thinking: thinkingSegments.join('') };
};

export class AnthropicLLM extends BaseLLM {
  protected client: Anthropic;
  protected maxTokens: number;
  protected _renderer: AnthropicPromptRenderer;

  constructor(model: LLMModel, llmConfig?: LLMConfig) {
    if (!llmConfig) {
      llmConfig = new LLMConfig();
    }
    
    super(model, llmConfig);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
    }

    this.client = new Anthropic({ apiKey });
    this.maxTokens = llmConfig.maxTokens ?? 8192;
    this._renderer = new AnthropicPromptRenderer();
  }

  protected async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>): Promise<CompleteResponse> {
    const { systemPrompt, remaining } = splitSystemMessages(messages);
    const formattedMessages = await this._renderer.render(remaining) as MessageParam[];
    const thinkingParam = buildThinkingParam(this.config.extraParams ?? null);

    const params: MessageCreateParamsNonStreaming = {
      model: this.model.value,
      max_tokens: this.maxTokens,
      messages: formattedMessages,
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    if (this.config.extraParams) {
       Object.assign(params, this.config.extraParams);
    }
    const paramOverrides = { ...kwargs } as Partial<MessageCreateParamsNonStreaming>;
    delete (paramOverrides as { stream?: unknown }).stream;
    Object.assign(params, paramOverrides);
    if (Array.isArray(kwargs.tools)) {
      params.tools = kwargs.tools as ToolUnion[];
    }

    if (thinkingParam) {
      params.thinking = thinkingParam as any;
    } else if (!params.temperature) {
      params.temperature = 0 as any;
    }

    try {
      const response = await this.client.messages.create(params);
      
      let content = '';
      let reasoning: string | null = null;
      if (response.content) {
        const split = splitClaudeContentBlocks(response.content as ContentBlock[]);
        content = split.content;
        reasoning = split.thinking || null;
      }

      return new CompleteResponse({
        content: content ?? '',
        reasoning,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        }
      });
    } catch (e) {
      throw new Error(`Error in Anthropic API: ${e}`);
    }
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>): AsyncGenerator<ChunkResponse, void, unknown> {
    const { systemPrompt, remaining } = splitSystemMessages(messages);
    const formattedMessages = await this._renderer.render(remaining) as MessageParam[];
    const thinkingParam = buildThinkingParam(this.config.extraParams ?? null);

    const params: MessageCreateParamsStreaming = {
      model: this.model.value,
      max_tokens: this.maxTokens,
      messages: formattedMessages,
      stream: true,
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }
    
    if (Array.isArray(kwargs.tools)) params.tools = kwargs.tools as ToolUnion[];
    if (thinkingParam) {
      params.thinking = thinkingParam as any;
    } else if (!params.temperature) {
      params.temperature = 0 as any;
    }
    if (this.config.extraParams) {
      Object.assign(params, this.config.extraParams);
    }
    const streamOverrides = { ...kwargs } as Partial<MessageCreateParamsStreaming>;
    delete (streamOverrides as { stream?: unknown }).stream;
    Object.assign(params, streamOverrides);

    try {
      const stream = await this.client.messages.create(params);
      
      for await (const event of stream as AsyncIterable<RawMessageStreamEvent>) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield new ChunkResponse({ content: event.delta.text });
        }
        if (event.type === 'content_block_delta' && event.delta.type === 'thinking_delta') {
          const thinkingText = event.delta.thinking ?? '';
          if (thinkingText) {
            yield new ChunkResponse({ content: '', reasoning: thinkingText });
          }
        }
        
        const toolDeltas = convertAnthropicToolCall(event);
        if (toolDeltas) {
           yield new ChunkResponse({ content: "", tool_calls: toolDeltas });
        }
        
        if (event.type === 'message_stop') {
           // Usage not always in stop event? 
           // In SDK stream, usage comes in message_delta maybe?
        }
        
        if (event.type === 'message_delta' && event.usage) {
           yield new ChunkResponse({
             content: "", is_complete: true,
             usage: {
               prompt_tokens: 0, // Not provided in delta usually? Start event has input tokens?
               completion_tokens: event.usage.output_tokens,
               total_tokens: event.usage.output_tokens 
             }
           });
        }
      }
    } catch (e) {
      throw new Error(`Error in Anthropic streaming: ${e}`);
    }
  }
}
