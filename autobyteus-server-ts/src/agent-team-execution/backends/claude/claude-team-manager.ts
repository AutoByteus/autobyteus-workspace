import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import {
  isAgentRunEvent,
} from "../../../agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import { deriveTeamApiStatus } from "../../domain/team-status-aggregation.js";
import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import { AgentRunContext } from "../../../agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../agent-execution/backends/claude/backend/claude-agent-run-context.js";
import {
  buildClaudeSessionConfig,
  resolveClaudePermissionMode,
} from "../../../agent-execution/backends/claude/session/claude-session-config.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunStatusUpdateData,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
} from "../../domain/team-run-event.js";
import type { TeamManager } from "../team-manager.js";
import {
  ClaudeTeamMemberContext,
  ClaudeTeamRunContext,
} from "./claude-team-run-context.js";
import {
  buildInterAgentDeliveryInputMessage,
  buildInterAgentMessageAgentRunEvent,
} from "../../services/inter-agent-message-runtime-builders.js";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import {
  resolveConfiguredAgentToolExposure,
  type ConfiguredAgentToolExposure,
} from "../../../agent-execution/shared/configured-agent-tool-exposure.js";
import { getMemberTeamContextBuilder, type MemberTeamContextBuilder } from "../../services/member-team-context-builder.js";
import { publishProcessedTeamAgentEvents } from "../../services/publish-processed-team-agent-events.js";
import { TeamCommandStatusOverlayStore } from "../../services/team-command-status-overlay-store.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import {
  resolveTeamMemberSelector,
  selectorToDisplayString,
  type TeamMemberSelector,
} from "../../domain/team-run-member-identity.js";
import {
  interruptServerManagedTeamMember,
  settleServerManagedTeamMember,
} from "../common/team-member-lifecycle-commands.js";
import {
  ServerManagedTaskAgentInstanceRegistry,
} from "../common/server-managed-task-agent-instance-registry.js";
import {
  buildServerManagedMemberStatusSnapshots,
  buildServerManagedTeamAgentEvent,
} from "../common/server-managed-team-member-projections.js";
import type {
  StartTaskAgentInstanceRequest,
  TaskAgentInstanceIdentity,
} from "../../domain/task-agent-instance.js";

const buildRunNotFoundResult = (teamRunId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${teamRunId}' is not active.`,
});

const buildTargetMemberNotFoundResult = (targetMemberName: string): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_NOT_FOUND",
  message: `Team member '${targetMemberName}' was not found.`,
});

const buildPlaceholderSessionConfig = (memberContext: ClaudeTeamMemberContext) =>
  buildClaudeSessionConfig({
    model: memberContext.agentRunConfig.llmModelIdentifier,
    workingDirectory: ".",
    permissionMode: resolveClaudePermissionMode(memberContext.agentRunConfig.autoExecuteTools),
  });

export class ClaudeTeamManager implements TeamManager {
  private readonly agentRunManager: AgentRunManager;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly memberTeamContextBuilder: MemberTeamContextBuilder;
  private teamContext: TeamRunContext<ClaudeTeamRunContext> | null;
  private readonly memberRuns = new Map<string, AgentRun>();
  private readonly memberRunUnsubscribers = new Map<string, () => void>();
  private readonly commandStatusOverlayStore: TeamCommandStatusOverlayStore;
  private readonly taskAgentRegistry: ServerManagedTaskAgentInstanceRegistry<ClaudeTeamMemberContext>;
  private readonly eventListeners = new Set<TeamRunEventListener>();
  private lastTeamStatus: string | null = "INITIALIZING";

