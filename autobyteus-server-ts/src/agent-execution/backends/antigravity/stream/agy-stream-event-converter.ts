import { redactProviderSecrets } from "autobyteus-ts";
import { normalizeBrowserMcpToolResult } from "../../../../agent-tools/browser/browser-mcp-result-normalizer.js";
import { OPEN_TAB_TOOL_NAME } from "../../../../agent-tools/browser/browser-tool-contract.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import { projectAgyMcpToolCall, projectAgyMcpToolOutput } from "./agy-mcp-tool-call.js";
import { agyRecord, agyString, type AgyStreamMessage } from "./agy-stream-message.js";
import type { AgyProviderFailureDiagnostic } from "./agy-provider-diagnostic-sink.js";
import type { AgyNativeImagePathResolution } from "./agy-step-output-reader.js";
import type { AgyBackgroundToolStep } from "./agy-background-task-monitor.js";
import type { AgyNativeToolArgumentLookup } from "./agy-native-tool-arguments-reader.js";
import { buildAgyCompactionStatusPayload } from "./agy-compaction-status-payload.js";

export type AgyNativeImagePathResolver = (stepIndex: number) => AgyNativeImagePathResolution;
/** `compactionDetection`: the run's AGY CLI is proven to stream compactions as checkpoint steps. */
export type AgyStreamEventConverterOptions = Readonly<{ compactionDetection: boolean }>;

const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const denial = (error: string): boolean => /permission|denied|not allowed|approval/i.test(error);
const hasProviderError = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};
const errorText = (value: unknown): string => agyString(value) ?? agyString(agyRecord(value)?.message) ?? "";
const BACKGROUND_TOOL_OUTPUT = "Started as a background task; still running when the turn ended.";

export class AgyStreamEventConverter {
  private turnId: string | null = null;
  private readonly textSteps = new Set<number>();
  private readonly textOpen = new Set<number>();
  private readonly toolStarts = new Set<number>();
  private readonly toolTerminals = new Set<number>();
  /** Started tool steps without DONE/ERROR yet (stepIndex -> start payload); AGY never finishes a daemon step. */
  private readonly openTools = new Map<number, Record<string, unknown>>();
  private textSeen = false;
  /** Checkpoint steps already reported for this conversation; step indices never repeat across turns. */
  private readonly checkpoints = new Set<number>();

  constructor(private readonly runId: string, private readonly conversationId: string, private readonly model: string,
    private readonly onProviderFailure?: (diagnostic: AgyProviderFailureDiagnostic) => void,
    private readonly resolveNativeImagePath?: AgyNativeImagePathResolver,
    private readonly onBackgroundToolSteps?: (steps: readonly AgyBackgroundToolStep[]) => void,
    private readonly options: AgyStreamEventConverterOptions = { compactionDetection: false }) {}

  startTurn(turnId: string): AgentRunEvent[] {
    if (this.turnId) throw new Error("AGY_TURN_ALREADY_ACTIVE");
    this.turnId = turnId;
    this.textSteps.clear(); this.textOpen.clear(); this.toolStarts.clear(); this.toolTerminals.clear(); this.openTools.clear();
    this.textSeen = false;
    return [this.event(AgentRunEventType.TURN_STARTED, { turn_id: turnId })];
  }

  /** Eligibility only: malformed messages still go through the existing convert error boundary. */
  getPendingNativeToolArgumentLookup(message: AgyStreamMessage): AgyNativeToolArgumentLookup | null {
    if (!this.turnId || message.event !== "step_update") return null;
    const payload = message.step_update;
    const index = payload.step_index;
    if (payload.conversation_id !== this.conversationId || payload.step_type !== "tool" ||
        typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 ||
        (payload.state !== "ACTIVE" && payload.state !== "DONE" && payload.state !== "ERROR") ||
        this.toolStarts.has(index) || this.toolTerminals.has(index)) return null;
    const info = agyRecord(payload.tool_info);
    const name = agyString(payload.tool_name) ?? agyString(info?.name);
    const summary = agyRecord(info?.parameters);
    if (!name || name === "call_mcp_tool" || !summary ||
        (agyString(payload.tool_name) && agyString(info?.name) && payload.tool_name !== info?.name)) return null;
    return { stepIndex: index, toolName: name, summary };
  }

