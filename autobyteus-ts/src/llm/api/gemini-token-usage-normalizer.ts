import type { LLMModel } from '../models.js';
import { buildLlmTokenUsageObservation, type LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const numberField = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
};

export const createGeminiTokenUsageObservation = (
  usageData: unknown,
  model: LLMModel,
): LlmTokenUsageObservation | null => {
  const usage = asRecord(usageData);
  if (!usage) return null;
  const candidatesTokenCount = numberField(usage, 'candidatesTokenCount');
  const thoughtsTokenCount =
    numberField(usage, 'thoughtsTokenCount') ??
    numberField(usage, 'totalThoughtTokenCount') ??
    numberField(usage, 'total_thought_tokens');
  const billableOutputTokens = candidatesTokenCount !== null && thoughtsTokenCount !== null
    ? candidatesTokenCount + thoughtsTokenCount
    : null;
  return buildLlmTokenUsageObservation({
    inputTokens: usage.promptTokenCount ?? usage.inputTokenCount ?? usage.input_tokens,
    outputTokens: candidatesTokenCount ?? usage.outputTokenCount ?? usage.output_tokens,
    totalTokens: usage.totalTokenCount ?? usage.total_tokens,
    rawUsage: usage,
    model: {
      modelProvider: model.provider,
      modelIdentifier: model.modelIdentifier,
      modelValue: model.value,
    },
    reasoningOutputTokens: thoughtsTokenCount,
    billableOutputTokens,
    cacheReadInputTokens: usage.cachedContentTokenCount ?? usage.totalCachedTokenCount ?? usage.total_cached_tokens,
  });
};