  constructor(
    context: TeamRunContext<ClaudeTeamRunContext>,
    options: {
      agentRunManager?: AgentRunManager;
      agentDefinitionService?: AgentDefinitionService;
      memberTeamContextBuilder?: MemberTeamContextBuilder;
    } = {},
  ) {
    this.teamContext = context;
    this.agentRunManager = options.agentRunManager ?? AgentRunManager.getInstance();
    this.agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.memberTeamContextBuilder =
      options.memberTeamContextBuilder ?? getMemberTeamContextBuilder();
    this.commandStatusOverlayStore = new TeamCommandStatusOverlayStore({
      getTeamRunId: () => this.teamContext?.runId ?? null,
      publishEvent: (event) => this.publish(event),
      publishTeamStatusIfChanged: () => this.publishTeamStatusIfChanged(),
    });
    this.taskAgentRegistry = new ServerManagedTaskAgentInstanceRegistry({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, agentRunManager: this.agentRunManager,
      getTeamRunId: () => this.teamContext?.runId ?? null, isTeamActive: () => Boolean(this.teamContext),
      findLogicalMemberByRouteKey: (routeKey) => this.findMemberContextByRouteKey(routeKey),
      buildRunConfig: (memberContext, identity) => this.buildMemberRunConfig(memberContext, identity),
      publish: (event) => this.publish(event), publishTeamStatusIfChanged: () => this.publishTeamStatusIfChanged(),
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
      (memberContext) => {
        const memberRun = this.memberRuns.get(memberContext.memberRouteKey) ?? null;
        return this.commandStatusOverlayStore.getMemberStatusSnapshot({
        memberContext,
        fallback: () => memberRun?.getStatusSnapshot() ?? { status: "offline" as const, can_interrupt: false },
        });
      },
    );
    return [...memberSnapshots, ...this.taskAgentRegistry.listStatusSnapshots()];
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
    const memberContext = this.resolveTargetMemberContext(target);
    if ("accepted" in memberContext) {
      return memberContext;
    }
    this.publishMemberCommandStatus(memberContext, "initializing");
    let result: AgentOperationResult;
    try { const memberRun = await this.ensureMemberReady(memberContext); result = await memberRun.postUserMessage(message); memberContext.sessionId = memberRun.getPlatformAgentRunId() ?? memberContext.sessionId; }
    catch (error) { this.publishMemberCommandStatus(memberContext, "error", String(error)); throw error; }
    if (!result.accepted) this.publishMemberCommandStatus(memberContext, "error", result.message ?? null);
    this.publishTeamStatusIfChanged();
    return { ...result, memberRunId: memberContext.memberRunId, memberName: memberContext.memberName };
  }

  async deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult> {
    const teamContext = this.teamContext;
    if (!teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const memberContext = this.resolveTargetMemberContext(request.recipient.selector);
    if ("accepted" in memberContext) {
      return memberContext;
    }
    this.publishMemberCommandStatus(memberContext, "initializing");
    let memberRun: AgentRun;
    let result: AgentOperationResult;
    let normalizedRequest: InterAgentMessageDeliveryRequest;
    try {
      memberRun = await this.ensureMemberReady(memberContext);
      const senderContext = this.resolveSenderMemberContext(request.sender.participant.memberRunId);
      normalizedRequest = senderContext ? { ...request, sender: { ...request.sender, participant: { ...request.sender.participant, memberName: request.sender.participant.memberName || senderContext.memberName } } } : request;
      result = await memberRun.postUserMessage(buildInterAgentDeliveryInputMessage(normalizedRequest));
      memberContext.sessionId = memberRun.getPlatformAgentRunId() ?? memberContext.sessionId;
    } catch (error) { this.publishMemberCommandStatus(memberContext, "error", String(error)); throw error; }
    if (!result.accepted) this.publishMemberCommandStatus(memberContext, "error", result.message ?? null);
    if (result.accepted) {
      await publishProcessedTeamAgentEvents({
        teamRunId: teamContext.runId,
        runContext: memberRun.context,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        memberName: memberContext.memberName,
        memberRunId: memberContext.memberRunId,
        sourcePath: memberContext.memberPath,
        agentEvents: [
          buildInterAgentMessageAgentRunEvent({
            recipientRunId: memberContext.memberRunId,
            request: normalizedRequest,
          }),
        ],
        publishTeamEvent: (event) => this.publish(event),
      });
    }
    this.publishTeamStatusIfChanged();
    return {
      ...result,
      memberRunId: memberContext.memberRunId,
      memberName: memberContext.memberName,
    };
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
    const memberContext = this.resolveTargetMemberContext(target);
    if ("accepted" in memberContext) {
      return memberContext;
    }
    const taskAgentRunId = targetMemberRunId?.trim();
    if (taskAgentRunId) {
      return this.taskAgentRegistry.approveToolInvocation(memberContext.memberRouteKey, taskAgentRunId, invocationId, approved, reason ?? null);
    }
    const memberRun = await this.ensureMemberReady(memberContext);
    return memberRun.approveToolInvocation(invocationId, approved, reason ?? null);
  }

  async interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    return interruptServerManagedTeamMember({
      teamContextActive: Boolean(this.teamContext),
      targetMemberRouteKey,
      targetMemberRunId,
      findMemberContextByRouteKey: (routeKey) => this.findMemberContextByRouteKey(routeKey),
      getMemberRun: (routeKey) => this.memberRuns.get(routeKey) ?? null,
      publishTeamStatusIfChanged: () => this.publishTeamStatusIfChanged(),
    });
  }

  async settleMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
    _reason: string | null = null,
  ): Promise<AgentOperationResult> {
    return settleServerManagedTeamMember({
      teamContextActive: Boolean(this.teamContext),
      targetMemberRouteKey,
      targetMemberRunId,
      findMemberContextByRouteKey: (routeKey) => this.findMemberContextByRouteKey(routeKey),
      getMemberRun: (routeKey) => this.memberRuns.get(routeKey) ?? null,
      clearMemberRun: (routeKey) => this.clearSettledMemberRun(routeKey),
      publishTeamStatusIfChanged: () => this.publishTeamStatusIfChanged(),
    });
  }

