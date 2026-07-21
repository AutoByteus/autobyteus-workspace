import type {
  ApplicationAgentEvent,
  ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";

type RecordValue = Record<string, unknown>;
type ValueValidator = (value: unknown) => boolean;

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isString: ValueValidator = (value) => typeof value === "string";
const isBoolean: ValueValidator = (value) => typeof value === "boolean";
const isNullableString: ValueValidator = (value) => value === null || isString(value);
const isNullableNumber: ValueValidator = (value) => value === null || (typeof value === "number" && Number.isFinite(value));
const isStringArray: ValueValidator = (value) => Array.isArray(value) && value.every(isString);
const isOneOf = (...allowed: readonly string[]): ValueValidator => (value) =>
  typeof value === "string" && allowed.includes(value);
const exact = (value: unknown, shape: Record<string, ValueValidator>): boolean => {
  if (!isRecord(value)) return false;
  const keys = Object.keys(shape);
  return Object.keys(value).length === keys.length && keys.every((key) =>
    Object.prototype.hasOwnProperty.call(value, key) && shape[key]!(value[key]));
};
const nullable = (validator: ValueValidator): ValueValidator => (value) => value === null || validator(value);

const isSafeError: ValueValidator = (value) => exact(value, {
  code: isOneOf("RUNTIME_ERROR", "TOOL_EXECUTION_ERROR", "COMPACTION_ERROR", "SEGMENT_ERROR", "UNKNOWN_ERROR"),
  message: isString,
});
const isParticipant: ValueValidator = (value) => {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "TEAM") return exact(value, { kind: isOneOf("TEAM"), memberRouteKey: isNullableString });
  return value.kind === "MEMBER" && exact(value, { kind: isOneOf("MEMBER"), memberRouteKey: isString });
};
const toolRef = {
  invocationId: isNullableString,
  toolName: isNullableString,
  turnId: isNullableString,
};
const isTodoItem: ValueValidator = (value) => exact(value, {
  id: isString,
  description: isString,
  status: isOneOf("PENDING", "IN_PROGRESS", "COMPLETED", "UNKNOWN"),
});
const isTodoItems: ValueValidator = (value) => Array.isArray(value) && value.every(isTodoItem);
const teamMessage = {
  messageId: isString,
  sender: isParticipant,
  receiver: isParticipant,
  content: isString,
  messageType: isString,
  createdAt: isString,
};

const agentDataValidators: Record<string, ValueValidator> = {
  TURN_STARTED: (value) => exact(value, { turnId: isNullableString }),
  TURN_COMPLETED: (value) => exact(value, { turnId: isNullableString }),
  TURN_INTERRUPTED: (value) => exact(value, { turnId: isNullableString, reason: isNullableString }),
  SEGMENT_START: (value) => exact(value, {
    segmentId: isString,
    turnId: isNullableString,
    kind: isOneOf("TEXT", "REASONING", "TOOL_CALL", "COMMAND", "FILE_EDIT", "MEDIA", "OTHER"),
    toolName: isNullableString,
  }),
  SEGMENT_CONTENT: (value) => exact(value, {
    segmentId: isString,
    turnId: isNullableString,
    kind: isOneOf("TEXT", "REASONING", "TOOL_CALL", "COMMAND", "FILE_EDIT", "MEDIA", "OTHER"),
    delta: isString,
  }),
  SEGMENT_END: (value) => exact(value, {
    segmentId: isString,
    turnId: isNullableString,
    kind: isOneOf("TEXT", "REASONING", "TOOL_CALL", "COMMAND", "FILE_EDIT", "MEDIA", "OTHER"),
    interrupted: isBoolean,
    failed: isBoolean,
    reason: isNullableString,
    error: nullable(isSafeError),
  }),
  AGENT_STATUS: (value) => exact(value, {
    status: isOneOf("OFFLINE", "INITIALIZING", "IDLE", "RUNNING", "ERROR"),
    canInterrupt: isBoolean,
    trigger: isNullableString,
    toolName: isNullableString,
    error: nullable(isSafeError),
  }),
  COMPACTION_STATUS: (value) => exact(value, {
    phase: isOneOf("REQUESTED", "STARTED", "COMPLETED", "FAILED", "UNKNOWN"),
    turnId: isNullableString,
    trigger: isNullableString,
    selectedBlockCount: isNullableNumber,
    compactedBlockCount: isNullableNumber,
    error: nullable(isSafeError),
  }),
  TOKEN_USAGE_UPDATED: (value) => exact(value, {
    usageEventId: isNullableString,
    observedAt: isNullableString,
    turnId: isNullableString,
    inputTokens: isNullableNumber,
    cachedInputTokens: isNullableNumber,
    outputTokens: isNullableNumber,
    reasoningOutputTokens: isNullableNumber,
    totalTokens: isNullableNumber,
    contextWindowUsagePercent: isNullableNumber,
  }),
  AGENT_RESPONSE_COMPLETED: (value) => exact(value, { content: isNullableString, reasoning: isNullableString }),
  TOOL_APPROVAL_REQUESTED: (value) => exact(value, { ...toolRef, argumentSummary: isNullableString }),
  TOOL_APPROVED: (value) => exact(value, { ...toolRef, reason: isNullableString }),
  TOOL_DENIED: (value) => exact(value, {
    ...toolRef,
    argumentSummary: isNullableString,
    reason: isNullableString,
    error: nullable(isSafeError),
  }),
  TOOL_EXECUTION_STARTED: (value) => exact(value, { ...toolRef, argumentSummary: isNullableString }),
  TOOL_EXECUTION_SUCCEEDED: (value) => exact(value, { ...toolRef, resultSummary: isNullableString }),
  TOOL_EXECUTION_FAILED: (value) => exact(value, { ...toolRef, error: isSafeError }),
  TOOL_EXECUTION_INTERRUPTED: (value) => exact(value, { ...toolRef, reason: isString }),
  TOOL_LOG: (value) => exact(value, { ...toolRef, entry: isString }),
  TODO_LIST_UPDATE: (value) => exact(value, { items: isTodoItems }),
  INTER_AGENT_MESSAGE: (value) => exact(value, {
    messageId: isNullableString,
    senderMemberRouteKey: isNullableString,
    receiverMemberRouteKey: isNullableString,
    content: isString,
    messageType: isNullableString,
    createdAt: isNullableString,
  }),
  TEAM_COMMUNICATION_MESSAGE: (value) => exact(value, teamMessage),
  SYSTEM_TASK_NOTIFICATION: (value) => exact(value, { content: isString }),
  ERROR: (value) => exact(value, { error: isSafeError }),
};

