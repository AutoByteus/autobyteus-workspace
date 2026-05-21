import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type {
  AgentApiStatus,
  AgentStatusPayload,
} from "../../agent-execution/domain/agent-status-payload.js";

export interface TeamRunListStatusProjection {
  isActive: boolean;
  status: AgentApiStatus;
  memberStatusSnapshots: AgentStatusPayload[];
}

export class TeamRunStatusProjectionService {
  constructor(
    private readonly teamRunManager: Pick<AgentTeamRunManager, "getActiveRun"> =
      AgentTeamRunManager.getInstance(),
  ) {}

  getCatalogListStatusProjection(teamRunId: string): TeamRunListStatusProjection {
    const activeTeamRun = this.teamRunManager.getActiveRun(teamRunId);
    if (!activeTeamRun) {
      return {
        isActive: false,
        status: "offline",
        memberStatusSnapshots: [],
      };
    }

    return {
      isActive: true,
      status: typeof activeTeamRun.getStatusSnapshot === "function"
        ? activeTeamRun.getStatusSnapshot().status
        : "running",
      memberStatusSnapshots:
        typeof activeTeamRun.getMemberStatusSnapshots === "function"
          ? activeTeamRun.getMemberStatusSnapshots()
          : [],
    };
  }
}
