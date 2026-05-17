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
  "starting",
  "startup",
  "uninitialized",
]);

const normalizeAutoByteusAgentStatus = (value: unknown): AgentStatusPayload["status"] =>
  AUTOBYTEUS_STARTUP_STATUS_TOKENS.has(normalizeToken(value) ?? "")
    ? "initializing"
    : normalizeAgentApiStatus(value, "idle");

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
