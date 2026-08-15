import type { TeamRun } from "../domain/team-run.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";

export type TeamRunRegistrationReservation = Readonly<{
  teamRunIds: readonly string[];
  commit(): void;
  cancel(): void;
}>;

/** Private live TeamRun directory owned by one RootTeamRun. */
export class TeamRunResolver {
  private readonly active = new Map<string, TeamRun>();
  private readonly reserved = new Map<string, TeamRun>();

  constructor(private readonly options: {
    rootTeamRun: TeamRun;
    getIndex(): TeamExecutionIndex;
  }) {
    this.active.set(options.rootTeamRun.teamRunId, options.rootTeamRun);
  }

  getActive(teamRunId: string): TeamRun | null {
    const run = this.active.get(teamRunId) ?? null;
    if (!run?.isActive()) {
      if (run) this.active.delete(teamRunId);
      return null;
    }
    return run;
  }

  async requireConfigured(teamRunId: string): Promise<TeamRun> {
    const existing = this.getActive(teamRunId);
    if (existing) return existing;
    const index = this.options.getIndex();
    const chain = index.getConfiguredTeamRunChain(teamRunId);
    const root = this.getActive(chain[0]!);
    if (!root) throw new Error(`Root TeamRun '${chain[0]}' is not active.`);
    let current: TeamRun = root;
    for (const childTeamRunId of chain.slice(1)) {
      const registered = this.getActive(childTeamRunId);
      if (registered) {
        current = registered;
        continue;
      }
      const child: TeamRun = await current.getOrCreateConfiguredChildTeam(childTeamRunId);
      if (child.teamRunId !== childTeamRunId || !child.isActive()) {
        throw new Error(`Configured TeamRun '${childTeamRunId}' did not materialize exactly.`);
      }
      this.registerActive(child);
      current = child;
    }
    return current;
  }

  reserveTaskSubtree(teamRuns: readonly TeamRun[]): TeamRunRegistrationReservation {
    const unique = new Map(teamRuns.map((run) => [run.teamRunId, run]));
    if (unique.size !== teamRuns.length) throw new Error("Prepared task subtree contains duplicate TeamRuns.");
    for (const [teamRunId, run] of unique) {
      if (!run.isActive()) throw new Error(`Prepared TeamRun '${teamRunId}' is inactive.`);
      if (this.active.has(teamRunId) || this.reserved.has(teamRunId)) {
        throw new Error(`TeamRun '${teamRunId}' is already registered or reserved.`);
      }
    }
    unique.forEach((run, teamRunId) => this.reserved.set(teamRunId, run));
    let state: "reserved" | "committed" | "cancelled" = "reserved";
    return Object.freeze({
      teamRunIds: Object.freeze([...unique.keys()]),
      commit: () => {
        if (state !== "reserved") return;
        unique.forEach((run, teamRunId) => {
          this.reserved.delete(teamRunId);
          this.active.set(teamRunId, run);
        });
        state = "committed";
      },
      cancel: () => {
        if (state !== "reserved") return;
        unique.forEach((run, teamRunId) => {
          if (this.reserved.get(teamRunId) === run) this.reserved.delete(teamRunId);
        });
        state = "cancelled";
      },
    });
  }

  registerActive(teamRun: TeamRun): void {
    const existing = this.active.get(teamRun.teamRunId);
    if (existing && existing !== teamRun) {
      throw new Error(`TeamRun '${teamRun.teamRunId}' is already registered.`);
    }
    if (this.reserved.has(teamRun.teamRunId)) {
      throw new Error(`TeamRun '${teamRun.teamRunId}' has an uncommitted registration reservation.`);
    }
    this.active.set(teamRun.teamRunId, teamRun);
  }

  unregister(teamRunId: string, expected: TeamRun): void {
    if (this.active.get(teamRunId) === expected) this.active.delete(teamRunId);
  }

  unregisterInactive(): void {
    for (const [teamRunId, run] of this.active) {
      if (!run.isActive()) this.active.delete(teamRunId);
    }
  }

  listActive(): readonly TeamRun[] {
    return Object.freeze([...this.active.values()].filter((run) => run.isActive()));
  }

  clear(): void {
    this.active.clear();
    this.reserved.clear();
  }
}
