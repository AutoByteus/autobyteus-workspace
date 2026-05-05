export type AgentRunStatusHint = "ACTIVE" | "IDLE" | "ERROR" | null;

export enum AgentRunEventType {
  TURN_STARTED = "TURN_STARTED",
  TURN_COMPLETED = "TURN_COMPLETED",
  SEGMENT_START = "SEGMENT_START",
  SEGMENT_CONTENT = "SEGMENT_CONTENT",
  SEGMENT_END = "SEGMENT_END",
  AGENT_STATUS = "AGENT_STATUS",
  COMPACTION_STATUS = "COMPACTION_STATUS",
  ASSISTANT_COMPLETE = "ASSISTANT_COMPLETE",
  TOOL_APPROVAL_REQUESTED = "TOOL_APPROVAL_REQUESTED",
  TOOL_APPROVED = "TOOL_APPROVED",
  TOOL_DENIED = "TOOL_DENIED",
  TOOL_EXECUTION_STARTED = "TOOL_EXECUTION_STARTED",
  TOOL_EXECUTION_SUCCEEDED = "TOOL_EXECUTION_SUCCEEDED",
  TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED",
  TOOL_LOG = "TOOL_LOG",
  TODO_LIST_UPDATE = "TODO_LIST_UPDATE",
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
