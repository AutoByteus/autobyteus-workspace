import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import { deriveTeamApiStatus } from "../../domain/team-status-aggregation.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import {
  buildDeliveryEndpointForParticipant,
  buildTeamMemberAddress,
  type InterAgentMessageDeliveryRequest,
  type InterAgentMessageParticipant,
} from "../../domain/inter-agent-message-delivery.js";
import {
  TeamRunEventSourceType,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunStatusUpdateData,
} from "../../domain/team-run-event.js";
import type { TeamMemberSelector } from "../../domain/team-run-member-identity.js";
import { buildMemberRouteKeyFromPath, selectorFromMemberPath } from "../../domain/team-run-member-identity.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunContext, type MixedTeamMemberContext } from "./mixed-team-run-context.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import { MixedTeamMemberRegistry } from "./members/mixed-team-member-registry.js";
import { buildTeamCommunicationMessageId } from "../../../services/team-communication/team-communication-identity.js";
import {
  buildInterAgentMessageReferenceFileEntries,
  buildRecipientVisibleInterAgentMessageContent,
} from "../../services/inter-agent-message-runtime-builders.js";
import {
  buildTeamMemberInputDedupeKey,
  buildTeamMemberInputMessageId,
} from "../../services/team-member-input-event-builder.js";

const buildRunNotFoundResult = (teamRunId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${teamRunId}' is not active.`,
});

const isOperationResult = (
  value: MixedTeamMemberContext | AgentOperationResult,
): value is AgentOperationResult => "accepted" in value;

const pathStartsWith = (path: readonly string[], prefix: readonly string[]): boolean =>
  path.length >= prefix.length && prefix.every((segment, index) => path[index] === segment);

export class MixedTeamManager implements TeamManager {
  private teamContext: TeamRunContext<MixedTeamRunContext> | null;
  private readonly memberRegistry: MixedTeamMemberRegistry;
  private readonly eventListeners = new Set<TeamRunEventListener>();
  private lastTeamStatus: string | null = "INITIALIZING";

  constructor(
    context: TeamRunContext<MixedTeamRunContext>,
    options: {
      subTeamRunFactory?: MixedSubTeamRunFactory;
    } = {},
  ) {
    this.teamContext = context;
    const subTeamRunFactory = options.subTeamRunFactory ?? new MixedSubTeamRunFactory({
      buildContext: (config, teamRunId) => {
        throw new Error(`Mixed subteam run factory was not configured for '${teamRunId}' (${config.teamDefinitionId}).`);
      },
      createTeamManager: () => {
        throw new Error("Mixed subteam manager factory was not configured.");
      },
    });
    this.memberRegistry = new MixedTeamMemberRegistry({
      teamContext: context,
      subTeamRunFactory,
      publish: (event) => this.publish(event),
      notifyStatusChange: () => this.publishTeamStatusIfChanged(),
      deliverInterAgentMessage: (request) => this.deliverInterAgentMessage(request),
    });
  }

  hasActiveMembers(): boolean {
    return this.teamContext !== null;
  }

  getMemberStatusSnapshots(): AgentStatusPayload[] {
    const runtimeContext = this.teamContext?.runtimeContext ?? null;
    if (!runtimeContext) {
      return [];
    }

    return runtimeContext.memberContexts.map((memberContext) => {
      const handle = this.memberRegistry.listHandles().find(
        (candidate) => candidate.context.memberRouteKey === memberContext.memberRouteKey,
      ) ?? null;
      const snapshot = handle?.getStatusSnapshot() ?? {
        status: "offline" as const,
        can_interrupt: false,
      };
      return {
        ...snapshot,
        agent_id: memberContext.memberRunId,
        agent_name: memberContext.memberName,
      };
    });
  }

  getStatusSnapshot() {
    return {
      status: deriveTeamApiStatus({
        memberStatuses: this.getMemberStatusSnapshots(),
      }),
    };
  }

  async postMessage(
    message: AgentInputUserMessage,
    target: TeamMemberSelector,
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const resolved = this.memberRegistry.resolveContext(target);
    if (isOperationResult(resolved)) {
      return resolved;
    }
    const result = await this.memberRegistry.getOrCreate(resolved).postMessage(message);
    this.publishTeamStatusIfChanged();
    return result;
  }

  async deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult> {
    const teamContext = this.teamContext;
    if (!teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    if (request.teamRunId !== teamContext.runId) {
      return this.deliverToParentBoundary(request);
    }
    const senderContext = this.resolveSenderContext(request);
    const resolvedRecipient = this.memberRegistry.resolveContext(request.recipient.selector);
    if (isOperationResult(resolvedRecipient)) {
      return resolvedRecipient;
    }
    const normalizedRequest = this.normalizeDeliveryRequest(request, senderContext, resolvedRecipient);
    const communicationPayload = this.buildCommunicationPayload(normalizedRequest);
    const tracedRequest = this.attachRecipientInputTrace(
      normalizedRequest,
      communicationPayload,
    );
    this.publish({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: teamContext.runId,
      sourcePath: normalizedRequest.sender.participant.memberPath,
      data: communicationPayload,
    });
    const result = await this.memberRegistry.getOrCreate(resolvedRecipient).deliverInterMemberMessage(tracedRequest);
    this.publishTeamStatusIfChanged();
    return {
      ...result,
      memberRunId: tracedRequest.recipient.participant.memberRunId,
      memberName: tracedRequest.recipient.participant.memberName,
    };
  }

  async approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const resolved = this.memberRegistry.resolveContext(target);
    if (isOperationResult(resolved)) {
      return resolved;
    }
    return this.memberRegistry.getOrCreate(resolved).approveToolInvocation(target, invocationId, approved, reason ?? null);
  }

