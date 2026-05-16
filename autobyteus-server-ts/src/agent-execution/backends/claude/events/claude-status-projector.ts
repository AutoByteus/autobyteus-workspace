import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentStatusPayload,
} from "../../../domain/agent-status-payload.js";

export type ClaudeStatusSource = {
  currentStatus?: unknown;
  activeTurnId?: string | null;
  isInterrupting?: boolean;
  isActive?: boolean;
};

export const projectClaudeAgentStatus = (source: ClaudeStatusSource): AgentStatusPayload => {
  const status =
    source.isActive === false
      ? "offline"
      : normalizeAgentApiStatus(source.currentStatus, "idle");
  return buildAgentStatusPayload({
    status,
    canInterrupt: status === "running" && Boolean(source.activeTurnId) && source.isInterrupting !== true,
  });
};
