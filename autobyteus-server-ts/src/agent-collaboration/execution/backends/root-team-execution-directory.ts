import { acceptTaskSeed } from "../task/task-execution-seed-admission.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RootExecutionPhysicalScope } from "../domain/root-execution-identity.js";
import { TaskAgentDurabilityEventGate } from "../services/task-agent-durability-event-gate.js";
import type { FlatTeamExecutionCallbacks } from "../../../agent-team-execution/local/flat-team-execution-callbacks.js";
import { FlatTeamExecutionFactory, type FlatTeamPreparationOperation, type PreparedFlatTeamExecution } from "../../../agent-team-execution/local/flat-team-execution-factory.js";
import type { TeamRun } from "../../../agent-team-execution/domain/team-run.js";
import type { TeamRunAgentTeamNode } from "../../../agent-team-execution/domain/team-run-config.js";
import type { PrepareTaskTeamInput } from "../../../agent-team-execution/domain/task-team-execution.js";
import { createTaskExecutionPreparation, type TaskExecutionPreparationOperation, type PreparedTaskExecution } from "../../../agent-team-execution/domain/prepared-task-execution.js";
import { isRunningTaskExecutionStatus } from "../task/task-execution-running-work.js";
import type { ConfiguredMemberActivationMode } from "../../../agent-team-execution/local/flat-team-execution-context.js";
import type { FrozenTeamRunTerminationScope } from "../../../agent-team-execution/domain/frozen-team-run-termination-scope.js";

export type RootTeamRegistrationReservation = Readonly<{
  commit(): void;
  cancel(): void;
}>;

/**
 * Root-level TeamRun hosting shared by the AgentOrg and Agent roots: mounted Teams and
 * root-hosted task Teams. It never registers a standalone Team root.
 */
export class RootTeamExecutionDirectory {
  private readonly taskPreparations = new Map<string, TaskExecutionPreparationOperation>();
  private readonly restorations = new Map<string, FlatTeamPreparationOperation>();
  private readonly releasedTeams = new Map<string, TeamRun>();
  private readonly active = new Map<string, TeamRun>();
  private readonly reserved = new Set<string>();
  private readonly taskTeamRunIds = new Set<string>();
  private materializationOpen = true;

  constructor(private readonly factory: FlatTeamExecutionFactory) {}

  list(): readonly TeamRun[] { return Object.freeze([...this.active.values()]); }
  freezeForRootTermination(): readonly FrozenTeamRunTerminationScope[] {
    this.materializationOpen = false;
    this.restorations.forEach(op => op.cancel());
    if (this.reserved.size) {
      throw new Error("Root Team publication was still reserved at root-scope freeze.");
    }
    return Object.freeze([...this.active.values()].map((run) => run.freezeForRootTermination()));
  }
  /** Retained exact cleanup authority; never used to wake or admit input. */
  getManaged(teamRunId: string): TeamRun | null { return this.active.get(teamRunId) ?? this.releasedTeams.get(teamRunId) ?? null; }
  get(teamRunId: string): TeamRun | null {
    const run = this.active.get(teamRunId);
    return run?.isActive() ? run : null;
  }
  /**
   * Configured Teams keep their predicate (their task children already apply the
   * running-work predicate); a task Team holds open work only while one of its
   * agents is initializing or running.
   */
  hasOpenExecutionWork(): boolean {
    return [...this.active].some(([teamRunId, run]) => this.taskTeamRunIds.has(teamRunId)
      ? run.getLeafAgentStatusSnapshots().some((snapshot) => isRunningTaskExecutionStatus(snapshot.details.status))
      : run.hasOpenExecutionWork());
  }
  /** Registers a task TeamRun restored inside a hosting TeamRun (flat identity lookup only). */
  registerRestoredTaskTeam(run: TeamRun): void {
    this.reserveIds([run.teamRunId]);
    this.commitRuns([run], true);
  }
  require(teamRunId: string): TeamRun {
    const run = this.get(teamRunId);
    if (!run) throw new Error(`Root-hosted TeamRun '${teamRunId}' is not active.`);
    return run;
  }

