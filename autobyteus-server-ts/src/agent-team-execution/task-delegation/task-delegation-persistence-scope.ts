import type { TeamRun } from "../domain/team-run.js";

export type TaskDelegationPersistenceScope = { rootTeamRunId: string; currentTeamRunId: string; ancestorTeamRunIds: string[] };
export const resolveTaskDelegationPersistenceScope = (teamRun: TeamRun): TaskDelegationPersistenceScope => ({
  rootTeamRunId: teamRun.config.rootTeam.teamRunId,
  currentTeamRunId: teamRun.teamRunId,
  ancestorTeamRunIds: [...teamRun.context.taskTeamRunIds],
});
