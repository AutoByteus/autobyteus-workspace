import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type { TeamRun } from "../domain/team-run.js";
import type { MixedTeamRunContext } from "../backends/mixed/mixed-team-run-context.js";

export type TaskDelegationPersistenceScope = { rootTeamRunId: string; currentTeamRunId: string; ancestorTeamRunIds: string[] };
export const resolveTaskDelegationPersistenceScope = (teamRun: TeamRun): TaskDelegationPersistenceScope => ({
  rootTeamRunId: teamRun.config.rootTeam.teamRunId,
  currentTeamRunId: teamRun.teamRunId,
  ancestorTeamRunIds: [...teamRun.context.taskTeamRunIds],
});
export const getTaskDelegationTaskTeamInstance = (teamRun: TeamRun): TaskTeamInstanceIdentity | null =>
  (teamRun.getRuntimeContext() as MixedTeamRunContext | null)?.taskTeamInstance ?? null;
