import type { AgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import {
  cloneTaskTeamInstanceIdentity,
  type TaskTeamInstanceIdentity,
} from "./task-team-instance.js";

export type TeamLeafAgentStatusPayload = AgentStatusPayload & {
  agent_id: string;
  agent_name: string;
  member_route_key: string;
  member_path: string[];
  source_route_key: string;
  source_path: string[];
};

export type OrdinaryTeamLeafAgentStatusSnapshot = {
  scopeKind: "ordinary_member";
  teamRunId: string;
  payload: TeamLeafAgentStatusPayload;
};

export type TaskTeamLeafAgentStatusSnapshot = {
  scopeKind: "task_team_member";
  teamRunId: string;
  payload: TeamLeafAgentStatusPayload;
  taskTeamInstance: TaskTeamInstanceIdentity;
};

export type TeamLeafAgentStatusSnapshot =
  | OrdinaryTeamLeafAgentStatusSnapshot
  | TaskTeamLeafAgentStatusSnapshot;

const requiredIdentity = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required for a team leaf agent status snapshot.`);
  }
  return normalized;
};

const requiredPath = (value: readonly string[], fieldName: string): string[] => {
  const normalized = value.map((part) => part.trim()).filter(Boolean);
  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required for a team leaf agent status snapshot.`);
  }
  return normalized;
};

const clonePayload = (
  payload: TeamLeafAgentStatusPayload,
): TeamLeafAgentStatusPayload => ({
  ...payload,
  agent_id: requiredIdentity(payload.agent_id, "agent_id"),
  agent_name: requiredIdentity(payload.agent_name, "agent_name"),
  member_route_key: requiredIdentity(payload.member_route_key, "member_route_key"),
  member_path: requiredPath(payload.member_path, "member_path"),
  source_route_key: requiredIdentity(payload.source_route_key, "source_route_key"),
  source_path: requiredPath(payload.source_path, "source_path"),
});

export const buildOrdinaryTeamLeafAgentStatusSnapshot = (input: {
  teamRunId: string;
  payload: TeamLeafAgentStatusPayload;
}): OrdinaryTeamLeafAgentStatusSnapshot => ({
  scopeKind: "ordinary_member",
  teamRunId: requiredIdentity(input.teamRunId, "teamRunId"),
  payload: clonePayload(input.payload),
});

export const buildTaskTeamLeafAgentStatusSnapshot = (input: {
  teamRunId: string;
  payload: TeamLeafAgentStatusPayload;
  taskTeamInstance: TaskTeamInstanceIdentity;
}): TaskTeamLeafAgentStatusSnapshot => ({
  scopeKind: "task_team_member",
  teamRunId: requiredIdentity(input.teamRunId, "teamRunId"),
  payload: clonePayload(input.payload),
  taskTeamInstance: cloneTaskTeamInstanceIdentity(input.taskTeamInstance),
});
