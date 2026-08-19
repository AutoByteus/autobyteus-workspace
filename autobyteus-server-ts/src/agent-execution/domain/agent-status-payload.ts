export type AgentApiStatus = "offline" | "initializing" | "idle" | "running" | "error";

export type AgentStatusPayload = {
  status: AgentApiStatus;
  agent_id?: string;
  agent_name?: string;
};

const normalizeStatusToken = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized || null;
};

export const isAgentApiStatus = (value: unknown): value is AgentApiStatus =>
  value === "offline" || value === "initializing" || value === "idle" ||
  value === "running" || value === "error";

export const normalizeAgentApiStatus = (
  value: unknown,
  fallback: AgentApiStatus = "offline",
): AgentApiStatus => {
  const token = normalizeStatusToken(value);
  if (!token) return fallback;
  if (isAgentApiStatus(token)) return token;
  if (token === "active") return "running";
  if (token === "terminated") return "offline";
  return fallback;
};

const normalized = (value: string | null | undefined): string | null => {
  const result = value?.trim();
  return result || null;
};

export const buildAgentStatusPayload = (input: {
  status: unknown;
  agentId?: string | null;
  agentName?: string | null;
}): AgentStatusPayload => ({
  status: normalizeAgentApiStatus(input.status),
  ...(normalized(input.agentId) ? { agent_id: normalized(input.agentId)! } : {}),
  ...(normalized(input.agentName) ? { agent_name: normalized(input.agentName)! } : {}),
});
