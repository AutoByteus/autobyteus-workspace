import type { TeamRun } from "../domain/team-run.js";

/** Active persistent child TeamRuns keyed by their canonical child run identity. */
export class SubTeamActiveRunDirectory {
  private readonly runsById = new Map<string, TeamRun>();

  bind(run: TeamRun): void {
    const runId = run.teamRunId.trim();
    if (!runId) {
      throw new Error("childTeamRunId is required.");
    }
    this.runsById.set(runId, run);
  }

  resolveActiveRun(teamRunIdInput: string | null | undefined): TeamRun | null {
    const teamRunId = teamRunIdInput?.trim();
    if (!teamRunId) return null;
    const run = this.runsById.get(teamRunId) ?? null;
    if (run?.isActive()) return run;
    if (run) this.runsById.delete(teamRunId);
    return null;
  }

  unbind(teamRunIdInput: string | null | undefined): void {
    const teamRunId = teamRunIdInput?.trim();
    if (teamRunId) this.runsById.delete(teamRunId);
  }

  clear(): void {
    this.runsById.clear();
  }
}

let cachedSubTeamActiveRunDirectory: SubTeamActiveRunDirectory | null = null;

export const getSubTeamActiveRunDirectory = (): SubTeamActiveRunDirectory => {
  cachedSubTeamActiveRunDirectory ??= new SubTeamActiveRunDirectory();
  return cachedSubTeamActiveRunDirectory;
};

export const clearSubTeamActiveRunDirectory = (): void => {
  getSubTeamActiveRunDirectory().clear();
};
