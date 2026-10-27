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
import type { AgentRunMetadata, TaskAgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import { TaskAgentLinkChecker } from "../../run-history/store/task-agent-link-check.js";
import {
  getInternalAgentVisibility,
  type InternalAgentVisibility,
} from "../../agent-definition/services/internal-agent-visibility.js";
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
  /** A task agent's own facts (G1 hides them from `metadata`); listed under its definition (D-5, AC-013). */
  taskAgent: TaskAgentRunMetadata | null;
  catalogRow: RunHistoryIndexRow | null;
  memory: MemoryAvailabilityBuildResult;
};

const definitionOf = (run: AgentRunRecord): string | null =>
  run.metadata?.agentDefinitionId?.trim() || run.taskAgent?.agentDefinitionId || run.catalogRow?.agentDefinitionId?.trim() || null;
const workspaceOf = (run: AgentRunRecord): string | null =>
  run.metadata?.workspaceRootPath ?? run.taskAgent?.workspaceRootPath ?? run.catalogRow?.workspaceRootPath ?? null;
const createdAtOf = (run: AgentRunRecord): string | null =>
  run.catalogRow?.createdAt ?? run.metadata?.startedAt ?? run.metadata?.preparedAt ?? run.taskAgent?.startedAt ?? null;

/** Resolves an agent definition's display name; `null` when the definition can no longer be found. */
type AgentDefinitionLookup = {
  getAgentDefinitionById(agentDefinitionId: string): Promise<{ name?: string | null } | null>;
};

const PROCESS_AGENT_DEFINITIONS: AgentDefinitionLookup = {
  getAgentDefinitionById: async (agentDefinitionId) => {
    const { AgentDefinitionService } = await import("../../agent-definition/services/agent-definition-service.js");
    return AgentDefinitionService.getInstance().getAgentDefinitionById(agentDefinitionId);
  },
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
  private readonly agentDefinitions: AgentDefinitionLookup;
  private readonly visibility: Pick<InternalAgentVisibility, "hiddenDefinitionIds">;
  private readonly memoryDir: string;

  constructor(
    private readonly store: MemoryFileStore,
    memoryDir: string,
    dependencies: {
      metadataStore?: AgentRunMetadataStore;
      catalogService?: AgentRunHistoryCatalogService;
      summaryBuilder?: MemoryRunSummaryBuilder;
      agentDefinitions?: AgentDefinitionLookup; // default: the process agent definition service
      visibility?: Pick<InternalAgentVisibility, "hiddenDefinitionIds">; // default: the process internal-agent rule
    } = {},
  ) {
    this.memoryDir = memoryDir;
    this.metadataStore = dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.catalogService = dependencies.catalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.summaryBuilder = dependencies.summaryBuilder ?? new MemoryRunSummaryBuilder(store);
    this.agentDefinitions = dependencies.agentDefinitions ?? PROCESS_AGENT_DEFINITIONS;
    this.visibility = dependencies.visibility ?? getInternalAgentVisibility();
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

  /** Agents and their runs with memory; an internal agent's group is left out while it is hidden (autobyteus-308). */
  private async buildGroups(): Promise<AgentGroup[]> {
    const [catalogRows, hidden] = await Promise.all([this.readCatalogRowsByRunId(), this.visibility.hiddenDefinitionIds()]);
    const groups = new Map<string, AgentGroup>();
    const links = new TaskAgentLinkChecker(this.memoryDir);

    for (const runId of this.store.listRunDirs()) {
      const memory = this.summaryBuilder.build(runId);
      if (!hasMemoryAvailability(memory)) {
        continue;
      }
      const metadata = await this.metadataStore.readMetadata(runId);
      const taskAgent = metadata ? null : await this.metadataStore.readTaskAgentMetadata(runId);
      // A detached task agent (its coordinating run deleted) is not listed (contract §4, §10).
      if (taskAgent && !await links.isLinked(taskAgent.taskAgent.coordinatingRun, runId)) continue;
      const catalogRow = catalogRows.get(runId) ?? null;
      const run: AgentRunRecord = { runId, metadata, taskAgent, catalogRow, memory };
      const agentDefinitionId = definitionOf(run);
      if (agentDefinitionId && hidden.has(agentDefinitionId)) continue;
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
      group.runs.push(run);
    }

    // A group no history row names (e.g. only task agents, which G1 keeps out of the history) shows its
    // definition's name; the id only when the definition can no longer be found (D-5, DEC-018).
    for (const group of groups.values()) {
      if (group.agentDefinitionId && group.displayName === group.stableId) {
        group.displayName = await this.definitionName(group.agentDefinitionId);
      }
    }
    return Array.from(groups.values());
  }

  private async definitionName(agentDefinitionId: string): Promise<string> {
    try {
      return (await this.agentDefinitions.getAgentDefinitionById(agentDefinitionId))?.name?.trim() || agentDefinitionId;
    } catch (error) {
      console.warn(`Failed reading agent definition '${agentDefinitionId}' for memory explorer: ${String(error)}`);
      return agentDefinitionId;
    }
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
      includesMemoryExplorerQuery(run.metadata?.agentDefinitionId ?? run.taskAgent?.agentDefinitionId, query) ||
      includesMemoryExplorerQuery(run.metadata?.workspaceRootPath ?? run.taskAgent?.workspaceRootPath, query)
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
      agentDefinitionId: run.metadata?.agentDefinitionId ?? run.taskAgent?.agentDefinitionId ?? run.catalogRow?.agentDefinitionId ?? null,
      agentName: run.catalogRow?.agentName ?? null,
      summary: run.catalogRow?.summary ?? null,
      workspaceRootPath: workspaceOf(run),
      createdAt: createdAtOf(run),
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
    const aCreated = createdAtOf(a) ?? "";
    const bCreated = createdAtOf(b) ?? "";
    if (aCreated !== bCreated) {
      return bCreated.localeCompare(aCreated);
    }
    return b.runId.localeCompare(a.runId);
  }
}
