import type { TeamRun } from "../domain/team-run.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";

/** The one TeamRun a RootTeamRun owns: its own team (autobyteus-461: a team it delegated to is its own run). */
export class TeamRunResolver {
  private managed: TeamRun | null;

  constructor(private readonly options: {
    rootTeamRun: TeamRun;
    getIndex(): TeamExecutionIndex;
  }) {
    this.managed = options.rootTeamRun;
  }

  getActive(teamRunId: string): TeamRun | null {
    const run = this.getManaged(teamRunId);
    return run?.isActive() ? run : null;
  }

  getManaged(teamRunId: string): TeamRun | null { return this.managed?.teamRunId === teamRunId ? this.managed : null; }

  async requireConfigured(teamRunId: string): Promise<TeamRun> {
    const existing = this.getActive(teamRunId);
    if (existing) return existing;
    this.options.getIndex().requireTeam(teamRunId);
    throw new Error(`Configured TeamRun '${teamRunId}' is not the active flat root TeamRun.`);
  }

  clear(): void { this.managed = null; }
}
