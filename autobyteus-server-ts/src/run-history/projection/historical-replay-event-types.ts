import type {
  RunProjectionActivityStatus,
  RunProjectionActivityType,
  RunProjectionCompactionPhase,
  RunProjectionSourceDetailLevel,
} from "./run-projection-types.js";
import type { RawTraceMedia } from "autobyteus-ts/memory/models/raw-trace-item.js";

export interface HistoricalReplayMessageEvent {
  eventId: string;
  turnGroupId: string;
  kind: "message";
  role: string | null;
  content: string | null;
  media: RawTraceMedia | null;
  ts: number | null;
}

export interface HistoricalReplayReasoningEvent {
  eventId: string;
  turnGroupId: string;
  kind: "reasoning";
  content: string | null;
  media: RawTraceMedia | null;
  ts: number | null;
}

export interface HistoricalReplayToolEvent {
  eventId: string;
  turnGroupId: string;
  kind: "tool";
  invocationId: string;
  toolName: string;
  toolArgs: Record<string, unknown> | null;
  toolResult: unknown | null;
  toolError: string | null;
  content: string | null;
  media: RawTraceMedia | null;
  ts: number | null;
  activityType: RunProjectionActivityType;
  status: RunProjectionActivityStatus;
  contextText: string;
  logs: string[];
  detailLevel: RunProjectionSourceDetailLevel;
}

export interface HistoricalReplayCompactionEvent {
  eventId: string;
  turnGroupId: string;
  kind: "compaction";
  activityId: string;
  phase: RunProjectionCompactionPhase;
  message: string;
  turnId: string | null;
  compactionOperationId: string | null;
  requestedTurnId: string | null;
  executionTurnId: string | null;
  provider: string | null;
  sourceSurface: string | null;
  boundaryKey: string | null;
  providerEventId: string | null;
  providerSessionId: string | null;
  trigger: string | null;
  preTokens: number | null;
  rawTraceCount: number | null;
  semanticFactCount: number | null;
  rotationEligible: boolean | null;
  ts: number | null;
  detailLevel: RunProjectionSourceDetailLevel;
}

export interface HistoricalReplaySystemInstructionEvent {
  eventId: string;
  kind: "system_instruction";
  activityId: string;
  content: string;
  ts: number;
}

export type HistoricalReplayEvent =
  | HistoricalReplayMessageEvent
  | HistoricalReplayReasoningEvent
  | HistoricalReplayToolEvent
  | HistoricalReplayCompactionEvent
  | HistoricalReplaySystemInstructionEvent;

export type EventMonitorReplayEvent = Exclude<
  HistoricalReplayEvent,
  HistoricalReplaySystemInstructionEvent
>;

export const isEventMonitorReplayEvent = (
  event: HistoricalReplayEvent,
): event is EventMonitorReplayEvent => event.kind !== "system_instruction";
