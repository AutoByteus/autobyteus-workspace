import { acceptTaskSeed } from "../../../agent-collaboration/execution/task/task-execution-seed-admission.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../../agent-execution/input/agent-run-input-contract.js";
import type { PrepareTaskAgentInput, RestoreTaskAgentInput } from "../../domain/task-agent-execution.js";
import { createTaskExecutionPreparation, type TaskExecutionPreparationOperation, type PreparedTaskExecution } from "../../domain/prepared-task-execution.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import { FlatAgentExecutionContext, type FlatTeamExecutionContext } from "../flat-team-execution-context.js";
import { FlatTeamAgentExecutionHandle } from "../flat-team-agent-execution-handle.js";
import { createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "../../domain/team-agent-status.js";
import type { RootedAgentMemoryLocator } from "../../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import type { FlatTeamExecutionCallbacks } from "../flat-team-execution-callbacks.js";
import { TaskAgentDurabilityEventGate } from "../../../agent-collaboration/execution/services/task-agent-durability-event-gate.js";
import { isRunningTaskExecutionStatus } from "../../../agent-collaboration/execution/task/task-execution-running-work.js";

type PreparedState = "preparing" | "sealed" | "committed" | "aborted";
/** Direct task-Agent mechanics for one TeamRun; the resource lifecycle policy remains root-owned. */
export class TaskAgentExecutionRegistry {
  private readonly operations = new Map<string, TaskExecutionPreparationOperation>();
  private readonly active = new Map<string, FlatTeamAgentExecutionHandle>();
  private readonly reserved = new Set<string>();
  private readonly preparedHandles = new Map<string, FlatTeamAgentExecutionHandle>();
  private readonly eventGates = new Map<string, TaskAgentDurabilityEventGate>();
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
  /**
   * AR-005 liveness: a task Agent is live only while its registered handle's AgentRun is
   * active. A retained handle whose run was shut down or died is not live.
   */
  isLive(agentRunId: string): boolean { return this.active.get(agentRunId)?.isActive() ?? false; }
  /** Task-execution open work: only a live, initializing or running task Agent counts. */
  hasRunningWork(): boolean {
    return [...this.active].some(([agentRunId, handle]) => this.isLive(agentRunId)
      && handle.getLeafAgentStatusSnapshots().some((snapshot) => isRunningTaskExecutionStatus(snapshot.details.status)));
  }
  /** Status leaves: a non-live task Agent always reports `offline`. */
  getInputStateSnapshots() {
    return [...this.active].flatMap(([id, handle]) => this.isLive(id) ? handle.getInputStateSnapshots() : []);
  }
  getLeafAgentStatusSnapshots(): readonly TeamAgentStatusSnapshot[] {
    return [...this.active].flatMap(([agentRunId, handle]) => this.isLive(agentRunId)
      ? handle.getLeafAgentStatusSnapshots()
      : handle.getLeafAgentStatusSnapshots().map((snapshot) => createTeamAgentStatusSnapshot({
          execution: snapshot.execution,
          details: { status: "offline", trigger: null, toolName: null, errorMessage: null, errorDetails: null, recoverableBlock: null },
        })));
  }

  /**
   * Wakes one non-live task Agent before delivery: registers a `restore`-mode handle when
   * none exists (after a root reopen or a reactivation), then activates its AgentRun so the
   * chain is live before any input is reserved. A retained handle whose AgentRun ended
   * re-activates in `restore` mode, continuing the persisted conversation.
   */
  async restore(input: RestoreTaskAgentInput): Promise<void> {
    if (!this.materializationOpen) throw new Error("Task Agent materialization is closed for TeamRun termination.");
    const runId = input.agentRunId.trim();
    if (!runId || input.address !== input.sourceNode.address) {
      throw new Error("Task Agent restore requires one exact configured placement and AgentRun ID.");
    }
    if (this.reserved.has(runId)) throw new Error(`Task AgentRun '${runId}' is reserved.`);
    let handle = this.active.get(runId);
    if (!handle) {
      handle = new FlatTeamAgentExecutionHandle({
        teamContext: this.options.teamContext,
        context: new FlatAgentExecutionContext({
          address: input.address,
          agentRunId: runId,
          runtimeKind: input.sourceNode.runtimeKind,
          platformAgentRunId: input.platformAgentRunId,
        }),
        config: Object.freeze({ ...input.sourceNode, agentRunId: runId, platformAgentRunId: input.platformAgentRunId }),
        activationMode: "restore",
        agentRunManager: this.options.agentRunManager,
        memoryLocator: this.options.memoryLocator,
        activityInspector: this.options.activityInspector,
        workspaceManager: this.options.workspaceManager,
        callbacks: this.options.callbacks,
      });
      this.active.set(runId, handle);
    }
    await handle.getOrCreateAgentRun();
  }

  beginPreparation(input: PrepareTaskAgentInput): TaskExecutionPreparationOperation {
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
    const operation = createTaskExecutionPreparation({
      cancel: () => handle.cancelActivation(),
      releaseResources: async () => {
        // A committed handle still owes its real terminal event on successful teardown.
        if (state !== "committed") eventGate.abort();
        const result = await handle.releaseRuntime();
        if (result.accepted) {
          this.reserved.delete(runId); this.preparedHandles.delete(runId); this.eventGates.delete(runId);
          // Retain the compact exact terminal control after successful release.
        }
        return result;
      },
      prepare: async (assertAccepting) => {
    let activation!: Awaited<ReturnType<FlatTeamAgentExecutionHandle["prepareConfiguredActivation"]>>;
    try {
      activation = await handle.prepareConfiguredActivation();
    } catch (error) { eventGate.abort(); throw error; }
    assertAccepting();
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
        assertAccepting();
        this.active.set(runId, handle);
        activation.commitAfterDurability();
        this.preparedHandles.delete(runId);
        this.active.set(runId, handle);
        state = "committed";
        let released = false;
        if (!eventGate.releaseToLive()) throw new Error("Task publication event gate closed.");
        return Object.freeze({
          releaseWork: (assertOpen) => {
            assertAccepting();
            if (released) throw new Error("Task seed already released.");
            released = true;
            this.eventGates.delete(runId);
            if (!input.message) throw new Error("Helper awaits an ordinary message, not a delegated seed.");
            return acceptTaskSeed(assertOpen, () => handle.postMessage(input.message!));
          },
        });
      },
      abort: async () => {
        if (state === "aborted") return;
        const result = await operation.release();
        if (!result.accepted) throw new Error("Task Agent release remains pending.");
        state = "aborted";
      },
    };
      },
    });
    this.operations.set(runId, operation);
    return operation;
  }

  /**
   * Reactivation, after an accepted exact release: drops the released (fenced) handle so `restore`
   * builds a fresh `restore`-mode handle. A live handle is kept.
   */
  discardReleased(agentRunId: string): void {
    if (this.isLive(agentRunId)) return;
    this.active.delete(agentRunId);
    this.operations.delete(agentRunId);
    this.preparedHandles.delete(agentRunId);
    this.eventGates.delete(agentRunId);
    this.reserved.delete(agentRunId);
  }

  cancel(agentRunId: string): void {
    this.operations.get(agentRunId)?.cancel();
    (this.active.get(agentRunId) ?? this.preparedHandles.get(agentRunId))?.cancelActivation();
  }
  release(agentRunId: string): Promise<AgentOperationResult> {
    this.cancel(agentRunId);
    const operation = this.operations.get(agentRunId);
    if (operation) return operation.release();
    const handle = this.active.get(agentRunId) ?? this.preparedHandles.get(agentRunId);
    return handle ? handle.releaseRuntime() : Promise.resolve({ accepted: false, code: "EXACT_RELEASE_AUTHORITY_UNAVAILABLE" });
  }

  reserveInput(agentRunId: string, message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    const handle = this.active.get(agentRunId);
    if (!handle) return Promise.resolve({ reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `Task AgentRun '${agentRunId}' is not active.` });
    return handle.reserveInput(message, options);
  }

  async executeCommand(agentRunId: string, command: import("../../domain/team-member-execution-command.js").TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    const handle = this.active.get(agentRunId);
    if (!handle) return { accepted: false, code: "RUN_NOT_FOUND", message: `Task AgentRun '${agentRunId}' is not active.` };
    // AR-005: never let approve/interrupt re-activate a shut-down run through the handle.
    if (command.kind !== "post_message" && !this.isLive(agentRunId)) {
      return { accepted: false, code: "RUN_NOT_ACTIVE", message: `Task AgentRun '${agentRunId}' is shut down.` };
    }
    switch (command.kind) {
      case "post_message": return handle.postMessage(command.message);
      case "approve_tool": return handle.approveToolInvocation(command.invocationId, command.approved, command.reason);
      case "interrupt": return handle.interrupt();
    }
  }

  dispose(): void {
    this.operations.forEach(operation => operation.cancel());
    this.eventGates.forEach((gate) => gate.abort());
    this.active.forEach((handle) => handle.dispose());
    this.preparedHandles.forEach((handle) => handle.dispose());
    this.active.clear();
    this.reserved.clear();
    this.preparedHandles.clear();
    this.eventGates.clear();
  }
}
