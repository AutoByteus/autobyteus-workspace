import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../../agent-execution/domain/agent-run-config.js";
import type { AgentRun } from "../../../../agent-execution/domain/agent-run.js";
import { isAgentRunEvent } from "../../../../agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type {
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../../domain/inter-agent-message-delivery.js";
import type { TeamMemberSelector } from "../../../domain/team-run-member-identity.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunMemberInputEventPayload,
} from "../../../domain/team-run-event.js";
import type { AgentStatusPayload } from "../../../../agent-execution/domain/agent-status-payload.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import type {
  AgentToolMcpSessionAuthority,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import type { TeamMemberRunConfig } from "../../../domain/team-run-config.js";
import type { TeamRunMemberConfig } from "../../../domain/team-run-config.js";
import { TeamBackendKind } from "../../../domain/team-backend-kind.js";
import type { TaskAgentInstanceIdentity } from "../../../domain/task-agent-instance.js";
import type { ConversationTargetAddress } from "../../../domain/conversation-target-address.js";
import {
  type MemberTeamContextBuilder,
  type MemberTeamContextMemberInput,
} from "../../../services/member-team-context-builder.js";
import { getInterAgentMessageRouter, type InterAgentMessageRouter } from "../../../services/inter-agent-message-router.js";
import {
  buildInterAgentDeliveryInputMessage,
} from "../../../services/inter-agent-message-runtime-builders.js";
import { buildTeamMemberInputEventPayload } from "../../../services/team-member-input-event-builder.js";
import {
  buildTaskDelegationSystemTaskNotificationEvent,
  isTaskDelegationSystemTaskNotificationMessage,
} from "../../../task-delegation/task-delegation-system-message-visibility.js";
import { TeamCommandStatusOverlayStore } from "../../../services/team-command-status-overlay-store.js";
import type { MixedTeamRunContext, MixedAgentMemberContext } from "../mixed-team-run-context.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle, MixedTeamStatusChange } from "./mixed-team-member-handle.js";

