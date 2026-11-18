import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-messages-file.js";

/** Current Team package: execution tree (read tolerantly) + communication messages. Task-records files are not read. */
export type TeamRunStatePackage = Readonly<{
  executionTree: TeamRunExecutionTreeSnapshot;
  communicationMessages: TeamCommunicationMessagesSnapshot;
}>;

export type ValidatedTeamRunStatePackage = TeamRunStatePackage & Readonly<{
  index: TeamExecutionIndex;
}>;

/** The tree alone: what the history admission reads (autobyteus-358: no message log). */
export const validateTeamRunExecutionTree = (
  executionTree: TeamRunExecutionTreeSnapshot,
  rootTeamRunId: string,
): TeamExecutionIndex => {
  if (executionTree.rootTeam.teamRunId !== rootTeamRunId) {
    throw new Error(`TeamRun package '${rootTeamRunId}' has contradictory root IDs.`);
  }
  return new TeamExecutionIndex(executionTree);
};

export const validateTeamRunStatePackage = (
  state: TeamRunStatePackage,
): ValidatedTeamRunStatePackage => {
  const rootTeamRunId = state.executionTree.rootTeam.teamRunId;
  if (state.communicationMessages.rootTeamRunId !== rootTeamRunId) {
    throw new Error(`TeamRun package '${rootTeamRunId}' has contradictory root IDs.`);
  }
  const index = validateTeamRunExecutionTree(state.executionTree, rootTeamRunId);
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
