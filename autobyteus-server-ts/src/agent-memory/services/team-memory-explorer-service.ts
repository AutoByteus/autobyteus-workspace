import type {
  AgentTeamRunMemorySummary,
  AgentTeamWithMemorySummary,
  MemoryAvailabilityBuildResult,
  MemoryExplorerPage,
  TeamMemberMemoryTargetSummary,
} from "../domain/models.js";
import { TeamRunMetadataStore } from "../../run-history/store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import type { TeamRunIndexRow } from "../../run-history/domain/team-run-history-index-types.js";
import { mergeMemoryAvailability } from "./memory-run-summary-builder.js";
import {
  TeamMemoryMemberTargetBuilder,
  type TeamMemoryMemberTargetRecord,
} from "./team-memory-member-target-builder.js";
import { AgentMemoryLocationService } from "./agent-memory-location-service.js";
import {
  includesMemoryExplorerQuery,
  normalizeMemoryExplorerSearch,
  pageMemoryExplorerEntries,
} from "./memory-explorer-page.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";

type TeamRunRecord = {
  teamRunId: string;
  metadata: TeamRunMetadata;
  catalogRow: TeamRunIndexRow | null;
  memory: MemoryAvailabilityBuildResult;
  memberTargets: TeamMemoryMemberTargetRecord[];
};

type TeamGroup = {
  teamDefinitionId: string;
  teamDefinitionName: string;
  runs: TeamRunRecord[];
};

export class TeamMemoryExplorerService {
  private readonly metadataStore: TeamRunMetadataStore;
  private readonly catalogService: TeamRunHistoryCatalogService;
  private readonly memberTargetBuilder: TeamMemoryMemberTargetBuilder;

  constructor(
    private readonly memoryDir: string,
    dependencies: {
      metadataStore?: TeamRunMetadataStore;
      catalogService?: TeamRunHistoryCatalogService;
    } = {},
  ) {
    this.metadataStore = dependencies.metadataStore ?? new TeamRunMetadataStore(memoryDir);
    this.catalogService = dependencies.catalogService ?? new TeamRunHistoryCatalogService(memoryDir);
    this.memberTargetBuilder = new TeamMemoryMemberTargetBuilder(
      this.metadataStore,
      new AgentMemoryLocationService({ memoryDir }),
    );
  }

  async listAgentTeamsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentTeamWithMemorySummary>> {
    const query = normalizeMemoryExplorerSearch(search);
    const groups = await this.buildGroups();
    const filtered = query
      ? groups.filter((group) => this.groupMatches(group, query))
      : groups;
    const summaries = filtered
      .map((group) => this.toTeamSummary(group))
      .sort((a, b) => this.compareTeamSummaries(a, b));
    return pageMemoryExplorerEntries(summaries, page, pageSize);
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
    const query = normalizeMemoryExplorerSearch(search);
    const groups = await this.buildGroups();
    const group = groups.find((candidate) => candidate.teamDefinitionId === normalizedTeamDefinitionId);
    if (!group) {
      return pageMemoryExplorerEntries([], page, pageSize);
    }

    const runs = group.runs
      .filter((run) => !query || this.runMatches(run, query))
      .sort((a, b) => this.compareRuns(a, b))
      .map((run) => this.toRunSummary(run));
    return pageMemoryExplorerEntries(runs, page, pageSize);
  }

  private async buildGroups(): Promise<TeamGroup[]> {
    const catalogRows = await this.readCatalogRowsByTeamRunId();
    const groups = new Map<string, TeamGroup>();

    for (const teamRunId of await this.metadataStore.listTeamRunIds()) {
      const metadata = await this.safeReadMetadata(teamRunId);
      if (!metadata) {
        continue;
      }
      const memberTargets = this.memberTargetBuilder.build(teamRunId, metadata);
      if (memberTargets.length === 0) {
        continue;
      }
      const memory = mergeMemoryAvailability(memberTargets.map((target) => target.memory));
      const catalogRow = catalogRows.get(teamRunId) ?? null;
      const teamDefinitionId = metadata.rootTeam.teamDefinitionId.trim();
      if (!teamDefinitionId) {
        continue;
      }
      let group = groups.get(teamDefinitionId);
      if (!group) {
        group = {
          teamDefinitionId,
          teamDefinitionName:
            catalogRow?.teamDefinitionName?.trim() || metadata.teamDefinitionName || teamDefinitionId,
          runs: [],
        };
        groups.set(teamDefinitionId, group);
      } else if (catalogRow?.teamDefinitionName?.trim() && group.teamDefinitionName === teamDefinitionId) {
        group.teamDefinitionName = catalogRow.teamDefinitionName.trim();
      }
      group.runs.push({ teamRunId, metadata, catalogRow, memory, memberTargets });
    }

    return Array.from(groups.values());
  }

