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

export const isCacheState = (value: unknown): value is CacheState =>
  typeof value === "string" && (CACHE_STATES as readonly string[]).includes(value);

export const summarizeCacheState = (states: CacheState[]): CacheState => {
  if (states.includes("positive")) return "positive";
  if (states.includes("zero_reported")) return "zero_reported";
  if (states.length > 0 && states.every((state) => state === "unsupported_or_local")) {
    return "unsupported_or_local";
  }
  if (states.includes("not_reported")) return "not_reported";
  return "unknown";
};
