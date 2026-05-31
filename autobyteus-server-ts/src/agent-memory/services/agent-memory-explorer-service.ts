import type {
  AgentMemoryAttribution,
  AgentRunMemorySummary,
  AgentWithMemorySelector,
  AgentWithMemorySummary,
  MemoryAvailabilityBuildResult,
  MemoryExplorerPage,
} from "../domain/models.js";
import type { MemoryFileStore } from "../store/memory-file-store.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { RunHistoryIndexRow } from "../../run-history/domain/agent-run-history-index-types.js";
import {
  MemoryRunSummaryBuilder,
  hasMemoryAvailability,
  mergeMemoryAvailability,
} from "./memory-run-summary-builder.js";
import {
  includesMemoryExplorerQuery,
  normalizeMemoryExplorerSearch,
  pageMemoryExplorerEntries,
} from "./memory-explorer-page.js";

const UNATTRIBUTED_STABLE_ID = "unattributed";
const UNATTRIBUTED_DISPLAY_NAME = "Unattributed runs";

type AgentRunRecord = {
  runId: string;
  metadata: AgentRunMetadata | null;
  catalogRow: RunHistoryIndexRow | null;
  memory: MemoryAvailabilityBuildResult;
};

type AgentGroup = {
  attribution: AgentMemoryAttribution;
  agentDefinitionId: string | null;
  displayName: string;
  stableId: string;
  runs: AgentRunRecord[];
};

export class AgentMemoryExplorerService {
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly catalogService: AgentRunHistoryCatalogService;
  private readonly summaryBuilder: MemoryRunSummaryBuilder;

  constructor(
    private readonly store: MemoryFileStore,
    memoryDir: string,
    dependencies: {
      metadataStore?: AgentRunMetadataStore;
      catalogService?: AgentRunHistoryCatalogService;
      summaryBuilder?: MemoryRunSummaryBuilder;
    } = {},
  ) {
    this.metadataStore = dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.catalogService = dependencies.catalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.summaryBuilder = dependencies.summaryBuilder ?? new MemoryRunSummaryBuilder(store);
  }

  async listAgentsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentWithMemorySummary>> {
    const query = normalizeMemoryExplorerSearch(search);
    const groups = await this.buildGroups();
    const filtered = query
      ? groups.filter((group) => this.groupMatches(group, query))
      : groups;
    const summaries = filtered
      .map((group) => this.toAgentSummary(group))
      .sort((a, b) => this.compareAgentSummaries(a, b));
    return pageMemoryExplorerEntries(summaries, page, pageSize);
  }

