import type { LLMModel } from '../models.js';
import { buildLlmTokenUsageObservation, type LlmTokenUsageObservation } from '../utils/llm-token-usage-observation.js';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const numberField = (record: Record<string, unknown> | null, key: string): number | null => {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export const createOpenAICompatibleTokenUsageObservation = (
  usageData: unknown,
  model: LLMModel,
): LlmTokenUsageObservation | null => {
  const usage = asRecord(usageData);
  if (!usage) return null;
  const promptDetails = asRecord(usage.prompt_tokens_details) ?? asRecord(usage.input_tokens_details);
  const completionDetails = asRecord(usage.completion_tokens_details) ?? asRecord(usage.output_tokens_details);
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
    cacheReadInputTokens: numberField(promptDetails, 'cached_tokens'),
    reasoningOutputTokens:
      numberField(completionDetails, 'reasoning_tokens') ?? numberField(completionDetails, 'thinking_tokens'),
  });
};
