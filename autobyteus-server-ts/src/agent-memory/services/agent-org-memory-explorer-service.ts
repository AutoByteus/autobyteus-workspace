import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import type {
  AgentOrgRunMemorySummary,
  AgentOrgWithMemorySummary,
  MemoryExplorerPage,
  MemoryGroupMember,
} from "../domain/models.js";
import { AgentOrgRootMemorySource } from "./agent-org-root-memory-source.js";
import { toCollaborationMemberMemoryTargetSummary } from "./collaboration-member-memory-targets.js";
import {
  CollaborationRootMemoryCatalog,
  type CollaborationDefinitionMemory,
  type CollaborationRootMemorySource,
  type CollaborationRootRunMemory,
} from "./collaboration-root-memory-catalog.js";
import {
  includesMemoryExplorerQuery,
  normalizeMemoryExplorerSearch,
  pageMemoryExplorerEntries,
} from "./memory-explorer-page.js";
import {
  PROCESS_GROUP_DEFINITIONS,
  membersFromStoredRun,
  orgMembersFromDefinition,
  type GroupDefinitions,
} from "./memory-group-members.js";

/**
 * Org-typed memory explorer boundary over the shared collaboration root catalog. For this node's memory (`local`) the
 * org cards also hold the org definitions that have no runs yet, and members come from the definitions
 * (autobyteus-554); for an imported source, from its runs.
 */
export class AgentOrgMemoryExplorerService {
  private readonly catalog: CollaborationRootMemoryCatalog;
  private readonly local: boolean;
  private readonly definitions: GroupDefinitions;

  constructor(memoryDir: string, dependencies: {
    source?: CollaborationRootMemorySource;
    /** This node's memory (default); false for an imported source, which reads nothing from the definitions. */
    local?: boolean;
    definitions?: GroupDefinitions;
  } = {}) {
    this.catalog = new CollaborationRootMemoryCatalog(dependencies.source ?? new AgentOrgRootMemorySource(memoryDir));
    this.local = dependencies.local ?? true;
    this.definitions = dependencies.definitions ?? PROCESS_GROUP_DEFINITIONS;
  }

  async listAgentOrgsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentOrgWithMemorySummary>> {
    const query = normalizeMemoryExplorerSearch(search);
    const withRunsPage = await this.catalog.listDefinitions(query, 1, Number.MAX_SAFE_INTEGER);
    const definitions = this.local ? await this.definitions.allOrgs() : [];
    const byId = new Map(definitions.flatMap((definition) => (definition.id ? [[definition.id, definition] as const] : [])));
    const withRuns = withRunsPage.entries.map((entry) => toOrgSummary(entry, byId.get(entry.definitionId) ?? null));
    const listed = new Set(withRuns.map((entry) => entry.orgDefinitionId));
    const withoutRuns = [...byId.values()]
      .filter((definition) => !listed.has(definition.id!) && (!query
        || includesMemoryExplorerQuery(definition.name, query) || includesMemoryExplorerQuery(definition.id, query)))
      .map(toOrgWithoutRuns);
    // Definitions with runs keep the catalog's order (latest memory first); those without runs follow by name.
    return pageMemoryExplorerEntries([...withRuns, ...withoutRuns.sort((a, b) =>
      a.orgDefinitionName.localeCompare(b.orgDefinitionName))], page, pageSize);
  }

  /** The org's members: from its definition on this node, else from its newest stored run; empty when neither. */
  async listMembers(orgDefinitionId: string): Promise<MemoryGroupMember[]> {
    const id = orgDefinitionId.trim();
    if (!id) throw new Error("orgDefinitionId is required.");
    const agentNames = await this.definitions.agentNames();
    const definition = this.local ? await this.definitions.orgById(id) : null;
    if (definition) return orgMembersFromDefinition(definition, agentNames, this.definitions.teamById);
    const stored = await this.catalog.latestMembersOf(id);
    if (!stored) return [];
    const teams = this.local ? await this.definitions.allTeams() : [];
    return membersFromStoredRun(stored, agentNames, new Map(teams.flatMap((team) => (team.id ? [[team.id, team.name]] : []))));
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

const toOrgSummary = (
  definition: CollaborationDefinitionMemory,
  local: AgentOrgDefinition | null,
): AgentOrgWithMemorySummary => ({
  orgDefinitionId: definition.definitionId,
  orgDefinitionName: definition.definitionName,
  orgRunCount: definition.runCount,
  memberMemoryCount: definition.memberMemoryCount,
  memberCount: local ? local.members.length : definition.latestMembers.length,
  latestMemoryAt: definition.memory.latestMemoryAt,
  memory: definition.memory,
});

const toOrgWithoutRuns = (definition: AgentOrgDefinition): AgentOrgWithMemorySummary => ({
  orgDefinitionId: definition.id!,
  orgDefinitionName: definition.name,
  orgRunCount: 0,
  memberMemoryCount: 0,
  memberCount: definition.members.length,
  latestMemoryAt: null,
  memory: { latestMemoryAt: null, hasWorkJournal: false, hasRawTraces: false, hasRawArchive: false },
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
