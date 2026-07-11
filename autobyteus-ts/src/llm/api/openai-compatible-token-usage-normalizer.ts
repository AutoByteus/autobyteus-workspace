import type { LLMModel } from '../models.js';
import { LLMProvider } from '../providers.js';
import { buildLlmTokenUsageObservation, type CacheState, type LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const numberField = (record: Record<string, unknown> | null, key: string): number | null => {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
};

const resolveCacheState = (input: {
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  cacheMissTokens: number | null;
}): CacheState => {
  if (input.cacheReadTokens !== null || input.cacheWriteTokens !== null || input.cacheMissTokens !== null) {
    return (input.cacheReadTokens ?? 0) > 0 || (input.cacheWriteTokens ?? 0) > 0
      ? 'positive'
      : 'zero_reported';
  }
  return 'not_reported';
};

export const createOpenAICompatibleTokenUsageObservation = (
  usageData: unknown,
  model: LLMModel,
): LlmTokenUsageObservation | null => {
  const usage = asRecord(usageData);
  if (!usage) return null;
  const promptDetails = asRecord(usage.prompt_tokens_details) ?? asRecord(usage.input_tokens_details);
  const completionDetails = asRecord(usage.completion_tokens_details) ?? asRecord(usage.output_tokens_details);
  const cacheReadTokens =
    numberField(promptDetails, 'cached_tokens') ??
    numberField(usage, 'cached_tokens') ??
    numberField(usage, 'prompt_cache_hit_tokens');
  const cacheWriteTokens =
    numberField(promptDetails, 'cache_write_tokens') ??
    numberField(usage, 'cache_write_tokens');
  const cacheMissTokens =
    numberField(promptDetails, 'cache_miss_tokens') ??
    numberField(promptDetails, 'uncached_tokens') ??
    numberField(usage, 'prompt_cache_miss_tokens');
  const reasoningTokens =
    numberField(completionDetails, 'reasoning_tokens') ?? numberField(completionDetails, 'thinking_tokens');
  const outputTokens = numberField(usage, 'completion_tokens') ?? numberField(usage, 'output_tokens');
  const billableOutputTokens = model.provider === LLMProvider.GROK && outputTokens !== null && reasoningTokens !== null
    ? outputTokens + reasoningTokens
    : null;

  return buildLlmTokenUsageObservation({
    inputTokens: usage.prompt_tokens ?? usage.input_tokens,
    outputTokens,
    totalTokens: usage.total_tokens,
    rawUsage: usage,
    model: {
      modelProvider: model.provider,
      modelIdentifier: model.modelIdentifier,
      modelValue: model.value,
    },
    inputTokenSemantic: 'gross_includes_cache',
    cacheState: resolveCacheState({ cacheReadTokens, cacheWriteTokens, cacheMissTokens }),
    cacheReadInputTokens: cacheReadTokens,
    cacheCreationInputTokens: cacheWriteTokens,
    cacheMissInputTokens: cacheMissTokens,
    reasoningOutputTokens: reasoningTokens,
    billableOutputTokens,
  });
};
