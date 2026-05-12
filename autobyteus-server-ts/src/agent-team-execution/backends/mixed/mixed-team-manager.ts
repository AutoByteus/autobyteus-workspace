import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import {
  TeamRunEventSourceType,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunStatusUpdateData,
} from "../../domain/team-run-event.js";
import type { TeamMemberSelector } from "../../domain/team-run-member-identity.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunContext, type MixedTeamMemberContext } from "./mixed-team-run-context.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import { MixedTeamMemberRegistry } from "./members/mixed-team-member-registry.js";
import { buildTeamCommunicationMessageId } from "../../../services/team-communication/team-communication-identity.js";
import { buildInterAgentMessageReferenceFileEntries } from "../../services/inter-agent-message-runtime-builders.js";

const buildRunNotFoundResult = (teamRunId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${teamRunId}' is not active.`,
});

const isOperationResult = (
  value: MixedTeamMemberContext | AgentOperationResult,
): value is AgentOperationResult => "accepted" in value;

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
    const senderContext = this.resolveSenderContext(request);
    const resolvedRecipient = this.memberRegistry.resolveContext(request.recipientSelector);
    if (isOperationResult(resolvedRecipient)) {
      return resolvedRecipient;
    }
    const normalizedRequest = this.normalizeDeliveryRequest(request, senderContext, resolvedRecipient);
    const communicationPayload = this.buildCommunicationPayload(normalizedRequest, senderContext, resolvedRecipient);
    this.publish({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: teamContext.runId,
      sourcePath: senderContext?.memberPath ?? [],
      data: communicationPayload,
    });
    const result = await this.memberRegistry.getOrCreate(resolvedRecipient).deliverInterMemberMessage(normalizedRequest);
    this.publishTeamStatusIfChanged();
    return { ...result, memberRunId: resolvedRecipient.memberRunId, memberName: resolvedRecipient.memberName };
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

  private normalizeDeliveryRequest(
    request: InterAgentMessageDeliveryRequest,
    senderContext: MixedTeamMemberContext | null,
    recipientContext: MixedTeamMemberContext,
  ): InterAgentMessageDeliveryRequest {
    return {
      ...request,
      senderMemberName: request.senderMemberName ?? senderContext?.memberName ?? null,
      senderPath: request.senderPath ?? senderContext?.memberPath ?? null,
      senderRouteKey: request.senderRouteKey ?? senderContext?.memberRouteKey ?? null,
      recipientSelector: request.recipientSelector,
      recipientMemberName: request.recipientMemberName ?? recipientContext.memberName,
      recipientPath: request.recipientPath ?? recipientContext.memberPath,
      recipientRouteKey: request.recipientRouteKey ?? recipientContext.memberRouteKey,
    };
  }

  private buildCommunicationPayload(
    request: InterAgentMessageDeliveryRequest,
    senderContext: MixedTeamMemberContext | null,
    recipientContext: MixedTeamMemberContext,
  ): TeamRunCommunicationEventPayload {
    const createdAt = new Date().toISOString();
    const messageType = request.messageType?.trim() || "agent_message";
    const senderRunId = senderContext?.memberRunId ?? request.senderRunId;
    const messageId = buildTeamCommunicationMessageId({
      teamRunId: request.teamRunId,
      senderRunId,
      receiverRunId: recipientContext.memberRunId,
      messageType,
      content: request.content,
      createdAt,
    });
    const referenceFiles = Array.isArray(request.referenceFiles) ? request.referenceFiles : [];
    return {
      messageId,
      teamRunId: request.teamRunId,
      sender: {
        memberKind: senderContext?.memberKind ?? "agent",
        memberName: senderContext?.memberName ?? request.senderMemberName ?? request.senderRunId,
        memberPath: senderContext?.memberPath ?? request.senderPath ?? [],
        memberRouteKey: senderContext?.memberRouteKey ?? request.senderRouteKey ?? request.senderRunId,
        memberRunId: senderRunId,
        platformRunId: senderContext?.getPlatformAgentRunId() ?? null,
        teamDefinitionId: senderContext?.memberKind === "agent_team" ? senderContext.teamDefinitionId : null,
      },
      receiver: {
        memberKind: recipientContext.memberKind,
        memberName: recipientContext.memberName,
        memberPath: recipientContext.memberPath,
        memberRouteKey: recipientContext.memberRouteKey,
        memberRunId: recipientContext.memberRunId,
        platformRunId: recipientContext.getPlatformAgentRunId(),
        teamDefinitionId: recipientContext.memberKind === "agent_team" ? recipientContext.teamDefinitionId : null,
      },
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
    if (request.senderSelector) {
      const resolved = this.memberRegistry.resolveContext(request.senderSelector);
      if (!("accepted" in resolved)) {
        return resolved;
      }
    }
    return runtimeContext.memberContexts.find(
      (memberContext) =>
        memberContext.memberRunId === request.senderRunId ||
        memberContext.getPlatformAgentRunId() === request.senderRunId ||
        memberContext.memberRouteKey === request.senderRouteKey,
    ) ?? null;
  }

  private publishTeamStatusIfChanged(): void {
    if (!this.teamContext) {
      return;
    }
    const nextStatus = this.deriveTeamStatus();
    if (nextStatus === this.lastTeamStatus) {
      return;
    }
    this.publish({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: this.teamContext.runId,
      sourcePath: [],
      data: {
        new_status: nextStatus,
        ...(this.lastTeamStatus ? { old_status: this.lastTeamStatus } : {}),
      } satisfies TeamRunStatusUpdateData,
    });
    this.lastTeamStatus = nextStatus;
  }

  private deriveTeamStatus(): string {
    let hasActiveMember = false;
    let hasBusyMember = false;
    for (const handle of this.memberRegistry.listHandles()) {
      if (!handle.isActive()) {
        continue;
      }
      hasActiveMember = true;
      const status = handle.getStatus()?.trim().toUpperCase() ?? null;
      if (status === "ERROR") {
        return "ERROR";
      }
      if (status && status !== "IDLE") {
        hasBusyMember = true;
      }
    }
    if (hasBusyMember) {
      return "PROCESSING";
    }
    if (hasActiveMember || this.teamContext) {
      return "IDLE";
    }
    return "IDLE";
  }

  private publish(event: TeamRunEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