  async prepareConfigured(input: Readonly<{
    physicalScope: RootExecutionPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    handoffs: PrepareTaskTeamInput["handoffs"];
    callbacks: FlatTeamExecutionCallbacks;
    activationMode: ConfiguredMemberActivationMode;
  }>): Promise<Readonly<{
    prepared: PreparedFlatTeamExecution;
    commitAfterDurability(): void;
    abort(): Promise<void>;
  }>> {
    this.reserveIds([input.teamNode.teamRunId]);
    let prepared: PreparedFlatTeamExecution;
    try {
      prepared = await this.factory.beginMaterialization({ ...input, prepareConfiguredAgents: false }).prepare();
    } catch (error) {
      this.releaseIds([input.teamNode.teamRunId]);
      throw error;
    }
    let state: "prepared" | "committed" | "aborted" = "prepared";
    return Object.freeze({
      prepared,
      commitAfterDurability: () => {
        if (state !== "prepared") throw new Error(`Mounted TeamRun '${input.teamNode.teamRunId}' is not publishable.`);
        prepared.commitAfterDurability();
        this.commitRuns([prepared.teamRun]);
        state = "committed";
      },
      abort: async () => {
        if (state !== "prepared") return;
        state = "aborted";
        this.releaseIds([input.teamNode.teamRunId]);
        await prepared.abort();
      },
    });
  }

  reserveTaskSubtree(runs: readonly TeamRun[]): RootTeamRegistrationReservation {
    const ids = runs.map((run) => run.teamRunId);
    this.reserveIds(ids);
    let state: "reserved" | "committed" | "cancelled" = "reserved";
    return Object.freeze({
      commit: () => {
        if (state !== "reserved") throw new Error("Root task TeamRun reservation is not committable.");
        this.commitRuns(runs, true);
        state = "committed";
      },
      cancel: () => {
        if (state !== "reserved") return;
        state = "cancelled";
        this.releaseIds(ids);
      },
    });
  }

  beginRootTaskTeam(input: Readonly<{
    task: PrepareTaskTeamInput;
    physicalScope: RootExecutionPhysicalScope;
    callbacks: FlatTeamExecutionCallbacks;
  }>): TaskExecutionPreparationOperation {
    const eventGate = new TaskAgentDurabilityEventGate(input.callbacks.publishAgentEvent);
    let state: "preparing" | "sealed" | "committed" | "aborted" = "preparing";
    const callbacks: FlatTeamExecutionCallbacks = Object.freeze({
      ...input.callbacks,
      publishAgentEvent: eventGate.publish,
    });
    const factoryControl = this.factory.beginMaterialization({
      physicalScope: input.physicalScope,
      teamNode: input.task.teamNode,
      handoffs: input.task.handoffs,
      applicationBinding: null,
      activationMode: "fresh",
      callbacks,
      prepareConfiguredAgents: true,
    });
    const operation = createTaskExecutionPreparation({
      cancel: () => factoryControl.cancel(),
      releaseResources: async () => {
        // Discard private events only; live teardown must forward genuine member terminal events.
        if (state !== "committed") eventGate.abort();
        const result = await factoryControl.release();
        // Keep the compact terminal control: a missing active lookup is not release proof.
        return result;
      },
      prepare: async (assertAccepting) => {
    const prepared = await factoryControl.prepare();
    assertAccepting();
    const coordinator = input.task.teamNode.children.find((child) => child.kind === "agent" && child.address === input.task.teamNode.coordinatorAddress);
    if (!coordinator || coordinator.kind !== "agent") {
      eventGate.abort();
      await prepared.abort();
      throw new Error(`Task TeamRun '${input.task.teamRunId}' has no exact coordinator.`);
    }
    return Object.freeze({
      binding: Object.freeze({
        kind: "team",
        address: input.task.address,
        teamRunId: input.task.teamRunId,
        coordinatorAgentRunId: coordinator.agentRunId,
      }),
      preparedTeamRuns: Object.freeze([prepared.teamRun]),
      stagedPlatformBindings: prepared.stagedPlatformBindings,
      sealForCommit: () => {
        if (state !== "preparing") throw new Error(`Task TeamRun '${input.task.teamRunId}' cannot be sealed.`);
        state = "sealed";
      },
      commitAfterDurability: () => {
        if (state !== "sealed") throw new Error(`Task TeamRun '${input.task.teamRunId}' is not sealed.`);
        assertAccepting();
        prepared.commitAfterDurability();
        state = "committed";
        let released = false;
        if (!eventGate.releaseToLive()) throw new Error("Task publication event gate closed.");
        return Object.freeze({ releaseWork: (assertOpen: () => void) => {
          if (released) throw new Error("Task seed already released.");
          released = true;
          if (!input.task.message) throw new Error("Helper awaits an ordinary message.");
          return acceptTaskSeed(assertOpen, () => prepared.teamRun.postMessage(input.task.message!, coordinator.agentRunId));
        } });
      },
      abort: async () => {
        if (state === "aborted") return;
        const result = await operation.release();
        if (!result.accepted) throw new Error("Task Team release remains pending.");
        state = "aborted";
      },
    });
      },
    });
    this.taskPreparations.set(input.task.teamRunId, operation);
    return operation;
  }

