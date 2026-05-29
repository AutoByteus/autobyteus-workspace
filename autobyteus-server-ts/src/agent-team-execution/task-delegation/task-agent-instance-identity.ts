import {
  cloneTaskAgentInstanceIdentity,
  type TaskAgentInstanceIdentity,
} from "../domain/task-agent-instance.js";
import type { TaskDelegationMemberIdentity } from "./task-delegation-record.js";

const sanitizeRunIdPart = (value: string): string => {
  const sanitized = value.trim().replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return sanitized.length > 0 ? sanitized : "member";
};

export const buildTaskAgentInstanceIdentity = (input: {
  teamRunId: string;
  taskId: string;
  logicalMember: TaskDelegationMemberIdentity;
}): TaskAgentInstanceIdentity => {
  const taskId = input.taskId.trim();
  const memberRoutePart = sanitizeRunIdPart(input.logicalMember.memberRouteKey);
  return {
    taskAgentInstanceId: `task_agent_${taskId}`,
    taskAgentRunId: `${input.teamRunId}__${memberRoutePart}__${taskId}`,
    teamRunId: input.teamRunId,
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
