import type { AgentRunUserMessageAcceptedPayload } from "../../agent-execution/domain/agent-run-command-observer.js";
import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { RunMemoryWriter } from "../store/run-memory-writer.js";
import type { RawTraceMedia } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { ProviderCompactionBoundaryRecorder } from "./provider-compaction-boundary-recorder.js";
import {
  asString,
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

type ToolState = {
  invocationId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  callWritten: boolean;
  resultWritten: boolean;
};

export class RuntimeMemoryEventAccumulator {
  private activeTurnId: string | null = null;
  private fallbackTurnIndex = 0;
  private currentFallbackTurnId: string | null = null;
  private anonymousToolIndex = 0;
  private readonly segments = new Map<string, SegmentState>();
  private readonly tools = new Map<string, ToolState>();
  private readonly anonymousToolQueue: string[] = [];
  private readonly pendingReasoningByTurn = new Map<string, string[]>();
  private readonly providerCompactionBoundaryRecorder: ProviderCompactionBoundaryRecorder;

  constructor(
    private readonly input: {
      runId: string;
      writer: RunMemoryWriter;
    },
  ) {
    this.providerCompactionBoundaryRecorder = new ProviderCompactionBoundaryRecorder({
      writer: input.writer,
      resolveTurnId: (candidate) => this.resolveTurnId(candidate),
    });
  }

  recordAcceptedUserMessage(payload: AgentRunUserMessageAcceptedPayload): void {
    const turnId = this.resolveTurnId(payload.result.turnId);
    const media = this.mediaFromAcceptedMessage(payload.message);
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
      case AgentRunEventType.ASSISTANT_COMPLETE:
        this.recordAssistantComplete(event);
        return;
      case AgentRunEventType.TOOL_APPROVAL_REQUESTED:
      case AgentRunEventType.TOOL_EXECUTION_STARTED:
        this.recordToolCall(event);
        return;
      case AgentRunEventType.TOOL_DENIED:
      case AgentRunEventType.TOOL_EXECUTION_SUCCEEDED:
      case AgentRunEventType.TOOL_EXECUTION_FAILED:
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
    if (type !== "text" && type !== "reasoning") {
      return;
    }
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
    if (type !== "text" && type !== "reasoning") {
      return;
    }
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
    if (this.activeTurnId === turnId) {
      this.activeTurnId = null;
    }
    if (this.currentFallbackTurnId === turnId) {
      this.currentFallbackTurnId = null;
    }
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

  private recordToolCall(event: AgentRunEvent): void {
    const turnId = this.resolveTurnId(extractTurnId(event.payload));
    const tool = this.resolveToolState(event.payload, turnId, "call");
    if (tool.callWritten) {
      return;
    }
    this.writeToolCall(tool, turnId, event.eventType, extractTimestamp(event.payload));
  }

  private recordToolResult(event: AgentRunEvent): void {
    const turnId = this.resolveTurnId(extractTurnId(event.payload));
    const tool = this.resolveToolState(event.payload, turnId, "result");
    if (!tool.callWritten) {
      this.writeToolCall(tool, turnId, AgentRunEventType.TOOL_EXECUTION_STARTED, extractTimestamp(event.payload));
    }
    if (tool.resultWritten) {
      return;
    }
    tool.resultWritten = true;
    const denied = event.eventType === AgentRunEventType.TOOL_DENIED;
    const failed = event.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED;
    const error = denied
      ? extractError(event.payload) ?? extractReason(event.payload) ?? "Tool execution denied."
      : failed
        ? extractError(event.payload) ?? "Tool execution failed."
        : null;
    const result = denied
      ? { status: "denied", reason: extractReason(event.payload) ?? error }
      : failed
        ? null
        : extractToolResult(event.payload);
    this.input.writer.write({
      trace: {
        traceType: "tool_result",
        turnId,
        content: denied ? "Tool execution denied." : "",
        sourceEvent: event.eventType,
        ts: extractTimestamp(event.payload),
        toolName: tool.toolName,
        toolCallId: tool.invocationId,
        toolArgs: tool.toolArgs,
        toolResult: result,
        toolError: error,
      },
      snapshotUpdate: {
        kind: "tool_result",
        toolCallId: tool.invocationId,
        toolName: tool.toolName,
        toolResult: result,
        toolError: error,
      },
    });
  }

  private writeToolCall(
    tool: ToolState,
    turnId: string,
    sourceEvent: string,
    ts: number | null,
  ): void {
    tool.callWritten = true;
    this.input.writer.write({
      trace: {
        traceType: "tool_call",
        turnId,
        content: "",
        sourceEvent,
        ts,
        toolName: tool.toolName,
        toolCallId: tool.invocationId,
        toolArgs: tool.toolArgs,
      },
      snapshotUpdate: {
        kind: "tool_call",
        toolCallId: tool.invocationId,
        toolName: tool.toolName,
        toolArgs: tool.toolArgs,
      },
    });
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

  private resolveToolState(
    payload: Record<string, unknown>,
    turnId: string,
    mode: "call" | "result",
  ): ToolState {
    const explicitId = extractInvocationId(payload);
    let invocationId = explicitId;
    if (!invocationId && mode === "result") {
      invocationId = this.anonymousToolQueue.shift() ?? null;
    }
    if (!invocationId) {
      invocationId = `anonymous-tool-${++this.anonymousToolIndex}`;
      if (mode === "call") {
        this.anonymousToolQueue.push(invocationId);
      }
    }
    const existing = this.tools.get(invocationId);
    const toolName = extractToolName(payload) ?? existing?.toolName ?? "tool";
    const toolArgs = extractToolArgs(payload) ?? existing?.toolArgs ?? {};
    const next = existing ?? {
      invocationId,
      toolName,
      toolArgs,
      callWritten: false,
      resultWritten: false,
    };
    next.toolName = toolName;
    next.toolArgs = toolArgs;
    this.tools.set(invocationId, next);
    this.activeTurnId = turnId;
    return next;
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

  private mediaFromAcceptedMessage(message: AgentRunUserMessageAcceptedPayload["message"]): RawTraceMedia | null {
    const media: RawTraceMedia = { images: [], audio: [], video: [] };
    for (const file of message.contextFiles ?? []) {
      if (file.fileType === "image") {
        media.images?.push(file.uri);
      } else if (file.fileType === "audio") {
        media.audio?.push(file.uri);
      } else if (file.fileType === "video") {
        media.video?.push(file.uri);
      }
    }
    return media.images?.length || media.audio?.length || media.video?.length ? media : null;
  }

}
