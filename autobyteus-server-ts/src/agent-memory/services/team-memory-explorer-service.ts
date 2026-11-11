import type { AgentTeamRunMemorySummary, AgentTeamWithMemorySummary, MemoryExplorerPage } from "../domain/models.js";
import { toCollaborationMemberMemoryTargetSummary } from "./collaboration-member-memory-targets.js";
import {
  CollaborationRootMemoryCatalog,
  type CollaborationDefinitionMemory,
  type CollaborationRootMemorySource,
  type CollaborationRootRunMemory,
} from "./collaboration-root-memory-catalog.js";
import { normalizeMemoryExplorerSearch, pageMemoryExplorerEntries } from "./memory-explorer-page.js";
import { TeamRootMemorySource } from "./team-root-memory-source.js";

/** Every entry of a catalog listing, for merging two families before paging. */
const ALL_PAGE_SIZE = Number.MAX_SAFE_INTEGER;


/**
 * Team-typed memory explorer boundary: every team run, a delegated one included (autobyteus-461: it is an ordinary
 * team run with its own file).
 */
export class TeamMemoryExplorerService {
  private readonly configured: CollaborationRootMemoryCatalog;

  constructor(memoryDir: string, dependencies: {
    source?: CollaborationRootMemorySource;
  } = {}) {
    this.configured = new CollaborationRootMemoryCatalog(dependencies.source ?? new TeamRootMemorySource(memoryDir));
  }

  async listAgentTeamsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentTeamWithMemorySummary>> {
    const query = normalizeMemoryExplorerSearch(search);
    const configured = (await this.configured.listDefinitions(query, 1, ALL_PAGE_SIZE)).entries;
    const entries = configured.map(toTeamSummary).sort((a, b) =>
      (b.latestMemoryAt ?? "").localeCompare(a.latestMemoryAt ?? "") || a.teamDefinitionName.localeCompare(b.teamDefinitionName));
    return pageMemoryExplorerEntries(entries, page, pageSize);
  }

  async listAgentTeamRunsWithMemory(
    teamDefinitionId: string,
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentTeamRunMemorySummary>> {
    const normalizedTeamDefinitionId = teamDefinitionId.trim();
    if (!normalizedTeamDefinitionId) {
      throw new Error("teamDefinitionId is required.");
    }
    const configured = (await this.configured.listRuns(normalizedTeamDefinitionId, search, 1, ALL_PAGE_SIZE)).entries;
    const runs = [...configured].sort((a, b) => b.memory.latestMemoryMtime - a.memory.latestMemoryMtime
      || (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || b.rootRunId.localeCompare(a.rootRunId));
    return pageMemoryExplorerEntries(runs.map(toTeamRunSummary), page, pageSize);
  }
}

/** No team run is tagged as delegated: a delegated team is an ordinary team run (the fields stay in the API, empty). */
const toTeamSummary = (definition: CollaborationDefinitionMemory): AgentTeamWithMemorySummary => ({
  teamDefinitionId: definition.definitionId,
  teamDefinitionName: definition.definitionName,
  teamRunCount: definition.runCount,
  memberMemoryCount: definition.memberMemoryCount,
  latestMemoryAt: definition.memory.latestMemoryAt,
  memory: definition.memory,
  isTaskTeam: false,
  startedByAgentName: null,
});

const toTeamRunSummary = (run: CollaborationRootRunMemory): AgentTeamRunMemorySummary => ({
  teamRunId: run.rootRunId,
  teamDefinitionId: run.definitionId,
  teamDefinitionName: run.definitionName,
  summary: run.summary,
  workspaceRootPath: run.workspaceRootPath,
  createdAt: run.createdAt,
  lastUpdatedAt: run.memory.availability.latestMemoryAt,
  memory: run.memory.availability,
  memberTargets: run.members.map(toCollaborationMemberMemoryTargetSummary),
  isTaskTeam: false,
  startedByAgentName: null,
});
