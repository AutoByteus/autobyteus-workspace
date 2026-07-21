import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig, TokenPricingConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import { Message } from '../utils/messages.js';
import type { LLMInvocationOptions } from '../base.js';
import { ChunkResponse, CompleteResponse } from '../utils/response-types.js';
import type { LLMConstructionContext } from '../llm-construction-context.js';

export type GrokReasoningEffort = 'low' | 'medium' | 'high';

const GROK_INVALID_REQUEST_KEYS = [
  'stop',
  'stop_sequences',
  'stopSequences',
  'presence_penalty',
  'presencePenalty',
  'frequency_penalty',
  'frequencyPenalty',
] as const;

const isGrokReasoningEffort = (value: unknown): value is GrokReasoningEffort =>
  value === 'low' || value === 'medium' || value === 'high';

/**
 * Build a fully independent config before applying Grok's request policy.
 * LLMConfig.clone() currently preserves the source extraParams object, so it
 * is intentionally not used at this provider boundary.
 */
export function copyGrokConfig(config: LLMConfig): LLMConfig {
  const pricingConfig = config.pricingConfig instanceof TokenPricingConfig
    ? TokenPricingConfig.fromDict(config.pricingConfig.toDict() as Record<string, unknown>)
    : new TokenPricingConfig();

  return new LLMConfig({
    rateLimit: config.rateLimit,
    tokenLimit: config.tokenLimit,
    systemMessage: config.systemMessage,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    compactionRatio: config.compactionRatio,
    safetyMarginTokens: config.safetyMarginTokens,
    topP: config.topP,
    frequencyPenalty: config.frequencyPenalty,
    presencePenalty: config.presencePenalty,
    stopSequences: config.stopSequences ? [...config.stopSequences] : null,
    extraParams: { ...config.extraParams },
    pricingConfig,
  });
}

export function normalizeGrokRequestConfig(config: LLMConfig): LLMConfig {
  const normalized = copyGrokConfig(config);
  normalized.frequencyPenalty = null;
  normalized.presencePenalty = null;
  normalized.stopSequences = null;

  for (const key of GROK_INVALID_REQUEST_KEYS) {
    delete normalized.extraParams[key];
  }
  delete normalized.extraParams.reasoningEffort;

  const reasoningEffort = normalized.extraParams.reasoning_effort;
  normalized.extraParams.reasoning_effort = isGrokReasoningEffort(reasoningEffort)
    ? reasoningEffort
    : 'high';

  return normalized;
}

export function normalizeGrokInvocationKwargs(
  kwargs: Record<string, unknown>
): Record<string, unknown> {
  const normalized = { ...kwargs };

  for (const key of GROK_INVALID_REQUEST_KEYS) {
    delete normalized[key];
  }
  delete normalized.reasoningEffort;

  if (!isGrokReasoningEffort(normalized.reasoning_effort)) {
    delete normalized.reasoning_effort;
  }

  return normalized;
}

export class GrokLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, context: LLMConstructionContext) {
    super(model, 'https://api.x.ai/v1', context);
  }

  protected override getRequestConfig(_kwargs: Record<string, unknown>): LLMConfig {
    return normalizeGrokRequestConfig(this.config);
  }

  protected override async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): Promise<CompleteResponse> {
    return super._sendMessagesToLLM(messages, normalizeGrokInvocationKwargs(kwargs), options);
  }

  protected override async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield* super._streamMessagesToLLM(messages, normalizeGrokInvocationKwargs(kwargs), options);
  }
}
