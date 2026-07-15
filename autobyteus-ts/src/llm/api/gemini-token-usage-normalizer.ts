import type { LLMModel } from '../models.js';
import { buildLlmTokenUsageObservation, type CacheState, type LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const numberField = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
};

const resolveCacheState = (cacheReadTokens: number | null): CacheState => {
  if (cacheReadTokens === null) return 'not_reported';
  return cacheReadTokens > 0 ? 'positive' : 'zero_reported';
};

export const createGeminiTokenUsageObservation = (
  usageData: unknown,
  model: LLMModel,
): LlmTokenUsageObservation | null => {
  const usage = asRecord(usageData);
  if (!usage) return null;
  const promptTokens = numberField(usage, 'promptTokenCount') ?? numberField(usage, 'inputTokenCount') ?? numberField(usage, 'input_tokens');
  const candidatesTokenCount = numberField(usage, 'candidatesTokenCount');
  const outputTokenCount = candidatesTokenCount ?? numberField(usage, 'outputTokenCount') ?? numberField(usage, 'output_tokens');
  const totalTokenCount = numberField(usage, 'totalTokenCount') ?? numberField(usage, 'total_tokens');
  const thoughtsTokenCount =
    numberField(usage, 'thoughtsTokenCount') ??
    numberField(usage, 'totalThoughtTokenCount') ??
    numberField(usage, 'total_thought_tokens');
  const billableOutputTokens = candidatesTokenCount !== null && thoughtsTokenCount !== null
    ? candidatesTokenCount + thoughtsTokenCount
    : outputTokenCount ?? (
      totalTokenCount !== null && promptTokens !== null && totalTokenCount >= promptTokens
        ? totalTokenCount - promptTokens
        : thoughtsTokenCount
    );
  const cacheReadTokens =
    numberField(usage, 'cachedContentTokenCount') ??
    numberField(usage, 'totalCachedTokenCount') ??
    numberField(usage, 'total_cached_tokens');

  return buildLlmTokenUsageObservation({
    inputTokens: promptTokens,
    outputTokens: outputTokenCount,
    totalTokens: totalTokenCount,
    rawUsage: usage,
    model: {
      modelProvider: model.provider,
      modelIdentifier: model.modelIdentifier,
      modelValue: model.value,
    },
    inputTokenSemantic: 'gross_includes_cache',
    cacheState: resolveCacheState(cacheReadTokens),
    reasoningOutputTokens: thoughtsTokenCount,
    billableOutputTokens,
    cacheReadInputTokens: cacheReadTokens,
  });
};
