import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { ServerMessage, ServerMessageType } from "./models.js";

export class TeamRuntimeStatusSnapshotService {
  getInitialMessages(teamRun: TeamRun): ServerMessage[] {
    const memberMessages = teamRun.getMemberStatusSnapshots().map((snapshot) =>
      new ServerMessage(ServerMessageType.AGENT_STATUS, snapshot),
    );

    return [
      ...memberMessages,
      new ServerMessage(ServerMessageType.TEAM_STATUS, teamRun.getStatusSnapshot()),
    ];
  }
}

let cachedTeamRuntimeStatusSnapshotService: TeamRuntimeStatusSnapshotService | null = null;

export const getTeamRuntimeStatusSnapshotService = (): TeamRuntimeStatusSnapshotService => {
  if (!cachedTeamRuntimeStatusSnapshotService) {
    cachedTeamRuntimeStatusSnapshotService = new TeamRuntimeStatusSnapshotService();
  }
  return cachedTeamRuntimeStatusSnapshotService;
};
