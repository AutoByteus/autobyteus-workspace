import type { AgentRunUserMessageAcceptedPayload } from "../../agent-execution/domain/agent-run-command-observer.js";
import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { RunMemoryWriter } from "../store/run-memory-writer.js";
import { createToolCallIdentity, toolCallIdentityKey, type ToolCallIdentity } from "autobyteus-ts/memory/models/tool-call-identity.js";
import type { ToolTraceLifecycleGroup } from "autobyteus-ts/memory/tool-trace-lifecycle-index.js";
import { ProviderCompactionBoundaryRecorder } from "./provider-compaction-boundary-recorder.js";
import {
  asString,
  extractAcceptedMessageMedia,
  extractContentDelta,
  extractError,
  extractInvocationId,
  extractReason,
  extractSegmentId,
  extractTimestamp,
  extractToolArgs,
  extractToolName,
  extractToolResult,
  extractTurnId,
} from "./runtime-memory-event-payload.js";

type SegmentState = {
  id: string;
  type: "text" | "reasoning";
  turnId: string;
  parts: string[];
  sourceEvent: string;
  ts: number | null;
};

type RuntimeToolState = {
  identity: ToolCallIdentity;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  callRawTraceId?: string;
  resultRawTraceId?: string;
};

export class RuntimeMemoryEventAccumulator {
  private activeTurnId: string | null = null;
  private fallbackTurnIndex = 0;
  private currentFallbackTurnId: string | null = null;
  private readonly segments = new Map<string, SegmentState>();
  private readonly tools = new Map<string, RuntimeToolState>();
  private readonly pendingReasoningByTurn = new Map<string, string[]>();
  private readonly providerCompactionBoundaryRecorder: ProviderCompactionBoundaryRecorder;

  constructor(
    private readonly input: {
      runId: string;
      writer: RunMemoryWriter;
      toolTraceLifecycleGroups: ReadonlyMap<string, ToolTraceLifecycleGroup>;
    },
  ) {
    this.hydrateToolStates(input.toolTraceLifecycleGroups);
    this.providerCompactionBoundaryRecorder = new ProviderCompactionBoundaryRecorder({
      writer: input.writer,
      resolveTurnId: (candidate) => this.resolveTurnId(candidate),
    });
  }

  recordAcceptedUserMessage(payload: AgentRunUserMessageAcceptedPayload): void {
    const turnId = this.resolveTurnId(payload.result.turnId);
    const media = extractAcceptedMessageMedia(payload.message);
    this.input.writer.write({
      trace: {
        traceType: "user",
        turnId,
        content: payload.message.content,
        sourceEvent: "AgentRun.postUserMessage",
        ts: payload.acceptedAt.getTime() / 1000,
        media,
      },
      snapshotUpdate: {
        kind: "user",
        content: payload.message.content,
        media,
      },
    });
  }

  recordRunEvent(event: AgentRunEvent): void {
    switch (event.eventType) {
      case AgentRunEventType.TURN_STARTED:
        this.activeTurnId = this.resolveTurnId(extractTurnId(event.payload));
        return;
      case AgentRunEventType.SEGMENT_START:
        this.startSegment(event);
        return;
      case AgentRunEventType.SEGMENT_CONTENT:
        this.appendSegmentContent(event);
        return;
      case AgentRunEventType.SEGMENT_END:
        this.endSegment(event);
        return;
      case AgentRunEventType.TURN_COMPLETED:
        this.completeTurn(event);
        return;
      case AgentRunEventType.TURN_INTERRUPTED:
        this.interruptTurn(event);
        return;
      case AgentRunEventType.ASSISTANT_COMPLETE:
        this.recordAssistantComplete(event);
        return;
      case AgentRunEventType.TOOL_APPROVAL_REQUESTED:
      case AgentRunEventType.TOOL_APPROVED:
      case AgentRunEventType.TOOL_EXECUTION_STARTED:
        this.recordToolCall(event);
        return;
      case AgentRunEventType.TOOL_DENIED:
      case AgentRunEventType.TOOL_EXECUTION_SUCCEEDED:
      case AgentRunEventType.TOOL_EXECUTION_FAILED:
      case AgentRunEventType.TOOL_EXECUTION_INTERRUPTED:
        this.recordToolResult(event);
        return;
      case AgentRunEventType.COMPACTION_STATUS:
        this.providerCompactionBoundaryRecorder.record(event);
        return;
      default:
        return;
    }
  }

  private startSegment(event: AgentRunEvent): void {
    const turnId = this.resolveTurnId(extractTurnId(event.payload));
    const type = this.resolveSegmentType(event.payload);
    if (type !== "text" && type !== "reasoning") return;
    const id = this.resolveSegmentId(event.payload, type, turnId);
    this.segments.set(id, {
      id,
      type,
      turnId,
      parts: [],
      sourceEvent: event.eventType,
      ts: extractTimestamp(event.payload),
    });
  }

