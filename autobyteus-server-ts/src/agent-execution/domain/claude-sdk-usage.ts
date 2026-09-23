/** Numeric-only Claude Agent SDK result data. This is not a direct-API price quote. */
export interface ClaudeSdkModelUsage {
  rawModelId: string;
  canonicalModel: string | null;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface ClaudeSdkMainLoopUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadInputTokens: number | null;
  cacheCreationInputTokens: number | null;
  cacheCreation5mInputTokens: number | null;
  cacheCreation1hInputTokens: number | null;
}

export type ClaudeSdkSelectedMatchState = "matched" | "missing" | "ambiguous";
export interface ClaudeSdkSelectedBinding {
  selectedModelValue: string;
  selectedResolvedRawModelId: string | null;
  resolution: "resolved" | "missing" | "ambiguous";
}
export type ClaudeSdkQueryKind = "create" | "resume" | "unknown";
export const isSupportedClaudeSdkPricingProvider = (provider: string): boolean =>
  provider === "firstParty" || provider === "ANTHROPIC";

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const nameOf = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= 256 && value.trim() === value ? value : null;
const countOf = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
export const isClaudeSdkModelUsage = (value: unknown): value is ClaudeSdkModelUsage => {
  const row = recordOf(value);
  return Boolean(row && nameOf(row.rawModelId) && nameOf(row.provider) &&
    (row.canonicalModel === null || nameOf(row.canonicalModel)) &&
    countOf(row.inputTokens) !== null && countOf(row.outputTokens) !== null &&
    countOf(row.cacheReadInputTokens) !== null && countOf(row.cacheCreationInputTokens) !== null);
};

export const isClaudeSdkMainLoopUsage = (value: unknown): value is ClaudeSdkMainLoopUsage => {
  const row = recordOf(value);
  return Boolean(row && ["inputTokens", "outputTokens", "cacheReadInputTokens", "cacheCreationInputTokens",
    "cacheCreation5mInputTokens", "cacheCreation1hInputTokens"].every((field) =>
    row[field] === null || countOf(row[field]) !== null));
};

export const isClaudeSdkModelUsageArray = (value: unknown): value is ClaudeSdkModelUsage[] => {
  if (!Array.isArray(value) || value.length > 32 || !value.every(isClaudeSdkModelUsage)) return false;
  const ids = value.map((row) => row.rawModelId);
  return new Set(ids).size === ids.length && ids.every((id, index) => index === 0 || ids[index - 1]! < id);
};

export const isClaudeSdkResultIdentity = (value: {
  runtime_kind?: unknown;
  ingestion_kind?: unknown;
  selected_model_value?: unknown;
  selected_resolved_raw_model_id?: unknown;
  selected_match_state?: unknown;
  claude_sdk_model_usage?: unknown;
  claude_sdk_main_loop_usage?: unknown;
  model_identifier?: unknown;
}): boolean => {
  if (value.runtime_kind !== "claude_agent_sdk" || value.ingestion_kind !== "claude_sdk_result" ||
    !isClaudeSdkModelUsageArray(value.claude_sdk_model_usage) ||
    !isClaudeSdkMainLoopUsage(value.claude_sdk_main_loop_usage)) return false;
  const rows = value.claude_sdk_model_usage;
  if (typeof value.selected_model_value !== "string" || !value.selected_model_value.trim()) return false;
  const rawId = value.selected_resolved_raw_model_id;
  const matches = typeof rawId === "string" ? rows.filter((row) => row.rawModelId === rawId) : [];
  const matchState = value.selected_match_state;
  if (matchState === "matched" ? matches.length !== 1 : matchState !== "missing" && matchState !== "ambiguous") return false;
  if (matchState !== "matched" && matches.length > 0) return false;
  const model = matchState === "matched" ? matches[0]!.canonicalModel ?? matches[0]!.rawModelId : null;
  return value.model_identifier === model;
};
