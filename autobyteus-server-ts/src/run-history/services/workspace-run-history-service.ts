import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { createTopLevelRunRule } from "./top-level-run-rule.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { ClosedDelegations } from "../../remote-collaboration/inbound/closed-delegations.js";
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
  /** DS-11: a run delegated from a stored run is listed under that run, not as a top-level row. */
  private readonly topLevel: (run: TaskExecutionReference) => boolean;
  /** autobyteus-591 DN-6: a peer-started run whose delegating node closed every Task naming it is not listed. */
  private readonly closedDelegations: Pick<ClosedDelegations, "has">;

  constructor(
    options: {
      /** The relationships between runs, from the Task entries (SR-047). */
      tree: Pick<DelegationIndex, "parentOf">;
      agentRunHistoryService?: AgentRunHistoryService;
      teamRunHistoryService?: TeamRunHistoryService;
      topLevel?: (run: TaskExecutionReference) => boolean;
      /** The peer-started runs their delegating node closed (loaded once; read in memory per row). */
      closedDelegations: Pick<ClosedDelegations, "has">;
    },
  ) {
    this.closedDelegations = options.closedDelegations;
    this.topLevel = options.topLevel ?? createTopLevelRunRule(() => appConfigProvider.config.getMemoryDir(), options.tree);
    this.agentRunHistoryService =
      options.agentRunHistoryService ?? getAgentRunHistoryService();
    this.teamRunHistoryService =
      options.teamRunHistoryService ?? getTeamRunHistoryService();
  }

  /** A row of the list: a top-level run its delegating node has not closed (DN-6). */
  private listed(run: TaskExecutionReference): boolean {
    return this.topLevel(run) && !this.closedDelegations.has("agentRunId" in run
      ? { kind: "agent", runId: run.agentRunId } : { kind: "agent_team", runId: run.teamRunId });
  }

  /** Every folder's runs; `limitPerAgent: null` keeps every agent run (see `AgentRunHistoryService.listRunHistory`). */
  async listWorkspaceRunHistory(limitPerAgent: number | null = 6): Promise<WorkspaceRunHistoryGroup[]> {
    const [agentWorkspaceGroups, teamRuns] = await Promise.all([
      this.agentRunHistoryService.listRunHistory(limitPerAgent, (row) => this.listed({ agentRunId: row.runId })),
      this.teamRunHistoryService.listTeamRunHistory((row) => this.listed({ teamRunId: row.teamRunId })),
    ]);

    return buildWorkspaceGroups(agentWorkspaceGroups, teamRuns)
      .sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
  }

  async getWorkspaceRunHistory(
    workspaceRootPath: string,
    limitPerAgent: number | null = 6,
  ): Promise<WorkspaceRunHistoryGroup> {
    const canonicalRootPath = canonicalizeWorkspaceRootPath(workspaceRootPath);
    const [agentWorkspaceGroups, teamRuns] = await Promise.all([
      this.agentRunHistoryService.listRunHistory(limitPerAgent, (row) => this.listed({ agentRunId: row.runId })),
      this.teamRunHistoryService.listTeamRunHistory((row) => this.listed({ teamRunId: row.teamRunId })),
    ]);

    return buildWorkspaceGroups(agentWorkspaceGroups, teamRuns, canonicalRootPath)[0] ?? {
      workspaceRootPath: canonicalRootPath,
      workspaceName: workspaceNameFromRootPath(canonicalRootPath),
      agentDefinitions: [],
      teamDefinitions: [],
    };
  }
}

let processService: WorkspaceRunHistoryService | null = null;
/** The composition root sets the process service it created (SR-047 step 8); the returned function releases it. */
export const setProcessWorkspaceRunHistoryService = (service: WorkspaceRunHistoryService): (() => void) => {
  processService = service;
  return () => { if (processService === service) processService = null; };
};
/** The process service; its callers are older lookups (FU-011). */
export const getWorkspaceRunHistoryService = (): WorkspaceRunHistoryService => {
  if (!processService) throw new Error("WorkspaceRunHistoryService is created by the composition root.");
  return processService;
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
