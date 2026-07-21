import type {
  ApplicationAgentRunPublicEvent,
  ApplicationAgentEventParticipant,
  ApplicationAgentEventSafeError,
  ApplicationAgentEventSafeErrorCode,
  ApplicationAgentEventSegmentKind,
  ApplicationAgentEventStatus,
  ApplicationAgentEventTodoItem,
  ApplicationAgentEventToolRef,
  ApplicationAgentTeamPublicEvent,
} from "@autobyteus/application-sdk-contracts";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import {
  TeamRunEventSourceType,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
  type TeamRunMemberInputEventPayload,
  type TeamRunStatusUpdateData,
  type TeamRunTaskDelegationEventPayload,
} from "../../agent-team-execution/domain/team-run-event.js";
import {
  APPLICATION_AGENT_EVENT_ARRAY_LIMIT,
  APPLICATION_AGENT_EVENT_SUMMARY_LIMIT,
  APPLICATION_AGENT_EVENT_TEXT_LIMIT,
} from "../domain/application-agent-streaming-models.js";

export class ApplicationAgentStreamProjectionError extends Error {}

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const first = (source: RecordValue, ...keys: string[]): unknown => {
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  return undefined;
};
const scalar = (source: RecordValue, keys: string[], limit = APPLICATION_AGENT_EVENT_TEXT_LIMIT): string | null => {
  const value = first(source, ...keys);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && Buffer.byteLength(normalized, "utf8") <= limit ? normalized : null;
};
const required = (source: RecordValue, keys: string[], field: string): string => {
  const value = scalar(source, keys);
  if (!value) throw new ApplicationAgentStreamProjectionError(`Invalid ${field}.`);
  return value;
};
const numberOrNull = (source: RecordValue, keys: string[]): number | null => {
  const value = first(source, ...keys);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};
const booleanValue = (source: RecordValue, keys: string[]): boolean => first(source, ...keys) === true;

const status = (value: unknown): ApplicationAgentEventStatus | null => {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (["OFFLINE", "INITIALIZING", "IDLE", "RUNNING", "ERROR"].includes(normalized)) {
    return normalized as ApplicationAgentEventStatus;
  }
  if (["ACTIVE", "BUSY", "WORKING"].includes(normalized)) return "RUNNING";
  return null;
};

const segmentKind = (value: unknown): ApplicationAgentEventSegmentKind => {
  const normalized = typeof value === "string" ? value.trim().toUpperCase().replace(/[- ]/g, "_") : "";
  if (["TEXT", "REASONING", "TOOL_CALL", "COMMAND", "FILE_EDIT", "MEDIA"].includes(normalized)) {
    return normalized as ApplicationAgentEventSegmentKind;
  }
  if (normalized.includes("REASON")) return "REASONING";
  if (normalized.includes("TOOL")) return "TOOL_CALL";
  return "OTHER";
};

const safeMessage = (value: unknown, fallback: string): string => {
  const raw = typeof value === "string" ? value : value instanceof Error ? value.message : "";
  const line = raw.split(/\r?\n/, 1)[0]?.trim() || fallback;
  return line.slice(0, 1024);
};
const safeError = (
  source: unknown,
  code: ApplicationAgentEventSafeErrorCode,
  fallback: string,
): ApplicationAgentEventSafeError => {
  const candidate = record(source);
  return { code, message: safeMessage(first(candidate, "message", "error_message", "errorMessage") ?? source, fallback) };
};
const optionalSafeError = (
  source: RecordValue,
  code: ApplicationAgentEventSafeErrorCode,
  fallback: string,
): ApplicationAgentEventSafeError | null => {
  const value = first(source, "error", "error_message", "errorMessage");
  return value == null ? null : safeError(value, code, fallback);
};
const toolRef = (source: RecordValue): ApplicationAgentEventToolRef => ({
  invocationId: scalar(source, ["invocation_id", "invocationId", "tool_call_id", "toolCallId"]),
  toolName: scalar(source, ["tool_name", "toolName", "name"]),
  turnId: scalar(source, ["turn_id", "turnId"]),
});
const summary = (source: RecordValue, keys: string[]): string | null => {
  const direct = scalar(source, keys, APPLICATION_AGENT_EVENT_SUMMARY_LIMIT);
  if (direct) return direct;
  for (const key of keys) {
    const nested = record(source[key]);
    const nestedValue = scalar(nested, ["text", "content", "message", "summary"], APPLICATION_AGENT_EVENT_SUMMARY_LIMIT);
    if (nestedValue) return nestedValue;
  }
  return null;
};

