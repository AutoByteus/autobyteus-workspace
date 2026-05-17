export type AgentApiStatus = "offline" | "initializing" | "idle" | "running" | "error";

export type AgentStatusPayload = {
  status: AgentApiStatus;
  can_interrupt: boolean;
  agent_id?: string;
  agent_name?: string;
};

const normalizeStatusToken = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized.length > 0 ? normalized : null;
};

export const isAgentApiStatus = (value: unknown): value is AgentApiStatus =>
  value === "offline" ||
  value === "initializing" ||
  value === "idle" ||
  value === "running" ||
  value === "error";

export const normalizeAgentApiStatus = (
  value: unknown,
  fallback: AgentApiStatus = "offline",
): AgentApiStatus => {
  const token = normalizeStatusToken(value);
  if (!token) {
    return fallback;
  }
  if (isAgentApiStatus(token)) {
    return token;
  }
  if (token === "active") {
    return "running";
  }
  if (token === "terminated") {
    return "offline";
  }
  return fallback;
};

export const buildAgentStatusPayload = (input: {
  status: unknown;
  canInterrupt?: boolean | null;
  agentId?: string | null;
  agentName?: string | null;
}): AgentStatusPayload => {
  const status = normalizeAgentApiStatus(input.status);
  const payload: AgentStatusPayload = {
    status,
    can_interrupt: status === "running" && input.canInterrupt === true,
  };
  const agentId = typeof input.agentId === "string" ? input.agentId.trim() : "";
  if (agentId) {
    payload.agent_id = agentId;
  }
  const agentName = typeof input.agentName === "string" ? input.agentName.trim() : "";
  if (agentName) {
    payload.agent_name = agentName;
  }
  return payload;
};