const teamDataValidators: Record<string, ValueValidator> = {
  TEAM_STATUS: (value) => exact(value, {
    status: isOneOf("OFFLINE", "INITIALIZING", "IDLE", "RUNNING", "ERROR"),
    error: nullable(isSafeError),
  }),
  TASK_DELEGATION_EVENT: (value) => exact(value, {
    delegationEventType: isOneOf("ACTIVATED", "STATUS_UPDATED", "RESULT_SUBMITTED", "RESULT_REVIEWED", "TERMINAL_STATUS"),
    taskId: isNullableString,
    taskIds: isStringArray,
    taskLabel: isNullableString,
    description: isNullableString,
    status: isNullableString,
    previousStatus: isNullableString,
    target: nullable(isParticipant),
    executionKind: nullable(isOneOf("AGENT", "TEAM")),
    terminal: isBoolean,
    message: isNullableString,
    occurredAt: isNullableString,
  }),
  TEAM_COMMUNICATION_MESSAGE: (value) => exact(value, teamMessage),
  MEMBER_INPUT_MESSAGE: (value) => exact(value, {
    messageId: isString,
    inputOrigin: isOneOf("USER_MESSAGE", "INTER_AGENT_DELIVERY"),
    recipientMemberRouteKey: isString,
    senderMemberRouteKey: isNullableString,
    content: isString,
    receivedAt: isString,
    parentCommunicationMessageId: isNullableString,
  }),
};

export const isApplicationAgentTargetAddress = (value: unknown): value is ApplicationAgentTargetAddress => {
  if (!isRecord(value) || !exact(value, { bindingId: isString, target: isRecord })) return false;
  const bindingId = value.bindingId;
  const target = value.target;
  if (typeof bindingId !== "string" || !bindingId.trim() || !isRecord(target) || typeof target.kind !== "string") return false;
  if (target.kind === "AGENT_RUN") return exact(target, { kind: isOneOf("AGENT_RUN") });
  if (target.kind === "AGENT_TEAM_RUN") return exact(target, { kind: isOneOf("AGENT_TEAM_RUN") });
  return target.kind === "AGENT_TEAM_MEMBER" && exact(target, {
    kind: isOneOf("AGENT_TEAM_MEMBER"),
    memberRouteKey: (memberRouteKey) => typeof memberRouteKey === "string" && memberRouteKey.trim().length > 0,
  });
};

const isProducer: ValueValidator = (value) => exact(value, {
  runId: isString,
  memberRouteKey: isString,
  memberName: isNullableString,
  displayName: isNullableString,
  runtimeKind: isOneOf("AGENT", "AGENT_TEAM_MEMBER"),
  teamPath: isStringArray,
});

export const isApplicationAgentEvent = (value: unknown): value is ApplicationAgentEvent => {
  if (!isRecord(value) || !exact(value, {
    sequence: (sequence) => typeof sequence === "number" && Number.isSafeInteger(sequence) && sequence > 0,
    observedAt: isString,
    applicationId: isString,
    address: isApplicationAgentTargetAddress,
    runtimeSubject: isOneOf("AGENT_RUN", "TEAM_RUN"),
    producer: nullable(isProducer),
    event: isRecord,
  }) || !isRecord(value.event)) return false;
  const address = value.address as ApplicationAgentTargetAddress;
  const expectedRuntimeSubject = address.target.kind === "AGENT_RUN" ? "AGENT_RUN" : "TEAM_RUN";
  if (value.runtimeSubject !== expectedRuntimeSubject) return false;
  const publicEvent = value.event;
  if (!exact(publicEvent, { source: isString, type: isString, data: isRecord })) return false;
  const validators = publicEvent.source === "AGENT"
    ? agentDataValidators
    : publicEvent.source === "AGENT_TEAM"
      ? teamDataValidators
      : null;
  return validators !== null && typeof publicEvent.type === "string" &&
    Object.prototype.hasOwnProperty.call(validators, publicEvent.type) && validators[publicEvent.type]!(publicEvent.data);
};
