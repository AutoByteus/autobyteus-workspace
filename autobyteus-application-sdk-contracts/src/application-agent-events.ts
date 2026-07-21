import type {
  ApplicationAgentTargetAddress,
  ApplicationExecutionProducer,
} from "./application-agent-bindings.js";

export type ApplicationAgentEventSafeErrorCode =
  | "RUNTIME_ERROR"
  | "TOOL_EXECUTION_ERROR"
  | "COMPACTION_ERROR"
  | "SEGMENT_ERROR"
  | "UNKNOWN_ERROR";

export type ApplicationAgentEventSafeError = {
  code: ApplicationAgentEventSafeErrorCode;
  message: string;
};

export type ApplicationAgentEventSegmentKind =
  | "TEXT"
  | "REASONING"
  | "TOOL_CALL"
  | "COMMAND"
  | "FILE_EDIT"
  | "MEDIA"
  | "OTHER";

export type ApplicationAgentEventStatus =
  | "OFFLINE"
  | "INITIALIZING"
  | "IDLE"
  | "RUNNING"
  | "ERROR";

export type ApplicationAgentEventTodoItem = {
  id: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "UNKNOWN";
};

export type ApplicationAgentEventParticipant =
  | { kind: "TEAM"; memberRouteKey: string | null }
  | { kind: "MEMBER"; memberRouteKey: string };

export type ApplicationAgentEventToolRef = {
  invocationId: string | null;
  toolName: string | null;
  turnId: string | null;
};

export type ApplicationAgentRunPublicDataByType = {
  TURN_STARTED: { turnId: string | null };
  TURN_COMPLETED: { turnId: string | null };
  TURN_INTERRUPTED: { turnId: string | null; reason: string | null };
  SEGMENT_START: { segmentId: string; turnId: string | null; kind: ApplicationAgentEventSegmentKind; toolName: string | null };
  SEGMENT_CONTENT: { segmentId: string; turnId: string | null; kind: ApplicationAgentEventSegmentKind; delta: string };
  SEGMENT_END: {
    segmentId: string;
    turnId: string | null;
    kind: ApplicationAgentEventSegmentKind;
    interrupted: boolean;
    failed: boolean;
    reason: string | null;
    error: ApplicationAgentEventSafeError | null;
  };
  AGENT_STATUS: {
    status: ApplicationAgentEventStatus;
    canInterrupt: boolean;
    trigger: string | null;
    toolName: string | null;
    error: ApplicationAgentEventSafeError | null;
  };
  COMPACTION_STATUS: {
    phase: "REQUESTED" | "STARTED" | "COMPLETED" | "FAILED" | "UNKNOWN";
    turnId: string | null;
    trigger: string | null;
    selectedBlockCount: number | null;
    compactedBlockCount: number | null;
    error: ApplicationAgentEventSafeError | null;
  };
  TOKEN_USAGE_UPDATED: {
    usageEventId: string | null;
    observedAt: string | null;
    turnId: string | null;
    inputTokens: number | null;
    cachedInputTokens: number | null;
    outputTokens: number | null;
    reasoningOutputTokens: number | null;
    totalTokens: number | null;
    contextWindowUsagePercent: number | null;
  };
  AGENT_RESPONSE_COMPLETED: { content: string | null; reasoning: string | null };
  TOOL_APPROVAL_REQUESTED: ApplicationAgentEventToolRef & { argumentSummary: string | null };
  TOOL_APPROVED: ApplicationAgentEventToolRef & { reason: string | null };
  TOOL_DENIED: ApplicationAgentEventToolRef & { argumentSummary: string | null; reason: string | null; error: ApplicationAgentEventSafeError | null };
  TOOL_EXECUTION_STARTED: ApplicationAgentEventToolRef & { argumentSummary: string | null };
  TOOL_EXECUTION_SUCCEEDED: ApplicationAgentEventToolRef & { resultSummary: string | null };
  TOOL_EXECUTION_FAILED: ApplicationAgentEventToolRef & { error: ApplicationAgentEventSafeError };
  TOOL_EXECUTION_INTERRUPTED: ApplicationAgentEventToolRef & { reason: string };
  TOOL_LOG: ApplicationAgentEventToolRef & { entry: string };
  TODO_LIST_UPDATE: { items: ApplicationAgentEventTodoItem[] };
  INTER_AGENT_MESSAGE: {
    messageId: string | null;
    senderMemberRouteKey: string | null;
    receiverMemberRouteKey: string | null;
    content: string;
    messageType: string | null;
    createdAt: string | null;
  };
  TEAM_COMMUNICATION_MESSAGE: {
    messageId: string;
    sender: ApplicationAgentEventParticipant;
    receiver: ApplicationAgentEventParticipant;
    content: string;
    messageType: string;
    createdAt: string;
  };
  SYSTEM_TASK_NOTIFICATION: { content: string };
  ERROR: { error: ApplicationAgentEventSafeError };
};

export type ApplicationAgentTeamPublicDataByType = {
  TEAM_STATUS: { status: ApplicationAgentEventStatus; error: ApplicationAgentEventSafeError | null };
  TASK_DELEGATION_EVENT: {
    delegationEventType: "ACTIVATED" | "STATUS_UPDATED" | "RESULT_SUBMITTED" | "RESULT_REVIEWED" | "TERMINAL_STATUS";
    taskId: string | null;
    taskIds: string[];
    taskLabel: string | null;
    description: string | null;
    status: string | null;
    previousStatus: string | null;
    target: ApplicationAgentEventParticipant | null;
    executionKind: "AGENT" | "TEAM" | null;
    terminal: boolean;
    message: string | null;
    occurredAt: string | null;
  };
  TEAM_COMMUNICATION_MESSAGE: {
    messageId: string;
    sender: ApplicationAgentEventParticipant;
    receiver: ApplicationAgentEventParticipant;
    content: string;
    messageType: string;
    createdAt: string;
  };
  MEMBER_INPUT_MESSAGE: {
    messageId: string;
    inputOrigin: "USER_MESSAGE" | "INTER_AGENT_DELIVERY";
    recipientMemberRouteKey: string;
    senderMemberRouteKey: string | null;
    content: string;
    receivedAt: string;
    parentCommunicationMessageId: string | null;
  };
};

export type ApplicationAgentRunPublicEvent = {
  [T in keyof ApplicationAgentRunPublicDataByType]: {
    source: "AGENT";
    type: T;
    data: ApplicationAgentRunPublicDataByType[T];
  }
}[keyof ApplicationAgentRunPublicDataByType];

export type ApplicationAgentTeamPublicEvent = {
  [T in keyof ApplicationAgentTeamPublicDataByType]: {
    source: "AGENT_TEAM";
    type: T;
    data: ApplicationAgentTeamPublicDataByType[T];
  }
}[keyof ApplicationAgentTeamPublicDataByType];

export type ApplicationAgentEvent = {
  sequence: number;
  observedAt: string;
  applicationId: string;
  address: ApplicationAgentTargetAddress;
  runtimeSubject: "AGENT_RUN" | "TEAM_RUN";
  producer: ApplicationExecutionProducer | null;
  event: ApplicationAgentRunPublicEvent | ApplicationAgentTeamPublicEvent;
};
