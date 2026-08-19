import type { PreparedTaskExecution, TaskExecutionBinding } from "../domain/prepared-task-execution.js";
import type { TeamRunAgentTeamNode, TeamRunNode } from "../domain/team-run-config.js";
import type { TaskExecutionReference } from "./task-delegation-record-v1.js";

export const taskErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const sameTaskExecutionBinding = (
  reference: TaskExecutionReference,
  binding: TaskExecutionBinding,
): boolean => binding.kind === "agent"
  ? "agentRunId" in reference && reference.agentRunId === binding.agentRunId
  : "teamRunId" in reference && reference.teamRunId === binding.teamRunId;

export const findTaskConfigNode = (
  root: TeamRunAgentTeamNode,
  address: string,
): TeamRunNode | null => {
  if (root.address === address) return root;
  for (const child of root.children) {
    if (child.address === address) return child;
    if (child.kind === "agent_team") {
      const nested = findTaskConfigNode(child, address);
      if (nested) return nested;
    }
  }
  return null;
};

export const requirePreparedTaskTeamNode = (
  prepared: PreparedTaskExecution,
  root: TeamRunAgentTeamNode,
): TeamRunAgentTeamNode => {
  const binding = prepared.binding;
  if (binding.kind !== "team") throw new Error("Prepared execution is not a Team.");
  const source = findTaskConfigNode(root, binding.address);
  if (!source || source.kind !== "agent_team") {
    throw new Error(`Configured Team '${binding.address}' was not found.`);
  }
  const preparedRoot = prepared.preparedTeamRuns.find((run) => run.teamRunId === binding.teamRunId);
  if (!preparedRoot) throw new Error(`Prepared TeamRun '${binding.teamRunId}' was not found.`);
  return preparedRoot.context.teamNode;
};
