import type { RootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { TaskAgentDurabilityEventGate } from "../../agent-collaboration/execution/services/task-agent-durability-event-gate.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import { FlatTeamExecutionFactory, type PreparedFlatTeamExecution } from "../../agent-team-execution/local/flat-team-execution-factory.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { PrepareTaskTeamInput } from "../../agent-team-execution/domain/task-team-execution.js";
import type { PreparedTaskExecution } from "../../agent-team-execution/domain/prepared-task-execution.js";
import type { PreparedTaskSettlement } from "../../agent-team-execution/domain/prepared-task-settlement.js";
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
  get(teamRunId: string): TeamRun | null { return this.active.get(teamRunId) ?? null; }
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
        this.commitRuns(runs);
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

  async prepareSettlement(taskId: string, teamRunId: string): Promise<PreparedTaskSettlement | null> {
    const run = this.active.get(teamRunId);
    if (!run) return null;
    const local = await run.tryPrepareTerminationIfQuiescent();
    if (!local) return null;
    if (this.active.get(teamRunId) !== run) {
      local.cancel();
      return null;
    }
    const node = run.context.teamNode;
    const coordinator = node.children.find((child) => child.kind === "agent" && child.address === node.coordinatorAddress);
    if (!coordinator || coordinator.kind !== "agent") {
      local.cancel();
      throw new Error(`Task TeamRun '${teamRunId}' has no exact coordinator.`);
    }
    let state: "prepared" | "cancelled" | "committed" = "prepared";
    return Object.freeze({
      taskId,
      binding: Object.freeze({ kind: "team", address: node.address, teamRunId, coordinatorAgentRunId: coordinator.agentRunId }),
      cancelBeforeDurability: () => {
        if (state !== "prepared") return;
        state = "cancelled";
        local.cancel();
      },
      commitAfterDurability: () => {
        if (state !== "prepared" || this.active.get(teamRunId) !== run) throw new Error(`Task TeamRun '${teamRunId}' changed before settlement.`);
        state = "committed";
        this.active.delete(teamRunId);
        const commit = local.commit();
        return Object.freeze({ finishLocalTeardown: () => commit.finish() });
      },
    });
  }

  private reserveIds(ids: readonly string[]): void {
    if (!this.materializationOpen) throw new Error("AgentOrg Team materialization is closed.");
    const duplicate = ids.find((id) => this.active.has(id) || this.reserved.has(id));
    if (duplicate) throw new Error(`AgentOrg TeamRun '${duplicate}' is already active or reserved.`);
    ids.forEach((id) => this.reserved.add(id));
  }
  private releaseIds(ids: readonly string[]): void { ids.forEach((id) => this.reserved.delete(id)); }
  private commitRuns(runs: readonly TeamRun[]): void {
    for (const run of runs) {
      if (!this.reserved.delete(run.teamRunId)) throw new Error(`AgentOrg TeamRun '${run.teamRunId}' is not reserved.`);
      this.active.set(run.teamRunId, run);
    }
  }
}
