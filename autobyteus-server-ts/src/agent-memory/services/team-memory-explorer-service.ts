import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import type {
  AgentTeamRunMemorySummary,
  AgentTeamWithMemorySummary,
  MemoryExplorerPage,
  MemoryGroupMember,
} from "../domain/models.js";
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
  teamMembersFromDefinition,
  type GroupDefinitions,
} from "./memory-group-members.js";
import { TeamRootMemorySource } from "./team-root-memory-source.js";

/** Every entry of a catalog listing, for merging two families before paging. */
const ALL_PAGE_SIZE = Number.MAX_SAFE_INTEGER;

/**
 * Team-typed memory explorer boundary: every team run, a delegated one included (autobyteus-461: it is an ordinary
 * team run with its own file). For this node's memory (`local`) the team cards also hold the team definitions that
 * have no runs yet, and members come from the definitions (autobyteus-554); for an imported source, from its runs.
 */
export class TeamMemoryExplorerService {
  private readonly configured: CollaborationRootMemoryCatalog;
  private readonly local: boolean;
  private readonly definitions: GroupDefinitions;

  constructor(memoryDir: string, dependencies: {
    source?: CollaborationRootMemorySource;
    /** This node's memory (default); false for an imported source, which reads nothing from the definitions. */
    local?: boolean;
    definitions?: GroupDefinitions;
  } = {}) {
    this.configured = new CollaborationRootMemoryCatalog(dependencies.source ?? new TeamRootMemorySource(memoryDir));
    this.local = dependencies.local ?? true;
    this.definitions = dependencies.definitions ?? PROCESS_GROUP_DEFINITIONS;
  }

  async listAgentTeamsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentTeamWithMemorySummary>> {
    const query = normalizeMemoryExplorerSearch(search);
    const configured = (await this.configured.listDefinitions(query, 1, ALL_PAGE_SIZE)).entries;
    const definitions = this.local ? await this.definitions.allTeams() : [];
    const byId = new Map(definitions.flatMap((definition) => (definition.id ? [[definition.id, definition] as const] : [])));
    const withRuns = configured.map((entry) => toTeamSummary(entry, byId.get(entry.definitionId) ?? null));
    const listed = new Set(withRuns.map((entry) => entry.teamDefinitionId));
    const withoutRuns = [...byId.values()]
      .filter((definition) => !listed.has(definition.id!) && (!query
        || includesMemoryExplorerQuery(definition.name, query) || includesMemoryExplorerQuery(definition.id, query)))
      .map(toTeamWithoutRuns);
    const entries = [...withRuns, ...withoutRuns].sort((a, b) =>
      (b.latestMemoryAt ?? "").localeCompare(a.latestMemoryAt ?? "") || a.teamDefinitionName.localeCompare(b.teamDefinitionName));
    return pageMemoryExplorerEntries(entries, page, pageSize);
  }

  /** The team's members: from its definition on this node, else from its newest stored run; empty when neither. */
  async listMembers(teamDefinitionId: string): Promise<MemoryGroupMember[]> {
    const id = requireDefinitionId(teamDefinitionId, "teamDefinitionId");
    const agentNames = await this.definitions.agentNames();
    const definition = this.local ? await this.definitions.teamById(id) : null;
    if (definition) return teamMembersFromDefinition(definition, id, agentNames);
    const stored = await this.configured.latestMembersOf(id);
    return stored ? membersFromStoredRun(stored, agentNames, new Map()) : [];
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

const requireDefinitionId = (value: string, name: string): string => {
  const id = value.trim();
  if (!id) throw new Error(`${name} is required.`);
  return id;
};

/** No team run is tagged as delegated: a delegated team is an ordinary team run (the fields stay in the API, empty). */
const toTeamSummary = (
  definition: CollaborationDefinitionMemory,
  local: AgentTeamDefinition | null,
): AgentTeamWithMemorySummary => ({
  teamDefinitionId: definition.definitionId,
  teamDefinitionName: definition.definitionName,
  teamRunCount: definition.runCount,
  memberMemoryCount: definition.memberMemoryCount,
  memberCount: local ? local.nodes.length : definition.latestMembers.length,
  latestMemoryAt: definition.memory.latestMemoryAt,
  memory: definition.memory,
});

const toTeamWithoutRuns = (definition: AgentTeamDefinition): AgentTeamWithMemorySummary => ({
  teamDefinitionId: definition.id!,
  teamDefinitionName: definition.name,
  teamRunCount: 0,
  memberMemoryCount: 0,
  memberCount: definition.nodes.length,
  latestMemoryAt: null,
  memory: { latestMemoryAt: null, hasWorkJournal: false, hasRawTraces: false, hasRawArchive: false },
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
