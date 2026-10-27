import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import type {
  AgentTeamRunMemorySummary,
  AgentTeamWithMemorySummary,
  MemoryAvailabilitySummary,
  MemoryExplorerPage,
} from "../domain/models.js";
import { toCollaborationMemberMemoryTargetSummary } from "./collaboration-member-memory-targets.js";
import {
  CollaborationRootMemoryCatalog,
  type CollaborationDefinitionMemory,
  type CollaborationRootMemorySource,
  type CollaborationRootRunMemory,
} from "./collaboration-root-memory-catalog.js";
import { includesMemoryExplorerQuery, normalizeMemoryExplorerSearch, pageMemoryExplorerEntries } from "./memory-explorer-page.js";
import { TaskTeamRootMemorySource, type TaskTeamRoot } from "./task-team-root-memory-source.js";
import { TeamRootMemorySource } from "./team-root-memory-source.js";

/** Every entry of a catalog listing, for merging two families before paging. */
const ALL_PAGE_SIZE = Number.MAX_SAFE_INTEGER;

export type DelegatorNames = { nameOf(team: TaskTeamRoot): Promise<string | null> };

/**
 * The delegator as recorded at the time: the run history's agent name for an agent root, or the member's
 * address name inside the coordinating team or org run (R-012).
 */
class RecordedDelegatorNames implements DelegatorNames {
  constructor(private readonly memoryDir: string) {}

  async nameOf(team: TaskTeamRoot): Promise<string | null> {
    const delegator = team.delegatorAgentRunId;
    if (!delegator) return null;
    const { kind, runId } = team.coordinatingRun;
    if (kind === "agent") {
      const rows = await new AgentRunHistoryCatalogService(this.memoryDir).listCatalogRows();
      return rows.find((row) => row.runId === delegator)?.agentName?.trim() || null;
    }
    const located = kind === "agent_team"
      ? await createStoredTeamRunExecutionTreeLocationService(this.memoryDir).findAgent({ rootTeamRunId: runId, agentRunId: delegator })
      : await new AgentOrgExecutionTreeLocationService({ memoryDir: this.memoryDir }).findAgent({ rootRunId: runId, agentRunId: delegator });
    return located ? getAgentTeamAddressBasename(located.memberAddress as AgentTeamAddress) ?? located.memberAddress : null;
  }
}

/**
 * Team-typed memory explorer boundary: configured team roots and the task teams their coordinating runs still
 * link (UD-008), each family through its own catalog source. A task team is tagged and names who started it.
 */
export class TeamMemoryExplorerService {
  private readonly configured: CollaborationRootMemoryCatalog;
  private readonly taskTeamCatalog: CollaborationRootMemoryCatalog;
  private readonly taskTeams: Pick<TaskTeamRootMemorySource, "listTaskTeams">;
  private readonly delegators: DelegatorNames;

  constructor(memoryDir: string, dependencies: {
    source?: CollaborationRootMemorySource;
    taskTeamSource?: TaskTeamRootMemorySource;
    delegators?: DelegatorNames;
  } = {}) {
    const taskTeamSource = dependencies.taskTeamSource ?? new TaskTeamRootMemorySource(memoryDir);
    this.configured = new CollaborationRootMemoryCatalog(dependencies.source ?? new TeamRootMemorySource(memoryDir));
    this.taskTeamCatalog = new CollaborationRootMemoryCatalog(taskTeamSource);
    this.taskTeams = taskTeamSource;
    this.delegators = dependencies.delegators ?? new RecordedDelegatorNames(memoryDir);
  }

