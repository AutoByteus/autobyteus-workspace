import type { RootExecutionPhysicalScope } from "../domain/root-execution-identity.js";
import { TeamRunMembership } from "../../../agent-team-execution/domain/team-run-membership.js";
import type { FlatTeamExecutionCallbacks } from "../../../agent-team-execution/local/flat-team-execution-callbacks.js";
import { FlatTeamExecutionFactory, type PreparedFlatTeamExecution } from "../../../agent-team-execution/local/flat-team-execution-factory.js";
import type { TeamRun } from "../../../agent-team-execution/domain/team-run.js";
import type { TeamRunAgentTeamNode, TeamRunConfig } from "../../../agent-team-execution/domain/team-run-config.js";
import type { ConfiguredMemberActivationMode } from "../../../agent-team-execution/local/flat-team-execution-context.js";
import type { FrozenTeamRunTerminationScope } from "../../../agent-team-execution/domain/frozen-team-run-termination-scope.js";

/** An organization run's mounted Teams (autobyteus-461: a team run its agents delegated to is its own run). */
export class RootTeamExecutionDirectory {
  private readonly active = new Map<string, TeamRun>();
  private readonly reserved = new Set<string>();
  private materializationOpen = true;

  constructor(private readonly factory: FlatTeamExecutionFactory) {}

  list(): readonly TeamRun[] { return Object.freeze([...this.active.values()]); }
  freezeForRootTermination(): readonly FrozenTeamRunTerminationScope[] {
    this.materializationOpen = false;
    if (this.reserved.size) {
      throw new Error("Root Team publication was still reserved at root-scope freeze.");
    }
    return Object.freeze([...this.active.values()].map((run) => run.freezeForRootTermination()));
  }
  /** Exact cleanup authority; never used to wake or admit input. */
  getManaged(teamRunId: string): TeamRun | null { return this.active.get(teamRunId) ?? null; }
  get(teamRunId: string): TeamRun | null {
    const run = this.active.get(teamRunId);
    return run?.isActive() ? run : null;
  }
  hasOpenExecutionWork(): boolean { return [...this.active.values()].some((run) => run.hasOpenExecutionWork()); }
  require(teamRunId: string): TeamRun {
    const run = this.get(teamRunId);
    if (!run) throw new Error(`Mounted TeamRun '${teamRunId}' is not active.`);
    return run;
  }

  async prepareConfigured(input: Readonly<{
    physicalScope: RootExecutionPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    handoffs: TeamRunConfig["handoffs"];
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
      // A team mounted in an Org run keeps the members and rules it was mounted with (it does not follow its definition).
      prepared = await this.factory.beginMaterialization({ physicalScope: input.physicalScope, callbacks: input.callbacks,
        activationMode: input.activationMode, membership: new TeamRunMembership({ teamNode: input.teamNode, handoffs: input.handoffs }) }).prepare();
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

  private reserveIds(ids: readonly string[]): void {
    if (!this.materializationOpen) throw new Error("Root Team materialization is closed.");
    const duplicate = ids.find((id) => this.active.has(id) || this.reserved.has(id));
    if (duplicate) throw new Error(`Mounted TeamRun '${duplicate}' is already active or reserved.`);
    ids.forEach((id) => this.reserved.add(id));
  }
  private releaseIds(ids: readonly string[]): void { ids.forEach((id) => this.reserved.delete(id)); }
  private commitRuns(runs: readonly TeamRun[]): void {
    for (const run of runs) {
      if (!this.reserved.delete(run.teamRunId)) throw new Error(`Mounted TeamRun '${run.teamRunId}' is not reserved.`);
      this.active.set(run.teamRunId, run);
    }
  }
}
