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
