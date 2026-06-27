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
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
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

    return buildWorkspaceGroups(agentWorkspaceGroups, teamRuns)
      .sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
  }

  async getWorkspaceRunHistory(
    workspaceRootPath: string,
    limitPerAgent = 6,
  ): Promise<WorkspaceRunHistoryGroup> {
    const canonicalRootPath = canonicalizeWorkspaceRootPath(workspaceRootPath);
    const [agentWorkspaceGroups, teamRuns] = await Promise.all([
      this.agentRunHistoryService.listRunHistory(limitPerAgent),
      this.teamRunHistoryService.listTeamRunHistory(),
    ]);

    return buildWorkspaceGroups(agentWorkspaceGroups, teamRuns, canonicalRootPath)[0] ?? {
      workspaceRootPath: canonicalRootPath,
      workspaceName: workspaceNameFromRootPath(canonicalRootPath),
      agentDefinitions: [],
      teamDefinitions: [],
    };
  }
}

let cachedWorkspaceRunHistoryService: WorkspaceRunHistoryService | null = null;

export const getWorkspaceRunHistoryService = (): WorkspaceRunHistoryService => {
  if (!cachedWorkspaceRunHistoryService) {
    cachedWorkspaceRunHistoryService = new WorkspaceRunHistoryService();
  }
  return cachedWorkspaceRunHistoryService;
};


const buildWorkspaceGroups = (
  agentWorkspaceGroups: Array<{
    workspaceRootPath: string;
    workspaceName: string;
    agents: RunHistoryAgentGroup[];
  }>,
  teamRuns: TeamRunHistoryItem[],
  onlyWorkspaceRootPath: string | null = null,
): WorkspaceRunHistoryGroup[] => {
  const grouped = new Map<string, WorkspaceRunHistoryGroup>();

  const shouldInclude = (workspaceRootPath: string): boolean =>
    !onlyWorkspaceRootPath || workspaceRootPath === onlyWorkspaceRootPath;

  for (const workspaceGroup of agentWorkspaceGroups) {
    const workspaceRootPath = canonicalWorkspaceRootForHistory(workspaceGroup.workspaceRootPath);
    if (!shouldInclude(workspaceRootPath)) {
      continue;
    }
    grouped.set(workspaceRootPath, {
      workspaceRootPath,
      workspaceName: workspaceGroup.workspaceName || workspaceNameFromRootPath(workspaceRootPath),
      agentDefinitions: workspaceGroup.agents,
      teamDefinitions: [],
    });
  }

  const teamRunsByWorkspace = new Map<string, TeamRunHistoryItem[]>();
  for (const teamRun of teamRuns) {
    const workspaceRootPath = canonicalWorkspaceRootForHistory(teamRun.workspaceRootPath);
    if (!shouldInclude(workspaceRootPath)) {
      continue;
    }
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

  return Array.from(grouped.values()).map((workspaceGroup) => ({
    ...workspaceGroup,
    teamDefinitions: groupTeamRunsByDefinition(
      teamRunsByWorkspace.get(workspaceGroup.workspaceRootPath) ?? [],
    ),
  }));
};

const canonicalWorkspaceRootForHistory = (value: string | null | undefined): string => {
  const normalized = normalizeWorkspaceRootPath(value);
  if (normalized === UNASSIGNED_TEAM_WORKSPACE_KEY) {
    return normalized;
  }
  return canonicalizeWorkspaceRootPath(normalized);
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
