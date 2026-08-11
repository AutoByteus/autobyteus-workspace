import { ServerMessageType } from "../models.js";
import type { AgentStreamEgressControlMessage } from "./agent-stream-egress-control.js";

const readNonEmptyString = (
  payload: Readonly<Record<string, unknown>>,
  key: string,
): string | null => {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const identityPart = (label: string, value: string): string =>
  `${label}:${value.length}:${value}`;

const resolveTeamExecutionIdentity = (
  payload: Readonly<Record<string, unknown>>,
): string | null => {
  const rawBinding = payload.agent_execution;
  if (!rawBinding || typeof rawBinding !== "object" || Array.isArray(rawBinding)) {
    return null;
  }
  const binding = rawBinding as Readonly<Record<string, unknown>>;
  const rawAddress = binding.execution_address;
  if (!rawAddress || typeof rawAddress !== "object" || Array.isArray(rawAddress)) {
    return null;
  }
  const address = rawAddress as Readonly<Record<string, unknown>>;
  const root = readNonEmptyString(address, "root_team_run_id");
  const member = readNonEmptyString(address, "member_address");
  const taskAgent = address.task_agent_run_id;
  const taskTeams = address.task_team_run_ids;
  if (!root || !member || !Array.isArray(taskTeams) ||
    taskTeams.some((value) => typeof value !== "string" || !value.trim()) ||
    (taskAgent !== null && (typeof taskAgent !== "string" || !taskAgent.trim()))) {
    return null;
  }
  const run = binding.agent_run_id;
  if (binding.kind === "task_team_agent" && (typeof run !== "string" || !run.trim())) {
    return null;
  }
  return JSON.stringify({
    kind: binding.kind,
    root_team_run_id: root,
    task_team_run_ids: taskTeams,
    member_address: member,
    task_agent_run_id: taskAgent,
    agent_run_id: run ?? null,
  });
};

export const resolveAgentStatusProjectionIdentity = (
  message: AgentStreamEgressControlMessage,
): string | null => {
  if (message.type !== ServerMessageType.AGENT_STATUS) {
    return null;
  }
  const payload = message.payload;
  const teamExecutionIdentity = resolveTeamExecutionIdentity(payload);
  if (teamExecutionIdentity) {
    return `team-execution|${teamExecutionIdentity}`;
  }
  const agentRunId = readNonEmptyString(payload, "agent_id");
  if (!agentRunId) {
    return null;
  }

  return `standalone|${identityPart("agent", agentRunId)}`;
};
