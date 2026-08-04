import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { buildTeamCommunicationMessageId } from "../../../../services/team-communication/team-communication-identity.js";
import type { InterAgentMessageDeliveryEndpoint, InterAgentMessageDeliveryIntent, ResolvedInterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import { TeamRunEventSourceType, type TeamRunCommunicationEventPayload } from "../../../domain/team-run-event.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import { buildInterAgentMessageReferenceFileEntries, buildRecipientVisibleInterAgentMessageContent } from "../../../services/inter-agent-message-runtime-builders.js";
import { buildTeamMemberInputDedupeKey, buildTeamMemberInputMessageId } from "../../../services/team-member-input-event-builder.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import type { PersistentMemberRegistryAccess } from "../members/mixed-persistent-member-registry.js";
import type { MixedTeamEventPublish } from "../members/mixed-team-member-handle.js";

export type LogicalMessageDeliveryRecipient = Readonly<{
  memberContext: MixedTeamMemberContext;
  endpoint: InterAgentMessageDeliveryEndpoint;
  targetAgentRunId: string;
}>;

export class TeamMemberDeliveryCoordinator {
  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    memberRegistry: PersistentMemberRegistryAccess;
    publish: MixedTeamEventPublish;
  }) {}

  async deliver(intent: InterAgentMessageDeliveryIntent, recipient: LogicalMessageDeliveryRecipient): Promise<AgentOperationResult> {
    const request = this.normalize(intent, recipient);
    const payload = this.payload(request);
    const traced = this.trace(request, payload);
    const result = await this.options.memberRegistry.getOrCreate(recipient.memberContext)
      .deliverInterMemberMessage(traced, () => this.options.publish({
        eventSourceType: TeamRunEventSourceType.COMMUNICATION,
        teamRunId: intent.rootTeamRunId,
        executionAddress: traced.senderAddress,
        data: payload,
      }));
    return { ...result, agentRunId: recipient.targetAgentRunId, displayName: recipient.endpoint.participant.displayName };
  }

  private normalize(intent: InterAgentMessageDeliveryIntent, recipient: LogicalMessageDeliveryRecipient): ResolvedInterAgentMessageDeliveryRequest {
    return {
      ...intent,
      recipient: recipient.endpoint,
      senderAddress: intent.sender.participant.executionAddress,
      receiverAddress: recipient.endpoint.participant.executionAddress,
      resolvedTargetKind: "logical_member",
      targetAgentRunId: recipient.targetAgentRunId,
    };
  }

  private trace(request: ResolvedInterAgentMessageDeliveryRequest, payload: TeamRunCommunicationEventPayload): ResolvedInterAgentMessageDeliveryRequest {
    const content = buildRecipientVisibleInterAgentMessageContent(request);
    const messageId = request.recipientInputMessageId?.trim() || buildTeamMemberInputMessageId({
      teamRunId: request.rootTeamRunId,
      executionAddress: request.receiverAddress,
      content,
      receivedAt: payload.createdAt,
      parentCommunicationMessageId: payload.messageId,
    });
    return {
      ...request,
      parentCommunicationMessageId: payload.messageId,
      recipientInputMessageId: messageId,
      recipientInputDedupeKey: request.recipientInputDedupeKey?.trim() || buildTeamMemberInputDedupeKey({
        teamRunId: request.rootTeamRunId,
        executionAddress: request.receiverAddress,
        messageId,
      }),
    };
  }

  private payload(request: ResolvedInterAgentMessageDeliveryRequest): TeamRunCommunicationEventPayload {
    const createdAt = new Date().toISOString();
    const type = request.messageType?.trim() || "agent_message";
    const messageId = buildTeamCommunicationMessageId({
      teamRunId: request.rootTeamRunId,
      senderAddress: request.senderAddress,
      receiverAddress: request.receiverAddress,
      messageType: type,
      content: request.content,
      createdAt,
    });
    return {
      messageId,
      teamRunId: request.rootTeamRunId,
      senderAddress: request.senderAddress,
      receiverAddress: request.receiverAddress,
      content: request.content,
      messageType: type,
      referenceFiles: buildInterAgentMessageReferenceFileEntries({
        teamRunId: request.rootTeamRunId,
        messageId,
        referenceFiles: request.referenceFiles ?? [],
        timestamp: createdAt,
      }),
      createdAt,
    };
  }
}
