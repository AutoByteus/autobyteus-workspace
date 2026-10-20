import type { RootCommunicationAdapter } from "../../agent-collaboration/execution/communication/root-communication-adapter.js";
import { createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { buildDeliveryEndpointForParticipant } from "../../agent-team-execution/domain/inter-agent-message-delivery.js";
import type { TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  TeamRunPersistenceFailStoppedError,
  type PreparedTeamMessageAppend,
  type TeamMessageCommitResult,
} from "../../agent-team-execution/services/team-run-persistence-contract.js";
import { buildInterAgentDeliveryInputMessage } from "../../agent-team-execution/services/inter-agent-message-runtime-builders.js";
import { createTeamCommunicationMessageAppendPlan } from "./team-communication-message-append-plan.js";
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-messages-file.js";
import { messageLogOwners, type MessageLogOwner } from "../../run-history/store/task-agent-message-logs.js";

export type TeamCommunicationAdapterOptions = Readonly<{
  rootTeamRunId: string;
  initial: TeamCommunicationMessagesSnapshot;
  isCurrentAgent: RootCommunicationAdapter["isCurrentAgent"];
  /** The log an endpoint's messages belong to (its memory placement, D-4). */
  messageLogOwnerOf(agentRunId: string): MessageLogOwner;
  assertDeliveryAllowed: RootCommunicationAdapter["assertDeliveryAllowed"];
  requireContainingTeamRun(agentRunId: string): Promise<TeamRun>;
  commit(plan: PreparedTeamMessageAppend): Promise<TeamMessageCommitResult>;
  publish(event: TeamRunEvent): void;
  replaceSnapshot(messages: TeamCommunicationMessagesSnapshot): void;
}>;

/** Team-private persistence/event/input adapter for RootCommunicationEngine. */
export class TeamCommunicationAdapter implements RootCommunicationAdapter {
  readonly root;
  readonly initialMessages;

  constructor(
    private readonly options: TeamCommunicationAdapterOptions,
    private readonly isAccepting: () => boolean,
  ) {
    this.root = createTeamRootExecutionIdentity(options.rootTeamRunId);
    this.initialMessages = options.initial.messages;
  }
  isOpen(): boolean { return this.isAccepting(); }
  assertDeliveryAllowed(...runIds: Parameters<RootCommunicationAdapter["assertDeliveryAllowed"]>): void {
    this.options.assertDeliveryAllowed(...runIds);
  }
  isCurrentAgent(identity: Parameters<RootCommunicationAdapter["isCurrentAgent"]>[0]): boolean {
    return this.options.isCurrentAgent(identity);
  }
  buildRecipientInput(input: Parameters<RootCommunicationAdapter["buildRecipientInput"]>[0]) {
    return buildInterAgentDeliveryInputMessage({
      rootTeamRunId: this.options.rootTeamRunId,
      recipientAddress: input.delivery.receiverIdentity.memberAddress,
      sender: buildDeliveryEndpointForParticipant(Object.freeze({
        kind: "agent",
        identity: input.delivery.senderIdentity,
        displayName: input.delivery.senderDisplayName,
      })),
      recipient: buildDeliveryEndpointForParticipant(Object.freeze({
        kind: "agent",
        identity: input.delivery.receiverIdentity,
        displayName: input.delivery.receiverDisplayName,
      })),
      senderAddress: input.delivery.senderAddress,
      senderIdentity: input.delivery.senderIdentity,
      receiverIdentity: input.delivery.receiverIdentity,
      content: input.message.content,
      messageType: input.message.messageType,
      referenceFiles: [...input.message.referenceFiles],
      parentCommunicationMessageId: input.message.messageId,
    });
  }
  async reserveRecipientInput(agentRunId: string, message: ReturnType<TeamCommunicationAdapter["buildRecipientInput"]>): Promise<AgentRunInputReservationResult> {
    const receiverRun = await this.options.requireContainingTeamRun(agentRunId);
    return receiverRun.reserveDirectAgentInput(agentRunId, message);
  }
  commitAppend(input: Parameters<RootCommunicationAdapter["commitAppend"]>[0]) {
    return this.commitPlan(input, { inputMessage: input.inputMessage, reservation: input.reservation });
  }

  commitSentToRemote(input: Parameters<RootCommunicationAdapter["commitSentToRemote"]>[0]) {
    return this.commitPlan(input, null);
  }

  private async commitPlan(
    input: Parameters<RootCommunicationAdapter["commitSentToRemote"]>[0],
    receiver: Parameters<typeof createTeamCommunicationMessageAppendPlan>[0]["receiver"],
  ) {
    const plan = createTeamCommunicationMessageAppendPlan({
      rootTeamRunId: this.options.rootTeamRunId,
      message: input.message,
      receiver,
      isAccepting: this.isAccepting,
      getCurrent: () => this.envelope(input.getCurrentMessages()),
      resolveLogOwners: () => messageLogOwners(input.message, (agentRunId) => this.options.messageLogOwnerOf(agentRunId)),
      replaceCurrent: (messages) => {
        input.commitMessages(messages.messages);
        this.options.replaceSnapshot(messages);
      },
      publish: (event) => this.options.publish(event),
    });
    let result: TeamMessageCommitResult;
    try {
      result = await this.options.commit(plan);
    } catch (error) {
      if (error instanceof TeamRunPersistenceFailStoppedError) plan.disposeAfterRootFailStop();
      throw error;
    }
    if (result.outcome === "committed") return Object.freeze({ committed: true as const });
    if (result.outcome === "conflict") return Object.freeze({ committed: false as const, code: result.code, message: result.message });
    if (result.outcome === "not_committed") {
      return Object.freeze({ committed: false as const, code: "TEAM_MESSAGE_HISTORY_COMMIT_FAILED", message: result.cause.message });
    }
    plan.disposeAfterRootFailStop();
    throw new Error(`Team message finalization is indeterminate at '${result.stage}'.`);
  }

  private envelope(messages: readonly CollaborationCommunicationMessage[]): TeamCommunicationMessagesSnapshot {
    return Object.freeze({ schemaVersion: 1, rootTeamRunId: this.options.rootTeamRunId, messages });
  }
}