  private appendSegmentContent(event: AgentRunEvent): void {
    const type = this.resolveSegmentType(event.payload);
    if (type !== "text" && type !== "reasoning") return;
    const turnId = this.resolveTurnId(extractTurnId(event.payload));
    const id = this.resolveSegmentId(event.payload, type, turnId);
    const segment = this.segments.get(id) ?? {
      id,
      type,
      turnId,
      parts: [],
      sourceEvent: event.eventType,
      ts: extractTimestamp(event.payload),
    };
    const delta = extractContentDelta(event.payload);
    if (delta) {
      segment.parts.push(delta);
    }
    segment.sourceEvent = event.eventType;
    segment.ts = segment.ts ?? extractTimestamp(event.payload);
    this.segments.set(id, segment);
  }

  private endSegment(event: AgentRunEvent): void {
    const type = this.resolveSegmentType(event.payload);
    const turnId = this.resolveTurnId(extractTurnId(event.payload));
    const explicitId = extractSegmentId(event.payload);
    if (explicitId) {
      this.flushSegment(explicitId, event.eventType);
      return;
    }
    if (type === "text" || type === "reasoning") {
      this.flushSegment(this.resolveSegmentId(event.payload, type, turnId), event.eventType);
    }
  }

  private completeTurn(event: AgentRunEvent): void {
    const turnId = this.resolveTurnId(extractTurnId(event.payload));
    for (const segment of [...this.segments.values()]) {
      if (segment.turnId === turnId) {
        this.flushSegment(segment.id, event.eventType);
      }
    }
    this.flushPendingReasoning(turnId);
    for (const [key, tool] of this.tools) {
      if (tool.identity.turnId !== turnId || tool.callRawTraceId || tool.resultRawTraceId) continue;
      this.tools.delete(key);
    }
    if (this.activeTurnId === turnId) this.activeTurnId = null;
    if (this.currentFallbackTurnId === turnId) this.currentFallbackTurnId = null;
  }

  private interruptTurn(event: AgentRunEvent): void {
    const turnId = extractTurnId(event.payload) ?? this.activeTurnId;
    if (!turnId) {
      console.warn("[RuntimeMemoryEventAccumulator] skipped TURN_INTERRUPTED without a turn identity.");
      return;
    }
    const error = extractError(event.payload) ?? extractReason(event.payload) ?? "Tool execution interrupted.";
    for (const tool of [...this.tools.values()]) {
      if (tool.identity.turnId !== turnId || !tool.callRawTraceId || tool.resultRawTraceId) continue;
      this.persistToolResult(tool, event, null, error, "Tool execution interrupted.");
    }
    this.completeTurn({ ...event, payload: { ...event.payload, turn_id: turnId } });
  }

  private recordAssistantComplete(event: AgentRunEvent): void {
    const content = extractContentDelta(event.payload);
    if (!content) {
      return;
    }
    const turnId = this.resolveTurnId(extractTurnId(event.payload));
    this.writeAssistantTrace(turnId, content, event.eventType, extractTimestamp(event.payload));
  }

  private flushSegment(id: string, sourceEvent: string): void {
    const segment = this.segments.get(id);
    if (!segment) {
      return;
    }
    this.segments.delete(id);
    const content = segment.parts.join("");
    if (!content.trim()) {
      return;
    }
    if (segment.type === "reasoning") {
      this.writeReasoningTrace(segment.turnId, content, sourceEvent, segment.ts);
      return;
    }
    this.writeAssistantTrace(segment.turnId, content, sourceEvent, segment.ts);
  }

  private writeAssistantTrace(
    turnId: string,
    content: string,
    sourceEvent: string,
    ts: number | null,
  ): void {
    if (sourceEvent !== AgentRunEventType.TURN_COMPLETED) {
      this.flushOpenReasoningSegments(turnId, sourceEvent);
    }
    const reasoning = this.consumePendingReasoning(turnId);
    this.input.writer.write({
      trace: {
        traceType: "assistant",
        turnId,
        content,
        sourceEvent,
        ts,
      },
      snapshotUpdate: {
        kind: "assistant",
        content,
        reasoning,
      },
    });
  }

  private writeReasoningTrace(
    turnId: string,
    content: string,
    sourceEvent: string,
    ts: number | null,
  ): void {
    this.input.writer.write({
      trace: {
        traceType: "reasoning",
        turnId,
        content,
        sourceEvent,
        ts,
      },
    });
    const pending = this.pendingReasoningByTurn.get(turnId) ?? [];
    pending.push(content);
    this.pendingReasoningByTurn.set(turnId, pending);
  }