export class MixedAgentMemberHandle implements MixedTeamMemberHandle {
  readonly context: MixedAgentMemberContext;
  private agentRun: AgentRun | null = null;
  private unsubscribe: (() => void) | null = null;
  private readonly commandStatusOverlayStore: TeamCommandStatusOverlayStore;

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    context: MixedAgentMemberContext;
    config: TeamMemberRunConfig;
    agentRunManager?: AgentRunManager;
    agentToolMcpSessionAuthority?: AgentToolMcpSessionAuthority;
    memberTeamContextBuilder: MemberTeamContextBuilder;
    interAgentMessageRouter?: InterAgentMessageRouter;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
  }) {
    this.context = options.context;
    this.commandStatusOverlayStore = new TeamCommandStatusOverlayStore({
      getTeamRunId: () => this.options.teamContext.runId,
      publishEvent: this.options.publish,
      publishTeamStatusIfChanged: this.options.notifyStatusChange,
    });
  }

  isActive(): boolean {
    return this.agentRun?.isActive() ?? false;
  }

  getStatusSnapshot() {
    const snapshot = this.commandStatusOverlayStore.getMemberStatusSnapshot({
      memberContext: this.context,
      taskAgentInstance: this.options.taskAgentInstance ?? null,
      fallback: () => this.agentRun?.getStatusSnapshot() ?? {
        status: "offline" as const,
        can_interrupt: false,
        agent_id: this.context.memberRunId,
        agent_name: this.context.memberName,
      },
    });
    return {
      ...snapshot,
      agent_id: this.context.memberRunId,
      agent_name: this.context.memberName,
      member_route_key: this.context.memberRouteKey,
      member_path: this.context.memberPath,
      source_route_key: this.context.memberRouteKey,
      source_path: this.context.memberPath,
      ...(this.options.taskAgentInstance
        ? {
            task_agent_instance_id: this.options.taskAgentInstance.taskAgentInstanceId,
            task_agent_run_id: this.options.taskAgentInstance.taskAgentRunId,
            task_id: this.options.taskAgentInstance.taskId,
          }
        : {}),
    } satisfies AgentStatusPayload;
  }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    this.publishCommandStatus("initializing");
    try {
      const run = await this.ensureReady();
      const result = await run.postUserMessage(message);
      this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
      if (result.accepted) {
        if (isTaskDelegationSystemTaskNotificationMessage(message)) {
          run.emitLocalEvent(buildTaskDelegationSystemTaskNotificationEvent(run.runId, message));
        } else {
          this.publishMemberInput(message);
        }
      } else {
        this.publishCommandStatus("error", result.message ?? null);
      }
      this.options.notifyStatusChange();
      return { ...result, memberRunId: this.context.memberRunId, memberName: this.context.memberName };
    } catch (error) {
      this.publishCommandStatus("error", String(error));
      throw error;
    }
  }

  async postMessageToConversationTarget(
    _message: AgentInputUserMessage,
    _address: ConversationTargetAddress,
  ): Promise<AgentOperationResult> {
    return {
      accepted: false,
      code: "INVALID_TARGET",
      message: `Agent member '${this.context.memberRouteKey}' cannot contain child conversation target segments.`,
    };
  }

  async deliverInterMemberMessage(
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput: (() => void) | null = null,
  ): Promise<AgentOperationResult> {
    this.publishCommandStatus("initializing");
    try {
      const run = await this.ensureReady();
      const result = await (this.options.interAgentMessageRouter ?? getInterAgentMessageRouter()).deliver({
        recipientRun: run,
        request,
      });
      this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
      if (result.accepted) {
        beforePublishMemberInput?.();
        this.publishMemberInput(buildInterAgentDeliveryInputMessage(request));
      } else {
        this.publishCommandStatus("error", result.message ?? null);
      }
      this.options.notifyStatusChange();
      return { ...result, memberRunId: this.context.memberRunId, memberName: this.context.memberName };
    } catch (error) {
      this.publishCommandStatus("error", String(error));
      throw error;
    }
  }

  private publishMemberInput(message: AgentInputUserMessage): void {
    this.options.publish({
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
      teamRunId: this.options.teamContext.runId,
      sourcePath: this.context.memberPath,
      data: buildTeamMemberInputEventPayload({
        teamRunId: this.options.teamContext.runId,
        memberContext: this.context,
        message,
        taskAgentInstance: this.options.taskAgentInstance ?? null,
      }) satisfies TeamRunMemberInputEventPayload,
    });
  }

  async approveToolInvocation(
    _target: TeamMemberSelector | null,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    const run = await this.ensureReady();
    return run.approveToolInvocation(invocationId, approved, reason ?? null);
  }

  async interrupt(
    _target: TeamMemberSelector | null,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    const normalizedTargetMemberRunId = targetMemberRunId?.trim();
    if (normalizedTargetMemberRunId && normalizedTargetMemberRunId !== this.context.memberRunId) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_RUN_MISMATCH",
        message: `Team member route key '${this.context.memberRouteKey}' does not match member run '${normalizedTargetMemberRunId}'.`,
      };
    }
    return this.agentRun ? this.agentRun.interrupt() : { accepted: true };
  }

  async terminate(): Promise<AgentOperationResult> {
    const run = this.agentRun;
    const result = run ? await run.terminate() : { accepted: true };
    if (result.accepted) {
      this.dispose();
    }
    return result;
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.options.agentToolMcpSessionAuthority
      ?.revokeAgentToolMcpSessionsForMemberRun(this.context.memberRunId);
    this.agentRun = null;
    this.commandStatusOverlayStore.clear();
  }

  adoptExistingRun(run: AgentRun): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.agentRun = run;
    this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
    this.bindEvents(run);
    this.options.notifyStatusChange();
  }

  releaseExistingRunForAdoption(): AgentRun | null {
    const run = this.agentRun;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.agentRun = null;
    this.commandStatusOverlayStore.clear();
    return run;
  }

  private async ensureReady(): Promise<AgentRun> {
    if (this.agentRun?.isActive()) {
      return this.agentRun;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.agentRun = null;
    const memberRunConfig = await this.buildMemberRunConfig();
    const manager = this.options.agentRunManager ?? AgentRunManager.getInstance();
    this.agentRun = typeof this.context.platformAgentRunId === "string" && this.context.platformAgentRunId.trim().length > 0
      ? await manager.restoreAgentRunFromPlatformState({
          runId: this.context.memberRunId,
          config: memberRunConfig,
          platformAgentRunId: this.context.platformAgentRunId,
        })
      : await manager.createAgentRun(memberRunConfig, this.context.memberRunId);
    this.context.platformAgentRunId = this.agentRun.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
    this.bindEvents(this.agentRun);
    this.options.notifyStatusChange();
    return this.agentRun;
  }

  private async buildMemberRunConfig(): Promise<AgentRunConfig> {
    this.assertRecordableMemberMemoryDir();
    const memberTeamContext = await this.options.memberTeamContextBuilder.build({
      teamRunId: this.options.teamContext.runId,
      teamDefinitionId: this.options.teamContext.config?.teamDefinitionId ?? "",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: this.context.memberName,
      currentMemberPath: this.context.memberPath,
      currentMemberRouteKey: this.context.memberRouteKey,
      currentMemberRunId: this.context.memberRunId,
      coordinatorMemberRouteKey: this.options.teamContext.runtimeContext.coordinatorMemberRouteKey,
      members: this.buildMemberTeamContextInputs(),
      parentBoundary: this.options.teamContext.runtimeContext.parentBoundary,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskAgentInstance: this.options.taskAgentInstance ?? null,
      taskTeamInstance: this.resolveTaskTeamIngressBinding(),
      tokenUsageTeamScope: this.options.teamContext.runtimeContext.tokenUsageTeamScope,
    });

    return new AgentRunConfig({
      agentDefinitionId: this.options.config.agentDefinitionId,
      llmModelIdentifier: this.options.config.llmModelIdentifier,
      autoExecuteTools: this.options.config.autoExecuteTools,
      workspaceId: this.options.config.workspaceId,
      memoryDir: this.options.config.memoryDir ?? null,
      llmConfig: this.options.config.llmConfig,
      skillAccessMode: this.options.config.skillAccessMode,
      runtimeKind: this.options.config.runtimeKind,
      memberTeamContext,
      applicationExecutionContext: this.options.config.applicationExecutionContext ?? null,
    });
  }

  private resolveTaskTeamIngressBinding() {
    const taskTeamInstance = this.options.teamContext.runtimeContext.taskTeamInstance ?? null;
    if (!taskTeamInstance) {
      return null;
    }
    return taskTeamInstance.ingress.memberRouteKey === this.context.memberRouteKey
      ? taskTeamInstance
      : null;
  }

  private assertRecordableMemberMemoryDir(): void {
    if (this.options.config.runtimeKind === RuntimeKind.AUTOBYTEUS) {
      return;
    }
    if (typeof this.options.config.memoryDir === "string" && this.options.config.memoryDir.trim().length > 0) {
      return;
    }
    throw new Error(
      `Executable mixed-team member '${this.context.memberRouteKey}' (${this.context.memberRunId}) ` +
        "is missing memoryDir before AgentRun creation. " +
        "The mixed-team runtime owner must materialize member memoryDir upstream.",
    );
  }

  private buildMemberTeamContextInputs(): MemberTeamContextMemberInput[] {
    return this.options.teamContext.runtimeContext.memberContexts.map((member) => {
      const memberConfig = this.findMemberConfig(member.memberRouteKey);
      if (member.memberKind === "agent_team") {
        const subTeamConfig = memberConfig?.memberKind === "agent_team" ? memberConfig : null;
        return {
          memberKind: "agent_team" as const,
          memberName: member.memberName,
          memberPath: member.memberPath,
          memberRouteKey: member.memberRouteKey,
          memberRunId: member.memberRunId,
          teamDefinitionId: member.teamDefinitionId,
          childTeamRunId: member.childTeamRunId,
          coordinatorMemberRouteKey: subTeamConfig?.coordinatorMemberRouteKey ?? null,
          representative: subTeamConfig ? this.buildSubTeamRepresentative(subTeamConfig) : null,
        };
      }
      return {
        memberKind: "agent" as const,
        memberName: member.memberName,
        memberPath: member.memberPath,
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId,
        runtimeKind: member.runtimeKind,
        role: memberConfig?.role ?? null,
        description: memberConfig?.description ?? null,
      };
    });
  }

  private buildSubTeamRepresentative(
    subTeamConfig: Extract<TeamRunMemberConfig, { memberKind: "agent_team" }>,
  ) {
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
      memberKind: "agent" as const,
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

  private bindEvents(run: AgentRun): void {
    this.unsubscribe?.();
    this.unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
      const teamEvent = {
        eventSourceType: TeamRunEventSourceType.AGENT,
        teamRunId: this.options.teamContext.runId,
        sourcePath: this.context.memberPath,
        data: {
          runtimeKind: this.context.runtimeKind,
          memberName: this.context.memberName,
          memberRunId: this.context.memberRunId,
          memberPath: this.context.memberPath,
          memberRouteKey: this.context.memberRouteKey,
          agentEvent: event,
          taskAgentInstance: this.options.taskAgentInstance ?? null,
        } satisfies TeamRunAgentEventPayload,
      };
      this.commandStatusOverlayStore.recordReplacementEvents([teamEvent]);
      this.options.publish(teamEvent);
      this.options.notifyStatusChange();
    });
  }

  private publishCommandStatus(status: "initializing" | "error", errorMessage: string | null = null): void {
    this.commandStatusOverlayStore.publishMemberCommandStatus({
      runtimeKind: this.context.runtimeKind,
      memberContext: this.context,
      taskAgentInstance: this.options.taskAgentInstance ?? null,
      status,
      errorMessage,
      currentStatus: () => this.getStatusSnapshot().status,
    });
  }
}
