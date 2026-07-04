import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentMemoryScope } from "../../../../agent-memory/domain/agent-memory-location.js";
import { buildAgentStatusPayload, normalizeAgentApiStatus } from "../../../../agent-execution/domain/agent-status-payload.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import { buildTeamMemberAddress, type InterAgentMessageDeliveryHandler, type ResolvedInterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import type { AgentMemberTeamDescriptor } from "../../../domain/member-team-context.js";
import type { StartTaskTeamInstanceRequest } from "../../../domain/task-team-instance.js";
import type { ConversationTargetAddress } from "../../../domain/conversation-target-address.js";
import { selectorFromMemberRouteKey, type TeamMemberSelector } from "../../../domain/team-run-member-identity.js";
import { TeamRunEventSourceType, type TeamRunStatusUpdateData } from "../../../domain/team-run-event.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import { MixedSubTeamMemberContext, type MixedTeamRunContext } from "../mixed-team-run-context.js";
import { prefixMixedSubTeamEvent } from "../events/mixed-team-event-bridge.js";
import { TeamCommandStatusOverlayStore } from "../../../services/team-command-status-overlay-store.js";
import { getTokenUsageExecutionAddressBuilder } from "../../../services/token-usage-execution-address-builder.js";
import type { TaskTeamActiveRunDirectory } from "../../../task-delegation/task-team-active-run-directory.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle, MixedTeamStatusChange } from "./mixed-team-member-handle.js";

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
  private observedRootOffline = false;
  private offlineFallbackPublished = false;
  private readonly commandStatusOverlayStore: TeamCommandStatusOverlayStore;
  private readonly tokenUsageAddressBuilder = getTokenUsageExecutionAddressBuilder();

  constructor(private readonly options: {
    parentContext: TeamRunContext<MixedTeamRunContext>;
    request: StartTaskTeamInstanceRequest;
    subTeamRunFactory: MixedSubTeamRunFactory;
    taskTeamActiveRunDirectory: TaskTeamActiveRunDirectory;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
  }) {
    const identity = options.request.identity;
    this.context = new MixedSubTeamMemberContext({
      memberName: identity.logicalTeam.memberName,
      memberPath: identity.logicalTeam.memberPath,
      memberRouteKey: identity.logicalTeam.memberRouteKey,
      memberRunId: identity.taskTeamRunId,
      teamDefinitionId: identity.logicalTeam.teamDefinitionId,
      childTeamRunId: identity.taskTeamRunId,
    });
    this.commandStatusOverlayStore = new TeamCommandStatusOverlayStore({
      getTeamRunId: () => this.options.parentContext.runId,
      publishEvent: this.options.publish,
      publishTeamStatusIfChanged: this.options.notifyStatusChange,
      taskTeamInstance: identity,
    });
  }

  isActive(): boolean { return this.childRun?.isActive() ?? false; }

  getStatusSnapshot() {
    return this.commandStatusOverlayStore.getRepresentedTeamStatusSnapshot({
      sourcePath: this.context.memberPath,
      representedMember: this.context,
      fallback: () => buildAgentStatusPayload({
        status: this.childRun?.getStatusSnapshot().status ?? "offline",
        canInterrupt: false,
        agentId: this.context.memberRunId,
        agentName: this.context.memberName,
        memberRouteKey: this.context.memberRouteKey,
        memberPath: this.context.memberPath,
        sourceRouteKey: this.context.memberRouteKey,
        sourcePath: this.context.memberPath,
      }),
    });
  }

  async start(): Promise<AgentOperationResult> {
    this.publishCommandStatus("initializing");
    try {
      const childRun = await this.ensureReady();
      const result = await childRun.postMessage(
        this.options.request.message,
        selectorFromMemberRouteKey(this.options.request.identity.ingress.memberRouteKey),
      );
      if (!result.accepted) {
        this.publishCommandStatus("error", result.message ?? null);
      }
      this.options.notifyStatusChange();
      return { ...result, memberRunId: this.context.memberRunId, memberName: this.context.memberName };
    } catch (error) {
      this.publishCommandStatus("error", String(error));
      await this.cleanupFailedStart();
      throw error;
    }
  }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    const childRun = await this.ensureReady();
    return childRun.postMessage(message, selectorFromMemberRouteKey(this.options.request.identity.ingress.memberRouteKey));
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
      target ?? selectorFromMemberRouteKey(this.options.request.identity.ingress.memberRouteKey),
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
      : this.options.request.identity.ingress.memberRouteKey;
    return this.childRun.interruptMember(targetRouteKey, targetMemberRunId);
  }

  async terminate(): Promise<AgentOperationResult> {
    const result = this.childRun ? await this.childRun.terminate() : { accepted: true };
    if (result.accepted) {
      this.publishRootOfflineFallbackIfNeeded();
      this.dispose();
    }
    return result;
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.childRun = null;
    this.context.childRuntimeContext = null;
    this.commandStatusOverlayStore.clear();
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
        parentTeamDefinitionId: this.options.parentContext.config?.teamDefinitionId ?? null,
        memoryScope: childMemoryScope,
        representedSubTeam: {
          memberKind: "agent_team",
          memberName: identity.logicalTeam.memberName,
          memberPath: [...identity.logicalTeam.memberPath],
          memberRouteKey: identity.logicalTeam.memberRouteKey,
          memberRunId: identity.logicalTeam.templateMemberRunId,
          teamDefinitionId: identity.logicalTeam.teamDefinitionId,
          childTeamRunId: identity.taskTeamRunId,
          address: buildTeamMemberAddress({
            teamRunId: this.options.parentContext.runId,
            memberPath: identity.logicalTeam.memberPath,
            memberRouteKey: identity.logicalTeam.memberRouteKey,
          }),
        },
        parentMembers: this.buildParentBoundaryMembers(),
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
    this.publishStatus("idle");
    return this.childRun;
  }

  private buildParentBoundaryMembers(): AgentMemberTeamDescriptor[] {
    return this.options.parentContext.runtimeContext.memberContexts
      .filter((memberContext) => memberContext.memberKind === "agent")
      .map((memberContext) => ({
        memberKind: "agent" as const,
        memberName: memberContext.memberName,
        memberPath: [...memberContext.memberPath],
        memberRouteKey: memberContext.memberRouteKey,
        memberRunId: memberContext.memberRunId,
        runtimeKind: memberContext.runtimeKind,
        role: null,
        description: null,
        address: buildTeamMemberAddress({
          teamRunId: this.options.parentContext.runId,
          memberPath: memberContext.memberPath,
          memberRouteKey: memberContext.memberRouteKey,
        }),
      }));
  }

  private bindEvents(childRun: TeamRun): void {
    this.unsubscribe = childRun.subscribeToEvents((event) => {
      if (
        event.eventSourceType === TeamRunEventSourceType.TEAM &&
        event.sourcePath.length === 0 &&
        normalizeAgentApiStatus((event.data as TeamRunStatusUpdateData).status) === "offline"
      ) {
        this.observedRootOffline = true;
      }
      const prefixedEvent = prefixMixedSubTeamEvent({
        parentTeamRunId: this.options.parentContext.runId,
        sourcePrefix: this.context.memberPath,
        event,
        taskTeamInstance: this.options.request.identity,
      });
      this.commandStatusOverlayStore.recordReplacementEvents([prefixedEvent]);
      this.options.publish(prefixedEvent);
      this.options.notifyStatusChange();
    });
  }

  private publishStatus(status: string): void {
    const normalizedStatus = normalizeAgentApiStatus(status, status === "ERROR" ? "error" : "idle");
    this.options.publish({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: this.options.parentContext.runId,
      sourcePath: this.context.memberPath,
      data: { status: normalizedStatus } satisfies TeamRunStatusUpdateData,
      taskTeamInstance: this.options.request.identity,
    });
    this.options.notifyStatusChange();
  }

  private publishRootOfflineFallbackIfNeeded(): void {
    if (this.observedRootOffline || this.offlineFallbackPublished) {
      return;
    }
    this.offlineFallbackPublished = true;
    this.publishStatus("offline");
  }

  private publishCommandStatus(status: "initializing" | "error", errorMessage: string | null = null): void {
    this.commandStatusOverlayStore.publishTeamCommandStatus({
      sourcePath: this.context.memberPath,
      status,
      errorMessage,
      currentStatus: () => this.getStatusSnapshot().status,
    });
  }

  private async cleanupFailedStart(): Promise<void> {
    try { await this.terminate(); }
    catch { this.dispose(); }
  }
}
