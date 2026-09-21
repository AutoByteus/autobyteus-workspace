import type { TeamRun } from "../domain/team-run.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";

export type TeamRunRegistrationReservation = Readonly<{
  teamRunIds: readonly string[];
  commit(): void;
  cancel(): void;
}>;

/** Private nonterminal TeamRun directory owned by one RootTeamRun. */
export class TeamRunResolver {
  private readonly managed = new Map<string, TeamRun>();
  private readonly reserved = new Map<string, TeamRun>();
  private registrationOpen = true;

  constructor(private readonly options: {
    rootTeamRun: TeamRun;
    getIndex(): TeamExecutionIndex;
  }) {
    this.managed.set(options.rootTeamRun.teamRunId, options.rootTeamRun);
  }

  getActive(teamRunId: string): TeamRun | null {
    const run = this.getManaged(teamRunId);
    return run?.isActive() ? run : null;
  }

  getManaged(teamRunId: string): TeamRun | null { return this.managed.get(teamRunId) ?? null; }
  closeRegistration(): void { this.registrationOpen = false; }

  async requireConfigured(teamRunId: string): Promise<TeamRun> {
    const existing = this.getActive(teamRunId);
    if (existing) return existing;
    this.options.getIndex().requireTeam(teamRunId);
    throw new Error(`Configured TeamRun '${teamRunId}' is not the active flat root TeamRun.`);
  }

  reserveTaskSubtree(teamRuns: readonly TeamRun[]): TeamRunRegistrationReservation {
    if (!this.registrationOpen) throw new Error("TeamRun registration is closed for root termination.");
    const unique = new Map(teamRuns.map((run) => [run.teamRunId, run]));
    if (unique.size !== teamRuns.length) throw new Error("Prepared task subtree contains duplicate TeamRuns.");
    for (const [teamRunId, run] of unique) {
      if (!run.isActive()) throw new Error(`Prepared TeamRun '${teamRunId}' is inactive.`);
      if (this.managed.has(teamRunId) || this.reserved.has(teamRunId)) {
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
          this.managed.set(teamRunId, run);
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

  registerManaged(teamRun: TeamRun): void {
    if (!this.registrationOpen) throw new Error("TeamRun registration is closed for root termination.");
    const existing = this.managed.get(teamRun.teamRunId);
    if (existing && existing !== teamRun) {
      throw new Error(`TeamRun '${teamRun.teamRunId}' is already registered.`);
    }
    if (this.reserved.has(teamRun.teamRunId)) {
      throw new Error(`TeamRun '${teamRun.teamRunId}' has an uncommitted registration reservation.`);
    }
    this.managed.set(teamRun.teamRunId, teamRun);
  }

  unregister(teamRunId: string, expected: TeamRun): void {
    if (this.managed.get(teamRunId) === expected) this.managed.delete(teamRunId);
  }

  unregisterTerminated(): void {
    for (const [teamRunId, run] of this.managed) {
      if (run.isTerminated()) this.managed.delete(teamRunId);
    }
  }

  listManaged(): readonly TeamRun[] {
    return Object.freeze([...this.managed.values()]);
  }

  clear(): void {
    this.managed.clear();
    this.reserved.clear();
  }
}
