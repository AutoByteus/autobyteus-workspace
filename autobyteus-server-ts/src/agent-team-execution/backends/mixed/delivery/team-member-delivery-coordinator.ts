import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
  type ResolvedInterAgentMessageDeliveryRequest,
} from "../../../domain/inter-agent-message-delivery.js";
import {
  TeamRunEventSourceType,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../domain/team-run-event.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import { getTaskAgentDirectory } from "../../../task-delegation/task-agent-directory.js";
import { buildTeamCommunicationMessageId } from "../../../../services/team-communication/team-communication-identity.js";
import {
  buildInterAgentMessageReferenceFileEntries,
  buildRecipientVisibleInterAgentMessageContent,
} from "../../../services/inter-agent-message-runtime-builders.js";
import {
  buildTeamMemberInputDedupeKey,
  buildTeamMemberInputMessageId,
} from "../../../services/team-member-input-event-builder.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import type { MixedTeamMemberRegistry } from "../members/mixed-team-member-registry.js";
import type { MixedTeamEventPublish, MixedTeamStatusChange } from "../members/mixed-team-member-handle.js";
import {
  TeamMessageRecipientResolver,
  type ResolvedTeamMessageRecipient,
} from "./team-message-recipient-resolver.js";
import { normalizeMixedParentBoundaryDeliveryIntent } from "../mixed-parent-boundary-delivery-intent.js";

const isOperationResult = (
  value: MixedTeamMemberContext | AgentOperationResult | ResolvedTeamMessageRecipient,
): value is AgentOperationResult => "accepted" in value;

export class TeamMemberDeliveryCoordinator {
  private readonly resolver: TeamMessageRecipientResolver;

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    memberRegistry: MixedTeamMemberRegistry;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
  }) {
    this.resolver = new TeamMessageRecipientResolver({
      teamContext: options.teamContext,
      memberRegistry: options.memberRegistry,
      taskAgentDirectory: getTaskAgentDirectory(options.teamContext.runId),
    });
  }

  async deliver(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    const resolvedRecipient = this.resolver.resolve(intent);
    if (isOperationResult(resolvedRecipient)) {
      return resolvedRecipient;
    }
    if (resolvedRecipient.targetKind === "parent_boundary") {
      return this.deliverToParentBoundary(intent);
    }

    const senderContext = this.resolveSenderContext(intent);
    const normalizedRequest = this.normalizeDeliveryRequest(
      intent,
      senderContext,
      resolvedRecipient,
    );
    const communicationPayload = this.buildCommunicationPayload(normalizedRequest);
    const tracedRequest = this.attachRecipientInputTrace(normalizedRequest, communicationPayload);

    const result = resolvedRecipient.targetKind === "task_agent_run"
      ? await this.options.memberRegistry.deliverInterAgentMessageToTaskAgent(
          resolvedRecipient.logicalMemberRouteKey,
          resolvedRecipient.targetAgentRunId,
          tracedRequest,
          () => this.publishCommunicationPayload(tracedRequest, communicationPayload),
        )
      : await this.options.memberRegistry.getOrCreate(resolvedRecipient.memberContext)
          .deliverInterMemberMessage(
            tracedRequest,
            () => this.publishCommunicationPayload(tracedRequest, communicationPayload),
          );
    this.options.notifyStatusChange();
    return {
      ...result,
      memberRunId: tracedRequest.recipient.participant.memberRunId,
      memberName: tracedRequest.recipient.participant.memberName,
    };
  }

  private normalizeDeliveryRequest(
    intent: InterAgentMessageDeliveryIntent,
    senderContext: MixedTeamMemberContext | null,
    resolvedRecipient: Exclude<ResolvedTeamMessageRecipient, { targetKind: "parent_boundary" }>,
  ): ResolvedInterAgentMessageDeliveryRequest {
    const senderParticipant = this.applyRuntimeParticipantDetails(
      intent.sender.participant,
      senderContext,
    );
    return {
      ...intent,
      sender: buildDeliveryEndpointForParticipant(senderParticipant, intent.sender.selector),
      recipient: resolvedRecipient.endpoint,
      resolvedTargetKind: resolvedRecipient.targetKind,
      targetAgentRunId: resolvedRecipient.targetAgentRunId,
      taskId: resolvedRecipient.targetKind === "task_agent_run" ? resolvedRecipient.taskId : null,
    };
  }

  private attachRecipientInputTrace(
    request: ResolvedInterAgentMessageDeliveryRequest,
    communicationPayload: TeamRunCommunicationEventPayload,
  ): ResolvedInterAgentMessageDeliveryRequest {
    const recipient = request.recipient.participant;
    const messageId = request.recipientInputMessageId?.trim() || buildTeamMemberInputMessageId({
      teamRunId: request.teamRunId,
      memberRunId: recipient.memberRunId,
      memberRouteKey: recipient.memberRouteKey,
      content: buildRecipientVisibleInterAgentMessageContent(request),
      receivedAt: communicationPayload.createdAt,
      parentCommunicationMessageId: communicationPayload.messageId,
    });
    return {
      ...request,
      parentCommunicationMessageId: communicationPayload.messageId,
      recipientInputMessageId: messageId,
      recipientInputDedupeKey:
        request.recipientInputDedupeKey?.trim() ||
        buildTeamMemberInputDedupeKey({
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
    const sender = request.sender.participant;
    const recipient = request.recipient.participant;
    const messageId = buildTeamCommunicationMessageId({
      teamRunId: request.teamRunId,
      senderRunId: sender.memberRunId,
      receiverRunId: recipient.memberRunId,
      messageType,
      content: request.content,
      createdAt,
    });
    const referenceFiles = Array.isArray(request.referenceFiles) ? request.referenceFiles : [];
    return {
      messageId,
      teamRunId: request.teamRunId,
      sender,
      receiver: recipient,
      content: request.content,
      messageType,
      referenceFiles: buildInterAgentMessageReferenceFileEntries({
        teamRunId: request.teamRunId,
        messageId,
        referenceFiles,
        timestamp: createdAt,
      }),
      createdAt,
    };
  }

  private publishCommunicationPayload(
    request: ResolvedInterAgentMessageDeliveryRequest,
    communicationPayload: TeamRunCommunicationEventPayload,
  ): void {
    this.options.publish({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: this.options.teamContext.runId,
      sourcePath: request.sender.participant.memberPath,
      data: communicationPayload,
    } satisfies TeamRunEvent);
  }

  private resolveSenderContext(request: InterAgentMessageDeliveryIntent): MixedTeamMemberContext | null {
    const runtimeContext = this.options.teamContext.runtimeContext;
    if (request.sender.selector) {
      const resolved = this.options.memberRegistry.resolveContext(request.sender.selector);
      if (!isOperationResult(resolved)) {
        return resolved;
      }
    }
    const taskAgentSender = this.options.memberRegistry.resolveTaskAgentLogicalContext(
      request.sender.participant.memberRunId,
    );
    if (taskAgentSender) {
      return taskAgentSender;
    }
    return runtimeContext.memberContexts.find(
      (memberContext) =>
        memberContext.memberRunId === request.sender.participant.memberRunId ||
        memberContext.getPlatformAgentRunId() === request.sender.participant.memberRunId ||
        memberContext.memberRouteKey === request.sender.participant.memberRouteKey,
    ) ?? null;
  }

  private deliverToParentBoundary(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult> {
    const parentBoundary = this.options.teamContext.runtimeContext.parentBoundary;
    if (!parentBoundary) {
      return Promise.resolve({
        accepted: false,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: "Parent team boundary is not reachable from this team run.",
      });
    }
    return parentBoundary.deliverInterAgentMessage(
      normalizeMixedParentBoundaryDeliveryIntent({
        intent,
        parentBoundary,
      }),
    );
  }

  private applyRuntimeParticipantDetails(
    participant: InterAgentMessageParticipant,
    context: MixedTeamMemberContext | null,
  ): InterAgentMessageParticipant {
    if (!context) {
      return participant;
    }
    return {
      ...participant,
      memberKind: participant.memberKind ?? context.memberKind,
      memberName: participant.memberName || context.memberName,
      memberPath: participant.memberPath.length > 0 ? participant.memberPath : context.memberPath,
      memberRouteKey: participant.memberRouteKey || context.memberRouteKey,
      memberRunId: participant.memberRunId || context.memberRunId,
      platformRunId: context.getPlatformAgentRunId(),
      teamDefinitionId: context.memberKind === "agent_team" ? context.teamDefinitionId : participant.teamDefinitionId ?? null,
    };
  }
}