const participant = (value: unknown): ApplicationAgentEventParticipant | null => {
  if (value === undefined || value === null) return null;
  const source = record(value);
  if (Object.keys(source).length === 0) return null;
  const directKind = scalar(source, ["kind"]);
  if (directKind?.toUpperCase() === "TEAM") {
    return { kind: "TEAM", memberRouteKey: scalar(source, ["memberRouteKey", "member_route_key"]) };
  }
  if (directKind?.toUpperCase() === "MEMBER") {
    const route = scalar(source, ["memberRouteKey", "member_route_key"]);
    return route ? { kind: "MEMBER", memberRouteKey: route } : null;
  }
  const segments = Array.isArray(source.segments) ? source.segments : [];
  const member = [...segments].reverse().map(record).find((item) => item.kind === "member");
  if (member) {
    const route = scalar(member, ["memberRouteKey", "member_route_key"])
      ?? (Array.isArray(member.memberPath)
        ? member.memberPath.map(String).map((part) => part.trim()).filter(Boolean).join("/")
        : null);
    return route ? { kind: "MEMBER", memberRouteKey: route } : null;
  }
  return { kind: "TEAM", memberRouteKey: null };
};

const communicationData = (source: RecordValue) => {
  const sender = participant(first(source, "sender", "senderAddress", "sender_address"));
  const receiver = participant(first(source, "receiver", "receiverAddress", "receiver_address"));
  if (!sender || !receiver) throw new ApplicationAgentStreamProjectionError("Invalid communication participant.");
  return {
    messageId: required(source, ["messageId", "message_id"], "messageId"),
    sender,
    receiver,
    content: required(source, ["content"], "content"),
    messageType: required(source, ["messageType", "message_type"], "messageType"),
    createdAt: required(source, ["createdAt", "created_at"], "createdAt"),
  };
};

const todoItems = (source: RecordValue): ApplicationAgentEventTodoItem[] => {
  const raw = first(source, "items", "todos", "todo_items");
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, APPLICATION_AGENT_EVENT_ARRAY_LIMIT).flatMap((value) => {
    const item = record(value);
    const id = scalar(item, ["id", "todo_id", "todoId"]);
    const description = scalar(item, ["description", "content", "text"]);
    if (!id || !description) return [];
    const rawStatus = scalar(item, ["status"])?.toUpperCase().replace(/[- ]/g, "_") ?? "UNKNOWN";
    const normalized = ["PENDING", "IN_PROGRESS", "COMPLETED"].includes(rawStatus) ? rawStatus : "UNKNOWN";
    return [{ id, description, status: normalized as ApplicationAgentEventTodoItem["status"] }];
  });
};

