import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentStatusPayload,
} from "../../../domain/agent-status-payload.js";

type AutoByteusAgentContextLike = {
  state?: {
    activeTurn?: unknown | null;
  } | null;
} | null;

const hasActiveTurn = (context: AutoByteusAgentContextLike): boolean =>
  Boolean(context?.state?.activeTurn);

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

const normalizeAutoByteusAgentStatus = (value: unknown): AgentStatusPayload["status"] => {
  const token = normalizeToken(value) ?? "";
  if (AUTOBYTEUS_STARTUP_STATUS_TOKENS.has(token)) {
    return "initializing";
  }
  if (AUTOBYTEUS_RUNNING_STATUS_TOKENS.has(token)) {
    return "running";
  }
  if (AUTOBYTEUS_OFFLINE_STATUS_TOKENS.has(token)) {
    return "offline";
  }
  return normalizeAgentApiStatus(value, "idle");
};

export const projectAutoByteusAgentStatus = (input: {
  currentStatus?: unknown;
  context?: AutoByteusAgentContextLike;
  isActive?: boolean;
  agentId?: string | null;
  agentName?: string | null;
}): AgentStatusPayload => {
  const status =
    input.isActive === false
      ? "offline"
      : normalizeAutoByteusAgentStatus(input.currentStatus);
  const canInterrupt =
    status === "running" &&
    hasActiveTurn(input.context ?? null);

  return buildAgentStatusPayload({
    status,
    canInterrupt,
    agentId: input.agentId,
    agentName: input.agentName,
  });
};
