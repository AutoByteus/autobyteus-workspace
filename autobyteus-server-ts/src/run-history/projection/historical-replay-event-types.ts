import type {
  RunProjectionActivityStatus,
  RunProjectionActivityType,
  RunProjectionSourceDetailLevel,
} from "./run-projection-types.js";

export interface HistoricalReplayMessageEvent {
  kind: "message";
  role: string | null;
  content: string | null;
  media: Record<string, string[]> | null;
  ts: number | null;
}

export interface HistoricalReplayReasoningEvent {
  kind: "reasoning";
  content: string | null;
  media: Record<string, string[]> | null;
  ts: number | null;
}

export interface HistoricalReplayToolEvent {
  kind: "tool";
  invocationId: string;
  toolName: string;
  toolArgs: Record<string, unknown> | null;
  toolResult: unknown | null;
  toolError: string | null;
  content: string | null;
  media: Record<string, string[]> | null;
  ts: number | null;
  activityType: RunProjectionActivityType;
  status: RunProjectionActivityStatus;
  contextText: string;
  logs: string[];
  detailLevel: RunProjectionSourceDetailLevel;
}

export type HistoricalReplayEvent =
  | HistoricalReplayMessageEvent
  | HistoricalReplayReasoningEvent
  | HistoricalReplayToolEvent;
