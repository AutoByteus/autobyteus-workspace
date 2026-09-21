import type { RootCommunicationAdapter } from "../../agent-collaboration/execution/communication/root-communication-adapter.js";
import { createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";
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
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-v1-types.js";

export type TeamCommunicationAdapterOptions = Readonly<{
  rootTeamRunId: string;
  initial: TeamCommunicationMessagesSnapshot;
  isCurrentAgent: RootCommunicationAdapter["isCurrentAgent"];
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
  async commitAppend(input: Parameters<RootCommunicationAdapter["commitAppend"]>[0]) {
    const plan = createTeamCommunicationMessageAppendPlan({
      rootTeamRunId: this.options.rootTeamRunId,
      message: input.message,
      inputMessage: input.inputMessage,
      reservation: input.reservation,
      isAccepting: this.isAccepting,
      getCurrent: () => this.envelope(input.getCurrentMessages()),
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

  private envelope(messages: readonly CollaborationCommunicationMessageV1[]): TeamCommunicationMessagesSnapshot {
    return Object.freeze({ schemaVersion: 1, rootTeamRunId: this.options.rootTeamRunId, messages });
  }
}
