import type { StreamEvent } from "autobyteus-ts";
import { StreamEventType } from "autobyteus-ts";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import {
  buildAgentStatusPayload,
  type AgentStatusPayload,
} from "../../../domain/agent-status-payload.js";

const resolveStatusHint = (
  eventType: StreamEventType,
  statusPayload?: AgentStatusPayload,
): "ACTIVE" | "IDLE" | "ERROR" | null => {
  if (eventType === StreamEventType.ERROR_EVENT) {
    return "ERROR";
  }
  if (eventType === StreamEventType.TURN_STARTED) {
    return "ACTIVE";
  }
  if (eventType === StreamEventType.TURN_COMPLETED) {
    return "IDLE";
  }
  if (eventType === StreamEventType.TURN_INTERRUPTED) {
    return "IDLE";
  }
  if (eventType === StreamEventType.AGENT_STATUS_UPDATED) {
    if (statusPayload?.status === "offline" || statusPayload?.status === "idle") {
      return "IDLE";
    }
    if (statusPayload?.status === "error") {
      return "ERROR";
    }
    return "ACTIVE";
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
  [StreamEventType.TURN_STARTED, AgentRunEventType.TURN_STARTED],
  [StreamEventType.TURN_COMPLETED, AgentRunEventType.TURN_COMPLETED],
  [StreamEventType.TURN_INTERRUPTED, AgentRunEventType.TURN_INTERRUPTED],
  [StreamEventType.AGENT_STATUS_UPDATED, AgentRunEventType.AGENT_STATUS],
  [StreamEventType.COMPACTION_STATUS, AgentRunEventType.COMPACTION_STATUS],
  [StreamEventType.ASSISTANT_COMPLETE_RESPONSE, AgentRunEventType.ASSISTANT_COMPLETE],
  [StreamEventType.TOOL_APPROVAL_REQUESTED, AgentRunEventType.TOOL_APPROVAL_REQUESTED],
  [StreamEventType.TOOL_APPROVED, AgentRunEventType.TOOL_APPROVED],
  [StreamEventType.TOOL_DENIED, AgentRunEventType.TOOL_DENIED],
  [StreamEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_STARTED],
  [StreamEventType.TOOL_EXECUTION_SUCCEEDED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED],
  [StreamEventType.TOOL_EXECUTION_FAILED, AgentRunEventType.TOOL_EXECUTION_FAILED],
  [StreamEventType.TOOL_EXECUTION_INTERRUPTED, AgentRunEventType.TOOL_EXECUTION_INTERRUPTED],
  [StreamEventType.TOOL_INTERACTION_LOG_ENTRY, AgentRunEventType.TOOL_LOG],
  [StreamEventType.SYSTEM_TASK_NOTIFICATION, AgentRunEventType.SYSTEM_TASK_NOTIFICATION],
  [StreamEventType.INTER_AGENT_MESSAGE, AgentRunEventType.INTER_AGENT_MESSAGE],
  [StreamEventType.AGENT_TODO_LIST_UPDATE, AgentRunEventType.TODO_LIST_UPDATE],
  [StreamEventType.ARTIFACT_PERSISTED, AgentRunEventType.ARTIFACT_PERSISTED],
  [StreamEventType.ERROR_EVENT, AgentRunEventType.ERROR],
]);

type AutoByteusStatusSnapshotProvider = () => AgentStatusPayload;

const defaultStatusSnapshotProvider = (): AgentStatusPayload => ({
  status: "offline",
  can_interrupt: false,
});

export class AutoByteusStreamEventConverter {
  private hasActiveTurn = false;

  constructor(
    private readonly runId: string,
    private readonly getStatusPayload: AutoByteusStatusSnapshotProvider = defaultStatusSnapshotProvider,
  ) {}

  convert(event: StreamEvent): AgentRunEvent | null {
    this.observeTurnLifecycle(event.event_type);
    const payload = serializePayload(event.data);
    const statusPayload =
      event.event_type === StreamEventType.AGENT_STATUS_UPDATED
        ? this.getCanonicalStatusPayload()
        : undefined;
    const statusHint = resolveStatusHint(event.event_type, statusPayload);

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
      const nestedPayload =
        payload.payload &&
        typeof payload.payload === "object" &&
        !Array.isArray(payload.payload)
          ? (payload.payload as Record<string, unknown>)
          : {};
      const {
        turnId: _nestedCamelTurnId,
        turn_id: _nestedTurnId,
        ...canonicalNestedPayload
      } = nestedPayload;
      return {
        eventType,
        runId: this.runId,
        payload: {
          id:
            typeof payload.segment_id === "string" && payload.segment_id.length > 0
              ? payload.segment_id
              : "",
          turn_id: turnId,
          ...(payload.segment_type !== undefined ? { segment_type: payload.segment_type } : {}),
          ...canonicalNestedPayload,
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
      payload: eventType === AgentRunEventType.AGENT_STATUS
        ? (statusPayload ?? this.getStatusPayload())
        : payload,
      statusHint,
    };
  }

  private observeTurnLifecycle(eventType: StreamEventType): void {
    if (eventType === StreamEventType.TURN_STARTED) {
      this.hasActiveTurn = true;
      return;
    }
    if (
      eventType === StreamEventType.TURN_COMPLETED ||
      eventType === StreamEventType.TURN_INTERRUPTED ||
      eventType === StreamEventType.ERROR_EVENT
    ) {
      this.hasActiveTurn = false;
    }
  }

  private getCanonicalStatusPayload(): AgentStatusPayload {
    const snapshot = this.getStatusPayload();
    if (
      this.hasActiveTurn &&
      (snapshot.status === "idle" || snapshot.status === "offline" || snapshot.status === "initializing")
    ) {
      return buildAgentStatusPayload({
        status: "running",
        canInterrupt: snapshot.can_interrupt === true,
        agentId: snapshot.agent_id,
        agentName: snapshot.agent_name,
      });
    }
    return snapshot;
  }
}
