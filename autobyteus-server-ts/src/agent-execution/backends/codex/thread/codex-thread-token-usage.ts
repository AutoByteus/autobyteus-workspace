import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import {
  cumulativeSnapshotProviderDeltaTokensKey,
  type CumulativeSnapshotTokenRecord,
} from "../../../../token-usage/projections/cumulative-snapshot-reconciliation-metadata.js";

export type CodexReadyTokenUsageUpdate = {
  turnId: string;
  runtime_kind: "codex_app_server";
  ingestion_kind: "codex_thread_token_usage";
  usage_scope: "per_call" | "cumulative_snapshot";
  snapshot_series_key: string | null;
  idempotency_key: string;
  reported_input_tokens: number | null;
  reported_output_tokens: number | null;
  reported_total_tokens: number | null;
  cache_read_input_tokens: number | null;
  reasoning_output_tokens: number | null;
  input_token_semantic: "gross_includes_cache";
  cache_state: "positive" | "zero_reported" | "not_reported";
  latest_prompt_tokens: number | null;
  effective_context_window_tokens: number | null;
  context_window_usage_percent: number | null;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
  model_value: string | null;
  raw_usage_json: Record<string, unknown> | null;
  raw_event_json: Record<string, unknown> | null;
  quality_flags: string[];
};

const asNonNegativeInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : null;

const cloneRecord = (value: unknown): Record<string, unknown> | null => {
  const record = asObject(value);
  return record ? JSON.parse(JSON.stringify(record)) as Record<string, unknown> : null;
};

const resolveUsageTokens = (record: Record<string, unknown> | null): Pick<
  CumulativeSnapshotTokenRecord,
  | "reported_input_tokens"
  | "reported_output_tokens"
  | "reported_total_tokens"
  | "cache_read_input_tokens"
  | "reasoning_output_tokens"
> => {
  const inputTokens = asNonNegativeInt(record?.inputTokens ?? record?.input_tokens);
  const outputTokens = asNonNegativeInt(record?.outputTokens ?? record?.output_tokens);
  const explicitTotalTokens = asNonNegativeInt(record?.totalTokens ?? record?.total_tokens);
  const cacheReadTokens = asNonNegativeInt(record?.cachedInputTokens ?? record?.cached_input_tokens);
  const reasoningTokens = asNonNegativeInt(record?.reasoningOutputTokens ?? record?.reasoning_output_tokens);
  const totalTokens = explicitTotalTokens ?? (
    inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null
  );
  return {
    reported_input_tokens: inputTokens,
    reported_output_tokens: outputTokens,
    reported_total_tokens: totalTokens,
    cache_read_input_tokens: cacheReadTokens,
    reasoning_output_tokens: reasoningTokens,
  };
};

const buildProviderDeltaTokens = (
  record: Record<string, unknown> | null,
): CumulativeSnapshotTokenRecord | null => {
  if (!record) return null;
  const tokens = resolveUsageTokens(record);
  if (
    tokens.reported_input_tokens === null &&
    tokens.reported_output_tokens === null &&
    tokens.reported_total_tokens === null &&
    tokens.cache_read_input_tokens === null &&
    tokens.reasoning_output_tokens === null
  ) {
    return null;
  }
  return {
    reported_input_tokens: tokens.reported_input_tokens,
    reported_output_tokens: tokens.reported_output_tokens,
    reported_total_tokens: tokens.reported_total_tokens,
    accounting_input_tokens: null,
    accounting_output_tokens: null,
    accounting_total_tokens: null,
    standard_input_tokens: null,
    cache_miss_input_tokens: null,
    cache_read_input_tokens: tokens.cache_read_input_tokens,
    cache_creation_input_tokens: null,
    cache_creation_5m_input_tokens: null,
    cache_creation_1h_input_tokens: null,
    reasoning_output_tokens: tokens.reasoning_output_tokens,
    billable_input_tokens: null,
    billable_output_tokens: null,
  };
};

