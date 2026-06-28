import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";

export const INPUT_TOKEN_SEMANTICS = [
  "gross_includes_cache",
  "base_excludes_cache",
  "unknown",
] as const;

export type InputTokenSemantic = typeof INPUT_TOKEN_SEMANTICS[number];

export const CACHE_STATES = [
  "positive",
  "zero_reported",
  "not_reported",
  "unsupported_or_local",
  "unknown",
] as const;

export type CacheState = typeof CACHE_STATES[number];

export const isInputTokenSemantic = (value: unknown): value is InputTokenSemantic =>
  typeof value === "string" && (INPUT_TOKEN_SEMANTICS as readonly string[]).includes(value);

export const isCacheState = (value: unknown): value is CacheState =>
  typeof value === "string" && (CACHE_STATES as readonly string[]).includes(value);

const addNullable = (...values: Array<number | null | undefined>): number | null => {
  let sawValue = false;
  let total = 0;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    sawValue = true;
    total += value;
  }
  return sawValue ? total : null;
};

export const sumCacheCreationTokens = (payload: Pick<
  TokenUsageUpdatedPayload,
  "cache_creation_input_tokens" | "cache_creation_5m_input_tokens" | "cache_creation_1h_input_tokens"
>): number | null =>
  payload.cache_creation_input_tokens ?? addNullable(
    payload.cache_creation_5m_input_tokens,
    payload.cache_creation_1h_input_tokens,
  );

export type TokenUsageComponentBasisInput = Pick<
  TokenUsageUpdatedPayload,
  | "runtime_kind"
  | "input_token_semantic"
  | "reported_input_tokens"
  | "reported_output_tokens"
  | "accounting_input_tokens"
  | "standard_input_tokens"
  | "cache_miss_input_tokens"
  | "cache_read_input_tokens"
  | "cache_creation_input_tokens"
  | "cache_creation_5m_input_tokens"
  | "cache_creation_1h_input_tokens"
  | "cache_state"
  | "billable_output_tokens"
>;

export type TokenUsageComponentBasisResult = Pick<
  TokenUsageUpdatedPayload,
  | "accounting_input_tokens"
  | "accounting_output_tokens"
  | "accounting_total_tokens"
  | "standard_input_tokens"
  | "cache_miss_input_tokens"
  | "cache_creation_input_tokens"
  | "cache_state"
  | "billable_input_tokens"
  | "billable_output_tokens"
> & {
  quality_flags: string[];
};

const nonNegative = (value: number): number => Math.max(value, 0);

export const resolveTokenUsageComponentBasis = (
  input: TokenUsageComponentBasisInput,
): TokenUsageComponentBasisResult => {
  const qualityFlags: string[] = [];
  const cacheCreationTokens = sumCacheCreationTokens(input);
  const cacheReadTokens = input.cache_read_input_tokens;
  const cacheMissTokens = input.cache_miss_input_tokens;
  const reportedInputTokens = input.reported_input_tokens;

  let grossInputTokens: number | null = input.accounting_input_tokens;
  let standardInputTokens: number | null = input.standard_input_tokens;

  if (input.input_token_semantic === "gross_includes_cache") {
    grossInputTokens = reportedInputTokens;
    standardInputTokens = cacheMissTokens ?? (
      reportedInputTokens === null
        ? null
        : nonNegative(reportedInputTokens - (cacheReadTokens ?? 0) - (cacheCreationTokens ?? 0))
    );
  } else if (input.input_token_semantic === "base_excludes_cache") {
    standardInputTokens = reportedInputTokens;
    grossInputTokens = reportedInputTokens === null
      ? null
      : reportedInputTokens + (cacheReadTokens ?? 0) + (cacheCreationTokens ?? 0);
  } else {
    grossInputTokens = reportedInputTokens;
    standardInputTokens = null;
    qualityFlags.push("input_token_semantic_unknown");
    if ((reportedInputTokens ?? 0) > 0) {
      qualityFlags.push("standard_input_tokens_unresolved");
    }
  }

  const billableOutputTokens = input.billable_output_tokens ?? input.reported_output_tokens;
  const accountingTotalTokens = grossInputTokens !== null && billableOutputTokens !== null
    ? grossInputTokens + billableOutputTokens
    : null;
  const cacheState = deriveCacheState({
    cacheState: input.cache_state === "unknown" ? null : input.cache_state,
    runtimeKind: input.runtime_kind,
    cacheReadInputTokens: cacheReadTokens,
    cacheCreationInputTokens: cacheCreationTokens,
    cacheCreation5mInputTokens: input.cache_creation_5m_input_tokens,
    cacheCreation1hInputTokens: input.cache_creation_1h_input_tokens,
    cacheMissInputTokens: cacheMissTokens,
  });

  return {
    accounting_input_tokens: grossInputTokens,
    accounting_output_tokens: billableOutputTokens,
    accounting_total_tokens: accountingTotalTokens,
    standard_input_tokens: standardInputTokens,
    cache_miss_input_tokens: cacheMissTokens ?? standardInputTokens,
    cache_creation_input_tokens: cacheCreationTokens,
    cache_state: cacheState,
    billable_output_tokens: billableOutputTokens,
    billable_input_tokens: grossInputTokens,
    quality_flags: qualityFlags,
  };
};

export const deriveCacheState = (input: {
  cacheState?: CacheState | null;
  runtimeKind?: string | null;
  cacheReadInputTokens?: number | null;
  cacheCreationInputTokens?: number | null;
  cacheCreation5mInputTokens?: number | null;
  cacheCreation1hInputTokens?: number | null;
  cacheMissInputTokens?: number | null;
}): CacheState => {
  if (input.cacheState) return input.cacheState;
  const runtime = input.runtimeKind?.toLowerCase() ?? "";
  if (runtime === "ollama" || runtime === "lmstudio") return "unsupported_or_local";

  const reportedValues = [
    input.cacheReadInputTokens,
    input.cacheCreationInputTokens,
    input.cacheCreation5mInputTokens,
    input.cacheCreation1hInputTokens,
    input.cacheMissInputTokens,
  ];
  const reported = reportedValues.some((value) => value !== null && value !== undefined);
  if (!reported) return "not_reported";
  const positive = reportedValues.some((value) => (value ?? 0) > 0);
  return positive ? "positive" : "zero_reported";
};

export const summarizeCacheState = (states: CacheState[]): CacheState => {
  if (states.includes("positive")) return "positive";
  if (states.includes("zero_reported")) return "zero_reported";
  if (states.length > 0 && states.every((state) => state === "unsupported_or_local")) {
    return "unsupported_or_local";
  }
  if (states.includes("not_reported")) return "not_reported";
  return "unknown";
};
