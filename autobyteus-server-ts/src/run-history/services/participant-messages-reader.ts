import {
  COLLABORATION_PARTICIPANT_MESSAGES_PAGE_SIZE,
  collaborationParticipantMessagesDtoSchema,
  type CollaborationParticipantMessagesCursor,
  type CollaborationParticipantMessagesDto,
  type CollaborationRootKind,
} from "@autobyteus/collaboration-stream-contracts";
import type { MessageViewScope } from "../../agent-collaboration/delegation/message-view-scope.js";
import type { CollaborationCommunicationMessage, MessageCounterpart } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { createRootExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { runIdentityOf } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CounterpartIdentities } from "./counterpart-identities.js";
import type { DelegatedRunAgentsReader } from "./delegated-run-agents-reader.js";
import type { RunRecordsSource } from "./run-records-source.js";
import { composeRunViewMessages, type RunViewMessages } from "./run-view-messages.js";

/**
 * The one order of a participant's messages (autobyteus-565 § Paging Order): newest first, then by message ID, for the
 * page, the cursor and the client's sort alike.
 */
export const participantMessageOrder = (left: Pick<CollaborationCommunicationMessage, "createdAt" | "messageId">,
  right: Pick<CollaborationCommunicationMessage, "createdAt" | "messageId">): number =>
  right.createdAt.localeCompare(left.createdAt) || left.messageId.localeCompare(right.messageId);

/**
 * One participant's messages of one root, a page at a time (autobyteus-358, autobyteus-565 DS-001): the root's view
 * composes its own log with those of every run of its open subtree (SR-072); `MessageViewScope` keeps what the view
 * shows for this participant (every message a standalone run's own agent sent or received; base's rule otherwise); the
 * page is the newest 50 strictly after the cursor in the one order; `CounterpartIdentities` names each other agent of the
 * page that the tree does not. A run on another node is not a participant: its messages stay on its node.
 */
export class ParticipantMessagesReader {
  constructor(private readonly dependencies: Readonly<{
    records: RunRecordsSource;
    scope: Pick<MessageViewScope, "participantFilter">;
    /** The view's open subtree (its rows on this node), taken once at the read's start (ARCH-REV-048). */
    delegatedRunAgents: Pick<DelegatedRunAgentsReader, "prepare" | "openRunsBelow">;
    identities: Pick<CounterpartIdentities, "pastParticipants" | "of">;
  }>) {}

  async read(input: Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string; before: CollaborationParticipantMessagesCursor | null }>):
    Promise<CollaborationParticipantMessagesDto> {
    const view = createRootExecutionIdentity({ rootSubjectKind: input.rootKind, rootRunId: input.rootRunId });
    const records = await this.rootRecords(view);
    if (!records.isAgentOfTree(input.agentRunId)) {
      throw new Error(`AgentRun '${input.agentRunId}' is not a participant of ${input.rootKind} run '${input.rootRunId}'.`);
    }
    const counterpartOf = (message: CollaborationCommunicationMessage): string =>
      message.senderAgentRunId === input.agentRunId ? message.receiverAgentRunId : message.senderAgentRunId;
    const own = records.messages.filter((message) => message.senderAgentRunId === input.agentRunId || message.receiverAgentRunId === input.agentRunId);
    const outsideTree = new Set(own.map(counterpartOf).filter((id) => !records.isAgentOfTree(id)));
    const past = outsideTree.size === 0 ? [] : await this.dependencies.identities.pastParticipants(view, outsideTree);
    const pastIds = new Set(past.map((agent) => agent.agentRunId));
    const listed = own.filter(this.dependencies.scope.participantFilter({ view, participantAgentRunId: input.agentRunId,
      isAgentOfTree: records.isAgentOfTree, isPastParticipant: (id) => pastIds.has(id) })).sort(participantMessageOrder);
    const before = input.before;
    const after = before ? listed.filter((message) => participantMessageOrder(before, message) < 0) : listed;
    const page = after.slice(0, COLLABORATION_PARTICIPANT_MESSAGES_PAGE_SIZE);
    // The newest line's record of each other agent (`listed` is newest first).
    const lineRecords = new Map<string, MessageCounterpart>();
    for (const message of listed) {
      if (message.counterpart && !lineRecords.has(counterpartOf(message))) lineRecords.set(counterpartOf(message), message.counterpart);
    }
    const counterparts = await this.dependencies.identities.of({
      agentRunIds: page.map(counterpartOf).filter((id) => !records.isAgentOfTree(id)), past,
      recordOf: (agentRunId) => lineRecords.get(agentRunId) ?? null,
    });
    return collaborationParticipantMessagesDtoSchema.parse({
      messages: page.map((message) => ({
        messageId: message.messageId, senderAgentRunId: message.senderAgentRunId, receiverAgentRunId: message.receiverAgentRunId,
        content: message.content, messageType: message.messageType, referenceFiles: [...message.referenceFiles], createdAt: message.createdAt,
      })),
      counterparts,
      hasMore: after.length > page.length,
    });
  }

  /**
   * The records of the view of run X (SR-072, SR-074): X's own log composed with the own log of every local run of its open
   * subtree (`composeRunViewMessages`), the set taken once, at the read's start (ARCH-REV-048).
   */
  private async rootRecords(view: RootExecutionIdentity): Promise<RunViewMessages> {
    const readBelow = async (ref: TaskExecutionReference) => {
      const run = runIdentityOf(ref);
      const records = await this.dependencies.records.read(run.rootSubjectKind, run.rootRunId)
        .catch((error: unknown) => error instanceof Error ? error : new Error(String(error)));
      return { run: run.rootRunId, records };
    };
    await this.dependencies.delegatedRunAgents.prepare(view);
    const [own, runs] = await Promise.all([this.dependencies.records.read(view.rootSubjectKind, view.rootRunId),
      Promise.all(this.dependencies.delegatedRunAgents.openRunsBelow(view).map(readBelow))]);
    return composeRunViewMessages({ own, below: runs });
  }
}

let processReader: ParticipantMessagesReader | null = null;

/** The composition root sets the process reader it created (step 8), before the server listens; the returned function releases it. */
export const setProcessParticipantMessagesReader = (reader: ParticipantMessagesReader): (() => void) => {
  processReader = reader;
  return () => { if (processReader === reader) processReader = null; };
};

/** The process reader, for the GraphQL resolver; a process that serves the query composes it, so a missing one throws. */
export const getParticipantMessagesReader = (): ParticipantMessagesReader => {
  if (!processReader) throw new Error("The participant messages reader is created by the composition root.");
  return processReader;
};