  async startTaskAgentInstance(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult> { return this.taskAgentRegistry.start(request); }

  async settleTaskAgentInstance(logicalMemberRouteKey: string, taskAgentRunId: string, _reason: string | null = null): Promise<AgentOperationResult> {
    return this.taskAgentRegistry.settle(logicalMemberRouteKey, taskAgentRunId);
  }

  async terminate(): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const taskAgentTermination = await this.taskAgentRegistry.terminateAll();
    if (!taskAgentTermination.accepted) return taskAgentTermination;
    for (const memberRun of this.memberRuns.values()) {
      const result = await memberRun.terminate();
      if (!result.accepted) {
        return result;
      }
    }
    this.clearMemberSubscriptions();
    this.taskAgentRegistry.dispose();
    this.memberRuns.clear();
    this.commandStatusOverlayStore.clear();
    this.teamContext = null;
    this.eventListeners.clear();
    this.lastTeamStatus = null;
    return { accepted: true };
  }

  private async ensureMemberReady(
    memberContext: ClaudeTeamMemberContext,
  ): Promise<AgentRun> {
    const memberRouteKey = memberContext.memberRouteKey;
    const activeMemberRun = this.memberRuns.get(memberRouteKey) ?? null;
    if (activeMemberRun?.isActive()) {
      return activeMemberRun;
    }
    if (activeMemberRun) {
      this.memberRuns.delete(memberRouteKey);
    }
    const memberRunConfig = await this.buildMemberRunConfig(memberContext);

    const memberRun =
      typeof memberContext.sessionId === "string" && memberContext.sessionId.trim().length > 0
        ? await this.agentRunManager.restoreAgentRun(
            new AgentRunContext({
              runId: memberContext.memberRunId,
              config: memberRunConfig,
              runtimeContext: new ClaudeAgentRunContext({
                sessionConfig: buildPlaceholderSessionConfig(memberContext),
                configuredToolExposure:
                  await this.resolveConfiguredToolExposure(memberContext),
                skillAccessMode: memberRunConfig.skillAccessMode,
                memberTeamContext: memberRunConfig.memberTeamContext,
                sessionId: memberContext.sessionId,
              }),
            }),
          )
        : await this.agentRunManager.createAgentRun(memberRunConfig, memberContext.memberRunId);

    memberContext.sessionId = memberRun.getPlatformAgentRunId() ?? memberContext.sessionId;
    this.memberRuns.set(memberRouteKey, memberRun);
    this.bindMemberRunEvents(memberContext, memberRun);
    this.publishTeamStatusIfChanged();
    return memberRun;
  }

  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  private resolveTargetMemberContext(
    target: TeamMemberSelector,
  ): ClaudeTeamMemberContext | AgentOperationResult {
    const resolution = resolveTeamMemberSelector(target, this.getRuntimeContext().memberContexts);
    return resolution.ok
      ? resolution.member
      : buildTargetMemberNotFoundResult(
          `${resolution.message} Selector: '${selectorToDisplayString(target)}'`,
        );
  }

  private findMemberContextByRouteKey(memberRouteKey: string): ClaudeTeamMemberContext | null {
    return (
      this.getRuntimeContext().memberContexts.find(
        (memberContext) => memberContext.memberRouteKey === memberRouteKey,
      ) ?? null
    );
  }

  private findMemberContextByRunId(memberRunId: string): ClaudeTeamMemberContext | null {
    return (
      this.getRuntimeContext().memberContexts.find(
        (memberContext) => memberContext.memberRunId === memberRunId,
      ) ?? null
    );
  }

  private resolveSenderMemberContext(senderRunId: string): ClaudeTeamMemberContext | null {
    const configuredMatch = this.findMemberContextByRunId(senderRunId);
    if (configuredMatch) {
      return configuredMatch;
    }
    const taskAgentMatch = this.taskAgentRegistry.resolveLogicalMemberForRunId(senderRunId);
    if (taskAgentMatch) {
      return taskAgentMatch;
    }

    for (const [memberRouteKey, memberRun] of this.memberRuns.entries()) {
      if (
        memberRun.runId !== senderRunId &&
        memberRun.getPlatformAgentRunId() !== senderRunId
      ) {
        continue;
      }
      return this.findMemberContextByRouteKey(memberRouteKey);
    }

    return null;
  }