  async interrupt(): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    for (const handle of this.memberRegistry.listHandles()) {
      const result = await handle.interrupt();
      if (!result.accepted) {
        return result;
      }
    }
    this.publishTeamStatusIfChanged();
    return { accepted: true };
  }

  async terminate(): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    for (const handle of this.memberRegistry.listHandles()) {
      const result = await handle.terminate();
      if (!result.accepted) {
        return result;
      }
    }
    this.memberRegistry.dispose();
    this.teamContext = null;
    this.eventListeners.clear();
    this.lastTeamStatus = null;
    return { accepted: true };
  }

  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  private attachRecipientInputTrace(
    request: InterAgentMessageDeliveryRequest,
    communicationPayload: TeamRunCommunicationEventPayload,
  ): InterAgentMessageDeliveryRequest {
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

  private normalizeDeliveryRequest(
    request: InterAgentMessageDeliveryRequest,
    senderContext: MixedTeamMemberContext | null,
    recipientContext: MixedTeamMemberContext,
  ): InterAgentMessageDeliveryRequest {
    const senderParticipant = this.applyRuntimeParticipantDetails(
      request.sender.participant,
      senderContext,
    );
    const recipientParticipant = this.applyRuntimeParticipantDetails(
      request.recipient.participant,
      recipientContext,
    );
    return {
      ...request,
      sender: buildDeliveryEndpointForParticipant(senderParticipant, request.sender.selector),
      recipient: buildDeliveryEndpointForParticipant(recipientParticipant, request.recipient.selector),
    };
  }

  private buildCommunicationPayload(
    request: InterAgentMessageDeliveryRequest,
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

  private resolveSenderContext(request: InterAgentMessageDeliveryRequest): MixedTeamMemberContext | null {
    const runtimeContext = this.teamContext?.runtimeContext;
    if (!runtimeContext) {
      return null;
    }
    if (request.sender.selector) {
      const resolved = this.memberRegistry.resolveContext(request.sender.selector);
      if (!("accepted" in resolved)) {
        return resolved;
      }
    }
    return runtimeContext.memberContexts.find(
      (memberContext) =>
        memberContext.memberRunId === request.sender.participant.memberRunId ||
        memberContext.getPlatformAgentRunId() === request.sender.participant.memberRunId ||
        memberContext.memberRouteKey === request.sender.participant.memberRouteKey,
    ) ?? null;
  }

  private deliverToParentBoundary(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult> {
    const parentBoundary = this.teamContext?.runtimeContext.parentBoundary ?? null;
    if (!parentBoundary || request.teamRunId !== parentBoundary.parentTeamRunId) {
      return Promise.resolve({
        accepted: false,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: `Team run '${request.teamRunId}' is not reachable from this team boundary.`,
      });
    }

    return parentBoundary.deliverInterAgentMessage(
      this.normalizeParentBoundaryRequest(request),
    );
  }

  private normalizeParentBoundaryRequest(
    request: InterAgentMessageDeliveryRequest,
  ): InterAgentMessageDeliveryRequest {
    const parentBoundary = this.teamContext?.runtimeContext.parentBoundary;
    if (!parentBoundary) {
      return request;
    }
    const sender = request.sender.participant;
    const representedSubTeamPath = parentBoundary.representedSubTeam.memberPath;
    const senderIsAlreadyParentRooted =
      sender.address.teamRunId === parentBoundary.parentTeamRunId &&
      pathStartsWith(sender.memberPath, representedSubTeamPath);
    const nestedSenderPath = senderIsAlreadyParentRooted
      ? [...sender.memberPath]
      : [...representedSubTeamPath, ...sender.memberPath];
    const nestedSenderRouteKey = buildMemberRouteKeyFromPath(nestedSenderPath);
    const nestedSender: InterAgentMessageParticipant = {
      ...sender,
      memberPath: nestedSenderPath,
      memberRouteKey: nestedSenderRouteKey,
      address: buildTeamMemberAddress({
        teamRunId: parentBoundary.parentTeamRunId,
        memberPath: nestedSenderPath,
        memberRouteKey: nestedSenderRouteKey,
      }),
      representedSubTeam: parentBoundary.representedSubTeam,
    };
    return {
      ...request,
      teamRunId: parentBoundary.parentTeamRunId,
      sender: buildDeliveryEndpointForParticipant(
        nestedSender,
        selectorFromMemberPath(nestedSenderPath),
      ),
    };
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

  private publishTeamStatusIfChanged(): void {
    if (!this.teamContext) {
      return;
    }
    const nextStatus = this.getStatusSnapshot().status;
    if (nextStatus === this.lastTeamStatus) {
      return;
    }
    this.publish({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: this.teamContext.runId,
      sourcePath: [],
      data: {
        status: nextStatus,
      } satisfies TeamRunStatusUpdateData,
    });
    this.lastTeamStatus = nextStatus;
  }

  private publish(event: TeamRunEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
