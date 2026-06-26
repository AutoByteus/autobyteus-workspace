import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import {
  buildDeliveryEndpointForParticipant,
  buildTeamMemberAddress,
  type InterAgentMessageDeliveryEndpoint,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
} from "../../../domain/inter-agent-message-delivery.js";
import type {
  AgentMemberTeamDescriptor,
  MemberTeamDescriptor,
  SubTeamRepresentativeDescriptor,
} from "../../../domain/member-team-context.js";
import type { TaskAgentDirectory } from "../../../task-delegation/task-agent-directory.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamRunMemberConfig } from "../../../domain/team-run-config.js";
import { selectorFromMemberPath } from "../../../domain/team-run-member-identity.js";
import { MemberCommunicationRosterBuilder } from "../../../services/member-communication-roster-builder.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import type { PersistentMemberRegistryAccess } from "../members/mixed-persistent-member-registry.js";
import { getMixedTaskAgentHandleRecoveryCache } from "../members/mixed-task-agent-handle-recovery-cache.js";

export type ResolvedTeamMessageRecipient =
  | {
      targetKind: "logical_member" | "agent_run";
      memberContext: MixedTeamMemberContext;
      endpoint: InterAgentMessageDeliveryEndpoint;
      targetAgentRunId: string;
    }
  | {
      targetKind: "task_agent_run";
      memberContext: MixedTeamMemberContext;
      endpoint: InterAgentMessageDeliveryEndpoint;
      logicalMemberRouteKey: string;
      targetAgentRunId: string;
      taskId: string;
    }
  | {
      targetKind: "parent_boundary";
    };

const isOperationResult = (
  value: MixedTeamMemberContext | AgentOperationResult,
): value is AgentOperationResult => "accepted" in value;

const targetNotFound = (target: string): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_NOT_FOUND",
  message: `Message target '${target}' was not found or is no longer reachable in this team run.`,
});

const buildParticipantFromContext = (
  teamRunId: string,
  context: MixedTeamMemberContext,
): InterAgentMessageParticipant => ({
  memberKind: context.memberKind,
  memberName: context.memberName,
  memberPath: [...context.memberPath],
  memberRouteKey: context.memberRouteKey,
  memberRunId: context.memberRunId,
  address: buildTeamMemberAddress({
    teamRunId,
    memberPath: context.memberPath,
    memberRouteKey: context.memberRouteKey,
  }),
  platformRunId: context.getPlatformAgentRunId(),
  teamDefinitionId: context.memberKind === "agent_team" ? context.teamDefinitionId : null,
});

