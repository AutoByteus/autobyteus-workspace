import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentMemoryScope } from "../../../../agent-memory/domain/agent-memory-location.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import { buildTeamMemberAddress, type InterAgentMessageDeliveryHandler, type ResolvedInterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import type { StartTaskTeamInstanceRequest } from "../../../domain/task-team-instance.js";
import {
  buildTaskTeamStreamScope,
  type TaskTeamStreamScope,
} from "../../../domain/task-team-stream-scope.js";
import type { ConversationTargetAddress } from "../../../domain/conversation-target-address.js";
import { selectorFromMemberRouteKey, type TeamMemberSelector } from "../../../domain/team-run-member-identity.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import { MixedSubTeamMemberContext, type MixedTeamRunContext } from "../mixed-team-run-context.js";
import {
  prefixMixedSubTeamEvent,
  prefixMixedTeamLeafAgentStatusSnapshot,
} from "../events/mixed-team-event-bridge.js";
import { getTokenUsageExecutionAddressBuilder } from "../../../services/token-usage-execution-address-builder.js";
import type { TaskTeamActiveRunDirectory } from "../../../task-delegation/task-team-active-run-directory.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle } from "./mixed-team-member-handle.js";

const getTeamContextMemoryScope = (context: TeamRunContext<MixedTeamRunContext>): AgentMemoryScope =>
  context.runtimeContext.parentBoundary?.memoryScope
    ? {
        rootTeamRunId: context.runtimeContext.parentBoundary.memoryScope.rootTeamRunId,
        teamRunPath: [...context.runtimeContext.parentBoundary.memoryScope.teamRunPath],
      }
    : { rootTeamRunId: context.runId, teamRunPath: [] };

export class MixedTaskTeamMemberHandle implements MixedTeamMemberHandle {
  readonly context: MixedSubTeamMemberContext;
  private childRun: TeamRun | null = null;
  private unsubscribe: (() => void) | null = null;
  private readonly tokenUsageAddressBuilder = getTokenUsageExecutionAddressBuilder();
  private readonly taskTeamStreamScope: TaskTeamStreamScope;

  constructor(private readonly options: {
    parentContext: TeamRunContext<MixedTeamRunContext>;
    request: StartTaskTeamInstanceRequest;
    subTeamRunFactory: MixedSubTeamRunFactory;
    taskTeamActiveRunDirectory: TaskTeamActiveRunDirectory;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
  }) {
    const identity = options.request.identity;
    this.taskTeamStreamScope = buildTaskTeamStreamScope({
      taskTeamInstance: identity,
      parentTeamRunId: options.parentContext.runId,
    });
    this.context = new MixedSubTeamMemberContext({
      memberName: identity.logicalTeam.memberName,
      memberPath: identity.logicalTeam.memberPath,
      memberRouteKey: identity.logicalTeam.memberRouteKey,
      memberRunId: identity.taskTeamRunId,
      teamDefinitionId: identity.logicalTeam.teamDefinitionId,
      childTeamRunId: identity.taskTeamRunId,
    });
  }

  isActive(): boolean { return this.childRun?.isActive() ?? false; }

  getLeafAgentStatusSnapshots() {
    return this.childRun?.getLeafAgentStatusSnapshots().map((snapshot) =>
      prefixMixedTeamLeafAgentStatusSnapshot({
        parentTeamRunId: this.options.parentContext.runId,
        sourcePrefix: this.context.memberPath,
        snapshot,
        taskTeamScopeOverride: this.taskTeamStreamScope,
      })) ?? [];
  }

  hasOpenExecutionWork(): boolean {
    return this.childRun?.hasOpenExecutionWork() ?? false;
  }

