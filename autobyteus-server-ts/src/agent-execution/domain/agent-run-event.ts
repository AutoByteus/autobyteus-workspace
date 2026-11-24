export type AgentRunStatusHint = "ACTIVE" | "IDLE" | "ERROR" | null;

export enum AgentRunEventType {
  SYSTEM_INSTRUCTIONS_SUPPLIED = "SYSTEM_INSTRUCTIONS_SUPPLIED",
  TURN_STARTED = "TURN_STARTED",
  TURN_COMPLETED = "TURN_COMPLETED",
  TURN_INTERRUPTED = "TURN_INTERRUPTED",
  SEGMENT_START = "SEGMENT_START",
  SEGMENT_CONTENT = "SEGMENT_CONTENT",
  SEGMENT_END = "SEGMENT_END",
  AGENT_STATUS = "AGENT_STATUS",
  COMPACTION_BLOCKED = "COMPACTION_BLOCKED",
  COMPACTION_RESUMED = "COMPACTION_RESUMED",
  AGENT_INPUT_STATE = "AGENT_INPUT_STATE",
  COMPACTION_STATUS = "COMPACTION_STATUS",
  TOKEN_USAGE_UPDATED = "TOKEN_USAGE_UPDATED",
  ASSISTANT_COMPLETE = "ASSISTANT_COMPLETE",
  TOOL_APPROVAL_REQUESTED = "TOOL_APPROVAL_REQUESTED",
  TOOL_APPROVED = "TOOL_APPROVED",
  TOOL_DENIED = "TOOL_DENIED",
  TOOL_EXECUTION_STARTED = "TOOL_EXECUTION_STARTED",
  TOOL_EXECUTION_SUCCEEDED = "TOOL_EXECUTION_SUCCEEDED",
  TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED",
  TOOL_EXECUTION_INTERRUPTED = "TOOL_EXECUTION_INTERRUPTED",
  TOOL_LOG = "TOOL_LOG",
  BACKGROUND_TASK_UPDATED = "BACKGROUND_TASK_UPDATED",
  INTER_AGENT_MESSAGE = "INTER_AGENT_MESSAGE",
  TEAM_COMMUNICATION_MESSAGE = "TEAM_COMMUNICATION_MESSAGE",
  SYSTEM_TASK_NOTIFICATION = "SYSTEM_TASK_NOTIFICATION",
  ARTIFACT_PERSISTED = "ARTIFACT_PERSISTED",
  FILE_CHANGE = "FILE_CHANGE",
  ERROR = "ERROR",
}

export interface AgentRunEvent {
  eventType: AgentRunEventType;
  runId: string;
  payload: Record<string, unknown>;
  statusHint: AgentRunStatusHint;
  /**
   * The node's time of the event, epoch ms (autobyteus-628 D-3): set once by the AgentRun as it delivers the event to
   * its listeners, so every stream reads the same time. Unset before delivery. The memory recorder does not read it: a
   * stored trace keeps its write time (SR-007).
   */
  occurredAt?: number;
}

export const isAgentRunEvent = (value: unknown): value is AgentRunEvent => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const event = value as Record<string, unknown>;
  return (
    typeof event.runId === "string" &&
    event.runId.length > 0 &&
    typeof event.eventType === "string" &&
    Object.values(AgentRunEventType).includes(event.eventType as AgentRunEventType) &&
    !!event.payload &&
    typeof event.payload === "object" &&
    !Array.isArray(event.payload)
  );
};

/** The event as a run delivers it: with the node's time now, unless it already has one (autobyteus-628 D-3). */
export const stampForDelivery = (event: AgentRunEvent): AgentRunEvent =>
  event.occurredAt === undefined ? { ...event, occurredAt: Date.now() } : event;

/**
 * The event's `occurred_at` on the wire: the node's time as ISO 8601 UTC (autobyteus-628 D-3). An event a run delivered
 * always has one; a producer outside the run stamps its own (`occurredAt: Date.now()`). A timed event without one is a
 * producer's mistake and fails here, so no row is ever timed by the viewer's clock.
 */
export const serverTimeOf = (event: Readonly<{ eventType: string; occurredAt?: number }>): string => {
  if (event.occurredAt === undefined) throw new Error(`${event.eventType} event has no occurredAt: its producer did not stamp it.`);
  return new Date(event.occurredAt).toISOString();
};
