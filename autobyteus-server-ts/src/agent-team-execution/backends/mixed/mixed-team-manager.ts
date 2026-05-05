import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { buildConfiguredAgentToolExposure } from "../../../agent-execution/shared/configured-agent-tool-exposure.js";
import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { AgentRunContext } from "../../../agent-execution/domain/agent-run-context.js";
import {
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../../agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import { CodexAgentRunContext } from "../../../agent-execution/backends/codex/backend/codex-agent-run-context.js";
import {
  buildCodexThreadConfig,
} from "../../../agent-execution/backends/codex/thread/codex-thread-config.js";
import { resolveApprovalPolicyForAutoExecuteTools } from "../../../agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
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
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunStatusUpdateData,
} from "../../domain/team-run-event.js";
import type { TeamMemberRunConfig } from "../../domain/team-run-config.js";
import type { TeamManager } from "../team-manager.js";
import { getMemberTeamContextBuilder, type MemberTeamContextBuilder } from "../../services/member-team-context-builder.js";
import { getInterAgentMessageRouter, type InterAgentMessageRouter } from "../../services/inter-agent-message-router.js";
import { publishProcessedTeamAgentEvents } from "../../services/publish-processed-team-agent-events.js";
import {
  buildInterAgentMessageAgentRunEvent,
} from "../../services/inter-agent-message-runtime-builders.js";
import {
  MixedTeamMemberContext,
  MixedTeamRunContext,
} from "./mixed-team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";

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

export class MixedTeamManager implements TeamManager {
  private readonly agentRunManager: AgentRunManager;
  private readonly memberTeamContextBuilder: MemberTeamContextBuilder;
  private readonly interAgentMessageRouter: InterAgentMessageRouter;
  private teamContext: TeamRunContext<MixedTeamRunContext> | null;
  private readonly memberRuns = new Map<string, AgentRun>();
  private readonly memberRunUnsubscribers = new Map<string, () => void>();
  private readonly eventListeners = new Set<TeamRunEventListener>();
  private lastTeamStatus: string | null = "INITIALIZING";

  constructor(
    context: TeamRunContext<MixedTeamRunContext>,
    options: {
      agentRunManager?: AgentRunManager;
      memberTeamContextBuilder?: MemberTeamContextBuilder;
      interAgentMessageRouter?: InterAgentMessageRouter;
    } = {},
  ) {
    this.teamContext = context;
    this.agentRunManager = options.agentRunManager ?? AgentRunManager.getInstance();
    this.memberTeamContextBuilder =
      options.memberTeamContextBuilder ?? getMemberTeamContextBuilder();
    this.interAgentMessageRouter =
      options.interAgentMessageRouter ?? getInterAgentMessageRouter();
  }

  hasActiveMembers(): boolean {
    return this.teamContext !== null;
  }

  async postMessage(
    message: AgentInputUserMessage,
    targetMemberName: string,
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const memberContext = this.findMemberContextByName(targetMemberName);
    if (!memberContext) {
      return buildTargetMemberNotFoundResult(targetMemberName);
    }
    const memberRun = await this.ensureMemberReady(memberContext);
    const result = await memberRun.postUserMessage(message);
    memberContext.platformAgentRunId =
      memberRun.getPlatformAgentRunId() ?? memberContext.platformAgentRunId;
    this.publishTeamStatusIfChanged();
    return {
      ...result,
      memberRunId: memberContext.memberRunId,
      memberName: memberContext.memberName,
    };
  }

