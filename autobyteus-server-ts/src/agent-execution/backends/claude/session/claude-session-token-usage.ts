import { asObject, asString, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";

const asNonNegativeInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

const cloneRecord = (value: unknown): Record<string, unknown> | null => {
  const record = asObject(value);
  return record ? JSON.parse(JSON.stringify(record)) as Record<string, unknown> : null;
};

const firstRecord = (...values: unknown[]): Record<string, unknown> | null => {
  for (const value of values) {
    const record = asObject(value);
    if (record) return record;
  }
  return null;
};

export const buildClaudeTokenUsageEvent = (input: {
  chunk: unknown;
  runId: string;
  turnId: string;
  sessionId: string;
  model: string;
}): ClaudeSessionEvent | null => {
  const payload = asObject(input.chunk);
  if (!payload) return null;
  const usage = firstRecord(
    payload.usage,
    payload.modelUsage,
    payload.model_usage,
    asObject(payload.result)?.usage,
    asObject(payload.message)?.usage,
  );
  if (!usage) return null;

  const inputTokens = asNonNegativeInt(
    usage.input_tokens ?? usage.inputTokens ?? usage.prompt_tokens ?? usage.promptTokens,
  );
  const outputTokens = asNonNegativeInt(
    usage.output_tokens ?? usage.outputTokens ?? usage.completion_tokens ?? usage.completionTokens,
  );
  const explicitTotalTokens = asNonNegativeInt(usage.total_tokens ?? usage.totalTokens);
  const totalTokens = explicitTotalTokens ?? (
    inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null
  );
  if (inputTokens === null && outputTokens === null && totalTokens === null) return null;

  const cacheCreation = asNonNegativeInt(
    usage.cache_creation_input_tokens ?? usage.cacheCreationInputTokens ?? usage.cache_creation_tokens,
  );
  const cacheRead = asNonNegativeInt(
    usage.cache_read_input_tokens ?? usage.cacheReadInputTokens ?? usage.cache_read_tokens,
  );
  const model = asString(payload.model) ?? asString(usage.model) ?? input.model;
  const eventKey = [input.runId, input.sessionId, input.turnId, model, inputTokens ?? "x", outputTokens ?? "x", totalTokens ?? "x"].join(":");
  const qualityFlags: string[] = [];
  if (inputTokens === null) qualityFlags.push("reported_input_tokens_missing");
  if (outputTokens === null) qualityFlags.push("reported_output_tokens_missing");
  if (totalTokens === null) qualityFlags.push("reported_total_tokens_missing");

  return {
    method: ClaudeSessionEventName.TOKEN_USAGE_UPDATED,
    params: {
      turn_id: input.turnId,
      session_id: input.sessionId,
      idempotency_key: `claude_sdk_usage:${eventKey}`,
      runtime_kind: "claude_agent_sdk",
      ingestion_kind: "claude_sdk_result",
      usage_scope: "per_turn",
      model_provider: "ANTHROPIC",
      model_identifier: model,
      model_value: model,
      reported_input_tokens: inputTokens,
      reported_output_tokens: outputTokens,
      reported_total_tokens: totalTokens,
      cache_creation_input_tokens: cacheCreation,
      cache_read_input_tokens: cacheRead,
      raw_usage_json: cloneRecord(usage),
      raw_event_json: cloneRecord(payload),
      quality_flags: qualityFlags,
    },
  };
};

export const emitClaudeTokenUsageEvent = (
  chunk: unknown,
  runId: string,
  turnId: string,
  sessionId: string,
  model: string,
  emitEvent: (event: ClaudeSessionEvent) => void,
): void => {
  const event = buildClaudeTokenUsageEvent({ chunk, runId, turnId, sessionId, model });
  if (event) emitEvent(event);
};
