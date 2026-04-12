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
  agentDefinitions: RunHistoryAgentGroup[];
  teamDefinitions: WorkspaceTeamDefinitionHistoryGroup[];
}

export interface WorkspaceTeamDefinitionHistoryGroup {
  teamDefinitionId: string;
  teamDefinitionName: string;
  runs: TeamRunHistoryItem[];
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
        agentDefinitions: workspaceGroup.agents,
        teamDefinitions: [],
      });
    }

    const teamRunsByWorkspace = new Map<string, TeamRunHistoryItem[]>();
    for (const teamRun of teamRuns) {
      const workspaceRootPath = normalizeWorkspaceRootPath(teamRun.workspaceRootPath);
      const existingRuns = teamRunsByWorkspace.get(workspaceRootPath);
      if (existingRuns) {
        existingRuns.push(teamRun);
      } else {
        teamRunsByWorkspace.set(workspaceRootPath, [teamRun]);
      }

      if (!grouped.has(workspaceRootPath)) {
        grouped.set(workspaceRootPath, {
          workspaceRootPath,
          workspaceName: workspaceNameFromRootPath(workspaceRootPath),
          agentDefinitions: [],
          teamDefinitions: [],
        });
      }
    }

    return Array.from(grouped.values())
      .map((workspaceGroup) => ({
        ...workspaceGroup,
        teamDefinitions: groupTeamRunsByDefinition(
          teamRunsByWorkspace.get(workspaceGroup.workspaceRootPath) ?? [],
        ),
      }))
      .sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
  }
}

let cachedWorkspaceRunHistoryService: WorkspaceRunHistoryService | null = null;

export const getWorkspaceRunHistoryService = (): WorkspaceRunHistoryService => {
  if (!cachedWorkspaceRunHistoryService) {
    cachedWorkspaceRunHistoryService = new WorkspaceRunHistoryService();
  }
  return cachedWorkspaceRunHistoryService;
};

const groupTeamRunsByDefinition = (
  teamRuns: TeamRunHistoryItem[],
): WorkspaceTeamDefinitionHistoryGroup[] => {
  const groups = new Map<string, WorkspaceTeamDefinitionHistoryGroup>();

  for (const teamRun of teamRuns) {
    const key = teamRun.teamDefinitionId.trim() || teamRun.teamDefinitionName.trim() || teamRun.teamRunId;
    const existing = groups.get(key);
    if (existing) {
      existing.runs.push(teamRun);
      continue;
    }

    groups.set(key, {
      teamDefinitionId: teamRun.teamDefinitionId,
      teamDefinitionName: teamRun.teamDefinitionName,
      runs: [teamRun],
    });
  }

  return Array.from(groups.values());
};
