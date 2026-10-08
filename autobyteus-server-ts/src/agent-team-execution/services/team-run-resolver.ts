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
  private readonly releasedTeams = new Map<string, TeamRun>();
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

  getManaged(teamRunId: string): TeamRun | null { return this.managed.get(teamRunId) ?? this.releasedTeams.get(teamRunId) ?? null; }
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
          const previous = this.releasedTeams.get(teamRunId);
          if (previous) run.inheritReleasedTaskExecutionProof(previous);
          this.releasedTeams.delete(teamRunId);
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
    const previous = this.releasedTeams.get(teamRun.teamRunId);
    if (previous) teamRun.inheritReleasedTaskExecutionProof(previous);
    this.releasedTeams.delete(teamRun.teamRunId);
    this.managed.set(teamRun.teamRunId, teamRun);
  }

  unregister(teamRunId: string, expected: TeamRun): void {
    if (this.managed.get(teamRunId) === expected) this.managed.delete(teamRunId);
  }

  /** Reactivation: retires one terminated (released) TeamRun so its restored run can register and inherit its proof. */
  retireTerminated(teamRunId: string): void {
    const run = this.managed.get(teamRunId);
    if (run?.isTerminated()) { this.releasedTeams.set(teamRunId, run); this.managed.delete(teamRunId); }
  }

  listManaged(): readonly TeamRun[] {
    return Object.freeze([...this.managed.values()]);
  }

  clear(): void {
    this.managed.clear();
    this.releasedTeams.clear();
    this.reserved.clear();
  }
}
