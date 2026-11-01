import { GraphQLJSON } from "graphql-scalars";
import { Arg, Query, Resolver } from "type-graphql";
import {
  collaborationParticipantMessagesDtoSchema,
  collaborationRootKindSchema,
  type CollaborationParticipantMessagesDto,
  type CollaborationRootKind,
} from "@autobyteus/collaboration-stream-contracts";
import type { CollaborationCommunicationMessage } from "../../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { AgentOrgRunManager } from "../../../agent-org-execution/services/agent-org-run-manager.js";
import { AgentOrgExecutionIndex } from "../../../agent-org-execution/services/agent-org-execution-index.js";
import { TeamExecutionIndex } from "../../../agent-team-execution/services/team-execution-index.js";
import { isPublicMessage } from "../../../services/agent-streaming/public-message-scope.js";
import { getTeamCommunicationProjectionService } from "../../../services/team-communication/team-communication-projection-service.js";
import { getStandaloneAgentRunRootManager } from "../../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { StandaloneRootExecutionIndex } from "../../../standalone-agent-run-root/services/standalone-root-execution-index.js";

type RootRecords = Readonly<{
  messages: readonly CollaborationCommunicationMessage[];
  isAgentOfTree(agentRunId: string): boolean;
}>;

/** Each root kind's records owner: the live root's messages, or its stored log validated with its tree. */
const readRootRecords = async (rootKind: CollaborationRootKind, rootRunId: string): Promise<RootRecords> => {
  switch (rootKind) {
    case "agent": {
      const records = await getStandaloneAgentRunRootManager().getCollaborationRecordsSnapshot(rootRunId);
      const index = new StandaloneRootExecutionIndex(records.tree);
      return { messages: records.messages.messages, isAgentOfTree: (id) => index.getAgent(id) !== null };
    }
    case "agent_team": {
      const records = await getTeamCommunicationProjectionService().getCollaborationRecordsSnapshot(rootRunId);
      const index = new TeamExecutionIndex(records.executionTree);
      return { messages: records.messages.messages, isAgentOfTree: (id) => index.getAgent(id) !== null };
    }
    case "agent_org": {
      const records = await AgentOrgRunManager.getInstance().getCollaborationRecordsSnapshot(rootRunId);
      const index = new AgentOrgExecutionIndex(records.executionTree);
      return { messages: records.messages.messages, isAgentOfTree: (id) => index.getAgent(id) !== null };
    }
  }
};

/**
 * One participant's messages of one root (autobyteus-358): the Team tab reads them when it is shown, instead of
 * every view carrying the root's whole log. Both endpoints of each message are agents of the root, as in the
 * root's view stream (`isPublicMessage`). A run on another node is not a participant: its messages stay on its node.
 */
export const readCollaborationParticipantMessages = async (input: Readonly<{
  rootKind: string;
  rootRunId: string;
  agentRunId: string;
}>): Promise<CollaborationParticipantMessagesDto> => {
  const rootKind = collaborationRootKindSchema.parse(input.rootKind);
  const rootRunId = input.rootRunId.trim();
  const agentRunId = input.agentRunId.trim();
  if (!rootRunId || !agentRunId) throw new Error("rootRunId and agentRunId are required.");
  const records = await readRootRecords(rootKind, rootRunId);
  if (!records.isAgentOfTree(agentRunId)) {
    throw new Error(`AgentRun '${agentRunId}' is not a participant of ${rootKind} run '${rootRunId}'.`);
  }
  return collaborationParticipantMessagesDtoSchema.parse({
    messages: records.messages
      .filter((message) => (message.senderAgentRunId === agentRunId || message.receiverAgentRunId === agentRunId)
        && isPublicMessage(message, records.isAgentOfTree))
      .map((message) => ({
        messageId: message.messageId, senderAgentRunId: message.senderAgentRunId, receiverAgentRunId: message.receiverAgentRunId,
        content: message.content, messageType: message.messageType, referenceFiles: [...message.referenceFiles], createdAt: message.createdAt,
      })),
  });
};

@Resolver()
export class CollaborationParticipantMessagesResolver {
  @Query(() => GraphQLJSON)
  collaborationParticipantMessages(
    @Arg("rootKind", () => String) rootKind: string,
    @Arg("rootRunId", () => String) rootRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<CollaborationParticipantMessagesDto> {
    return readCollaborationParticipantMessages({ rootKind, rootRunId, agentRunId });
  }
}
