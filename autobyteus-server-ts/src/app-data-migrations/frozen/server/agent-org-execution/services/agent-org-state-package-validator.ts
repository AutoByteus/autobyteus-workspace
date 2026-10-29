import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgCommunicationMessagesFile } from "../persistence/agent-org-communication-messages.js";
import { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import { AGENT_ORG_RUN_TREE_SHAPE } from "../../run-history/store/coordinating-tree-shapes.js";
import { agentRunIdsOfTree } from "../../run-history/store/task-execution-tree-split.js";

/** Current Org package: execution tree (read tolerantly) + communication messages. Task-records files are not read. */
export type AgentOrgStatePackage = Readonly<{
  executionTree: AgentOrgRunExecutionTreeSnapshot;
  communicationMessages: AgentOrgCommunicationMessagesFile;
}>;
export type ValidatedAgentOrgStatePackage = AgentOrgStatePackage & Readonly<{ index: AgentOrgExecutionIndex }>;

export const validateAgentOrgStatePackage = (state: AgentOrgStatePackage): ValidatedAgentOrgStatePackage => {
  const orgRunId = state.executionTree.rootOrg.orgRunId;
  if (state.executionTree.subjectKind !== "agent_org"
    || state.communicationMessages.subjectKind !== "agent_org"
    || state.communicationMessages.orgRunId !== orgRunId) {
    throw new Error(`AgentOrg package '${orgRunId}' has contradictory family or root correlation.`);
  }
  const index = new AgentOrgExecutionIndex(state.executionTree);
  // The message endpoints are the store's set (the one that composed the view): the tree's agents and its
  // remote runs (AR-001). At least one endpoint is an agent of this tree; the index stays local-only.
  const endpoints = agentRunIdsOfTree(AGENT_ORG_RUN_TREE_SHAPE, state.executionTree);
  for (const message of state.communicationMessages.messages) {
    for (const agentRunId of [message.senderAgentRunId, message.receiverAgentRunId]) {
      if (!endpoints.has(agentRunId)) throw new Error(`Message '${message.messageId}' names AgentRun '${agentRunId}', which is not in this run.`);
    }
    if (message.senderAgentRunId === message.receiverAgentRunId) {
      throw new Error(`Message '${message.messageId}' must use distinct AgentRun endpoints.`);
    }
    if (!index.getAgent(message.senderAgentRunId) && !index.getAgent(message.receiverAgentRunId)) {
      throw new Error(`Message '${message.messageId}' has no endpoint that is an agent of this run.`);
    }
  }
  return Object.freeze({ ...state, index });
};
