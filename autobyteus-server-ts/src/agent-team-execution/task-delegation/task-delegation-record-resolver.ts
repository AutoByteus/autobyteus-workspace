import type { TeamRunConfig } from "../domain/team-run-config.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import { findTaskConfigNode } from "./task-delegation-execution-resolution.js";
import type { TaskDelegationRecordV1 } from "./task-delegation-record-v1.js";
import { TaskDelegationError } from "./task-delegation-record.js";

export const taskAssigneeAgentRunId = (
  task: TaskDelegationRecordV1,
  index: TeamExecutionIndex,
  config: TeamRunConfig,
): string => {
  if ("agentRunId" in task.taskExecution) return task.taskExecution.agentRunId;
  const team = index.requireTeam(task.taskExecution.teamRunId);
  const source = findTaskConfigNode(config.rootTeam, task.recipientAddress);
  if (!source || source.kind !== "agent_team") {
    throw new Error(`Configured Team '${task.recipientAddress}' was not found.`);
  }
  const coordinator = index.listDirectAgentExecutions(team.teamRunId)
    .find((agent) => agent.address === source.coordinatorAddress);
  if (!coordinator) throw new Error(`Task TeamRun '${team.teamRunId}' has no coordinator AgentRun.`);
  return coordinator.agentRunId;
};

export const findAssignedTask = (
  records: readonly TaskDelegationRecordV1[],
  index: TeamExecutionIndex,
  config: TeamRunConfig,
  agentRunId: string,
): TaskDelegationRecordV1 | null => {
  const matches = records.filter((task) =>
    taskAssigneeAgentRunId(task, index, config) === agentRunId &&
    task.status !== "accepted" &&
    task.status !== "interrupted"
  );
  if (matches.length > 1) {
    throw new TaskDelegationError(
      "TASK_CONTEXT_AMBIGUOUS",
      `AgentRun '${agentRunId}' owns multiple open tasks.`,
    );
  }
  return matches[0] ?? null;
};

export const requireTask = (
  records: readonly TaskDelegationRecordV1[],
  taskId: string,
): TaskDelegationRecordV1 => {
  const task = records.find((record) => record.taskId === taskId);
  if (!task) throw new TaskDelegationError("TASK_NOT_FOUND", `Task '${taskId}' was not found.`);
  return task;
};
