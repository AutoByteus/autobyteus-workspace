import type { LLMModel } from '../models.js';
import { buildLlmTokenUsageObservation, type LlmTokenUsageObservation, toNonNegativeIntOrNull } from '../utils/llm-token-usage-observation.js';

export type AnthropicUsageAccumulator = {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheCreationInputTokens: number | null;
  cacheReadInputTokens: number | null;
  rawUsages: Record<string, unknown>[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const numberField = (record: Record<string, unknown> | null, key: string): number | null =>
  toNonNegativeIntOrNull(record?.[key]);

export const createAnthropicUsageAccumulator = (): AnthropicUsageAccumulator => ({
  inputTokens: null,
  outputTokens: null,
  cacheCreationInputTokens: null,
  cacheReadInputTokens: null,
  rawUsages: [],
});

export const foldAnthropicUsage = (
  accumulator: AnthropicUsageAccumulator,
  usageData: unknown,
): AnthropicUsageAccumulator => {
  const usage = asRecord(usageData);
  if (!usage) return accumulator;
  accumulator.rawUsages.push({ ...usage });

  const inputTokens = numberField(usage, 'input_tokens');
  const outputTokens = numberField(usage, 'output_tokens');
  const cacheCreation =
    numberField(usage, 'cache_creation_input_tokens') ??
    numberField(usage, 'cache_creation_tokens');
  const cacheRead =
    numberField(usage, 'cache_read_input_tokens') ??
    numberField(usage, 'cache_read_tokens');

  if (inputTokens !== null) accumulator.inputTokens = inputTokens;
  if (outputTokens !== null) accumulator.outputTokens = outputTokens;
  if (cacheCreation !== null) accumulator.cacheCreationInputTokens = cacheCreation;
  if (cacheRead !== null) accumulator.cacheReadInputTokens = cacheRead;
  return accumulator;
};

export const createAnthropicTokenUsageObservation = (
  usageData: unknown,
  model: LLMModel,
): LlmTokenUsageObservation | null => {
  const accumulator = foldAnthropicUsage(createAnthropicUsageAccumulator(), usageData);
  return createAnthropicTokenUsageObservationFromAccumulator(accumulator, model);
};

export const createAnthropicTokenUsageObservationFromAccumulator = (
  accumulator: AnthropicUsageAccumulator,
  model: LLMModel,
): LlmTokenUsageObservation | null => {
  if (
    accumulator.inputTokens === null &&
    accumulator.outputTokens === null &&
    accumulator.cacheCreationInputTokens === null &&
    accumulator.cacheReadInputTokens === null
  ) {
    return null;
  }
  return buildLlmTokenUsageObservation({
    inputTokens: accumulator.inputTokens,
    outputTokens: accumulator.outputTokens,
    rawUsage: accumulator.rawUsages.length === 1
      ? accumulator.rawUsages[0]
      : { events: accumulator.rawUsages },
    model: {
      modelProvider: model.provider,
      modelIdentifier: model.modelIdentifier,
      modelValue: model.value,
    },
    cacheCreationInputTokens: accumulator.cacheCreationInputTokens,
    cacheReadInputTokens: accumulator.cacheReadInputTokens,
  });
};
