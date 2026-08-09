import { ServerMessageType, type ServerMessage } from "../models.js";

const readNonEmptyString = (
  payload: Record<string, unknown>,
  key: string,
): string | null => {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const identityPart = (label: string, value: string): string =>
  `${label}:${value.length}:${value}`;

export const resolveAgentStatusProjectionIdentity = (
  message: Readonly<ServerMessage>,
): string | null => {
  if (message.type !== ServerMessageType.AGENT_STATUS) {
    return null;
  }
  const payload = message.payload;
  const agentRunId = readNonEmptyString(payload, "agent_id");
  if (!agentRunId) {
    return null;
  }

  const taskAgentInstanceId = readNonEmptyString(payload, "task_agent_instance_id");
  const taskAgentRunId = readNonEmptyString(payload, "task_agent_run_id");
  if (taskAgentInstanceId || taskAgentRunId) {
    if (!taskAgentInstanceId || !taskAgentRunId || taskAgentRunId !== agentRunId) {
      return null;
    }
    return [
      "task-agent",
      identityPart("instance", taskAgentInstanceId),
      identityPart("run", taskAgentRunId),
      ...(readNonEmptyString(payload, "source_route_key")
        ? [identityPart("source", readNonEmptyString(payload, "source_route_key")!)]
        : []),
    ].join("|");
  }

  const taskTeamRunId = readNonEmptyString(payload, "task_team_run_id");
  const taskTeamInstanceId = readNonEmptyString(payload, "task_team_instance_id");
  const taskId = readNonEmptyString(payload, "task_id");
  const teamRouteKey = readNonEmptyString(payload, "team_route_key");
  const relativeRouteKey = readNonEmptyString(
    payload,
    "task_team_relative_member_route_key",
  );
  if (taskTeamRunId || taskTeamInstanceId || taskId || teamRouteKey || relativeRouteKey) {
    if (!taskTeamRunId || !taskTeamInstanceId || !taskId || !teamRouteKey || !relativeRouteKey) {
      return null;
    }
    return [
      "task-team-leaf",
      identityPart("run", taskTeamRunId),
      identityPart("instance", taskTeamInstanceId),
      identityPart("task", taskId),
      identityPart("team", teamRouteKey),
      identityPart("member", relativeRouteKey),
      identityPart("agent", agentRunId),
    ].join("|");
  }

  const memberRouteKey = readNonEmptyString(payload, "member_route_key");
  if (memberRouteKey) {
    return [
      "team-member",
      identityPart("member", memberRouteKey),
      identityPart("agent", agentRunId),
    ].join("|");
  }
  return `standalone|${identityPart("agent", agentRunId)}`;
};
