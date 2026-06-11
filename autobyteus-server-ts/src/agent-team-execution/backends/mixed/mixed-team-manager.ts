import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import { deriveTeamApiStatus } from "../../domain/team-status-aggregation.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import type { StartTaskAgentInstanceRequest } from "../../domain/task-agent-instance.js";
import type {
  InterAgentMessageDeliveryIntent,
} from "../../domain/inter-agent-message-delivery.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunStatusUpdateData,
} from "../../domain/team-run-event.js";
import type { TeamMemberSelector } from "../../domain/team-run-member-identity.js";
import {
  selectorFromMemberRouteKey,
  selectorToRouteKey,
} from "../../domain/team-run-member-identity.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunContext, type MixedTeamMemberContext } from "./mixed-team-run-context.js";
import { normalizeMixedParentBoundaryDeliveryIntent } from "./mixed-parent-boundary-delivery-intent.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import { MixedTeamMemberRegistry } from "./members/mixed-team-member-registry.js";
import { buildServerManagedMemberStatusSnapshots } from "../common/server-managed-team-member-projections.js";
import { settleRegistryTeamMember } from "../common/team-member-lifecycle-commands.js";
import { TeamMemberDeliveryCoordinator } from "./delivery/team-member-delivery-coordinator.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../task-delegation/task-agent-directory.js";

const buildRunNotFoundResult = (teamRunId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${teamRunId}' is not active.`,
});

const isOperationResult = (
  value: MixedTeamMemberContext | AgentOperationResult,
): value is AgentOperationResult => "accepted" in value;

const buildTargetMemberRunMismatchResult = (
  targetMemberRouteKey: string,
  targetMemberRunId: string,
): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_RUN_MISMATCH",
  message: `Team member route key '${targetMemberRouteKey}' does not match member run '${targetMemberRunId}'.`,
});

const buildTargetMemberNotFoundResult = (
  targetMemberRouteKey: string,
): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_NOT_FOUND",
  message: `Team member route key '${targetMemberRouteKey}' was not found.`,
});

