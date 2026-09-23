import { asObject, asString, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import type { ClaudeSdkQueryKind, ClaudeSdkSelectedBinding, ClaudeSdkSelectedMatchState } from "../../../domain/claude-sdk-usage.js";
import { parseClaudeSdkResultUsage } from "./claude-sdk-result-usage-parser.js";

const countOf = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

/** One sanitized, result-level observation. Main-loop usage is context only. */
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
  const binding = input.selectedBinding;
  const selectedRawId = binding?.selectedModelValue === input.model ? binding.selectedResolvedRawModelId : null;
  const selectedRows = selectedRawId ? parsed.models.filter((row) => row.rawModelId === selectedRawId) : [];
  const selectedMatchState: ClaudeSdkSelectedMatchState = binding?.resolution === "ambiguous"
    ? "ambiguous" : selectedRows.length === 1 ? "matched" : "missing";
  const selectedModel = selectedMatchState === "matched"
    ? selectedRows[0]!.canonicalModel ?? selectedRows[0]!.rawModelId : null;
  const latestUsage = asObject(result.usage);
  const cacheCreationDetail = asObject(latestUsage?.cache_creation);
  const mainInput = countOf(latestUsage?.input_tokens ?? latestUsage?.inputTokens);
  const mainOutput = countOf(latestUsage?.output_tokens ?? latestUsage?.outputTokens);
  const cacheRead = countOf(latestUsage?.cache_read_input_tokens ?? latestUsage?.cacheReadInputTokens);
  const cacheCreation = countOf(latestUsage?.cache_creation_input_tokens ?? latestUsage?.cacheCreationInputTokens);
  const cacheCreation5m = countOf(cacheCreationDetail?.ephemeral_5m_input_tokens);
  const cacheCreation1h = countOf(cacheCreationDetail?.ephemeral_1h_input_tokens);
  const mainLoopUsage = { inputTokens: mainInput, outputTokens: mainOutput,
    cacheReadInputTokens: cacheRead, cacheCreationInputTokens: cacheCreation,
    cacheCreation5mInputTokens: cacheCreation5m, cacheCreation1hInputTokens: cacheCreation1h };
  const latestPromptTokens = mainInput === null ? null : mainInput + (cacheRead ?? 0) + (cacheCreation ?? 0);
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
      model_provider: "ANTHROPIC",
      provider_name: null,
      selected_model_context: input.model,
      model_identifier: selectedModel,
      model_value: selectedModel,
      selected_model_value: input.model,
      selected_resolved_raw_model_id: selectedRawId,
      selected_match_state: selectedMatchState,
      claude_sdk_model_usage: parsed.models,
      claude_sdk_main_loop_usage: mainLoopUsage,
      claude_sdk_session_id: input.sessionId,
      claude_sdk_query_kind: input.queryKind ?? "unknown",
      reported_input_tokens: null,
      reported_output_tokens: null,
      reported_total_tokens: null,
      latest_prompt_tokens: latestPromptTokens,
      effective_context_window_tokens: selectedMatchState === "matched"
        ? countOf(asObject(asObject(result.modelUsage)?.[selectedRawId!])?.contextWindow)
        : null,
      raw_usage_json: null,
      raw_event_json: null,
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
  queryKind: ClaudeSdkQueryKind,
  selectedBinding: ClaudeSdkSelectedBinding,
  emitEvent: (event: ClaudeSessionEvent) => void,
): void => {
  const event = buildClaudeTokenUsageEvent({ chunk, runId, turnId, sessionId, model, queryKind, selectedBinding });
  if (event) emitEvent(event);
};
