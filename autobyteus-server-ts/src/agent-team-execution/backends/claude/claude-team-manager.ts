import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import {
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../../agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
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
  type TeamRunAgentEventPayload,
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
  private teamContext: TeamRunContext<ClaudeTeamRunContext> | null;
  private readonly memberRuns = new Map<string, AgentRun>();
  private readonly memberRunUnsubscribers = new Map<string, () => void>();
  private readonly eventListeners = new Set<TeamRunEventListener>();
  private lastTeamStatus: string | null = "INITIALIZING";

  constructor(context: TeamRunContext<ClaudeTeamRunContext>) {
    this.teamContext = context;
    this.agentRunManager = AgentRunManager.getInstance();
    this.agentDefinitionService = AgentDefinitionService.getInstance();
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
    memberContext.sessionId = memberRun.getPlatformAgentRunId() ?? memberContext.sessionId;
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
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const memberContext = this.findMemberContextByName(request.recipientMemberName);
    if (!memberContext) {
      return buildTargetMemberNotFoundResult(request.recipientMemberName);
    }
    const memberRun = await this.ensureMemberReady(memberContext);
    const senderMemberName =
      request.senderMemberName ?? this.resolveSenderMemberContext(request.senderRunId)?.memberName ?? null;
    const normalizedRequest: InterAgentMessageDeliveryRequest = {
      ...request,
      senderMemberName,
    };
    const result = await memberRun.postUserMessage(
      buildInterAgentDeliveryInputMessage(normalizedRequest),
    );
    memberContext.sessionId = memberRun.getPlatformAgentRunId() ?? memberContext.sessionId;
    if (result.accepted) {
      this.publishMemberAgentEvent(
        memberContext,
        buildInterAgentMessageAgentRunEvent({
          recipientRunId: memberContext.memberRunId,
          request: normalizedRequest,
        }),
      );
    }
    this.publishTeamStatusIfChanged();
    return {
      ...result,
      memberRunId: memberContext.memberRunId,
      memberName: memberContext.memberName,
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
    const memberRunConfig = this.buildMemberRunConfig(memberContext);

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
                teamContext: null,
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

  private findMemberContextByName(targetMemberName: string): ClaudeTeamMemberContext | null {
    return (
      this.getRuntimeContext().memberContexts.find(
        (memberContext) => memberContext.memberName === targetMemberName,
      ) ?? null
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
    if (!this.teamContext || this.teamContext.runtimeKind !== RuntimeKind.CLAUDE_AGENT_SDK) {
      throw new Error("Claude team context is not initialized.");
    }
    return this.teamContext.runtimeContext;
  }

  private buildMemberRunConfig(memberContext: ClaudeTeamMemberContext): AgentRunConfig {
    return new AgentRunConfig({
      agentDefinitionId: memberContext.agentRunConfig.agentDefinitionId,
      llmModelIdentifier: memberContext.agentRunConfig.llmModelIdentifier,
      autoExecuteTools: memberContext.agentRunConfig.autoExecuteTools,
      workspaceId: memberContext.agentRunConfig.workspaceId,
      llmConfig: memberContext.agentRunConfig.llmConfig,
      skillAccessMode: memberContext.agentRunConfig.skillAccessMode,
      runtimeKind: memberContext.agentRunConfig.runtimeKind,
      teamContext: this.teamContext,
      applicationSessionContext: memberContext.agentRunConfig.applicationSessionContext,
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
      this.publishMemberAgentEvent(memberContext, event);
      this.publishTeamStatusIfChanged();
    });

    this.memberRunUnsubscribers.set(memberContext.memberRouteKey, unsubscribe);
  }

  private publishMemberAgentEvent(
    memberContext: ClaudeTeamMemberContext,
    agentEvent: AgentRunEvent,
  ): void {
    if (!this.teamContext) {
      return;
    }
    this.publish({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: this.teamContext.runId,
      data: {
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
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
