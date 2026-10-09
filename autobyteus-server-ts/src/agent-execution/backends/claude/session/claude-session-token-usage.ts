import { asObject, asString, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import type { ClaudeSdkQueryKind, ClaudeSdkSelectedBinding, ClaudeSdkSelectedMatchState } from "../../../domain/claude-sdk-usage.js";
import { parseClaudeSdkResultUsage } from "./claude-sdk-result-usage-parser.js";

/**
 * `modelUsage` is cumulative per streaming session. A crash/startup-error result may carry
 * zeroed totals (SDK doc); forwarding them would reset the reconciler baseline and make the
 * next result count the whole session again (RSK-007), so such results are not usage.
 */
const isZeroedErrorResult = (
  result: Record<string, unknown>,
  models: ReturnType<typeof parseClaudeSdkResultUsage>["models"],
): boolean =>
  asString(result.subtype) !== "success" && models.length > 0 && models.every((row) =>
    row.inputTokens === 0 && row.outputTokens === 0 &&
    row.cacheReadInputTokens === 0 && row.cacheCreationInputTokens === 0);

/**
 * One sanitized turn-end observation: reconciliation only (D-3). It carries cumulative
 * `modelUsage` for the fold's remainder; it is not a model call and carries no context reading.
 */
export const buildClaudeTokenUsageEvent = (input: {
  chunk: unknown;
  runId: string;
  turnId: string;
  sessionId: string;
  model: string;
  queryKind?: ClaudeSdkQueryKind;
  selectedBinding?: ClaudeSdkSelectedBinding;
}): ClaudeSessionEvent | null => {
  const chunk = asObject(input.chunk);
  if (!chunk) return null;
  const result = asObject(chunk.result) ?? chunk;
  if (asString(result.type)?.toLowerCase() !== "result") return null;

  const parsed = parseClaudeSdkResultUsage(result);
  if (isZeroedErrorResult(result, parsed.models)) return null;
  const binding = input.selectedBinding;
  const selectedRawId = binding?.selectedModelValue === input.model ? binding.selectedResolvedRawModelId : null;
  const selectedRows = selectedRawId ? parsed.models.filter((row) => row.rawModelId === selectedRawId) : [];
  const selectedMatchState: ClaudeSdkSelectedMatchState = binding?.resolution === "ambiguous"
    ? "ambiguous" : selectedRows.length === 1 ? "matched" : "missing";
  const selectedModel = selectedMatchState === "matched"
    ? selectedRows[0]!.canonicalModel ?? selectedRows[0]!.rawModelId : null;
  const resultId = asString(result.uuid) ?? asString(result.id) ?? asString(result.result_id);
  const stableIdentity = resultId ?? `${input.runId}:${input.sessionId}:${input.turnId}`;
  const qualityFlags = [...parsed.qualityFlags];
  if (parsed.models.length === 0) qualityFlags.push("claude_sdk_usage_unattributed");
  if (selectedMatchState !== "matched") qualityFlags.push(`claude_sdk_selected_model_${selectedMatchState}`);
  return {
    method: ClaudeSessionEventName.TOKEN_USAGE_UPDATED,
    params: {
      turn_id: input.turnId,
      session_id: input.sessionId,
      idempotency_key: `claude_sdk_result:${stableIdentity}`,
      runtime_kind: "claude_agent_sdk",
      ingestion_kind: "claude_sdk_result",
      usage_scope: "per_turn",
      reports_model_call: false,
      model_provider: "ANTHROPIC",
      provider_name: null,
      selected_model_context: input.model,
      model_identifier: selectedModel,
      model_value: selectedModel,
      selected_model_value: input.model,
      selected_resolved_raw_model_id: selectedRawId,
      selected_match_state: selectedMatchState,
      claude_sdk_model_usage: parsed.models,
      claude_sdk_session_id: input.sessionId,
      claude_sdk_query_kind: input.queryKind ?? "unknown",
      reported_input_tokens: null,
      reported_output_tokens: null,
      reported_total_tokens: null,
      latest_prompt_tokens: null,
      effective_context_window_tokens: null,
      context_window_usage_percent: null,
      context_compaction_threshold_tokens: null,
      raw_usage_json: null,
      raw_event_json: null,
      quality_flags: qualityFlags,
    },
  };
};

/** Emits the usage observation for `chunk`; returns whether an event was emitted (IC-5). */
export const emitClaudeTokenUsageEvent = (
  chunk: unknown,
  runId: string,
  turnId: string,
  sessionId: string,
  model: string,
  queryKind: ClaudeSdkQueryKind,
  selectedBinding: ClaudeSdkSelectedBinding,
  emitEvent: (event: ClaudeSessionEvent) => void,
  seriesRestart = false,
): boolean => {
  const event = buildClaudeTokenUsageEvent({ chunk, runId, turnId, sessionId, model, queryKind, selectedBinding });
  if (!event) return false;
  emitEvent(seriesRestart ? { ...event, params: { ...event.params, claude_sdk_series_restart: true } } : event);
  return true;
};
