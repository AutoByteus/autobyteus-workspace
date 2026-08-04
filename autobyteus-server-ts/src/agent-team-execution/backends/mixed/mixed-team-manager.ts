import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { buildAgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import {
  buildOrdinaryTeamLeafAgentStatusSnapshot,
  type TeamLeafAgentStatusPayload,
  type TeamLeafAgentStatusSnapshot,
} from "../../domain/team-leaf-agent-status-snapshot.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import type { StartTaskAgentInstanceRequest } from "../../domain/task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "../../domain/task-team-instance.js";
import type { ConversationTargetAddress } from "../../domain/conversation-target-address.js";
import type {
  InterAgentMessageDeliveryIntent,
  InterAgentMessageParticipant,
} from "../../domain/inter-agent-message-delivery.js";
import {
  buildDeliveryEndpointForParticipant,
  buildTeamMemberAddress,
} from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEvent, TeamRunEventListener, TeamRunEventUnsubscribe } from "../../domain/team-run-event.js";
import type { TeamMemberSelector } from "../../domain/team-run-member-identity.js";
import {
  selectorFromMemberRouteKey,
  selectorToRouteKey,
} from "../../domain/team-run-member-identity.js";
import type { TeamMemberRunConfig, TeamRunMemberConfig } from "../../domain/team-run-config.js";
import type { MemberLogicalAddressContext } from "../../domain/member-logical-address-context.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunContext, type MixedTeamMemberContext } from "./mixed-team-run-context.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import { MixedPersistentMemberRegistry } from "./members/mixed-persistent-member-registry.js";
import { MixedTaskAgentInstanceRegistry } from "./members/mixed-task-agent-instance-registry.js";
import { MixedTaskTeamInstanceRegistry } from "./members/mixed-task-team-instance-registry.js";
import { MixedTeamMemberConfigResolver } from "./members/mixed-team-member-config-resolver.js";
import { settleRegistryTeamMember } from "../common/team-member-lifecycle-commands.js";
import { TeamMemberDeliveryCoordinator } from "./delivery/team-member-delivery-coordinator.js";
import { MixedConversationTargetRouter } from "./conversation-target/mixed-conversation-target-router.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../task-delegation/task-agent-directory.js";
import { disposeTaskTeamActiveRunDirectoryForParentTeamRun, getTaskTeamActiveRunDirectory } from "../../task-delegation/task-team-active-run-directory.js";
import { TeamLogicalPlacementResolver } from "../../services/team-logical-placement-resolver.js";
import type { ResolvedTeamLogicalPlacement } from "../../services/resolved-team-logical-placement.js";
import { CollaborationContractError, isCollaborationContractError } from "../../../agent-collaboration/domain/collaboration-contract-error.js";
import { getCollaborationAddressRouteKey } from "../../../agent-collaboration/domain/collaboration-logical-address.js";
import { buildRunNotFoundResult, buildTargetMemberNotFoundResult, buildTargetMemberRunInactiveResult, buildTargetMemberRunMismatchResult, isAgentOperationResult } from "./mixed-team-manager-results.js";

export class MixedTeamManager implements TeamManager {
  private teamContext: TeamRunContext<MixedTeamRunContext> | null;
  private lifecycleState: "active" | "terminating" | "terminated" = "active";
  private terminationPromise: Promise<AgentOperationResult> | null = null;
  private readonly persistentMembers: MixedPersistentMemberRegistry;
  private readonly taskAgentInstances: MixedTaskAgentInstanceRegistry;
  private readonly taskTeamInstances: MixedTaskTeamInstanceRegistry;
  private readonly deliveryCoordinator: TeamMemberDeliveryCoordinator;
  private readonly logicalPlacementResolver = new TeamLogicalPlacementResolver();
  private readonly eventListeners = new Set<TeamRunEventListener>();

