import type { LLMModel } from '../models.js';
import { buildLlmTokenUsageObservation, type LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export const createGeminiTokenUsageObservation = (
  usageData: unknown,
  model: LLMModel,
): LlmTokenUsageObservation | null => {
  const usage = asRecord(usageData);
  if (!usage) return null;
  return buildLlmTokenUsageObservation({
    inputTokens: usage.promptTokenCount,
    outputTokens: usage.candidatesTokenCount,
    totalTokens: usage.totalTokenCount,
    rawUsage: usage,
    model: {
      modelProvider: model.provider,
      modelIdentifier: model.modelIdentifier,
      modelValue: model.value,
    },
    reasoningOutputTokens: usage.thoughtsTokenCount,
  });
};
