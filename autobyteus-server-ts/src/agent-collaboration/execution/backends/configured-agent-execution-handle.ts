import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { ApplicationExecutionContext } from "../../../application-orchestration/domain/models.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { isAgentRunEvent } from "../../../agent-execution/domain/agent-run-event.js";
import type {
  AgentRunInputOptions,
  AgentRunInputReservationResult,
} from "../../../agent-execution/input/agent-run-input-contract.js";
import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";
import {
  RootedAgentMemoryLocator,
} from "../services/rooted-agent-memory-locator.js";
import {
  cloneCollaborationMemberExecutionIdentity,
  createRootExecutionPhysicalScope,
  sameCollaborationMemberExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionPhysicalScope,
} from "../domain/root-execution-identity.js";
import type { MemberExecutionContext } from "../domain/member-execution-context.js";
import type { RootAgentExecutionCallbacks } from "../domain/root-agent-execution-callbacks.js";
import type {
  ConfiguredAgentActivationMode,
  ConfiguredAgentExecutionSpec,
} from "../domain/configured-agent-execution.js";
import { CollaborationAgentActivationError } from "../domain/configured-agent-execution.js";
import type {
  CollaborationAgentNoConversationBindingReplacement,
  CollaborationAgentPlatformBinding,
} from "../domain/collaboration-agent-platform-binding.js";
import type {
  CollaborationAgentStatusSnapshot,
} from "../domain/collaboration-agent-execution-event.js";
import type { PreparedLocalExecutionTermination } from "../domain/prepared-local-execution-termination.js";
import { ConfiguredAgentActivationPlanner } from "./configured-agent-activation-planner.js";
import { ConfiguredAgentStatusOverlay } from "./configured-agent-status-overlay.js";

