import type {
  ProviderCallPurpose,
  ProviderCallUsage,
} from "../../../credential-proxy/provider-relays/provider-call-observation.js";
import type { AcpSessionEffectContext } from "../acp/acp-agent-session-profile.js";

export const DEEPSEEK_HARNESS_USAGE_RUNTIME_KIND = "deepseek_harness";

const INGESTION_KINDS: Readonly<Record<ProviderCallPurpose, string>> = {
  turn: "deepseek_harness_call",
  compaction: "deepseek_harness_compaction_call",
};

/**
 * One `TOKEN_USAGE_UPDATED` payload per dsh model call, from DeepSeek's own counts as the provider relay read them from
 * the call's stream (Anthropic Messages semantics: input excludes cache reads and writes). Turn and compaction calls
 * alike are model calls; dsh reports no context window over ACP.
 */
export const buildDeepSeekHarnessCallUsagePayload = (
  usage: ProviderCallUsage,
  purpose: ProviderCallPurpose,
  context: AcpSessionEffectContext,
): Record<string, unknown> | null => {
  if (!context.turnId) return null;
  const input = usage.inputTokens;
  const output = usage.outputTokens;
  const cacheRead = usage.cacheReadInputTokens;
  const cacheCreation = usage.cacheCreationInputTokens;
  const prompt = input + (cacheRead ?? 0) + (cacheCreation ?? 0);
  return {
    idempotency_key: `${DEEPSEEK_HARNESS_USAGE_RUNTIME_KIND}:${context.sessionId}:${context.turnId}:${context.callOrdinal}`,
    runtime_kind: DEEPSEEK_HARNESS_USAGE_RUNTIME_KIND,
    ingestion_kind: INGESTION_KINDS[purpose],
    usage_scope: "per_call",
    reports_model_call: true,
    call_sequence: context.callOrdinal,
    model_provider: "DEEPSEEK",
    provider_name: "DeepSeek Harness",
    model_identifier: context.model,
    model_value: context.model,
    input_token_semantic: "base_excludes_cache",
    reported_input_tokens: input,
    reported_output_tokens: output,
    reported_total_tokens: prompt + output,
    cache_read_input_tokens: cacheRead,
    cache_creation_input_tokens: cacheCreation,
    cache_state: cacheRead === null ? "not_reported" : cacheRead > 0 ? "positive" : "zero_reported",
    reasoning_output_tokens: null,
    latest_prompt_tokens: prompt,
    effective_context_window_tokens: null,
    context_window_usage_percent: null,
    context_compaction_threshold_tokens: null,
    raw_usage_json: {
      input_tokens: input,
      output_tokens: output,
      cache_read_input_tokens: cacheRead,
      cache_creation_input_tokens: cacheCreation,
    },
  };
};
