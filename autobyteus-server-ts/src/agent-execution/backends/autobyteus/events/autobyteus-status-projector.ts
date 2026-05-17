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

const LOCKED_RUNNING_STATUSES = new Set([
  "interrupting",
  "shutting_down",
]);

const normalizeStatusToken = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase().replace(/[-\s]+/g, "_") : "";

const hasActiveTurn = (context: AutoByteusAgentContextLike): boolean =>
  Boolean(context?.state?.activeTurn);

export const projectAutoByteusAgentStatus = (input: {
  currentStatus?: unknown;
  context?: AutoByteusAgentContextLike;
  isActive?: boolean;
  agentId?: string | null;
  agentName?: string | null;
}): AgentStatusPayload => {
  const statusToken = normalizeStatusToken(input.currentStatus);
  const status =
    input.isActive === false
      ? "offline"
      : normalizeAgentApiStatus(input.currentStatus, "idle");
  const canInterrupt =
    status === "running" &&
    hasActiveTurn(input.context ?? null) &&
    !LOCKED_RUNNING_STATUSES.has(statusToken);

  return buildAgentStatusPayload({
    status,
    canInterrupt,
    agentId: input.agentId,
    agentName: input.agentName,
  });
};
