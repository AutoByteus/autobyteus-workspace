import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import { cloneTaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import { cloneTaskTeamInstanceIdentity } from "../domain/task-team-instance.js";

export type TaskAgentExecutionInstance = {
  kind: "task_agent";
  taskAgentInstance: TaskAgentInstanceIdentity;
};

export type TaskTeamExecutionInstance = {
  kind: "task_team";
  taskTeamInstance: TaskTeamInstanceIdentity;
};

export type TaskExecutionInstance = TaskAgentExecutionInstance | TaskTeamExecutionInstance;

export const cloneTaskExecutionInstance = (
  execution: TaskExecutionInstance,
): TaskExecutionInstance => execution.kind === "task_agent"
  ? {
      kind: "task_agent",
      taskAgentInstance: cloneTaskAgentInstanceIdentity(execution.taskAgentInstance),
    }
  : {
      kind: "task_team",
      taskTeamInstance: cloneTaskTeamInstanceIdentity(execution.taskTeamInstance),
    };

export const getTaskExecutionRunId = (execution: TaskExecutionInstance | null): string | null => {
  if (!execution) return null;
  return execution.kind === "task_agent"
    ? execution.taskAgentInstance.taskAgentRunId
    : execution.taskTeamInstance.taskTeamRunId;
};

export const getTaskExecutionKind = (execution: TaskExecutionInstance | null): TaskExecutionInstance["kind"] | null =>
  execution?.kind ?? null;
