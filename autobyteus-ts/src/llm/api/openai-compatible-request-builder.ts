import type { OpenAI } from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption
} from 'openai/resources/chat/completions.mjs';
import type { LLMConfig } from '../utils/llm-config.js';

export type OpenAICompatibleRequestParams = OpenAI.Chat.ChatCompletionCreateParams;

export interface OpenAICompatibleRequestBuilderInput {
  model: string;
  messages: ChatCompletionMessageParam[];
  config: LLMConfig;
  kwargs?: Record<string, unknown>;
  stream?: boolean;
}

const INTERNAL_KWARG_KEYS = new Set([
  'logicalConversationId',
  'logical_conversation_id',
  'conversationId',
  'agentId',
  'turnId',
  'requestId',
  'renderedPayload'
]);

const CONTROLLED_KWARG_KEYS = new Set(['tools', 'tool_choice']);

function clonePlainRecord(value: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return { ...value };
}

function hasValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export class OpenAICompatibleRequestBuilder {
  static build(input: OpenAICompatibleRequestBuilderInput): OpenAICompatibleRequestParams {
    const kwargs = input.kwargs ?? {};
    const params: Record<string, unknown> = {
      model: input.model,
      messages: input.messages
    };

    if (input.stream) {
      params.stream = true;
      params.stream_options = { include_usage: true };
    }

    OpenAICompatibleRequestBuilder.applyConfig(params, input.config);
    Object.assign(params, clonePlainRecord(input.config.extraParams));
    OpenAICompatibleRequestBuilder.applySafeKwargs(params, kwargs);
    OpenAICompatibleRequestBuilder.applyToolFields(params, kwargs);

    return params as unknown as OpenAICompatibleRequestParams;
  }

  private static applyConfig(params: Record<string, unknown>, config: LLMConfig): void {
    if (hasValue(config.temperature)) {
      params.temperature = config.temperature;
    }
    if (hasValue(config.topP)) {
      params.top_p = config.topP;
    }
    if (hasValue(config.frequencyPenalty)) {
      params.frequency_penalty = config.frequencyPenalty;
    }
    if (hasValue(config.presencePenalty)) {
      params.presence_penalty = config.presencePenalty;
    }
    if (hasValue(config.stopSequences)) {
      params.stop = config.stopSequences;
    }
    if (hasValue(config.maxTokens)) {
      params.max_completion_tokens = config.maxTokens;
    }
  }

  private static applySafeKwargs(params: Record<string, unknown>, kwargs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(kwargs)) {
      if (!hasValue(value)) {
        continue;
      }
      if (INTERNAL_KWARG_KEYS.has(key) || CONTROLLED_KWARG_KEYS.has(key)) {
        continue;
      }
      params[key] = value;
    }
  }

  private static applyToolFields(params: Record<string, unknown>, kwargs: Record<string, unknown>): void {
    const tools = kwargs.tools;
    if (Array.isArray(tools) && tools.length > 0) {
      params.tools = tools as ChatCompletionTool[];
      const toolChoice = kwargs.tool_choice;
      if (hasValue(toolChoice)) {
        params.tool_choice = toolChoice as ChatCompletionToolChoiceOption;
      }
    }
  }
}
