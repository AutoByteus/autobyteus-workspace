import { ServerMessageType } from "./models.js";

const KNOWN_SERVER_MESSAGE_TYPES = new Set<string>(Object.values(ServerMessageType));

const RUNTIME_TO_SERVER_MESSAGE_TYPE: Record<string, ServerMessageType> = {
  assistant_complete_response: ServerMessageType.ASSISTANT_COMPLETE,
  tool_approval_requested: ServerMessageType.TOOL_APPROVAL_REQUESTED,
  tool_approved: ServerMessageType.TOOL_APPROVED,
  tool_denied: ServerMessageType.TOOL_DENIED,
  tool_execution_started: ServerMessageType.TOOL_EXECUTION_STARTED,
  tool_execution_succeeded: ServerMessageType.TOOL_EXECUTION_SUCCEEDED,
  tool_execution_failed: ServerMessageType.TOOL_EXECUTION_FAILED,
  tool_interaction_log_entry: ServerMessageType.TOOL_LOG,
  agent_status_updated: ServerMessageType.AGENT_STATUS,
  inter_agent_message: ServerMessageType.INTER_AGENT_MESSAGE,
  system_task_notification: ServerMessageType.SYSTEM_TASK_NOTIFICATION,
  agent_todo_list_updated: ServerMessageType.TODO_LIST_UPDATE,
  artifact_persisted: ServerMessageType.ARTIFACT_PERSISTED,
  artifact_updated: ServerMessageType.ARTIFACT_UPDATED,
  team_status: ServerMessageType.TEAM_STATUS,
  task_plan_event: ServerMessageType.TASK_PLAN_EVENT,
  error_event: ServerMessageType.ERROR,
};

const DEPRECATED_DISTRIBUTED_RUNTIME_EVENT_TYPES = new Set<string>(["assistant_chunk"]);

const normalizeSegmentEventType = (
  value: unknown,
): "SEGMENT_START" | "SEGMENT_CONTENT" | "SEGMENT_END" | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "SEGMENT_START" ||
    normalized === "SEGMENT_CONTENT" ||
    normalized === "SEGMENT_END"
  ) {
    return normalized;
  }
  return null;
};

export const isDeprecatedDistributedTeamRuntimeEventType = (runtimeEventType: string): boolean => {
  const normalized = runtimeEventType.trim().toLowerCase();
  if (DEPRECATED_DISTRIBUTED_RUNTIME_EVENT_TYPES.has(normalized)) {
    return true;
  }
  if (!normalized.startsWith("agent:")) {
    return false;
  }
  const stripped = normalized.slice("agent:".length).trim();
  return DEPRECATED_DISTRIBUTED_RUNTIME_EVENT_TYPES.has(stripped);
};

export const resolveSegmentMessageTypeFromPayload = (
  payload: Record<string, unknown>,
): ServerMessageType => {
  const explicitEventType = normalizeSegmentEventType(payload.event_type);
  if (explicitEventType === "SEGMENT_START") {
    return ServerMessageType.SEGMENT_START;
  }
  if (explicitEventType === "SEGMENT_CONTENT") {
    return ServerMessageType.SEGMENT_CONTENT;
  }
  if (explicitEventType === "SEGMENT_END") {
    return ServerMessageType.SEGMENT_END;
  }

  if (typeof payload.segment_type === "string") {
    return ServerMessageType.SEGMENT_START;
  }
  if (typeof payload.delta === "string") {
    return ServerMessageType.SEGMENT_CONTENT;
  }
  return ServerMessageType.SEGMENT_END;
};

export const isSegmentServerMessageType = (messageType: ServerMessageType): boolean =>
  messageType === ServerMessageType.SEGMENT_START ||
  messageType === ServerMessageType.SEGMENT_CONTENT ||
  messageType === ServerMessageType.SEGMENT_END;

export const normalizeDistributedSegmentPayload = (
  messageType: ServerMessageType,
  payload: Record<string, unknown>,
): void => {
  if (!isSegmentServerMessageType(messageType)) {
    return;
  }

  // Distributed websocket payload contract is canonical: use id and top-level segment fields.
  if (payload.segment_id !== undefined) {
    delete payload.segment_id;
  }
  if (payload.payload !== undefined) {
    delete payload.payload;
  }
};

export const resolveDistributedMessageType = (
  eventType: string,
  payload: Record<string, unknown>,
): ServerMessageType | null => {
  const normalized = eventType.trim();
  if (KNOWN_SERVER_MESSAGE_TYPES.has(normalized)) {
    return normalized as ServerMessageType;
  }

  const normalizedLower = normalized.toLowerCase();
  if (normalizedLower === "segment_event") {
    return resolveSegmentMessageTypeFromPayload(payload);
  }
  const directRuntimeType = RUNTIME_TO_SERVER_MESSAGE_TYPE[normalizedLower];
  if (directRuntimeType) {
    return directRuntimeType;
  }

  if (normalizedLower.startsWith("agent:")) {
    const stripped = normalized.slice("agent:".length).trim();
    const strippedLower = stripped.toLowerCase();
    if (KNOWN_SERVER_MESSAGE_TYPES.has(stripped)) {
      return stripped as ServerMessageType;
    }
    if (strippedLower === "segment_event") {
      return resolveSegmentMessageTypeFromPayload(payload);
    }
    const mapped = RUNTIME_TO_SERVER_MESSAGE_TYPE[strippedLower];
    if (mapped) {
      return mapped;
    }
  }

  if (normalizedLower.startsWith("task_plan:")) {
    return ServerMessageType.TASK_PLAN_EVENT;
  }

  return null;
};
