import type { TeamLeafAgentStatusSnapshot } from "../../agent-team-execution/domain/team-leaf-agent-status-snapshot.js";
import type { TaskTeamInstanceIdentity } from "../../agent-team-execution/domain/task-team-instance.js";
import { buildMemberRouteKeyFromPath } from "../../agent-team-execution/domain/team-run-member-identity.js";
import { ServerMessage, ServerMessageType } from "./models.js";

export type TeamStreamTaskTeamIdentityPayload = {
  task_team_run_id: string;
  task_team_instance_id: string;
  task_id: string;
  team_route_key: string;
  team_path: string[];
  task_team_relative_member_path: string[];
  task_team_relative_member_route_key?: string;
};

const pathStartsWith = (
  path: readonly string[],
  prefix: readonly string[],
): boolean => path.length >= prefix.length && prefix.every(
  (segment, index) => path[index] === segment,
);

export const buildTaskTeamScopedIdentityPayload = (input: {
  sourcePath: string[];
  taskTeamInstance: TaskTeamInstanceIdentity | null;
}): TeamStreamTaskTeamIdentityPayload | null => {
  if (!input.taskTeamInstance) {
    return null;
  }

  const teamPath = [...input.taskTeamInstance.logicalTeam.memberPath];
  const relativeMemberPath = pathStartsWith(input.sourcePath, teamPath)
    ? input.sourcePath.slice(teamPath.length)
    : [];
  const relativeMemberRouteKey = relativeMemberPath.length > 0
    ? buildMemberRouteKeyFromPath(relativeMemberPath)
    : null;

  return {
    task_team_run_id: input.taskTeamInstance.taskTeamRunId,
    task_team_instance_id: input.taskTeamInstance.taskTeamInstanceId,
    task_id: input.taskTeamInstance.taskId,
    team_route_key: input.taskTeamInstance.logicalTeam.memberRouteKey,
    team_path: teamPath,
    task_team_relative_member_path: relativeMemberPath,
    ...(relativeMemberRouteKey
      ? { task_team_relative_member_route_key: relativeMemberRouteKey }
      : {}),
  };
};

export const mapTeamLeafAgentStatusSnapshot = (
  snapshot: TeamLeafAgentStatusSnapshot,
): ServerMessage => {
  const taskTeamIdentity = buildTaskTeamScopedIdentityPayload({
    sourcePath: snapshot.payload.source_path,
    taskTeamInstance: snapshot.scopeKind === "task_team_member"
      ? snapshot.taskTeamInstance
      : null,
  });
  if (
    snapshot.scopeKind === "task_team_member" &&
    !taskTeamIdentity?.task_team_relative_member_route_key
  ) {
    throw new Error(
      `Task-team leaf status '${snapshot.payload.agent_id}' is not rooted below '${snapshot.taskTeamInstance.logicalTeam.memberRouteKey}'.`,
    );
  }
  return new ServerMessage(ServerMessageType.AGENT_STATUS, {
    ...snapshot.payload,
    ...(taskTeamIdentity ?? {}),
  });
};
