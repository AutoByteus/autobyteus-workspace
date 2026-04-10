import type { TokenUsage } from "autobyteus-ts";
import { asObject, type JsonObject } from "../codex-app-server-json.js";

const asNonNegativeInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : null;

export const resolveCodexThreadTokenUsage = (
  params: JsonObject,
): TokenUsage | null => {
  const tokenUsage = asObject(params.tokenUsage);
  const last = asObject(tokenUsage?.last) ?? asObject(tokenUsage?.total);
  if (!last) {
    return null;
  }

  const promptTokens = asNonNegativeInt(last.inputTokens);
  const completionTokens = asNonNegativeInt(last.outputTokens);
  const totalTokens = asNonNegativeInt(last.totalTokens);
  if (
    promptTokens === null ||
    completionTokens === null ||
    totalTokens === null
  ) {
    return null;
  }

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    prompt_cost: null,
    completion_cost: null,
    total_cost: null,
  };
};