  private getRuntimeContext(): ClaudeTeamRunContext {
    if (!this.teamContext) {
      throw new Error("Claude team context is not initialized.");
    }
    return this.teamContext.runtimeContext;
  }

  private async buildMemberRunConfig(memberContext: ClaudeTeamMemberContext, taskAgentInstance: TaskAgentInstanceIdentity | null = null): Promise<AgentRunConfig> {
    const teamContext = this.teamContext;
    const config = teamContext?.config;
    if (!teamContext || !config) {
      throw new Error("Claude team context is not initialized.");
    }
    const memberTeamContext = await this.memberTeamContextBuilder.build({
      teamRunId: teamContext.runId,
      teamDefinitionId: config.teamDefinitionId,
      teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
      currentMemberName: memberContext.memberName,
      currentMemberPath: memberContext.memberPath,
      currentMemberRouteKey: memberContext.memberRouteKey,
      currentMemberRunId: taskAgentInstance?.taskAgentRunId ?? memberContext.memberRunId,
      members: this.getRuntimeContext().memberContexts.map((member) => ({
        memberKind: "agent" as const, memberName: member.memberName, memberPath: member.memberPath,
        memberRouteKey: member.memberRouteKey, memberRunId: member.memberRunId, runtimeKind: member.agentRunConfig.runtimeKind,
      })),
      deliverInterAgentMessage: (request) => this.deliverInterAgentMessage(request),
      taskAgentInstance,
    });

    return new AgentRunConfig({
      agentDefinitionId: memberContext.agentRunConfig.agentDefinitionId,
      llmModelIdentifier: memberContext.agentRunConfig.llmModelIdentifier,
      autoExecuteTools: memberContext.agentRunConfig.autoExecuteTools,
      workspaceId: memberContext.agentRunConfig.workspaceId,
      memoryDir: memberContext.agentRunConfig.memoryDir,
      llmConfig: memberContext.agentRunConfig.llmConfig,
      skillAccessMode: memberContext.agentRunConfig.skillAccessMode,
      runtimeKind: memberContext.agentRunConfig.runtimeKind,
      memberTeamContext,
      applicationExecutionContext: memberContext.agentRunConfig.applicationExecutionContext,
    });
  }

  private async resolveConfiguredToolExposure(
    memberContext: ClaudeTeamMemberContext,
  ): Promise<ConfiguredAgentToolExposure> {
    if (memberContext.configuredToolExposure) {
      return memberContext.configuredToolExposure;
    }

    const agentDefinition = await this.agentDefinitionService.getAgentDefinitionById(
      memberContext.agentRunConfig.agentDefinitionId,
    );
    return resolveConfiguredAgentToolExposure(agentDefinition);
  }

  private bindMemberRunEvents(
    memberContext: ClaudeTeamMemberContext,
    memberRun: AgentRun,
  ): void {
    const existingUnsubscribe = this.memberRunUnsubscribers.get(memberContext.memberRouteKey);
    existingUnsubscribe?.();

    const unsubscribe = memberRun.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event) || !this.teamContext) {
        return;
      }
      memberContext.sessionId = memberRun.getPlatformAgentRunId() ?? memberContext.sessionId;
      const teamEvent = buildServerManagedTeamAgentEvent({
        teamRunId: this.teamContext.runId,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        memberContext,
        agentEvent: event,
      });
      this.commandStatusOverlayStore.recordReplacementEvents([teamEvent]);
      this.publish(teamEvent);
      this.publishTeamStatusIfChanged();
    });

    this.memberRunUnsubscribers.set(memberContext.memberRouteKey, unsubscribe);
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

  private publishMemberCommandStatus(memberContext: ClaudeTeamMemberContext, status: "initializing" | "error", errorMessage: string | null = null): void {
    this.commandStatusOverlayStore.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      memberContext,
      status,
      errorMessage,
      currentStatus: () => this.commandStatusOverlayStore.getMemberStatusSnapshot({
        memberContext,
        fallback: () => this.memberRuns.get(memberContext.memberRouteKey)?.getStatusSnapshot()
          ?? { status: "offline" as const, can_interrupt: false },
      }).status,
    });
  }

  private clearMemberSubscriptions(): void {
    for (const unsubscribe of this.memberRunUnsubscribers.values()) {
      unsubscribe();
    }
    this.memberRunUnsubscribers.clear();
  }

  publishEvent(event: TeamRunEvent): void { this.publish(event); }

  private clearSettledMemberRun(memberRouteKey: string): void {
    this.memberRuns.delete(memberRouteKey);
    this.memberRunUnsubscribers.get(memberRouteKey)?.();
    this.memberRunUnsubscribers.delete(memberRouteKey);
  }

  private publish(event: TeamRunEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
