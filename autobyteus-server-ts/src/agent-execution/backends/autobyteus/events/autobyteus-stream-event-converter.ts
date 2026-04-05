import type { StreamEvent } from "autobyteus-ts";
import { StreamEventType } from "autobyteus-ts";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";

const resolveStatusHint = (
  eventType: StreamEventType,
  payload: Record<string, unknown>,
): "ACTIVE" | "IDLE" | "ERROR" | null => {
  if (eventType === StreamEventType.ERROR_EVENT) {
    return "ERROR";
  }
  if (eventType === StreamEventType.AGENT_STATUS_UPDATED) {
    const nextStatus =
      typeof payload.new_status === "string"
        ? payload.new_status
        : typeof payload.status === "string"
          ? payload.status
          : null;
    const normalized = nextStatus?.trim().toUpperCase() ?? null;
    if (normalized === "IDLE") {
      return "IDLE";
    }
    if (normalized === "ERROR") {
      return "ERROR";
    }
    if (normalized) {
      return "ACTIVE";
    }
  }
  return null;
};

const resolveSegmentEventType = (payload: Record<string, unknown>): AgentRunEventType | null => {
  const raw =
    typeof payload.event_type === "string"
      ? payload.event_type
      : typeof payload.type === "string"
        ? payload.type
        : null;
  const normalized = raw?.trim().toUpperCase() ?? null;
  if (normalized === "SEGMENT_START" || normalized === "START") {
    return AgentRunEventType.SEGMENT_START;
  }
  if (normalized === "SEGMENT_END" || normalized === "END") {
    return AgentRunEventType.SEGMENT_END;
  }
  if (normalized === "SEGMENT_CONTENT" || normalized === "CONTENT") {
    return AgentRunEventType.SEGMENT_CONTENT;
  }
  return null;
};

const eventTypeByStreamEvent = new Map<StreamEventType, AgentRunEventType>([
  [StreamEventType.AGENT_STATUS_UPDATED, AgentRunEventType.AGENT_STATUS],
  [StreamEventType.ASSISTANT_COMPLETE_RESPONSE, AgentRunEventType.ASSISTANT_COMPLETE],
  [StreamEventType.TOOL_APPROVAL_REQUESTED, AgentRunEventType.TOOL_APPROVAL_REQUESTED],
  [StreamEventType.TOOL_APPROVED, AgentRunEventType.TOOL_APPROVED],
  [StreamEventType.TOOL_DENIED, AgentRunEventType.TOOL_DENIED],
  [StreamEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_STARTED],
  [StreamEventType.TOOL_EXECUTION_SUCCEEDED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED],
  [StreamEventType.TOOL_EXECUTION_FAILED, AgentRunEventType.TOOL_EXECUTION_FAILED],
  [StreamEventType.TOOL_INTERACTION_LOG_ENTRY, AgentRunEventType.TOOL_LOG],
  [StreamEventType.SYSTEM_TASK_NOTIFICATION, AgentRunEventType.SYSTEM_TASK_NOTIFICATION],
  [StreamEventType.INTER_AGENT_MESSAGE, AgentRunEventType.INTER_AGENT_MESSAGE],
  [StreamEventType.AGENT_TODO_LIST_UPDATE, AgentRunEventType.TODO_LIST_UPDATE],
  [StreamEventType.ARTIFACT_PERSISTED, AgentRunEventType.ARTIFACT_PERSISTED],
  [StreamEventType.ARTIFACT_UPDATED, AgentRunEventType.ARTIFACT_UPDATED],
  [StreamEventType.ERROR_EVENT, AgentRunEventType.ERROR],
]);

export class AutoByteusStreamEventConverter {
  constructor(private readonly runId: string) {}

  convert(event: StreamEvent): AgentRunEvent | null {
    const payload = serializePayload(event.data);
    const statusHint = resolveStatusHint(event.event_type, payload);

    if (event.event_type === StreamEventType.ASSISTANT_CHUNK) {
      return null;
    }

    if (event.event_type === StreamEventType.SEGMENT_EVENT) {
      const eventType = resolveSegmentEventType(payload);
      if (!eventType) {
        return null;
      }
      const turnId =
        typeof payload.turn_id === "string" && payload.turn_id.length > 0
          ? payload.turn_id
          : null;
      if (!turnId) {
        return null;
      }
      return {
        eventType,
        runId: this.runId,
        payload: {
          id:
            typeof payload.segment_id === "string" && payload.segment_id.length > 0
              ? payload.segment_id
              : "",
          turnId,
          ...(payload.segment_type !== undefined ? { segment_type: payload.segment_type } : {}),
          ...((payload.payload &&
          typeof payload.payload === "object" &&
          !Array.isArray(payload.payload))
            ? (payload.payload as Record<string, unknown>)
            : {}),
        },
        statusHint,
      };
    }

    const eventType = eventTypeByStreamEvent.get(event.event_type) ?? null;
    if (!eventType) {
      return null;
    }

    return {
      eventType,
      runId: this.runId,
      payload,
      statusHint,
    };
  }
}
