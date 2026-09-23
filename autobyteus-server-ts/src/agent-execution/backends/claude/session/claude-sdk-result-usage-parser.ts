import type { ClaudeSdkModelUsage } from "../../../domain/claude-sdk-usage.js";

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const stringOf = (value: unknown): string | null =>
  typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= 256 ? value : null;
const countOf = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

export interface ParsedClaudeSdkResultUsage {
  models: ClaudeSdkModelUsage[];
  qualityFlags: string[];
}

export const parseClaudeSdkResultUsage = (result: Record<string, unknown>): ParsedClaudeSdkResultUsage => {
  const source = result.modelUsage ?? result.model_usage;
  const map = recordOf(source);
  const flags: string[] = [];
  let models: ClaudeSdkModelUsage[] = [];
  if (source === undefined || source === null) {
    flags.push("claude_sdk_model_usage_missing");
  } else if (!map || Object.keys(map).length > 32) {
    flags.push("claude_sdk_model_usage_invalid");
  } else {
    for (const [rawModelId, rawValue] of Object.entries(map)) {
      const row = recordOf(rawValue);
      const inputTokens = countOf(row?.inputTokens ?? row?.input_tokens);
      const outputTokens = countOf(row?.outputTokens ?? row?.output_tokens);
      const cacheReadInputTokens = countOf(row?.cacheReadInputTokens ?? row?.cache_read_input_tokens);
      const cacheCreationInputTokens = countOf(row?.cacheCreationInputTokens ?? row?.cache_creation_input_tokens);
      if (!stringOf(rawModelId) || !row || inputTokens === null || outputTokens === null ||
        cacheReadInputTokens === null || cacheCreationInputTokens === null) {
        flags.push("claude_sdk_model_usage_invalid");
        models = [];
        break;
      }
      const suppliedCanonical = row.canonicalModel ?? row.canonical_model;
      if (suppliedCanonical !== undefined && suppliedCanonical !== null && !stringOf(suppliedCanonical)) {
        flags.push("claude_sdk_canonical_model_invalid");
        models = [];
        break;
      }
      models.push({
        rawModelId,
        canonicalModel: stringOf(suppliedCanonical),
        provider: stringOf(row.provider) ?? "unknown",
        inputTokens,
        outputTokens,
        cacheReadInputTokens,
        cacheCreationInputTokens,
      });
    }
    models.sort((left, right) => left.rawModelId < right.rawModelId ? -1 : left.rawModelId > right.rawModelId ? 1 : 0);
  }
  return {
    models,
    qualityFlags: flags,
  };
};
