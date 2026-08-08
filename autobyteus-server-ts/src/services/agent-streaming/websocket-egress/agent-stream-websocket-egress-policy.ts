import { ServerMessage, ServerMessageType } from "../models.js";
import { isCoalescibleStreamContent } from "./stream-content-coalescing.js";

export type AgentStreamWebSocketEgressAction =
  | "COALESCE"
  | "FLUSH_THEN_SEND"
  | "SEND_WITHOUT_FLUSH";

const SAFE_COMPANION_TYPES = new Set<ServerMessageType>([
  ServerMessageType.AGENT_COMMAND_ACK,
  ServerMessageType.CONNECTED,
  ServerMessageType.TOKEN_USAGE_UPDATED,
]);

export const classifyAgentStreamWebSocketEgressMessage = (
  message: ServerMessage,
): AgentStreamWebSocketEgressAction => {
  if (isCoalescibleStreamContent(message)) {
    return "COALESCE";
  }
  if (SAFE_COMPANION_TYPES.has(message.type)) {
    return "SEND_WITHOUT_FLUSH";
  }
  if (message.type === ServerMessageType.AGENT_STATUS) {
    return message.payload.status === "initializing" || message.payload.status === "running"
      ? "SEND_WITHOUT_FLUSH"
      : "FLUSH_THEN_SEND";
  }
  return "FLUSH_THEN_SEND";
};
