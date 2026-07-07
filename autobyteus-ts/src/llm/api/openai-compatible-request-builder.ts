import type { OpenAI } from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption
} from 'openai/resources/chat/completions.mjs';
import type { LLMConfig } from '../utils/llm-config.js';
import {
  applySafeProviderRequestKwargs,
  hasProviderRequestValue
} from './provider-request-kwargs.js';

export type OpenAICompatibleRequestParams = OpenAI.Chat.ChatCompletionCreateParams;

export interface OpenAICompatibleRequestBuilderInput {
  model: string;
  messages: ChatCompletionMessageParam[];
  config: LLMConfig;
  kwargs?: Record<string, unknown>;
  stream?: boolean;
}

const CONTROLLED_KWARG_KEYS = new Set(['tools', 'tool_choice']);

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
    applySafeProviderRequestKwargs(params, input.config.extraParams);
    applySafeProviderRequestKwargs(params, kwargs, { controlledKeys: CONTROLLED_KWARG_KEYS });
    OpenAICompatibleRequestBuilder.applyToolFields(params, kwargs);

    return params as unknown as OpenAICompatibleRequestParams;
  }

  private static applyConfig(params: Record<string, unknown>, config: LLMConfig): void {
    if (hasProviderRequestValue(config.temperature)) {
      params.temperature = config.temperature;
    }
    if (hasProviderRequestValue(config.topP)) {
      params.top_p = config.topP;
    }
    if (hasProviderRequestValue(config.frequencyPenalty)) {
      params.frequency_penalty = config.frequencyPenalty;
    }
    if (hasProviderRequestValue(config.presencePenalty)) {
      params.presence_penalty = config.presencePenalty;
    }
    if (hasProviderRequestValue(config.stopSequences)) {
      params.stop = config.stopSequences;
    }
    if (hasProviderRequestValue(config.maxTokens)) {
      params.max_completion_tokens = config.maxTokens;
    }
  }

  private static applyToolFields(params: Record<string, unknown>, kwargs: Record<string, unknown>): void {
    const tools = kwargs.tools;
    if (Array.isArray(tools) && tools.length > 0) {
      params.tools = tools as ChatCompletionTool[];
      const toolChoice = kwargs.tool_choice;
      if (hasProviderRequestValue(toolChoice)) {
        params.tool_choice = toolChoice as ChatCompletionToolChoiceOption;
      }
    }
  }
}
