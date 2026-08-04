import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import { normalizeAgentApiStatus } from "../../../domain/agent-status-payload.js";

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

const normalizeClaudeAgentPhase = (
  value: unknown,
): AgentRuntimeLifecycleSnapshot["phase"] => {
  if (CLAUDE_STARTUP_STATUS_TOKENS.has(normalizeToken(value) ?? "")) {
    return "initializing";
  }
  const status = normalizeAgentApiStatus(value, "idle");
  return status === "offline" ? "idle" : status;
};

export const projectClaudeAgentLifecycleSnapshot = (
  source: ClaudeStatusSource,
): AgentRuntimeLifecycleSnapshot => {
  if (source.isActive === false) {
    return {
      availability: "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    };
  }
  const turnId = typeof source.activeTurnId === "string"
    ? source.activeTurnId.trim()
    : "";
  const projectedPhase = normalizeClaudeAgentPhase(source.currentStatus);
  return {
    availability: "active",
    phase: turnId ? "running" : projectedPhase === "running"
      ? "initializing"
      : projectedPhase,
    currentTurn: turnId
      ? { kind: "IDENTIFIED", turnId }
      : { kind: "NONE" },
  };
};
