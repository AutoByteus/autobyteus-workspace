import type { RootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { TaskAgentDurabilityEventGate } from "../../agent-collaboration/execution/services/task-agent-durability-event-gate.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import { FlatTeamExecutionFactory, type PreparedFlatTeamExecution } from "../../agent-team-execution/local/flat-team-execution-factory.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { PrepareTaskTeamInput } from "../../agent-team-execution/domain/task-team-execution.js";
import type { PreparedTaskExecution } from "../../agent-team-execution/domain/prepared-task-execution.js";
import { TaskExecutionTeardownIndeterminateError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { isRunningTaskExecutionStatus } from "../../agent-collaboration/execution/task/task-execution-running-work.js";
import type { ConfiguredMemberActivationMode } from "../../agent-team-execution/local/flat-team-execution-context.js";
import type { FrozenTeamRunTerminationScope } from "../../agent-team-execution/domain/frozen-team-run-termination-scope.js";

export type AgentOrgTeamRegistrationReservation = Readonly<{
  commit(): void;
  cancel(): void;
}>;

/** Org-private mounted/task TeamRun registry; never registers a standalone Team root. */
export class AgentOrgTeamExecutionDirectory {
  private readonly active = new Map<string, TeamRun>();
  private readonly reserved = new Set<string>();
  private readonly taskTeamRunIds = new Set<string>();
  private readonly shuttingDown = new Set<string>();
  private materializationOpen = true;

  constructor(private readonly factory: FlatTeamExecutionFactory) {}

  list(): readonly TeamRun[] { return Object.freeze([...this.active.values()]); }
  freezeForRootTermination(): readonly FrozenTeamRunTerminationScope[] {
    this.materializationOpen = false;
    if (this.reserved.size) {
      throw new Error("AgentOrg Team publication was still reserved at root-scope freeze.");
    }
    return Object.freeze([...this.active.values()].map((run) => run.freezeForRootTermination()));
  }
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
  /** Removes TeamRuns terminated by a quiet shutdown of their task execution. */
  unregisterTerminated(): void {
    for (const [teamRunId, run] of this.active) {
      if (!run.isTerminated()) continue;
      this.active.delete(teamRunId);
      this.taskTeamRunIds.delete(teamRunId);
    }
  }
  /** Registers a task TeamRun restored inside a hosting TeamRun (flat identity lookup only). */
  registerRestoredTaskTeam(run: TeamRun): void {
    this.reserveIds([run.teamRunId]);
    this.commitRuns([run], true);
  }
  require(teamRunId: string): TeamRun {
    const run = this.get(teamRunId);
    if (!run) throw new Error(`AgentOrg TeamRun '${teamRunId}' is not active.`);
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
      prepared = await this.factory.materialize({ ...input, prepareConfiguredAgents: false });
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

  reserveTaskSubtree(runs: readonly TeamRun[]): AgentOrgTeamRegistrationReservation {
    const ids = runs.map((run) => run.teamRunId);
    this.reserveIds(ids);
    let state: "reserved" | "committed" | "cancelled" = "reserved";
    return Object.freeze({
      commit: () => {
        if (state !== "reserved") throw new Error("AgentOrg task TeamRun reservation is not committable.");
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

  async prepareRootTaskTeam(input: Readonly<{
    task: PrepareTaskTeamInput;
    physicalScope: RootExecutionPhysicalScope;
    callbacks: FlatTeamExecutionCallbacks;
  }>): Promise<PreparedTaskExecution> {
    const eventGate = new TaskAgentDurabilityEventGate(input.callbacks.publishAgentEvent);
    const callbacks: FlatTeamExecutionCallbacks = Object.freeze({
      ...input.callbacks,
      publishAgentEvent: eventGate.publish,
    });
    const prepared = await this.factory.materialize({
      physicalScope: input.physicalScope,
      teamNode: input.task.teamNode,
      handoffs: input.task.handoffs,
      applicationBinding: null,
      activationMode: "fresh",
      callbacks,
      prepareConfiguredAgents: true,
    }).catch((error) => { eventGate.abort(); throw error; });
    const coordinator = input.task.teamNode.children.find((child) => child.kind === "agent" && child.address === input.task.teamNode.coordinatorAddress);
    if (!coordinator || coordinator.kind !== "agent") {
      eventGate.abort();
      await prepared.abort();
      throw new Error(`Task TeamRun '${input.task.teamRunId}' has no exact coordinator.`);
    }
    let state: "preparing" | "sealed" | "committed" | "aborted" = "preparing";
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
        prepared.commitAfterDurability();
        state = "committed";
        let released = false;
        return Object.freeze({ releaseWork: () => {
          if (released) return;
          released = true;
          if (!eventGate.releaseToLive()) return;
          queueMicrotask(() => { void prepared.teamRun.postMessage(input.task.message, coordinator.agentRunId); });
        } });
      },
      abort: async () => {
        if (state === "committed" || state === "aborted") return;
        state = "aborted";
        eventGate.abort();
        await prepared.abort();
      },
    });
  }

  /** Re-creates one shut-down Org-root task Team in `restore` mode; members activate lazily on input. */
  async restoreRootTaskTeam(input: Readonly<{
    teamNode: TeamRunAgentTeamNode;
    handoffs: PrepareTaskTeamInput["handoffs"];
    physicalScope: RootExecutionPhysicalScope;
    callbacks: FlatTeamExecutionCallbacks;
  }>): Promise<TeamRun> {
    this.reserveIds([input.teamNode.teamRunId]);
    let prepared: PreparedFlatTeamExecution;
    try {
      prepared = await this.factory.materialize({
        physicalScope: input.physicalScope,
        teamNode: input.teamNode,
        handoffs: input.handoffs,
        applicationBinding: null,
        activationMode: "restore",
        callbacks: input.callbacks,
        prepareConfiguredAgents: false,
      });
    } catch (error) {
      this.releaseIds([input.teamNode.teamRunId]);
      throw error;
    }
    prepared.commitAfterDurability();
    this.commitRuns([prepared.teamRun], true);
    return prepared.teamRun;
  }

  /** Shuts one Org-root task Team down as a whole only when it is quiet. */
  async tryShutDownRootTaskTeamIfQuiet(teamRunId: string): Promise<boolean> {
    const run = this.active.get(teamRunId);
    if (!run || !this.taskTeamRunIds.has(teamRunId) || this.shuttingDown.has(teamRunId)) return false;
    this.shuttingDown.add(teamRunId);
    try {
      const local = await run.tryPrepareTerminationIfQuiescent();
      if (!local) return false;
      if (this.active.get(teamRunId) !== run) {
        local.cancel();
        return false;
      }
      this.active.delete(teamRunId);
      this.taskTeamRunIds.delete(teamRunId);
      const result = await local.commit().finish().catch((cause: unknown) => {
        throw new TaskExecutionTeardownIndeterminateError(teamRunId, `Task TeamRun '${teamRunId}' shutdown did not finish.`, { cause });
      });
      if (!result.accepted) {
        throw new TaskExecutionTeardownIndeterminateError(teamRunId, result.message ?? `Task TeamRun '${teamRunId}' shutdown was rejected.`);
      }
      return true;
    } finally {
      this.shuttingDown.delete(teamRunId);
    }
  }

  private reserveIds(ids: readonly string[]): void {
    if (!this.materializationOpen) throw new Error("AgentOrg Team materialization is closed.");
    const duplicate = ids.find((id) => this.active.has(id) || this.reserved.has(id));
    if (duplicate) throw new Error(`AgentOrg TeamRun '${duplicate}' is already active or reserved.`);
    ids.forEach((id) => this.reserved.add(id));
  }
  private releaseIds(ids: readonly string[]): void { ids.forEach((id) => this.reserved.delete(id)); }
  private commitRuns(runs: readonly TeamRun[], taskTeams = false): void {
    for (const run of runs) {
      if (!this.reserved.delete(run.teamRunId)) throw new Error(`AgentOrg TeamRun '${run.teamRunId}' is not reserved.`);
      this.active.set(run.teamRunId, run);
      if (taskTeams) this.taskTeamRunIds.add(run.teamRunId);
    }
  }
}
