import type { TeamLeafAgentStatusSnapshot } from "../../agent-team-execution/domain/team-leaf-agent-status-snapshot.js";
import {
  assertTaskTeamLeafSourcePath,
  cloneTaskTeamStreamScope,
  type TaskTeamStreamScope,
} from "../../agent-team-execution/domain/task-team-stream-scope.js";
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

const normalizeSourcePath = (sourcePath: readonly string[]): string[] =>
  sourcePath.map((segment, index) => {
    const normalized = segment.trim();
    if (!normalized) {
      throw new Error(`sourcePath[${index}] cannot be empty.`);
    }
    return normalized;
  });

const pathStartsWith = (
  path: readonly string[],
  prefix: readonly string[],
): boolean => path.length >= prefix.length && prefix.every(
  (segment, index) => path[index] === segment,
);

export const buildTaskTeamScopedIdentityPayload = (input: {
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
}): TeamStreamTaskTeamIdentityPayload | null => {
  if (!input.taskTeamScope) {
    return null;
  }
  const sourcePath = normalizeSourcePath(input.sourcePath);
  const scope = cloneTaskTeamStreamScope(input.taskTeamScope);
  if (!pathStartsWith(sourcePath, scope.logicalTeamPath)) {
    throw new Error(
      `Task-team source path '${sourcePath.join("/")}' is outside scope '${scope.logicalTeamRouteKey}'.`,
    );
  }
  const relativeMemberPath = sourcePath.slice(scope.logicalTeamPath.length);
  const relativeMemberRouteKey = relativeMemberPath.length > 0
    ? buildMemberRouteKeyFromPath(relativeMemberPath)
    : null;

  return {
    task_team_run_id: scope.taskTeamRunId,
    task_team_instance_id: scope.taskTeamInstanceId,
    task_id: scope.taskId,
    team_route_key: scope.logicalTeamRouteKey,
    team_path: [...scope.logicalTeamPath],
    task_team_relative_member_path: relativeMemberPath,
    ...(relativeMemberRouteKey
      ? { task_team_relative_member_route_key: relativeMemberRouteKey }
      : {}),
  };
};

export const assertTaskTeamLeafStreamScope = (input: {
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
  agentRunId: string;
}): void => assertTaskTeamLeafSourcePath({
  sourcePath: input.sourcePath,
  taskTeamScope: input.taskTeamScope,
  leafId: input.agentRunId,
});

export const mapTeamLeafAgentStatusSnapshot = (
  snapshot: TeamLeafAgentStatusSnapshot,
): ServerMessage => {
  const taskTeamScope = snapshot.scopeKind === "task_team_member"
    ? snapshot.taskTeamScope
    : null;
  assertTaskTeamLeafStreamScope({
    sourcePath: snapshot.payload.source_path,
    taskTeamScope,
    agentRunId: snapshot.payload.agent_id,
  });
  const taskTeamIdentity = buildTaskTeamScopedIdentityPayload({
    sourcePath: snapshot.payload.source_path,
    taskTeamScope,
  });
  return new ServerMessage(ServerMessageType.AGENT_STATUS, {
    ...snapshot.payload,
    ...(taskTeamIdentity ?? {}),
  });
};
