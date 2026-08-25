import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunConfig } from "../../../../agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../agent-execution/domain/agent-run-context.js";
import type { AgentRun } from "../../../../agent-execution/domain/agent-run.js";
import { isAgentRunEvent } from "../../../../agent-execution/domain/agent-run-event.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../../../agent-execution/input/agent-run-input-contract.js";
import { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import type { AgentRunActivationCandidate } from "../../../../agent-execution/services/agent-run-activation-candidate.js";
import { AgentRunActivationError, isAgentRunActivationQuarantineError } from "../../../../agent-execution/errors.js";
import { isExternalProviderRuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import { getAgentMemoryLocationService, type AgentMemoryLocationService } from "../../../../agent-memory/services/agent-memory-location-service.js";
import {
  getAgentConversationActivityInspector,
  type AgentConversationActivityInspector,
} from "../../../../agent-memory/services/agent-conversation-activity-inspector.js";
import { getAgentToolMcpSessionService, type AgentToolMcpSessionManager } from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../../../workspaces/workspace-manager.js";
import type { ApplicationExecutionContext } from "../../../../application-orchestration/domain/models.js";
import type { InterAgentMessageDeliveryIntent } from "../../../domain/inter-agent-message-delivery.js";
import { TeamAgentActivationError } from "../../../errors.js";
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
import type {
  MixedAgentMemberContext,
  MixedConfiguredMemberActivationMode,
  MixedTeamRunContext,
} from "../mixed-team-run-context.js";
import type { MixedTeamEventPublish } from "./mixed-team-member-handle.js";
import type { MemberTaskRootResolver } from "../../../task-delegation/member-task-root-resolver.js";

export type PreparedMixedTaskAgentActivation = Readonly<{
  stagedPlatformBindings: readonly TeamAgentPlatformBinding[];
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

type MixedAgentActivationPlan =
  | Readonly<{ kind: "new" }>
  | Readonly<{ kind: "restore_native" }>
  | Readonly<{ kind: "restore_external"; platformAgentRunId: string }>;

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
    activationMode: MixedConfiguredMemberActivationMode;
    agentRunManager?: AgentRunManager;
    agentToolMcpSessionManager?: AgentToolMcpSessionManager;
    memoryLocationService?: AgentMemoryLocationService;
    activityInspector?: AgentConversationActivityInspector;
    memberTeamContextBuilder?: MemberTeamContextBuilder;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    taskRootResolver: MemberTaskRootResolver;
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
  async interruptForRootTermination(): Promise<AgentOperationResult> {
    if (this.readinessAttempt) await this.readinessAttempt.catch(() => null);
    if (!this.agentRun) return { accepted: true };
    const result = await this.agentRun.interrupt();
    return !result.accepted && result.code === "NO_ACTIVE_TURN"
      ? { accepted: true }
      : result;
  }

  async prepareForTaskActivation(): Promise<PreparedMixedTaskAgentActivation> {
    if (this.agentRun || this.readinessAttempt) {
      throw new Error(`Task AgentRun '${this.context.agentRunId}' already entered live readiness.`);
    }
    const config = await this.buildAgentRunConfig();
    const plan = this.resolveActivationPlan(config);
    if (plan.kind !== "new") {
      throw new Error(`Fresh task AgentRun '${this.context.agentRunId}' selected an invalid activation plan.`);
    }
    const candidate = await this.manager.prepareNewAgentRun({ runId: this.context.agentRunId, config });
    try {
      const binding = this.createExternalBinding(candidate);
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
    (this.options.agentToolMcpSessionManager ?? getAgentToolMcpSessionService())
      .revokeAgentToolMcpSessionsForRun(this.context.agentRunId);
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
      const plan = this.resolveActivationPlan(config);
      candidate = await this.prepareCandidate(plan, config);
      const binding = this.createExternalBinding(candidate);
      if (binding) {
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

  private resolveActivationPlan(config: AgentRunConfig): MixedAgentActivationPlan {
    const external = isExternalProviderRuntimeKind(config.runtimeKind);
    if (this.options.activationMode === "fresh") {
      if (external) this.assertNoPriorConversationActivity(config);
      return Object.freeze({ kind: "new" });
    }

    if (external) {
      const platformAgentRunId = this.context.getPlatformAgentRunId()?.trim() || null;
      if (platformAgentRunId) {
        return Object.freeze({ kind: "restore_external", platformAgentRunId });
      }
      this.assertNoPriorConversationActivity(config);
      return Object.freeze({ kind: "new" });
    }

    const activity = this.inspectConversationActivity(config);
    if (activity.kind === "present") return Object.freeze({ kind: "restore_native" });
    if (activity.kind === "none") return Object.freeze({ kind: "new" });
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_CONTINUATION_STATE_UNREADABLE",
      "The local conversation state cannot be inspected safely.",
      { cause: activity.error },
    );
  }

  private async prepareCandidate(
    plan: MixedAgentActivationPlan,
    config: AgentRunConfig,
  ): Promise<AgentRunActivationCandidate> {
    if (plan.kind === "new") {
      return this.manager.prepareNewAgentRun({ runId: this.context.agentRunId, config });
    }
    if (plan.kind === "restore_external") {
      return this.manager.prepareRestoreAgentRunFromPlatformState({
        runId: this.context.agentRunId,
        config,
        platformAgentRunId: plan.platformAgentRunId,
      });
    }
    try {
      return await this.manager.prepareRestoreAgentRun(new AgentRunContext({
        runId: this.context.agentRunId,
        config,
        runtimeContext: null,
      }));
    } catch (error) {
      if (isAgentRunActivationQuarantineError(error)) throw error;
      throw new TeamAgentActivationError(
        "TEAM_AGENT_NATIVE_RESTORE_FAILED",
        "The prior native conversation context could not be restored.",
        { cause: error },
      );
    }
  }

  private assertNoPriorConversationActivity(config: AgentRunConfig): void {
    const activity = this.inspectConversationActivity(config);
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

  private inspectConversationActivity(config: AgentRunConfig) {
    const memoryDir = config.memoryDir;
    if (!memoryDir) {
      return {
        kind: "indeterminate" as const,
        error: new Error("AgentRun memory location is unavailable."),
      };
    }
    return (this.options.activityInspector ?? getAgentConversationActivityInspector())
      .inspect({ agentRunId: this.context.agentRunId, memoryDir });
  }

  private createExternalBinding(candidate: AgentRunActivationCandidate): TeamAgentPlatformBinding | null {
    if (!isExternalProviderRuntimeKind(candidate.runtimeKind)) return null;
    if (!candidate.platformAgentRunId || candidate.platformAgentRunId === candidate.runId) {
      throw new AgentRunActivationError(
        "PLATFORM_AGENT_RUN_BINDING_INVALID",
        "The external runtime did not provide a valid provider conversation identity.",
      );
    }
    return createTeamAgentPlatformBinding({
      execution: this.identity(),
      platformAgentRunId: candidate.platformAgentRunId,
    });
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
    if (
      error instanceof TeamAgentPlatformBindingError ||
      error instanceof AgentRunActivationError ||
      error instanceof TeamAgentActivationError
    ) {
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
    let workspaceId: string | null = null;
    if (node.workspaceRootPath) {
      try {
        const workspace = await (this.options.workspaceManager ?? getWorkspaceManager())
          .ensureWorkspaceByRootPath(node.workspaceRootPath);
        workspaceId = workspace.workspaceId;
      } catch (error) {
        throw new TeamAgentActivationError(
          "TEAM_AGENT_WORKSPACE_ACTIVATION_FAILED",
          "The configured workspace could not be activated.",
          { cause: error },
        );
      }
    }
    const memberTeamContext = await (this.options.memberTeamContextBuilder ?? getMemberTeamContextBuilder()).build({
      teamContext: this.options.teamContext,
      agentNode: node,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskRootResolver: this.options.taskRootResolver,
    });
    return new AgentRunConfig({
      agentDefinitionId: node.agentDefinitionId,
      llmModelIdentifier: node.llmModelIdentifier,
      autoExecuteTools: node.autoExecuteTools,
      workspaceId,
      memoryDir: (this.options.memoryLocationService ?? getAgentMemoryLocationService()).getTeamAgentRunLocation({
        ...this.options.teamContext.physicalScope,
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
