import { z } from 'zod';

const nullableNonNegativeInt = z.number().int().nonnegative().nullable();
const jsonRecordSchema = z.record(z.string(), z.unknown()).nullable();

export const LlmTokenUsageObservationSchema = z.object({
  input_tokens: nullableNonNegativeInt,
  output_tokens: nullableNonNegativeInt,
  total_tokens: nullableNonNegativeInt,
  usage_scope: z.literal('per_call'),
  model_provider: z.string().nullable(),
  model_identifier: z.string().nullable(),
  model_value: z.string().nullable(),
  cache_read_input_tokens: nullableNonNegativeInt.optional(),
  cache_creation_input_tokens: nullableNonNegativeInt.optional(),
  reasoning_output_tokens: nullableNonNegativeInt.optional(),
  billable_input_tokens: nullableNonNegativeInt.optional(),
  billable_output_tokens: nullableNonNegativeInt.optional(),
  raw_usage_json: jsonRecordSchema,
  quality_flags: z.array(z.string()),
});

export type LlmTokenUsageObservation = z.infer<typeof LlmTokenUsageObservationSchema>;

export type LlmTokenUsageModelIdentity = {
  modelProvider?: string | null;
  modelIdentifier?: string | null;
  modelValue?: string | null;
};

export const toNonNegativeIntOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

export const toJsonRecordOrNull = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value)) as Record<string, unknown>
    : null;

export const buildLlmTokenUsageObservation = (input: {
  inputTokens: unknown;
  outputTokens: unknown;
  totalTokens?: unknown;
  rawUsage: unknown;
  model?: LlmTokenUsageModelIdentity | null;
  cacheReadInputTokens?: unknown;
  cacheCreationInputTokens?: unknown;
  reasoningOutputTokens?: unknown;
  billableInputTokens?: unknown;
  billableOutputTokens?: unknown;
  qualityFlags?: string[];
}): LlmTokenUsageObservation => {
  const inputTokens = toNonNegativeIntOrNull(input.inputTokens);
  const outputTokens = toNonNegativeIntOrNull(input.outputTokens);
  const explicitTotalTokens = toNonNegativeIntOrNull(input.totalTokens);
  const totalTokens = explicitTotalTokens ?? (
    inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null
  );

  const qualityFlags = new Set(input.qualityFlags ?? []);
  if (inputTokens === null) qualityFlags.add('input_tokens_missing');
  if (outputTokens === null) qualityFlags.add('output_tokens_missing');
  if (totalTokens === null) qualityFlags.add('total_tokens_missing');

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    usage_scope: 'per_call',
    model_provider: input.model?.modelProvider ?? null,
    model_identifier: input.model?.modelIdentifier ?? null,
    model_value: input.model?.modelValue ?? null,
    cache_read_input_tokens: toNonNegativeIntOrNull(input.cacheReadInputTokens),
    cache_creation_input_tokens: toNonNegativeIntOrNull(input.cacheCreationInputTokens),
    reasoning_output_tokens: toNonNegativeIntOrNull(input.reasoningOutputTokens),
    billable_input_tokens: toNonNegativeIntOrNull(input.billableInputTokens),
    billable_output_tokens: toNonNegativeIntOrNull(input.billableOutputTokens),
    raw_usage_json: toJsonRecordOrNull(input.rawUsage),
    quality_flags: Array.from(qualityFlags),
  };
};

export const isLlmTokenUsageObservation = (value: unknown): value is LlmTokenUsageObservation =>
  LlmTokenUsageObservationSchema.safeParse(value).success;
