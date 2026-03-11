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
}

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isTeamMemberAgentRun = (domainAgent: AgentLike | null): boolean => {
  if (!domainAgent) {
    return false;
  }

  const customData = domainAgent.context?.customData ?? {};
  return (
    asNonEmptyString(customData.member_route_key) !== null ||
    asNonEmptyString(customData.member_run_id) !== null
  );
};

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
  ) {}

  async listActiveAgentRuns(): Promise<ActiveRuntimeAgentRunSnapshot[]> {
    const runIds = this.agentRunManager.listActiveRuns();
    const results = await Promise.all(
      runIds.map(async (runId) => {
        const domainAgent = this.agentRunManager.getAgentRun(runId) as AgentLike | null;
        if (!domainAgent || isTeamMemberAgentRun(domainAgent)) {
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
          return AgentTeamRunConverter.toGraphql(domainTeam) as ActiveRuntimeTeamRunSnapshot;
        }

        const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(teamRunId);
        return {
          id: teamRunId,
          name: resumeConfig.manifest.teamDefinitionName,
          role: null,
          currentStatus: resumeConfig.isActive ? "ACTIVE" : "IDLE",
        } satisfies ActiveRuntimeTeamRunSnapshot;
      }),
    );

    return results;
  }
}

let cachedActiveRuntimeSnapshotService: ActiveRuntimeSnapshotService | null = null;

export const getActiveRuntimeSnapshotService = (): ActiveRuntimeSnapshotService => {
  if (!cachedActiveRuntimeSnapshotService) {
    cachedActiveRuntimeSnapshotService = new ActiveRuntimeSnapshotService();
  }
  return cachedActiveRuntimeSnapshotService;
};
