import {
  createRootExecutionIdentity,
  rootExecutionIdentityKey,
  type RootSubjectKind,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { taskExecutionReferenceKey } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { RunHistoryAgentGroup } from "../domain/agent-run-history-index-types.js";
import type { ProjectRunLinks, ProjectRunLinkSet } from "../domain/project-run-links.js";
import { getAgentRunHistoryService, type AgentRunHistoryService } from "./agent-run-history-service.js";
import type { CollaborationRootHistoryItem, CollaborationRootHistoryService } from "./collaboration-root-history-service.js";
import { getTeamRunHistoryService, type TeamRunHistoryService } from "./team-run-history-service.js";
import type { WorkspaceTeamDefinitionHistoryGroup } from "./workspace-run-history-service.js";

/** Which of a listed root's delegated copies are listed under the Project (REQ-008); everything under them follows. */
export type ProjectRunScope = Readonly<{
  rootKind: "AGENT" | "AGENT_TEAM" | "AGENT_ORG";
  rootRunId: string;
  executions: readonly TaskExecutionReference[];
}>;

export type ProjectRunHistory = Readonly<{
  projectId: string;
  agentDefinitions: RunHistoryAgentGroup[];
  teamDefinitions: WorkspaceTeamDefinitionHistoryGroup[];
  agentOrgRuns: Extract<CollaborationRootHistoryItem, { root_subject_kind: "agent_org" }>[];
  scopes: ProjectRunScope[];
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

const ROOT_KINDS: Record<RootSubjectKind, ProjectRunScope["rootKind"]> = {
  agent: "AGENT", agent_team: "AGENT_TEAM", agent_org: "AGENT_ORG",
};

const rootKey = (rootSubjectKind: RootSubjectKind, rootRunId: string): string =>
  rootExecutionIdentityKey(createRootExecutionIdentity({ rootSubjectKind, rootRunId }));

/**
 * The runs listed under one Project (DS-003): the top-level Agent, Team and Org runs started under it or hosting any
 * assignment of its Tasks, grouped as a workspace's are, each with its execution scope:
 * `executions(root) = links(P)[root] ∪ (root started under P ? links(no Project)[root] : ∅)`.
 * Agent groups keep their 6 newest runs plus every run hosting open work of the Project; Team and Org runs are
 * uncapped, as in Workspaces. Reads Projects, Task run records and run history only, never conversations (QR-001).
 */
export class ProjectRunHistoryService {
  private readonly agentRuns: Pick<AgentRunHistoryService, "listAgentGroupsOf">;
  private readonly teamRuns: Pick<TeamRunHistoryService, "listTeamRunHistory">;
  private readonly orgs: Pick<CollaborationRootHistoryService, "getAgentOrg">;
  private readonly runLinks: () => ProjectRunLinks | null;

  constructor(deps: Readonly<{
    orgs: Pick<CollaborationRootHistoryService, "getAgentOrg">;
    agentRuns?: Pick<AgentRunHistoryService, "listAgentGroupsOf">;
    teamRuns?: Pick<TeamRunHistoryService, "listTeamRunHistory">;
    runLinks?: ProjectRunLinks;
  }>) {
    this.orgs = deps.orgs;
    this.agentRuns = deps.agentRuns ?? getAgentRunHistoryService();
    this.teamRuns = deps.teamRuns ?? getTeamRunHistoryService();
    this.runLinks = () => deps.runLinks ?? configuredRunLinks;
  }

  async projectRunHistory(rawProjectId: string, limitPerAgent = 6): Promise<ProjectRunHistory> {
    const projectId = rawProjectId.trim();
    if (!projectId) throw new ProjectRunHistoryError("PROJECT_NOT_FOUND", "A Project ID is required.");
    const links = this.runLinks();
    if (!links) throw new ProjectRunHistoryError("PROJECT_RUN_LINKS_UNAVAILABLE", "Project run links are not composed on this server.");
    const [started, project, noProject] = await Promise.all([
      links.startedRunsOf(projectId).catch((error: unknown) => {
        if ((error as { code?: unknown }).code === "PROJECT_NOT_FOUND") {
          throw new ProjectRunHistoryError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
        }
        throw error;
      }),
      links.runLinksOf(projectId),
      links.runLinksOf(null),
    ]);
    const hosts = new Map(project.hostRoots.map((host) => [rootExecutionIdentityKey(host.hostRoot), host]));
    const listed = (kind: RootSubjectKind, runId: string): boolean => hosts.has(rootKey(kind, runId));
    // Roots the Project recorded as started under it: their Temp-task work is the Project's too. Joined with the
    // catalog rows, so an entry whose run was never created or was deleted lists nothing.
    const startedUnderProject = new Set(started.map((root) => rootKey(root.kind, root.runId)));
    const startedUnder = (kind: RootSubjectKind, runId: string): boolean => startedUnderProject.has(rootKey(kind, runId));

    const [agentDefinitions, teamRuns] = await Promise.all([
      this.agentRuns.listAgentGroupsOf({
        includes: (row) => startedUnder("agent", row.runId) || listed("agent", row.runId),
        pinned: (row) => hosts.get(rootKey("agent", row.runId))?.hasOpenWork === true,
      }, limitPerAgent),
      this.teamRuns.listTeamRunHistory((row) => startedUnder("agent_team", row.teamRunId) || listed("agent_team", row.teamRunId)),
    ]);
    const orgRunIds = project.hostRoots.filter((host) => host.hostRoot.rootSubjectKind === "agent_org")
      .map((host) => host.hostRoot.rootRunId);
    const agentOrgRuns = (await Promise.all(orgRunIds.map((orgRunId) => this.orgs.getAgentOrg(orgRunId))))
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));

    const scopeOf = (kind: RootSubjectKind, rootRunId: string): ProjectRunScope => ({
      rootKind: ROOT_KINDS[kind],
      rootRunId,
      executions: executionsOf(project, noProject, rootKey(kind, rootRunId), startedUnderProject.has(rootKey(kind, rootRunId))),
    });
    return {
      projectId,
      agentDefinitions,
      teamDefinitions: groupTeamRuns(teamRuns),
      agentOrgRuns,
      scopes: [
        ...agentDefinitions.flatMap((group) => group.runs.map((run) => scopeOf("agent", run.runId))),
        ...teamRuns.map((run) => scopeOf("agent_team", run.teamRunId)),
        ...agentOrgRuns.map((org) => scopeOf("agent_org", org.root_run_id)),
      ],
    };
  }
}

const executionsOf = (
  project: ProjectRunLinkSet,
  noProject: ProjectRunLinkSet,
  key: string,
  startedUnderProject: boolean,
): TaskExecutionReference[] => {
  const executions = new Map<string, TaskExecutionReference>();
  for (const execution of project.executionsByHostRoot.get(key) ?? []) executions.set(taskExecutionReferenceKey(execution), execution);
  if (startedUnderProject) {
    for (const execution of noProject.executionsByHostRoot.get(key) ?? []) executions.set(taskExecutionReferenceKey(execution), execution);
  }
  return [...executions.values()];
};

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
