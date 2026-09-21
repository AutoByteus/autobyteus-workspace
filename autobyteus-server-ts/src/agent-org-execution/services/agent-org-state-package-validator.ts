import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgTaskDelegationRecordsFileV1 } from "../persistence/agent-org-task-delegation-records-v1.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";

export type AgentOrgStatePackage = Readonly<{
  executionTree: AgentOrgRunExecutionTreeSnapshot;
  taskRecords: AgentOrgTaskDelegationRecordsFileV1;
  communicationMessages: AgentOrgCommunicationMessagesFileV1;
}>;
export type ValidatedAgentOrgStatePackage = AgentOrgStatePackage & Readonly<{ index: AgentOrgExecutionIndex }>;

export const validateAgentOrgStatePackage = (state: AgentOrgStatePackage): ValidatedAgentOrgStatePackage => {
  const orgRunId = state.executionTree.rootOrg.orgRunId;
  if (state.executionTree.subjectKind !== "agent_org"
    || state.taskRecords.subjectKind !== "agent_org"
    || state.communicationMessages.subjectKind !== "agent_org"
    || state.taskRecords.orgRunId !== orgRunId
    || state.communicationMessages.orgRunId !== orgRunId) {
    throw new Error(`AgentOrg package '${orgRunId}' has contradictory family or root correlation.`);
  }
  const index = new AgentOrgExecutionIndex(state.executionTree);
  const referenced = new Set<string>();
  for (const task of state.taskRecords.records) {
    index.requireAgent(task.delegatorAgentRunId);
    const placement = index.getConfiguredPlacement(task.recipientAddress);
    if (!placement) throw new Error(`Task '${task.taskId}' recipient '${task.recipientAddress}' is not configured.`);
    const execution = index.getTaskExecution(task.taskExecution);
    if (!execution || execution.address !== task.recipientAddress) {
      throw new Error(`Task '${task.taskId}' does not resolve one exact task execution at its recipient.`);
    }
    const runId = execution.kind === "agent" ? execution.agentRunId : execution.teamRunId;
    if (referenced.has(runId)) throw new Error(`Task execution '${runId}' is referenced more than once.`);
    referenced.add(runId);
    const live = task.status === "active" || task.status === "awaiting_review";
    if (live && execution.source.settledAt !== null) {
      throw new Error(`Live task '${task.taskId}' references settled execution '${runId}'.`);
    }
    if (task.status === "interrupted" && execution.source.settledAt === null) {
      throw new Error(`Interrupted task '${task.taskId}' must reference a settled execution '${runId}'.`);
    }
    if (execution.kind === "team" && live) {
      if (!("teamRunId" in placement)) throw new Error(`Team task '${task.taskId}' recipient is not a configured Team.`);
      const coordinator = index.listDirectAgents({
        root: index.root, hostKind: "team", hostRunId: execution.teamRunId, hostAddress: execution.address,
      }).find((agent) => agent.address === placement.coordinatorAddress);
      if (!coordinator) throw new Error(`Live Team task '${task.taskId}' has no exact coordinator binding.`);
    }
  }
  for (const team of index.listTeams()) {
    if (team.executionKind === "task" && !referenced.has(team.teamRunId)) {
      throw new Error(`Task TeamRun '${team.teamRunId}' is not referenced by a task record.`);
    }
  }
  for (const agent of index.listAgents()) {
    if (agent.executionKind === "task" && !referenced.has(agent.agentRunId)) {
      throw new Error(`Task AgentRun '${agent.agentRunId}' is not referenced by a task record.`);
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
