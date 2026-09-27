import type { AcpExtNotificationContext } from "../acp/acp-agent-session-profile.js";

export const GROK_BUILD_USAGE_RUNTIME_KIND = "grok_build";
export const GROK_BUILD_USAGE_INGESTION_KIND = "grok_acp_call";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

/**
 * One `TOKEN_USAGE_UPDATED` payload per Grok model call (`response_completed`). Per-call
 * input excludes cache reads, reasoning is inside output, and each record is priced by the
 * tier its own request selects. Turn totals (`turn_completed`, prompt result) are never used.
 */
export const buildGrokBuildCallUsagePayload = (
  usage: unknown,
  context: AcpExtNotificationContext,
): Record<string, unknown> | null => {
  if (!isRecord(usage) || !context.turnId) return null;
  const input = count(usage.input_tokens);
  const output = count(usage.output_tokens);
  if (input === null || output === null) return null;
  const cacheRead = count(usage.cache_read_input_tokens);
  const cacheCreation = count(usage.cache_creation_input_tokens);
  return {
    idempotency_key: `${GROK_BUILD_USAGE_RUNTIME_KIND}:${context.sessionId}:${context.turnId}:${context.callOrdinal}`,
    runtime_kind: GROK_BUILD_USAGE_RUNTIME_KIND,
    ingestion_kind: GROK_BUILD_USAGE_INGESTION_KIND,
    usage_scope: "per_call",
    call_sequence: context.callOrdinal,
    model_provider: "GROK",
    provider_name: "Grok Build",
    model_identifier: context.model,
    model_value: context.model,
    input_token_semantic: "base_excludes_cache",
    reported_input_tokens: input,
    reported_output_tokens: output,
    reported_total_tokens: input + (cacheRead ?? 0) + (cacheCreation ?? 0) + output,
    cache_read_input_tokens: cacheRead,
    cache_creation_input_tokens: cacheCreation,
    cache_state: cacheRead === null ? "not_reported" : cacheRead > 0 ? "positive" : "zero_reported",
    reasoning_output_tokens: count(usage.reasoning_tokens),
    raw_usage_json: usage,
  };
};
