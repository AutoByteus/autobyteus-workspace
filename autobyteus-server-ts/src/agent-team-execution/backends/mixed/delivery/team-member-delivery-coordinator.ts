import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { buildTeamCommunicationMessageId } from "../../../../services/team-communication/team-communication-identity.js";
import type {
  InterAgentMessageDeliveryEndpoint,
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../../domain/inter-agent-message-delivery.js";
import {
  TeamRunEventSourceType,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../domain/team-run-event.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import {
  buildInterAgentMessageReferenceFileEntries,
  buildRecipientVisibleInterAgentMessageContent,
} from "../../../services/inter-agent-message-runtime-builders.js";
import {
  buildTeamMemberInputDedupeKey,
  buildTeamMemberInputMessageId,
} from "../../../services/team-member-input-event-builder.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import type { PersistentMemberRegistryAccess } from "../members/mixed-persistent-member-registry.js";
import type { MixedTeamEventPublish, MixedTeamStatusChange } from "../members/mixed-team-member-handle.js";
import { buildTeamCommunicationAddressForParticipant } from "./team-communication-address-builder.js";

export type LogicalMessageDeliveryRecipient = {
  memberContext: MixedTeamMemberContext;
  endpoint: InterAgentMessageDeliveryEndpoint;
  targetAgentRunId: string;
};

export class TeamMemberDeliveryCoordinator {
  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    memberRegistry: PersistentMemberRegistryAccess;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
  }) {}

  async deliver(
    intent: InterAgentMessageDeliveryIntent,
    recipient: LogicalMessageDeliveryRecipient,
  ): Promise<AgentOperationResult> {
    const request = this.normalizeRequest(intent, recipient);
    const payload = this.buildCommunicationPayload(request);
    const tracedRequest = this.attachRecipientInputTrace(request, payload);
    const result = await this.options.memberRegistry.getOrCreate(recipient.memberContext)
      .deliverInterMemberMessage(
        tracedRequest,
        () => this.publishCommunicationPayload(tracedRequest, payload),
      );
    this.options.notifyStatusChange();
    return {
      ...result,
      memberRunId: tracedRequest.recipient.participant.memberRunId,
      memberName: tracedRequest.recipient.participant.memberName,
    };
  }

  private normalizeRequest(
    intent: InterAgentMessageDeliveryIntent,
    recipient: LogicalMessageDeliveryRecipient,
  ): ResolvedInterAgentMessageDeliveryRequest {
    const senderAddress = intent.senderAddress ?? buildTeamCommunicationAddressForParticipant({
      participant: intent.sender.participant,
    });
    const receiverAddress = buildTeamCommunicationAddressForParticipant({
      participant: recipient.endpoint.participant,
    });
    return {
      ...intent,
      senderAddress,
      recipient: recipient.endpoint,
      receiverAddress,
      resolvedTargetKind: "logical_member",
      targetAgentRunId: recipient.targetAgentRunId,
    };
  }

  private attachRecipientInputTrace(
    request: ResolvedInterAgentMessageDeliveryRequest,
    payload: TeamRunCommunicationEventPayload,
  ): ResolvedInterAgentMessageDeliveryRequest {
    const recipient = request.recipient.participant;
    const messageId = request.recipientInputMessageId?.trim() || buildTeamMemberInputMessageId({
      teamRunId: request.teamRunId,
      memberRunId: recipient.memberRunId,
      memberRouteKey: recipient.memberRouteKey,
      content: buildRecipientVisibleInterAgentMessageContent(request),
      receivedAt: payload.createdAt,
      parentCommunicationMessageId: payload.messageId,
    });
    return {
      ...request,
      parentCommunicationMessageId: payload.messageId,
      recipientInputMessageId: messageId,
      recipientInputDedupeKey: request.recipientInputDedupeKey?.trim() || buildTeamMemberInputDedupeKey({
        teamRunId: request.teamRunId,
        memberRouteKey: recipient.memberRouteKey,
        messageId,
      }),
    };
  }

  private buildCommunicationPayload(
    request: ResolvedInterAgentMessageDeliveryRequest,
  ): TeamRunCommunicationEventPayload {
    const createdAt = new Date().toISOString();
    const messageType = request.messageType?.trim() || "agent_message";
    const messageId = buildTeamCommunicationMessageId({
      teamRunId: request.teamRunId,
      senderAddress: request.senderAddress,
      receiverAddress: request.receiverAddress,
      messageType,
      content: request.content,
      createdAt,
    });
    return {
      messageId,
      teamRunId: request.teamRunId,
      senderAddress: request.senderAddress,
      receiverAddress: request.receiverAddress,
      content: request.content,
      messageType,
      referenceFiles: buildInterAgentMessageReferenceFileEntries({
        teamRunId: request.teamRunId,
        messageId,
        referenceFiles: request.referenceFiles ?? [],
        timestamp: createdAt,
      }),
      createdAt,
    };
  }

  private publishCommunicationPayload(
    request: ResolvedInterAgentMessageDeliveryRequest,
    payload: TeamRunCommunicationEventPayload,
  ): void {
    this.options.publish({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: this.options.teamContext.runId,
      sourcePath: request.sender.participant.memberPath,
      data: payload,
    } satisfies TeamRunEvent);
  }
}
