export enum ClientMessageType {
  SEND_MESSAGE = "SEND_MESSAGE",
  INTERRUPT_GENERATION = "INTERRUPT_GENERATION",
  APPROVE_TOOL = "APPROVE_TOOL",
  DENY_TOOL = "DENY_TOOL",
}

export enum ServerMessageType {
  SYSTEM_INSTRUCTIONS_SUPPLIED = "SYSTEM_INSTRUCTIONS_SUPPLIED",
  TURN_STARTED = "TURN_STARTED",
  TURN_COMPLETED = "TURN_COMPLETED",
  TURN_INTERRUPTED = "TURN_INTERRUPTED",
  SEGMENT_START = "SEGMENT_START",
  SEGMENT_CONTENT = "SEGMENT_CONTENT",
  SEGMENT_END = "SEGMENT_END",
  /** Coalesced content of an agent run's own stream: one frame covering `[sequence, sequence_through]` (SR-087). */
  SEGMENT_CONTENT_BATCH = "SEGMENT_CONTENT_BATCH",
  AGENT_STATUS = "AGENT_STATUS",
  AGENT_COMMAND_ACK = "AGENT_COMMAND_ACK",
  AGENT_INPUT_STATE = "AGENT_INPUT_STATE",
  COMPACTION_BLOCKED = "COMPACTION_BLOCKED",
  COMPACTION_RESUMED = "COMPACTION_RESUMED",
  COMPACTION_STATUS = "COMPACTION_STATUS",
  TOKEN_USAGE_UPDATED = "TOKEN_USAGE_UPDATED",
  TOOL_APPROVAL_REQUESTED = "TOOL_APPROVAL_REQUESTED",
  TOOL_APPROVED = "TOOL_APPROVED",
  TOOL_DENIED = "TOOL_DENIED",
  TOOL_EXECUTION_STARTED = "TOOL_EXECUTION_STARTED",
  TOOL_EXECUTION_SUCCEEDED = "TOOL_EXECUTION_SUCCEEDED",
  TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED",
  TOOL_EXECUTION_INTERRUPTED = "TOOL_EXECUTION_INTERRUPTED",
  TOOL_LOG = "TOOL_LOG",
  ASSISTANT_COMPLETE = "ASSISTANT_COMPLETE",
  BACKGROUND_TASK_UPDATED = "BACKGROUND_TASK_UPDATED",
  MEMBER_INPUT_MESSAGE = "MEMBER_INPUT_MESSAGE",
  INTER_AGENT_MESSAGE = "INTER_AGENT_MESSAGE",
  TEAM_COMMUNICATION_MESSAGE = "TEAM_COMMUNICATION_MESSAGE",
  SYSTEM_TASK_NOTIFICATION = "SYSTEM_TASK_NOTIFICATION",
  TEAM_RUN_LIFECYCLE = "TEAM_RUN_LIFECYCLE",
  ARTIFACT_PERSISTED = "ARTIFACT_PERSISTED",
  FILE_CHANGE = "FILE_CHANGE",
  ERROR = "ERROR",
  CONNECTED = "CONNECTED",
  /** An agent run's own stream snapshot (autobyteus-461 SR-087): its stored part, its unconfirmed turns' frames, its base. */
  AGENT_STREAM_SNAPSHOT = "AGENT_STREAM_SNAPSHOT",
}

export type ServerMessagePayload = Record<string, unknown>;

export class ServerMessage {
  readonly type: ServerMessageType;
  readonly payload: ServerMessagePayload;
  /** A frame of an agent run's own stream carries its number in the run's `AgentStreamSequence` (SR-087). */
  readonly sequence: number | undefined;
  /** A content batch covers the frames `sequence` through this one. */
  readonly sequenceThrough: number | undefined;

  constructor(type: ServerMessageType, payload: ServerMessagePayload, sequence?: number, sequenceThrough?: number) {
    this.type = type;
    this.payload = payload;
    this.sequence = sequence;
    this.sequenceThrough = sequenceThrough;
  }

  /** The same message, numbered as a frame of its run's sequence. */
  numbered(sequence: number): ServerMessage {
    return new ServerMessage(this.type, this.payload, sequence);
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      payload: this.payload,
      ...(this.sequence === undefined ? {} : { sequence: this.sequence }),
      ...(this.sequenceThrough === undefined ? {} : { sequence_through: this.sequenceThrough }),
    };
  }

  toJson(): string {
    return JSON.stringify(this.toJSON());
  }
}

export function createConnectedMessage(agentRunId: string, sessionId: string): ServerMessage {
  return new ServerMessage(ServerMessageType.CONNECTED, {
    agent_id: agentRunId,
    session_id: sessionId,
  });
}

export function createErrorMessage(code: string, message: string): ServerMessage {
  return new ServerMessage(ServerMessageType.ERROR, {
    code,
    message,
    error_scope: null,
    error_effect: null,
    turn_id: null,
    // A stream's own error is a conversation row: it carries the node's time (autobyteus-628 D-3).
    occurred_at: new Date().toISOString(),
  });
}
