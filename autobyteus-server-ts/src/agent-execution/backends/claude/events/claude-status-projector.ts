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

const normalizeToken = (value: unknown): string | null =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/[-\s]+/g, "_") || null
    : null;

const CLAUDE_STARTUP_STATUS_TOKENS = new Set([
  "bootstrapping",
  "starting",
  "startup",
  "uninitialized",
]);

const normalizeClaudeAgentStatus = (value: unknown): AgentStatusPayload["status"] =>
  CLAUDE_STARTUP_STATUS_TOKENS.has(normalizeToken(value) ?? "")
    ? "initializing"
    : normalizeAgentApiStatus(value, "idle");

export const projectClaudeAgentStatus = (source: ClaudeStatusSource): AgentStatusPayload => {
  const status =
    source.isActive === false
      ? "offline"
      : normalizeClaudeAgentStatus(source.currentStatus);
  return buildAgentStatusPayload({
    status,
    canInterrupt: status === "running" && Boolean(source.activeTurnId) && source.isInterrupting !== true,
  });
};
