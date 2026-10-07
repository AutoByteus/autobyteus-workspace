import type { SessionUpdate, ToolCallUpdate } from "@agentclientprotocol/sdk";
import { AgentRunEventType, type AgentRunEvent, type AgentRunStatusHint } from "../../../domain/agent-run-event.js";
import type {
  AcpAgentSessionProfile,
  AcpCompactionStatusInput,
  AcpExtEffect,
  AcpToolCallProjection,
  AcpToolCallSnapshot,
  AcpToolCallStatus,
} from "../acp-agent-session-profile.js";

type ToolCallLike = Pick<ToolCallUpdate, "toolCallId" | "title" | "kind" | "status" | "rawInput" | "rawOutput" | "content" | "locations" | "_meta">;

type TrackedToolCall = {
  snapshot: AcpToolCallSnapshot;
  projection: AcpToolCallProjection;
  lifecycleStarted: boolean;
  terminal: boolean;
};

type OpenSegment = { id: string; kind: "text" | "reasoning" };

type AcpCompactionEffect = Extract<AcpExtEffect, { kind: "compaction" }>;

/** A compaction the agent reported started and has not completed. */
type OpenCompaction = { operationId: string; sessionId: string };

const ABANDON_REASON = {
  ended: "Turn ended before the compaction completed.",
  cancelled: "Turn was cancelled before the compaction completed.",
  interrupted: "Turn was interrupted before the compaction completed.",
  failed: "Turn failed before the compaction completed.",
  superseded: "A new compaction started before this one completed.",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const toStatus = (value: unknown, fallback: AcpToolCallStatus): AcpToolCallStatus =>
  value === "pending" || value === "in_progress" || value === "completed" || value === "failed" ? value : fallback;

const mergeSnapshot = (previous: AcpToolCallSnapshot | null, update: ToolCallLike): AcpToolCallSnapshot => ({
  toolCallId: update.toolCallId,
  title: update.title ?? previous?.title ?? null,
  kind: update.kind ?? previous?.kind ?? null,
  // A tool call without `status` is `pending` (ACP default); updates keep the last status.
  status: toStatus(update.status, previous?.status ?? "pending"),
  rawInput: update.rawInput !== undefined ? update.rawInput : previous?.rawInput,
  rawOutput: update.rawOutput !== undefined ? update.rawOutput : previous?.rawOutput,
  content: update.content ?? previous?.content ?? [],
  locations: update.locations?.map((location) => ({ path: location.path })) ?? previous?.locations ?? [],
  meta: isRecord(update._meta) ? update._meta : previous?.meta ?? null,
});

/**
 * Converts standard ACP `session/update` traffic of one turn into AutoByteus events:
 * reasoning/text segment lifecycle, tool cards and tool lifecycle (named by the session
 * profile), approvals, usage placement and turn terminals. A text or reasoning segment is
 * always closed before a tool card, a different segment kind, usage, or the turn end.
 */
export class AcpSessionUpdateConverter {
  private turnId: string | null = null;
  private openSegment: OpenSegment | null = null;
  private segmentCounter = 0;
  private readonly toolCalls = new Map<string, TrackedToolCall>();
  private openCompaction: OpenCompaction | null = null;
  private compactionCounter = 0;

  constructor(private readonly runId: string, private readonly profile: AcpAgentSessionProfile) {}

  get activeTurnId(): string | null { return this.turnId; }

  /** True while a tool call is pending (including awaiting approval) or in progress. */
  hasOpenToolCall(): boolean {
    for (const call of this.toolCalls.values()) if (!call.terminal) return true;
    return false;
  }

  startTurn(turnId: string): AgentRunEvent[] {
    if (this.turnId) throw new Error("ACP_TURN_ALREADY_ACTIVE");
    this.turnId = turnId;
    this.openSegment = null;
    this.segmentCounter = 0;
    this.toolCalls.clear();
    this.openCompaction = null;
    return [this.event(AgentRunEventType.TURN_STARTED, { turn_id: turnId }, "ACTIVE")];
  }

  convertUpdate(update: SessionUpdate): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) return [];
    switch (update.sessionUpdate) {
      case "agent_thought_chunk":
        return update.content.type === "text" ? this.appendChunk(turnId, "reasoning", update.content.text) : [];
      case "agent_message_chunk":
        return update.content.type === "text" ? this.appendChunk(turnId, "text", update.content.text) : [];
      case "tool_call":
      case "tool_call_update":
        return this.applyToolCall(turnId, update);
      default:
        // Plans, command lists, mode/config/session-info updates and user echoes are not chat content.
        return [];
    }
  }

  /** Ensures the card for a permission request's tool call exists; returns its projection. */
  observePermissionToolCall(toolCall: ToolCallLike): { events: AgentRunEvent[]; projection: AcpToolCallProjection } | null {
    const turnId = this.turnId;
    if (!turnId) return null;
    const events = this.applyToolCall(turnId, toolCall);
    const tracked = this.toolCalls.get(toolCall.toolCallId);
    return tracked ? { events, projection: tracked.projection } : null;
  }

  approvalRequested(toolCallId: string): AgentRunEvent[] {
    return this.toolEvent(toolCallId, AgentRunEventType.TOOL_APPROVAL_REQUESTED, {});
  }

  approved(toolCallId: string, reason: string | null): AgentRunEvent[] {
    return this.toolEvent(toolCallId, AgentRunEventType.TOOL_APPROVED, reason ? { reason } : {});
  }

  /** The user denied the call: its card ends failed and later provider updates are ignored. */
  denied(toolCallId: string, reason: string): AgentRunEvent[] {
    const tracked = this.toolCalls.get(toolCallId);
    const turnId = this.turnId;
    if (!tracked || tracked.terminal || !turnId) return [];
    tracked.terminal = true;
    return [
      this.segmentEnd(turnId, toolCallId, { ...this.toolMetadata(tracked.projection), error: reason }),
      this.event(AgentRunEventType.TOOL_DENIED, {
        ...this.toolPayload(turnId, toolCallId, tracked.projection), reason, error: reason,
      }),
    ];
  }

  usage(payload: Record<string, unknown>): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) return [];
    return [
      ...this.closeOpenSegment(turnId),
      this.event(AgentRunEventType.TOKEN_USAGE_UPDATED, { ...payload, turn_id: turnId }),
    ];
  }

  /**
   * A provider compaction within the turn. One compaction runs at a time per session, so a
   * completion pairs with the open start in order (no shared id is required); a completion
   * without a start is a manual compaction.
   */
  compaction(sessionId: string, effect: AcpCompactionEffect): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId || !this.profile.buildCompactionStatusPayload) return [];
    const base = { sessionId, turnId, eventId: effect.eventId, details: effect.details, reason: null };
    if (effect.phase === "started") {
      const events = this.closeOpenCompaction(turnId, ABANDON_REASON.superseded);
      const operationId = effect.eventId ?? this.nextCompactionId(turnId);
      this.openCompaction = { operationId, sessionId };
      events.push(this.compactionStatus({ ...base, phase: "started", operationId, trigger: "auto" }));
      return events;
    }
    const open = this.openCompaction;
    this.openCompaction = null;
    const operationId = open?.operationId ?? effect.eventId ?? this.nextCompactionId(turnId);
    const trigger = effect.phase === "completed" ? (open ? "auto" : "manual") : (open ? "auto" : null);
    return [this.compactionStatus({ ...base, phase: effect.phase, operationId, trigger })];
  }

  completeTurn(stopReason: string): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) return [];
    const events = [
      ...this.closeOpenSegment(turnId), ...this.interruptOpenToolCalls(turnId),
      ...this.closeOpenCompaction(turnId, stopReason === "cancelled" ? ABANDON_REASON.cancelled : ABANDON_REASON.ended),
    ];
    events.push(this.event(AgentRunEventType.TURN_COMPLETED, { turn_id: turnId, provider_stop_reason: stopReason }, "IDLE"));
    this.turnId = null;
    return events;
  }

  interruptTurn(): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) return [];
    const events = [
      ...this.closeOpenSegment(turnId), ...this.interruptOpenToolCalls(turnId),
      ...this.closeOpenCompaction(turnId, ABANDON_REASON.interrupted),
    ];
    events.push(this.event(AgentRunEventType.TURN_INTERRUPTED, { turn_id: turnId }, "IDLE"));
    this.turnId = null;
    return events;
  }

  /** Provider rejected the turn: one turn-terminal error carrying the provider's message. */
  failTurn(code: string, message: string): AgentRunEvent[] {
    const turnId = this.turnId;
    if (!turnId) return [];
    const events = [
      ...this.closeOpenSegment(turnId), ...this.interruptOpenToolCalls(turnId),
      ...this.closeOpenCompaction(turnId, ABANDON_REASON.failed),
    ];
    events.push(this.event(AgentRunEventType.ERROR, {
      code, message, error_scope: "turn", error_effect: "terminal", turn_id: turnId,
    }, "ERROR"));
    this.turnId = null;
    return events;
  }

  /** A started compaction its turn outlived ends failed (no rotation) under the same operation id. */
  private closeOpenCompaction(turnId: string, reason: string): AgentRunEvent[] {
    const open = this.openCompaction;
    if (!open) return [];
    this.openCompaction = null;
    return [this.compactionStatus({
      sessionId: open.sessionId, turnId, phase: "abandoned", operationId: open.operationId,
      eventId: null, details: {}, trigger: "auto", reason,
    })];
  }

  private compactionStatus(input: AcpCompactionStatusInput): AgentRunEvent {
    return this.event(AgentRunEventType.COMPACTION_STATUS, this.profile.buildCompactionStatusPayload!(input));
  }

  private nextCompactionId(turnId: string): string {
    this.compactionCounter += 1;
    return `${turnId}:compaction:${this.compactionCounter}`;
  }

  private appendChunk(turnId: string, kind: OpenSegment["kind"], text: string): AgentRunEvent[] {
    if (!text) return [];
    const events: AgentRunEvent[] = [];
    if (this.openSegment?.kind !== kind) {
      events.push(...this.closeOpenSegment(turnId));
      this.segmentCounter += 1;
      this.openSegment = { id: `${turnId}:${kind}:${this.segmentCounter}`, kind };
      events.push(this.event(AgentRunEventType.SEGMENT_START, {
        id: this.openSegment.id, turn_id: turnId, segment_type: kind,
      }));
    }
    events.push(this.event(AgentRunEventType.SEGMENT_CONTENT, { id: this.openSegment!.id, turn_id: turnId, delta: text }));
    return events;
  }

  private applyToolCall(turnId: string, update: ToolCallLike): AgentRunEvent[] {
    const previous = this.toolCalls.get(update.toolCallId);
    if (previous?.terminal) return [];
    const snapshot = mergeSnapshot(previous?.snapshot ?? null, update);
    const events: AgentRunEvent[] = [];
    let tracked = previous;
    if (!tracked) {
      events.push(...this.closeOpenSegment(turnId));
      tracked = { snapshot, projection: this.profile.projectToolCall(snapshot), lifecycleStarted: false, terminal: false };
      this.toolCalls.set(update.toolCallId, tracked);
      events.push(this.event(AgentRunEventType.SEGMENT_START, {
        id: update.toolCallId, turn_id: turnId, segment_type: tracked.projection.segmentType,
        metadata: this.toolMetadata(tracked.projection),
      }));
    } else {
      tracked.snapshot = snapshot;
    }
    if (snapshot.status === "in_progress" || snapshot.status === "completed" || snapshot.status === "failed") {
      events.push(...this.startLifecycle(turnId, tracked));
    }
    if (snapshot.status === "completed" || snapshot.status === "failed") {
      events.push(...this.finishToolCall(turnId, tracked));
    }
    return events;
  }

  private startLifecycle(turnId: string, tracked: TrackedToolCall): AgentRunEvent[] {
    if (tracked.lifecycleStarted) return [];
    tracked.lifecycleStarted = true;
    // Arguments may have been completed by updates since the card started.
    tracked.projection = this.profile.projectToolCall(tracked.snapshot);
    return [this.event(AgentRunEventType.TOOL_EXECUTION_STARTED,
      this.toolPayload(turnId, tracked.snapshot.toolCallId, tracked.projection))];
  }

  private finishToolCall(turnId: string, tracked: TrackedToolCall): AgentRunEvent[] {
    tracked.terminal = true;
    const outcome = this.profile.projectToolCall(tracked.snapshot);
    tracked.projection = outcome;
    const toolCallId = tracked.snapshot.toolCallId;
    const failure = tracked.snapshot.status === "failed" || outcome.error !== undefined
      ? outcome.error ?? "Tool execution failed."
      : null;
    const completion = failure ? { error: failure } : { result: outcome.result ?? null };
    return [
      this.segmentEnd(turnId, toolCallId, { ...this.toolMetadata(outcome), ...completion }),
      this.event(failure ? AgentRunEventType.TOOL_EXECUTION_FAILED : AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
        { ...this.toolPayload(turnId, toolCallId, outcome), ...completion }),
    ];
  }

  private interruptOpenToolCalls(turnId: string): AgentRunEvent[] {
    const events: AgentRunEvent[] = [];
    for (const tracked of this.toolCalls.values()) {
      if (tracked.terminal) continue;
      tracked.terminal = true;
      const toolCallId = tracked.snapshot.toolCallId;
      events.push(
        this.segmentEnd(turnId, toolCallId, { ...this.toolMetadata(tracked.projection), interrupted: true }, true),
        this.event(AgentRunEventType.TOOL_EXECUTION_INTERRUPTED, {
          ...this.toolPayload(turnId, toolCallId, tracked.projection), reason: "Turn ended before the tool finished.",
        }),
      );
    }
    return events;
  }

  private toolEvent(toolCallId: string, eventType: AgentRunEventType, extra: Record<string, unknown>): AgentRunEvent[] {
    const tracked = this.toolCalls.get(toolCallId);
    const turnId = this.turnId;
    if (!tracked || tracked.terminal || !turnId) return [];
    return [this.event(eventType, { ...this.toolPayload(turnId, toolCallId, tracked.projection), ...extra })];
  }

  private closeOpenSegment(turnId: string): AgentRunEvent[] {
    const open = this.openSegment;
    if (!open) return [];
    this.openSegment = null;
    return [this.event(AgentRunEventType.SEGMENT_END, { id: open.id, turn_id: turnId })];
  }

  private segmentEnd(turnId: string, id: string, metadata: Record<string, unknown>, interrupted = false): AgentRunEvent {
    return this.event(AgentRunEventType.SEGMENT_END, {
      id, turn_id: turnId, metadata, ...(interrupted ? { interrupted: true } : {}),
    });
  }

  private toolMetadata(projection: AcpToolCallProjection): Record<string, unknown> {
    return { tool_name: projection.toolName, arguments: projection.arguments };
  }

  private toolPayload(turnId: string, invocationId: string, projection: AcpToolCallProjection): Record<string, unknown> {
    return { invocation_id: invocationId, turn_id: turnId, tool_name: projection.toolName, arguments: projection.arguments };
  }

  private event(eventType: AgentRunEventType, payload: Record<string, unknown>, statusHint: AgentRunStatusHint = null): AgentRunEvent {
    return { eventType, runId: this.runId, payload, statusHint };
  }
}
