import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { buildConfiguredAgentToolExposure } from "../../../../agent-execution/shared/configured-agent-tool-exposure.js";
import { AgentRunConfig } from "../../../../agent-execution/domain/agent-run-config.js";
import type { AgentRun } from "../../../../agent-execution/domain/agent-run.js";
import { AgentRunContext } from "../../../../agent-execution/domain/agent-run-context.js";
import { isAgentRunEvent } from "../../../../agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import { CodexAgentRunContext } from "../../../../agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { buildCodexThreadConfig } from "../../../../agent-execution/backends/codex/thread/codex-thread-config.js";
import { resolveApprovalPolicyForAutoExecuteTools } from "../../../../agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { ClaudeAgentRunContext } from "../../../../agent-execution/backends/claude/backend/claude-agent-run-context.js";
import {
  buildClaudeSessionConfig,
  resolveClaudePermissionMode,
} from "../../../../agent-execution/backends/claude/session/claude-session-config.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import type { TeamMemberSelector } from "../../../domain/team-run-member-identity.js";
import { TeamRunEventSourceType, type TeamRunAgentEventPayload } from "../../../domain/team-run-event.js";
import type { TeamMemberRunConfig } from "../../../domain/team-run-config.js";
import { TeamBackendKind } from "../../../domain/team-backend-kind.js";
import { getMemberTeamContextBuilder, type MemberTeamContextBuilder } from "../../../services/member-team-context-builder.js";
import { getInterAgentMessageRouter, type InterAgentMessageRouter } from "../../../services/inter-agent-message-router.js";
import { publishProcessedTeamAgentEvents } from "../../../services/publish-processed-team-agent-events.js";
import { buildInterAgentMessageAgentRunEvent } from "../../../services/inter-agent-message-runtime-builders.js";
import type { MixedTeamRunContext, MixedAgentMemberContext } from "../mixed-team-run-context.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle, MixedTeamStatusChange } from "./mixed-team-member-handle.js";

export class MixedAgentMemberHandle implements MixedTeamMemberHandle {
  readonly context: MixedAgentMemberContext;
  private agentRun: AgentRun | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    context: MixedAgentMemberContext;
    config: TeamMemberRunConfig;
    agentRunManager?: AgentRunManager;
    memberTeamContextBuilder?: MemberTeamContextBuilder;
    interAgentMessageRouter?: InterAgentMessageRouter;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryRequest) => Promise<AgentOperationResult>;
  }) {
    this.context = options.context;
  }

  isActive(): boolean {
    return this.agentRun?.isActive() ?? false;
  }

  getStatus(): string | null {
    return this.agentRun?.getStatus() ?? null;
  }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    const run = await this.ensureReady();
    const result = await run.postUserMessage(message);
    this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
    this.options.notifyStatusChange();
    return { ...result, memberRunId: this.context.memberRunId, memberName: this.context.memberName };
  }

  async deliverInterMemberMessage(request: InterAgentMessageDeliveryRequest): Promise<AgentOperationResult> {
    const run = await this.ensureReady();
    const result = await (this.options.interAgentMessageRouter ?? getInterAgentMessageRouter()).deliver({
      recipientRun: run,
      request,
    });
    this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
    if (result.accepted) {
      await publishProcessedTeamAgentEvents({
        teamRunId: this.options.teamContext.runId,
        runContext: run.context,
        runtimeKind: this.context.runtimeKind,
        memberName: this.context.memberName,
        memberRunId: this.context.memberRunId,
        sourcePath: this.context.memberPath,
        agentEvents: [buildInterAgentMessageAgentRunEvent({ recipientRunId: this.context.memberRunId, request })],
        publishTeamEvent: this.options.publish,
      });
    }
    this.options.notifyStatusChange();
    return { ...result, memberRunId: this.context.memberRunId, memberName: this.context.memberName };
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

  async interrupt(): Promise<AgentOperationResult> {
    return this.agentRun ? this.agentRun.interrupt() : { accepted: true };
  }

  async terminate(): Promise<AgentOperationResult> {
    const result = this.agentRun ? await this.agentRun.terminate() : { accepted: true };
    this.dispose();
    return result;
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.agentRun = null;
  }

  private async ensureReady(): Promise<AgentRun> {
    if (this.agentRun?.isActive()) {
      return this.agentRun;
    }
    this.dispose();
    const memberRunConfig = await this.buildMemberRunConfig();
    const manager = this.options.agentRunManager ?? AgentRunManager.getInstance();
    this.agentRun = typeof this.context.platformAgentRunId === "string" && this.context.platformAgentRunId.trim().length > 0
      ? await manager.restoreAgentRun(new AgentRunContext({
          runId: this.context.memberRunId,
          config: memberRunConfig,
          runtimeContext: this.buildRestoreRuntimeContext(memberRunConfig),
        }))
      : await manager.createAgentRun(memberRunConfig, this.context.memberRunId);
    this.context.platformAgentRunId = this.agentRun.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
    this.bindEvents(this.agentRun);
    this.options.notifyStatusChange();
    return this.agentRun;
  }

  private buildRestoreRuntimeContext(memberRunConfig: AgentRunConfig) {
    if (this.context.runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
      return new CodexAgentRunContext({
        codexThreadConfig: buildCodexThreadConfig({
          model: memberRunConfig.llmModelIdentifier,
          workingDirectory: ".",
          reasoningEffort: null,
          serviceTier: null,
          approvalPolicy: resolveApprovalPolicyForAutoExecuteTools(memberRunConfig.autoExecuteTools),
          sandbox: "workspace-write",
          dynamicTools: null,
        }),
        threadId: this.context.platformAgentRunId,
      });
    }
    if (this.context.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
      return new ClaudeAgentRunContext({
        sessionConfig: buildClaudeSessionConfig({
          model: memberRunConfig.llmModelIdentifier,
          workingDirectory: ".",
          permissionMode: resolveClaudePermissionMode(memberRunConfig.autoExecuteTools),
        }),
        configuredToolExposure: buildConfiguredAgentToolExposure([]),
        memberTeamContext: memberRunConfig.memberTeamContext,
        sessionId: this.context.platformAgentRunId,
      });
    }
    return null;
  }

  private async buildMemberRunConfig(): Promise<AgentRunConfig> {
    const memberTeamContext = await (this.options.memberTeamContextBuilder ?? getMemberTeamContextBuilder()).build({
      teamRunId: this.options.teamContext.runId,
      teamDefinitionId: this.options.teamContext.config?.teamDefinitionId ?? "",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: this.context.memberName,
      currentMemberPath: this.context.memberPath,
      currentMemberRouteKey: this.context.memberRouteKey,
      currentMemberRunId: this.context.memberRunId,
      members: this.options.teamContext.runtimeContext.memberContexts.map((member) => {
        if (member.memberKind === "agent_team") {
          return {
            memberKind: "agent_team" as const,
            memberName: member.memberName,
            memberPath: member.memberPath,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            teamDefinitionId: member.teamDefinitionId,
            coordinatorMemberRouteKey: null,
          };
        }
        return {
          memberKind: "agent" as const,
          memberName: member.memberName,
          memberPath: member.memberPath,
          memberRouteKey: member.memberRouteKey,
          memberRunId: member.memberRunId,
          runtimeKind: member.runtimeKind,
        };
      }),
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
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

  private bindEvents(run: AgentRun): void {
    this.unsubscribe?.();
    this.unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
      this.options.publish({
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
        } satisfies TeamRunAgentEventPayload,
      });
      this.options.notifyStatusChange();
    });
  }
}
