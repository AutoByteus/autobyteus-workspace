import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";

export type CodexReadyTurnTokenUsage = {
  turnId: string;
  runtime_kind: "codex_app_server";
  ingestion_kind: "codex_thread_token_usage";
  usage_scope: "per_turn" | "cumulative_snapshot";
  snapshot_series_key: string | null;
  idempotency_key: string;
  reported_input_tokens: number | null;
  reported_output_tokens: number | null;
  reported_total_tokens: number | null;
  model_provider: string | null;
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

export const resolveCodexThreadTokenUsage = (input: {
  params: JsonObject;
  runId: string;
  turnId: string;
  threadId: string;
  model: string | null;
}): CodexReadyTurnTokenUsage | null => {
  const tokenUsage = asObject(input.params.tokenUsage);
  const last = asObject(tokenUsage?.last);
  const total = asObject(tokenUsage?.total);
  const selected = last ?? total;
  if (!selected) {
    return null;
  }

  const inputTokens = asNonNegativeInt(selected.inputTokens ?? selected.input_tokens);
  const outputTokens = asNonNegativeInt(selected.outputTokens ?? selected.output_tokens);
  const explicitTotalTokens = asNonNegativeInt(selected.totalTokens ?? selected.total_tokens);
  const totalTokens = explicitTotalTokens ?? (
    inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null
  );
  if (inputTokens === null && outputTokens === null && totalTokens === null) {
    return null;
  }

  const scope = last ? "per_turn" : "cumulative_snapshot";
  const threadKey = input.threadId || input.runId;
  const eventId =
    asString(input.params.eventId) ??
    asString(input.params.event_id) ??
    asString(input.params.id) ??
    [input.runId, threadKey, input.turnId, scope, inputTokens ?? "x", outputTokens ?? "x", totalTokens ?? "x"].join(":");

  const qualityFlags: string[] = [];
  if (inputTokens === null) qualityFlags.push("reported_input_tokens_missing");
  if (outputTokens === null) qualityFlags.push("reported_output_tokens_missing");
  if (totalTokens === null) qualityFlags.push("reported_total_tokens_missing");

  return {
    turnId: input.turnId,
    runtime_kind: "codex_app_server",
    ingestion_kind: "codex_thread_token_usage",
    usage_scope: scope,
    snapshot_series_key: scope === "cumulative_snapshot" ? `codex_thread:${threadKey}` : null,
    idempotency_key: `codex_token_usage:${eventId}`,
    reported_input_tokens: inputTokens,
    reported_output_tokens: outputTokens,
    reported_total_tokens: totalTokens,
    model_provider: "OPENAI",
    model_identifier: input.model,
    model_value: input.model,
    raw_usage_json: cloneRecord(selected),
    raw_event_json: cloneRecord(input.params),
    quality_flags: qualityFlags,
  };
};
