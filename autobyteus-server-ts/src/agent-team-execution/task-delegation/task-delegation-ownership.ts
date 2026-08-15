import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import type { TaskDelegationRecordV1 } from "./task-delegation-record-v1.js";

export const taskOwnsAgent = (
  task: TaskDelegationRecordV1,
  agentRunId: string,
  index: TeamExecutionIndex,
): boolean => {
  const execution = task.taskExecution;
  if ("agentRunId" in execution) return execution.agentRunId === agentRunId;
  const agent = index.getAgent(agentRunId);
  return Boolean(agent && index.listTeamAncestorsDeepestFirst(agent.containingTeamRunId)
    .some((team) => team.teamRunId === execution.teamRunId));
};

export const hasOpenChildTask = (
  records: readonly TaskDelegationRecordV1[],
  task: TaskDelegationRecordV1,
  index: TeamExecutionIndex,
): boolean => records.some((candidate) => {
  if (candidate.taskId === task.taskId || !taskOwnsAgent(task, candidate.delegatorAgentRunId, index)) return false;
  const execution = index.getTaskExecution(candidate.taskExecution);
  return Boolean(execution && execution.source.settledAt === null);
});

export const orderTasksDeepestFirst = (
  records: readonly TaskDelegationRecordV1[],
  index: TeamExecutionIndex,
): readonly TaskDelegationRecordV1[] => {
  const depth = (task: TaskDelegationRecordV1, seen = new Set<string>()): number => {
    if (seen.has(task.taskId)) return 0;
    const parent = records.find((candidate) =>
      candidate.taskId !== task.taskId && taskOwnsAgent(candidate, task.delegatorAgentRunId, index));
    return parent ? depth(parent, new Set(seen).add(task.taskId)) + 1 : 0;
  };
  return Object.freeze([...records].sort((left, right) => depth(right) - depth(left)));
};
