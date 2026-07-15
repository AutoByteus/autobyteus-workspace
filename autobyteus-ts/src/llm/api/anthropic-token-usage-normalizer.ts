import type { LLMModel } from '../models.js';
import {
  buildLlmTokenUsageObservation,
  type CacheState,
  type LlmTokenUsageObservation,
  toNonNegativeIntOrNull,
} from '../utils/llm-token-usage-observation.js';

export type AnthropicUsageAccumulator = {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheCreationInputTokens: number | null;
  cacheCreation5mInputTokens: number | null;
  cacheCreation1hInputTokens: number | null;
  cacheReadInputTokens: number | null;
  reasoningOutputTokens: number | null;
  rawUsages: Record<string, unknown>[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const numberField = (record: Record<string, unknown> | null, key: string): number | null =>
  toNonNegativeIntOrNull(record?.[key]);

const sumNullable = (...values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : null;
};

const resolveCacheState = (
  cacheRead: number | null,
  cacheCreation: number | null,
  cacheCreation5m: number | null,
  cacheCreation1h: number | null,
): CacheState => {
  const reported = [cacheRead, cacheCreation, cacheCreation5m, cacheCreation1h]
    .some((value) => value !== null);
  if (!reported) return 'not_reported';
  return [cacheRead, cacheCreation, cacheCreation5m, cacheCreation1h]
    .some((value) => (value ?? 0) > 0)
    ? 'positive'
    : 'zero_reported';
};

export const createAnthropicUsageAccumulator = (): AnthropicUsageAccumulator => ({
  inputTokens: null,
  outputTokens: null,
  cacheCreationInputTokens: null,
  cacheCreation5mInputTokens: null,
  cacheCreation1hInputTokens: null,
  cacheReadInputTokens: null,
  reasoningOutputTokens: null,
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
  const cacheCreationRecord = asRecord(usage.cache_creation);
  const cacheCreation5m =
    numberField(cacheCreationRecord, 'ephemeral_5m_input_tokens') ??
    numberField(usage, 'cache_creation_5m_input_tokens');
  const cacheCreation1h =
    numberField(cacheCreationRecord, 'ephemeral_1h_input_tokens') ??
    numberField(usage, 'cache_creation_1h_input_tokens');
  const cacheCreation =
    numberField(usage, 'cache_creation_input_tokens') ??
    numberField(usage, 'cache_creation_tokens') ??
    sumNullable(cacheCreation5m, cacheCreation1h);
  const cacheRead =
    numberField(usage, 'cache_read_input_tokens') ??
    numberField(usage, 'cache_read_tokens');
  const outputDetails = asRecord(usage.output_tokens_details);
  const reasoningOutput =
    numberField(outputDetails, 'thinking_tokens') ??
    numberField(outputDetails, 'reasoning_tokens');

  if (inputTokens !== null) accumulator.inputTokens = inputTokens;
  if (outputTokens !== null) accumulator.outputTokens = outputTokens;
  if (cacheCreation !== null) accumulator.cacheCreationInputTokens = cacheCreation;
  if (cacheCreation5m !== null) accumulator.cacheCreation5mInputTokens = cacheCreation5m;
  if (cacheCreation1h !== null) accumulator.cacheCreation1hInputTokens = cacheCreation1h;
  if (cacheRead !== null) accumulator.cacheReadInputTokens = cacheRead;
  if (reasoningOutput !== null) accumulator.reasoningOutputTokens = reasoningOutput;
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
    accumulator.cacheCreation5mInputTokens === null &&
    accumulator.cacheCreation1hInputTokens === null &&
    accumulator.cacheReadInputTokens === null &&
    accumulator.reasoningOutputTokens === null
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
    inputTokenSemantic: 'base_excludes_cache',
    standardInputTokens: accumulator.inputTokens,
    cacheState: resolveCacheState(
      accumulator.cacheReadInputTokens,
      accumulator.cacheCreationInputTokens,
      accumulator.cacheCreation5mInputTokens,
      accumulator.cacheCreation1hInputTokens,
    ),
    cacheCreationInputTokens: accumulator.cacheCreationInputTokens,
    cacheCreation5mInputTokens: accumulator.cacheCreation5mInputTokens,
    cacheCreation1hInputTokens: accumulator.cacheCreation1hInputTokens,
    cacheReadInputTokens: accumulator.cacheReadInputTokens,
    reasoningOutputTokens: accumulator.reasoningOutputTokens,
  });
};
