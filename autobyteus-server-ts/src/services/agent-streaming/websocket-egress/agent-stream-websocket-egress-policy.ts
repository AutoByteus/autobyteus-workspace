import { ServerMessage, ServerMessageType } from "../models.js";
import { isCoalescibleStreamContent } from "./stream-content-coalescing.js";

export type AgentStreamWebSocketEgressAction =
  | "COALESCE"
  | "FLUSH_THEN_SEND"
  | "SEAL_THEN_SEND";

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
    return "SEAL_THEN_SEND";
  }
  if (message.type === ServerMessageType.AGENT_STATUS) {
    return message.payload.status === "initializing" || message.payload.status === "running"
      ? "SEAL_THEN_SEND"
      : "FLUSH_THEN_SEND";
  }
  return "FLUSH_THEN_SEND";
};
