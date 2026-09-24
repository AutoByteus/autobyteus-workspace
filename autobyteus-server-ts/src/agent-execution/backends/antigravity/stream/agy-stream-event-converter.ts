import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import { agyRecord, agyString, type AgyStreamMessage } from "./agy-stream-message.js";

const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const denial = (error: string): boolean => /permission|denied|not allowed|approval/i.test(error);

export class AgyStreamEventConverter {
  private turnId: string | null = null;
  private readonly textSteps = new Set<number>();
  private readonly textOpen = new Set<number>();
  private readonly toolStarts = new Set<number>();
  private readonly toolTerminals = new Set<number>();
  private textSeen = false;

  constructor(private readonly runId: string, private readonly conversationId: string, private readonly model: string) {}

  startTurn(turnId: string): AgentRunEvent[] {
    if (this.turnId) throw new Error("AGY_TURN_ALREADY_ACTIVE");
    this.turnId = turnId;
    this.textSteps.clear(); this.textOpen.clear(); this.toolStarts.clear(); this.toolTerminals.clear(); this.textSeen = false;
    return [this.event(AgentRunEventType.TURN_STARTED, { turn_id: turnId })];
  }

  convert(message: AgyStreamMessage): AgentRunEvent[] {
    if (message.event === "init") return [];
    const payload = message.event === "result" ? message.result : message.step_update;
    if (agyString(payload.conversation_id) !== this.conversationId)
      throw new Error("AGY_CONVERSATION_ID_CONFLICT: provider event belongs to another conversation.");
    const turnId = this.turnId;
    if (!turnId) throw new Error("AGY_UNEXPECTED_EVENT_OUTSIDE_TURN");
    if (message.event === "result") return this.result(payload, turnId);
    const stepIndex = number(payload.step_index);
    const stepType = agyString(payload.step_type);
    const state = agyString(payload.state);
    if (stepIndex === null || !stepType || !state) throw new Error("AGY_STREAM_INVALID_STEP");
    if (stepType === "agent_response") return this.agentResponse(payload, turnId, stepIndex, state);
    if (stepType === "tool") return this.tool(payload, turnId, stepIndex, state);
    return [];
  }

