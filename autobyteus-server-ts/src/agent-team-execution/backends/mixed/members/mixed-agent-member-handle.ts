import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunConfig } from "../../../../agent-execution/domain/agent-run-config.js";
import type { AgentRun } from "../../../../agent-execution/domain/agent-run.js";
import { isAgentRunEvent } from "../../../../agent-execution/domain/agent-run-event.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../../../agent-execution/input/agent-run-input-contract.js";
import { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import type { AgentRunActivationCandidate } from "../../../../agent-execution/services/agent-run-activation-candidate.js";
import { AgentRunActivationError, isAgentRunActivationQuarantineError } from "../../../../agent-execution/errors.js";
import { isExternalProviderRuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import { getAgentMemoryLocationService } from "../../../../agent-memory/services/agent-memory-location-service.js";
import {
  getAgentConversationActivityInspector,
  type AgentConversationActivityInspector,
} from "../../../../agent-memory/services/agent-conversation-activity-inspector.js";
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
import {
  createTeamAgentPlatformBinding,
  TeamAgentPlatformBindingError,
  type TeamAgentPlatformBinding,
} from "../../../domain/team-agent-platform-binding.js";
import { getMemberTeamContextBuilder, type MemberTeamContextBuilder } from "../../../services/member-team-context-builder.js";
import { MemberCommandStatusOverlayStore } from "../../../services/member-command-status-overlay-store.js";
import { TeamAgentEventAdapter } from "../../../services/team-agent-event-adapter.js";
import { buildTeamMemberInputEventPayload } from "../../../services/team-member-input-event-builder.js";
import { buildTaskDelegationSystemTaskNotificationEvent, isTaskDelegationSystemTaskNotificationMessage } from "../../../task-delegation/task-delegation-system-message-visibility.js";
import type { MixedAgentMemberContext, MixedTeamRunContext } from "../mixed-team-run-context.js";
import type { MixedTeamEventPublish } from "./mixed-team-member-handle.js";

export type PreparedMixedTaskAgentActivation = Readonly<{
  stagedPlatformBindings: readonly TeamAgentPlatformBinding[];
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

export class MixedAgentMemberHandle {
  readonly context: MixedAgentMemberContext;
  private agentRun: AgentRun | null = null;
  private readinessAttempt: Promise<AgentRun> | null = null;
  private unsubscribe: (() => void) | null = null;
  private readonly overlay: MemberCommandStatusOverlayStore;

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    context: MixedAgentMemberContext;
    config: TeamRunAgentNode;
    agentRunManager?: AgentRunManager;
    activityInspector?: AgentConversationActivityInspector;
    memberTeamContextBuilder?: MemberTeamContextBuilder;
    publish: MixedTeamEventPublish;
    acceptPlatformBinding: (binding: TeamAgentPlatformBinding) => Promise<void>;
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
      this.publishCommandStatus("error", error instanceof Error ? error.message : String(error));
      if (!this.agentRun?.isActive()) {
        return {
          accepted: false,
          code: this.readinessFailureCode(error),
          message: error instanceof Error ? error.message : String(error),
          agentRunId: this.context.agentRunId,
          displayName: this.displayName(),
        };
      }
      throw error;
    }
  }

  async approveToolInvocation(invocationId: string, approved: boolean, reason: string | null = null): Promise<AgentOperationResult> {
    return (await this.ensureReady()).approveToolInvocation(invocationId, approved, reason);
  }
  async interrupt(): Promise<AgentOperationResult> { return this.agentRun ? this.agentRun.interrupt() : { accepted: true }; }

  async prepareForTaskActivation(): Promise<PreparedMixedTaskAgentActivation> {
    if (this.agentRun || this.readinessAttempt) {
      throw new Error(`Task AgentRun '${this.context.agentRunId}' already entered live readiness.`);
    }
    const config = await this.buildAgentRunConfig();
    this.assertFreshExternalConversation(config);
    const candidate = await this.manager.prepareNewAgentRun({ runId: this.context.agentRunId, config });
    try {
      this.assertExternalCandidate(candidate);
      const binding = candidate.platformAgentRunId
        ? createTeamAgentPlatformBinding({ execution: this.identity(), platformAgentRunId: candidate.platformAgentRunId })
        : null;
      if (binding) this.context.adoptPlatformAgentRunId(binding.platformAgentRunId);
      let state: "prepared" | "published" | "aborted" = "prepared";
      return Object.freeze({
        stagedPlatformBindings: Object.freeze(binding ? [binding] : []),
        commitAfterDurability: () => {
          if (state !== "prepared") throw new Error(`Task AgentRun '${candidate.runId}' is not publishable.`);
          const run = candidate.commitPublication();
          this.bindEvents(run);
          this.agentRun = run;
          state = "published";
        },
        abort: async () => {
          if (state !== "prepared") return;
          const cleanup = await candidate.abort();
          state = "aborted";
          if (cleanup.kind === "quarantined") throw this.cleanupError(candidate.runId, cleanup.error);
        },
      });
    } catch (error) {
      const cleanup = await candidate.abort();
      if (cleanup.kind === "quarantined") throw this.cleanupError(candidate.runId, cleanup.error);
      throw error;
    }
  }

  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    if (this.readinessAttempt) await this.readinessAttempt.catch(() => null);
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

  private ensureReady(): Promise<AgentRun> {
    if (this.agentRun?.isActive()) return Promise.resolve(this.agentRun);
    if (this.readinessAttempt) return this.readinessAttempt;
    let retrySafe = false;
    const attempt = this.initializeReady(() => { retrySafe = true; });
    this.readinessAttempt = attempt;
    void attempt.then(() => {
      if (this.readinessAttempt === attempt) this.readinessAttempt = null;
    }, () => {
      if (retrySafe && this.readinessAttempt === attempt) this.readinessAttempt = null;
    });
    return attempt;
  }

  private async initializeReady(markRetrySafe: () => void): Promise<AgentRun> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    let candidate: AgentRunActivationCandidate | null = null;
    try {
      const config = await this.buildAgentRunConfig();
      const persistedBinding = this.context.getPlatformAgentRunId();
      if (!persistedBinding) this.assertFreshExternalConversation(config);
      candidate = persistedBinding
        ? await this.manager.prepareRestoreAgentRunFromPlatformState({
            runId: this.context.agentRunId,
            config,
            platformAgentRunId: persistedBinding,
          })
        : await this.manager.prepareNewAgentRun({ runId: this.context.agentRunId, config });
      this.assertExternalCandidate(candidate);
      if (candidate.platformAgentRunId) {
        const binding = createTeamAgentPlatformBinding({
          execution: this.identity(),
          platformAgentRunId: candidate.platformAgentRunId,
        });
        await this.options.acceptPlatformBinding(binding);
        this.context.adoptPlatformAgentRunId(binding.platformAgentRunId);
      }
      const run = candidate.commitPublication();
      this.bindEvents(run);
      this.agentRun = run;
      return run;
    } catch (error) {
      let cleanupConfirmed = candidate === null;
      let failure = error;
      if (candidate) {
        const cleanup = await candidate.abort();
        cleanupConfirmed = cleanup.kind === "aborted";
        if (cleanup.kind === "quarantined") failure = this.cleanupError(candidate.runId, cleanup.error);
      }
      if (
        cleanupConfirmed &&
        !(failure instanceof TeamAgentPlatformBindingError && failure.indeterminate) &&
        !isAgentRunActivationQuarantineError(failure)
      ) markRetrySafe();
      this.publishReadinessFailure(failure);
      throw failure;
    }
  }

  private assertFreshExternalConversation(config: AgentRunConfig): void {
    if (!isExternalProviderRuntimeKind(config.runtimeKind)) return;
    const memoryDir = config.memoryDir;
    if (!memoryDir) {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_CONTINUATION_STATE_UNREADABLE",
        "The local conversation state cannot be inspected safely.",
      );
    }
    const activity = (this.options.activityInspector ?? getAgentConversationActivityInspector())
      .inspect({ agentRunId: this.context.agentRunId, memoryDir });
    if (activity.kind === "present") {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_CONTINUATION_BINDING_MISSING",
        "This conversation has local history but no provider binding and cannot be continued safely.",
      );
    }
    if (activity.kind === "indeterminate") {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_CONTINUATION_STATE_UNREADABLE",
        "The local conversation state cannot be inspected safely.",
        { cause: activity.error },
      );
    }
  }

  private assertExternalCandidate(candidate: AgentRunActivationCandidate): void {
    if (
      isExternalProviderRuntimeKind(candidate.runtimeKind) &&
      (!candidate.platformAgentRunId || candidate.platformAgentRunId === candidate.runId)
    ) {
      throw new AgentRunActivationError(
        "PLATFORM_AGENT_RUN_BINDING_INVALID",
        "The external runtime did not provide a valid provider conversation identity.",
      );
    }
  }

  private get manager(): AgentRunManager { return this.options.agentRunManager ?? AgentRunManager.getInstance(); }
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

  private readinessFailureCode(error: unknown): string {
    if (error instanceof TeamAgentPlatformBindingError || error instanceof AgentRunActivationError) {
      return error.code;
    }
    return "TEAM_AGENT_ACTIVATION_FAILED";
  }

  private publishReadinessFailure(error: unknown): void {
    try {
      this.options.publish({
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution: this.binding(),
        payload: {
          eventType: "ERROR",
          details: Object.freeze({
            code: this.readinessFailureCode(error),
            message: error instanceof Error ? error.message : String(error),
            errorScope: "runtime" as const,
            errorEffect: "terminal" as const,
            turnId: null,
          }),
          statusHint: "ERROR",
        },
      });
    } catch (publishError) {
      console.error(`Failed to publish AgentRun '${this.context.agentRunId}' readiness error:`, publishError);
    }
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

  private cleanupError(runId: string, cause: Error): AgentRunActivationError {
    return new AgentRunActivationError(
      "AGENT_RUN_ACTIVATION_CLEANUP_FAILED",
      `Agent run '${runId}' cleanup could not be confirmed.`,
      { cause },
    );
  }
}
