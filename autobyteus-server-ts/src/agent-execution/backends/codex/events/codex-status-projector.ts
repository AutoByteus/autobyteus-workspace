import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentStatusPayload,
} from "../../../domain/agent-status-payload.js";

export type CodexStatusSource = {
  currentStatus?: unknown;
  activeTurnId?: string | null;
};

export const projectCodexAgentStatus = (source: CodexStatusSource): AgentStatusPayload => {
  const status = normalizeAgentApiStatus(source.currentStatus);
  return buildAgentStatusPayload({
    status,
    canInterrupt: status === "running" && Boolean(source.activeTurnId),
  });
};
