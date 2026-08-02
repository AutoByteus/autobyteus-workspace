import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { AgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";

export interface TeamRunListLiveProjection {
  isActive: boolean;
  memberStatusSnapshots: AgentStatusPayload[];
}

export class TeamRunLiveProjectionService {
  constructor(
    private readonly teamRunManager: Pick<
      AgentTeamRunManager,
      "getActiveRun" | "getLifecycleSnapshot"
    > = AgentTeamRunManager.getInstance(),
  ) {}

  getCatalogListLiveProjection(teamRunId: string): TeamRunListLiveProjection {
    const lifecycle = this.teamRunManager.getLifecycleSnapshot(teamRunId);
    if (!lifecycle.isActive) {
      return {
        isActive: false,
        memberStatusSnapshots: [],
      };
    }

    const activeTeamRun = this.teamRunManager.getActiveRun(teamRunId);
    if (!activeTeamRun) {
      return {
        isActive: false,
        memberStatusSnapshots: [],
      };
    }

    return {
      isActive: true,
      memberStatusSnapshots: activeTeamRun
        .getLeafAgentStatusSnapshots()
        .map((snapshot) => snapshot.payload),
    };
  }
}
