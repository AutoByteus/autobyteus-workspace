import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunConfig } from "../../../../agent-execution/domain/agent-run-config.js";
import type { AgentRun } from "../../../../agent-execution/domain/agent-run.js";
import { isAgentRunEvent } from "../../../../agent-execution/domain/agent-run-event.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../../../agent-execution/input/agent-run-input-contract.js";
import { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import { getAgentMemoryLocationService } from "../../../../agent-memory/services/agent-memory-location-service.js";
import { getAgentToolMcpSessionService } from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import { buildFilesystemWorkspaceId } from "../../../../workspaces/workspace-registry-store.js";
import type { ApplicationExecutionContext } from "../../../../application-orchestration/domain/models.js";
import type { InterAgentMessageDeliveryIntent } from "../../../domain/inter-agent-message-delivery.js";
import type { PreparedLocalExecutionTermination } from "../../../domain/prepared-local-execution-termination.js";
import { createTeamAgentExecutionBinding } from "../../../domain/team-agent-execution-binding.js";
import type { TeamMemberExecutionIdentity } from "../../../domain/team-member-execution-identity.js";
import type { TeamRunAgentNode } from "../../../domain/team-run-config.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import { TeamRunEventSourceType } from "../../../domain/team-run-event.js";
import { createTeamMemberExecutionIdentity } from "../../../domain/team-member-execution-identity.js";
import { getMemberTeamContextBuilder, type MemberTeamContextBuilder } from "../../../services/member-team-context-builder.js";
import { MemberCommandStatusOverlayStore } from "../../../services/member-command-status-overlay-store.js";
import { TeamAgentEventAdapter } from "../../../services/team-agent-event-adapter.js";
import { buildTeamMemberInputEventPayload } from "../../../services/team-member-input-event-builder.js";
import { buildTaskDelegationSystemTaskNotificationEvent, isTaskDelegationSystemTaskNotificationMessage } from "../../../task-delegation/task-delegation-system-message-visibility.js";
import type { MixedAgentMemberContext, MixedTeamRunContext } from "../mixed-team-run-context.js";
import type { MixedTeamEventPublish } from "./mixed-team-member-handle.js";

export class MixedAgentMemberHandle {
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
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
    resolveIdentityByAgentRunId?: (agentRunId: string) => TeamMemberExecutionIdentity | null;
  }) {
    this.context = options.context;
    this.overlay = new MemberCommandStatusOverlayStore({ publishEvent: options.publish });
  }

  isActive(): boolean { return this.agentRun?.isActive() ?? false; }
  hasOpenExecutionWork(): boolean { return ["initializing", "running", "error"].includes(this.statusSnapshot().details.status); }
  getLeafAgentStatusSnapshots() { return [this.statusSnapshot()]; }
  getOrCreateAgentRun(): Promise<AgentRun> { return this.ensureReady(); }

  async reserveInput(message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    return (await this.ensureReady()).reserveUserMessage(message, options);
  }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    this.publishCommandStatus("initializing");
    try {
      const run = await this.ensureReady();
      const result = await run.postUserMessage(message);
      this.capturePlatformRunId(run);
      if (result.accepted) {
        if (isTaskDelegationSystemTaskNotificationMessage(message)) {
          await run.publishEvent(buildTaskDelegationSystemTaskNotificationEvent(run.runId, message));
        } else {
          this.options.publish({
            eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
            agentRunId: run.runId,
            payload: buildTeamMemberInputEventPayload({
              rootTeamRunId: this.options.teamContext.rootTeamRunId,
              recipientAgentRunId: run.runId,
              message,
            }),
          });
        }
      } else this.publishCommandStatus("error", result.message ?? null);
      return { ...result, agentRunId: run.runId, displayName: this.displayName() };
    } catch (error) {
      this.publishCommandStatus("error", String(error));
      throw error;
    }
  }

  async approveToolInvocation(invocationId: string, approved: boolean, reason: string | null = null): Promise<AgentOperationResult> {
    return (await this.ensureReady()).approveToolInvocation(invocationId, approved, reason);
  }
  async interrupt(): Promise<AgentOperationResult> { return this.agentRun ? this.agentRun.interrupt() : { accepted: true }; }
  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    const run = this.agentRun;
    const prepared = run ? await run.prepareTermination() : null;
    let state: "prepared" | "cancelled" | "committed" = "prepared";
    let committed: ReturnType<PreparedLocalExecutionTermination["commit"]> | null = null;
    return Object.freeze({
      cancel: () => {
        if (state !== "prepared") return;
        state = "cancelled";
        prepared?.cancel();
      },
      commit: () => {
        if (state === "cancelled") throw new Error(`AgentRun '${this.context.agentRunId}' termination preparation was cancelled.`);
        if (committed) return committed;
        state = "committed";
        const agentTermination = prepared?.commit() ?? null;
        committed = Object.freeze({
          finish: async () => {
            const result = agentTermination ? await agentTermination.finish() : { accepted: true as const };
            if (result.accepted) this.dispose();
            return result;
          },
        });
        return committed;
      },
    });
  }
  async terminate(): Promise<AgentOperationResult> {
    const prepared = await this.prepareTermination();
    return prepared.commit().finish();
  }
  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    getAgentToolMcpSessionService().revokeAgentToolMcpSessionsForAgentRun(this.context.agentRunId);
    this.agentRun = null;
    this.overlay.clear();
  }

  private identity(): TeamMemberExecutionIdentity {
    return createTeamMemberExecutionIdentity({
      rootTeamRunId: this.options.teamContext.rootTeamRunId,
      memberAddress: this.context.address,
      agentRunId: this.context.agentRunId,
    });
  }
  private binding() { return createTeamAgentExecutionBinding(this.identity()); }
  private statusSnapshot() {
    return this.overlay.getMemberStatusSnapshot({
      binding: this.binding(),
      fallback: () => this.agentRun?.getStatusSnapshot() ?? { status: "offline" },
    });
  }
  private displayName(): string { return getAgentTeamAddressBasename(this.context.address) ?? this.context.agentRunId; }
  private capturePlatformRunId(run: AgentRun): void {
    this.context.platformAgentRunId = run.getPlatformAgentRunId() ?? this.context.platformAgentRunId;
  }

  private async ensureReady(): Promise<AgentRun> {
    if (this.agentRun?.isActive()) return this.agentRun;
    this.unsubscribe?.();
    const manager = this.options.agentRunManager ?? AgentRunManager.getInstance();
    const config = await this.buildAgentRunConfig();
    this.agentRun = this.context.platformAgentRunId
      ? await manager.restoreAgentRunFromPlatformState({ runId: this.context.agentRunId, config, platformAgentRunId: this.context.platformAgentRunId })
      : await manager.createAgentRun(config, this.context.agentRunId);
    this.capturePlatformRunId(this.agentRun);
    this.bindEvents(this.agentRun);
    return this.agentRun;
  }

  private async buildAgentRunConfig(): Promise<AgentRunConfig> {
    const node = this.options.config;
    const memberTeamContext = await (this.options.memberTeamContextBuilder ?? getMemberTeamContextBuilder()).build({
      teamContext: this.options.teamContext,
      agentNode: node,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
    });
    return new AgentRunConfig({
      agentDefinitionId: node.agentDefinitionId,
      llmModelIdentifier: node.llmModelIdentifier,
      autoExecuteTools: node.autoExecuteTools,
      workspaceId: node.workspaceRootPath ? buildFilesystemWorkspaceId(node.workspaceRootPath) : null,
      memoryDir: getAgentMemoryLocationService().getTeamAgentRunLocation({
        rootTeamRunId: this.options.teamContext.rootTeamRunId,
        ancestorTeamRunIds: [],
        agentRunId: this.context.agentRunId,
      }).memoryDir,
      llmConfig: node.llmConfig as Record<string, unknown> | null,
      skillAccessMode: node.skillAccessMode,
      runtimeKind: node.runtimeKind,
      memberTeamContext,
      applicationExecutionContext: this.applicationExecutionContext(),
    });
  }

  private applicationExecutionContext(): ApplicationExecutionContext | null {
    const binding = this.options.teamContext.applicationBinding;
    if (!binding) return null;
    return Object.freeze({
      applicationId: binding.applicationId,
      bindingId: binding.bindingId,
      producer: Object.freeze({
        agentRunId: this.context.agentRunId,
        displayName: this.displayName(),
        runtimeKind: "AGENT_TEAM_MEMBER" as const,
      }),
    });
  }

  private bindEvents(run: AgentRun): void {
    this.unsubscribe?.();
    this.unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event)) return;
      this.capturePlatformRunId(run);
      if (event.runId !== this.context.agentRunId) throw new Error(`AgentRun event '${event.runId}' does not match '${this.context.agentRunId}'.`);
      const binding = this.binding();
      const result = new TeamAgentEventAdapter((agentRunId) =>
        agentRunId === binding.agentRunId ? binding : this.options.resolveIdentityByAgentRunId?.(agentRunId) ?? null,
      ).adapt(event);
      if (result.kind === "filtered_collaboration_duplicate") return;
      const payload = result.kind === "publish" ? result.event : {
        eventType: "ERROR" as const,
        details: Object.freeze({ code: result.code, message: result.message, errorScope: "runtime" as const, errorEffect: "terminal" as const, turnId: null }),
        statusHint: "ERROR" as const,
      };
      this.options.publish({ eventSourceType: TeamRunEventSourceType.AGENT, execution: binding, payload });
      if (payload.eventType === "AGENT_STATUS") this.overlay.clearAcceptedLiveStatus(binding);
    });
  }

  private publishCommandStatus(status: "initializing" | "error", errorMessage: string | null = null): void {
    if (this.agentRun) return;
    this.overlay.publishMemberCommandStatus({
      binding: this.binding(), status, errorMessage,
      currentStatus: () => this.statusSnapshot().details.status,
    });
  }
}
