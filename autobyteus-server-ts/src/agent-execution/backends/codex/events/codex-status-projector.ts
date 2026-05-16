import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentStatusPayload,
} from "../../../domain/agent-status-payload.js";

export type CodexStatusSource = {
  currentStatus?: unknown;
  activeTurnId?: string | null;
  isActive?: boolean;
};

export const projectCodexAgentStatus = (source: CodexStatusSource): AgentStatusPayload => {
  const status =
    source.isActive === false
      ? "offline"
      : normalizeAgentApiStatus(source.currentStatus, "idle");
  return buildAgentStatusPayload({
    status,
    canInterrupt: status === "running" && Boolean(source.activeTurnId),
  });
};
