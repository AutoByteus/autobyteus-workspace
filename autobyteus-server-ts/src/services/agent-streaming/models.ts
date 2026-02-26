export enum ClientMessageType {
  SEND_MESSAGE = "SEND_MESSAGE",
  STOP_GENERATION = "STOP_GENERATION",
  APPROVE_TOOL = "APPROVE_TOOL",
  DENY_TOOL = "DENY_TOOL",
}

export enum ServerMessageType {
  SEGMENT_START = "SEGMENT_START",
  SEGMENT_CONTENT = "SEGMENT_CONTENT",
  SEGMENT_END = "SEGMENT_END",
  AGENT_STATUS = "AGENT_STATUS",
  TOOL_APPROVAL_REQUESTED = "TOOL_APPROVAL_REQUESTED",
  TOOL_APPROVED = "TOOL_APPROVED",
  TOOL_DENIED = "TOOL_DENIED",
  TOOL_EXECUTION_STARTED = "TOOL_EXECUTION_STARTED",
  TOOL_EXECUTION_SUCCEEDED = "TOOL_EXECUTION_SUCCEEDED",
  TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED",
  TOOL_LOG = "TOOL_LOG",
  ASSISTANT_CHUNK = "ASSISTANT_CHUNK",
  ASSISTANT_COMPLETE = "ASSISTANT_COMPLETE",
  TODO_LIST_UPDATE = "TODO_LIST_UPDATE",
  INTER_AGENT_MESSAGE = "INTER_AGENT_MESSAGE",
  SYSTEM_TASK_NOTIFICATION = "SYSTEM_TASK_NOTIFICATION",
  TEAM_STATUS = "TEAM_STATUS",
  TASK_PLAN_EVENT = "TASK_PLAN_EVENT",
  ARTIFACT_PERSISTED = "ARTIFACT_PERSISTED",
  ARTIFACT_UPDATED = "ARTIFACT_UPDATED",
  ERROR = "ERROR",
  CONNECTED = "CONNECTED",
}

export type ServerMessagePayload = Record<string, unknown>;

export class ServerMessage {
  readonly type: ServerMessageType;
  readonly payload: ServerMessagePayload;

  constructor(type: ServerMessageType, payload: ServerMessagePayload) {
    this.type = type;
    this.payload = payload;
  }

  toJson(): string {
    return JSON.stringify({
      type: this.type,
      payload: this.payload,
    });
  }
}

export function createConnectedMessage(agentId: string, sessionId: string): ServerMessage {
  return new ServerMessage(ServerMessageType.CONNECTED, {
    agent_id: agentId,
    session_id: sessionId,
  });
}

export function createErrorMessage(code: string, message: string): ServerMessage {
  return new ServerMessage(ServerMessageType.ERROR, {
    code,
    message,
  });
}
