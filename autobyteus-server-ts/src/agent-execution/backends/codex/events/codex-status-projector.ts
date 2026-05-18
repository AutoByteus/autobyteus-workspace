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

const normalizeToken = (value: unknown): string | null =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/[-\s]+/g, "_") || null
    : null;

const CODEX_STARTUP_STATUS_TOKENS = new Set([
  "bootstrapping",
  "starting",
  "startup",
  "uninitialized",
]);

const normalizeCodexAgentStatus = (value: unknown): AgentStatusPayload["status"] =>
  CODEX_STARTUP_STATUS_TOKENS.has(normalizeToken(value) ?? "")
    ? "initializing"
    : normalizeAgentApiStatus(value, "idle");

export const projectCodexAgentStatus = (source: CodexStatusSource): AgentStatusPayload => {
  const status =
    source.isActive === false
      ? "offline"
      : normalizeCodexAgentStatus(source.currentStatus);
  return buildAgentStatusPayload({
    status,
    canInterrupt: status === "running" && Boolean(source.activeTurnId),
  });
};