const buildTargetMemberRunInactiveResult = (
  targetMemberRouteKey: string,
): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Team member route key '${targetMemberRouteKey}' is not active.`,
});

export class MixedTeamManager implements TeamManager {
  private teamContext: TeamRunContext<MixedTeamRunContext> | null;
  private readonly memberRegistry: MixedTeamMemberRegistry;
  private readonly deliveryCoordinator: TeamMemberDeliveryCoordinator;
  private readonly eventListeners = new Set<TeamRunEventListener>();
  private lastTeamStatus: string | null = "INITIALIZING";

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
    this.memberRegistry = new MixedTeamMemberRegistry({
      teamContext: context,
      subTeamRunFactory,
      agentRunManager: options.agentRunManager,
      publish: (event) => this.publish(event),
      notifyStatusChange: () => this.publishTeamStatusIfChanged(),
      deliverInterAgentMessage: (request) => this.deliverInterAgentMessage(request),
    });
    getTaskAgentDirectory(context.runId);
    this.deliveryCoordinator = new TeamMemberDeliveryCoordinator({
      teamContext: context,
      memberRegistry: this.memberRegistry,
      publish: (event) => this.publish(event),
      notifyStatusChange: () => this.publishTeamStatusIfChanged(),
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

    const memberSnapshots = buildServerManagedMemberStatusSnapshots(
      runtimeContext.memberContexts,
      (memberContext) =>
        this.memberRegistry.listHandles().find(
          (candidate) => candidate.context.memberRouteKey === memberContext.memberRouteKey,
        )?.getStatusSnapshot() ?? { status: "offline" as const, can_interrupt: false },
    );
    return [
      ...memberSnapshots,
      ...this.memberRegistry.listTaskAgentHandles().map((handle) => handle.getStatusSnapshot()),
    ];
  }

  getStatusSnapshot() {
    return {
      status: deriveTeamApiStatus({
        memberStatuses: this.getMemberStatusSnapshots(),
      }),
    };
  }

  async postMessage(message: AgentInputUserMessage, target: TeamMemberSelector, targetMemberRunId: string | null = null): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const resolved = this.memberRegistry.resolveContext(target);
    if (isOperationResult(resolved)) {
      return resolved;
    }
    const taskAgentRunId = targetMemberRunId?.trim();
    if (taskAgentRunId) return this.memberRegistry.postMessageToTaskAgent(resolved.memberRouteKey, taskAgentRunId, message);
    const result = await this.memberRegistry.getOrCreate(resolved).postMessage(message);
    this.publishTeamStatusIfChanged();
    return result;
  }

  async deliverInterAgentMessage(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult> {
    const teamContext = this.teamContext;
    if (!teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    if (intent.teamRunId !== teamContext.runId) {
      return this.deliverToParentBoundary(intent);
    }
    return this.deliveryCoordinator.deliver(intent);
  }

  async approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const resolved = this.memberRegistry.resolveContext(target);
    if (isOperationResult(resolved)) {
      return resolved;
    }
    const taskAgentRunId = targetMemberRunId?.trim();
    if (taskAgentRunId) {
      return this.memberRegistry.approveTaskAgentToolInvocation(resolved.memberRouteKey, taskAgentRunId, invocationId, approved, reason ?? null);
    }
    return this.memberRegistry.getOrCreate(resolved).approveToolInvocation(target, invocationId, approved, reason ?? null);
  }

  async interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
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
    const memberContext = this.memberRegistry.resolveContext(targetSelector);
    if (isOperationResult(memberContext)) {
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

    const handle = this.memberRegistry.getOrCreate(memberContext);
    if (!handle.isActive()) {
      return buildTargetMemberRunInactiveResult(canonicalTargetMemberRouteKey);
    }

    const result = await handle.interrupt(
      targetSelector,
      normalizedTargetMemberRunId ?? null,
    );
    if (result.accepted) {
      this.publishTeamStatusIfChanged();
    }
    return result;
  }

  async settleMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
    _reason: string | null = null,
  ): Promise<AgentOperationResult> {
    return settleRegistryTeamMember({
      teamContextActive: Boolean(this.teamContext),
      targetMemberRouteKey,
      targetMemberRunId,
      resolveContext: (selector) => this.memberRegistry.resolveContext(selector),
      getMemberRun: (routeKey) =>
        this.memberRegistry.listHandles()
          .find((handle) => handle.context.memberRouteKey === routeKey) ?? null,
      removeMember: (routeKey) => { this.memberRegistry.remove(routeKey); },
      publishTeamStatusIfChanged: () => this.publishTeamStatusIfChanged(),
    });
  }

  async startTaskAgentInstance(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    return this.memberRegistry.startTaskAgentInstance(request);
  }

  async settleTaskAgentInstance(logicalMemberRouteKey: string, taskAgentRunId: string, _reason: string | null = null): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const result = await this.memberRegistry.settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId);
    if (result.accepted) {
      getTaskAgentDirectory(this.teamContext.runId).markSettledByTaskAgentRunId(taskAgentRunId);
      this.publishTeamStatusIfChanged();
    }
    return result;
  }

  async terminate(): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const taskAgentTermination = await this.memberRegistry.terminateTaskAgentInstances();
    if (!taskAgentTermination.accepted) return taskAgentTermination;
    for (const handle of this.memberRegistry.listHandles()) {
      const result = await handle.terminate();
      if (!result.accepted) {
        return result;
      }
    }
    this.memberRegistry.dispose();
    disposeTaskAgentDirectory(this.teamContext.runId);
    this.teamContext = null;
    this.eventListeners.clear();
    this.lastTeamStatus = null;
    return { accepted: true };
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
    if (!parentBoundary || intent.teamRunId !== parentBoundary.parentTeamRunId) {
      return Promise.resolve({
        accepted: false,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: `Team run '${intent.teamRunId}' is not reachable from this team boundary.`,
      });
    }

    return parentBoundary.deliverInterAgentMessage(
      normalizeMixedParentBoundaryDeliveryIntent({
        intent,
        parentBoundary,
      }),
    );
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
