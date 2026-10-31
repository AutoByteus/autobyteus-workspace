import { CollaborationAgentActivationError } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { ConfiguredAgentExecutionFactory } from "../../agent-collaboration/execution/backends/configured-agent-execution-factory.js";
import type {
  ConfiguredAgentExecutionHandle,
  PreparedConfiguredAgentActivation,
} from "../../agent-collaboration/execution/backends/configured-agent-execution-handle.js";
import type {
  AgentModelChoice,
  RetainedAgentExecutionControl,
} from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import type { AgentRunMemoryPlacement } from "../../agent-memory/domain/agent-run-memory-placement.js";
import type { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import {
  createCollaborationMemberExecutionIdentity,
  sameCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { PreparedLocalExecutionTermination } from "../../agent-collaboration/execution/domain/prepared-local-execution-termination.js";
import { createTeamAgentStatusSnapshot } from "../domain/team-agent-status.js";
import type { TeamRunAgentNode } from "../domain/team-run-config.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import type { FlatAgentExecutionContext, ConfiguredMemberActivationMode, FlatTeamExecutionContext } from "../local/flat-team-execution-context.js";
import type { FlatTeamExecutionCallbacks } from "./flat-team-execution-callbacks.js";

/** Root-neutral local adapter for one Agent execution inside a concrete TeamRun. */
export class FlatTeamAgentExecutionHandle implements RetainedAgentExecutionControl {
  readonly context: FlatAgentExecutionContext;
  private handle: ConfiguredAgentExecutionHandle | null = null;
  private construction: Promise<ConfiguredAgentExecutionHandle> | null = null;
  private rootShutdownFenced = false;
  /** The node the next activation uses; only its model choice changes, and only while stopped. */
  private config: TeamRunAgentNode;
  /** Activation fence while no inner handle exists yet (the inner handle owns it afterwards). */
  private activationFence: Promise<void> | null = null;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    context: FlatAgentExecutionContext;
    config: TeamRunAgentNode;
    /** Where this agent's memory directory is (contract L1): a team member at its team's placement, a task agent as its own run. */
    memoryPlacement: AgentRunMemoryPlacement;
    activationMode: ConfiguredMemberActivationMode;
    callbacks: FlatTeamExecutionCallbacks;
    agentRunManager?: AgentRunManager;
    memoryLocator?: AgentRunMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    executionFactory?: ConfiguredAgentExecutionFactory;
  }) { this.context = options.context; this.config = options.config; }

  isActive(): boolean { return this.handle?.isActive() ?? false; }
  hasOpenExecutionWork(): boolean { return this.handle?.hasOpenExecutionWork() ?? false; }
  getInputStateSnapshots() { return this.handle?.getInputStateSnapshots() ?? []; }
  getLeafAgentStatusSnapshots() {
    const status = this.handle?.getStatusSnapshot();
    return [createTeamAgentStatusSnapshot({
      execution: this.identity(),
      details: status ? { ...status.details, toolName: null, errorDetails: null } : {
        status: "offline", trigger: null, toolName: null, errorMessage: null, errorDetails: null, recoverableBlock: null,
      },
    })];
  }
  async getOrCreateAgentRun(): Promise<AgentRun> { return (await this.getHandle()).getOrCreateAgentRun(); }
  async reserveInput(message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    return (await this.getHandle()).reserveInput(message, options);
  }
  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> { return (await this.getHandle()).postMessage(message); }
  async approveToolInvocation(invocationId: string, approved: boolean, reason: string | null = null) {
    return (await this.getHandle()).approveToolInvocation(invocationId, approved, reason);
  }
  async interrupt() { return this.handle ? this.handle.interrupt() : { accepted: true as const }; }
  async fenceForRootShutdown() {
    this.rootShutdownFenced = true;
    const construction = this.construction;
    if (construction) await construction.catch(() => null);
    return this.handle ? this.handle.fenceForRootShutdown() : { accepted: true as const };
  }
  async prepareConfiguredActivation(): Promise<PreparedConfiguredAgentActivation> {
    return (await this.getHandle()).prepareConfiguredActivation();
  }
  cancelActivation(): void {
    this.rootShutdownFenced = true;
    this.handle?.cancelActivation();
  }
  async releaseRuntime(): Promise<AgentOperationResult> {
    this.cancelActivation();
    if (this.handle) return this.handle.releaseRuntime();
    return this.construction
      ? { accepted: false, code: "RUNTIME_RELEASE_PENDING", message: "Member context construction is pending." }
      : { accepted: true };
  }
  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    if (this.construction) await this.construction.catch(() => null);
    return this.handle ? this.handle.prepareTermination() : completedTermination();
  }
  async tryPrepareTerminationIfQuiescent(): Promise<PreparedLocalExecutionTermination | null> {
    if (this.construction) return null;
    return this.handle ? this.handle.tryPrepareTerminationIfQuiescent() : completedTermination();
  }
  async terminate() { return this.handle ? this.handle.terminate() : { accepted: true as const }; }
  dispose(): void { this.handle?.dispose(); this.handle = null; }

  isStopped(): boolean { return !this.construction && (this.handle?.isStopped() ?? true); }
  async withActivationFence<T>(operation: () => Promise<T> | T): Promise<T> {
    if (this.construction) await this.construction.catch(() => null);
    if (this.handle) return this.handle.withActivationFence(operation);
    while (this.activationFence) await this.activationFence;
    let release!: () => void;
    this.activationFence = new Promise<void>((resolve) => { release = resolve; });
    try { return await operation(); }
    finally { this.activationFence = null; release(); }
  }
  async releaseRuntimeForUserStop(): Promise<AgentOperationResult> {
    if (this.construction) await this.construction.catch(() => null);
    return this.handle ? this.handle.releaseRuntimeForUserStop() : { accepted: true };
  }
  replaceModelChoice(choice: AgentModelChoice): void {
    if (!this.isStopped()) throw new Error(`AgentRun '${this.context.agentRunId}' is running; its model can change only while it is stopped.`);
    this.handle?.replaceModelChoice(choice);
    this.config = Object.freeze({ ...this.config, llmModelIdentifier: choice.llmModelIdentifier, llmConfig: choice.llmConfig });
  }

  private getHandle(): Promise<ConfiguredAgentExecutionHandle> {
    if (this.rootShutdownFenced) {
      return Promise.reject(new Error(`AgentRun '${this.context.agentRunId}' is fenced for root shutdown.`));
    }
    if (this.handle) return Promise.resolve(this.handle);
    if (this.construction) return this.construction;
    if (this.activationFence) return this.activationFence.then(() => this.getHandle());
    const attempt = this.createHandle();
    this.construction = attempt;
    void attempt.finally(() => { if (this.construction === attempt) this.construction = null; }).catch(() => undefined);
    return attempt;
  }

  private async createHandle(): Promise<ConfiguredAgentExecutionHandle> {
    const identity = this.identity();
    const execution = this.executionSpec();
    const memberExecutionContext = await this.options.callbacks.buildMemberExecutionContext({
      identity,
      physicalScope: this.options.teamContext.physicalScope,
      execution,
      sourceNode: this.config,
      hostTeam: Object.freeze({
        address: this.options.teamContext.teamNode.address,
        teamDefinitionId: this.options.teamContext.teamNode.teamDefinitionId,
        handoffs: this.options.teamContext.handoffs,
      }),
    });
    if (this.rootShutdownFenced) throw new Error(`AgentRun '${this.context.agentRunId}' construction cancelled.`);
    const handle = (this.options.executionFactory ?? new ConfiguredAgentExecutionFactory()).create({
      identity,
      physicalScope: this.options.teamContext.physicalScope,
      memoryPlacement: this.options.memoryPlacement,
      execution,
      activationMode: this.options.activationMode,
      memberExecutionContext,
      assertInputAllowed: () => this.options.callbacks.assertExecutionInputAllowed(identity),
      applicationExecutionContext: this.options.callbacks.applicationExecutionContext?.(identity) ?? null,
      projectRunRoot: this.options.callbacks.projectRunRoot?.() ?? null,
      callbacks: {
        publishAgentEvent: (member, event) => this.options.callbacks.publishAgentEvent(member, event),
        commitPlatformBindingChange: async (change) => {
          const binding = change.kind === "adopt_or_retain" ? change.binding : change.replacement.binding;
          if (!sameCollaborationMemberExecutionIdentity(identity, binding.execution)) {
            throw new Error("Flat Team binding change does not match the Agent identity.");
          }
          const previous = this.context.getPlatformAgentRunId();
          if (change.kind === "replace_without_conversation"
            ? previous !== change.replacement.expectedPreviousPlatformAgentRunId
            : previous !== null && previous !== binding.platformAgentRunId) {
            throw new Error("Flat Team Agent execution has a conflicting provider binding.");
          }
          await this.options.callbacks.commitPlatformBindingChange(change);
          try {
            if (change.kind === "replace_without_conversation") {
              this.context.replaceCommittedPlatformAgentRunId(
                change.replacement.expectedPreviousPlatformAgentRunId, binding.platformAgentRunId,
              );
            } else this.context.adoptPlatformAgentRunId(binding.platformAgentRunId);
          } catch (cause) {
            throw new CollaborationAgentActivationError(
              "COLLABORATION_AGENT_BINDING_CACHE_COMMIT_FAILED",
              "Provider binding is durable but the Flat Team Agent cache could not be updated.",
              { cause, indeterminate: true },
            );
          }
        },
      },
      agentRunManager: this.options.agentRunManager,
      memoryLocator: this.options.memoryLocator,
      activityInspector: this.options.activityInspector,
      workspaceManager: this.options.workspaceManager,
    });
    this.handle = handle;
    return handle;
  }

  private identity(): CollaborationMemberExecutionIdentity {
    return createCollaborationMemberExecutionIdentity({
      root: this.options.teamContext.rootIdentity,
      memberAddress: this.context.address,
      agentRunId: this.context.agentRunId,
    });
  }
  private executionSpec() {
    return Object.freeze({
      agentDefinitionId: this.config.agentDefinitionId,
      llmModelIdentifier: this.config.llmModelIdentifier,
      llmConfig: this.config.llmConfig,
      autoExecuteTools: this.config.autoExecuteTools,
      runtimeKind: this.config.runtimeKind,
      workspaceRootPath: this.config.workspaceRootPath,
      platformAgentRunId: this.context.getPlatformAgentRunId(),
    });
  }
}

const completedTermination = (): PreparedLocalExecutionTermination => Object.freeze({
  cancel: () => undefined,
  commit: () => Object.freeze({ finish: async () => ({ accepted: true as const }) }),
});
