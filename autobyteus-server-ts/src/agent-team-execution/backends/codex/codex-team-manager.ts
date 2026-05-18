import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import {
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../../agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import { deriveTeamApiStatus } from "../../domain/team-status-aggregation.js";
import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import { AgentRunContext } from "../../../agent-execution/domain/agent-run-context.js";
import { CodexAgentRunContext } from "../../../agent-execution/backends/codex/backend/codex-agent-run-context.js";
import {
  buildCodexThreadConfig,
} from "../../../agent-execution/backends/codex/thread/codex-thread-config.js";
import { resolveApprovalPolicyForAutoExecuteTools } from "../../../agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamMemberRunConfig } from "../../domain/team-run-config.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunAgentEventPayload,
  type TeamRunStatusUpdateData,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
} from "../../domain/team-run-event.js";
import type {
  TeamManager,
} from "../team-manager.js";
import { CodexTeamMemberContext, CodexTeamRunContext } from "./codex-team-run-context.js";
import {
  buildInterAgentDeliveryInputMessage,
  buildInterAgentMessageAgentRunEvent,
} from "../../services/inter-agent-message-runtime-builders.js";
import { getMemberTeamContextBuilder, type MemberTeamContextBuilder } from "../../services/member-team-context-builder.js";
import { publishProcessedTeamAgentEvents } from "../../services/publish-processed-team-agent-events.js";
import { TeamCommandStatusOverlayStore } from "../../services/team-command-status-overlay-store.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import {
  resolveTeamMemberSelector,
  selectorToDisplayString,
  type TeamMemberSelector,
} from "../../domain/team-run-member-identity.js";

const buildRunNotFoundResult = (teamRunId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${teamRunId}' is not active.`,
});

const buildTargetMemberNotFoundResult = (target: string): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_NOT_FOUND",
  message: `Team member '${target}' was not found.`,
});

const buildTargetMemberRunMismatchResult = (
  targetMemberRouteKey: string,
  targetMemberRunId: string,
): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_RUN_MISMATCH",
  message: `Team member route key '${targetMemberRouteKey}' does not match member run '${targetMemberRunId}'.`,
});

