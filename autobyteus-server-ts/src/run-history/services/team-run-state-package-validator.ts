import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-v1-types.js";

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
  for (const message of state.communicationMessages.messages) {
    index.requireAgent(message.senderAgentRunId);
    index.requireAgent(message.receiverAgentRunId);
    if (message.senderAgentRunId === message.receiverAgentRunId) {
      throw new Error(`Message '${message.messageId}' must use distinct AgentRun endpoints.`);
    }
  }
  return Object.freeze({ ...state, index });
};
