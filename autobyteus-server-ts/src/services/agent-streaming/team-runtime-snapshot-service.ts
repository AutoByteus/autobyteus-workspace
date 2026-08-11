import type { TeamRunLifecycleSnapshot } from "../../agent-team-execution/domain/team-run-lifecycle.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  parseTeamStreamServerMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import { projectTeamAgentStatusMessage } from "./team-agent-event-websocket-projector.js";

export class TeamRuntimeSnapshotService {
  getInitialMessages(
    teamRun: TeamRun,
    lifecycleSnapshot: TeamRunLifecycleSnapshot,
  ): TeamStreamServerMessage[] {
    const memberMessages = teamRun.getLeafAgentStatusSnapshots().map(
      projectTeamAgentStatusMessage,
    );

    return [
      ...memberMessages,
      parseTeamStreamServerMessage({
        type: "TEAM_RUN_LIFECYCLE",
        payload: { is_active: lifecycleSnapshot.isActive },
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
