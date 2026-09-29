import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";

/** Current Org package: execution tree (read tolerantly) + communication messages. Task-records files are not read. */
export type AgentOrgStatePackage = Readonly<{
  executionTree: AgentOrgRunExecutionTreeSnapshot;
  communicationMessages: AgentOrgCommunicationMessagesFileV1;
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
  for (const message of state.communicationMessages.messages) {
    index.requireAgent(message.senderAgentRunId);
    index.requireAgent(message.receiverAgentRunId);
    if (message.senderAgentRunId === message.receiverAgentRunId) {
      throw new Error(`Message '${message.messageId}' must use distinct AgentRun endpoints.`);
    }
  }
  return Object.freeze({ ...state, index });
};