  private flushPendingReasoning(turnId: string): void {
    const reasoning = this.consumePendingReasoning(turnId);
    if (!reasoning) {
      return;
    }
    this.input.writer.writeSnapshotUpdate({
      kind: "assistant",
      content: null,
      reasoning,
    });
  }

  private consumePendingReasoning(turnId: string): string | null {
    const pending = this.pendingReasoningByTurn.get(turnId);
    if (!pending?.length) {
      return null;
    }
    this.pendingReasoningByTurn.delete(turnId);
    return pending.join("\n\n");
  }

  private flushOpenReasoningSegments(turnId: string, sourceEvent: string): void {
    for (const segment of [...this.segments.values()]) {
      if (segment.turnId === turnId && segment.type === "reasoning") {
        this.flushSegment(segment.id, sourceEvent);
      }
    }
  }

  private recordToolCall(event: AgentRunEvent): void {
    const identity = this.resolveToolIdentity(event.payload, "observation");
    if (!identity) return;
    const tool = this.getOrCreateToolState(identity);
    if (tool.resultRawTraceId) return;
    this.mergeToolObservation(tool, event.payload);
    if (!tool.callRawTraceId && this.isCallReady(tool)) {
      this.persistToolCall(tool, event);
    }
    this.activeTurnId = identity.turnId;
  }

  private recordToolResult(event: AgentRunEvent): void {
    const identity = this.resolveToolIdentity(event.payload, "terminal");
    if (!identity) return;
    const tool = this.getOrCreateToolState(identity);
    if (tool.resultRawTraceId) return;
    this.mergeToolObservation(tool, event.payload);

    if (!tool.callRawTraceId) {
      if (!this.isCallReady(tool)) {
        console.warn(
          `[RuntimeMemoryEventAccumulator] skipped terminal tool event '${identity.toolCallId}' in turn '${identity.turnId}' because authoritative call arguments were unavailable.`,
        );
        return;
      }
      this.persistToolCall(tool, event);
    }
    if (!tool.toolName) {
      console.warn(
        `[RuntimeMemoryEventAccumulator] skipped terminal tool event '${identity.toolCallId}' in turn '${identity.turnId}' because its persisted call has no usable tool name.`,
      );
      return;
    }

    const denied = event.eventType === AgentRunEventType.TOOL_DENIED;
    const failed = event.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED;
    const interrupted = event.eventType === AgentRunEventType.TOOL_EXECUTION_INTERRUPTED;
    const error = denied
      ? extractError(event.payload) ?? extractReason(event.payload) ?? "Tool execution denied."
      : failed
        ? extractError(event.payload) ?? "Tool execution failed."
        : interrupted
          ? extractError(event.payload) ?? extractReason(event.payload) ?? "Tool execution interrupted."
          : null;
    const result = denied
      ? { status: "denied", reason: extractReason(event.payload) ?? error }
      : interrupted ? null : extractToolResult(event.payload);
    this.persistToolResult(
      tool,
      event,
      result,
      error,
      denied ? "Tool execution denied." : interrupted ? "Tool execution interrupted." : "",
    );
  }

  private persistToolCall(tool: RuntimeToolState, event: AgentRunEvent): void {
    if (tool.callRawTraceId || !this.isCallReady(tool)) return;
    this.flushOpenReasoningSegments(tool.identity.turnId, event.eventType);
    const trace = this.input.writer.write({
      trace: {
        traceType: "tool_call",
        turnId: tool.identity.turnId,
        content: "",
        sourceEvent: event.eventType,
        ts: extractTimestamp(event.payload),
        toolName: tool.toolName,
        toolCallId: tool.identity.toolCallId,
        toolArgs: tool.toolArgs,
      },
      snapshotUpdate: {
        kind: "tool_call",
        toolCallId: tool.identity.toolCallId,
        toolName: tool.toolName,
        toolArgs: tool.toolArgs,
      },
    });
    tool.callRawTraceId = trace.id;
  }

  private persistToolResult(
    tool: RuntimeToolState,
    event: AgentRunEvent,
    result: unknown,
    error: string | null,
    content: string,
  ): void {
    if (tool.resultRawTraceId || !tool.callRawTraceId || !tool.toolName) return;
    this.flushOpenReasoningSegments(tool.identity.turnId, event.eventType);
    const trace = this.input.writer.write({
      trace: {
        traceType: "tool_result",
        turnId: tool.identity.turnId,
        content,
        sourceEvent: event.eventType,
        ts: extractTimestamp(event.payload),
        toolCallId: tool.identity.toolCallId,
        toolResult: result === undefined ? null : result,
        toolError: error,
      },
      snapshotUpdate: {
        kind: "tool_result",
        toolCallId: tool.identity.toolCallId,
        toolName: tool.toolName,
        toolResult: result === undefined ? null : result,
        toolError: error,
      },
    });
    tool.resultRawTraceId = trace.id;
  }

