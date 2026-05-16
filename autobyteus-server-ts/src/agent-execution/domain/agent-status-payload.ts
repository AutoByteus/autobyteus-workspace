export type AgentApiStatus = "offline" | "idle" | "running" | "error";

export type AgentStatusPayload = {
  status: AgentApiStatus;
  can_interrupt: boolean;
  agent_id?: string;
  agent_name?: string;
};

const RUNNING_STATUS_TOKENS = new Set([
  "active",
  "running",
  "processing",
  "processing_user_input",
  "awaiting_llm_response",
  "analyzing_llm_response",
  "awaiting_tool_approval",
  "tool_denied",
  "executing_tool",
  "processing_tool_result",
  "interrupting",
  "bootstrapping",
  "shutting_down",
  "inprogress",
  "in_progress",
  "busy",
]);

const IDLE_STATUS_TOKENS = new Set([
  "idle",
]);

const OFFLINE_STATUS_TOKENS = new Set([
  "uninitialized",
  "shutdown_complete",
  "shutdowncomplete",
  "stopped",
  "offline",
  "terminated",
  "missing",
  "inactive",
]);

const ERROR_STATUS_TOKENS = new Set([
  "error",
  "failed",
  "failure",
]);

const normalizeStatusToken = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized.length > 0 ? normalized : null;
};

export const isAgentApiStatus = (value: unknown): value is AgentApiStatus =>
  value === "offline" || value === "idle" || value === "running" || value === "error";

export const normalizeAgentApiStatus = (
  value: unknown,
  fallback: AgentApiStatus = "offline",
): AgentApiStatus => {
  const token = normalizeStatusToken(value);
  if (!token) {
    return fallback;
  }
  if (ERROR_STATUS_TOKENS.has(token)) {
    return "error";
  }
  if (RUNNING_STATUS_TOKENS.has(token)) {
    return "running";
  }
  if (IDLE_STATUS_TOKENS.has(token)) {
    return "idle";
  }
  if (OFFLINE_STATUS_TOKENS.has(token)) {
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
