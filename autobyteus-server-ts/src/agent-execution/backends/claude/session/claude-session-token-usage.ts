import { asObject, asString, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";

const asNonNegativeInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

const cloneRecord = (value: unknown): Record<string, unknown> | null => {
  const record = asObject(value);
  return record ? JSON.parse(JSON.stringify(record)) as Record<string, unknown> : null;
};

const firstNonNegativeInt = (...values: unknown[]): number | null => {
  for (const value of values) {
    const number = asNonNegativeInt(value);
    if (number !== null) return number;
  }
  return null;
};

const firstRecord = (...values: unknown[]): Record<string, unknown> | null => {
  for (const value of values) {
    const record = asObject(value);
    if (record) return record;
  }
  return null;
};

const percentOf = (numerator: number | null, denominator: number | null): number | null =>
  numerator !== null && denominator !== null && denominator > 0 ? (numerator / denominator) * 100 : null;

const hasTokenUsageShape = (record: Record<string, unknown>): boolean =>
  firstNonNegativeInt(
    record.input_tokens,
    record.inputTokens,
    record.prompt_tokens,
    record.promptTokens,
    record.output_tokens,
    record.outputTokens,
    record.completion_tokens,
    record.completionTokens,
    record.cache_creation_input_tokens,
    record.cacheCreationInputTokens,
    record.cache_read_input_tokens,
    record.cacheReadInputTokens,
  ) !== null;

const resolveModelUsageRecord = (
  value: unknown,
  preferredModel: string,
): { model: string | null; usage: Record<string, unknown> | null } => {
  const record = asObject(value);
  if (!record) return { model: null, usage: null };
  if (hasTokenUsageShape(record)) return { model: null, usage: record };

  const preferredUsage = asObject(record[preferredModel]);
  if (preferredUsage) return { model: preferredModel, usage: preferredUsage };

  for (const [model, usage] of Object.entries(record)) {
    const usageRecord = asObject(usage);
    if (usageRecord) return { model, usage: usageRecord };
  }
  return { model: null, usage: null };
};

const resolveThinkingTokens = (
  usage: Record<string, unknown>,
  modelUsage: Record<string, unknown> | null,
): number | null => {
  const outputDetails = firstRecord(
    usage.output_tokens_details,
    usage.outputTokensDetails,
    usage.completion_tokens_details,
    usage.completionTokensDetails,
  );
  const modelOutputDetails = firstRecord(
    modelUsage?.output_tokens_details,
    modelUsage?.outputTokensDetails,
    modelUsage?.completion_tokens_details,
    modelUsage?.completionTokensDetails,
  );

  return firstNonNegativeInt(
    outputDetails?.thinking_tokens,
    outputDetails?.thinkingTokens,
    outputDetails?.reasoning_tokens,
    outputDetails?.reasoningTokens,
    usage.thinking_tokens,
    usage.thinkingTokens,
    usage.reasoning_output_tokens,
    usage.reasoningOutputTokens,
    usage.reasoning_tokens,
    usage.reasoningTokens,
    modelOutputDetails?.thinking_tokens,
    modelOutputDetails?.thinkingTokens,
    modelOutputDetails?.reasoning_tokens,
    modelOutputDetails?.reasoningTokens,
    modelUsage?.thinking_tokens,
    modelUsage?.thinkingTokens,
    modelUsage?.reasoning_output_tokens,
    modelUsage?.reasoningOutputTokens,
    modelUsage?.reasoning_tokens,
    modelUsage?.reasoningTokens,
  );
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

  const terminalResult = asObject(payload.result) ?? payload;
  if (asString(terminalResult.type)?.toLowerCase() !== "result") return null;

  const modelUsageInfo = resolveModelUsageRecord(
    terminalResult.modelUsage ?? terminalResult.model_usage ?? payload.modelUsage ?? payload.model_usage,
    input.model,
  );
  const usage = firstRecord(
    terminalResult.usage,
    payload.usage,
    modelUsageInfo.usage,
  );
  if (!usage) return null;

  const modelUsage = modelUsageInfo.usage;
  const inputTokens = firstNonNegativeInt(
    usage.input_tokens,
    usage.inputTokens,
    usage.prompt_tokens,
    usage.promptTokens,
    modelUsage?.input_tokens,
    modelUsage?.inputTokens,
    modelUsage?.prompt_tokens,
    modelUsage?.promptTokens,
  );
  const outputTokens = firstNonNegativeInt(
    usage.output_tokens,
    usage.outputTokens,
    usage.completion_tokens,
    usage.completionTokens,
    modelUsage?.output_tokens,
    modelUsage?.outputTokens,
    modelUsage?.completion_tokens,
    modelUsage?.completionTokens,
  );
  const explicitTotalTokens = firstNonNegativeInt(usage.total_tokens, usage.totalTokens, modelUsage?.total_tokens, modelUsage?.totalTokens);
  const totalTokens = explicitTotalTokens ?? (
    inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null
  );
  if (inputTokens === null && outputTokens === null && totalTokens === null) return null;

  const cacheCreation = firstNonNegativeInt(
    usage.cache_creation_input_tokens,
    usage.cacheCreationInputTokens,
    usage.cache_creation_tokens,
    modelUsage?.cache_creation_input_tokens,
    modelUsage?.cacheCreationInputTokens,
    modelUsage?.cache_creation_tokens,
  );
  const cacheRead = firstNonNegativeInt(
    usage.cache_read_input_tokens,
    usage.cacheReadInputTokens,
    usage.cache_read_tokens,
    modelUsage?.cache_read_input_tokens,
    modelUsage?.cacheReadInputTokens,
    modelUsage?.cache_read_tokens,
  );
  const cacheCreation5m = firstNonNegativeInt(
    usage.cache_creation_5m_input_tokens,
    usage.cacheCreation5mInputTokens,
    modelUsage?.cache_creation_5m_input_tokens,
    modelUsage?.cacheCreation5mInputTokens,
  );
  const cacheCreation1h = firstNonNegativeInt(
    usage.cache_creation_1h_input_tokens,
    usage.cacheCreation1hInputTokens,
    modelUsage?.cache_creation_1h_input_tokens,
    modelUsage?.cacheCreation1hInputTokens,
  );
  const reasoningTokens = resolveThinkingTokens(usage, modelUsage);
  const latestPromptTokens = inputTokens === null ? null : inputTokens + (cacheCreation ?? 0) + (cacheRead ?? 0);
  const contextWindowTokens = firstNonNegativeInt(
    modelUsage?.contextWindow,
    modelUsage?.context_window,
    usage.contextWindow,
    usage.context_window,
  );
  const model = asString(terminalResult.model) ?? asString(payload.model) ?? asString(usage.model) ?? modelUsageInfo.model ?? input.model;
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
      input_token_semantic: "base_excludes_cache",
      cache_state: cacheRead === null && cacheCreation === null && cacheCreation5m === null && cacheCreation1h === null
        ? "not_reported"
        : ([cacheRead, cacheCreation, cacheCreation5m, cacheCreation1h].some((value) => (value ?? 0) > 0) ? "positive" : "zero_reported"),
      standard_input_tokens: inputTokens,
      cache_creation_input_tokens: cacheCreation,
      cache_creation_5m_input_tokens: cacheCreation5m,
      cache_creation_1h_input_tokens: cacheCreation1h,
      cache_read_input_tokens: cacheRead,
      reasoning_output_tokens: reasoningTokens,
      latest_prompt_tokens: latestPromptTokens,
      effective_context_window_tokens: contextWindowTokens,
      context_window_usage_percent: percentOf(latestPromptTokens, contextWindowTokens),
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