  constructor(
    context: TeamRunContext<MixedTeamRunContext>,
    options: { subTeamRunFactory?: MixedSubTeamRunFactory; agentRunManager?: AgentRunManager } = {},
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
    const configResolver = new MixedTeamMemberConfigResolver(context);
    const sharedCallbacks = {
      publish: (event: TeamRunEvent) => this.publish(event),
      deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) =>
        this.deliverInterAgentMessage(request),
    };
    this.persistentMembers = new MixedPersistentMemberRegistry({
      teamContext: context,
      configResolver,
      subTeamRunFactory,
      agentRunManager: options.agentRunManager,
      ...sharedCallbacks,
    });
    this.taskAgentInstances = new MixedTaskAgentInstanceRegistry({
      teamContext: context,
      configResolver,
      agentRunManager: options.agentRunManager,
      ...sharedCallbacks,
    });
    this.taskTeamInstances = new MixedTaskTeamInstanceRegistry({
      teamContext: context,
      subTeamRunFactory,
      taskTeamActiveRunDirectory: getTaskTeamActiveRunDirectory(),
      ...sharedCallbacks,
    });
    getTaskAgentDirectory(context.runId);
    this.deliveryCoordinator = new TeamMemberDeliveryCoordinator({
      teamContext: context,
      memberRegistry: this.persistentMembers,
      publish: (event) => this.publish(event),
    });
  }

  hasActiveMembers(): boolean {
    return this.lifecycleState === "active" && this.teamContext !== null;
  }

  getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[] {
    const runtimeContext = this.teamContext?.runtimeContext ?? null;
    if (!runtimeContext) {
      return [];
    }

    const handlesByRouteKey = new Map(
      this.persistentMembers.listHandles().map((handle) => [
        handle.context.memberRouteKey,
        handle,
      ]),
    );
    const memberSnapshots = runtimeContext.memberContexts.flatMap((memberContext) => {
      const handle = handlesByRouteKey.get(memberContext.memberRouteKey) ?? null;
      if (handle) {
        return handle.getLeafAgentStatusSnapshots();
      }
      if (memberContext.memberKind !== "agent") {
        return [];
      }
      const payload = buildAgentStatusPayload({
        status: "offline",
        agentId: memberContext.memberRunId,
        agentName: memberContext.memberName,
        memberRouteKey: memberContext.memberRouteKey,
        memberPath: memberContext.memberPath,
        sourceRouteKey: memberContext.memberRouteKey,
        sourcePath: memberContext.memberPath,
      }) as TeamLeafAgentStatusPayload;
      return [buildOrdinaryTeamLeafAgentStatusSnapshot({
        teamRunId: this.teamContext!.runId,
        payload,
      })];
    });
    return [
      ...memberSnapshots,
      ...this.taskAgentInstances.listHandles().flatMap((handle) => handle.getLeafAgentStatusSnapshots()),
      ...this.taskTeamInstances.listHandles().flatMap((handle) => handle.getLeafAgentStatusSnapshots()),
    ];
  }

  hasOpenExecutionWork(): boolean {
    return [
      ...this.persistentMembers.listHandles(),
      ...this.taskAgentInstances.listHandles(),
      ...this.taskTeamInstances.listHandles(),
    ].some((handle) => handle.hasOpenExecutionWork());
  }

  async postMessage(message: AgentInputUserMessage, target: TeamMemberSelector, targetMemberRunId: string | null = null): Promise<AgentOperationResult> {
    if (!this.getRoutableTeamContext()) {
      return buildRunNotFoundResult("unknown");
    }
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) {
      return resolved;
    }
    const taskAgentRunId = targetMemberRunId?.trim();
    if (taskAgentRunId) return this.taskAgentInstances.postMessage(resolved.memberRouteKey, taskAgentRunId, message);
    return this.persistentMembers.getOrCreate(resolved).postMessage(message);
  }

  async postMessageToConversationTarget(
    message: AgentInputUserMessage,
    address: ConversationTargetAddress,
  ): Promise<AgentOperationResult> {
    if (!this.getRoutableTeamContext()) {
      return buildRunNotFoundResult("unknown");
    }
    const router = new MixedConversationTargetRouter({
      getTeamContext: () => this.teamContext,
      persistentMembers: this.persistentMembers,
      taskAgentInstances: this.taskAgentInstances,
      taskTeamInstances: this.taskTeamInstances,
    });
    return router.postMessage(message, address);
  }

  async deliverInterAgentMessage(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult> {
    const teamContext = this.getRoutableTeamContext();
    if (!teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    if (intent.teamRunId !== teamContext.runId) {
      return this.deliverToParentBoundary(intent);
    }
    try {
      const placement = this.resolveLogicalPlacement(
        intent.recipientName,
        intent.callerAddressing,
      );
      const targetAddress = placement.kind === "agent" ? placement.address : placement.ingressAddress;
      if (targetAddress === intent.callerAddressing.memberAddress) {
        throw new CollaborationContractError(
          "COLLABORATION_SELF_TARGET_REJECTED",
          `Collaboration target '${placement.address}' resolves to the calling Agent.`,
        );
      }
      return this.deliveryCoordinator.deliver(
        intent,
        this.materializeMessageRecipient(targetAddress),
      );
    } catch (error) {
      if (!isCollaborationContractError(error)) {
        throw error;
      }
      return { accepted: false, code: error.code, message: error.message };
    }
  }

  resolveLogicalPlacement(
    recipientName: string,
    callerAddressing: MemberLogicalAddressContext,
  ): ResolvedTeamLogicalPlacement {
    const teamContext = this.getRoutableTeamContext();
    if (
      !teamContext?.config ||
      teamContext.runId !== teamContext.runtimeContext.collaborationRootTeamRunId ||
      callerAddressing.rootTeamRunId !== teamContext.runId
    ) {
      throw new CollaborationContractError(
        "COLLABORATION_CONTEXT_REQUIRED",
        "Logical placement resolution requires the active collaboration-root TeamRun.",
      );
    }
    return this.logicalPlacementResolver.resolve(teamContext.config, recipientName, callerAddressing);
  }

  async approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
    targetMemberRunId: string | null = null,
    taskTeamRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.getRoutableTeamContext()) {
      return buildRunNotFoundResult("unknown");
    }
    const normalizedTaskTeamRunId = taskTeamRunId?.trim();
    if (normalizedTaskTeamRunId) {
      return this.taskTeamInstances.approveToolInvocation(
        normalizedTaskTeamRunId,
        target,
        invocationId,
        approved,
        reason ?? null,
        targetMemberRunId,
      );
    }
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) {
      return resolved;
    }
    const taskAgentRunId = targetMemberRunId?.trim();
    if (taskAgentRunId) {
      return this.taskAgentInstances.approveToolInvocation(resolved.memberRouteKey, taskAgentRunId, invocationId, approved, reason ?? null);
    }
    return this.persistentMembers.getOrCreate(resolved).approveToolInvocation(target, invocationId, approved, reason ?? null);
  }

  async interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.getRoutableTeamContext()) {
      return buildRunNotFoundResult("unknown");
    }
    const normalizedTargetMemberRouteKey = targetMemberRouteKey.trim();
    if (!normalizedTargetMemberRouteKey) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_REQUIRED",
        message: "target member selector is required.",
      };
    }
    const targetSelector = selectorFromMemberRouteKey(normalizedTargetMemberRouteKey);
    const canonicalTargetMemberRouteKey = selectorToRouteKey(targetSelector);
    const memberContext = this.persistentMembers.resolveContext(targetSelector);
    if (isAgentOperationResult(memberContext)) {
      return memberContext.code === "TARGET_MEMBER_NOT_FOUND"
        ? buildTargetMemberNotFoundResult(canonicalTargetMemberRouteKey)
        : memberContext;
    }
    const normalizedTargetMemberRunId = targetMemberRunId?.trim();
    if (
      normalizedTargetMemberRunId &&
      memberContext.memberRouteKey === canonicalTargetMemberRouteKey &&
      normalizedTargetMemberRunId !== memberContext.memberRunId
    ) {
      return buildTargetMemberRunMismatchResult(
        canonicalTargetMemberRouteKey,
        normalizedTargetMemberRunId,
      );
    }

    const handle = this.persistentMembers.getOrCreate(memberContext);
    if (!handle.isActive()) {
      return buildTargetMemberRunInactiveResult(canonicalTargetMemberRouteKey);
    }

    const result = await handle.interrupt(
      targetSelector,
      normalizedTargetMemberRunId ?? null,
    );
    return result;
  }

  async settleMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
    _reason: string | null = null,
  ): Promise<AgentOperationResult> {
    return settleRegistryTeamMember({
      teamContextActive: this.hasActiveMembers(),
      targetMemberRouteKey,
      targetMemberRunId,
      resolveContext: (selector) => this.persistentMembers.resolveContext(selector),
      getMemberRun: (routeKey) =>
        this.persistentMembers.listHandles()
          .find((handle) => handle.context.memberRouteKey === routeKey) ?? null,
      removeMember: (routeKey) => { this.persistentMembers.remove(routeKey); },
    });
  }

  async startTaskAgentInstance(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult> {
    if (!this.getRoutableTeamContext()) {
      return buildRunNotFoundResult("unknown");
    }
    return this.taskAgentInstances.start(request);
  }

  async settleTaskAgentInstance(logicalMemberRouteKey: string, taskAgentRunId: string, _reason: string | null = null): Promise<AgentOperationResult> {
    const teamContext = this.getRoutableTeamContext();
    if (!teamContext) return buildRunNotFoundResult("unknown");
    const result = await this.taskAgentInstances.settle(logicalMemberRouteKey, taskAgentRunId);
    if (result.accepted) getTaskAgentDirectory(teamContext.runId).markSettledByTaskAgentRunId(taskAgentRunId);
    return result;
  }

  async startTaskTeamInstance(request: StartTaskTeamInstanceRequest): Promise<AgentOperationResult> {
    if (!this.getRoutableTeamContext()) return buildRunNotFoundResult("unknown");
    return this.taskTeamInstances.start(request);
  }

  async postMessageToTaskTeamInstance(logicalTeamRouteKey: string, taskTeamRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    if (!this.getRoutableTeamContext()) return buildRunNotFoundResult("unknown");
    return this.taskTeamInstances.postMessage(logicalTeamRouteKey, taskTeamRunId, message);
  }

  async settleTaskTeamInstance(logicalTeamRouteKey: string, taskTeamRunId: string, _reason: string | null = null): Promise<AgentOperationResult> {
    if (!this.getRoutableTeamContext()) return buildRunNotFoundResult("unknown");
    return this.taskTeamInstances.settle(logicalTeamRouteKey, taskTeamRunId);
  }

  async terminate(): Promise<AgentOperationResult> {
    if (this.lifecycleState === "terminated") {
      return { accepted: true };
    }
    if (this.terminationPromise) {
      return this.terminationPromise;
    }
    if (!this.teamContext) {
      this.lifecycleState = "terminated";
      return { accepted: true };
    }

    this.lifecycleState = "terminating";
    this.terminationPromise = this.runTermination();
    return this.terminationPromise;
  }

  publishEvent(event: TeamRunEvent): void { this.publish(event); }

  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }


  private deliverToParentBoundary(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult> {
    const parentBoundary = this.teamContext?.runtimeContext.parentBoundary ?? null;
    if (!parentBoundary || intent.teamRunId !== parentBoundary.collaborationRootTeamRunId) {
      return Promise.resolve({
        accepted: false,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: `Team run '${intent.teamRunId}' is not reachable from this team boundary.`,
      });
    }

    return parentBoundary.deliverInterAgentMessage(intent);
  }

  private materializeMessageRecipient(
    address: string,
  ) {
    const teamContext = this.teamContext;
    if (!teamContext?.config) {
      throw new CollaborationContractError(
        "COLLABORATION_CONTEXT_REQUIRED",
        "The collaboration-root TeamRun is not active.",
      );
    }
    const routeKey = getCollaborationAddressRouteKey(address);
    const config = this.findAgentConfig(teamContext.config.memberTree, routeKey);
    if (!config?.memberRunId) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Collaboration target '${address}' has no executable Agent runtime.`,
      );
    }
    const selector = selectorFromMemberRouteKey(routeKey);
    const memberContext = this.persistentMembers.resolveContext(selector);
    if (isAgentOperationResult(memberContext)) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Collaboration target '${address}' is not reachable.`,
      );
    }
    const participant: InterAgentMessageParticipant = {
      memberKind: "agent",
      memberName: config.memberName,
      memberPath: [...config.memberPath],
      memberRouteKey: config.memberRouteKey,
      memberRunId: config.memberRunId,
      address: buildTeamMemberAddress({
        teamRunId: teamContext.runId,
        memberPath: config.memberPath,
        memberRouteKey: config.memberRouteKey,
      }),
      platformRunId: memberContext.memberKind === "agent"
        ? memberContext.getPlatformAgentRunId()
        : null,
      teamDefinitionId: null,
    };
    return {
      memberContext,
      endpoint: buildDeliveryEndpointForParticipant(participant, selector),
      targetAgentRunId: config.memberRunId,
    };
  }

  private findAgentConfig(
    members: readonly TeamRunMemberConfig[],
    routeKey: string,
  ): TeamMemberRunConfig | null {
    for (const member of members) {
      if (member.memberKind === "agent" && member.memberRouteKey === routeKey) {
        return member;
      }
      if (member.memberKind === "agent_team") {
        const nested = this.findAgentConfig(member.memberConfigs, routeKey);
        if (nested) return nested;
      }
    }
    return null;
  }

  private getRoutableTeamContext(): TeamRunContext<MixedTeamRunContext> | null {
    return this.lifecycleState === "active" ? this.teamContext : null;
  }

  private async runTermination(): Promise<AgentOperationResult> {
    const teamContext = this.teamContext;
    if (!teamContext) {
      this.lifecycleState = "terminated";
      this.terminationPromise = null;
      return { accepted: true };
    }

    try {
      const taskAgentTermination = await this.taskAgentInstances.terminateAll();
      if (!taskAgentTermination.accepted) {
        this.lifecycleState = "active";
        this.terminationPromise = null;
        return taskAgentTermination;
      }
      const taskTeamTermination = await this.taskTeamInstances.terminateAll();
      if (!taskTeamTermination.accepted) {
        this.lifecycleState = "active";
        this.terminationPromise = null;
        return taskTeamTermination;
      }
      for (const handle of this.persistentMembers.listHandles()) {
        const result = await handle.terminate();
        if (!result.accepted) {
          this.lifecycleState = "active";
          this.terminationPromise = null;
          return result;
        }
      }

      this.persistentMembers.dispose();
      this.taskAgentInstances.dispose();
      this.taskTeamInstances.dispose();
      disposeTaskAgentDirectory(teamContext.runId);
      disposeTaskTeamActiveRunDirectoryForParentTeamRun(teamContext.runId);
      this.teamContext = null;
      this.eventListeners.clear();
      this.lifecycleState = "terminated";
      this.terminationPromise = null;
      return { accepted: true };
    } catch (error) {
      this.lifecycleState = "active";
      this.terminationPromise = null;
      return {
        accepted: false,
        code: "RUNTIME_COMMAND_FAILED",
        message: `Failed to terminate team run: ${String(error)}`,
      };
    }
  }

  private publish(event: TeamRunEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
