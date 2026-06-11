import {
  cloneTaskAgentInstanceIdentity,
  type TaskAgentInstanceIdentity,
} from "../domain/task-agent-instance.js";
import type { TaskDelegationMemberIdentity } from "./task-delegation-record.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export const buildTaskAgentInstanceIdentity = (input: {
  teamRunId: string;
  taskId: string;
  taskAgentRunId: string;
  logicalMember: TaskDelegationMemberIdentity;
}): TaskAgentInstanceIdentity => {
  const taskId = normalizeRequiredString(input.taskId, "taskId");
  return {
    taskAgentInstanceId: `task_agent_${taskId}`,
    taskAgentRunId: normalizeRequiredString(input.taskAgentRunId, "taskAgentRunId"),
    teamRunId: normalizeRequiredString(input.teamRunId, "teamRunId"),
    taskId,
    logicalMember: {
      memberName: input.logicalMember.memberName,
      memberPath: [...input.logicalMember.memberPath],
      memberRouteKey: input.logicalMember.memberRouteKey,
      templateMemberRunId: input.logicalMember.memberRunId,
      runtimeKind: input.logicalMember.runtimeKind ?? null,
    },
    createdAt: new Date().toISOString(),
  };
};

export const cloneTaskAgentIdentity = (
  identity: TaskAgentInstanceIdentity,
): TaskAgentInstanceIdentity => cloneTaskAgentInstanceIdentity(identity);
