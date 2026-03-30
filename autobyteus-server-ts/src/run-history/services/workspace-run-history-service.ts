import type {
  RunHistoryAgentGroup,
} from "../domain/agent-run-history-index-types.js";
import type {
  TeamRunHistoryItem,
} from "../domain/team-run-history-index-types.js";
import {
  getAgentRunHistoryService,
  type AgentRunHistoryService,
} from "./agent-run-history-service.js";
import {
  getTeamRunHistoryService,
  type TeamRunHistoryService,
} from "./team-run-history-service.js";

export interface WorkspaceRunHistoryGroup {
  workspaceRootPath: string;
  workspaceName: string;
  agents: RunHistoryAgentGroup[];
  teamRuns: TeamRunHistoryItem[];
}

const UNASSIGNED_TEAM_WORKSPACE_KEY = "unassigned-team-workspace";
const UNASSIGNED_TEAM_WORKSPACE_LABEL = "Unassigned Team Workspace";

const normalizeWorkspaceRootPath = (value: string | null | undefined): string => {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : UNASSIGNED_TEAM_WORKSPACE_KEY;
};

const workspaceNameFromRootPath = (workspaceRootPath: string): string => {
  if (workspaceRootPath === UNASSIGNED_TEAM_WORKSPACE_KEY) {
    return UNASSIGNED_TEAM_WORKSPACE_LABEL;
  }

  const normalized = workspaceRootPath.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized) {
    return "workspace";
  }

  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
};

export class WorkspaceRunHistoryService {
  private readonly agentRunHistoryService: AgentRunHistoryService;
  private readonly teamRunHistoryService: TeamRunHistoryService;

  constructor(
    options: {
      agentRunHistoryService?: AgentRunHistoryService;
      teamRunHistoryService?: TeamRunHistoryService;
    } = {},
  ) {
    this.agentRunHistoryService =
      options.agentRunHistoryService ?? getAgentRunHistoryService();
    this.teamRunHistoryService =
      options.teamRunHistoryService ?? getTeamRunHistoryService();
  }

  async listWorkspaceRunHistory(limitPerAgent = 6): Promise<WorkspaceRunHistoryGroup[]> {
    const [agentWorkspaceGroups, teamRuns] = await Promise.all([
      this.agentRunHistoryService.listRunHistory(limitPerAgent),
      this.teamRunHistoryService.listTeamRunHistory(),
    ]);

    const grouped = new Map<string, WorkspaceRunHistoryGroup>();

    for (const workspaceGroup of agentWorkspaceGroups) {
      grouped.set(workspaceGroup.workspaceRootPath, {
        workspaceRootPath: workspaceGroup.workspaceRootPath,
        workspaceName: workspaceGroup.workspaceName,
        agents: workspaceGroup.agents,
        teamRuns: [],
      });
    }

    for (const teamRun of teamRuns) {
      const workspaceRootPath = normalizeWorkspaceRootPath(teamRun.workspaceRootPath);
      const existing = grouped.get(workspaceRootPath);
      if (existing) {
        existing.teamRuns.push(teamRun);
        continue;
      }

      grouped.set(workspaceRootPath, {
        workspaceRootPath,
        workspaceName: workspaceNameFromRootPath(workspaceRootPath),
        agents: [],
        teamRuns: [teamRun],
      });
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.workspaceName.localeCompare(b.workspaceName),
    );
  }
}

let cachedWorkspaceRunHistoryService: WorkspaceRunHistoryService | null = null;

export const getWorkspaceRunHistoryService = (): WorkspaceRunHistoryService => {
  if (!cachedWorkspaceRunHistoryService) {
    cachedWorkspaceRunHistoryService = new WorkspaceRunHistoryService();
  }
  return cachedWorkspaceRunHistoryService;
};
