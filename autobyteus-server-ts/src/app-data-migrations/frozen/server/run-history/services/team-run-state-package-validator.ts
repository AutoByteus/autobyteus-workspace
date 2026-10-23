import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-messages-file.js";
import { TEAM_RUN_TREE_SHAPE } from "../store/coordinating-tree-shapes.js";
import { agentRunIdsOfTree } from "../store/task-execution-tree-split.js";

/** Current Team package: execution tree (read tolerantly) + communication messages. Task-records files are not read. */
export type TeamRunStatePackage = Readonly<{
  executionTree: TeamRunExecutionTreeSnapshot;
  communicationMessages: TeamCommunicationMessagesSnapshot;
}>;

export type ValidatedTeamRunStatePackage = TeamRunStatePackage & Readonly<{
  index: TeamExecutionIndex;
}>;

export const validateTeamRunStatePackage = (
  state: TeamRunStatePackage,
): ValidatedTeamRunStatePackage => {
  const rootTeamRunId = state.executionTree.rootTeam.teamRunId;
  if (state.communicationMessages.rootTeamRunId !== rootTeamRunId) {
    throw new Error(`TeamRun package '${rootTeamRunId}' has contradictory root IDs.`);
  }
  const index = new TeamExecutionIndex(state.executionTree);
  // The message endpoints are the store's set (the one that composed the view): the tree's agents and its
  // remote runs (AR-001). At least one endpoint is an agent of this tree; the index stays local-only.
  const endpoints = agentRunIdsOfTree(TEAM_RUN_TREE_SHAPE, state.executionTree);
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
