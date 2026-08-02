import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import { normalizeAgentApiStatus } from "../../../domain/agent-status-payload.js";

type AutoByteusAgentContextLike = {
  state?: {
    activeTurn?: { turnId?: unknown } | null;
  } | null;
} | null;

const normalizeToken = (value: unknown): string | null =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/[-\s]+/g, "_") || null
    : null;

const AUTOBYTEUS_STARTUP_STATUS_TOKENS = new Set([
  "bootstrapping",
  "initializing",
  "starting",
  "startup",
  "uninitialized",
]);

const AUTOBYTEUS_RUNNING_STATUS_TOKENS = new Set([
  "processing_user_input",
  "awaiting_llm_response",
  "analyzing_llm_response",
  "awaiting_tool_approval",
  "tool_denied",
  "executing_tool",
  "processing_tool_result",
  "interrupting",
]);

const AUTOBYTEUS_OFFLINE_STATUS_TOKENS = new Set([
  "shutdown_complete",
  "shutting_down",
]);

const normalizeAutoByteusAgentPhase = (
  value: unknown,
): AgentRuntimeLifecycleSnapshot["phase"] => {
  const token = normalizeToken(value) ?? "";
  if (AUTOBYTEUS_STARTUP_STATUS_TOKENS.has(token)) {
    return "initializing";
  }
  if (AUTOBYTEUS_RUNNING_STATUS_TOKENS.has(token)) {
    return "running";
  }
  if (AUTOBYTEUS_OFFLINE_STATUS_TOKENS.has(token)) {
    return "idle";
  }
  const status = normalizeAgentApiStatus(value, "idle");
  return status === "offline" ? "idle" : status;
};

export const projectAutoByteusAgentLifecycleSnapshot = (input: {
  currentStatus?: unknown;
  context?: AutoByteusAgentContextLike;
  isActive?: boolean;
}): AgentRuntimeLifecycleSnapshot => {
  if (input.isActive === false) {
    return {
      availability: "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    };
  }

  const activeTurn = input.context?.state?.activeTurn ?? null;
  const turnId = typeof activeTurn?.turnId === "string"
    ? activeTurn.turnId.trim()
    : "";
  const currentTurn = activeTurn
    ? turnId
      ? { kind: "IDENTIFIED" as const, turnId }
      : { kind: "ANONYMOUS" as const }
    : { kind: "NONE" as const };
  const projectedPhase = normalizeAutoByteusAgentPhase(input.currentStatus);

  return {
    availability: "active",
    phase: currentTurn.kind === "NONE" && projectedPhase === "running"
      ? "initializing"
      : currentTurn.kind !== "NONE"
        ? "running"
        : projectedPhase,
    currentTurn,
  };
};
