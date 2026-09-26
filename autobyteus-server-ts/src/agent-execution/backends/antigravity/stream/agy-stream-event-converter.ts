import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import { agyRecord, agyString, type AgyStreamMessage } from "./agy-stream-message.js";
import type { AgyNativeImageFailureDiagnostic } from "./agy-native-image-diagnostic-sink.js";

const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const denial = (error: string): boolean => /permission|denied|not allowed|approval/i.test(error);
const imageFailureMessage = "Antigravity image generation did not produce an accessible image. No image was added to this run.";
export type AgyPendingNativeImage = Readonly<{ turnId: string; stepIndex: number; invocationId: string }>;
type DeferredItem = AgentRunEvent | { imageStep: number };

export class AgyStreamEventConverter {
  private turnId: string | null = null;
  private readonly textSteps = new Set<number>();
  private readonly textOpen = new Set<number>();
  private readonly toolStarts = new Set<number>();
  private readonly toolTerminals = new Set<number>();
  private textSeen = false;
  private nativeImageFailed = false;
  private readonly pendingImages: AgyPendingNativeImage[] = [];
  private readonly deferred: DeferredItem[] = [];

  constructor(private readonly runId: string, private readonly conversationId: string, private readonly model: string,
    private readonly onNativeImageFailure?: (diagnostic: AgyNativeImageFailureDiagnostic) => void) {}

  startTurn(turnId: string): AgentRunEvent[] {
    if (this.turnId) throw new Error("AGY_TURN_ALREADY_ACTIVE");
    this.turnId = turnId;
    this.textSteps.clear(); this.textOpen.clear(); this.toolStarts.clear(); this.toolTerminals.clear(); this.textSeen = false; this.nativeImageFailed = false;
    this.pendingImages.length = 0; this.deferred.length = 0;
    return [this.event(AgentRunEventType.TURN_STARTED, { turn_id: turnId })];
  }

  getPendingNativeImages(): readonly AgyPendingNativeImage[] { return [...this.pendingImages]; }

  convert(message: AgyStreamMessage): AgentRunEvent[] {
    if (message.event === "init") return [];
    const payload = message.event === "result" ? message.result : message.step_update;
    if (agyString(payload.conversation_id) !== this.conversationId)
      throw new Error("AGY_CONVERSATION_ID_CONFLICT: provider event belongs to another conversation.");
    const turnId = this.turnId;
    if (!turnId) throw new Error("AGY_UNEXPECTED_EVENT_OUTSIDE_TURN");
    if (message.event === "result") return this.pendingImages.length ? [] : this.completeResult(payload, new Map());
    const stepIndex = number(payload.step_index);
    const stepType = agyString(payload.step_type);
    const state = agyString(payload.state);
    if (stepIndex === null || !stepType || !state) throw new Error("AGY_STREAM_INVALID_STEP");
    const pendingCount = this.pendingImages.length;
    const hadPending = pendingCount > 0;
    const events = stepType === "agent_response" ? this.agentResponse(payload, turnId, stepIndex, state)
      : stepType === "tool" ? this.tool(payload, turnId, stepIndex, state) : [];
    if (hadPending) this.deferred.push(...events);
    if (this.pendingImages.length > pendingCount) {
      const pending = this.pendingImages.at(-1)!;
      this.deferred.push({ imageStep: pending.stepIndex });
    }
    return hadPending ? [] : events;
  }