  async listAgentTeamsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentTeamWithMemorySummary>> {
    const query = normalizeMemoryExplorerSearch(search);
    const configured = (await this.configured.listDefinitions(query, 1, ALL_PAGE_SIZE)).entries;
    const taskDefinitions = (await this.taskTeamCatalog.listDefinitions(null, 1, ALL_PAGE_SIZE)).entries;
    const startedBy = await this.startedByOfDefinitions();
    const byId = new Map<string, AgentTeamWithMemorySummary>(configured.map((definition) => [definition.definitionId, toTeamSummary(definition, false, null)]));
    for (const definition of taskDefinitions) {
      const delegatorName = startedBy.get(definition.definitionId) ?? null;
      const existing = byId.get(definition.definitionId);
      if (existing) {
        byId.set(definition.definitionId, mergeDefinitions(existing, definition, delegatorName));
      } else if (!query || includesMemoryExplorerQuery(definition.definitionName, query)
        || includesMemoryExplorerQuery(definition.definitionId, query) || includesMemoryExplorerQuery(delegatorName, query)) {
        byId.set(definition.definitionId, toTeamSummary(definition, true, delegatorName));
      }
    }
    const entries = [...byId.values()].sort((a, b) =>
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
    const taskRuns = (await this.taskTeamCatalog.listRuns(normalizedTeamDefinitionId, search, 1, ALL_PAGE_SIZE)).entries;
    const taskTeams = new Map((await this.taskTeams.listTaskTeams()).map((team) => [team.teamRunId, team]));
    const runs = [
      ...configured.map((run) => ({ run, summary: toTeamRunSummary(run, false, null) })),
      ...await Promise.all(taskRuns.map(async (run) => {
        const team = taskTeams.get(run.rootRunId);
        return { run, summary: toTeamRunSummary(run, true, team ? await this.delegators.nameOf(team) : null) };
      })),
    ].sort((a, b) => b.run.memory.latestMemoryMtime - a.run.memory.latestMemoryMtime
      || (b.run.createdAt ?? "").localeCompare(a.run.createdAt ?? "") || b.run.rootRunId.localeCompare(a.run.rootRunId));
    return pageMemoryExplorerEntries(runs.map((item) => item.summary), page, pageSize);
  }

  /** Per definition, the one agent that started all its task runs; null when they differ or none is recorded. */
  private async startedByOfDefinitions(): Promise<Map<string, string | null>> {
    const names = new Map<string, Set<string | null>>();
    for (const team of await this.taskTeams.listTaskTeams()) {
      const set = names.get(team.teamDefinitionId) ?? new Set<string | null>();
      set.add(await this.delegators.nameOf(team));
      names.set(team.teamDefinitionId, set);
    }
    return new Map([...names].map(([definitionId, set]) => [definitionId, set.size === 1 ? [...set][0] ?? null : null]));
  }
}

const mergeAvailability = (a: MemoryAvailabilitySummary, b: MemoryAvailabilitySummary): MemoryAvailabilitySummary => ({
  latestMemoryAt: [a.latestMemoryAt ?? null, b.latestMemoryAt ?? null].filter((at): at is string => Boolean(at)).sort().at(-1) ?? null,
  hasWorkJournal: a.hasWorkJournal || b.hasWorkJournal,
  hasRawTraces: a.hasRawTraces || b.hasRawTraces,
  hasRawArchive: a.hasRawArchive || b.hasRawArchive,
});

/** A definition with configured runs and task runs: both counted; tagged as having task runs. */
const mergeDefinitions = (existing: AgentTeamWithMemorySummary, task: CollaborationDefinitionMemory, startedByAgentName: string | null): AgentTeamWithMemorySummary => {
  const memory = mergeAvailability(existing.memory, task.memory);
  return {
    ...existing,
    teamRunCount: existing.teamRunCount + task.runCount,
    memberMemoryCount: existing.memberMemoryCount + task.memberMemoryCount,
    latestMemoryAt: memory.latestMemoryAt ?? null,
    memory,
    isTaskTeam: true,
    startedByAgentName,
  };
};

const toTeamSummary = (definition: CollaborationDefinitionMemory, isTaskTeam: boolean, startedByAgentName: string | null): AgentTeamWithMemorySummary => ({
  teamDefinitionId: definition.definitionId,
  teamDefinitionName: definition.definitionName,
  teamRunCount: definition.runCount,
  memberMemoryCount: definition.memberMemoryCount,
  latestMemoryAt: definition.memory.latestMemoryAt,
  memory: definition.memory,
  isTaskTeam,
  startedByAgentName,
});

const toTeamRunSummary = (run: CollaborationRootRunMemory, isTaskTeam: boolean, startedByAgentName: string | null): AgentTeamRunMemorySummary => ({
  teamRunId: run.rootRunId,
  teamDefinitionId: run.definitionId,
  teamDefinitionName: run.definitionName,
  summary: run.summary,
  workspaceRootPath: run.workspaceRootPath,
  createdAt: run.createdAt,
  lastUpdatedAt: run.memory.availability.latestMemoryAt,
  memory: run.memory.availability,
  memberTargets: run.members.map(toCollaborationMemberMemoryTargetSummary),
  isTaskTeam,
  startedByAgentName,
});
