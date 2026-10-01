import type {
  AgentOrgRunMemorySummary,
  AgentOrgWithMemorySummary,
  MemoryExplorerPage,
} from "../domain/models.js";
import { AgentOrgRootMemorySource } from "./agent-org-root-memory-source.js";
import { toCollaborationMemberMemoryTargetSummary } from "./collaboration-member-memory-targets.js";
import {
  CollaborationRootMemoryCatalog,
  type CollaborationDefinitionMemory,
  type CollaborationRootMemorySource,
  type CollaborationRootRunMemory,
} from "./collaboration-root-memory-catalog.js";

/** Org-typed memory explorer boundary over the shared collaboration root catalog. */
export class AgentOrgMemoryExplorerService {
  private readonly catalog: CollaborationRootMemoryCatalog;

  constructor(memoryDir: string, dependencies: { source?: CollaborationRootMemorySource } = {}) {
    this.catalog = new CollaborationRootMemoryCatalog(dependencies.source ?? new AgentOrgRootMemorySource(memoryDir));
  }

  async listAgentOrgsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentOrgWithMemorySummary>> {
    const result = await this.catalog.listDefinitions(search, page, pageSize);
    return { ...result, entries: result.entries.map(toOrgSummary) };
  }

  async listAgentOrgRunsWithMemory(
    orgDefinitionId: string,
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentOrgRunMemorySummary>> {
    const normalizedOrgDefinitionId = orgDefinitionId.trim();
    if (!normalizedOrgDefinitionId) {
      throw new Error("orgDefinitionId is required.");
    }
    const result = await this.catalog.listRuns(normalizedOrgDefinitionId, search, page, pageSize);
    return { ...result, entries: result.entries.map(toOrgRunSummary) };
  }
}

const toOrgSummary = (definition: CollaborationDefinitionMemory): AgentOrgWithMemorySummary => ({
  orgDefinitionId: definition.definitionId,
  orgDefinitionName: definition.definitionName,
  orgRunCount: definition.runCount,
  memberMemoryCount: definition.memberMemoryCount,
  latestMemoryAt: definition.memory.latestMemoryAt,
  memory: definition.memory,
});

const toOrgRunSummary = (run: CollaborationRootRunMemory): AgentOrgRunMemorySummary => ({
  orgRunId: run.rootRunId,
  orgDefinitionId: run.definitionId,
  orgDefinitionName: run.definitionName,
  summary: run.summary,
  workspaceRootPath: run.workspaceRootPath,
  createdAt: run.createdAt,
  lastUpdatedAt: run.memory.availability.latestMemoryAt,
  memory: run.memory.availability,
  memberTargets: run.members.map(toCollaborationMemberMemoryTargetSummary),
});
