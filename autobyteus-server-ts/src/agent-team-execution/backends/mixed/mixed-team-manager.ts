import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import { deriveTeamApiStatus } from "../../domain/team-status-aggregation.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import type { StartTaskAgentInstanceRequest } from "../../domain/task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "../../domain/task-team-instance.js";
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
import { MixedPersistentMemberRegistry } from "./members/mixed-persistent-member-registry.js";
import { MixedTaskAgentInstanceRegistry } from "./members/mixed-task-agent-instance-registry.js";
import { MixedTaskTeamInstanceRegistry } from "./members/mixed-task-team-instance-registry.js";
import { MixedTeamMemberConfigResolver } from "./members/mixed-team-member-config-resolver.js";
import { buildServerManagedMemberStatusSnapshots } from "../common/server-managed-team-member-projections.js";
import { settleRegistryTeamMember } from "../common/team-member-lifecycle-commands.js";
import { TeamMemberDeliveryCoordinator } from "./delivery/team-member-delivery-coordinator.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../task-delegation/task-agent-directory.js";
import { disposeTaskTeamActiveRunDirectoryForParentTeamRun, getTaskTeamActiveRunDirectory } from "../../task-delegation/task-team-active-run-directory.js";

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
  private readonly persistentMembers: MixedPersistentMemberRegistry;
  private readonly taskAgentInstances: MixedTaskAgentInstanceRegistry;
  private readonly taskTeamInstances: MixedTaskTeamInstanceRegistry;
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
    const configResolver = new MixedTeamMemberConfigResolver(context);
    const sharedCallbacks = {
      publish: (event: TeamRunEvent) => this.publish(event),
      notifyStatusChange: () => this.publishTeamStatusIfChanged(),
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
      taskAgentDelivery: this.taskAgentInstances,
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
        this.persistentMembers.listHandles().find(
          (candidate) => candidate.context.memberRouteKey === memberContext.memberRouteKey,
        )?.getStatusSnapshot() ?? { status: "offline" as const, can_interrupt: false },
    );
    return [
      ...memberSnapshots,
      ...this.taskAgentInstances.listHandles().map((handle) => handle.getStatusSnapshot()),
      ...this.taskTeamInstances.listHandles().map((handle) => handle.getStatusSnapshot()),
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
    const resolved = this.persistentMembers.resolveContext(target);
    if (isOperationResult(resolved)) {
      return resolved;
    }
    const taskAgentRunId = targetMemberRunId?.trim();
    if (taskAgentRunId) return this.taskAgentInstances.postMessage(resolved.memberRouteKey, taskAgentRunId, message);
    const result = await this.persistentMembers.getOrCreate(resolved).postMessage(message);
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
    taskTeamRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
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
    if (isOperationResult(resolved)) {
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
    const memberContext = this.persistentMembers.resolveContext(targetSelector);
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

    const handle = this.persistentMembers.getOrCreate(memberContext);
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
      resolveContext: (selector) => this.persistentMembers.resolveContext(selector),
      getMemberRun: (routeKey) =>
        this.persistentMembers.listHandles()
          .find((handle) => handle.context.memberRouteKey === routeKey) ?? null,
      removeMember: (routeKey) => { this.persistentMembers.remove(routeKey); },
      publishTeamStatusIfChanged: () => this.publishTeamStatusIfChanged(),
    });
  }

  async startTaskAgentInstance(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    return this.taskAgentInstances.start(request);
  }

  async settleTaskAgentInstance(logicalMemberRouteKey: string, taskAgentRunId: string, _reason: string | null = null): Promise<AgentOperationResult> {
    if (!this.teamContext) return buildRunNotFoundResult("unknown");
    const result = await this.taskAgentInstances.settle(logicalMemberRouteKey, taskAgentRunId);
    if (result.accepted) { getTaskAgentDirectory(this.teamContext.runId).markSettledByTaskAgentRunId(taskAgentRunId); this.publishTeamStatusIfChanged(); }
    return result;
  }

  async startTaskTeamInstance(request: StartTaskTeamInstanceRequest): Promise<AgentOperationResult> {
    if (!this.teamContext) return buildRunNotFoundResult("unknown");
    return this.taskTeamInstances.start(request);
  }

  async postMessageToTaskTeamInstance(logicalTeamRouteKey: string, taskTeamRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    if (!this.teamContext) return buildRunNotFoundResult("unknown");
    return this.taskTeamInstances.postMessage(logicalTeamRouteKey, taskTeamRunId, message);
  }

  async settleTaskTeamInstance(logicalTeamRouteKey: string, taskTeamRunId: string, _reason: string | null = null): Promise<AgentOperationResult> {
    if (!this.teamContext) return buildRunNotFoundResult("unknown");
    const result = await this.taskTeamInstances.settle(logicalTeamRouteKey, taskTeamRunId);
    if (result.accepted) this.publishTeamStatusIfChanged();
    return result;
  }

  async terminate(): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const taskAgentTermination = await this.taskAgentInstances.terminateAll();
    if (!taskAgentTermination.accepted) return taskAgentTermination;
    const taskTeamTermination = await this.taskTeamInstances.terminateAll();
    if (!taskTeamTermination.accepted) return taskTeamTermination;
    for (const handle of this.persistentMembers.listHandles()) {
      const result = await handle.terminate();
      if (!result.accepted) {
        return result;
      }
    }
    this.persistentMembers.dispose();
    this.taskAgentInstances.dispose();
    this.taskTeamInstances.dispose();
    disposeTaskAgentDirectory(this.teamContext.runId);
    disposeTaskTeamActiveRunDirectoryForParentTeamRun(this.teamContext.runId);
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
