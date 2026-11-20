import type {
  AgentEpisode,
  AgentWithMemorySelector,
  AgentWithMemorySummary,
  MemoryExplorerPage,
} from "../domain/models.js";
import type { DiscoveredRun } from "../domain/discovered-run.js";
import type { MemoryFileStore } from "../store/memory-file-store.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import type { RunHistoryIndexRow } from "../../run-history/domain/agent-run-history-index-types.js";
import {
  getProcessEpisodicCatalog,
  type EpisodicCatalog,
} from "../../agent-episodic-catalog/services/episodic-catalog.js";
import {
  getInternalAgentVisibility,
  type InternalAgentVisibility,
} from "../../agent-definition/services/internal-agent-visibility.js";
import { MemoryRunSummaryBuilder, hasMemoryAvailability } from "./memory-run-summary-builder.js";
import { RunFolderDiscovery } from "./run-folder-discovery.js";
import { TeamRootMemorySource } from "./team-root-memory-source.js";
import { AgentOrgRootMemorySource } from "./agent-org-root-memory-source.js";
import type { CollaborationRootCatalogEntry } from "./collaboration-root-memory-catalog.js";
import {
  candidateFromCatalog,
  candidateFromDiscovery,
  pageEpisodes,
  subjectOf,
  type EpisodeCandidate,
  type EpisodeHistory,
} from "./agent-episodes.js";
import {
  includesMemoryExplorerQuery,
  normalizeMemoryExplorerSearch,
  pageMemoryExplorerEntries,
} from "./memory-explorer-page.js";

const UNATTRIBUTED_STABLE_ID = "unattributed";
const UNATTRIBUTED_DISPLAY_NAME = "Unattributed runs";

/** The episodic catalog's read API: this node's runs per agent definition, built at start and kept current. */
type EpisodeCatalog = Pick<EpisodicCatalog, "agentDefinitionIds" | "runsOf" | "whenStartPassDone">;
type Discovery = Pick<RunFolderDiscovery, "findRuns">;
type RootRows = Readonly<{ readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>> }>;

/** The agent definitions the Agents cards come from: the shared ones (not team-local) and every name by ID. */
export type AgentCardDefinitions = Readonly<{
  sharedIds(): Promise<ReadonlySet<string>>;
  names(): Promise<ReadonlyMap<string, string>>;
}>;

const PROCESS_AGENT_DEFINITIONS: AgentCardDefinitions = {
  sharedIds: async () => new Set((await (await agentDefinitionService()).getAllAgentDefinitions()).flatMap((d) => (d.id ? [d.id] : []))),
  names: async () => new Map((await (await agentDefinitionService()).getAgentDefinitionsWithTeamLocal())
    .flatMap((d) => (d.id ? [[d.id, d.name] as const] : []))),
};

const agentDefinitionService = async () =>
  (await import("../../agent-definition/services/agent-definition-service.js")).AgentDefinitionService.getInstance();

/** One owner's runs, before the card is built: its ID (null: unattributed) and its episodes. */
type Owner = { agentDefinitionId: string | null; candidates: EpisodeCandidate[]; recordedName: string | null };

/**
 * The Memory page's agents (autobyteus-554): the Agents cards and one agent's episodes, its runs from every place it
 * works. For this node (`local`) both come from the episodic catalog, after its start pass, with no discovery of the
 * memory folder; "Unattributed runs" is the standalone runs no definition names (the standalone scan). For an imported
 * source, everything comes from one discovery of that source per request. Internal agents are hidden while they are
 * hidden on the node (autobyteus-308).
 */
export class AgentMemoryExplorerService {
  private readonly local: boolean;
  private readonly catalog: () => EpisodeCatalog;
  private readonly discovery: Discovery;
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly agentRows: AgentRunHistoryCatalogService;
  private readonly teamRows: RootRows;
  private readonly orgRows: RootRows;
  private readonly summaryBuilder: MemoryRunSummaryBuilder;
  private readonly definitions: AgentCardDefinitions;
  private readonly visibility: Pick<InternalAgentVisibility, "hiddenDefinitionIds">;