  interrupt(): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) return [];
    const firstImageStep = this.pendingImages[0]?.stepIndex ?? Number.POSITIVE_INFINITY;
    const events = this.closeText(turnId).filter((item) =>
      Number(String(item.payload.id).split("-").at(-1)) < firstImageStep);
    for (const pending of this.pendingImages) events.push(this.failedImage(pending, "INTERRUPTED"));
    events.push(this.event(AgentRunEventType.TURN_INTERRUPTED, { turn_id: turnId }));
    this.turnId = null;
    this.pendingImages.length = 0; this.deferred.length = 0;
    return events;
  }

  private agentResponse(payload: Record<string, unknown>, turnId: string, stepIndex: number, state: string): AgentRunEvent[] {
    const events: AgentRunEvent[] = [];
    if (this.nativeImageFailed) return events;
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
    const nativeImage = name === "generate_image";
    const args = nativeImage ? {} : agyRecord(info?.parameters) ?? {};
    const invocationId = `agy-tool-${turnId}-${stepIndex}`;
    const common = { turn_id: turnId, invocation_id: invocationId, tool_name: name, arguments: args };
    const events: AgentRunEvent[] = [];
    if (!this.toolStarts.has(stepIndex)) {
      this.toolStarts.add(stepIndex);
      events.push(this.event(AgentRunEventType.TOOL_EXECUTION_STARTED, common));
    }
    if (state === "ACTIVE") return events;
    this.toolTerminals.add(stepIndex);
    const explicitError = agyRecord(info?.error)?.message ?? info?.error;
    if (nativeImage && (state === "ERROR" || explicitError !== undefined && explicitError !== null)) {
      this.nativeImageFailed = true;
      this.onNativeImageFailure?.({ runId: this.runId, turnId, invocationId, providerState: state,
        providerError: info?.error, providerOutput: info?.output });
      const denied = denial(String(explicitError ?? ""));
      const message = denied
        ? "Antigravity denied this image-generation request. No image was added to this run."
        : "Antigravity image generation failed. No image was added to this run.";
      events.push(this.event(denied ? AgentRunEventType.TOOL_DENIED : AgentRunEventType.TOOL_EXECUTION_FAILED,
        { ...common, error: message, reason: message, provider_state: state,
          result: { provider_state: state, output: null } }, "ERROR"));
    } else if (state === "ERROR" || explicitError !== undefined && explicitError !== null) {
      const message = agyString(explicitError) ?? "Antigravity tool failed.";
      events.push(this.event(denial(message) ? AgentRunEventType.TOOL_DENIED : AgentRunEventType.TOOL_EXECUTION_FAILED,
        { ...common, error: message, reason: message, provider_state: state,
          result: { provider_state: state, output: info?.output ?? null } }, "ERROR"));
    } else if (nativeImage) {
      this.pendingImages.push({ turnId, stepIndex, invocationId });
    } else {
      events.push(this.event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        ...common, result: { provider_state: "DONE", output: info?.output ?? null }, provider_state: "DONE",
      }));
    }
    return events;
  }

  completeResult(payload: Record<string, unknown>, images: ReadonlyMap<number, string | null>): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) throw new Error("AGY_UNEXPECTED_RESULT_OUTSIDE_TURN");
    const status = agyString(payload.status);
    const events: AgentRunEvent[] = [];
    let failed = this.nativeImageFailed;
    for (const item of this.deferred) {
      if ("imageStep" in item) {
        const pending = this.pendingImages.find((entry) => entry.stepIndex === item.imageStep);
        if (!pending) throw new Error("AGY_IMAGE_STEP_MISSING");
        const file = status === "SUCCESS" ? images.get(item.imageStep) : null;
        if (file) events.push(this.event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
          turn_id: turnId, invocation_id: pending.invocationId, tool_name: "generate_image", arguments: {},
          result: { provider_state: "DONE", file_path: file }, provider_state: "DONE",
        }));
        else { failed = true; events.push(this.failedImage(pending, "RECONCILIATION_FAILED")); }
      } else if (!failed || ![AgentRunEventType.SEGMENT_START, AgentRunEventType.SEGMENT_CONTENT, AgentRunEventType.SEGMENT_END].includes(item.eventType))
        events.push(item);
    }
    this.nativeImageFailed = failed;
    const firstImageStep = this.pendingImages[0]?.stepIndex ?? Number.POSITIVE_INFINITY;
    events.push(...this.closeText(turnId).filter((item) => !failed
      || Number(String(item.payload.id).split("-").at(-1)) < firstImageStep));
    const response = agyString(payload.response);
    if (!this.nativeImageFailed && !this.textSeen && response) {
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
    if (status && status !== "SUCCESS") events.push(this.event(AgentRunEventType.ERROR,
      { turn_id: turnId, code: "AGY_TURN_ERROR", message: this.nativeImageFailed
        ? "Antigravity image generation failed. No image was added to this run."
        : agyString(payload.error) ?? `Antigravity turn ended with ${status}.` }, "ERROR"));
    events.push(this.event(AgentRunEventType.TURN_COMPLETED, { turn_id: turnId, provider_status: status ?? "UNKNOWN" }, status === "SUCCESS" ? "IDLE" : "ERROR"));
    this.turnId = null;
    this.pendingImages.length = 0; this.deferred.length = 0;
    return events;
  }

  private failedImage(pending: AgyPendingNativeImage, reasonCode: string): AgentRunEvent {
    this.onNativeImageFailure?.({ runId: this.runId, turnId: pending.turnId, invocationId: pending.invocationId,
      providerState: reasonCode, providerError: reasonCode, providerOutput: null });
    return this.event(AgentRunEventType.TOOL_EXECUTION_FAILED, {
      turn_id: pending.turnId, invocation_id: pending.invocationId, tool_name: "generate_image", arguments: {},
      error: imageFailureMessage, reason: imageFailureMessage, provider_state: "DONE",
      result: { provider_state: "DONE", output: null },
    }, "ERROR");
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
