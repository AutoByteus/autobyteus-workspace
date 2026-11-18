import type { RunHistoryAgentGroup } from "../domain/agent-run-history-index-types.js";
import type { ProjectRunLinks } from "../domain/project-run-links.js";
import { getAgentRunHistoryService, type AgentRunHistoryService } from "./agent-run-history-service.js";
import { getTeamRunHistoryService, type TeamRunHistoryService } from "./team-run-history-service.js";
import type { WorkspaceTeamDefinitionHistoryGroup } from "./workspace-run-history-service.js";

export type ProjectRunHistory = Readonly<{
  projectId: string;
  agentDefinitions: RunHistoryAgentGroup[];
  teamDefinitions: WorkspaceTeamDefinitionHistoryGroup[];
}>;

export class ProjectRunHistoryError extends Error {
  constructor(readonly code: "PROJECT_NOT_FOUND" | "PROJECT_RUN_LINKS_UNAVAILABLE", message: string) {
    super(message);
  }
}

let configuredRunLinks: ProjectRunLinks | null = null;

/** Bound once per process by `compositions/project-run-links-composition.ts`. */
export const configureProjectRunLinks = (links: ProjectRunLinks): Readonly<{ close(): void }> => {
  configuredRunLinks = links;
  return Object.freeze({ close: () => { if (configuredRunLinks === links) configuredRunLinks = null; } });
};

/**
 * The runs listed under one Project (autobyteus-353, REQ-001): exactly the top-level Agent and Team runs started under
 * it (its `project_runs.json`), joined with the history rows, so an entry whose run was never created, was deleted or
 * is archived lists nothing. Grouped as a workspace's are: each agent group keeps its 6 newest runs; Team runs are
 * uncapped. A run is started under at most one Project, so it is listed in one place.
 */
export class ProjectRunHistoryService {
  private readonly agentRuns: Pick<AgentRunHistoryService, "listAgentGroupsOf">;
  private readonly teamRuns: Pick<TeamRunHistoryService, "listTeamRunHistory">;
  private readonly runLinks: () => ProjectRunLinks | null;

  constructor(deps: Readonly<{
    agentRuns?: Pick<AgentRunHistoryService, "listAgentGroupsOf">;
    teamRuns?: Pick<TeamRunHistoryService, "listTeamRunHistory">;
    runLinks?: ProjectRunLinks;
  }> = {}) {
    this.agentRuns = deps.agentRuns ?? getAgentRunHistoryService();
    this.teamRuns = deps.teamRuns ?? getTeamRunHistoryService();
    this.runLinks = () => deps.runLinks ?? configuredRunLinks;
  }

  async projectRunHistory(rawProjectId: string, limitPerAgent = 6): Promise<ProjectRunHistory> {
    const projectId = rawProjectId.trim();
    if (!projectId) throw new ProjectRunHistoryError("PROJECT_NOT_FOUND", "A Project ID is required.");
    const links = this.runLinks();
    if (!links) throw new ProjectRunHistoryError("PROJECT_RUN_LINKS_UNAVAILABLE", "Project run links are not composed on this server.");
    const started = await links.startedRunsOf(projectId).catch((error: unknown) => {
      if ((error as { code?: unknown }).code === "PROJECT_NOT_FOUND") {
        throw new ProjectRunHistoryError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
      }
      throw error;
    });
    const agentRunIds = new Set(started.filter((root) => root.kind === "agent").map((root) => root.runId));
    const teamRunIds = new Set(started.filter((root) => root.kind === "agent_team").map((root) => root.runId));
    const [agentDefinitions, teamRuns] = await Promise.all([
      this.agentRuns.listAgentGroupsOf({ includes: (row) => agentRunIds.has(row.runId) }, limitPerAgent),
      this.teamRuns.listTeamRunHistory((row) => teamRunIds.has(row.teamRunId)),
    ]);
    return { projectId, agentDefinitions, teamDefinitions: groupTeamRuns(teamRuns) };
  }
}

const groupTeamRuns = (
  teamRuns: Awaited<ReturnType<TeamRunHistoryService["listTeamRunHistory"]>>,
): WorkspaceTeamDefinitionHistoryGroup[] => {
  const groups = new Map<string, WorkspaceTeamDefinitionHistoryGroup>();
  for (const run of teamRuns) {
    const key = run.teamDefinitionId.trim() || run.teamDefinitionName.trim() || run.teamRunId;
    const group = groups.get(key) ?? { teamDefinitionId: run.teamDefinitionId, teamDefinitionName: run.teamDefinitionName, runs: [] };
    group.runs.push(run);
    groups.set(key, group);
  }
  return [...groups.values()];
};
