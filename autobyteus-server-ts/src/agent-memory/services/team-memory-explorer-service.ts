import type {
  AgentTeamRunMemorySummary,
  AgentTeamWithMemorySummary,
  MemoryExplorerPage,
} from "../domain/models.js";
import { toCollaborationMemberMemoryTargetSummary } from "./collaboration-member-memory-targets.js";
import {
  CollaborationRootMemoryCatalog,
  type CollaborationDefinitionMemory,
  type CollaborationRootMemorySource,
  type CollaborationRootRunMemory,
} from "./collaboration-root-memory-catalog.js";
import { TeamRootMemorySource } from "./team-root-memory-source.js";

/** Team-typed memory explorer boundary over the shared collaboration root catalog. */
export class TeamMemoryExplorerService {
  private readonly catalog: CollaborationRootMemoryCatalog;

  constructor(memoryDir: string, dependencies: { source?: CollaborationRootMemorySource } = {}) {
    this.catalog = new CollaborationRootMemoryCatalog(dependencies.source ?? new TeamRootMemorySource(memoryDir));
  }

  async listAgentTeamsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentTeamWithMemorySummary>> {
    const result = await this.catalog.listDefinitions(search, page, pageSize);
    return { ...result, entries: result.entries.map(toTeamSummary) };
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
    const result = await this.catalog.listRuns(normalizedTeamDefinitionId, search, page, pageSize);
    return { ...result, entries: result.entries.map(toTeamRunSummary) };
  }
}

const toTeamSummary = (definition: CollaborationDefinitionMemory): AgentTeamWithMemorySummary => ({
  teamDefinitionId: definition.definitionId,
  teamDefinitionName: definition.definitionName,
  teamRunCount: definition.runCount,
  memberMemoryCount: definition.memberMemoryCount,
  latestMemoryAt: definition.memory.latestMemoryAt,
  memory: definition.memory,
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
});
