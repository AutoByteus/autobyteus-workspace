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
  "bootstrapping",
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
  agentId?: string | null;
  agentName?: string | null;
}): AgentStatusPayload => {
  const status = normalizeAgentApiStatus(input.currentStatus);
  const statusToken = normalizeStatusToken(input.currentStatus);
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
