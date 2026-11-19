import { getStudioDelegatedRunAgents } from "../studio-application-api-services.js";
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
import { createRootExecutionIdentity } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { runIdentityOf } from "../../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../../agent-collaboration/execution/task/task-execution-reference.js";
import { composeRunViewMessages, type RunMessageRecords, type RunViewMessages } from "../../../run-history/services/run-view-messages.js";

/** Each root kind's records owner: the live root's own log and own agents, or its stored log validated with its tree. */
const readRunRecords = async (rootKind: CollaborationRootKind, rootRunId: string): Promise<RunMessageRecords> => {
  switch (rootKind) {
    case "agent": {
      // A standalone run's one agent is the run itself; every other agent of its messages is of another run.
      const records = await getStandaloneAgentRunRootManager().getCollaborationRecordsSnapshot(rootRunId);
      return { messages: records.messages.messages, isOwnAgent: (id) => id === records.agent.agentRunId };
    }
    case "agent_team": {
      const records = await getTeamCommunicationProjectionService().getCollaborationRecordsSnapshot(rootRunId);
      const index = new TeamExecutionIndex(records.executionTree);
      return { messages: records.messages.messages, isOwnAgent: (id) => index.getAgent(id) !== null };
    }
    case "agent_org": {
      const records = await AgentOrgRunManager.getInstance().getCollaborationRecordsSnapshot(rootRunId);
      const index = new AgentOrgExecutionIndex(records.executionTree);
      return { messages: records.messages.messages, isOwnAgent: (id) => index.getAgent(id) !== null };
    }
  }
};

/**
 * The records of the view of run X (SR-072, SR-074): X's own log composed with the own log of every local run of its open
 * subtree (`composeRunViewMessages`), the set taken once, at the read's start (ARCH-REV-048).
 */
const readRootRecords = async (rootKind: CollaborationRootKind, rootRunId: string): Promise<RunViewMessages> => {
  const openBelow = getStudioDelegatedRunAgents().openRunsBelow(createRootExecutionIdentity({ rootSubjectKind: rootKind, rootRunId }));
  const readBelow = async (ref: TaskExecutionReference) => {
    const run = runIdentityOf(ref);
    const records = await readRunRecords(run.rootSubjectKind, run.rootRunId).catch((error: unknown) => error instanceof Error ? error : new Error(String(error)));
    return { run: run.rootRunId, records };
  };
  const [own, runs] = await Promise.all([readRunRecords(rootKind, rootRunId), Promise.all(openBelow.map(readBelow))]);
  return composeRunViewMessages({ own, below: runs });
};

/**
 * One participant's messages of one root (autobyteus-358): the Team tab reads them when it is shown, instead of
 * every view carrying the root's whole log. Its messages are the root's log composed with those of every run below it
 * (SR-072). The other agent of each message is an agent of the view's tree, the root's or an open row's at any depth
 * (`isPublicMessage`), or an agent of a run below it that left its tree when its Task closed: those are returned in
 * `pastParticipants` with the address they had, read from the runs' own files (D-5). A run on another node is not a
 * participant: its messages stay on its node.
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
  const counterpartOf = (message: CollaborationCommunicationMessage): string =>
    message.senderAgentRunId === agentRunId ? message.receiverAgentRunId : message.senderAgentRunId;
  const own = records.messages.filter((message) => message.senderAgentRunId === agentRunId || message.receiverAgentRunId === agentRunId);
  const outsideTree = new Set(own.map(counterpartOf).filter((id) => !records.isAgentOfTree(id)));
  const pastParticipants = outsideTree.size === 0 ? [] : await getStudioDelegatedRunAgents().forAgentRunIds(createRootExecutionIdentity({ rootSubjectKind: rootKind, rootRunId }), outsideTree);
  const past = new Set(pastParticipants.map((participant) => participant.agentRunId));
  return collaborationParticipantMessagesDtoSchema.parse({
    pastParticipants,
    messages: own
      .filter((message) => isPublicMessage(message, records.isAgentOfTree) || past.has(counterpartOf(message)))
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
