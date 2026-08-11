import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import type {
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";

export interface TeamRunListLiveProjection {
  isActive: boolean;
  memberStatusSnapshots: TeamRunMemberStatusProjection[];
}

export type TeamRunMemberStatusProjection = Readonly<{
  executionAddress: TeamExecutionAddress;
  agentRunId: string;
  status: AgentApiStatus;
}>;

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
        .flatMap((snapshot): TeamRunMemberStatusProjection[] => {
          const agentRunId = snapshot.execution.kind === "task_team_agent"
            ? snapshot.execution.agentRunId
            : snapshot.execution.executionAddress.taskAgentRunId ??
              findAgentByAddress(
                activeTeamRun.config.rootTeam,
                snapshot.execution.executionAddress.memberAddress,
              )?.agentRunId;
          if (!agentRunId) return [];
          return [{
            status: snapshot.details.status,
            agentRunId,
            executionAddress: snapshot.execution.executionAddress,
          }];
        }),
    };
  }
}

const findAgentByAddress = (
  team: TeamRunAgentTeamNode,
  address: string,
): TeamRunAgentNode | null => {
  for (const child of team.children) {
    if (child.kind === "agent" && child.address === address) return child;
    if (child.kind === "agent_team") {
      const nested = findAgentByAddress(child, address);
      if (nested) return nested;
    }
  }
  return null;
};
