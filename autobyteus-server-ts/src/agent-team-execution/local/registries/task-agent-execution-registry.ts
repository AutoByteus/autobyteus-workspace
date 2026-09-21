import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../../agent-execution/input/agent-run-input-contract.js";
import type { PrepareTaskAgentInput } from "../../domain/task-agent-execution.js";
import type { PreparedTaskExecution } from "../../domain/prepared-task-execution.js";
import type { PreparedTaskSettlement } from "../../domain/prepared-task-settlement.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import { FlatAgentExecutionContext, type FlatTeamExecutionContext } from "../flat-team-execution-context.js";
import { FlatTeamAgentExecutionHandle } from "../flat-team-agent-execution-handle.js";
import type { RootedAgentMemoryLocator } from "../../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import type { FlatTeamExecutionCallbacks } from "../flat-team-execution-callbacks.js";
import { TaskAgentDurabilityEventGate } from "../../../agent-collaboration/execution/services/task-agent-durability-event-gate.js";

type PreparedState = "preparing" | "sealed" | "committed" | "aborted";
/** Direct task-Agent mechanics for one TeamRun; task policy remains root-owned. */
export class TaskAgentExecutionRegistry {
  private readonly active = new Map<string, FlatTeamAgentExecutionHandle>();
  private readonly reserved = new Set<string>();
  private readonly preparedHandles = new Map<string, FlatTeamAgentExecutionHandle>();
  private readonly eventGates = new Map<string, TaskAgentDurabilityEventGate>();
  private readonly settling = new Set<string>();
  private materializationOpen = true;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    callbacks: FlatTeamExecutionCallbacks;
  }) {}

  listHandles(): readonly FlatTeamAgentExecutionHandle[] { return Object.freeze([...this.active.values()]); }
  listPreparedHandles(): readonly FlatTeamAgentExecutionHandle[] { return Object.freeze([...this.preparedHandles.values()]); }
  freezeMaterialization(): void { this.materializationOpen = false; }
  get(agentRunId: string): FlatTeamAgentExecutionHandle | null { return this.active.get(agentRunId) ?? null; }

  async prepare(input: PrepareTaskAgentInput): Promise<PreparedTaskExecution> {
    if (!this.materializationOpen) throw new Error("Task Agent materialization is closed for TeamRun termination.");
    const runId = input.agentRunId.trim();
    if (!runId || input.address !== input.sourceNode.address) {
      throw new Error("Task Agent preparation requires one exact configured placement and AgentRun ID.");
    }
    if (this.active.has(runId) || this.reserved.has(runId)) {
      throw new Error(`Task AgentRun '${runId}' is already active or reserved.`);
    }
    this.reserved.add(runId);
    const eventGate = new TaskAgentDurabilityEventGate(this.options.callbacks.publishAgentEvent);
    const handle = new FlatTeamAgentExecutionHandle({
      teamContext: this.options.teamContext,
      context: new FlatAgentExecutionContext({
        address: input.address,
        agentRunId: runId,
        runtimeKind: input.sourceNode.runtimeKind,
        platformAgentRunId: null,
      }),
      config: Object.freeze({ ...input.sourceNode, agentRunId: runId, platformAgentRunId: null }),
      activationMode: "fresh",
      agentRunManager: this.options.agentRunManager,
      memoryLocator: this.options.memoryLocator,
      activityInspector: this.options.activityInspector,
      workspaceManager: this.options.workspaceManager,
      callbacks: Object.freeze({
        ...this.options.callbacks,
        publishAgentEvent: eventGate.publish,
      }),
    });
    this.preparedHandles.set(runId, handle);
    this.eventGates.set(runId, eventGate);
    let state: PreparedState = "preparing";
    let activation!: Awaited<ReturnType<FlatTeamAgentExecutionHandle["prepareConfiguredActivation"]>>;
    try {
      activation = await handle.prepareConfiguredActivation();
    } catch (error) {
      eventGate.abort();
      this.reserved.delete(runId);
      this.preparedHandles.delete(runId);
      this.eventGates.delete(runId);
      handle.dispose();
      throw error;
    }
    return {
      binding: Object.freeze({ kind: "agent", address: input.address, agentRunId: runId }),
      preparedTeamRuns: Object.freeze([]),
      stagedPlatformBindings: activation.stagedPlatformBindings,
      sealForCommit: () => {
        if (state !== "preparing" || !this.reserved.has(runId)) throw new Error(`Task AgentRun '${runId}' cannot be sealed.`);
        state = "sealed";
      },
      commitAfterDurability: () => {
        if (state !== "sealed" || !this.reserved.delete(runId)) throw new Error(`Task AgentRun '${runId}' is not sealed.`);
        activation.commitAfterDurability();
        this.preparedHandles.delete(runId);
        this.active.set(runId, handle);
        state = "committed";
        let released = false;
        return Object.freeze({
          releaseWork: () => {
            if (released) return;
            released = true;
            if (!eventGate.releaseToLive()) return;
            this.eventGates.delete(runId);
            queueMicrotask(() => { void handle.postMessage(input.message); });
          },
        });
      },
      abort: async () => {
        if (state === "committed" || state === "aborted") return;
        state = "aborted";
        eventGate.abort();
        this.reserved.delete(runId);
        this.preparedHandles.delete(runId);
        this.eventGates.delete(runId);
        try { await activation.abort(); } finally { handle.dispose(); }
      },
    };
  }

  reserveInput(agentRunId: string, message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    const handle = this.active.get(agentRunId);
    if (!handle) return Promise.resolve({ reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `Task AgentRun '${agentRunId}' is not active.` });
    return handle.reserveInput(message, options);
  }

  async executeCommand(agentRunId: string, command: import("../../domain/team-member-execution-command.js").TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    const handle = this.active.get(agentRunId);
    if (!handle) return { accepted: false, code: "RUN_NOT_FOUND", message: `Task AgentRun '${agentRunId}' is not active.` };
    switch (command.kind) {
      case "post_message": return handle.postMessage(command.message);
      case "approve_tool": return handle.approveToolInvocation(command.invocationId, command.approved, command.reason);
      case "interrupt": return handle.interrupt();
    }
  }

  async prepareSettlement(taskId: string, agentRunId: string): Promise<PreparedTaskSettlement | null> {
    const handle = this.active.get(agentRunId);
    if (!handle) return null;
    if (this.settling.has(agentRunId)) throw new Error(`Task AgentRun '${agentRunId}' is already preparing settlement.`);
    this.settling.add(agentRunId);
    let local;
    try {
      local = await handle.tryPrepareTerminationIfQuiescent();
    } catch (error) {
      this.settling.delete(agentRunId);
      throw error;
    }
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
    let committed: ReturnType<PreparedTaskSettlement["commitAfterDurability"]> | null = null;
    const prepared: PreparedTaskSettlement = Object.freeze({
      taskId,
      binding: Object.freeze({ kind: "agent", address: handle.context.address, agentRunId }),
      cancelBeforeDurability: () => {
        if (state !== "prepared") return;
        state = "cancelled";
        local.cancel();
        this.settling.delete(agentRunId);
      },
      commitAfterDurability: () => {
        if (state === "cancelled") throw new Error(`Task AgentRun '${agentRunId}' settlement was cancelled.`);
        if (committed) return committed;
        if (this.active.get(agentRunId) !== handle) throw new Error(`Task AgentRun '${agentRunId}' changed before settlement commit.`);
        state = "committed";
        this.active.delete(agentRunId);
        this.settling.delete(agentRunId);
        const localCommit = local.commit();
        committed = Object.freeze({ finishLocalTeardown: () => localCommit.finish() });
        return committed;
      },
    });
    return prepared;
  }

  dispose(): void {
    this.eventGates.forEach((gate) => gate.abort());
    this.active.forEach((handle) => handle.dispose());
    this.preparedHandles.forEach((handle) => handle.dispose());
    this.active.clear();
    this.reserved.clear();
    this.preparedHandles.clear();
    this.eventGates.clear();
    this.settling.clear();
  }
}
