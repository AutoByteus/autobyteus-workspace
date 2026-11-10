import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgCommunicationMessagesFile } from "../persistence/agent-org-communication-messages.js";
import { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";

/** Current Org package: execution tree (read tolerantly) + communication messages. Task-records files are not read. */
export type AgentOrgStatePackage = Readonly<{
  executionTree: AgentOrgRunExecutionTreeSnapshot;
  communicationMessages: AgentOrgCommunicationMessagesFile;
}>;
export type ValidatedAgentOrgStatePackage = AgentOrgStatePackage & Readonly<{ index: AgentOrgExecutionIndex }>;

/** The tree alone: what the run's view and the history admission read (autobyteus-358: no message log). */
export const validateAgentOrgExecutionTree = (executionTree: AgentOrgRunExecutionTreeSnapshot): AgentOrgExecutionIndex => {
  if (executionTree.subjectKind !== "agent_org") {
    throw new Error(`AgentOrg package '${executionTree.rootOrg.orgRunId}' has contradictory family or root correlation.`);
  }
  return new AgentOrgExecutionIndex(executionTree);
};

export const validateAgentOrgStatePackage = (state: AgentOrgStatePackage): ValidatedAgentOrgStatePackage => {
  const orgRunId = state.executionTree.rootOrg.orgRunId;
  const index = validateAgentOrgExecutionTree(state.executionTree);
  if (state.communicationMessages.subjectKind !== "agent_org" || state.communicationMessages.orgRunId !== orgRunId) {
    throw new Error(`AgentOrg package '${orgRunId}' has contradictory family or root correlation.`);
  }
  // At least one endpoint is an agent of this tree (the index stays local-only). The other may be an agent of a
  // delegated run that left the tree (D-5): the view keeps an own agent's messages with it.
  for (const message of state.communicationMessages.messages) {
    if (message.senderAgentRunId === message.receiverAgentRunId) {
      throw new Error(`Message '${message.messageId}' must use distinct AgentRun endpoints.`);
    }
    if (!index.getAgent(message.senderAgentRunId) && !index.getAgent(message.receiverAgentRunId)) {
      throw new Error(`Message '${message.messageId}' has no endpoint that is an agent of this run.`);
    }
  }
  return Object.freeze({ ...state, index });
};
