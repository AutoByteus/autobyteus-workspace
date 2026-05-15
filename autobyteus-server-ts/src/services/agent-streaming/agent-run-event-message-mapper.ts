import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import { ServerMessage, ServerMessageType } from "./models.js";
import { buildAgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import { serializePayload } from "./payload-serialization.js";

const normalizeStatusPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  return buildAgentStatusPayload({
    status: payload.status,
    canInterrupt: payload.can_interrupt === true,
    agentId: typeof payload.agent_id === "string" ? payload.agent_id : null,
    agentName: typeof payload.agent_name === "string" ? payload.agent_name : null,
  });
};



const normalizeCompactionPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const turnId =
    typeof payload.turn_id === "string"
      ? payload.turn_id.trim()
      : typeof payload.turnId === "string"
        ? payload.turnId.trim()
        : payload.turn_id === null || payload.turnId === null
          ? null
          : undefined;

  return {
    ...payload,
    ...(turnId !== undefined ? { turn_id: turnId } : {}),
  };
};

const normalizeTurnPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const turnId =
    typeof payload.turn_id === "string"
      ? payload.turn_id.trim()
      : typeof payload.turnId === "string"
        ? payload.turnId.trim()
        : payload.turn_id === null || payload.turnId === null
          ? null
          : null;

  return {
    ...payload,
    turn_id: turnId,
  };
};

const normalizeSegmentPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const turnId =
    typeof payload.turn_id === "string"
      ? payload.turn_id.trim()
      : typeof payload.turnId === "string"
        ? payload.turnId.trim()
        : payload.turn_id === null || payload.turnId === null
          ? null
          : null;
  const {
    turnId: _legacyTurnId,
    turn_id: _rawTurnId,
    ...payloadWithoutTurnAliases
  } = payload;

  return {
    ...payloadWithoutTurnAliases,
    turn_id: turnId,
  };
};

export class AgentRunEventMessageMapper {
  map(event: AgentRunEvent): ServerMessage {
    const payload = serializePayload(event.payload);

    switch (event.eventType) {
      case AgentRunEventType.TURN_STARTED:
        return new ServerMessage(ServerMessageType.TURN_STARTED, normalizeTurnPayload(payload));
      case AgentRunEventType.TURN_COMPLETED:
        return new ServerMessage(ServerMessageType.TURN_COMPLETED, normalizeTurnPayload(payload));
      case AgentRunEventType.TURN_INTERRUPTED:
        return new ServerMessage(ServerMessageType.TURN_INTERRUPTED, normalizeTurnPayload(payload));
      case AgentRunEventType.SEGMENT_START:
        return new ServerMessage(ServerMessageType.SEGMENT_START, normalizeSegmentPayload(payload));
      case AgentRunEventType.SEGMENT_CONTENT:
        return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, normalizeSegmentPayload(payload));
      case AgentRunEventType.SEGMENT_END:
        return new ServerMessage(ServerMessageType.SEGMENT_END, normalizeSegmentPayload(payload));
      case AgentRunEventType.AGENT_STATUS:
        return new ServerMessage(ServerMessageType.AGENT_STATUS, normalizeStatusPayload(payload));
      case AgentRunEventType.COMPACTION_STATUS:
        return new ServerMessage(ServerMessageType.COMPACTION_STATUS, normalizeCompactionPayload(payload));
      case AgentRunEventType.ASSISTANT_COMPLETE:
        return new ServerMessage(ServerMessageType.ASSISTANT_COMPLETE, payload);
      case AgentRunEventType.TOOL_APPROVAL_REQUESTED:
        return new ServerMessage(ServerMessageType.TOOL_APPROVAL_REQUESTED, payload);
      case AgentRunEventType.TOOL_APPROVED:
        return new ServerMessage(ServerMessageType.TOOL_APPROVED, payload);
      case AgentRunEventType.TOOL_DENIED:
        return new ServerMessage(ServerMessageType.TOOL_DENIED, payload);
      case AgentRunEventType.TOOL_EXECUTION_STARTED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_STARTED, payload);
      case AgentRunEventType.TOOL_EXECUTION_SUCCEEDED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_SUCCEEDED, payload);
      case AgentRunEventType.TOOL_EXECUTION_FAILED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_FAILED, payload);
      case AgentRunEventType.TOOL_EXECUTION_INTERRUPTED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_INTERRUPTED, payload);
      case AgentRunEventType.TOOL_LOG:
        return new ServerMessage(ServerMessageType.TOOL_LOG, payload);
      case AgentRunEventType.TODO_LIST_UPDATE:
        return new ServerMessage(ServerMessageType.TODO_LIST_UPDATE, payload);
      case AgentRunEventType.INTER_AGENT_MESSAGE:
        return new ServerMessage(ServerMessageType.INTER_AGENT_MESSAGE, payload);
      case AgentRunEventType.TEAM_COMMUNICATION_MESSAGE:
        return new ServerMessage(ServerMessageType.TEAM_COMMUNICATION_MESSAGE, payload);
      case AgentRunEventType.SYSTEM_TASK_NOTIFICATION:
        return new ServerMessage(ServerMessageType.SYSTEM_TASK_NOTIFICATION, payload);
      case AgentRunEventType.ARTIFACT_PERSISTED:
        return new ServerMessage(ServerMessageType.ARTIFACT_PERSISTED, payload);
      case AgentRunEventType.FILE_CHANGE:
        return new ServerMessage(ServerMessageType.FILE_CHANGE, payload);
      case AgentRunEventType.ERROR:
        return new ServerMessage(ServerMessageType.ERROR, payload);
      default:
        return new ServerMessage(ServerMessageType.ERROR, {
          code: "UNKNOWN_AGENT_RUN_EVENT",
          message: `Unmapped AgentRunEvent: ${String(event.eventType)}`,
        });
    }
  }
}

let cachedAgentRunEventMessageMapper: AgentRunEventMessageMapper | null = null;

export const getAgentRunEventMessageMapper = (): AgentRunEventMessageMapper => {
  if (!cachedAgentRunEventMessageMapper) {
    cachedAgentRunEventMessageMapper = new AgentRunEventMessageMapper();
  }
  return cachedAgentRunEventMessageMapper;
};
