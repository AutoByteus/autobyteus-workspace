import { createHash } from "node:crypto";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryIntent, ResolvedInterAgentMessageDeliveryRequest } from "../../agent-team-execution/domain/inter-agent-message-delivery.js";
import { buildDeliveryEndpointForParticipant } from "../../agent-team-execution/domain/inter-agent-message-delivery.js";
import type { TeamMemberExecutionIdentity } from "../../agent-team-execution/domain/team-member-execution-identity.js";
import type { TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  TeamRunPersistenceFailStoppedError,
  type PreparedTeamMessageAppend,
  type TeamMessageCommitResult,
} from "../../agent-team-execution/services/team-run-persistence-contract.js";
import { buildInterAgentDeliveryInputMessage } from "../../agent-team-execution/services/inter-agent-message-runtime-builders.js";
import { createTeamCommunicationMessageAppendPlan } from "./team-communication-message-append-plan.js";
import { validateTeamCommunicationMessagesV1Payload } from "./team-communication-v1-schema.js";
import type { TeamCommunicationMessageV1, TeamCommunicationMessagesSnapshot } from "./team-communication-v1-types.js";

const messageId = (input: {
  rootTeamRunId: string;
  senderAgentRunId: string;
  receiverAgentRunId: string;
  content: string;
  createdAt: string;
}) => `teammsg_${createHash("sha256").update(Object.values(input).join("\0")).digest("base64url").slice(0, 32)}`;

/** Root-owned accepted Team-message history and one-shot append-plan owner. */
export class TeamCommunicationService {
  private current: TeamCommunicationMessagesSnapshot;
  private accepting = true;

  constructor(private readonly options: {
    rootTeamRunId: string;
    initial: TeamCommunicationMessagesSnapshot;
    isCurrentAgent(identity: TeamMemberExecutionIdentity): boolean;
    requireContainingTeamRun(agentRunId: string): Promise<TeamRun>;
    commit(plan: PreparedTeamMessageAppend): Promise<TeamMessageCommitResult>;
    publish(event: TeamRunEvent): void;
    replaceSnapshot(messages: TeamCommunicationMessagesSnapshot): void;
  }) {
    this.current = validateTeamCommunicationMessagesV1Payload(options.initial, options.rootTeamRunId);
  }

  getSnapshot(): TeamCommunicationMessagesSnapshot { return this.current; }
  closeAdmission(): void { this.accepting = false; }

  async deliver(input: {
    intent: InterAgentMessageDeliveryIntent;
    receiverIdentity: TeamMemberExecutionIdentity;
    receiverDisplayName: string;
  }): Promise<AgentOperationResult> {
    const { intent, receiverIdentity } = input;
    const senderIdentity = intent.sender.participant.identity;
    if (!this.accepting || intent.rootTeamRunId !== this.options.rootTeamRunId) {
      return { accepted: false, code: "TEAM_RUN_NOT_ACCEPTING_MESSAGES", message: `Root TeamRun '${this.options.rootTeamRunId}' is not accepting messages.` };
    }
    if (!this.options.isCurrentAgent(senderIdentity) || !this.options.isCurrentAgent(receiverIdentity)) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: "Sender and receiver must be exact live executions in the same root TeamRun." };
    }
    if (senderIdentity.agentRunId === receiverIdentity.agentRunId) {
      return { accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "An AgentRun cannot send an ordinary Team message to itself." };
    }
    const createdAt = new Date().toISOString();
    const message: TeamCommunicationMessageV1 = Object.freeze({
      messageId: messageId({
        rootTeamRunId: this.options.rootTeamRunId,
        senderAgentRunId: senderIdentity.agentRunId,
        receiverAgentRunId: receiverIdentity.agentRunId,
        content: intent.content,
        createdAt,
      }),
      senderAgentRunId: senderIdentity.agentRunId,
      receiverAgentRunId: receiverIdentity.agentRunId,
      content: intent.content,
      messageType: intent.messageType?.trim() || "agent_message",
      referenceFiles: Object.freeze([...(intent.referenceFiles ?? [])]),
      createdAt,
    });
    const request: ResolvedInterAgentMessageDeliveryRequest = Object.freeze({
      ...intent,
      recipient: buildDeliveryEndpointForParticipant(Object.freeze({
        kind: "agent",
        identity: receiverIdentity,
        displayName: input.receiverDisplayName,
      })),
      senderIdentity,
      receiverIdentity,
      parentCommunicationMessageId: message.messageId,
    });
    const receiverRun = await this.options.requireContainingTeamRun(receiverIdentity.agentRunId);
    const inputMessage = buildInterAgentDeliveryInputMessage(request);
    const reservationResult = await receiverRun.reserveDirectAgentInput(receiverIdentity.agentRunId, inputMessage);
    if (!reservationResult.reserved) return { accepted: false, code: reservationResult.code, message: reservationResult.message };
    const plan = createTeamCommunicationMessageAppendPlan({
      rootTeamRunId: this.options.rootTeamRunId,
      message,
      inputMessage,
      reservation: reservationResult.reservation,
      isAccepting: () => this.accepting,
      getCurrent: () => this.current,
      replaceCurrent: (messages) => {
        this.current = messages;
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
    if (result.outcome === "finalization_indeterminate") {
      plan.disposeAfterRootFailStop();
    }
    return this.mapCommitResult(result, receiverIdentity, input.receiverDisplayName);
  }

  private mapCommitResult(
    result: TeamMessageCommitResult,
    receiver: TeamMemberExecutionIdentity,
    displayName: string,
  ): AgentOperationResult {
    if (result.outcome === "committed") return { accepted: true, agentRunId: receiver.agentRunId, displayName };
    if (result.outcome === "conflict") return { accepted: false, code: result.code, message: result.message };
    if (result.outcome === "not_committed") return { accepted: false, code: "TEAM_MESSAGE_HISTORY_COMMIT_FAILED", message: result.cause.message };
    throw new Error(`Team message finalization is indeterminate at '${result.stage}'.`);
  }
}