const buildTargetMemberRunInactiveResult = (
  targetMemberRouteKey: string,
): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Team member route key '${targetMemberRouteKey}' is not active.`,
});

const buildPlaceholderThreadConfig = (memberContext: CodexTeamMemberContext) =>
  buildCodexThreadConfig({
    model: memberContext.agentRunConfig.llmModelIdentifier,
    workingDirectory: ".",
    reasoningEffort: null,
    serviceTier: null,
    approvalPolicy: resolveApprovalPolicyForAutoExecuteTools(
      memberContext.agentRunConfig.autoExecuteTools,
    ),
    sandbox: "workspace-write",
    dynamicTools: null,
  });

export class CodexTeamManager implements TeamManager {
  private readonly agentRunManager: AgentRunManager;
  private readonly memberTeamContextBuilder: MemberTeamContextBuilder;
  private teamContext: TeamRunContext<CodexTeamRunContext> | null;
  private readonly memberRuns = new Map<string, AgentRun>();
  private readonly memberRunUnsubscribers = new Map<string, () => void>();
  private readonly commandStatusOverlayStore: TeamCommandStatusOverlayStore;
  private readonly eventListeners = new Set<TeamRunEventListener>();
  private lastTeamStatus: string | null = "INITIALIZING";

  constructor(
    context: TeamRunContext<CodexTeamRunContext>,
    options: {
      agentRunManager?: AgentRunManager;
      memberTeamContextBuilder?: MemberTeamContextBuilder;
    } = {},
  ) {
    this.teamContext = context;
    this.agentRunManager = options.agentRunManager ?? AgentRunManager.getInstance();
    this.memberTeamContextBuilder =
      options.memberTeamContextBuilder ?? getMemberTeamContextBuilder();
    this.commandStatusOverlayStore = new TeamCommandStatusOverlayStore({
      getTeamRunId: () => this.teamContext?.runId ?? null,
      publishEvent: (event) => this.publish(event),
      publishTeamStatusIfChanged: () => this.publishTeamStatusIfChanged(),
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

    return runtimeContext.memberContexts.map((memberContext) => {
      const memberRun = this.memberRuns.get(memberContext.memberRouteKey) ?? null;
      const snapshot = this.commandStatusOverlayStore.getMemberStatusSnapshot({
        memberContext,
        fallback: () => memberRun?.getStatusSnapshot() ?? { status: "offline" as const, can_interrupt: false },
      });
      return {
        ...snapshot,
        agent_name: memberContext.memberName,
        agent_id: memberContext.memberRunId,
        member_route_key: memberContext.memberRouteKey,
        member_path: memberContext.memberPath,
        source_route_key: memberContext.memberRouteKey,
        source_path: memberContext.memberPath,
      };
    });
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
    const teamContext = this.teamContext;
    if (!teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const memberContext = this.resolveTargetMemberContext(target);
    if ("accepted" in memberContext) {
      return memberContext;
    }
    this.publishMemberCommandStatus(memberContext, "initializing");
    let result: AgentOperationResult;
    try { const memberRun = await this.ensureMemberReady(memberContext); result = await memberRun.postUserMessage(message); memberContext.threadId = memberRun.getPlatformAgentRunId() ?? memberContext.threadId; }
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
      memberContext.threadId = memberRun.getPlatformAgentRunId() ?? memberContext.threadId;
    } catch (error) { this.publishMemberCommandStatus(memberContext, "error", String(error)); throw error; }
    if (!result.accepted) this.publishMemberCommandStatus(memberContext, "error", result.message ?? null);
    if (result.accepted) {
      await publishProcessedTeamAgentEvents({
        teamRunId: teamContext.runId,
        runContext: memberRun.context,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
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
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const memberContext = this.resolveTargetMemberContext(target);
    if ("accepted" in memberContext) {
      return memberContext;
    }
    const memberRun = await this.ensureMemberReady(memberContext);
    return memberRun.approveToolInvocation(invocationId, approved, reason ?? null);
  }

  async interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.teamContext) {
      return buildRunNotFoundResult("unknown");
    }
    const normalizedTargetMemberRouteKey = targetMemberRouteKey.trim();
    const memberContext = this.findMemberContextByRouteKey(normalizedTargetMemberRouteKey);
    if (!memberContext) {
      return buildTargetMemberNotFoundResult(normalizedTargetMemberRouteKey);
    }
    const normalizedTargetMemberRunId = targetMemberRunId?.trim();
    if (
      normalizedTargetMemberRunId &&
      normalizedTargetMemberRunId !== memberContext.memberRunId
    ) {
      return buildTargetMemberRunMismatchResult(
        normalizedTargetMemberRouteKey,
        normalizedTargetMemberRunId,
      );
    }

    const memberRun = this.memberRuns.get(memberContext.memberRouteKey) ?? null;
    if (!memberRun?.isActive()) {
      return buildTargetMemberRunInactiveResult(normalizedTargetMemberRouteKey);
    }

    const result = await memberRun.interrupt();
    if (result.accepted) {
      this.publishTeamStatusIfChanged();
    }
    return result;
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
    this.commandStatusOverlayStore.clear();
    this.teamContext = null;
    this.eventListeners.clear();
    this.lastTeamStatus = null;
    return { accepted: true };
  }

  private async ensureMemberReady(
    memberContext: CodexTeamMemberContext,
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
      typeof memberContext.threadId === "string" && memberContext.threadId.trim().length > 0
        ? await this.agentRunManager.restoreAgentRun(
            new AgentRunContext({
              runId: memberContext.memberRunId,
              config: memberRunConfig,
              runtimeContext: new CodexAgentRunContext({
                codexThreadConfig: buildPlaceholderThreadConfig(memberContext),
                threadId: memberContext.threadId,
              }),
            }),
          )
        : await this.agentRunManager.createAgentRun(memberRunConfig, memberContext.memberRunId);

    memberContext.threadId = memberRun.getPlatformAgentRunId() ?? memberContext.threadId;
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
  ): CodexTeamMemberContext | AgentOperationResult {
    const runtimeContext = this.getRuntimeContext();
    const resolution = resolveTeamMemberSelector(target, runtimeContext.memberContexts);
    return resolution.ok
      ? resolution.member
      : buildTargetMemberNotFoundResult(
          `${resolution.message} Selector: '${selectorToDisplayString(target)}'`,
        );
  }

  private findMemberContextByRouteKey(memberRouteKey: string): CodexTeamMemberContext | null {
    const runtimeContext = this.getRuntimeContext();
    return (
      runtimeContext.memberContexts.find(
        (memberContext) => memberContext.memberRouteKey === memberRouteKey,
      ) ?? null
    );
  }

  private findMemberContextByRunId(memberRunId: string): CodexTeamMemberContext | null {
    const runtimeContext = this.getRuntimeContext();
    return (
      runtimeContext.memberContexts.find(
        (memberContext) => memberContext.memberRunId === memberRunId,
      ) ?? null
    );
  }

  private resolveSenderMemberContext(senderRunId: string): CodexTeamMemberContext | null {
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

  private getRuntimeContext(): CodexTeamRunContext {
    if (!this.teamContext) {
      throw new Error("Codex team context is not initialized.");
    }
    return this.teamContext.runtimeContext;
  }

  private resolveConfiguredMemberRunConfig(
    memberContext: CodexTeamMemberContext,
  ): TeamMemberRunConfig | null {
    const memberConfigs = this.teamContext?.config?.memberConfigs ?? [];
    return memberConfigs.find((memberConfig) => {
      const configuredRunId =
        typeof memberConfig.memberRunId === "string" && memberConfig.memberRunId.trim().length > 0
          ? memberConfig.memberRunId.trim()
          : null;
      if (configuredRunId) {
        return configuredRunId === memberContext.memberRunId;
      }
      return (memberConfig.memberRouteKey ?? memberConfig.memberName) === memberContext.memberRouteKey;
    }) ?? null;
  }

  private async buildMemberRunConfig(memberContext: CodexTeamMemberContext): Promise<AgentRunConfig> {
    const teamContext = this.teamContext;
    const config = teamContext?.config;
    if (!teamContext || !config) {
      throw new Error("Codex team context is not initialized.");
    }
    const configuredMemberRunConfig = this.resolveConfiguredMemberRunConfig(memberContext);
    const memberTeamContext = await this.memberTeamContextBuilder.build({
      teamRunId: teamContext.runId,
      teamDefinitionId: config.teamDefinitionId,
      teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
      currentMemberName: memberContext.memberName,
      currentMemberPath: memberContext.memberPath,
      currentMemberRouteKey: memberContext.memberRouteKey,
      currentMemberRunId: memberContext.memberRunId,
      members: this.getRuntimeContext().memberContexts.map((member) => ({
        memberKind: "agent" as const,
        memberName: member.memberName,
        memberPath: member.memberPath,
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId,
        runtimeKind: member.agentRunConfig.runtimeKind,
      })),
      deliverInterAgentMessage: (request) => this.deliverInterAgentMessage(request),
    });

    return new AgentRunConfig({
      agentDefinitionId: memberContext.agentRunConfig.agentDefinitionId,
      llmModelIdentifier: memberContext.agentRunConfig.llmModelIdentifier,
      autoExecuteTools: memberContext.agentRunConfig.autoExecuteTools,
      workspaceId: memberContext.agentRunConfig.workspaceId ?? configuredMemberRunConfig?.workspaceId ?? null,
      memoryDir: memberContext.agentRunConfig.memoryDir ?? configuredMemberRunConfig?.memoryDir ?? null,
      llmConfig: memberContext.agentRunConfig.llmConfig,
      skillAccessMode: memberContext.agentRunConfig.skillAccessMode,
      runtimeKind: memberContext.agentRunConfig.runtimeKind,
      memberTeamContext,
      applicationExecutionContext:
        memberContext.agentRunConfig.applicationExecutionContext
        ?? configuredMemberRunConfig?.applicationExecutionContext
        ?? null,
    });
  }

  private bindMemberRunEvents(
    memberContext: CodexTeamMemberContext,
    memberRun: AgentRun,
  ): void {
    const existingUnsubscribe = this.memberRunUnsubscribers.get(memberContext.memberRouteKey);
    existingUnsubscribe?.();

    const unsubscribe = memberRun.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event) || !this.teamContext) {
        return;
      }
      memberContext.threadId = memberRun.getPlatformAgentRunId() ?? memberContext.threadId;
      const teamEvent = this.buildMemberAgentEvent(memberContext, event);
      this.commandStatusOverlayStore.recordReplacementEvents([teamEvent]);
      this.publish(teamEvent);
      this.publishTeamStatusIfChanged();
    });

    this.memberRunUnsubscribers.set(memberContext.memberRouteKey, unsubscribe);
  }

  private buildMemberAgentEvent(
    memberContext: CodexTeamMemberContext,
    agentEvent: AgentRunEvent,
  ): TeamRunEvent {
    return {
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: this.teamContext?.runId ?? "",
      sourcePath: memberContext.memberPath,
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberName: memberContext.memberName,
        memberRunId: memberContext.memberRunId,
        memberPath: memberContext.memberPath,
        memberRouteKey: memberContext.memberRouteKey,
        agentEvent,
      } satisfies TeamRunAgentEventPayload,
    };
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

  private publishMemberCommandStatus(memberContext: CodexTeamMemberContext, status: "initializing" | "error", errorMessage: string | null = null): void {
    this.commandStatusOverlayStore.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
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

  private publish(event: TeamRunEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