  private async safeReadMetadata(teamRunId: string): Promise<TeamRunMetadata | null> {
    try {
      return await this.metadataStore.readMetadata(teamRunId);
    } catch (error) {
      console.warn(`Skipping team run '${teamRunId}' in memory explorer: ${String(error)}`);
      return null;
    }
  }

  private async readCatalogRowsByTeamRunId(): Promise<Map<string, TeamRunIndexRow>> {
    try {
      const rows = await this.catalogService.listCatalogRows();
      return new Map(rows.map((row) => [row.teamRunId, row]));
    } catch (error) {
      console.warn(`Failed reading team run history catalog for memory explorer: ${String(error)}`);
      return new Map();
    }
  }

  private groupMatches(group: TeamGroup, query: string): boolean {
    return (
      includesMemoryExplorerQuery(group.teamDefinitionName, query) ||
      includesMemoryExplorerQuery(group.teamDefinitionId, query) ||
      group.runs.some((run) => this.runMatches(run, query))
    );
  }

  private runMatches(run: TeamRunRecord, query: string): boolean {
    return (
      includesMemoryExplorerQuery(run.teamRunId, query) ||
      includesMemoryExplorerQuery(run.metadata.teamDefinitionName, query) ||
      includesMemoryExplorerQuery(run.catalogRow?.summary, query) ||
      includesMemoryExplorerQuery(run.catalogRow?.workspaceRootPath, query) ||
      run.memberTargets.some(({ member }) =>
        includesMemoryExplorerQuery(getAgentTeamAddressBasename(member.address), query) ||
        includesMemoryExplorerQuery(member.address, query) ||
        includesMemoryExplorerQuery(member.agentRunId, query) ||
        includesMemoryExplorerQuery(member.agentDefinitionId, query),
      )
    );
  }

  private toTeamSummary(group: TeamGroup): AgentTeamWithMemorySummary {
    const merged = mergeMemoryAvailability(group.runs.map((run) => run.memory));
    const memberKeys = new Set<string>();
    for (const run of group.runs) {
      for (const target of run.memberTargets) {
        memberKeys.add(target.member.address);
      }
    }
    return {
      teamDefinitionId: group.teamDefinitionId,
      teamDefinitionName: group.teamDefinitionName,
      teamRunCount: group.runs.length,
      memberMemoryCount: memberKeys.size,
      latestMemoryAt: merged.availability.latestMemoryAt,
      memory: merged.availability,
    };
  }

  private toRunSummary(run: TeamRunRecord): AgentTeamRunMemorySummary {
    return {
      teamRunId: run.teamRunId,
      teamDefinitionId: run.metadata.rootTeam.teamDefinitionId,
      teamDefinitionName: run.catalogRow?.teamDefinitionName ?? run.metadata.teamDefinitionName,
      summary: run.catalogRow?.summary ?? null,
      workspaceRootPath: run.catalogRow?.workspaceRootPath ?? null,
      createdAt: run.catalogRow?.createdAt ?? run.metadata.createdAt ?? null,
      lastUpdatedAt: run.memory.availability.latestMemoryAt,
      memory: run.memory.availability,
      memberTargets: run.memberTargets.map((target) => this.toMemberTargetSummary(target)),
    };
  }

  private toMemberTargetSummary(target: TeamMemoryMemberTargetRecord): TeamMemberMemoryTargetSummary {
    return {
      memberAddress: target.member.address,
      displayName: getAgentTeamAddressBasename(target.member.address) ?? target.member.address,
      agentRunId: target.member.agentRunId,
      agentDefinitionId: target.member.agentDefinitionId,
      lastUpdatedAt: target.memory.availability.latestMemoryAt,
      memory: target.memory.availability,
    };
  }

  private compareTeamSummaries(a: AgentTeamWithMemorySummary, b: AgentTeamWithMemorySummary): number {
    const timeCompare = (b.memory.latestMemoryAt ?? "").localeCompare(a.memory.latestMemoryAt ?? "");
    if (timeCompare !== 0) {
      return timeCompare;
    }
    return a.teamDefinitionName.localeCompare(b.teamDefinitionName);
  }

  private compareRuns(a: TeamRunRecord, b: TeamRunRecord): number {
    if (a.memory.latestMemoryMtime !== b.memory.latestMemoryMtime) {
      return b.memory.latestMemoryMtime - a.memory.latestMemoryMtime;
    }
    const aCreated = a.catalogRow?.createdAt ?? a.metadata.createdAt ?? "";
    const bCreated = b.catalogRow?.createdAt ?? b.metadata.createdAt ?? "";
    if (aCreated !== bCreated) {
      return bCreated.localeCompare(aCreated);
    }
    return b.teamRunId.localeCompare(a.teamRunId);
  }
}
