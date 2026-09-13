import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { ConfiguredAgentExecutionFactory } from "../../agent-collaboration/execution/backends/configured-agent-execution-factory.js";
import type { ConfiguredAgentExecutionHandle, PreparedConfiguredAgentActivation } from "../../agent-collaboration/execution/backends/configured-agent-execution-handle.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { createCollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { TaskAgentDurabilityEventGate } from "../../agent-collaboration/execution/services/task-agent-durability-event-gate.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { PreparedTaskExecution } from "../../agent-team-execution/domain/prepared-task-execution.js";
import type { PreparedTaskSettlement } from "../../agent-team-execution/domain/prepared-task-settlement.js";
import type { PrepareTaskAgentInput } from "../../agent-team-execution/domain/task-agent-execution.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { TeamRunAgentNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { ConfiguredAgentActivationMode } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import type { CollaborationAgentPlatformBinding } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";

export type PreparedAgentOrgConfiguredAgent = Readonly<{
  handle: ConfiguredAgentExecutionHandle;
  stagedPlatformBindings: PreparedConfiguredAgentActivation["stagedPlatformBindings"];
  stagedNoConversationBindingReplacements: PreparedConfiguredAgentActivation["stagedNoConversationBindingReplacements"];
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

/** Direct Agent and Org-root task-Agent local mechanics; task policy remains in the shared engine. */
export class AgentOrgRootAgentExecutionRegistry {
  private readonly active = new Map<string, ConfiguredAgentExecutionHandle>();
  private readonly prepared = new Map<string, ConfiguredAgentExecutionHandle>();
  private readonly settling = new Set<string>();
  private materializationOpen = true;

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    callbacks: FlatTeamExecutionCallbacks;
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    executionFactory?: ConfiguredAgentExecutionFactory;
  }>) {}

  listHandles(): readonly ConfiguredAgentExecutionHandle[] { return Object.freeze([...this.active.values()]); }
  freezeForRootTermination(): readonly ConfiguredAgentExecutionHandle[] {
    this.materializationOpen = false;
    return Object.freeze([...new Set([...this.active.values(), ...this.prepared.values()])]);
  }
  get(agentRunId: string): ConfiguredAgentExecutionHandle | null { return this.active.get(agentRunId) ?? null; }
  isActive(agentRunId: string): boolean { return this.active.get(agentRunId)?.isActive() ?? false; }
  freezeMaterialization(): void { this.materializationOpen = false; }

  async prepareConfigured(sourceNode: TeamRunAgentNode, mode: ConfiguredAgentActivationMode): Promise<PreparedAgentOrgConfiguredAgent> {
    const handle = await this.createHandle(sourceNode, mode, this.options.callbacks);
    this.reserve(sourceNode.agentRunId, handle);
    try {
      const activation = mode === "fresh" ? null : await handle.prepareConfiguredActivation();
      let state: "prepared" | "committed" | "aborted" = "prepared";
      return Object.freeze({
        handle,
        stagedPlatformBindings: activation?.stagedPlatformBindings ?? Object.freeze([]),
        stagedNoConversationBindingReplacements: activation?.stagedNoConversationBindingReplacements ?? Object.freeze([]),
        commitAfterDurability: () => {
          if (state !== "prepared" || this.prepared.get(sourceNode.agentRunId) !== handle) {
            throw new Error(`AgentRun '${sourceNode.agentRunId}' is not prepared for AgentOrg publication.`);
          }
          activation?.commitAfterDurability();
          this.prepared.delete(sourceNode.agentRunId);
          this.active.set(sourceNode.agentRunId, handle);
          state = "committed";
        },
        abort: async () => {
          if (state !== "prepared") return;
          state = "aborted";
          this.prepared.delete(sourceNode.agentRunId);
          try { await activation?.abort(); } finally { handle.dispose(); }
        },
      });
    } catch (error) {
      this.prepared.delete(sourceNode.agentRunId);
      handle.dispose();
      throw error;
    }
  }

  async prepareTask(input: PrepareTaskAgentInput): Promise<PreparedTaskExecution> {
    if (!this.materializationOpen) throw new Error("AgentOrg root task Agent materialization is closed.");
    const eventGate = new TaskAgentDurabilityEventGate(this.options.callbacks.publishAgentEvent);
    const callbacks: FlatTeamExecutionCallbacks = Object.freeze({
      ...this.options.callbacks,
      publishAgentEvent: eventGate.publish,
    });
    const handle = await this.createHandle(
      Object.freeze({ ...input.sourceNode, agentRunId: input.agentRunId, platformAgentRunId: null }),
      "fresh",
      callbacks,
    ).catch((error) => { eventGate.abort(); throw error; });
    this.reserve(input.agentRunId, handle);
    let activation: PreparedConfiguredAgentActivation;
    try { activation = await handle.prepareConfiguredActivation(); }
    catch (error) { eventGate.abort(); this.prepared.delete(input.agentRunId); handle.dispose(); throw error; }
    let state: "preparing" | "sealed" | "committed" | "aborted" = "preparing";
    return Object.freeze({
      binding: Object.freeze({ kind: "agent", address: input.address, agentRunId: input.agentRunId }),
      preparedTeamRuns: Object.freeze([]),
      stagedPlatformBindings: activation.stagedPlatformBindings,
      sealForCommit: () => {
        if (state !== "preparing") throw new Error(`Task AgentRun '${input.agentRunId}' cannot be sealed.`);
        state = "sealed";
      },
      commitAfterDurability: () => {
        if (state !== "sealed" || this.prepared.get(input.agentRunId) !== handle) throw new Error(`Task AgentRun '${input.agentRunId}' is not sealed.`);
        activation.commitAfterDurability();
        this.prepared.delete(input.agentRunId);
        this.active.set(input.agentRunId, handle);
        state = "committed";
        let released = false;
        return Object.freeze({ releaseWork: () => {
          if (released) return;
          released = true;
          if (!eventGate.releaseToLive()) return;
          queueMicrotask(() => { void handle.postMessage(input.message); });
        } });
      },
      abort: async () => {
        if (state === "committed" || state === "aborted") return;
        state = "aborted";
        this.prepared.delete(input.agentRunId);
        eventGate.abort();
        try { await activation.abort(); } finally { handle.dispose(); }
      },
    });
  }

  reserveInput(agentRunId: string, message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    const handle = this.active.get(agentRunId);
    return handle
      ? handle.reserveInput(message, options)
      : Promise.resolve({ reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `AgentOrg direct AgentRun '${agentRunId}' is not active.` });
  }
  async executeCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    const handle = this.active.get(agentRunId);
    if (!handle) return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentOrg direct AgentRun '${agentRunId}' is not active.` };
    switch (command.kind) {
      case "post_message": return handle.postMessage(command.message);
      case "approve_tool": return handle.approveToolInvocation(command.invocationId, command.approved, command.reason);
      case "interrupt": return handle.interrupt();
    }
  }
  async prepareSettlement(taskId: string, agentRunId: string, address: PrepareTaskAgentInput["address"]): Promise<PreparedTaskSettlement | null> {
    const handle = this.active.get(agentRunId);
    if (!handle || this.settling.has(agentRunId)) return null;
    this.settling.add(agentRunId);
    let local;
    try { local = await handle.tryPrepareTerminationIfQuiescent(); }
    catch (error) { this.settling.delete(agentRunId); throw error; }
    if (!local) {
      this.settling.delete(agentRunId);
      return null;
    }
    if (this.active.get(agentRunId) !== handle) {
      local.cancel();
      this.settling.delete(agentRunId);
      return null;
    }
    let state: "prepared" | "cancelled" | "committed" = "prepared";
    return Object.freeze({
      taskId,
      binding: Object.freeze({ kind: "agent", address, agentRunId }),
      cancelBeforeDurability: () => {
        if (state !== "prepared") return;
        state = "cancelled";
        local.cancel();
        this.settling.delete(agentRunId);
      },
      commitAfterDurability: () => {
        if (state !== "prepared" || this.active.get(agentRunId) !== handle) throw new Error(`Task AgentRun '${agentRunId}' changed before settlement.`);
        state = "committed";
        this.active.delete(agentRunId);
        this.settling.delete(agentRunId);
        const committed = local.commit();
        return Object.freeze({ finishLocalTeardown: () => committed.finish() });
      },
    });
  }

  private async createHandle(
    sourceNode: TeamRunAgentNode,
    mode: ConfiguredAgentActivationMode,
    callbacks: FlatTeamExecutionCallbacks,
  ): Promise<ConfiguredAgentExecutionHandle> {
    const identity = createCollaborationMemberExecutionIdentity({
      root: this.options.root,
      memberAddress: sourceNode.address,
      agentRunId: sourceNode.agentRunId,
    });
    const physicalScope = Object.freeze({ root: this.options.root, ancestorTeamRunIds: Object.freeze([]) });
    const execution = Object.freeze({
      agentDefinitionId: sourceNode.agentDefinitionId,
      llmModelIdentifier: sourceNode.llmModelIdentifier,
      llmConfig: sourceNode.llmConfig,
      autoExecuteTools: sourceNode.autoExecuteTools,
      skillAccessMode: sourceNode.skillAccessMode,
      runtimeKind: sourceNode.runtimeKind,
      workspaceRootPath: sourceNode.workspaceRootPath,
      platformAgentRunId: sourceNode.platformAgentRunId,
    });
    const memberExecutionContext = await callbacks.buildMemberExecutionContext({ identity, physicalScope, execution, sourceNode });
    return (this.options.executionFactory ?? new ConfiguredAgentExecutionFactory()).create({
      identity,
      physicalScope,
      execution,
      activationMode: mode,
      memberExecutionContext,
      applicationExecutionContext: callbacks.applicationExecutionContext?.(identity) ?? null,
      callbacks: {
        publishAgentEvent: callbacks.publishAgentEvent,
        acceptPlatformBinding: callbacks.acceptPlatformBinding,
      },
      agentRunManager: this.options.agentRunManager,
      memoryLocator: this.options.memoryLocator,
      activityInspector: this.options.activityInspector,
      workspaceManager: this.options.workspaceManager,
    });
  }
  private reserve(agentRunId: string, handle: ConfiguredAgentExecutionHandle): void {
    if (!this.materializationOpen || this.active.has(agentRunId) || this.prepared.has(agentRunId)) {
      throw new Error(`AgentRun '${agentRunId}' is already active, prepared, or root materialization is closed.`);
    }
    this.prepared.set(agentRunId, handle);
  }
}
