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
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
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
export class FlatTeamAgentExecutionHandle {
  readonly context: FlatAgentExecutionContext;
  private handle: ConfiguredAgentExecutionHandle | null = null;
  private construction: Promise<ConfiguredAgentExecutionHandle> | null = null;
  private rootShutdownFenced = false;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    context: FlatAgentExecutionContext;
    config: TeamRunAgentNode;
    activationMode: ConfiguredMemberActivationMode;
    callbacks: FlatTeamExecutionCallbacks;
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    executionFactory?: ConfiguredAgentExecutionFactory;
  }) { this.context = options.context; }

  isActive(): boolean { return this.handle?.isActive() ?? false; }
  hasOpenExecutionWork(): boolean { return this.handle?.hasOpenExecutionWork() ?? false; }
  getLeafAgentStatusSnapshots() {
    const status = this.handle?.getStatusSnapshot();
    return [createTeamAgentStatusSnapshot({
      execution: this.identity(),
      details: status ? { ...status.details, toolName: null, errorDetails: null } : {
        status: "offline", trigger: null, toolName: null, errorMessage: null, errorDetails: null,
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
  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    if (this.construction) await this.construction.catch(() => null);
    if (this.handle) return this.handle.prepareTermination();
    return Object.freeze({
      cancel: () => undefined,
      commit: () => Object.freeze({ finish: async () => ({ accepted: true as const }) }),
    });
  }
  async tryPrepareTerminationIfQuiescent(): Promise<PreparedLocalExecutionTermination | null> {
    if (this.construction) return null;
    return this.handle ? this.handle.tryPrepareTerminationIfQuiescent() : completedTermination();
  }
  async terminate() { return this.handle ? this.handle.terminate() : { accepted: true as const }; }
  dispose(): void { this.handle?.dispose(); this.handle = null; }

  private getHandle(): Promise<ConfiguredAgentExecutionHandle> {
    if (this.rootShutdownFenced) {
      return Promise.reject(new Error(`AgentRun '${this.context.agentRunId}' is fenced for root shutdown.`));
    }
    if (this.handle) return Promise.resolve(this.handle);
    if (this.construction) return this.construction;
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
      sourceNode: this.options.config,
    });
    const handle = (this.options.executionFactory ?? new ConfiguredAgentExecutionFactory()).create({
      identity,
      physicalScope: this.options.teamContext.physicalScope,
      execution,
      activationMode: this.options.activationMode,
      memberExecutionContext,
      applicationExecutionContext: this.options.callbacks.applicationExecutionContext?.(identity) ?? null,
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
      agentDefinitionId: this.options.config.agentDefinitionId,
      llmModelIdentifier: this.options.config.llmModelIdentifier,
      llmConfig: this.options.config.llmConfig,
      autoExecuteTools: this.options.config.autoExecuteTools,
      skillAccessMode: this.options.config.skillAccessMode,
      runtimeKind: this.options.config.runtimeKind,
      workspaceRootPath: this.options.config.workspaceRootPath,
      platformAgentRunId: this.context.getPlatformAgentRunId(),
    });
  }
}

const completedTermination = (): PreparedLocalExecutionTermination => Object.freeze({
  cancel: () => undefined,
  commit: () => Object.freeze({ finish: async () => ({ accepted: true as const }) }),
});
