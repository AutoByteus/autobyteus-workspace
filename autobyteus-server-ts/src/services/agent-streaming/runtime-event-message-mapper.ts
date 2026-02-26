import { StreamEventType, type StreamEvent } from "autobyteus-ts";
import {
  ServerMessage,
  ServerMessageType,
} from "./models.js";
import { serializePayload } from "./payload-serialization.js";
import { CodexRuntimeEventAdapter } from "./codex-runtime-event-adapter.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export class RuntimeEventMessageMapper {
  private codexAdapter: CodexRuntimeEventAdapter;

  constructor(codexAdapter: CodexRuntimeEventAdapter = new CodexRuntimeEventAdapter()) {
    this.codexAdapter = codexAdapter;
  }

  map(event: unknown): ServerMessage {
    if (this.isAutobyteusStreamEvent(event)) {
      return this.mapAutobyteusStreamEvent(event);
    }
    return this.codexAdapter.map(event);
  }

  normalizeCodexEventMethodAlias(method: string): string {
    return this.codexAdapter.normalizeMethodAlias(method);
  }

  private isAutobyteusStreamEvent(value: unknown): value is StreamEvent {
    const payload = asObject(value);
    return typeof payload.event_type === "string";
  }

  private mapAutobyteusStreamEvent(event: StreamEvent): ServerMessage {
    switch (event.event_type) {
      case StreamEventType.SEGMENT_EVENT:
        return this.mapSegmentEvent(event);
      case StreamEventType.AGENT_STATUS_UPDATED:
        return new ServerMessage(ServerMessageType.AGENT_STATUS, serializePayload(event.data));
      case StreamEventType.TOOL_APPROVAL_REQUESTED:
        return new ServerMessage(ServerMessageType.TOOL_APPROVAL_REQUESTED, serializePayload(event.data));
      case StreamEventType.TOOL_APPROVED:
        return new ServerMessage(ServerMessageType.TOOL_APPROVED, serializePayload(event.data));
      case StreamEventType.TOOL_DENIED:
        return new ServerMessage(ServerMessageType.TOOL_DENIED, serializePayload(event.data));
      case StreamEventType.TOOL_EXECUTION_STARTED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_STARTED, serializePayload(event.data));
      case StreamEventType.TOOL_EXECUTION_SUCCEEDED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_SUCCEEDED, serializePayload(event.data));
      case StreamEventType.TOOL_EXECUTION_FAILED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_FAILED, serializePayload(event.data));
      case StreamEventType.TOOL_INTERACTION_LOG_ENTRY:
        return new ServerMessage(ServerMessageType.TOOL_LOG, serializePayload(event.data));
      case StreamEventType.ASSISTANT_COMPLETE_RESPONSE:
        return new ServerMessage(ServerMessageType.ASSISTANT_COMPLETE, serializePayload(event.data));
      case StreamEventType.SYSTEM_TASK_NOTIFICATION:
        return new ServerMessage(ServerMessageType.SYSTEM_TASK_NOTIFICATION, serializePayload(event.data));
      case StreamEventType.INTER_AGENT_MESSAGE:
        return new ServerMessage(ServerMessageType.INTER_AGENT_MESSAGE, serializePayload(event.data));
      case StreamEventType.ERROR_EVENT:
        return new ServerMessage(ServerMessageType.ERROR, serializePayload(event.data));
      case StreamEventType.AGENT_TODO_LIST_UPDATE:
        return new ServerMessage(ServerMessageType.TODO_LIST_UPDATE, serializePayload(event.data));
      case StreamEventType.ARTIFACT_PERSISTED:
        return new ServerMessage(ServerMessageType.ARTIFACT_PERSISTED, serializePayload(event.data));
      case StreamEventType.ARTIFACT_UPDATED:
        return new ServerMessage(ServerMessageType.ARTIFACT_UPDATED, serializePayload(event.data));
      default:
        return new ServerMessage(ServerMessageType.ERROR, {
          code: "UNKNOWN_EVENT",
          message: `Unmapped event: ${String(event.event_type)}`,
        });
    }
  }

  private mapSegmentEvent(event: StreamEvent): ServerMessage {
    const data = serializePayload(event.data);
    const eventType = typeof data.event_type === "string" ? data.event_type : "SEGMENT_CONTENT";

    let messageType = ServerMessageType.SEGMENT_CONTENT;
    if (eventType === "SEGMENT_START") {
      messageType = ServerMessageType.SEGMENT_START;
    } else if (eventType === "SEGMENT_END") {
      messageType = ServerMessageType.SEGMENT_END;
    }

    const payload: Record<string, unknown> = {
      id: data.segment_id ?? "",
    };

    if (data.segment_type !== undefined) {
      payload.segment_type = data.segment_type;
    }

    const segmentPayload =
      data.payload && typeof data.payload === "object" ? (data.payload as Record<string, unknown>) : {};

    return new ServerMessage(messageType, {
      ...payload,
      ...segmentPayload,
    });
  }
}

let cachedRuntimeEventMessageMapper: RuntimeEventMessageMapper | null = null;

export const getRuntimeEventMessageMapper = (): RuntimeEventMessageMapper => {
  if (!cachedRuntimeEventMessageMapper) {
    cachedRuntimeEventMessageMapper = new RuntimeEventMessageMapper();
  }
  return cachedRuntimeEventMessageMapper;
};
