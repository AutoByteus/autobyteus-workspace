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
import type { AgentRunActivationOperation } from "../../../agent-execution/services/agent-run-activation-operation.js";
import type { ConfiguredAgentActivationOperation } from "./configured-agent-activation-planner.js";
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
  private activationOperation: AgentRunActivationOperation | null = null;
  private configurationPreparing = false;
  private agentRun: AgentRun | null = null;
  private readinessAttempt: Promise<AgentRun> | null = null;
  private rootShutdownFenced = false;
  private unsubscribe: (() => void) | null = null;
  private platformAgentRunId: string | null;
  /** Constructor mode until the first publication; any later re-activation (after the run died) restores. */
  private activationMode: ConfiguredAgentActivationMode;
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
    assertInputAllowed?: () => void;
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
    this.activationMode = options.activationMode;
    this.overlay = new ConfiguredAgentStatusOverlay(this.identity, (snapshot) => {
      options.callbacks.publishAgentEvent(this.identity, { kind: "status_overlay", snapshot });
    });
    this.planner = new ConfiguredAgentActivationPlanner({
      identity: this.identity,
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
  getInputStateSnapshots() {
    return this.agentRun?.isActive()
      ? [{ agent_run_id: this.identity.agentRunId, state: this.agentRun.getInputStateSnapshot() }] : [];
  }
  getOrCreateAgentRun(): Promise<AgentRun> { return this.ensureReady(); }

  async reserveInput(message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    const run = await this.ensureReady();
    this.assertInputAllowed();
    return run.reserveUserMessage(message, options);
  }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    this.publishCommandStatus("initializing");
    try {
      const run = await this.ensureReady();
      this.assertInputAllowed();
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
    const run = await this.ensureReady();
    this.assertInputAllowed();
    return run.approveToolInvocation(invocationId, approved, reason);
  }
  async interrupt(): Promise<AgentOperationResult> {
    return this.agentRun ? this.agentRun.interrupt() : { accepted: true };
  }
  async fenceForRootShutdown(): Promise<AgentOperationResult> {
    // Fence before the stale check so root shutdown can never re-activate a dead member.
    this.cancelActivation();
    if (this.readinessAttempt) await this.readinessAttempt.catch(() => null);
    const run = this.agentRun;
    return run && !this.isStale(run)
      ? run.fenceInputAndInterruptForRootShutdown()
      : { accepted: true };
  }

  async prepareConfiguredActivation(): Promise<PreparedConfiguredAgentActivation> {
    if (this.rootShutdownFenced) {
      throw new Error(`AgentRun '${this.identity.agentRunId}' is fenced for root shutdown.`);
    }
    if (this.agentRun || this.readinessAttempt) {
      throw new Error(`AgentRun '${this.identity.agentRunId}' already entered live readiness.`);
    }
    const prepared = await this.prepareActivation();
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
        this.activationMode = "restore";
        this.agentRun = run;
        this.activationOperation = null;
        state = "published";
        this.bindEvents(run);
      },
      abort: async () => {
        if (state === "aborted") return;
        const cleanup = await this.releaseRuntime();
        if (!cleanup.accepted) throw new Error(cleanup.message ?? "Configured Agent cleanup remains pending.");
        state = "aborted";
      },
    });
  }

  cancelActivation(): void {
    this.rootShutdownFenced = true;
    this.activationOperation?.cancel();
  }

  private runtimeReleased = false;
  async releaseRuntime(closeInput = true): Promise<AgentOperationResult> {
    if (this.runtimeReleased) return { accepted: true };
    if (closeInput) this.cancelActivation();
    else this.activationOperation?.cancel();
    if (this.agentRun) {
      const result = await this.manager.releaseExactRun(this.agentRun);
      if (result.accepted) { this.runtimeReleased = closeInput; this.activationOperation = null; this.agentRun = null; this.dispose(); }
      return result;
    }
    if (this.activationOperation) {
      const result = await this.activationOperation.releasePrivate();
      if (result.kind === "released") { this.runtimeReleased = closeInput; this.activationOperation = null; this.agentRun = null; this.dispose(); return { accepted: true }; }
      if (result.kind === "quarantined") throw result.error;
      return { accepted: false, code: "RUNTIME_RELEASE_PENDING", message: `Exact Agent release remains ${result.kind}.` };
    }
    return this.configurationPreparing
      ? { accepted: false, code: "RUNTIME_RELEASE_PENDING", message: "Configured activation continuation has not settled." }
      : { accepted: true };
  }

  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    if (this.readinessAttempt) await this.readinessAttempt.catch(() => null);
    if (this.agentRun) return this.wrapPreparedTermination(await this.manager.prepareAgentRunTermination(this.agentRun));
    // Private rejection still has retained authority; never mistake a missing published run for release.
    return Object.freeze({ cancel: () => undefined, commit: () => Object.freeze({ finish: () => this.releaseRuntime() }) });
  }

  async tryPrepareTerminationIfQuiescent(): Promise<PreparedLocalExecutionTermination | null> {
    if (this.readinessAttempt) return null;
    const run = this.agentRun;
    if (!run) return this.activationOperation ? null : completedLocalTermination(() => this.dispose());
    const prepared = await this.manager.tryPrepareAgentRunTerminationIfQuiescent(run);
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
    // Listener disposal is not a physical cleanup certificate. Keep exact published authority.
    this.overlay.clear();
  }

  private ensureReady(): Promise<AgentRun> {
    try { this.assertInputAllowed(); } catch (error) { return Promise.reject(error); }
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
    if (this.agentRun) {
      const cleanup = await this.manager.releaseExactRun(this.agentRun);
      if (!cleanup.accepted) throw new Error(cleanup.message ?? "Prior exact Agent runtime cleanup failed.");
      this.agentRun = null; this.dispose();
    }
    let prepared: Awaited<ReturnType<ConfiguredAgentActivationOperation["prepare"]>> | null = null;
    let durabilityCommitted = false;
    try {
      prepared = await this.prepareActivation();
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
      this.activationMode = "restore";
      this.agentRun = run;
      this.activationOperation = null;
      this.bindEvents(run);
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
      if (this.activationOperation || this.agentRun) {
        try { cleanupConfirmed = (await this.releaseRuntime(false)).accepted; }
        catch (error) { cleanupConfirmed = false; failure = this.cleanupError(this.identity.agentRunId, error instanceof Error ? error : new Error(String(error))); }
      }
      if (cleanupConfirmed && this.planner.isRetrySafe(failure) && !durabilityCommitted) markRetrySafe();
      this.options.callbacks.publishAgentEvent(this.identity, {
        kind: "readiness_failure",
        code: this.readinessFailureCode(failure),
        message: failure instanceof Error ? failure.message : String(failure),
      });
      throw failure;
    }
  }

  private async prepareActivation() {
    this.configurationPreparing = true;
    try {
      const config = await this.buildAgentRunConfig();
      this.assertInputAllowed();
      const begun = this.planner.begin(config, this.platformAgentRunId, this.activationMode);
      this.activationOperation = begun.operation;
      return await begun.prepare();
    } finally { this.configurationPreparing = false; }
  }

  private readonly inputFence = () => this.assertInputAllowed();
  private assertInputAllowed(): void {
    if (this.rootShutdownFenced) throw new Error(`AgentRun '${this.identity.agentRunId}' is closed for input.`);
    this.options.assertInputAllowed?.();
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
      runtimeKind: execution.runtimeKind,
      memberExecutionContext: this.options.memberExecutionContext,
      applicationExecutionContext: this.options.applicationExecutionContext ?? null,
    });
  }

  private bindEvents(run: AgentRun): void {
    this.unsubscribe?.();
    run.bindExecutionAdmissionFence(this.inputFence);
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

  /**
   * A run the manager no longer publishes died and was already removed (with its resources released)
   * on inactive discovery, so it has nothing left to fence or terminate.
   */
  private isStale(run: AgentRun): boolean {
    try {
      return this.manager.getActiveRun(run.runId) !== run;
    } catch (error) {
      // Resource release failed on first discovery; the run is removed, so a retry sees it as stale.
      console.warn(`COLLABORATION_STALE_RUN_DISCOVERY_FAILED agentRunId=${run.runId}`, error);
      throw error;
    }
  }

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
          if (result.accepted) { this.agentRun = null; this.dispose(); }
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
