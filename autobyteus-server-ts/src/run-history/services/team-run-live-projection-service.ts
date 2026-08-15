import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";

export interface TeamRunListLiveProjection {
  isActive: boolean;
  memberStatusSnapshots: TeamRunMemberStatusProjection[];
}

export type TeamRunMemberStatusProjection = Readonly<{
  agentRunId: string;
  memberAddress: string;
  status: AgentApiStatus;
}>;

export class TeamRunLiveProjectionService {
  constructor(
    private readonly manager: Pick<AgentTeamRunManager, "getTeamRun" | "getLifecycleSnapshot"> = AgentTeamRunManager.getInstance(),
  ) {}

  getCatalogListLiveProjection(teamRunId: string): TeamRunListLiveProjection {
    const lifecycle = this.manager.getLifecycleSnapshot(teamRunId);
    const root = lifecycle.isActive ? this.manager.getTeamRun(teamRunId) : null;
    return root ? {
      isActive: true,
      memberStatusSnapshots: root.getLeafAgentStatusSnapshots().map((snapshot) => ({
        status: snapshot.details.status,
        agentRunId: snapshot.execution.agentRunId,
        memberAddress: snapshot.execution.memberAddress,
      })),
    } : { isActive: false, memberStatusSnapshots: [] };
  }
}
