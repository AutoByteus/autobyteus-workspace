import { asObject, asString, logger, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import type { ClaudeSdkContextUsage } from "../../../../runtime-management/claude/client/claude-sdk-streaming-session.js";

const countOf = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

type OpenMessage = Readonly<{
  id: string;
  model: string | null;
  cacheCreation5m: number | null;
  cacheCreation1h: number | null;
}>;

export type ClaudeCallUsageTrackerInput = Readonly<{
  runId: string;
  getSessionId(): string;
  getActiveTurnId(): string | null;
  /** The open process's SDK context read (`ClaudeSdkStreamingSession.readContextUsage`). */
  readContextUsage(): Promise<ClaudeSdkContextUsage | null>;
  emitEvent(event: ClaudeSessionEvent): void;
}>;

/** One main-loop `stream_event` frame, or null for any other frame (subagent frames included). */
const mainLoopStreamEvent = (frame: unknown): Record<string, unknown> | null => {
  const payload = asObject(frame);
  if (payload?.type !== "stream_event" || payload.parent_tool_use_id != null) return null;
  return asObject(payload.event);
};

/**
 * Pairs each main-loop `message_start` (API response model and cache-write TTL split) with its
 * `message_delta` (final usage) and emits one `claude_sdk_call` model-call observation carrying
 * the SDK's own context reading (D-1, D-2). `observe` resolves only after that emission, so the
 * awaiting frame pump never handles a later frame (in particular `result`) first (D-10).
 */
export class ClaudeCallUsageTracker {
  private openMessage: OpenMessage | null = null;

  constructor(private readonly input: ClaudeCallUsageTrackerInput) {}

  /** Forgets an unfinished message; called when a CLI process opens or exits. */
  reset(): void {
    this.openMessage = null;
  }

  async observe(frame: unknown): Promise<void> {
    const event = mainLoopStreamEvent(frame);
    if (event?.type === "message_start") {
      const message = asObject(event.message);
      const id = asString(message?.id);
      const cacheCreation = asObject(asObject(message?.usage)?.cache_creation);
      this.openMessage = id ? {
        id,
        model: asString(message?.model),
        cacheCreation5m: countOf(cacheCreation?.ephemeral_5m_input_tokens),
        cacheCreation1h: countOf(cacheCreation?.ephemeral_1h_input_tokens),
      } : null;
      return;
    }
    if (event?.type !== "message_delta") return;
    const message = this.openMessage;
    this.openMessage = null;
    const usage = asObject(event.usage);
    const input = countOf(usage?.input_tokens);
    const output = countOf(usage?.output_tokens);
    if (!message || !usage || input === null || output === null) {
      logger.warn(`Claude run '${this.input.runId}' dropped a message_delta without a paired message_start or usage.`);
      return;
    }
    const cacheRead = countOf(usage.cache_read_input_tokens) ?? 0;
    const cacheCreation = countOf(usage.cache_creation_input_tokens) ?? 0;
    const splitMatches = message.cacheCreation5m !== null && message.cacheCreation1h !== null &&
      message.cacheCreation5m + message.cacheCreation1h === cacheCreation;
    const reading = await this.input.readContextUsage();
    const sessionId = this.input.getSessionId();
    const window = reading?.rawMaxTokens ?? null;
    this.input.emitEvent({
      method: ClaudeSessionEventName.TOKEN_USAGE_UPDATED,
      params: {
        turn_id: this.input.getActiveTurnId(),
        session_id: sessionId,
        idempotency_key: `claude_sdk_call:${sessionId}:${message.id}`,
        llm_call_id: message.id,
        runtime_kind: "claude_agent_sdk",
        ingestion_kind: "claude_sdk_call",
        usage_scope: "per_call",
        reports_model_call: true,
        model_provider: "ANTHROPIC",
        provider_name: null,
        model_identifier: message.model,
        model_value: message.model,
        claude_sdk_session_id: sessionId,
        input_token_semantic: "base_excludes_cache",
        reported_input_tokens: input,
        reported_output_tokens: output,
        reported_total_tokens: input + cacheRead + cacheCreation + output,
        cache_read_input_tokens: cacheRead,
        cache_creation_input_tokens: cacheCreation,
        cache_creation_5m_input_tokens: splitMatches ? message.cacheCreation5m : null,
        cache_creation_1h_input_tokens: splitMatches ? message.cacheCreation1h : null,
        cache_state: cacheRead + cacheCreation > 0 ? "positive" : "zero_reported",
        reasoning_output_tokens: countOf(asObject(usage.output_tokens_details)?.thinking_tokens),
        latest_prompt_tokens: reading?.totalTokens ?? null,
        effective_context_window_tokens: window,
        context_window_usage_percent: reading && window ? 100 * (reading.totalTokens / window) : null,
        context_compaction_threshold_tokens: reading?.autoCompactThreshold ?? null,
        raw_usage_json: null,
        raw_event_json: null,
        quality_flags: reading ? [] : ["claude_sdk_context_usage_unavailable"],
      },
    });
  }
}
