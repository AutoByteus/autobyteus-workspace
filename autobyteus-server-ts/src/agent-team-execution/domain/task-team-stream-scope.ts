import type { TaskTeamInstanceIdentity } from "./task-team-instance.js";
import {
  buildMemberRouteKeyFromPath,
  normalizeMemberPath,
} from "./team-run-member-identity.js";

export type TaskTeamStreamScope = {
  taskTeamRunId: string;
  taskTeamInstanceId: string;
  taskId: string;
  logicalTeamPath: string[];
  logicalTeamRouteKey: string;
};

const normalizeRequiredId = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required for task-team stream scope.`);
  }
  return normalized;
};

const normalizedScope = (scope: TaskTeamStreamScope): TaskTeamStreamScope => {
  const logicalTeamPath = normalizeMemberPath(scope.logicalTeamPath);
  return {
    taskTeamRunId: normalizeRequiredId(scope.taskTeamRunId, "taskTeamRunId"),
    taskTeamInstanceId: normalizeRequiredId(
      scope.taskTeamInstanceId,
      "taskTeamInstanceId",
    ),
    taskId: normalizeRequiredId(scope.taskId, "taskId"),
    logicalTeamPath,
    logicalTeamRouteKey: buildMemberRouteKeyFromPath(logicalTeamPath),
  };
};

export const buildTaskTeamStreamScope = (input: {
  taskTeamInstance: TaskTeamInstanceIdentity;
  parentTeamRunId: string;
}): TaskTeamStreamScope => {
  const parentTeamRunId = normalizeRequiredId(
    input.parentTeamRunId,
    "parentTeamRunId",
  );
  const operationalParentTeamRunId = normalizeRequiredId(
    input.taskTeamInstance.parentTeamRunId,
    "taskTeamInstance.parentTeamRunId",
  );
  if (operationalParentTeamRunId !== parentTeamRunId) {
    throw new Error(
      `Task-team run '${input.taskTeamInstance.taskTeamRunId}' belongs to parent team run '${operationalParentTeamRunId}', not '${parentTeamRunId}'.`,
    );
  }

  return normalizedScope({
    taskTeamRunId: input.taskTeamInstance.taskTeamRunId,
    taskTeamInstanceId: input.taskTeamInstance.taskTeamInstanceId,
    taskId: input.taskTeamInstance.taskId,
    logicalTeamPath: input.taskTeamInstance.logicalTeam.memberPath,
    logicalTeamRouteKey: input.taskTeamInstance.logicalTeam.memberRouteKey,
  });
};

export const cloneTaskTeamStreamScope = (
  scope: TaskTeamStreamScope,
): TaskTeamStreamScope => normalizedScope(scope);

const pathStartsWith = (
  path: readonly string[],
  prefix: readonly string[],
): boolean => path.length >= prefix.length && prefix.every(
  (segment, index) => path[index] === segment,
);

export const assertTaskTeamLeafSourcePath = (input: {
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
  leafId: string;
}): void => {
  if (!input.taskTeamScope) {
    return;
  }
  const scope = cloneTaskTeamStreamScope(input.taskTeamScope);
  const sourcePath = input.sourcePath.map((part) => part.trim());
  const relativeLength = sourcePath.length - scope.logicalTeamPath.length;
  if (
    sourcePath.some((part) => !part) ||
    !pathStartsWith(sourcePath, scope.logicalTeamPath) ||
    relativeLength <= 0
  ) {
    throw new Error(
      `Task-team leaf '${input.leafId}' must be rooted below '${scope.logicalTeamRouteKey}' with a nonempty relative member path.`,
    );
  }
};