  /**
   * Reactivation, after an accepted exact release: retires the terminated TeamRun of one task Team
   * (root-hosted, or registered from its hosting Team) so its restore can register a fresh run, which
   * inherits the retired run's release proof. A run that is not terminated is kept.
   */
  discardReleasedTask(teamRunId: string): void {
    if (!this.taskTeamRunIds.has(teamRunId) && !this.taskPreparations.has(teamRunId)) return;
    const run = this.active.get(teamRunId);
    if (run && !run.isTerminated()) return;
    if (run) { this.releasedTeams.set(teamRunId, run); this.active.delete(teamRunId); }
    this.taskTeamRunIds.delete(teamRunId);
    this.taskPreparations.delete(teamRunId);
  }

  cancelTask(teamRunId: string): void { this.restorations.get(teamRunId)?.cancel(); this.taskPreparations.get(teamRunId)?.cancel(); this.active.get(teamRunId)?.cancelRuntimeActivation(); }
  async releaseTask(teamRunId: string): Promise<AgentOperationResult> {
    this.cancelTask(teamRunId);
    const controls = [this.taskPreparations.get(teamRunId), this.restorations.get(teamRunId)].filter(Boolean);
    const run = this.getManaged(teamRunId);
    const attempts = [...controls.map(control => control!.release()), ...(run ? [run.releaseOwnedRuntime()] : [])];
    if (!attempts.length) return { accepted: false, code: "EXACT_RELEASE_AUTHORITY_UNAVAILABLE" };
    const results = await Promise.allSettled(attempts);
    const errors = results.flatMap(result => result.status === "rejected" ? [result.reason] : []);
    if (errors.length) throw new AggregateError(errors, "Exact root Task Team cleanup failed.");
    if (results.some(result => result.status === "fulfilled" && !result.value.accepted)) return { accepted: false, code: "RUNTIME_RELEASE_PENDING" };
    this.restorations.delete(teamRunId); this.releaseIds([teamRunId]);
    return { accepted: true };
  }

  /** Re-creates one shut-down root-hosted task Team in `restore` mode; members activate lazily on input. */
  async restoreRootTaskTeam(input: Readonly<{
    assertOpen(): void;
    teamNode: TeamRunAgentTeamNode;
    handoffs: PrepareTaskTeamInput["handoffs"];
    physicalScope: RootExecutionPhysicalScope;
    callbacks: FlatTeamExecutionCallbacks;
  }>): Promise<TeamRun> {
    this.reserveIds([input.teamNode.teamRunId]);
    const id = input.teamNode.teamRunId;
    const operation = this.factory.beginMaterialization({
      physicalScope: input.physicalScope, teamNode: input.teamNode, handoffs: input.handoffs,
      applicationBinding: null, activationMode: "restore", callbacks: input.callbacks, prepareConfiguredAgents: false,
    });
    this.restorations.set(id, operation);
    try {
      const prepared = await operation.prepare();
      input.assertOpen();
      if (!this.materializationOpen) throw new Error("Root Task Team restore cancelled by root termination.");
      prepared.commitAfterDurability();
      this.commitRuns([prepared.teamRun], true);
      return prepared.teamRun;
    } catch (error) {
      operation.cancel();
      try {
        if ((await operation.release()).accepted) { this.restorations.delete(id); this.releaseIds([id]); }
      } catch (cleanup) { throw new AggregateError([error, cleanup], "Root Task Team restore and exact cleanup failed."); }
      throw error;
    }
  }

  private reserveIds(ids: readonly string[]): void {
    if (!this.materializationOpen) throw new Error("Root Team materialization is closed.");
    const duplicate = ids.find((id) => this.active.has(id) || this.reserved.has(id));
    if (duplicate) throw new Error(`Root-hosted TeamRun '${duplicate}' is already active or reserved.`);
    ids.forEach((id) => this.reserved.add(id));
  }
  private releaseIds(ids: readonly string[]): void { ids.forEach((id) => this.reserved.delete(id)); }
  private commitRuns(runs: readonly TeamRun[], taskTeams = false): void {
    for (const run of runs) {
      if (!this.reserved.delete(run.teamRunId)) throw new Error(`Root-hosted TeamRun '${run.teamRunId}' is not reserved.`);
      const previous = this.releasedTeams.get(run.teamRunId);
      if (previous) run.inheritReleasedTaskExecutionProof(previous);
      this.releasedTeams.delete(run.teamRunId);
      this.active.set(run.teamRunId, run);
      if (taskTeams) this.taskTeamRunIds.add(run.teamRunId);
    }
  }
}