  private getOrCreateToolState(identity: ToolCallIdentity): RuntimeToolState {
    const key = toolCallIdentityKey(identity);
    const existing = this.tools.get(key);
    if (existing) return existing;
    const tool: RuntimeToolState = { identity };
    this.tools.set(key, tool);
    return tool;
  }

  private mergeToolObservation(tool: RuntimeToolState, payload: Record<string, unknown>): void {
    const observedName = extractToolName(payload);
    const observedArgs = extractToolArgs(payload);
    if (!tool.callRawTraceId) {
      if (observedName) tool.toolName = observedName;
      if (observedArgs !== undefined) tool.toolArgs = observedArgs;
    } else if (!tool.toolName && observedName) {
      tool.toolName = observedName;
    }
  }

  private isCallReady(tool: RuntimeToolState): tool is RuntimeToolState & {
    toolName: string;
    toolArgs: Record<string, unknown>;
  } {
    return Boolean(tool.toolName?.trim()) && tool.toolArgs !== undefined;
  }

  private hydrateToolStates(groups: ReadonlyMap<string, ToolTraceLifecycleGroup>): void {
    for (const [key, group] of groups) {
      const tool: RuntimeToolState = {
        identity: group.identity,
      };
      if (group.call?.toolName?.trim()) tool.toolName = group.call.toolName.trim();
      if (group.call?.toolArgs !== null && group.call?.toolArgs !== undefined) {
        tool.toolArgs = group.call.toolArgs;
      }
      if (group.call) tool.callRawTraceId = group.call.id ?? `physical:${key}:call`;
      if (group.result) tool.resultRawTraceId = group.result.id ?? `physical:${key}:result`;
      this.tools.set(key, tool);
    }
  }

  private resolveSegmentId(
    payload: Record<string, unknown>,
    type: "text" | "reasoning",
    turnId: string,
  ): string {
    return extractSegmentId(payload) ?? `${turnId}:${type}`;
  }

  private resolveSegmentType(payload: Record<string, unknown>): string | null {
    const explicit = asString(payload["segment_type"]);
    if (explicit === "reasoning") {
      return "reasoning";
    }
    if (explicit === "text" || explicit === "assistant") {
      return "text";
    }
    const id = extractSegmentId(payload);
    return id ? this.segments.get(id)?.type ?? "text" : "text";
  }

  private resolveToolIdentity(
    payload: Record<string, unknown>, mode: "observation" | "terminal",
  ): ToolCallIdentity | null {
    const toolCallId = extractInvocationId(payload);
    if (!toolCallId) {
      console.warn("[RuntimeMemoryEventAccumulator] skipped tool event without an invocation id.");
      return null;
    }
    const explicitTurnId = extractTurnId(payload);
    if (explicitTurnId) return { turnId: explicitTurnId, toolCallId };
    const matches = [...this.tools.values()]
      .filter((tool) => tool.identity.toolCallId === toolCallId);
    if (mode === "terminal") {
      if (matches.length === 1) return matches[0]!.identity;
      if (matches.length > 1) {
        console.warn(`[RuntimeMemoryEventAccumulator] skipped terminal tool event '${toolCallId}' because it matches multiple turn lifecycles.`);
        return null;
      }
    } else {
      const activeMatch = matches.find((tool) => tool.identity.turnId === this.activeTurnId);
      if (activeMatch) return activeMatch.identity;
      const pendingMatches = matches.filter((tool) => !tool.resultRawTraceId);
      if (pendingMatches.length === 1) return pendingMatches[0]!.identity;
      if (pendingMatches.length > 1 || (!this.activeTurnId && matches.length > 1)) {
        console.warn(`[RuntimeMemoryEventAccumulator] skipped tool observation '${toolCallId}' because it matches multiple turn lifecycles.`);
        return null;
      }
      if (!this.activeTurnId && matches.length === 1) return matches[0]!.identity;
    }
    const identity = createToolCallIdentity(this.activeTurnId, toolCallId);
    if (!identity) {
      console.warn(`[RuntimeMemoryEventAccumulator] skipped tool event '${toolCallId}' without a turn identity.`);
      return null;
    }
    return identity;
  }

  private resolveTurnId(candidate: unknown): string {
    const explicit = asString(candidate);
    if (explicit) {
      this.activeTurnId = explicit;
      return explicit;
    }
    if (this.activeTurnId) {
      return this.activeTurnId;
    }
    if (!this.currentFallbackTurnId) {
      this.currentFallbackTurnId = `fallback-turn-${++this.fallbackTurnIndex}`;
    }
    this.activeTurnId = this.currentFallbackTurnId;
    return this.currentFallbackTurnId;
  }

}