export type PreparedConfiguredAgentActivation = Readonly<{
  stagedPlatformBindings: readonly CollaborationAgentPlatformBinding[];
  stagedNoConversationBindingReplacements: readonly CollaborationAgentNoConversationBindingReplacement[];
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

/** Root-neutral owner of one configured or task AgentRun's provider/local mechanics. */
export class ConfiguredAgentExecutionHandle {
  readonly identity: CollaborationMemberExecutionIdentity;
  readonly physicalScope: RootExecutionPhysicalScope;
  private agentRun: AgentRun | null = null;
  private readinessAttempt: Promise<AgentRun> | null = null;
  private rootShutdownFenced = false;
  private unsubscribe: (() => void) | null = null;
  private platformAgentRunId: string | null;
  private readonly overlay: ConfiguredAgentStatusOverlay;
  private readonly planner: ConfiguredAgentActivationPlanner;

  constructor(private readonly options: {
    identity: CollaborationMemberExecutionIdentity;
    physicalScope: RootExecutionPhysicalScope;
    execution: ConfiguredAgentExecutionSpec;
    activationMode: ConfiguredAgentActivationMode;
    memberExecutionContext: MemberExecutionContext;
    applicationExecutionContext?: ApplicationExecutionContext | null;
    callbacks: RootAgentExecutionCallbacks;
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  }) {
    this.identity = cloneCollaborationMemberExecutionIdentity(options.identity);
    this.physicalScope = createRootExecutionPhysicalScope(options.physicalScope);
    if (!sameRootExecutionIdentity(this.identity.root, this.physicalScope.root)) {
      throw new Error("Agent identity and physical scope must belong to the same root.");
    }
    if (!sameCollaborationMemberExecutionIdentity(this.identity, options.memberExecutionContext.identity)) {
      throw new Error("Agent identity and member context must identify the same execution.");
    }
    if (!options.callbacks || typeof options.callbacks.publishAgentEvent !== "function"
      || typeof options.callbacks.commitPlatformBindingChange !== "function") {
      throw new Error("RootAgentExecutionCallbacks are required.");
    }
    this.platformAgentRunId = options.execution.platformAgentRunId?.trim() || null;
    this.overlay = new ConfiguredAgentStatusOverlay(this.identity, (snapshot) => {
      options.callbacks.publishAgentEvent(this.identity, { kind: "status_overlay", snapshot });
    });
    this.planner = new ConfiguredAgentActivationPlanner({
      identity: this.identity,
      mode: options.activationMode,
      manager: options.agentRunManager,
      activityInspector: options.activityInspector,
    });
  }

  isActive(): boolean { return this.agentRun?.isActive() ?? false; }
  hasOpenExecutionWork(): boolean {
    return ["initializing", "running", "error"].includes(this.getStatusSnapshot().details.status);
  }
  getStatusSnapshot(): CollaborationAgentStatusSnapshot {
    return this.overlay.get(() => this.agentRun?.getStatusSnapshot() ?? { status: "offline" });
  }
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
        this.options.callbacks.publishAgentEvent(this.identity, { kind: "member_input", message });
      } else this.publishCommandStatus("error", result.message ?? null);
      return { ...result, agentRunId: run.runId, displayName: this.displayName };
    } catch (error) {
      this.publishCommandStatus("error", error instanceof Error ? error.message : String(error));
      if (!this.agentRun?.isActive()) return {
        accepted: false,
        code: this.readinessFailureCode(error),
        message: error instanceof Error ? error.message : String(error),
        agentRunId: this.identity.agentRunId,
        displayName: this.displayName,
      };
      throw error;
    }
  }

  async approveToolInvocation(invocationId: string, approved: boolean, reason: string | null = null): Promise<AgentOperationResult> {
    return (await this.ensureReady()).approveToolInvocation(invocationId, approved, reason);
  }
  async interrupt(): Promise<AgentOperationResult> {
    return this.agentRun ? this.agentRun.interrupt() : { accepted: true };
  }
  async fenceForRootShutdown(): Promise<AgentOperationResult> {
    this.rootShutdownFenced = true;
    if (this.readinessAttempt) await this.readinessAttempt.catch(() => null);
    return this.agentRun
      ? this.agentRun.fenceInputAndInterruptForRootShutdown()
      : { accepted: true };
  }

  async prepareConfiguredActivation(): Promise<PreparedConfiguredAgentActivation> {
    if (this.rootShutdownFenced) {
      throw new Error(`AgentRun '${this.identity.agentRunId}' is fenced for root shutdown.`);
    }
    if (this.agentRun || this.readinessAttempt) {
      throw new Error(`AgentRun '${this.identity.agentRunId}' already entered live readiness.`);
    }
    const prepared = await this.planner.prepare(await this.buildAgentRunConfig(), this.platformAgentRunId);
    let state: "prepared" | "published" | "aborted" = "prepared";
    return Object.freeze({
      stagedPlatformBindings: Object.freeze(
        prepared.bindingChange?.kind === "adopt_or_retain" ? [prepared.bindingChange.binding] : [],
      ),
      stagedNoConversationBindingReplacements: Object.freeze(
        prepared.bindingChange?.kind === "replace_without_conversation"
          ? [prepared.bindingChange.replacement]
          : [],
      ),
      commitAfterDurability: () => {
        if (state !== "prepared") throw new Error(`AgentRun '${prepared.candidate.runId}' is not publishable.`);
        const binding = prepared.bindingChange?.kind === "replace_without_conversation"
          ? prepared.bindingChange.replacement.binding
          : prepared.bindingChange?.binding;
        if (binding) this.platformAgentRunId = binding.platformAgentRunId;
        const run = prepared.candidate.commitPublication();
        this.bindEvents(run);
        this.agentRun = run;
        state = "published";
      },
      abort: async () => {
        if (state !== "prepared") return;
        const cleanup = await prepared.candidate.abort();
        state = "aborted";
        if (cleanup.kind === "quarantined") throw this.cleanupError(prepared.candidate.runId, cleanup.error);
      },
    });
  }

  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    if (this.readinessAttempt) await this.readinessAttempt.catch(() => null);
    const prepared = this.agentRun ? await this.manager.prepareAgentRunTermination(this.agentRun) : null;
    return prepared ? this.wrapPreparedTermination(prepared) : completedLocalTermination(() => this.dispose());
  }

  async tryPrepareTerminationIfQuiescent(): Promise<PreparedLocalExecutionTermination | null> {
    if (this.readinessAttempt) return null;
    if (!this.agentRun) return completedLocalTermination(() => this.dispose());
    const prepared = await this.manager.tryPrepareAgentRunTerminationIfQuiescent(this.agentRun);
    if (!prepared) return null;
    return this.wrapPreparedTermination(prepared);
  }

  async terminate(): Promise<AgentOperationResult> {
    const prepared = await this.prepareTermination();
    return prepared.commit().finish();
  }
  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.agentRun = null;
    this.overlay.clear();
  }

  private ensureReady(): Promise<AgentRun> {
    if (this.rootShutdownFenced) {
      return Promise.reject(new Error(`AgentRun '${this.identity.agentRunId}' is fenced for root shutdown.`));
    }
    if (this.agentRun?.isActive()) return Promise.resolve(this.agentRun);
    if (this.readinessAttempt) return this.readinessAttempt;
    let retrySafe = false;
    const attempt = this.initializeReady(() => { retrySafe = true; });
    this.readinessAttempt = attempt;
    void attempt.then(
      () => { if (this.readinessAttempt === attempt) this.readinessAttempt = null; },
      () => { if (retrySafe && this.readinessAttempt === attempt) this.readinessAttempt = null; },
    );
    return attempt;
  }

  private async initializeReady(markRetrySafe: () => void): Promise<AgentRun> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    let prepared: Awaited<ReturnType<ConfiguredAgentActivationPlanner["prepare"]>> | null = null;
    let durabilityCommitted = false;
    try {
      prepared = await this.planner.prepare(await this.buildAgentRunConfig(), this.platformAgentRunId);
      const binding = prepared.bindingChange?.kind === "replace_without_conversation"
        ? prepared.bindingChange.replacement.binding
        : prepared.bindingChange?.binding;
      if (binding && prepared.bindingChange) {
        if (!sameCollaborationMemberExecutionIdentity(this.identity, binding.execution)) {
          throw new Error("Provider binding change does not match the configured Agent identity.");
        }
        await this.options.callbacks.commitPlatformBindingChange(prepared.bindingChange);
        durabilityCommitted = true;
        this.platformAgentRunId = binding.platformAgentRunId;
      }
      const run = prepared.candidate.commitPublication();
      this.bindEvents(run);
      this.agentRun = run;
      return run;
    } catch (error) {
      let cleanupConfirmed = prepared === null;
      let failure = durabilityCommitted
        ? new CollaborationAgentActivationError(
            this.readinessFailureCode(error),
            "Provider binding committed durably but Agent readiness publication failed.",
            { cause: error, indeterminate: true },
          )
        : error;
      if (prepared) {
        const cleanup = await prepared.candidate.abort();
        cleanupConfirmed = cleanup.kind === "aborted";
        if (cleanup.kind === "quarantined") failure = this.cleanupError(prepared.candidate.runId, cleanup.error);
      }
      if (cleanupConfirmed && this.planner.isRetrySafe(failure)) markRetrySafe();
      this.options.callbacks.publishAgentEvent(this.identity, {
        kind: "readiness_failure",
        code: this.readinessFailureCode(failure),
        message: failure instanceof Error ? failure.message : String(failure),
      });
      throw failure;
    }
  }

  private async buildAgentRunConfig(): Promise<AgentRunConfig> {
    const execution = this.options.execution;
    let workspaceId: string | null = null;
    if (execution.workspaceRootPath) {
      try {
        workspaceId = (await (this.options.workspaceManager ?? getWorkspaceManager())
          .ensureWorkspaceByRootPath(execution.workspaceRootPath)).workspaceId;
      } catch (error) {
        throw new CollaborationAgentActivationError(
          "COLLABORATION_AGENT_WORKSPACE_ACTIVATION_FAILED",
          "The configured workspace could not be activated.",
          { cause: error },
        );
      }
    }
    return new AgentRunConfig({
      agentDefinitionId: execution.agentDefinitionId,
      llmModelIdentifier: execution.llmModelIdentifier,
      autoExecuteTools: execution.autoExecuteTools,
      workspaceId,
      memoryDir: (this.options.memoryLocator ?? new RootedAgentMemoryLocator())
        .getLocation(this.physicalScope, this.identity.agentRunId).memoryDir,
      llmConfig: execution.llmConfig as Record<string, unknown> | null,
      skillAccessMode: execution.skillAccessMode,
      runtimeKind: execution.runtimeKind,
      memberExecutionContext: this.options.memberExecutionContext,
      applicationExecutionContext: this.options.applicationExecutionContext ?? null,
    });
  }

  private bindEvents(run: AgentRun): void {
    this.unsubscribe?.();
    this.unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event)) return;
      if (event.runId !== this.identity.agentRunId) {
        throw new Error(`AgentRun event '${event.runId}' does not match '${this.identity.agentRunId}'.`);
      }
      this.options.callbacks.publishAgentEvent(this.identity, { kind: "agent_run", event });
      if (event.eventType === "AGENT_STATUS") this.overlay.clear();
    });
  }

  private publishCommandStatus(status: "initializing" | "error", errorMessage: string | null = null): void {
    if (this.agentRun) return;
    this.overlay.set(status, this.getStatusSnapshot().details.status, errorMessage);
  }
  private get manager(): AgentRunManager { return this.options.agentRunManager ?? AgentRunManager.getInstance(); }

  private wrapPreparedTermination(
    prepared: import("../../../agent-execution/domain/prepared-agent-run-termination.js").PreparedAgentRunTermination,
  ): PreparedLocalExecutionTermination {
    let state: "prepared" | "cancelled" | "committed" = "prepared";
    let committed: ReturnType<PreparedLocalExecutionTermination["commit"]> | null = null;
    return Object.freeze({
      cancel: () => {
        if (state !== "prepared") return;
        state = "cancelled";
        prepared.cancel();
      },
      commit: () => {
        if (state === "cancelled") throw new Error(`AgentRun '${this.identity.agentRunId}' termination was cancelled.`);
        if (committed) return committed;
        state = "committed";
        const local = prepared.commit();
        committed = Object.freeze({ finish: async () => {
          const result = await local.finish();
          if (result.accepted) this.dispose();
          return result;
        } });
        return committed;
      },
    });
  }
  private get displayName(): string { return this.identity.memberAddress.split("/").at(-1) ?? this.identity.agentRunId; }
  private readinessFailureCode(error: unknown): string {
    return error instanceof CollaborationAgentActivationError || error instanceof Error && "code" in error
      ? String((error as { code?: unknown }).code ?? "COLLABORATION_AGENT_ACTIVATION_FAILED")
      : "COLLABORATION_AGENT_ACTIVATION_FAILED";
  }
  private cleanupError(runId: string, cause: Error): CollaborationAgentActivationError {
    return new CollaborationAgentActivationError(
      "AGENT_RUN_ACTIVATION_CLEANUP_FAILED",
      `Agent run '${runId}' cleanup could not be confirmed.`,
      { cause, indeterminate: true },
    );
  }
}

const completedLocalTermination = (
  finish: () => void,
): PreparedLocalExecutionTermination => Object.freeze({
  cancel: () => undefined,
  commit: () => Object.freeze({ finish: async () => {
    finish();
    return { accepted: true as const };
  } }),
});