  constructor(
    private readonly store: MemoryFileStore,
    memoryDir: string,
    dependencies: {
      /** This node's memory (default); false for an imported source. */
      local?: boolean;
      catalog?: () => EpisodeCatalog; // default: the process catalog (local only)
      discovery?: Discovery; // default: a discovery of `memoryDir` (imported only)
      metadataStore?: AgentRunMetadataStore;
      agentRows?: AgentRunHistoryCatalogService;
      teamRows?: RootRows;
      orgRows?: RootRows;
      summaryBuilder?: MemoryRunSummaryBuilder;
      definitions?: AgentCardDefinitions;
      visibility?: Pick<InternalAgentVisibility, "hiddenDefinitionIds">;
    } = {},
  ) {
    this.local = dependencies.local ?? true;
    this.catalog = dependencies.catalog ?? getProcessEpisodicCatalog;
    this.discovery = dependencies.discovery ?? new RunFolderDiscovery(memoryDir);
    this.metadataStore = dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.agentRows = dependencies.agentRows ?? new AgentRunHistoryCatalogService(memoryDir);
    this.teamRows = dependencies.teamRows ?? new TeamRootMemorySource(memoryDir);
    this.orgRows = dependencies.orgRows ?? new AgentOrgRootMemorySource(memoryDir);
    this.summaryBuilder = dependencies.summaryBuilder ?? new MemoryRunSummaryBuilder(store);
    this.definitions = dependencies.definitions ?? PROCESS_AGENT_DEFINITIONS;
    this.visibility = dependencies.visibility ?? getInternalAgentVisibility();
  }

