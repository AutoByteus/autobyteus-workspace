import type { AgentRunUserMessageForwardedPayload } from "../../agent-execution/domain/agent-run-command-observer.js";
import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { ExternalRuntimeMemoryWriter } from "../store/external-runtime-memory-writer.js";
import type { ToolTraceLifecycleGroup } from "autobyteus-ts/memory/tool-trace-lifecycle-index.js";
import { ProviderCompactionBoundaryRecorder } from "./provider-compaction-boundary-recorder.js";
import {
  asString,
  extractForwardedMessageMedia,
  extractContentDelta,
  extractTimestamp,
  extractTurnId,
} from "./runtime-memory-event-payload.js";
import { RuntimeToolTraceSequencer } from "./runtime-tool-trace-sequencer.js";

type SegmentState = {
  id: string;
  type: "text" | "reasoning";
  turnId: string;
  parts: string[];
  sourceEvent: string;
  ts: number | null;
};

export class RuntimeMemoryEventAccumulator {
  private activeTurnId: string | null = null;
  private readonly segments = new Map<string, SegmentState>();
  private readonly providerCompactionBoundaryRecorder: ProviderCompactionBoundaryRecorder;
  private readonly toolTraceSequencer: RuntimeToolTraceSequencer;

  constructor(
    private readonly input: {
      runId: string;
      writer: ExternalRuntimeMemoryWriter;
      toolTraceLifecycleGroups: ReadonlyMap<string, ToolTraceLifecycleGroup>;
    },
  ) {
    this.toolTraceSequencer = new RuntimeToolTraceSequencer({
      writer: input.writer,
      toolTraceLifecycleGroups: input.toolTraceLifecycleGroups,
      flushReasoningBoundary: (turnId, sourceEvent) =>
        this.flushOpenReasoningSegments(turnId, sourceEvent),
    });
    this.providerCompactionBoundaryRecorder = new ProviderCompactionBoundaryRecorder({
      writer: input.writer,
      resolveTurnId: (candidate) => this.requireTurnId(candidate),
    });
  }

  recordForwardedUserMessage(payload: AgentRunUserMessageForwardedPayload): void {
    const turnId = asString(payload.result.turnId);
    if (!turnId) return;
    const media = extractForwardedMessageMedia(payload.message);
    this.input.writer.appendRawTrace({
      traceType: "user",
      turnId,
      content: payload.message.content,
      sourceEvent: "AgentRun.postUserMessage",
      ts: payload.forwardedAt.getTime() / 1000,
      media,
    });
  }

  recordRunEvent(event: AgentRunEvent): void {
    switch (event.eventType) {
      case AgentRunEventType.TURN_STARTED:
        this.activeTurnId = extractTurnId(event.payload);
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
    const turnId = asString(event.payload.turn_id);
    const type = asString(event.payload.segment_type);
    if (type !== "text" && type !== "reasoning") return;
    const id = asString(event.payload.id);
    if (!turnId || !id) return;
    const key = this.segmentKey(turnId, id);
    this.segments.set(key, {
      id: key,
      type,
      turnId,
      parts: [],
      sourceEvent: event.eventType,
      ts: extractTimestamp(event.payload),
    });
  }

  private appendSegmentContent(event: AgentRunEvent): void {
    const type = asString(event.payload.segment_type);
    if (type !== "text" && type !== "reasoning") return;
    const turnId = asString(event.payload.turn_id);
    const id = asString(event.payload.id);
    if (!turnId || !id) return;
    const key = this.segmentKey(turnId, id);
    const segment = this.segments.get(key);
    if (!segment || segment.type !== type) return;
    const delta = typeof event.payload.delta === "string" ? event.payload.delta : null;
    if (delta) {
      segment.parts.push(delta);
    }
    segment.sourceEvent = event.eventType;
    segment.ts = segment.ts ?? extractTimestamp(event.payload);
    this.segments.set(key, segment);
  }

  private endSegment(event: AgentRunEvent): void {
    const turnId = asString(event.payload.turn_id);
    const id = asString(event.payload.id);
    if (turnId && id) this.flushSegment(this.segmentKey(turnId, id), event.eventType);
  }

  private completeTurn(event: AgentRunEvent): void {
    const turnId = extractTurnId(event.payload);
    if (!turnId) return;
    for (const segment of [...this.segments.values()]) {
      if (segment.turnId === turnId) {
        this.flushSegment(segment.id, event.eventType);
      }
    }
    this.toolTraceSequencer.completeTurn(turnId);
    if (this.activeTurnId === turnId) this.activeTurnId = null;
  }

  private interruptTurn(event: AgentRunEvent): void {
    const turnId = extractTurnId(event.payload);
    if (!turnId) {
      console.warn("[RuntimeMemoryEventAccumulator] skipped TURN_INTERRUPTED without a turn identity.");
      return;
    }
    this.toolTraceSequencer.interruptTurn(event, turnId);
    this.completeTurn({ ...event, payload: { ...event.payload, turn_id: turnId } });
  }

  private recordAssistantComplete(event: AgentRunEvent): void {
    const content = extractContentDelta(event.payload);
    if (!content) {
      return;
    }
    const turnId = extractTurnId(event.payload);
    if (!turnId) return;
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

  private writeAssistantTrace(turnId: string, content: string, sourceEvent: string, ts: number | null): void {
    if (sourceEvent !== AgentRunEventType.TURN_COMPLETED) {
      this.flushOpenReasoningSegments(turnId, sourceEvent);
    }
    this.input.writer.appendRawTrace({
      traceType: "assistant",
      turnId,
      content,
      sourceEvent,
      ts,
    });
  }

  private writeReasoningTrace(turnId: string, content: string, sourceEvent: string, ts: number | null): void {
    this.input.writer.appendRawTrace({
      traceType: "reasoning",
      turnId,
      content,
      sourceEvent,
      ts,
    });
  }

  private flushOpenReasoningSegments(turnId: string, sourceEvent: string): void {
    for (const segment of [...this.segments.values()]) {
      if (segment.turnId === turnId && segment.type === "reasoning") {
        this.flushSegment(segment.id, sourceEvent);
      }
    }
  }

  private recordToolCall(event: AgentRunEvent): void {
    const outcome = this.toolTraceSequencer.recordCallObservation(event, this.activeTurnId);
    if (outcome.resolvedTurnId) this.activeTurnId = outcome.resolvedTurnId;
  }

  private recordToolResult(event: AgentRunEvent): void {
    const outcome = this.toolTraceSequencer.recordTerminal(event, this.activeTurnId);
    if (outcome.resolvedTurnId) this.activeTurnId = outcome.resolvedTurnId;
  }

  private requireTurnId(candidate: unknown): string {
    const explicit = asString(candidate);
    if (explicit) {
      this.activeTurnId = explicit;
      return explicit;
    }
    if (this.activeTurnId) {
      return this.activeTurnId;
    }
    throw new Error("Runtime memory event is missing an exact turn identity.");
  }

  private segmentKey(turnId: string, segmentId: string): string {
    return JSON.stringify([turnId, segmentId]);
  }

}
