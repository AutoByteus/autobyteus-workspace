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
import { TaskExecutionTeardownIndeterminateError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { isRunningTaskExecutionStatus } from "../../agent-collaboration/execution/task/task-execution-running-work.js";
import { createCollaborationAgentStatusSnapshot, type CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { PrepareTaskAgentInput } from "../../agent-team-execution/domain/task-agent-execution.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { TeamRunAgentNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { ConfiguredAgentActivationMode } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";

export type PreparedAgentOrgConfiguredAgent = Readonly<{
  handle: ConfiguredAgentExecutionHandle;
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

/** Direct Agent and Org-root task-Agent local mechanics; the resource lifecycle policy stays in the shared lifecycle. */
export class AgentOrgRootAgentExecutionRegistry {
  private readonly active = new Map<string, ConfiguredAgentExecutionHandle>();
  private readonly prepared = new Map<string, ConfiguredAgentExecutionHandle>();
  private readonly taskAgentRunIds = new Set<string>();
  private readonly shuttingDown = new Set<string>();
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
  /**
   * AR-005 liveness for Org-root task Agents: live only while the registered handle's
   * AgentRun is active. A retained handle whose run was shut down or died is not live.
   */
  isTaskLive(agentRunId: string): boolean {
    return this.taskAgentRunIds.has(agentRunId) && (this.active.get(agentRunId)?.isActive() ?? false);
  }
  /** Configured Agents keep their predicate; task Agents hold open work only while live and initializing or running. */
  hasOpenExecutionWork(): boolean {
    return [...this.active].some(([agentRunId, handle]) => this.taskAgentRunIds.has(agentRunId)
      ? this.isTaskLive(agentRunId) && isRunningTaskExecutionStatus(handle.getStatusSnapshot().details.status)
      : handle.hasOpenExecutionWork());
  }
  /** Status leaves of every registered Agent; a non-live task Agent always reports `offline`. */
  getStatusSnapshots(): readonly CollaborationAgentStatusSnapshot[] {
    return [...this.active].map(([agentRunId, handle]) => this.taskAgentRunIds.has(agentRunId) && !this.isTaskLive(agentRunId)
      ? createCollaborationAgentStatusSnapshot({ execution: handle.identity, status: "offline" })
      : handle.getStatusSnapshot());
  }
  isActive(agentRunId: string): boolean { return this.active.get(agentRunId)?.isActive() ?? false; }
  freezeMaterialization(): void { this.materializationOpen = false; }

  async prepareConfigured(sourceNode: TeamRunAgentNode, mode: ConfiguredAgentActivationMode): Promise<PreparedAgentOrgConfiguredAgent> {
    const handle = await this.createHandle(sourceNode, mode, this.options.callbacks);
    this.reserve(sourceNode.agentRunId, handle);
    try {
      let state: "prepared" | "committed" | "aborted" = "prepared";
      return Object.freeze({
        handle,
        commitAfterDurability: () => {
          if (state !== "prepared" || this.prepared.get(sourceNode.agentRunId) !== handle) {
            throw new Error(`AgentRun '${sourceNode.agentRunId}' is not prepared for AgentOrg publication.`);
          }
          this.prepared.delete(sourceNode.agentRunId);
          this.active.set(sourceNode.agentRunId, handle);
          state = "committed";
        },
        abort: async () => {
          if (state !== "prepared") return;
          state = "aborted";
          this.prepared.delete(sourceNode.agentRunId);
          handle.dispose();
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
        this.taskAgentRunIds.add(input.agentRunId);
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
    // AR-005: never let approve/interrupt re-activate a shut-down task run through the handle.
    if (command.kind !== "post_message" && this.taskAgentRunIds.has(agentRunId) && !this.isTaskLive(agentRunId)) {
      return { accepted: false, code: "RUN_NOT_ACTIVE", message: `Task AgentRun '${agentRunId}' is shut down.` };
    }
    switch (command.kind) {
      case "post_message": return handle.postMessage(command.message);
      case "approve_tool": return handle.approveToolInvocation(command.invocationId, command.approved, command.reason);
      case "interrupt": return handle.interrupt();
    }
  }
  /**
   * Wakes one shut-down Org-root task Agent inside a live lease: registers a `restore`-mode
   * handle when none exists (after a root reopen), then activates its AgentRun. A retained
   * handle re-activates in `restore` mode, continuing the persisted conversation.
   */
  async restoreTask(sourceNode: TeamRunAgentNode): Promise<void> {
    if (!this.materializationOpen) throw new Error("AgentOrg root task Agent materialization is closed.");
    if (this.prepared.has(sourceNode.agentRunId)) throw new Error(`Task AgentRun '${sourceNode.agentRunId}' is prepared.`);
    let handle = this.active.get(sourceNode.agentRunId);
    if (!handle) {
      const created = await this.createHandle(sourceNode, "restore", this.options.callbacks);
      if (!this.materializationOpen || this.active.has(sourceNode.agentRunId)) {
        created.dispose();
        throw new Error(`Task AgentRun '${sourceNode.agentRunId}' could not be restored.`);
      }
      this.active.set(sourceNode.agentRunId, created);
      this.taskAgentRunIds.add(sourceNode.agentRunId);
      handle = created;
    }
    // The chain is live before any input is reserved.
    await handle.getOrCreateAgentRun();
  }

  /** Shuts one Org-root task Agent down only when it is quiet; the handle stays registered. */
  async tryShutDownTaskIfQuiet(agentRunId: string): Promise<boolean> {
    const handle = this.active.get(agentRunId);
    if (!handle || !this.isTaskLive(agentRunId) || this.shuttingDown.has(agentRunId)) return false;
    this.shuttingDown.add(agentRunId);
    try {
      const local = await handle.tryPrepareTerminationIfQuiescent();
      if (!local) return false;
      if (this.active.get(agentRunId) !== handle) {
        local.cancel();
        return false;
      }
      const result = await local.commit().finish().catch((cause: unknown) => {
        throw new TaskExecutionTeardownIndeterminateError(agentRunId, `Task AgentRun '${agentRunId}' shutdown did not finish.`, { cause });
      });
      if (!result.accepted) {
        throw new TaskExecutionTeardownIndeterminateError(agentRunId, result.message ?? `Task AgentRun '${agentRunId}' shutdown was rejected.`);
      }
      return true;
    } finally {
      this.shuttingDown.delete(agentRunId);
    }
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
        commitPlatformBindingChange: callbacks.commitPlatformBindingChange,
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