  async deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult> {
    const teamContext = this.teamContext;
    if (!teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const recipientContext = this.findMemberContextByName(request.recipientMemberName);
    if (!recipientContext) {
      return buildTargetMemberNotFoundResult(request.recipientMemberName);
    }
    const recipientRun = await this.ensureMemberReady(recipientContext);
    const senderMemberName =
      request.senderMemberName ?? this.resolveSenderMemberContext(request.senderRunId)?.memberName ?? null;
    const normalizedRequest: InterAgentMessageDeliveryRequest = {
      ...request,
      senderMemberName,
    };
    const result = await this.interAgentMessageRouter.deliver({
      recipientRun,
      request: normalizedRequest,
    });
    recipientContext.platformAgentRunId =
      recipientRun.getPlatformAgentRunId() ?? recipientContext.platformAgentRunId;
    if (result.accepted) {
      await publishProcessedTeamAgentEvents({
        teamRunId: teamContext.runId,
        runContext: recipientRun.context,
        runtimeKind: recipientContext.runtimeKind,
        memberName: recipientContext.memberName,
        memberRunId: recipientContext.memberRunId,
        agentEvents: [
          buildInterAgentMessageAgentRunEvent({
            recipientRunId: recipientContext.memberRunId,
            request: normalizedRequest,
          }),
        ],
        publishTeamEvent: (event) => this.publish(event),
      });
    }
    this.publishTeamStatusIfChanged();
    return {
      ...result,
      memberRunId: recipientContext.memberRunId,
      memberName: recipientContext.memberName,
    };
  }

  async approveToolInvocation(
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const memberContext = this.findMemberContextByName(targetMemberName);
    if (!memberContext) {
      return buildTargetMemberNotFoundResult(targetMemberName);
    }
    const memberRun = await this.ensureMemberReady(memberContext);
    return memberRun.approveToolInvocation(invocationId, approved, reason ?? null);
  }

  async interrupt(): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    for (const memberRun of this.memberRuns.values()) {
      const result = await memberRun.interrupt();
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
    for (const memberRun of this.memberRuns.values()) {
      const result = await memberRun.terminate();
      if (!result.accepted) {
        return result;
      }
    }
    this.clearMemberSubscriptions();
    this.memberRuns.clear();
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

  private async ensureMemberReady(
    memberContext: MixedTeamMemberContext,
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
      typeof memberContext.platformAgentRunId === "string" &&
      memberContext.platformAgentRunId.trim().length > 0
        ? await this.agentRunManager.restoreAgentRun(
            new AgentRunContext({
              runId: memberContext.memberRunId,
              config: memberRunConfig,
              runtimeContext: this.buildRestoreRuntimeContext(memberContext, memberRunConfig),
            }),
          )
        : await this.agentRunManager.createAgentRun(memberRunConfig, memberContext.memberRunId);

    memberContext.platformAgentRunId =
      memberRun.getPlatformAgentRunId() ?? memberContext.platformAgentRunId;
    this.memberRuns.set(memberRouteKey, memberRun);
    this.bindMemberRunEvents(memberContext, memberRun);
    this.publishTeamStatusIfChanged();
    return memberRun;
  }

  private buildRestoreRuntimeContext(
    memberContext: MixedTeamMemberContext,
    memberRunConfig: AgentRunConfig,
  ) {
    if (memberContext.runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
      return new CodexAgentRunContext({
        codexThreadConfig: buildCodexThreadConfig({
          model: memberRunConfig.llmModelIdentifier,
          workingDirectory: ".",
          reasoningEffort: null,
          approvalPolicy: resolveApprovalPolicyForAutoExecuteTools(
            memberRunConfig.autoExecuteTools,
          ),
          sandbox: "workspace-write",
          dynamicTools: null,
        }),
        threadId: memberContext.platformAgentRunId,
      });
    }

    if (memberContext.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
      return new ClaudeAgentRunContext({
        sessionConfig: buildClaudeSessionConfig({
          model: memberRunConfig.llmModelIdentifier,
          workingDirectory: ".",
          permissionMode: resolveClaudePermissionMode(memberRunConfig.autoExecuteTools),
        }),
        configuredToolExposure: buildConfiguredAgentToolExposure([]),
        memberTeamContext: memberRunConfig.memberTeamContext,
        sessionId: memberContext.platformAgentRunId,
      });
    }

    return null;
  }

  private async buildMemberRunConfig(
    memberContext: MixedTeamMemberContext,
  ): Promise<AgentRunConfig> {
    const teamContext = this.teamContext;
    const config = teamContext?.config;
    if (!teamContext || !config) {
      throw new Error("Mixed team context is not initialized.");
    }
    const baseMemberConfig = this.resolveMemberConfig(memberContext);
    const memberTeamContext = await this.memberTeamContextBuilder.build({
      teamRunId: teamContext.runId,
      teamDefinitionId: config.teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: memberContext.memberName,
      currentMemberRouteKey: memberContext.memberRouteKey,
      currentMemberRunId: memberContext.memberRunId,
      members: this.getRuntimeContext().memberContexts.map((member) => ({
        memberName: member.memberName,
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId,
        runtimeKind: member.runtimeKind,
      })),
      deliverInterAgentMessage: (request) => this.deliverInterAgentMessage(request),
    });

    return new AgentRunConfig({
      agentDefinitionId: baseMemberConfig.agentDefinitionId,
      llmModelIdentifier: baseMemberConfig.llmModelIdentifier,
      autoExecuteTools: baseMemberConfig.autoExecuteTools,
      workspaceId: baseMemberConfig.workspaceId,
      memoryDir: baseMemberConfig.memoryDir ?? null,
      llmConfig: baseMemberConfig.llmConfig,
      skillAccessMode: baseMemberConfig.skillAccessMode,
      runtimeKind: baseMemberConfig.runtimeKind,
      memberTeamContext,
      applicationExecutionContext: baseMemberConfig.applicationExecutionContext ?? null,
    });
  }

  private resolveMemberConfig(memberContext: MixedTeamMemberContext): TeamMemberRunConfig {
    const config = this.teamContext?.config;
    const matched =
      config?.memberConfigs.find((memberConfig) => memberConfig.memberRunId === memberContext.memberRunId) ??
      config?.memberConfigs.find((memberConfig) => memberConfig.memberRouteKey === memberContext.memberRouteKey) ??
      config?.memberConfigs.find((memberConfig) => memberConfig.memberName === memberContext.memberName) ??
      null;
    if (!matched) {
      throw new Error(`Missing member config for '${memberContext.memberName}'.`);
    }
    return matched;
  }

  private findMemberContextByName(targetMemberName: string): MixedTeamMemberContext | null {
    return (
      this.getRuntimeContext().memberContexts.find(
        (memberContext) => memberContext.memberName === targetMemberName,
      ) ?? null
    );
  }

  private findMemberContextByRouteKey(memberRouteKey: string): MixedTeamMemberContext | null {
    return (
      this.getRuntimeContext().memberContexts.find(
        (memberContext) => memberContext.memberRouteKey === memberRouteKey,
      ) ?? null
    );
  }

  private findMemberContextByRunId(memberRunId: string): MixedTeamMemberContext | null {
    return (
      this.getRuntimeContext().memberContexts.find(
        (memberContext) => memberContext.memberRunId === memberRunId,
      ) ?? null
    );
  }

  private resolveSenderMemberContext(senderRunId: string): MixedTeamMemberContext | null {
    const configuredMatch =
      this.findMemberContextByRunId(senderRunId) ??
      this.getRuntimeContext().memberContexts.find(
        (memberContext) => memberContext.platformAgentRunId === senderRunId,
      ) ??
      null;
    if (configuredMatch) {
      return configuredMatch;
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

  private getRuntimeContext(): MixedTeamRunContext {
    if (!this.teamContext) {
      throw new Error("Mixed team context is not initialized.");
    }
    return this.teamContext.runtimeContext;
  }

  private bindMemberRunEvents(
    memberContext: MixedTeamMemberContext,
    memberRun: AgentRun,
  ): void {
    const existingUnsubscribe = this.memberRunUnsubscribers.get(memberContext.memberRouteKey);
    existingUnsubscribe?.();

    const unsubscribe = memberRun.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event) || !this.teamContext) {
        return;
      }
      memberContext.platformAgentRunId =
        memberRun.getPlatformAgentRunId() ?? memberContext.platformAgentRunId;
      this.publishMemberAgentEvent(memberContext, event);
      this.publishTeamStatusIfChanged();
    });

    this.memberRunUnsubscribers.set(memberContext.memberRouteKey, unsubscribe);
  }

  private publishMemberAgentEvent(
    memberContext: MixedTeamMemberContext,
    agentEvent: AgentRunEvent,
  ): void {
    if (!this.teamContext) {
      return;
    }
    this.publish({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: this.teamContext.runId,
      data: {
        runtimeKind: memberContext.runtimeKind,
        memberName: memberContext.memberName,
        memberRunId: memberContext.memberRunId,
        agentEvent,
      } satisfies TeamRunAgentEventPayload,
    });
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

    for (const memberRun of this.memberRuns.values()) {
      if (!memberRun.isActive()) {
        continue;
      }
      hasActiveMember = true;
      const status = memberRun.getStatus()?.trim().toUpperCase() ?? null;
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

  private clearMemberSubscriptions(): void {
    for (const unsubscribe of this.memberRunUnsubscribers.values()) {
      unsubscribe();
    }
    this.memberRunUnsubscribers.clear();
  }

  private publish(event: TeamRunEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