  interrupt(): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) return [];
    const events = this.closeText(turnId);
    events.push(this.event(AgentRunEventType.TURN_INTERRUPTED, { turn_id: turnId }));
    this.turnId = null;
    return events;
  }

  private agentResponse(payload: Record<string, unknown>, turnId: string, stepIndex: number, state: string): AgentRunEvent[] {
    const events: AgentRunEvent[] = [];
    const delta = agyString(payload.text_delta);
    const id = `agy-text-${turnId}-${stepIndex}`;
    if (delta) {
      if (!this.textSteps.has(stepIndex)) {
        this.textSteps.add(stepIndex); this.textOpen.add(stepIndex);
        events.push(this.event(AgentRunEventType.SEGMENT_START, { id, segment_type: "text", turn_id: turnId }));
      }
      this.textSeen = true;
      events.push(this.event(AgentRunEventType.SEGMENT_CONTENT, { id, turn_id: turnId, delta }));
    }
    if (state === "DONE" && this.textOpen.delete(stepIndex))
      events.push(this.event(AgentRunEventType.SEGMENT_END, { id, turn_id: turnId }));
    return events;
  }

  private tool(payload: Record<string, unknown>, turnId: string, stepIndex: number, state: string): AgentRunEvent[] {
    if (state !== "ACTIVE" && state !== "DONE" && state !== "ERROR") throw new Error(`AGY_STREAM_INVALID_TOOL_STATE: ${state}`);
    if (this.toolTerminals.has(stepIndex)) return [];
    const info = agyRecord(payload.tool_info);
    const name = agyString(payload.tool_name) ?? agyString(info?.name);
    if (!name) throw new Error("AGY_STREAM_INVALID_TOOL_NAME");
    const args = agyRecord(info?.parameters) ?? {};
    const invocationId = `agy-tool-${turnId}-${stepIndex}`;
    const common = { turn_id: turnId, invocation_id: invocationId, tool_name: name, arguments: args };
    const events: AgentRunEvent[] = [];
    if (!this.toolStarts.has(stepIndex)) {
      this.toolStarts.add(stepIndex);
      events.push(this.event(AgentRunEventType.TOOL_EXECUTION_STARTED, common));
    }
    if (state === "ACTIVE") return events;
    this.toolTerminals.add(stepIndex);
    if (state === "DONE") {
      events.push(this.event(AgentRunEventType.TOOL_EXECUTION_COMPLETED, {
        ...common, result: { status: "completed_unverified", output: info?.output ?? null }, provider_state: "DONE", outcome: "unverified",
      }));
    } else if (state === "ERROR") {
      const error = agyRecord(info?.error);
      const message = agyString(error?.message) ?? agyString(info?.error) ?? "Antigravity tool failed.";
      events.push(this.event(denial(message) ? AgentRunEventType.TOOL_DENIED : AgentRunEventType.TOOL_EXECUTION_FAILED,
        { ...common, error: message, reason: message, provider_state: "ERROR" }, "ERROR"));
    }
    return events;
  }

  private result(payload: Record<string, unknown>, turnId: string): AgentRunEvent[] {
    const events = this.closeText(turnId);
    const response = agyString(payload.response);
    if (!this.textSeen && response) {
      const id = `agy-text-${turnId}-result`;
      events.push(this.event(AgentRunEventType.SEGMENT_START, { id, segment_type: "text", turn_id: turnId }));
      events.push(this.event(AgentRunEventType.SEGMENT_CONTENT, { id, turn_id: turnId, delta: response }));
      events.push(this.event(AgentRunEventType.SEGMENT_END, { id, turn_id: turnId }));
    }
    const usage = agyRecord(payload.usage);
    if (usage) events.push(this.event(AgentRunEventType.TOKEN_USAGE_UPDATED, {
      turn_id: turnId,
      idempotency_key: `agy:${this.conversationId}:${number(payload.num_turns) ?? turnId}`,
      runtime_kind: "antigravity_cli", ingestion_kind: "agy_result",
      usage_scope: "cumulative_snapshot", snapshot_series_key: this.conversationId,
      model_identifier: this.model, model_value: this.model,
      model_provider: this.model.startsWith("claude-") ? "ANTHROPIC" : this.model.startsWith("gpt-") ? "OPENAI" : "GEMINI",
      provider_name: "Antigravity CLI",
      reported_input_tokens: number(usage.input_tokens),
      reported_output_tokens: number(usage.output_tokens),
      reported_total_tokens: number(usage.total_tokens),
      input_token_semantic: "gross_includes_cache",
      cache_read_input_tokens: number(usage.cache_read_tokens),
      cache_state: number(usage.cache_read_tokens) === null ? "not_reported" : number(usage.cache_read_tokens)! > 0 ? "positive" : "zero_reported",
      reasoning_output_tokens: number(usage.thinking_tokens),
      raw_usage_json: usage,
      quality_flags: ["agy_provider_reported_cumulative_usage"],
    }));
    const status = agyString(payload.status);
    if (status && status !== "SUCCESS") events.push(this.event(AgentRunEventType.ERROR,
      { turn_id: turnId, code: "AGY_TURN_ERROR", message: agyString(payload.error) ?? `Antigravity turn ended with ${status}.` }, "ERROR"));
    events.push(this.event(AgentRunEventType.TURN_COMPLETED, { turn_id: turnId, provider_status: status ?? "UNKNOWN" }, status === "SUCCESS" ? "IDLE" : "ERROR"));
    this.turnId = null;
    return events;
  }

  private closeText(turnId: string): AgentRunEvent[] {
    const events = [...this.textOpen].map((stepIndex) => this.event(AgentRunEventType.SEGMENT_END,
      { id: `agy-text-${turnId}-${stepIndex}`, turn_id: turnId }));
    this.textOpen.clear();
    return events;
  }

  private event(eventType: AgentRunEventType, payload: Record<string, unknown>, statusHint: AgentRunEvent["statusHint"] = null): AgentRunEvent {
    return { eventType, runId: this.runId, payload, statusHint };
  }
}
