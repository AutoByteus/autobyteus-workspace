import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { getAgentTeamAddressBasename, getParentAgentTeamAddress, type AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import { AgentRunConfig } from "../../../../agent-execution/domain/agent-run-config.js";
import type { AgentRun } from "../../../../agent-execution/domain/agent-run.js";
import { isAgentRunEvent } from "../../../../agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import { getAgentToolMcpSessionService } from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import { buildFilesystemWorkspaceId } from "../../../../workspaces/workspace-registry-store.js";
import { getAgentMemoryLocationService } from "../../../../agent-memory/services/agent-memory-location-service.js";
import {
  assertPersistentApplicationExecutionContext,
  rebindApplicationExecutionContext,
} from "../../../../application-orchestration/domain/application-execution-context.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryIntent, ResolvedInterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import type { TeamRunAgentNode } from "../../../domain/team-run-config.js";
import { createTeamAgentExecutionBinding, type TeamAgentExecutionBinding } from "../../../domain/team-agent-execution-binding.js";
import { TeamRunEventSourceType, type TeamRunMemberInputEventPayload } from "../../../domain/team-run-event.js";
import { getMemberTeamContextBuilder, type MemberTeamContextBuilder } from "../../../services/member-team-context-builder.js";
import { getInterAgentMessageRouter, type InterAgentMessageRouter } from "../../../services/inter-agent-message-router.js";
import { buildInterAgentDeliveryInputMessage } from "../../../services/inter-agent-message-runtime-builders.js";
import { buildTeamMemberInputEventPayload } from "../../../services/team-member-input-event-builder.js";
import { MemberCommandStatusOverlayStore } from "../../../services/member-command-status-overlay-store.js";
import { TeamAgentEventAdapter } from "../../../services/team-agent-event-adapter.js";
import { buildTaskDelegationSystemTaskNotificationEvent, isTaskDelegationSystemTaskNotificationMessage } from "../../../task-delegation/task-delegation-system-message-visibility.js";
import type { MixedAgentMemberContext, MixedTeamRunContext } from "../mixed-team-run-context.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle } from "./mixed-team-member-handle.js";

const displayNameFor = (context: MixedAgentMemberContext): string =>
  getAgentTeamAddressBasename(context.address) ?? context.agentRunId;

export class MixedAgentMemberHandle implements MixedTeamMemberHandle {
  readonly context: MixedAgentMemberContext;
  private agentRun: AgentRun | null = null;
  private unsubscribe: (() => void) | null = null;
  private readonly overlay: MemberCommandStatusOverlayStore;

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    context: MixedAgentMemberContext;
    config: TeamRunAgentNode;
    agentRunManager?: AgentRunManager;
    memberTeamContextBuilder?: MemberTeamContextBuilder;
    interAgentMessageRouter?: InterAgentMessageRouter;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
    taskId?: string | null;
  }) {
    this.context = options.context;
    this.overlay = new MemberCommandStatusOverlayStore({
      publishEvent: options.publish,
    });
  }

  isActive(): boolean { return this.agentRun?.isActive() ?? false; }

  private statusSnapshot() {
    return this.overlay.getMemberStatusSnapshot({
      binding: this.executionBinding(),
      fallback: () => this.agentRun?.getStatusSnapshot() ?? { status: "offline" },
    });
  }

  getLeafAgentStatusSnapshots() {
    return [this.statusSnapshot()];
  }

  hasOpenExecutionWork(): boolean {
    return ["initializing", "running", "error"].includes(this.statusSnapshot().details.status);
  }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    this.publishCommandStatus("initializing");
    try {
      const run = await this.ensureReady();
      const result = await run.postUserMessage(message);
      this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
      if (result.accepted) {
        if (isTaskDelegationSystemTaskNotificationMessage(message)) {
          await run.publishEvent(buildTaskDelegationSystemTaskNotificationEvent(run.runId, message));
        } else this.publishMemberInput(message);
      } else this.publishCommandStatus("error", result.message ?? null);
      return { ...result, agentRunId: this.context.agentRunId, displayName: displayNameFor(this.context) };
    } catch (error) {
      this.publishCommandStatus("error", String(error));
      throw error;
    }
  }

  async postMessageToAddress(message: AgentInputUserMessage, target: AgentTeamAddress, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    if (target !== this.context.address) return { accepted: false, code: "TARGET_MEMBER_NOT_FOUND", message: `Agent '${this.context.address}' cannot route '${target}'.` };
    const requested = targetAgentRunId?.trim();
    if (requested && requested !== this.context.agentRunId) return { accepted: false, code: "TARGET_AGENT_RUN_MISMATCH", message: `Agent '${target}' does not own AgentRun '${requested}'.` };
    return this.postMessage(message);
  }

  async deliverInterMemberMessage(request: ResolvedInterAgentMessageDeliveryRequest, beforePublishMemberInput: (() => void) | null = null): Promise<AgentOperationResult> {
    if (request.receiverAddress.memberAddress !== this.context.address) return {
      accepted: false,
      code: "COLLABORATION_TARGET_NOT_FOUND",
      message: `Agent '${this.context.address}' cannot receive collaboration delivery for '${request.receiverAddress.memberAddress}'.`,
    };
    const targetsTaskAgent = request.resolvedTargetKind === "task_agent_run";
    if (
      targetsTaskAgent &&
      (!this.options.taskId || request.receiverAddress.taskAgentRunId !== this.context.agentRunId)
    ) return {
      accepted: false,
      code: "TASK_AGENT_IDENTITY_MISMATCH",
      message: `Task AgentRun '${request.targetAgentRunId}' does not match the resolved task execution address.`,
    };
    if (
      !targetsTaskAgent &&
      (this.options.taskId || request.receiverAddress.taskAgentRunId !== null)
    ) return {
      accepted: false,
      code: "TARGET_AGENT_RUN_MISMATCH",
      message: `AgentRun '${request.targetAgentRunId}' is not the persistent AgentRun for '${this.context.address}'.`,
    };
    if (request.targetAgentRunId.trim() !== this.context.agentRunId) return {
      accepted: false,
      code: "TARGET_AGENT_RUN_MISMATCH",
      message: `Agent '${this.context.address}' does not own AgentRun '${request.targetAgentRunId}'.`,
    };
    this.publishCommandStatus("initializing");
    const run = await this.ensureReady();
    const result = await (this.options.interAgentMessageRouter ?? getInterAgentMessageRouter()).deliver({ recipientRun: run, request });
    this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
    if (result.accepted) {
      beforePublishMemberInput?.();
      this.publishMemberInput(buildInterAgentDeliveryInputMessage(request));
    } else this.publishCommandStatus("error", result.message ?? null);
    return { ...result, agentRunId: this.context.agentRunId, displayName: displayNameFor(this.context) };
  }

  async approveToolInvocation(_target: AgentTeamAddress | null, invocationId: string, approved: boolean, reason: string | null = null): Promise<AgentOperationResult> {
    return (await this.ensureReady()).approveToolInvocation(invocationId, approved, reason);
  }

  async interrupt(_target: AgentTeamAddress | null, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    const target = targetAgentRunId?.trim();
    if (target && target !== this.context.agentRunId) return {
      accepted: false,
      code: "TARGET_AGENT_RUN_MISMATCH",
      message: `Agent '${this.context.address}' does not own AgentRun '${target}'.`,
    };
    return this.agentRun ? this.agentRun.interrupt() : { accepted: true };
  }

  async terminate(): Promise<AgentOperationResult> {
    const result = this.agentRun ? await this.agentRun.terminate() : { accepted: true };
    if (result.accepted) this.dispose();
    return result;
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    getAgentToolMcpSessionService().revokeAgentToolMcpSessionsForAgentRun(this.context.agentRunId);
    this.agentRun = null;
    this.overlay.clear();
  }

  adoptExistingRun(run: AgentRun): void {
    this.unsubscribe?.();
    this.agentRun = run;
    this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
    this.bindEvents(run);
  }

  releaseExistingRunForAdoption(): AgentRun | null {
    const run = this.agentRun;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.agentRun = null;
    this.overlay.clear();
    return run;
  }

  private async ensureReady(): Promise<AgentRun> {
    if (this.agentRun?.isActive()) return this.agentRun;
    this.unsubscribe?.();
    const manager = this.options.agentRunManager ?? AgentRunManager.getInstance();
    const config = await this.buildAgentRunConfig();
    this.agentRun = this.context.platformAgentRunId
      ? await manager.restoreAgentRunFromPlatformState({ runId: this.context.agentRunId, config, platformAgentRunId: this.context.platformAgentRunId })
      : await manager.createAgentRun(config, this.context.agentRunId);
    this.context.platformAgentRunId = this.agentRun.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
    this.bindEvents(this.agentRun);
    return this.agentRun;
  }

  private async buildAgentRunConfig(): Promise<AgentRunConfig> {
    const node = this.options.config;
    const memberTeamContext = await (this.options.memberTeamContextBuilder ?? getMemberTeamContextBuilder()).build({
      teamContext: this.options.teamContext,
      agentNode: node,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskId: this.options.taskId ?? this.options.teamContext.runtimeContext.taskId,
    });
    const rootTeamRunId = this.options.teamContext.config.rootTeam.teamRunId;
    const memoryDir = getAgentMemoryLocationService().getTeamAgentRunLocation({
      rootTeamRunId,
      ancestorTeamRunIds: this.ancestorTeamRunIds(),
      agentRunId: this.context.agentRunId,
    }).memoryDir;
    const executionAddress = this.executionAddress();
    const applicationExecutionContext = node.applicationExecutionContext
      ? executionAddress.taskAgentRunId !== null || executionAddress.taskTeamRunIds.length > 0
        ? rebindApplicationExecutionContext(node.applicationExecutionContext, executionAddress)
        : assertPersistentApplicationExecutionContext(node.applicationExecutionContext, executionAddress)
      : null;
    return new AgentRunConfig({
      agentDefinitionId: node.agentDefinitionId,
      llmModelIdentifier: node.llmModelIdentifier,
      autoExecuteTools: node.autoExecuteTools,
      workspaceId: node.workspaceRootPath ? buildFilesystemWorkspaceId(node.workspaceRootPath) : null,
      memoryDir,
      llmConfig: node.llmConfig as Record<string, unknown> | null,
      skillAccessMode: node.skillAccessMode,
      runtimeKind: node.runtimeKind,
      memberTeamContext,
      applicationExecutionContext,
    });
  }

  private ancestorTeamRunIds(): string[] {
    const ids: string[] = [];
    let address = getParentAgentTeamAddress(this.context.address);
    while (address && address !== "/") {
      const team = this.options.teamContext.index.getTeam(address);
      if (!team) throw new Error(`Missing ancestor AgentTeam '${address}'.`);
      ids.unshift(team.teamRunId);
      address = getParentAgentTeamAddress(address);
    }
    return ids;
  }

  private executionAddress() {
    return {
      ...this.options.teamContext.runtimeContext.teamExecutionAddress,
      memberAddress: this.context.address,
      taskAgentRunId: this.options.taskId ? this.context.agentRunId : null,
    };
  }

  private executionBinding(): TeamAgentExecutionBinding {
    return createTeamAgentExecutionBinding({
      executionAddress: this.executionAddress(),
      agentRunId: this.context.agentRunId,
    });
  }

  private publishMemberInput(message: AgentInputUserMessage): void {
    const payload = buildTeamMemberInputEventPayload({
      teamRunId: this.options.teamContext.config.rootTeam.teamRunId,
      memberContext: this.context,
      executionAddress: this.executionAddress(),
      message,
    }) satisfies TeamRunMemberInputEventPayload;
    this.options.publish({
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
      executionAddress: this.executionAddress(),
      payload,
    });
  }

  private bindEvents(run: AgentRun): void {
    this.unsubscribe?.();
    this.unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event)) return;
      this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
      if (event.runId !== this.context.agentRunId) {
        throw new Error(`AgentRun event '${event.runId}' does not match Team Agent binding '${this.context.agentRunId}'.`);
      }
      const execution = this.executionBinding();
      const result = new TeamAgentEventAdapter((agentRunId) => this.resolveExecutionAddressByAgentRunId(agentRunId)).adapt(event);
      if (result.kind === "filtered_collaboration_duplicate") return;
      const payload = result.kind === "publish" ? result.event : {
        eventType: "ERROR" as const,
        details: Object.freeze({ code: result.code, message: result.message }),
        statusHint: "ERROR" as const,
      };
      this.options.publish({ eventSourceType: TeamRunEventSourceType.AGENT, execution, payload });
      if (payload.eventType === "AGENT_STATUS") this.overlay.clearAcceptedLiveStatus(execution);
    });
  }

  private resolveExecutionAddressByAgentRunId(agentRunId: string) {
    if (agentRunId === this.context.agentRunId) return this.executionAddress();
    const node = this.options.teamContext.index.listNodes().find((candidate) =>
      candidate.kind === "agent" && candidate.agentRunId === agentRunId,
    );
    return node?.kind === "agent"
      ? { ...this.options.teamContext.runtimeContext.teamExecutionAddress, memberAddress: node.address, taskAgentRunId: null }
      : null;
  }

  private publishCommandStatus(status: "initializing" | "error", errorMessage: string | null = null): void {
    if (this.agentRun) return;
    this.overlay.publishMemberCommandStatus({
      binding: this.executionBinding(),
      status,
      errorMessage,
      currentStatus: () => this.statusSnapshot().details.status,
    });
  }
}