export class TeamMessageRecipientResolver {
  private readonly rosterBuilder = new MemberCommunicationRosterBuilder();
  private readonly taskAgentRecoveryCache = getMixedTaskAgentHandleRecoveryCache();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    memberRegistry: PersistentMemberRegistryAccess;
    taskAgentDirectory: TaskAgentDirectory;
    resolveTaskAgentLogicalContext: (runId: string) => MixedTeamMemberContext | null;
  }) {}

  resolve(intent: InterAgentMessageDeliveryIntent): ResolvedTeamMessageRecipient | AgentOperationResult {
    if (intent.target.kind === "recipient_name") {
      return this.resolveByRecipientName(intent);
    }
    return this.resolveByTargetAgentRunId(intent);
  }

  private resolveByRecipientName(
    intent: InterAgentMessageDeliveryIntent,
  ): ResolvedTeamMessageRecipient | AgentOperationResult {
    const recipientName = intent.target.kind === "recipient_name"
      ? intent.target.recipientName.trim()
      : "";
    const senderContext = this.resolveSenderContext(intent);
    if (!senderContext || !recipientName) {
      return targetNotFound(recipientName);
    }

    const recipient = this.buildSenderRoster(senderContext).find(
      (candidate) => candidate.recipientName === recipientName,
    ) ?? null;
    if (!recipient) {
      return targetNotFound(recipientName);
    }
    if (recipient.scope === "parent_boundary_agent") {
      return { targetKind: "parent_boundary" };
    }

    const resolved = this.options.memberRegistry.resolveContext(recipient.delivery.selector);
    if (isOperationResult(resolved)) {
      return resolved.code === "TARGET_MEMBER_NOT_FOUND"
        ? targetNotFound(recipientName)
        : resolved;
    }
    return {
      targetKind: "logical_member",
      memberContext: resolved,
      endpoint: buildDeliveryEndpointForParticipant(
        recipient.participant,
        recipient.delivery.selector,
      ),
      targetAgentRunId: resolved.memberRunId,
    };
  }

  private resolveByTargetAgentRunId(
    intent: InterAgentMessageDeliveryIntent,
  ): ResolvedTeamMessageRecipient | AgentOperationResult {
    const targetAgentRunId = intent.target.kind === "target_agent_run_id"
      ? intent.target.targetAgentRunId.trim()
      : "";
    if (!targetAgentRunId) {
      return targetNotFound(targetAgentRunId);
    }

    const taskAgentEntry = this.options.taskAgentDirectory.resolveTaskAgentRunId(targetAgentRunId);
    if (taskAgentEntry) {
      const logicalContext = this.options.teamContext.runtimeContext.memberContexts.find(
        (member) => member.memberRouteKey === taskAgentEntry.logicalMember.memberRouteKey,
      ) ?? null;
      if (!logicalContext) {
        return targetNotFound(targetAgentRunId);
      }
      const participant: InterAgentMessageParticipant = {
        memberKind: "agent",
        memberName: taskAgentEntry.logicalMember.memberName,
        memberPath: [...taskAgentEntry.logicalMember.memberPath],
        memberRouteKey: taskAgentEntry.logicalMember.memberRouteKey,
        memberRunId: taskAgentEntry.taskAgentInstance.taskAgentRunId,
        address: buildTeamMemberAddress({
          teamRunId: this.options.teamContext.runId,
          memberPath: taskAgentEntry.logicalMember.memberPath,
          memberRouteKey: taskAgentEntry.logicalMember.memberRouteKey,
        }),
        platformRunId: null,
        teamDefinitionId: null,
        taskAgentRunId: taskAgentEntry.taskAgentInstance.taskAgentRunId,
        taskId: taskAgentEntry.taskId,
        logicalMemberRouteKey: taskAgentEntry.logicalMember.memberRouteKey,
      };
      return {
        targetKind: "task_agent_run",
        memberContext: logicalContext,
        endpoint: buildDeliveryEndpointForParticipant(
          participant,
          selectorFromMemberPath(taskAgentEntry.logicalMember.memberPath),
        ),
        logicalMemberRouteKey: taskAgentEntry.logicalMember.memberRouteKey,
        targetAgentRunId,
        taskId: taskAgentEntry.taskId,
      };
    }

    if (this.options.taskAgentDirectory.isTaskAgentRunSettled(targetAgentRunId)) {
      return targetNotFound(targetAgentRunId);
    }
    const recoverableTaskAgent = this.resolveRecoverableTaskAgentRunId(targetAgentRunId);
    if (recoverableTaskAgent) {
      return recoverableTaskAgent;
    }

    const memberContext = this.options.teamContext.runtimeContext.memberContexts.find(
      (member) =>
        member.memberKind === "agent" &&
        (member.memberRunId === targetAgentRunId || member.getPlatformAgentRunId() === targetAgentRunId),
    ) ?? null;
    if (memberContext) {
      return {
        targetKind: "agent_run",
        memberContext,
        endpoint: buildDeliveryEndpointForParticipant(
          buildParticipantFromContext(this.options.teamContext.runId, memberContext),
          selectorFromMemberPath(memberContext.memberPath),
        ),
        targetAgentRunId,
      };
    }

    const senderContext = this.resolveSenderContext(intent);
    if (senderContext && this.canReachParentBoundary(senderContext)) {
      const parentBoundary = this.options.teamContext.runtimeContext.parentBoundary;
      const parentMember = parentBoundary?.parentMembers.find(
        (member) => member.memberRunId === targetAgentRunId,
      ) ?? null;
      if (parentMember) {
        return { targetKind: "parent_boundary" };
      }
    }

    return targetNotFound(targetAgentRunId);
  }

  private resolveRecoverableTaskAgentRunId(targetAgentRunId: string): ResolvedTeamMessageRecipient | null {
    const record = this.taskAgentRecoveryCache.get(this.options.teamContext.runId, targetAgentRunId);
    const identity = record?.identity ?? null;
    if (
      !identity ||
      identity.teamRunId !== this.options.teamContext.runId ||
      identity.taskAgentRunId !== targetAgentRunId ||
      !identity.taskId.trim() ||
      !identity.taskAgentInstanceId.trim()
    ) {
      return null;
    }

    const logicalContext = this.options.teamContext.runtimeContext.memberContexts.find(
      (member) =>
        member.memberKind === "agent" &&
        member.memberRouteKey === identity.logicalMember.memberRouteKey,
    ) ?? null;
    if (
      !logicalContext ||
      logicalContext.memberRunId !== identity.logicalMember.templateMemberRunId ||
      !this.memberPathsEqual(logicalContext.memberPath, identity.logicalMember.memberPath)
    ) {
      return null;
    }

    const participant: InterAgentMessageParticipant = {
      memberKind: "agent",
      memberName: logicalContext.memberName,
      memberPath: [...logicalContext.memberPath],
      memberRouteKey: logicalContext.memberRouteKey,
      memberRunId: identity.taskAgentRunId,
      address: buildTeamMemberAddress({
        teamRunId: this.options.teamContext.runId,
        memberPath: logicalContext.memberPath,
        memberRouteKey: logicalContext.memberRouteKey,
      }),
      platformRunId: null,
      teamDefinitionId: null,
      taskAgentRunId: identity.taskAgentRunId,
      taskId: identity.taskId,
      logicalMemberRouteKey: logicalContext.memberRouteKey,
    };
    return {
      targetKind: "task_agent_run",
      memberContext: logicalContext,
      endpoint: buildDeliveryEndpointForParticipant(
        participant,
        selectorFromMemberPath(logicalContext.memberPath),
      ),
      logicalMemberRouteKey: logicalContext.memberRouteKey,
      targetAgentRunId,
      taskId: identity.taskId,
    };
  }

  private resolveSenderContext(intent: InterAgentMessageDeliveryIntent): MixedTeamMemberContext | null {
    const resolved = this.options.memberRegistry.resolveContext(intent.sender.selector);
    if (!isOperationResult(resolved)) {
      return resolved;
    }
    const taskAgentSender = this.options.resolveTaskAgentLogicalContext(
      intent.sender.participant.memberRunId,
    );
    if (taskAgentSender) {
      return taskAgentSender;
    }
    return this.options.teamContext.runtimeContext.memberContexts.find(
      (memberContext) =>
        memberContext.memberRunId === intent.sender.participant.memberRunId ||
        memberContext.getPlatformAgentRunId() === intent.sender.participant.memberRunId ||
        memberContext.memberRouteKey === intent.sender.participant.memberRouteKey,
    ) ?? null;
  }

  private buildSenderRoster(senderContext: MixedTeamMemberContext) {
    return this.rosterBuilder.build({
      teamRunId: this.options.teamContext.runId,
      currentMemberRouteKey: senderContext.memberRouteKey,
      currentMemberIsParentBoundaryRepresentative: this.canReachParentBoundary(senderContext),
      members: this.options.teamContext.runtimeContext.memberContexts.map((member) =>
        this.buildMemberDescriptor(member),
      ),
      parentBoundary: this.options.teamContext.runtimeContext.parentBoundary,
    });
  }

  private canReachParentBoundary(senderContext: MixedTeamMemberContext): boolean {
    const parentBoundary = this.options.teamContext.runtimeContext.parentBoundary;
    const coordinatorRouteKey = this.options.teamContext.runtimeContext.coordinatorMemberRouteKey?.trim();
    return Boolean(parentBoundary && coordinatorRouteKey && senderContext.memberRouteKey === coordinatorRouteKey);
  }

  private buildMemberDescriptor(member: MixedTeamMemberContext): MemberTeamDescriptor {
    const memberConfig = this.findMemberConfig(member.memberRouteKey);
    const address = buildTeamMemberAddress({
      teamRunId: this.options.teamContext.runId,
      memberPath: member.memberPath,
      memberRouteKey: member.memberRouteKey,
    });
    if (member.memberKind === "agent_team") {
      const subTeamConfig = memberConfig?.memberKind === "agent_team" ? memberConfig : null;
      return {
        memberKind: "agent_team",
        memberName: member.memberName,
        memberPath: [...member.memberPath],
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId,
        teamDefinitionId: member.teamDefinitionId,
        childTeamRunId: member.childTeamRunId,
        coordinatorMemberRouteKey: subTeamConfig?.coordinatorMemberRouteKey ?? null,
        representative: subTeamConfig ? this.buildSubTeamRepresentative(subTeamConfig) : null,
        role: subTeamConfig?.role ?? null,
        description: subTeamConfig?.description ?? null,
        address,
      };
    }
    return {
      memberKind: "agent",
      memberName: member.memberName,
      memberPath: [...member.memberPath],
      memberRouteKey: member.memberRouteKey,
      memberRunId: member.memberRunId,
      runtimeKind: member.runtimeKind,
      role: memberConfig?.memberKind === "agent" ? memberConfig.role ?? null : null,
      description: memberConfig?.memberKind === "agent" ? memberConfig.description ?? null : null,
      address,
    } satisfies AgentMemberTeamDescriptor;
  }

  private buildSubTeamRepresentative(
    subTeamConfig: Extract<TeamRunMemberConfig, { memberKind: "agent_team" }>,
  ): SubTeamRepresentativeDescriptor | null {
    const coordinatorRouteKey = subTeamConfig.coordinatorMemberRouteKey?.trim();
    if (!coordinatorRouteKey) {
      return null;
    }
    const representative = subTeamConfig.memberConfigs.find(
      (member) => member.memberKind === "agent" && member.memberRouteKey === coordinatorRouteKey,
    );
    if (!representative || representative.memberKind !== "agent") {
      return null;
    }
    return {
      memberKind: "agent",
      memberName: representative.memberName,
      memberPath: representative.memberPath,
      memberRouteKey: representative.memberRouteKey,
      memberRunId: representative.memberRunId!,
      runtimeKind: representative.runtimeKind,
      role: representative.role ?? null,
      description: representative.description ?? null,
    };
  }

  private findMemberConfig(memberRouteKey: string): TeamRunMemberConfig | null {
    const stack = [...(this.options.teamContext.config?.memberTree ?? [])];
    while (stack.length > 0) {
      const memberConfig = stack.shift()!;
      if (memberConfig.memberRouteKey === memberRouteKey) {
        return memberConfig;
      }
      if (memberConfig.memberKind === "agent_team") {
        stack.push(...memberConfig.memberConfigs);
      }
    }
    return null;
  }

  private memberPathsEqual(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((segment, index) => segment === right[index]);
  }
}
