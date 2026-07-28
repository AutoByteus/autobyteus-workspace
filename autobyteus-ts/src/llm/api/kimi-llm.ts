import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import { Message, MessageRole } from '../utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../utils/response-types.js';
import type { LLMInvocationOptions } from '../base.js';
import {
  KIMI_K2_7_CODE_ALLOWED_TOOL_CHOICES,
  KIMI_K2_7_CODE_FIXED_CONSTRAINTS,
  isKimiK27CodeModel,
  isKimiK27FixedSamplingKey,
} from './kimi-k2-7-code-policy.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';

const KIMI_K2_6_MODEL = 'kimi-k2.6';
const KIMI_DEFAULT_TEMPERATURE = 1;
const KIMI_TOOL_WORKFLOW_TEMPERATURE = 0.6;

function requestUsesToolWorkflow(messages: Message[], kwargs: Record<string, unknown>): boolean {
  if (Array.isArray(kwargs.tools) && kwargs.tools.length > 0) {
    return true;
  }

  return messages.some((message) => message.role === MessageRole.TOOL || Boolean(message.tool_payload));
}

export class KimiLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, 'https://api.moonshot.ai/v1', config, apiKeyResolver, LLMProvider.KIMI);
  }

  private normalizeKimiKwargs(messages: Message[], kwargs: Record<string, unknown>): Record<string, unknown> {
    if (this.model.value === KIMI_K2_6_MODEL) {
      return this.normalizeK2_6Kwargs(messages, kwargs);
    }

    if (isKimiK27CodeModel(this.model.value)) {
      return this.normalizeK2_7CodeKwargs(kwargs);
    }

    return kwargs;
  }

  private normalizeK2_6Kwargs(messages: Message[], kwargs: Record<string, unknown>): Record<string, unknown> {
    const usesToolWorkflow = requestUsesToolWorkflow(messages, kwargs);
    const normalizedKwargs = { ...kwargs };

    if (normalizedKwargs.temperature === undefined) {
      normalizedKwargs.temperature = usesToolWorkflow ? KIMI_TOOL_WORKFLOW_TEMPERATURE : KIMI_DEFAULT_TEMPERATURE;
    }

    const configThinking = this.config.extraParams?.thinking;
    if (!usesToolWorkflow || normalizedKwargs.thinking !== undefined || configThinking !== undefined) {
      return normalizedKwargs;
    }

    return {
      ...normalizedKwargs,
      thinking: { type: 'disabled' }
    };
  }

  private normalizeK2_7CodeKwargs(kwargs: Record<string, unknown>): Record<string, unknown> {
    const normalizedKwargs = { ...kwargs };

    delete normalizedKwargs.thinking;
    normalizedKwargs.temperature = KIMI_K2_7_CODE_FIXED_CONSTRAINTS.temperature;

    if (this.config.extraParams?.thinking !== undefined || kwargs.thinking !== undefined) {
      normalizedKwargs.thinking = { type: 'enabled' };
    }

    if (this.config.topP !== null || hasK2_7FixedSamplingKey(this.config.extraParams, kwargs, 'top_p')) {
      normalizedKwargs.top_p = KIMI_K2_7_CODE_FIXED_CONSTRAINTS.topP;
    }
    if (hasK2_7FixedSamplingKey(this.config.extraParams, kwargs, 'n')) {
      normalizedKwargs.n = KIMI_K2_7_CODE_FIXED_CONSTRAINTS.resultCount;
    }
    if (
      this.config.presencePenalty !== null ||
      hasK2_7FixedSamplingKey(this.config.extraParams, kwargs, 'presence_penalty')
    ) {
      normalizedKwargs.presence_penalty = KIMI_K2_7_CODE_FIXED_CONSTRAINTS.presencePenalty;
    }
    if (
      this.config.frequencyPenalty !== null ||
      hasK2_7FixedSamplingKey(this.config.extraParams, kwargs, 'frequency_penalty')
    ) {
      normalizedKwargs.frequency_penalty = KIMI_K2_7_CODE_FIXED_CONSTRAINTS.frequencyPenalty;
    }

    if (
      Array.isArray(normalizedKwargs.tools) &&
      normalizedKwargs.tools.length > 0 &&
      isInvalidK2_7ToolChoice(normalizedKwargs.tool_choice ?? this.config.extraParams?.tool_choice)
    ) {
      normalizedKwargs.tool_choice = 'auto';
    }

    return normalizedKwargs;
  }

  protected override async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): Promise<CompleteResponse> {
    return super._sendMessagesToLLM(messages, this.normalizeKimiKwargs(messages, kwargs), options);
  }

  protected override async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield* super._streamMessagesToLLM(messages, this.normalizeKimiKwargs(messages, kwargs), options);
  }
}

function hasK2_7FixedSamplingKey(
  extraParams: Record<string, unknown> | null | undefined,
  kwargs: Record<string, unknown>,
  key: string
): boolean {
  if (!isKimiK27FixedSamplingKey(key)) return false;
  return (
    (extraParams?.[key] !== undefined && extraParams[key] !== null) ||
    (kwargs[key] !== undefined && kwargs[key] !== null)
  );
}

function isInvalidK2_7ToolChoice(value: unknown): boolean {
  return (
    value !== null &&
    value !== undefined &&
    (typeof value !== 'string' || !KIMI_K2_7_CODE_ALLOWED_TOOL_CHOICES.has(value))
  );
}
