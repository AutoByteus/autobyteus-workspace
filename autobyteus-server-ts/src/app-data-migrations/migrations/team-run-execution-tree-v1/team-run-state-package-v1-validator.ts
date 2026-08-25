import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree-v1-types.js";
import { TeamExecutionIndex } from "./team-execution-v1-index.js";
import type { TaskDelegationRecordsSnapshot } from "../../../agent-team-execution/task-delegation/task-delegation-record-v1.js";
import type { TeamCommunicationMessagesSnapshot } from "../../../services/team-communication/team-communication-v1-types.js";

export type TeamRunStatePackage = Readonly<{
  executionTree: TeamRunExecutionTreeSnapshot;
  taskRecords: TaskDelegationRecordsSnapshot;
  communicationMessages: TeamCommunicationMessagesSnapshot;
}>;

export type ValidatedTeamRunStatePackage = TeamRunStatePackage & Readonly<{
  index: TeamExecutionIndex;
}>;

export const validateTeamRunStatePackage = (
  state: TeamRunStatePackage,
): ValidatedTeamRunStatePackage => {
  const rootTeamRunId = state.executionTree.rootTeam.teamRunId;
  if (state.taskRecords.rootTeamRunId !== rootTeamRunId ||
      state.communicationMessages.rootTeamRunId !== rootTeamRunId) {
    throw new Error(`TeamRun package '${rootTeamRunId}' has contradictory root IDs.`);
  }
  const index = new TeamExecutionIndex(state.executionTree);
  const referencedTaskExecutions = new Set<string>();

  for (const task of state.taskRecords.records) {
    index.requireAgent(task.delegatorAgentRunId);
    const placement = index.getConfiguredPlacement(task.recipientAddress);
    if (!placement) {
      throw new Error(`Task '${task.taskId}' recipient '${task.recipientAddress}' is not configured.`);
    }
    const execution = index.getTaskExecution(task.taskExecution);
    if (!execution || execution.address !== task.recipientAddress) {
      throw new Error(`Task '${task.taskId}' does not resolve one exact task execution at its recipient.`);
    }
    const runId = execution.kind === "agent" ? execution.agentRunId : execution.teamRunId;
    if (referencedTaskExecutions.has(runId)) {
      throw new Error(`Task execution '${runId}' is referenced by more than one task.`);
    }
    referencedTaskExecutions.add(runId);

    const liveStatus = task.status === "active" || task.status === "awaiting_review";
    const settledAt = execution.source.settledAt;
    if (liveStatus && settledAt !== null) {
      throw new Error(`Live task '${task.taskId}' references settled execution '${runId}'.`);
    }
    if (task.status === "interrupted" && settledAt === null) {
      throw new Error(`Interrupted task '${task.taskId}' references an unsettled execution.`);
    }
    if (execution.kind === "team" && liveStatus) {
      const configured = placement;
      if (!("teamRunId" in configured)) {
        throw new Error(`Team task '${task.taskId}' recipient is not a configured Team.`);
      }
      const coordinator = index.listDirectAgentExecutions(execution.teamRunId)
        .find((agent) => agent.address === configured.coordinatorAddress);
      if (!coordinator) {
        throw new Error(`Live Team task '${task.taskId}' has no exact coordinator Agent binding.`);
      }
    }
  }

  for (const execution of index.listTeamExecutions()) {
    if (execution.executionKind !== "task") continue;
    if (!referencedTaskExecutions.has(execution.teamRunId)) {
      throw new Error(`Task TeamRun '${execution.teamRunId}' is not referenced by a task record.`);
    }
  }
  for (const execution of index.listAgentExecutions()) {
    if (execution.executionKind !== "task") continue;
    if (!referencedTaskExecutions.has(execution.agentRunId)) {
      throw new Error(`Task AgentRun '${execution.agentRunId}' is not referenced by a task record.`);
    }
  }

  for (const message of state.communicationMessages.messages) {
    index.requireAgent(message.senderAgentRunId);
    index.requireAgent(message.receiverAgentRunId);
    if (message.senderAgentRunId === message.receiverAgentRunId) {
      throw new Error(`Message '${message.messageId}' must use distinct AgentRun endpoints.`);
    }
  }

  return Object.freeze({ ...state, index });
};