  convert(message: AgyStreamMessage, nativeArguments: Record<string, unknown> | null = null): AgentRunEvent[] {
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
    if (stepType === "tool") return this.tool(payload, turnId, stepIndex, state, nativeArguments);
    if (stepType === "checkpoint") return this.checkpoint(payload, turnId, stepIndex, state);
    return [];
  }

  interrupt(): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) return [];
    const events = this.closeText(turnId);
    this.openTools.clear();
    events.push(this.event(AgentRunEventType.TURN_INTERRUPTED, { turn_id: turnId }));
    this.turnId = null;
    return events;
  }

  /** On AGY >= 1.2.16 a DONE checkpoint step is one completed automatic compaction. */
  private checkpoint(payload: Record<string, unknown>, turnId: string, stepIndex: number, state: string): AgentRunEvent[] {
    if (!this.options.compactionDetection || state !== "DONE" || this.checkpoints.has(stepIndex)) return [];
    this.checkpoints.add(stepIndex);
    return [this.event(AgentRunEventType.COMPACTION_STATUS, buildAgyCompactionStatusPayload({
      conversationId: this.conversationId, turnId, stepIndex, durationSeconds: number(payload.duration_seconds),
    }))];
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

  private tool(payload: Record<string, unknown>, turnId: string, stepIndex: number, state: string,
    nativeArguments: Record<string, unknown> | null): AgentRunEvent[] {
    if (state !== "ACTIVE" && state !== "DONE" && state !== "ERROR") throw new Error(`AGY_STREAM_INVALID_TOOL_STATE: ${state}`);
    if (this.toolTerminals.has(stepIndex)) return [];
    const info = agyRecord(payload.tool_info);
    const name = agyString(payload.tool_name) ?? agyString(info?.name);
    if (!name) throw new Error("AGY_STREAM_INVALID_TOOL_NAME");
    // Native image handling is decided on the provider's tool name, never on a projected MCP tool name.
    const nativeImage = name === "generate_image";
    const parameters = agyRecord(info?.parameters);
    const mcpCall = projectAgyMcpToolCall(name, parameters);
    const output = mcpCall ? projectAgyMcpToolOutput(info?.output ?? null) : info?.output ?? null;
    const invocationId = `agy-tool-${turnId}-${stepIndex}`;
    // Native inputs are chosen once, before STARTED. Later summaries/details cannot
    // change the canonical input already saved by the first-observation recorder.
    const common = (name !== "call_mcp_tool" ? this.openTools.get(stepIndex) : undefined) ?? {
      turn_id: turnId, invocation_id: invocationId, tool_name: mcpCall?.toolName ?? name,
      arguments: name === "call_mcp_tool" ? mcpCall?.arguments ?? parameters ?? {}
        : structuredClone(nativeArguments ?? parameters ?? {}),
    };
    const events: AgentRunEvent[] = [];
    if (!this.toolStarts.has(stepIndex)) {
      this.toolStarts.add(stepIndex);
      this.openTools.set(stepIndex, common);
      events.push(this.event(AgentRunEventType.TOOL_EXECUTION_STARTED, common));
    }
    if (state === "ACTIVE") return events;
    this.toolTerminals.add(stepIndex);
    this.openTools.delete(stepIndex);
    const explicitError = info?.error;
    if (nativeImage && (state === "ERROR" || hasProviderError(explicitError))) {
      const denied = denial(errorText(explicitError));
      const message = denied ? "Antigravity denied this image-generation request." : "Antigravity image generation failed.";
      this.onProviderFailure?.({ kind: "tool", runId: this.runId, turnId, invocationId, providerState: state,
        providerError: explicitError, providerOutput: info?.output });
      events.push(this.event(denied ? AgentRunEventType.TOOL_DENIED : AgentRunEventType.TOOL_EXECUTION_FAILED,
        { ...common, error: message, reason: message, provider_state: state,
          result: { provider_state: state, output: null } }, "ERROR"));
    } else if (state === "ERROR" || hasProviderError(explicitError)) {
      const message = errorText(explicitError) || "Antigravity tool failed.";
      events.push(this.event(denial(message) ? AgentRunEventType.TOOL_DENIED : AgentRunEventType.TOOL_EXECUTION_FAILED,
        { ...common, error: message, reason: message, provider_state: state,
          result: { provider_state: state, output } }, "ERROR"));
    } else if (nativeImage) {
      events.push(this.event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        ...common, result: this.nativeImageResult(stepIndex), provider_state: "DONE",
      }));
    } else {
      events.push(this.event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        ...common,
        result: mcpCall?.toolName === OPEN_TAB_TOOL_NAME
          ? normalizeBrowserMcpToolResult(OPEN_TAB_TOOL_NAME, output)
          : { provider_state: "DONE", output },
        provider_state: "DONE",
      }));
    }
    return events;
  }

  /** AGY's stream omits the native image path; AGY's own step output for this step reports it. */
  private nativeImageResult(stepIndex: number): Record<string, unknown> {
    if (!this.resolveNativeImagePath) return { provider_state: "DONE", output: null };
    let resolution: AgyNativeImagePathResolution | null = null;
    try { resolution = this.resolveNativeImagePath(stepIndex); } catch { resolution = null; }
    if (resolution?.path) return { provider_state: "DONE", output: resolution.outputText, file_path: resolution.path };
    console.warn(`AGY_NATIVE_IMAGE_PATH_UNRESOLVED run=${this.runId} step=${stepIndex} reason=${resolution?.reason ?? "RESOLVER_FAILED"}`);
    return { provider_state: "DONE", output: null };
  }

  private result(payload: Record<string, unknown>, turnId: string): AgentRunEvent[] {
    const events = this.closeText(turnId);
    events.push(...this.closeBackgroundTools());
    const status = payload.status;
    if (status !== "SUCCESS" || hasProviderError(payload.error)) {
      this.onProviderFailure?.({ kind: "turn", runId: this.runId, turnId,
        safeReasonCode: status !== "SUCCESS" ? "TERMINAL_STATUS_NOT_SUCCESS" : "TERMINAL_ERROR_PRESENT",
        providerStatus: status, providerError: payload.error, providerResponse: payload.response });
      events.push(this.event(AgentRunEventType.ERROR, {
        turn_id: turnId, code: "AGY_TURN_ERROR",
        message: redactProviderSecrets(errorText(payload.error).trim()) || "Antigravity could not complete this turn.",
        error_scope: "turn", error_effect: "terminal",
      }, "ERROR"));
      this.turnId = null;
      return events;
    }
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
      input_token_semantic: "base_excludes_cache",
      cache_read_input_tokens: number(usage.cache_read_tokens),
      cache_state: number(usage.cache_read_tokens) === null ? "not_reported" : number(usage.cache_read_tokens)! > 0 ? "positive" : "zero_reported",
      reasoning_output_tokens: number(usage.thinking_tokens),
      raw_usage_json: usage,
      quality_flags: ["agy_provider_reported_cumulative_usage"],
    }));
    events.push(this.event(AgentRunEventType.TURN_COMPLETED, { turn_id: turnId, provider_status: "SUCCESS" }, "IDLE"));
    this.turnId = null;
    return events;
  }

  /**
   * At turn end, a step AGY never finished (e.g. a daemon) is still running in the background:
   * its tool call closes here and the step is reported as a background task.
   */
  private closeBackgroundTools(): AgentRunEvent[] {
    const open = [...this.openTools.entries()].sort(([a], [b]) => a - b);
    const events = open.map(([, common]) =>
      this.event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        ...common, result: { provider_state: "RUNNING", output: BACKGROUND_TOOL_OUTPUT }, provider_state: "RUNNING",
      }));
    this.openTools.clear();
    if (open.length > 0) this.onBackgroundToolSteps?.(open.map(([stepIndex, common]) => ({
      stepIndex, toolName: String(common.tool_name), commandLine: agyString(agyRecord(common.arguments)?.CommandLine),
    })));
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
