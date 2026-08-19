import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import { ServerMessage, ServerMessageType } from "./models.js";
import { buildAgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import { serializePayload } from "./payload-serialization.js";
import { resolveAgentRunErrorEvidence } from "../../agent-execution/domain/agent-run-error-evidence.js";

const normalizeStatusPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  return buildAgentStatusPayload({
    status: payload.status,
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

const projectErrorEvidence = (event: AgentRunEvent) => {
  switch (resolveAgentRunErrorEvidence(event)?.kind) {
    case "TURN_DIAGNOSTIC": return { error_scope: "turn", error_effect: "diagnostic", turn_id: event.payload.turn_id };
    case "TURN_TERMINAL": return { error_scope: "turn", error_effect: "terminal", turn_id: event.payload.turn_id };
    case "RUNTIME_GLOBAL": return { error_scope: "runtime", error_effect: "terminal", turn_id: null };
    default: return { error_scope: null, error_effect: null, turn_id: null };
  }
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
        return new ServerMessage(ServerMessageType.SEGMENT_START, { id: payload.id, turn_id: payload.turn_id, segment_type: payload.segment_type, metadata: payload.metadata ?? null });
      case AgentRunEventType.SEGMENT_CONTENT:
        return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, { id: payload.id, turn_id: payload.turn_id, segment_type: payload.segment_type, delta: payload.delta });
      case AgentRunEventType.SEGMENT_END:
        return new ServerMessage(ServerMessageType.SEGMENT_END, { id: payload.id, turn_id: payload.turn_id, metadata: payload.metadata ?? null, interrupted: payload.interrupted ?? false, reason: payload.reason ?? null, failed: payload.failed ?? false, error: payload.error ?? null });
      case AgentRunEventType.AGENT_STATUS:
        return new ServerMessage(ServerMessageType.AGENT_STATUS, normalizeStatusPayload(payload));
      case AgentRunEventType.COMPACTION_STATUS:
        return new ServerMessage(ServerMessageType.COMPACTION_STATUS, normalizeCompactionPayload(payload));
      case AgentRunEventType.TOKEN_USAGE_UPDATED:
        return new ServerMessage(ServerMessageType.TOKEN_USAGE_UPDATED, payload);
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
        return new ServerMessage(ServerMessageType.ERROR, { code: payload.code, message: payload.message, ...projectErrorEvidence(event) });
      default:
        return new ServerMessage(ServerMessageType.ERROR, {
          code: "UNKNOWN_AGENT_RUN_EVENT",
          message: `Unmapped AgentRunEvent: ${String(event.eventType)}`,
          error_scope: null,
          error_effect: null,
          turn_id: null,
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