export class ApplicationAgentStreamPublicEventProjector {
  projectAgent(event: AgentRunEvent): ApplicationAgentRunPublicEvent | null {
    if (event.eventType === AgentRunEventType.ARTIFACT_PERSISTED || event.eventType === AgentRunEventType.FILE_CHANGE) return null;
    const p = record(event.payload);
    const turnId = scalar(p, ["turn_id", "turnId"]);
    const ref = toolRef(p);
    switch (event.eventType) {
      case AgentRunEventType.TURN_STARTED: return { source: "AGENT", type: "TURN_STARTED", data: { turnId } };
      case AgentRunEventType.TURN_COMPLETED: return { source: "AGENT", type: "TURN_COMPLETED", data: { turnId } };
      case AgentRunEventType.TURN_INTERRUPTED: return { source: "AGENT", type: "TURN_INTERRUPTED", data: { turnId, reason: scalar(p, ["reason"]) } };
      case AgentRunEventType.SEGMENT_START: return { source: "AGENT", type: "SEGMENT_START", data: {
        segmentId: required(p, ["id", "segment_id", "segmentId"], "segmentId"), turnId,
        kind: segmentKind(first(p, "kind", "segment_kind", "segmentKind", "type")), toolName: scalar(p, ["tool_name", "toolName"]),
      } };
      case AgentRunEventType.SEGMENT_CONTENT: return { source: "AGENT", type: "SEGMENT_CONTENT", data: {
        segmentId: required(p, ["id", "segment_id", "segmentId"], "segmentId"), turnId,
        kind: segmentKind(first(p, "kind", "segment_kind", "segmentKind", "type")), delta: required(p, ["delta"], "delta"),
      } };
      case AgentRunEventType.SEGMENT_END: return { source: "AGENT", type: "SEGMENT_END", data: {
        segmentId: required(p, ["id", "segment_id", "segmentId"], "segmentId"), turnId,
        kind: segmentKind(first(p, "kind", "segment_kind", "segmentKind", "type")),
        interrupted: booleanValue(p, ["interrupted"]), failed: booleanValue(p, ["failed"]),
        reason: scalar(p, ["reason"]), error: optionalSafeError(p, "SEGMENT_ERROR", "The segment failed."),
      } };
      case AgentRunEventType.AGENT_STATUS: {
        const normalized = status(first(p, "status"));
        if (!normalized) throw new ApplicationAgentStreamProjectionError("Invalid agent status.");
        return { source: "AGENT", type: "AGENT_STATUS", data: {
          status: normalized, canInterrupt: booleanValue(p, ["can_interrupt", "canInterrupt"]),
          trigger: scalar(p, ["trigger"]), toolName: scalar(p, ["tool_name", "toolName"]),
          error: optionalSafeError(p, "RUNTIME_ERROR", "The agent runtime failed."),
        } };
      }
      case AgentRunEventType.COMPACTION_STATUS: {
        const raw = scalar(p, ["phase", "status"])?.toUpperCase() ?? "UNKNOWN";
        const phase = ["REQUESTED", "STARTED", "COMPLETED", "FAILED"].includes(raw) ? raw : "UNKNOWN";
        return { source: "AGENT", type: "COMPACTION_STATUS", data: {
          phase: phase as "REQUESTED" | "STARTED" | "COMPLETED" | "FAILED" | "UNKNOWN", turnId,
          trigger: scalar(p, ["trigger"]), selectedBlockCount: numberOrNull(p, ["selected_block_count", "selectedBlockCount"]),
          compactedBlockCount: numberOrNull(p, ["compacted_block_count", "compactedBlockCount"]),
          error: optionalSafeError(p, "COMPACTION_ERROR", "Compaction failed."),
        } };
      }
      case AgentRunEventType.TOKEN_USAGE_UPDATED: return { source: "AGENT", type: "TOKEN_USAGE_UPDATED", data: {
        usageEventId: scalar(p, ["usage_event_id", "usageEventId"]), observedAt: scalar(p, ["observed_at", "observedAt"]), turnId,
        inputTokens: numberOrNull(p, ["input_tokens", "inputTokens"]), cachedInputTokens: numberOrNull(p, ["cached_input_tokens", "cachedInputTokens"]),
        outputTokens: numberOrNull(p, ["output_tokens", "outputTokens"]), reasoningOutputTokens: numberOrNull(p, ["reasoning_output_tokens", "reasoningOutputTokens"]),
        totalTokens: numberOrNull(p, ["total_tokens", "totalTokens"]), contextWindowUsagePercent: numberOrNull(p, ["context_window_usage_percent", "contextWindowUsagePercent"]),
      } };
      case AgentRunEventType.ASSISTANT_COMPLETE: return { source: "AGENT", type: "AGENT_RESPONSE_COMPLETED", data: { content: scalar(p, ["content"]), reasoning: scalar(p, ["reasoning"]) } };
      case AgentRunEventType.TOOL_APPROVAL_REQUESTED: return { source: "AGENT", type: "TOOL_APPROVAL_REQUESTED", data: { ...ref, argumentSummary: summary(p, ["argumentSummary", "argument_summary", "arguments"]) } };
      case AgentRunEventType.TOOL_APPROVED: return { source: "AGENT", type: "TOOL_APPROVED", data: { ...ref, reason: scalar(p, ["reason"]) } };
      case AgentRunEventType.TOOL_DENIED: return { source: "AGENT", type: "TOOL_DENIED", data: { ...ref, argumentSummary: summary(p, ["argumentSummary", "argument_summary", "arguments"]), reason: scalar(p, ["reason"]), error: optionalSafeError(p, "TOOL_EXECUTION_ERROR", "The tool was denied.") } };
      case AgentRunEventType.TOOL_EXECUTION_STARTED: return { source: "AGENT", type: "TOOL_EXECUTION_STARTED", data: { ...ref, argumentSummary: summary(p, ["argumentSummary", "argument_summary", "arguments"]) } };
      case AgentRunEventType.TOOL_EXECUTION_SUCCEEDED: return { source: "AGENT", type: "TOOL_EXECUTION_SUCCEEDED", data: { ...ref, resultSummary: summary(p, ["resultSummary", "result_summary", "result"]) } };
      case AgentRunEventType.TOOL_EXECUTION_FAILED: return { source: "AGENT", type: "TOOL_EXECUTION_FAILED", data: { ...ref, error: safeError(first(p, "error", "message", "error_message"), "TOOL_EXECUTION_ERROR", "Tool execution failed.") } };
      case AgentRunEventType.TOOL_EXECUTION_INTERRUPTED: return { source: "AGENT", type: "TOOL_EXECUTION_INTERRUPTED", data: { ...ref, reason: required(p, ["reason"], "reason") } };
      case AgentRunEventType.TOOL_LOG: return { source: "AGENT", type: "TOOL_LOG", data: { ...ref, entry: required(p, ["log_entry", "entry"], "entry") } };
      case AgentRunEventType.TODO_LIST_UPDATE: return { source: "AGENT", type: "TODO_LIST_UPDATE", data: { items: todoItems(p) } };
      case AgentRunEventType.INTER_AGENT_MESSAGE: return { source: "AGENT", type: "INTER_AGENT_MESSAGE", data: {
        messageId: scalar(p, ["message_id", "messageId"]), senderMemberRouteKey: scalar(p, ["sender_member_route_key", "senderMemberRouteKey"]),
        receiverMemberRouteKey: scalar(p, ["receiver_member_route_key", "receiverMemberRouteKey"]), content: required(p, ["content"], "content"),
        messageType: scalar(p, ["message_type", "messageType"]), createdAt: scalar(p, ["created_at", "createdAt"]),
      } };
      case AgentRunEventType.TEAM_COMMUNICATION_MESSAGE: return { source: "AGENT", type: "TEAM_COMMUNICATION_MESSAGE", data: communicationData(p) };
      case AgentRunEventType.SYSTEM_TASK_NOTIFICATION: return { source: "AGENT", type: "SYSTEM_TASK_NOTIFICATION", data: { content: required(p, ["content"], "content") } };
      case AgentRunEventType.ERROR: return { source: "AGENT", type: "ERROR", data: { error: safeError(first(p, "error", "message", "error_message"), "RUNTIME_ERROR", "The agent runtime failed.") } };
      default: return null;
    }
  }

