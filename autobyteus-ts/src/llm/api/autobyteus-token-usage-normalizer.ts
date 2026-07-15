import type { LLMModel } from '../models.js';
import { buildLlmTokenUsageObservation, type LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export const createAutoByteusTokenUsageObservation = (
  usageData: unknown,
  model: LLMModel,
): LlmTokenUsageObservation | null => {
  const usage = asRecord(usageData);
  if (!usage) return null;
  return buildLlmTokenUsageObservation({
    inputTokens: usage.prompt_tokens ?? usage.input_tokens,
    outputTokens: usage.completion_tokens ?? usage.output_tokens,
    totalTokens: usage.total_tokens,
    rawUsage: usage,
    model: {
      modelProvider: model.provider,
      modelIdentifier: model.modelIdentifier,
      modelValue: model.value,
    },
  });
};