  async listAgentRunsWithMemory(
    selector: AgentWithMemorySelector,
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentRunMemorySummary>> {
    const normalizedSelector = this.normalizeSelector(selector);
    const query = normalizeMemoryExplorerSearch(search);
    const groups = await this.buildGroups();
    const group = groups.find((candidate) => this.groupMatchesSelector(candidate, normalizedSelector));
    if (!group) {
      return pageMemoryExplorerEntries([], page, pageSize);
    }

    const runs = group.runs
      .filter((run) => !query || this.runMatches(run, query))
      .sort((a, b) => this.compareRuns(a, b))
      .map((run) => this.toRunSummary(run));
    return pageMemoryExplorerEntries(runs, page, pageSize);
  }

  private async buildGroups(): Promise<AgentGroup[]> {
    const catalogRows = await this.readCatalogRowsByRunId();
    const groups = new Map<string, AgentGroup>();

    for (const runId of this.store.listRunDirs()) {
      const memory = this.summaryBuilder.build(runId);
      if (!hasMemoryAvailability(memory.availability)) {
        continue;
      }
      const metadata = await this.metadataStore.readMetadata(runId);
      const catalogRow = catalogRows.get(runId) ?? null;
      const agentDefinitionId = metadata?.agentDefinitionId?.trim() || catalogRow?.agentDefinitionId?.trim() || null;
      const key = agentDefinitionId ? `definition:${agentDefinitionId}` : UNATTRIBUTED_STABLE_ID;
      let group = groups.get(key);
      if (!group) {
        group = {
          attribution: agentDefinitionId ? "DEFINITION" : "UNATTRIBUTED",
          agentDefinitionId,
          displayName: agentDefinitionId
            ? catalogRow?.agentName?.trim() || agentDefinitionId
            : UNATTRIBUTED_DISPLAY_NAME,
          stableId: agentDefinitionId ?? UNATTRIBUTED_STABLE_ID,
          runs: [],
        };
        groups.set(key, group);
      } else if (catalogRow?.agentName?.trim() && group.displayName === group.stableId) {
        group.displayName = catalogRow.agentName.trim();
      }
      group.runs.push({ runId, metadata, catalogRow, memory });
    }

    return Array.from(groups.values());
  }

  private async readCatalogRowsByRunId(): Promise<Map<string, RunHistoryIndexRow>> {
    try {
      const rows = await this.catalogService.listCatalogRows();
      return new Map(rows.map((row) => [row.runId, row]));
    } catch (error) {
      console.warn(`Failed reading agent run history catalog for memory explorer: ${String(error)}`);
      return new Map();
    }
  }

  private normalizeSelector(selector: AgentWithMemorySelector): AgentWithMemorySelector {
    const attribution = selector.attribution === "UNATTRIBUTED" ? "UNATTRIBUTED" : "DEFINITION";
    if (attribution === "UNATTRIBUTED") {
      return { attribution };
    }
    const agentDefinitionId = selector.agentDefinitionId?.trim();
    if (!agentDefinitionId) {
      throw new Error("agentDefinitionId is required for attributed agent memory.");
    }
    return { attribution, agentDefinitionId };
  }

  private groupMatchesSelector(group: AgentGroup, selector: AgentWithMemorySelector): boolean {
    if (selector.attribution === "UNATTRIBUTED") {
      return group.attribution === "UNATTRIBUTED";
    }
    return group.attribution === "DEFINITION" && group.agentDefinitionId === selector.agentDefinitionId;
  }

  private groupMatches(group: AgentGroup, query: string): boolean {
    return (
      includesMemoryExplorerQuery(group.displayName, query) ||
      includesMemoryExplorerQuery(group.stableId, query) ||
      group.runs.some((run) => this.runMatches(run, query))
    );
  }

  private runMatches(run: AgentRunRecord, query: string): boolean {
    return (
      includesMemoryExplorerQuery(run.runId, query) ||
      includesMemoryExplorerQuery(run.catalogRow?.agentName, query) ||
      includesMemoryExplorerQuery(run.catalogRow?.summary, query) ||
      includesMemoryExplorerQuery(run.catalogRow?.workspaceRootPath, query) ||
      includesMemoryExplorerQuery(run.metadata?.agentDefinitionId, query) ||
      includesMemoryExplorerQuery(run.metadata?.workspaceRootPath, query)
    );
  }

  private toAgentSummary(group: AgentGroup): AgentWithMemorySummary {
    const merged = mergeMemoryAvailability(group.runs.map((run) => run.memory));
    return {
      attribution: group.attribution,
      agentDefinitionId: group.agentDefinitionId,
      displayName: group.displayName,
      stableId: group.stableId,
      runCount: group.runs.length,
      latestMemoryAt: merged.availability.latestMemoryAt,
      memory: merged.availability,
    };
  }

  private toRunSummary(run: AgentRunRecord): AgentRunMemorySummary {
    return {
      runId: run.runId,
      agentDefinitionId: run.metadata?.agentDefinitionId ?? run.catalogRow?.agentDefinitionId ?? null,
      agentName: run.catalogRow?.agentName ?? null,
      summary: run.catalogRow?.summary ?? null,
      workspaceRootPath: run.metadata?.workspaceRootPath ?? run.catalogRow?.workspaceRootPath ?? null,
      createdAt: run.catalogRow?.createdAt ?? run.metadata?.startedAt ?? run.metadata?.preparedAt ?? null,
      lastUpdatedAt: run.memory.availability.latestMemoryAt,
      memory: run.memory.availability,
    };
  }

  private compareAgentSummaries(a: AgentWithMemorySummary, b: AgentWithMemorySummary): number {
    const timeCompare = (b.memory.latestMemoryAt ?? "").localeCompare(a.memory.latestMemoryAt ?? "");
    if (timeCompare !== 0) {
      return timeCompare;
    }
    return a.displayName.localeCompare(b.displayName);
  }

  private compareRuns(a: AgentRunRecord, b: AgentRunRecord): number {
    if (a.memory.latestMemoryMtime !== b.memory.latestMemoryMtime) {
      return b.memory.latestMemoryMtime - a.memory.latestMemoryMtime;
    }
    const aCreated = a.catalogRow?.createdAt ?? a.metadata?.startedAt ?? a.metadata?.preparedAt ?? "";
    const bCreated = b.catalogRow?.createdAt ?? b.metadata?.startedAt ?? b.metadata?.preparedAt ?? "";
    if (aCreated !== bCreated) {
      return bCreated.localeCompare(aCreated);
    }
    return b.runId.localeCompare(a.runId);
  }
}
