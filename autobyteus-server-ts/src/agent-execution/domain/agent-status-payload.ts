import { createTeamExecutionAddress, type TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";

export type AgentApiStatus = "offline" | "initializing" | "idle" | "running" | "error";

export type AgentStatusPayload = {
  status: AgentApiStatus;
  agent_id?: string;
  agent_name?: string;
  execution_address?: TeamExecutionAddress;
  task_agent_instance_id?: string;
  task_agent_run_id?: string;
  task_id?: string;
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
  executionAddress?: TeamExecutionAddress | null;
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
}): AgentStatusPayload => ({
  status: normalizeAgentApiStatus(input.status),
  ...(normalized(input.agentId) ? { agent_id: normalized(input.agentId)! } : {}),
  ...(normalized(input.agentName) ? { agent_name: normalized(input.agentName)! } : {}),
  ...(input.executionAddress ? { execution_address: createTeamExecutionAddress(input.executionAddress) } : {}),
  ...(normalized(input.taskAgentInstanceId) ? { task_agent_instance_id: normalized(input.taskAgentInstanceId)! } : {}),
  ...(normalized(input.taskAgentRunId) ? { task_agent_run_id: normalized(input.taskAgentRunId)! } : {}),
  ...(normalized(input.taskId) ? { task_id: normalized(input.taskId)! } : {}),
});
