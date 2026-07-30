import { z } from 'zod';

const nullableNonNegativeInt = z.number().int().nonnegative().nullable();
const jsonRecordSchema = z.record(z.string(), z.unknown()).nullable();

export const InputTokenSemanticSchema = z.enum([
  'gross_includes_cache',
  'base_excludes_cache',
  'unknown',
]);
export type InputTokenSemantic = z.infer<typeof InputTokenSemanticSchema>;

export const CacheStateSchema = z.enum([
  'positive',
  'zero_reported',
  'not_reported',
  'unsupported_or_local',
  'unknown',
]);
export type CacheState = z.infer<typeof CacheStateSchema>;

export const LlmTokenUsageObservationSchema = z.object({
  input_tokens: nullableNonNegativeInt,
  output_tokens: nullableNonNegativeInt,
  total_tokens: nullableNonNegativeInt,
  usage_scope: z.literal('per_call'),
  model_provider: z.string().nullable(),
  provider_name: z.string().nullable().optional(),
  model_identifier: z.string().nullable(),
  model_value: z.string().nullable(),
  input_token_semantic: InputTokenSemanticSchema.optional(),
  cache_state: CacheStateSchema.optional(),
  standard_input_tokens: nullableNonNegativeInt.optional(),
  cache_miss_input_tokens: nullableNonNegativeInt.optional(),
  cache_read_input_tokens: nullableNonNegativeInt.optional(),
  cache_creation_input_tokens: nullableNonNegativeInt.optional(),
  cache_creation_5m_input_tokens: nullableNonNegativeInt.optional(),
  cache_creation_1h_input_tokens: nullableNonNegativeInt.optional(),
  reasoning_output_tokens: nullableNonNegativeInt.optional(),
  billable_input_tokens: nullableNonNegativeInt.optional(),
  billable_output_tokens: nullableNonNegativeInt.optional(),
  raw_usage_json: jsonRecordSchema,
  quality_flags: z.array(z.string()),
});

export type LlmTokenUsageObservation = z.infer<typeof LlmTokenUsageObservationSchema>;

export type LlmTokenUsageModelIdentity = {
  modelProvider?: string | null;
  providerName?: string | null;
  modelIdentifier?: string | null;
  modelValue?: string | null;
};

export const toNonNegativeIntOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

export const toJsonRecordOrNull = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value)) as Record<string, unknown>
    : null;

const normalizeInputTokenSemantic = (value: unknown): InputTokenSemantic | undefined =>
  InputTokenSemanticSchema.safeParse(value).success ? value as InputTokenSemantic : undefined;

const normalizeCacheState = (value: unknown): CacheState | undefined =>
  CacheStateSchema.safeParse(value).success ? value as CacheState : undefined;

export const buildLlmTokenUsageObservation = (input: {
  inputTokens: unknown;
  outputTokens: unknown;
  totalTokens?: unknown;
  rawUsage: unknown;
  model?: LlmTokenUsageModelIdentity | null;
  inputTokenSemantic?: InputTokenSemantic | string | null;
  cacheState?: CacheState | string | null;
  standardInputTokens?: unknown;
  cacheMissInputTokens?: unknown;
  cacheReadInputTokens?: unknown;
  cacheCreationInputTokens?: unknown;
  cacheCreation5mInputTokens?: unknown;
  cacheCreation1hInputTokens?: unknown;
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

  const inputTokenSemantic = normalizeInputTokenSemantic(input.inputTokenSemantic) ?? 'unknown';
  if (inputTokenSemantic === 'unknown') qualityFlags.add('input_token_semantic_unknown');

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    usage_scope: 'per_call',
    model_provider: input.model?.modelProvider ?? null,
    provider_name: input.model?.providerName ?? null,
    model_identifier: input.model?.modelIdentifier ?? null,
    model_value: input.model?.modelValue ?? null,
    input_token_semantic: inputTokenSemantic,
    cache_state: normalizeCacheState(input.cacheState),
    standard_input_tokens: toNonNegativeIntOrNull(input.standardInputTokens),
    cache_miss_input_tokens: toNonNegativeIntOrNull(input.cacheMissInputTokens),
    cache_read_input_tokens: toNonNegativeIntOrNull(input.cacheReadInputTokens),
    cache_creation_input_tokens: toNonNegativeIntOrNull(input.cacheCreationInputTokens),
    cache_creation_5m_input_tokens: toNonNegativeIntOrNull(input.cacheCreation5mInputTokens),
    cache_creation_1h_input_tokens: toNonNegativeIntOrNull(input.cacheCreation1hInputTokens),
    reasoning_output_tokens: toNonNegativeIntOrNull(input.reasoningOutputTokens),
    billable_input_tokens: toNonNegativeIntOrNull(input.billableInputTokens),
    billable_output_tokens: toNonNegativeIntOrNull(input.billableOutputTokens),
    raw_usage_json: toJsonRecordOrNull(input.rawUsage),
    quality_flags: Array.from(qualityFlags),
  };
};

export const isLlmTokenUsageObservation = (value: unknown): value is LlmTokenUsageObservation =>
  LlmTokenUsageObservationSchema.safeParse(value).success;
