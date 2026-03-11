import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../agent-team-execution/services/agent-team-run-manager.js";
import {
  getTeamMemberRuntimeOrchestrator,
  type TeamMemberRuntimeOrchestrator,
} from "../../../agent-team-execution/services/team-member-runtime-orchestrator.js";
import { AgentRunConverter } from "../converters/agent-run-converter.js";
import { AgentTeamRunConverter } from "../converters/agent-team-run-converter.js";
import {
  getTeamRunHistoryService,
  type TeamRunHistoryService,
} from "../../../run-history/services/team-run-history-service.js";
import {
  getRunOwnershipResolutionService,
  type RunOwnershipResolutionService,
} from "../../../run-history/services/run-ownership-resolution-service.js";
import {
  getTeamRuntimeStatusSnapshotService,
  type TeamRuntimeMemberStatusSnapshot,
  type TeamRuntimeStatusSnapshotService,
} from "../../../services/agent-streaming/team-runtime-status-snapshot-service.js";

type AgentLike = Parameters<typeof AgentRunConverter.toGraphql>[0];
type TeamLike = Parameters<typeof AgentTeamRunConverter.toGraphql>[0];

export interface ActiveRuntimeAgentRunSnapshot {
  id: string;
  name: string;
  role: string;
  currentStatus: string;
  workspace: Awaited<ReturnType<typeof AgentRunConverter.toGraphql>>["workspace"];
  agentDefinitionId?: string | null;
}

export interface ActiveRuntimeTeamRunSnapshot {
  id: string;
  name: string;
  role?: string | null;
  currentStatus: string;
  members: ActiveRuntimeTeamMemberSnapshot[];
}

export interface ActiveRuntimeTeamMemberSnapshot {
  memberRouteKey: string | null;
  memberName: string;
  memberRunId: string | null;
  currentStatus: string;
}

export class ActiveRuntimeSnapshotService {
  constructor(
    private readonly agentRunManager: Pick<AgentRunManager, "listActiveRuns" | "getAgentRun"> =
      AgentRunManager.getInstance(),
    private readonly agentTeamRunManager: Pick<AgentTeamRunManager, "listActiveRuns" | "getTeamRun"> =
      AgentTeamRunManager.getInstance(),
    private readonly teamMemberRuntimeOrchestrator: Pick<
      TeamMemberRuntimeOrchestrator,
      "listActiveTeamRunIds"
    > = getTeamMemberRuntimeOrchestrator(),
    private readonly teamRunHistoryService: Pick<
      TeamRunHistoryService,
      "getTeamRunResumeConfig"
    > = getTeamRunHistoryService(),
    private readonly runOwnershipResolutionService: Pick<
      RunOwnershipResolutionService,
      "resolveOwnership"
    > = getRunOwnershipResolutionService(),
    private readonly teamRuntimeStatusSnapshotService: Pick<
      TeamRuntimeStatusSnapshotService,
      "getSnapshot"
    > = getTeamRuntimeStatusSnapshotService(),
  ) {}

  async listActiveAgentRuns(): Promise<ActiveRuntimeAgentRunSnapshot[]> {
    const runIds = this.agentRunManager.listActiveRuns();
    const results = await Promise.all(
      runIds.map(async (runId) => {
        const domainAgent = this.agentRunManager.getAgentRun(runId) as AgentLike | null;
        if (!domainAgent) {
          return null;
        }
        const ownership = await this.runOwnershipResolutionService.resolveOwnership(runId, {
          domainAgent,
        });
        if (ownership.kind === "team_member") {
          return null;
        }
        return (await AgentRunConverter.toGraphql(
          domainAgent,
        )) as ActiveRuntimeAgentRunSnapshot;
      }),
    );
    return results.filter((item): item is ActiveRuntimeAgentRunSnapshot => item !== null);
  }

  async listActiveTeamRuns(): Promise<ActiveRuntimeTeamRunSnapshot[]> {
    const activeTeamRunIds = new Set<string>(this.agentTeamRunManager.listActiveRuns());
    for (const teamRunId of this.teamMemberRuntimeOrchestrator.listActiveTeamRunIds()) {
      activeTeamRunIds.add(teamRunId);
    }

    const results = await Promise.all(
      Array.from(activeTeamRunIds).map(async (teamRunId) => {
        const domainTeam = this.agentTeamRunManager.getTeamRun(teamRunId) as TeamLike | null;
        if (domainTeam) {
          const snapshot = this.teamRuntimeStatusSnapshotService.getSnapshot({
            teamRunId,
            runtimeMode: "native_team",
            team: domainTeam,
          });
          const converted = AgentTeamRunConverter.toGraphql(domainTeam);
          return {
            ...converted,
            currentStatus: snapshot.currentStatus ?? converted.currentStatus,
            members: this.toActiveTeamMembers(snapshot.members),
          } satisfies ActiveRuntimeTeamRunSnapshot;
        }

        const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(teamRunId);
        const snapshot = this.teamRuntimeStatusSnapshotService.getSnapshot({
          teamRunId,
          runtimeMode: "member_runtime",
          team: null,
        });
        return {
          id: teamRunId,
          name: resumeConfig.manifest.teamDefinitionName,
          role: null,
          currentStatus: snapshot.currentStatus ?? (resumeConfig.isActive ? "PROCESSING" : "IDLE"),
          members: this.toActiveTeamMembers(snapshot.members),
        } satisfies ActiveRuntimeTeamRunSnapshot;
      }),
    );

    return results;
  }

  private toActiveTeamMembers(
    members: TeamRuntimeMemberStatusSnapshot[],
  ): ActiveRuntimeTeamMemberSnapshot[] {
    return members.map((member) => ({
      memberRouteKey: member.memberRouteKey,
      memberName: member.memberName,
      memberRunId: member.memberRunId,
      currentStatus: member.currentStatus,
    }));
  }
}

let cachedActiveRuntimeSnapshotService: ActiveRuntimeSnapshotService | null = null;

export const getActiveRuntimeSnapshotService = (): ActiveRuntimeSnapshotService => {
  if (!cachedActiveRuntimeSnapshotService) {
    cachedActiveRuntimeSnapshotService = new ActiveRuntimeSnapshotService();
  }
  return cachedActiveRuntimeSnapshotService;
};
