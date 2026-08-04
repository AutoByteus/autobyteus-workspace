import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";

const required = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

export const buildTaskAgentInstanceIdentity = (input: {
  owningTeamRunId: string;
  taskId: string;
  taskAgentRunId: string;
}): TaskAgentInstanceIdentity => {
  const taskId = required(input.taskId, "taskId");
  return Object.freeze({
    taskAgentInstanceId: `task_agent_${taskId}`,
    taskAgentRunId: required(input.taskAgentRunId, "taskAgentRunId"),
    owningTeamRunId: required(input.owningTeamRunId, "owningTeamRunId"),
    taskId,
    createdAt: new Date().toISOString(),
  });
};
