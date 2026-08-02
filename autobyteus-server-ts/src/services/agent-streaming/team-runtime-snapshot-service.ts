import type { TeamRunLifecycleSnapshot } from "../../agent-team-execution/domain/team-run-lifecycle.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { ServerMessage, ServerMessageType } from "./models.js";
import { mapTeamLeafAgentStatusSnapshot } from "./team-stream-agent-identity-payload.js";

export class TeamRuntimeSnapshotService {
  getInitialMessages(
    teamRun: TeamRun,
    lifecycleSnapshot: TeamRunLifecycleSnapshot,
  ): ServerMessage[] {
    const memberMessages = teamRun.getLeafAgentStatusSnapshots().map(
      mapTeamLeafAgentStatusSnapshot,
    );

    return [
      ...memberMessages,
      new ServerMessage(ServerMessageType.TEAM_RUN_LIFECYCLE, {
        team_run_id: lifecycleSnapshot.teamRunId,
        is_active: lifecycleSnapshot.isActive,
      }),
    ];
  }
}

let cachedTeamRuntimeSnapshotService: TeamRuntimeSnapshotService | null = null;

export const getTeamRuntimeSnapshotService = (): TeamRuntimeSnapshotService => {
  if (!cachedTeamRuntimeSnapshotService) {
    cachedTeamRuntimeSnapshotService = new TeamRuntimeSnapshotService();
  }
  return cachedTeamRuntimeSnapshotService;
};