  projectTeam(event: TeamRunEvent): ApplicationAgentTeamPublicEvent | null {
    if (event.eventSourceType === TeamRunEventSourceType.AGENT) return null;
    if (event.eventSourceType === TeamRunEventSourceType.TEAM) {
      const p = record(event.data as TeamRunStatusUpdateData);
      const normalized = status(first(p, "status"));
      if (!normalized) throw new ApplicationAgentStreamProjectionError("Invalid team status.");
      return { source: "AGENT_TEAM", type: "TEAM_STATUS", data: { status: normalized, error: optionalSafeError(p, "RUNTIME_ERROR", "The team runtime failed.") } };
    }
    if (event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) {
      return { source: "AGENT_TEAM", type: "TEAM_COMMUNICATION_MESSAGE", data: communicationData(record(event.data as TeamRunCommunicationEventPayload)) };
    }
    if (event.eventSourceType === TeamRunEventSourceType.MEMBER_INPUT) {
      const p = record(event.data as TeamRunMemberInputEventPayload);
      const rawOrigin = scalar(p, ["inputOrigin", "input_origin"]);
      const origin = rawOrigin === "user_message" || rawOrigin === "USER_MESSAGE" ? "USER_MESSAGE"
        : rawOrigin === "inter_agent_delivery" || rawOrigin === "INTER_AGENT_DELIVERY" ? "INTER_AGENT_DELIVERY" : null;
      if (!origin) throw new ApplicationAgentStreamProjectionError("Invalid member input origin.");
      return { source: "AGENT_TEAM", type: "MEMBER_INPUT_MESSAGE", data: {
        messageId: required(p, ["messageId", "message_id"], "messageId"), inputOrigin: origin,
        recipientMemberRouteKey: required(p, ["recipientMemberRouteKey", "recipient_member_route_key"], "recipientMemberRouteKey"),
        senderMemberRouteKey: scalar(p, ["senderMemberRouteKey", "sender_member_route_key"]), content: required(p, ["content"], "content"),
        receivedAt: required(p, ["receivedAt", "received_at"], "receivedAt"), parentCommunicationMessageId: scalar(p, ["parentCommunicationMessageId", "parent_communication_message_id"]),
      } };
    }
    if (event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION) {
      const wrapper = event.data as TeamRunTaskDelegationEventPayload;
      const p = record(wrapper.payload);
      const kindMap = {
        TASK_DELEGATION_ACTIVATED: "ACTIVATED", TASK_DELEGATION_STATUS_UPDATED: "STATUS_UPDATED",
        TASK_DELEGATION_RESULT_SUBMITTED: "RESULT_SUBMITTED", TASK_DELEGATION_RESULT_REVIEWED: "RESULT_REVIEWED",
        TASK_DELEGATION_TERMINAL_STATUS: "TERMINAL_STATUS",
      } as const;
      const delegationEventType = kindMap[wrapper.eventType];
      if (!delegationEventType) throw new ApplicationAgentStreamProjectionError("Invalid delegation event type.");
      const rawIds = first(p, "taskIds", "task_ids");
      const taskIds = Array.isArray(rawIds)
        ? rawIds.slice(0, APPLICATION_AGENT_EVENT_ARRAY_LIMIT).flatMap((value) => typeof value === "string" && value.trim() ? [value.trim()] : [])
        : [];
      const execution = record(p.execution);
      const executionKind = scalar(execution, ["kind"]) === "task_agent" ? "AGENT"
        : scalar(execution, ["kind"]) === "task_team" ? "TEAM" : null;
      return { source: "AGENT_TEAM", type: "TASK_DELEGATION_EVENT", data: {
        delegationEventType, taskId: scalar(p, ["taskId", "task_id"]), taskIds,
        taskLabel: scalar(p, ["taskLabel", "task_label", "label"]), description: scalar(p, ["description"]),
        status: scalar(p, ["status"]), previousStatus: scalar(p, ["previousStatus", "previous_status"]),
        target: participant(p.target), executionKind, terminal: booleanValue(p, ["terminal"]),
        message: scalar(p, ["message"]), occurredAt: scalar(p, ["occurredAt", "occurred_at"]),
      } };
    }
    return null;
  }
}