export const resolveCodexThreadTokenUsage = (input: {
  params: JsonObject;
  runId: string;
  turnId: string;
  threadId: string;
  model: string | null;
}): CodexReadyTokenUsageUpdate | null => {
  const tokenUsage = asObject(input.params.tokenUsage);
  const last = asObject(tokenUsage?.last);
  const total = asObject(tokenUsage?.total);
  const selected = total ?? last;
  if (!selected) {
    return null;
  }

  const selectedTokens = resolveUsageTokens(selected);
  const providerDeltaTokens = buildProviderDeltaTokens(last);
  const latestPromptTokens = providerDeltaTokens?.reported_input_tokens ?? selectedTokens.reported_input_tokens;
  const effectiveContextWindowTokens = asNonNegativeInt(
    tokenUsage?.modelContextWindow ?? tokenUsage?.model_context_window,
  );
  const contextWindowUsagePercent = latestPromptTokens !== null && effectiveContextWindowTokens !== null && effectiveContextWindowTokens > 0
    ? (latestPromptTokens / effectiveContextWindowTokens) * 100
    : null;
  if (
    selectedTokens.reported_input_tokens === null &&
    selectedTokens.reported_output_tokens === null &&
    selectedTokens.reported_total_tokens === null &&
    selectedTokens.cache_read_input_tokens === null &&
    selectedTokens.reasoning_output_tokens === null
  ) {
    return null;
  }

  const scope = total ? "cumulative_snapshot" : "per_call";
  const threadKey = input.threadId || input.runId;
  const providerEventId =
    asString(input.params.eventId) ??
    asString(input.params.event_id) ??
    asString(input.params.id);
  const snapshotIdentity = [
    input.runId,
    threadKey,
    input.turnId,
    scope,
    selectedTokens.reported_input_tokens ?? "x",
    selectedTokens.cache_read_input_tokens ?? "x",
    selectedTokens.reported_output_tokens ?? "x",
    selectedTokens.reasoning_output_tokens ?? "x",
    selectedTokens.reported_total_tokens ?? "x",
  ].join(":");
  const eventId = providerEventId ? `${providerEventId}:${snapshotIdentity}` : snapshotIdentity;

  const qualityFlags: string[] = [];
  if (selectedTokens.reported_input_tokens === null) qualityFlags.push("reported_input_tokens_missing");
  if (selectedTokens.reported_output_tokens === null) qualityFlags.push("reported_output_tokens_missing");
  if (selectedTokens.reported_total_tokens === null) qualityFlags.push("reported_total_tokens_missing");
  if (!total) {
    qualityFlags.push("codex_cumulative_total_missing_used_provider_delta");
  } else if (!providerDeltaTokens) {
    qualityFlags.push("cumulative_snapshot_provider_delta_missing");
  }

  const rawEventJson = cloneRecord(input.params) ?? {};
  if (providerDeltaTokens) {
    rawEventJson[cumulativeSnapshotProviderDeltaTokensKey] = providerDeltaTokens;
  }

  return {
    turnId: input.turnId,
    runtime_kind: "codex_app_server",
    ingestion_kind: "codex_thread_token_usage",
    usage_scope: scope,
    snapshot_series_key: scope === "cumulative_snapshot" ? `codex_thread:${threadKey}` : null,
    idempotency_key: `codex_token_usage:${eventId}`,
    reported_input_tokens: selectedTokens.reported_input_tokens,
    reported_output_tokens: selectedTokens.reported_output_tokens,
    reported_total_tokens: selectedTokens.reported_total_tokens,
    cache_read_input_tokens: selectedTokens.cache_read_input_tokens,
    reasoning_output_tokens: selectedTokens.reasoning_output_tokens,
    input_token_semantic: "gross_includes_cache",
    cache_state: selectedTokens.cache_read_input_tokens === null
      ? "not_reported"
      : (selectedTokens.cache_read_input_tokens > 0 ? "positive" : "zero_reported"),
    latest_prompt_tokens: latestPromptTokens,
    effective_context_window_tokens: effectiveContextWindowTokens,
    context_window_usage_percent: contextWindowUsagePercent,
    model_provider: "OPENAI",
    provider_name: null,
    model_identifier: input.model,
    model_value: input.model,
    raw_usage_json: cloneRecord(selected),
    raw_event_json: rawEventJson,
    quality_flags: qualityFlags,
  };
};