  async start(): Promise<AgentOperationResult> {
    try {
      const childRun = await this.ensureReady();
      const result = await childRun.postMessage(
        this.options.request.message,
        selectorFromMemberRouteKey(this.resolveChildIngressRouteKey(childRun)),
      );
      return { ...result, memberRunId: this.context.memberRunId, memberName: this.context.memberName };
    } catch (error) {
      await this.cleanupFailedStart();
      throw error;
    }
  }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    const childRun = await this.ensureReady();
    return childRun.postMessage(message, selectorFromMemberRouteKey(this.resolveChildIngressRouteKey(childRun)));
  }

  async postMessageToConversationTarget(
    message: AgentInputUserMessage,
    address: ConversationTargetAddress,
  ): Promise<AgentOperationResult> {
    if (address.segments.length === 0) {
      return this.postMessage(message);
    }
    const childRun = await this.ensureReady();
    return childRun.postMessageToConversationTarget(message, address);
  }

  async deliverInterMemberMessage(_request: ResolvedInterAgentMessageDeliveryRequest): Promise<AgentOperationResult> {
    return { accepted: false, code: "TASK_TEAM_DIRECT_DELIVERY_UNSUPPORTED", message: "Task-team handle does not own ordinary inter-agent delivery." };
  }

  async approveToolInvocation(
    target: TeamMemberSelector | null,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    const childRun = await this.ensureReady();
    return childRun.approveToolInvocation(
      target ?? selectorFromMemberRouteKey(this.resolveChildIngressRouteKey(childRun)),
      invocationId,
      approved,
      reason,
      targetMemberRunId,
    );
  }

  async interrupt(target: TeamMemberSelector | null, targetMemberRunId: string | null = null): Promise<AgentOperationResult> {
    if (!this.childRun?.isActive()) return { accepted: true };
    const targetRouteKey = target?.kind === "route_key"
      ? target.memberRouteKey
      : this.resolveChildIngressRouteKey(this.childRun);
    return this.childRun.interruptMember(targetRouteKey, targetMemberRunId);
  }

  async terminate(): Promise<AgentOperationResult> {
    const result = this.childRun ? await this.childRun.terminate() : { accepted: true };
    if (result.accepted) {
      this.dispose();
    }
    return result;
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.childRun = null;
    this.context.childRuntimeContext = null;
    this.options.taskTeamActiveRunDirectory.unbind(this.options.request.identity.taskTeamRunId);
  }

  private async ensureReady(): Promise<TeamRun> {
    if (this.childRun?.isActive()) return this.childRun;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.childRun = null;
    this.context.childRuntimeContext = null;
    const identity = this.options.request.identity;
    const parentMemoryScope = getTeamContextMemoryScope(this.options.parentContext);
    const childMemoryScope: AgentMemoryScope = {
      rootTeamRunId: parentMemoryScope.rootTeamRunId,
      teamRunPath: [...parentMemoryScope.teamRunPath, identity.taskTeamRunId],
    };
    this.childRun = await this.options.subTeamRunFactory.createOrRestore({
      parentTeamRunId: this.options.parentContext.runId,
      subTeamConfig: this.options.request.teamConfig,
      childTeamRunId: identity.taskTeamRunId,
      parentBoundary: {
        parentTeamRunId: this.options.parentContext.runId,
        memoryScope: childMemoryScope,
        collaborationRootTeamRunId:
          this.options.parentContext.runtimeContext.collaborationRootTeamRunId,
        teamMountPath: [
          ...this.options.parentContext.runtimeContext.teamMountPath,
          ...this.options.request.teamConfig.memberPath,
        ],
        effectiveHandoffs:
          this.options.parentContext.runtimeContext.effectiveHandoffs,
        deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      },
      taskTeamInstance: identity,
      tokenUsageTeamScope: this.tokenUsageAddressBuilder.buildTaskTeamScope({
        parentScope: this.options.parentContext.runtimeContext.tokenUsageTeamScope,
        taskTeamInstance: identity,
      }),
    });
    this.context.childTeamRunId = this.childRun.runId;
    this.context.childRuntimeContext = this.childRun.getRuntimeContext() as MixedTeamRunContext;
    this.options.taskTeamActiveRunDirectory.bindActiveRun(identity, this.childRun);
    this.bindEvents(this.childRun);
    return this.childRun;
  }

  private resolveChildIngressRouteKey(childRun: TeamRun): string {
    const runtime = childRun.getRuntimeContext() as MixedTeamRunContext | null;
    const routeKey = runtime?.taskTeamInstance?.ingress.memberRouteKey?.trim() ?? "";
    if (!routeKey) {
      throw new Error(`Task TeamRun '${this.options.request.identity.taskTeamRunId}' has no localized ingress binding.`);
    }
    return routeKey;
  }

  private bindEvents(childRun: TeamRun): void {
    this.unsubscribe = childRun.subscribeToEvents((event) => {
      const prefixedEvent = prefixMixedSubTeamEvent({
        parentTeamRunId: this.options.parentContext.runId,
        sourcePrefix: this.context.memberPath,
        event,
        taskTeamScopeOverride: this.taskTeamStreamScope,
      });
      this.options.publish(prefixedEvent);
    });
  }

  private async cleanupFailedStart(): Promise<void> {
    try { await this.terminate(); }
    catch { this.dispose(); }
  }
}