  /** The Agents cards: shared agents and every agent with runs, newest change first, then "Unattributed runs". */
  async listAgentsWithMemory(
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentWithMemorySummary>> {
    const query = normalizeMemoryExplorerSearch(search);
    const [owners, names] = await Promise.all([this.listOwners(), this.definitions.names()]);
    const cards = owners.map((owner) => toCard(owner, names));
    const attributed = cards.filter((card) => card.attribution === "DEFINITION").sort(compareCards);
    const unattributed = cards.filter((card) => card.attribution === "UNATTRIBUTED");
    const matching = [...attributed, ...unattributed].filter((card) => !query
      || includesMemoryExplorerQuery(card.displayName, query) || includesMemoryExplorerQuery(card.stableId, query));
    return pageMemoryExplorerEntries(matching, page, pageSize);
  }

  /** One agent's episodes (or the unattributed runs), filtered by run ID, Task title and summary, newest first. */
  async listAgentEpisodes(
    selector: AgentWithMemorySelector,
    search?: string | null,
    page = 1,
    pageSize = 25,
  ): Promise<MemoryExplorerPage<AgentEpisode>> {
    const agentDefinitionId = normalizeSelector(selector);
    const candidates = await this.candidatesOf(agentDefinitionId);
    return pageEpisodes(candidates, await this.readHistory(), normalizeMemoryExplorerSearch(search), page, pageSize);
  }

  private async listOwners(): Promise<Owner[]> {
    const hidden = await this.visibility.hiddenDefinitionIds();
    if (!this.local) {
      const owners = groupDiscovered(await this.discovery.findRuns());
      return owners.filter((owner) => !owner.agentDefinitionId || !hidden.has(owner.agentDefinitionId));
    }
    const catalog = this.catalog();
    await catalog.whenStartPassDone(); // N-9: the cards' latest change is never partial after a restart
    // Shared agents, with or without runs, and every definition with runs here (team-local ones included).
    const sharedIds = await this.definitions.sharedIds();
    const owners: Owner[] = [...new Set([...sharedIds, ...catalog.agentDefinitionIds()])]
      .filter((id) => !hidden.has(id))
      .map((id) => {
        const entries = catalog.runsOf(id);
        return { agentDefinitionId: id, candidates: entries.map((entry) => candidateFromCatalog(entry, id)), recordedName: newestName(entries) };
      })
      .filter((owner) => owner.candidates.length > 0 || sharedIds.has(owner.agentDefinitionId));
    const unattributed = await this.scanUnattributed();
    return unattributed.length ? [...owners, { agentDefinitionId: null, candidates: unattributed, recordedName: null }] : owners;
  }

  private async candidatesOf(agentDefinitionId: string | null): Promise<EpisodeCandidate[]> {
    if (agentDefinitionId && (await this.visibility.hiddenDefinitionIds()).has(agentDefinitionId)) return [];
    if (!this.local) {
      const owner = groupDiscovered(await this.discovery.findRuns()).find((candidate) => candidate.agentDefinitionId === agentDefinitionId);
      return owner?.candidates ?? [];
    }
    if (!agentDefinitionId) return this.scanUnattributed();
    const catalog = this.catalog();
    await catalog.whenStartPassDone();
    return catalog.runsOf(agentDefinitionId).map((entry) => candidateFromCatalog(entry, agentDefinitionId));
  }

  /**
   * This node's standalone runs that no definition names and that hold memory. A run's history row names its
   * definition without a file read; the run's metadata is read only for runs without one.
   */
  private async scanUnattributed(): Promise<EpisodeCandidate[]> {
    const rows = await this.readAgentRows();
    const candidates: EpisodeCandidate[] = [];
    for (const runId of this.store.listRunDirs()) {
      const row = rows.get(runId) ?? null;
      if (row?.agentDefinitionId?.trim()) continue;
      const metadata = await this.metadataStore.readMetadata(runId);
      if (metadata?.agentDefinitionId?.trim()) continue;
      const memory = this.summaryBuilder.build(runId);
      if (!hasMemoryAvailability(memory)) continue;
      const root = { rootSubjectKind: "agent", rootRunId: runId } as const;
      candidates.push({
        runId, memoryDir: this.store.getRunDir(runId), subject: subjectOf(root, runId, null), root,
        workspaceRootPath: metadata?.workspaceRootPath ?? row?.workspaceRootPath ?? null,
        time: memory.availability.latestMemoryAt ?? row?.createdAt ?? metadata?.startedAt ?? null,
        taskTitle: null, recordedPlaceName: null, memory,
      });
    }
    return candidates;
  }

  private async readHistory(): Promise<EpisodeHistory> {
    const [agentRows, teamRoots, orgRoots] = await Promise.all([
      this.readAgentRows(),
      this.readRootRows(this.teamRows, "team"),
      this.readRootRows(this.orgRows, "agent org"),
    ]);
    return { agentSummaries: new Map([...agentRows].map(([runId, row]) => [runId, row.summary])), teamRoots, orgRoots };
  }

  private async readAgentRows(): Promise<Map<string, RunHistoryIndexRow>> {
    try {
      return new Map((await this.agentRows.listCatalogRows()).map((row) => [row.runId, row]));
    } catch (error) {
      console.warn(`Failed reading agent run history catalog for memory explorer: ${String(error)}`);
      return new Map();
    }
  }

  private async readRootRows(rows: RootRows, family: string): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>> {
    try {
      return await rows.readCatalogEntries();
    } catch (error) {
      console.warn(`Failed reading ${family} run history catalog for memory explorer: ${String(error)}`);
      return new Map();
    }
  }
}

const normalizeSelector = (selector: AgentWithMemorySelector): string | null => {
  if (selector.attribution === "UNATTRIBUTED") return null;
  const agentDefinitionId = selector.agentDefinitionId?.trim();
  if (!agentDefinitionId) throw new Error("agentDefinitionId is required for attributed agent memory.");
  return agentDefinitionId;
};

/**
 * One discovery's runs by owner: attributed runs by their definition; a standalone run no readable record attributes
 * is unattributed (as on this node). Collaboration folders no record attributes have no owner here.
 */
const groupDiscovered = (runs: readonly DiscoveredRun[]): Owner[] => {
  const owners = new Map<string | null, Owner>();
  for (const run of runs) {
    const agentDefinitionId = run.attribution.kind === "attributed" ? run.attribution.agentDefinitionId : null;
    if (!agentDefinitionId && run.root.rootSubjectKind !== "agent") continue;
    let owner = owners.get(agentDefinitionId);
    if (!owner) owners.set(agentDefinitionId, owner = { agentDefinitionId, candidates: [], recordedName: null });
    owner.candidates.push(candidateFromDiscovery(run));
    owner.recordedName ??= run.agentName;
  }
  return [...owners.values()];
};

const newestName = (entries: ReturnType<EpisodeCatalog["runsOf"]>): string | null =>
  [...entries].sort((a, b) => (b.lastActivityAt ?? b.startedAt ?? "").localeCompare(a.lastActivityAt ?? a.startedAt ?? ""))[0]?.agentName ?? null;

const toCard = (owner: Owner, names: ReadonlyMap<string, string>): AgentWithMemorySummary => {
  const latest = owner.candidates.reduce<string | null>((max, candidate) =>
    (candidate.time && (!max || candidate.time > max) ? candidate.time : max), null);
  if (!owner.agentDefinitionId) {
    return {
      attribution: "UNATTRIBUTED", agentDefinitionId: null, displayName: UNATTRIBUTED_DISPLAY_NAME,
      stableId: UNATTRIBUTED_STABLE_ID, runCount: owner.candidates.length, latestMemoryAt: latest,
    };
  }
  return {
    attribution: "DEFINITION",
    agentDefinitionId: owner.agentDefinitionId,
    displayName: names.get(owner.agentDefinitionId) ?? owner.recordedName ?? owner.agentDefinitionId,
    stableId: owner.agentDefinitionId,
    runCount: owner.candidates.length,
    latestMemoryAt: latest,
  };
};

const compareCards = (a: AgentWithMemorySummary, b: AgentWithMemorySummary): number =>
  (b.latestMemoryAt ?? "").localeCompare(a.latestMemoryAt ?? "") || a.displayName.localeCompare(b.displayName);
