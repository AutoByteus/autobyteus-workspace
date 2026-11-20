import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { DiscoveredRun } from "../../agent-memory/domain/discovered-run.js";
import { RunFolderDiscovery } from "../../agent-memory/services/run-folder-discovery.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { WorkJournalChange } from "../../agent-work-journal/domain/work-journal-models.js";
import type { WorkJournalService } from "../../agent-work-journal/services/work-journal-service.js";
import type { ProjectTaskService } from "../../projects/services/project-task-service.js";
import type { AgentCatalog, CatalogEntry } from "../domain/episodic-catalog-models.js";
import { renderCatalog, renderIndex } from "../rendering/catalog-markdown-renderer.js";
import { EpisodicCatalogStore } from "../store/episodic-catalog-store.js";
import { buildCatalogEntry } from "./catalog-entry-builder.js";

/** A pass starts this long after the most recent request… */
export const EPISODIC_CATALOG_QUIET_MS = 5_000;
/** …and at most this long after the oldest waiting request (contract §4). */
export const EPISODIC_CATALOG_MAX_WAIT_MS = 30_000;

type Discovery = Pick<RunFolderDiscovery, "findRuns" | "findRunsOfRoot" | "rootOf">;
type Journals = Pick<WorkJournalService, "readJournalSpans" | "onJournalChanged">;
type RunTasks = Pick<DelegationIndex, "currentTaskOf">;
type TaskTitles = Pick<ProjectTaskService, "taskTitleOf">;

export type EpisodicCatalogDependencies = Readonly<{
  layout: AgentMemoryLayout;
  discovery: Discovery;
  journals: Journals;
  /** A run's current Task entry (any role), from the Task side (steps 1–2). */
  tasks: RunTasks;
  quietMs?: number;
  maxWaitMs?: number;
}>;

/** What a pass does to one root: read its runs again, or drop them (it was deleted). */
type RootRequest = Readonly<{ root: RootExecutionIdentity; action: "refresh" | "drop" }>;

const rootKey = (root: RootExecutionIdentity): string => `${root.rootSubjectKind}:${root.rootRunId}`;
const sameRoot = (a: RootExecutionIdentity, b: RootExecutionIdentity): boolean =>
  a.rootSubjectKind === b.rootSubjectKind && a.rootRunId === b.rootRunId;
const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * The episodic catalogs of this node (DS-001…DS-004): one Markdown catalog per agent definition with runs here, and the
 * overview `index.md`, all under `<memory>/episodic/` and nowhere else. It holds every catalog's entries in memory,
 * builds them at `start` from one full run-folder discovery, follows journal changes and run deletes through a
 * debounced queue of roots, and writes only files whose content changed. One pass runs at a time, the start pass first.
 * It never renders a journal and never writes in a run folder. Its failures are logged; callers never see them.
 * Its lifecycle owner is the composition root that created it: `start` once, `runDeleted` after a committed delete,
 * `stop` at close.
 */
export class EpisodicCatalog {
  private readonly discovery: Discovery;
  private readonly journals: Journals;
  private readonly tasks: RunTasks;
  private readonly store: EpisodicCatalogStore;
  private readonly quietMs: number;
  private readonly maxWaitMs: number;
  /** Each agent definition's entries by run folder; a definition stays (with no entries) when its runs are gone. */
  private readonly catalogs = new Map<string, Map<string, CatalogEntry>>();
  private readonly pending = new Map<string, RootRequest>();
  /** Runs this instance has already logged as left out, by run and reason. */
  private readonly loggedLeftOut = new Set<string>();
  private taskTitles: TaskTitles | null = null;
  private unsubscribe: (() => void) | null = null;
  private timer: NodeJS.Timeout | null = null;
  private oldestRequestAt: number | null = null;
  private pass: Promise<void> | null = null;
  private stopped = false;
  /** Settles when the start pass has ended (built, failed or stopped); readers of the entries await it. */
  private readonly startPassDone: Promise<void>;
  private settleStartPass: () => void = () => undefined;

  constructor(deps: EpisodicCatalogDependencies) {
    this.discovery = deps.discovery;
    this.journals = deps.journals;
    this.tasks = deps.tasks;
    this.store = new EpisodicCatalogStore(deps.layout);
    this.quietMs = deps.quietMs ?? EPISODIC_CATALOG_QUIET_MS;
    this.maxWaitMs = deps.maxWaitMs ?? EPISODIC_CATALOG_MAX_WAIT_MS;
    this.startPassDone = new Promise<void>((resolve) => { this.settleStartPass = resolve; });
  }

  /**
   * Follows journal changes and launches the start pass in the background; returns at once. Task titles come from the
   * Project Task service, which the composition creates after this owner, so they are given here, before any pass.
   */
  start(input: Readonly<{ taskTitles: TaskTitles }>): void {
    if (this.taskTitles) throw new Error("EpisodicCatalog is already started.");
    this.taskTitles = input.taskTitles;
    this.unsubscribe = this.journals.onJournalChanged((change) => this.journalChanged(change));
    this.runPass(() => this.startPass().finally(() => this.settleStartPass()));
  }

  /** The agent definitions the catalogs hold (with or without entries). Read API for the Memory page (autobyteus-554). */
  agentDefinitionIds(): readonly string[] {
    return [...this.catalogs.keys()];
  }

  /** The entries of one definition's runs on this node (any order); empty for a definition the catalogs do not hold. */
  runsOf(agentDefinitionId: string): readonly CatalogEntry[] {
    return [...(this.catalogs.get(agentDefinitionId)?.values() ?? [])];
  }

  /** Settles when the start pass has ended; before it the entries are not yet built. Never rejects. */
  whenStartPassDone(): Promise<void> {
    return this.startPassDone;
  }

  /** After a committed delete of a root (agent, team or org run): its runs leave the catalogs in the next pass. */
  runDeleted(root: RootExecutionIdentity): void {
    this.request({ root, action: "drop" });
  }

  /** Stops following changes and waits for the running pass; waiting requests are dropped (the next start rebuilds). */
  async stop(): Promise<void> {
    this.stopped = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
    await this.pass;
    this.settleStartPass();
  }

  private journalChanged(change: WorkJournalChange): void {
    const root = this.discovery.rootOf(change.memoryDir);
    if (root) this.request({ root, action: "refresh" });
  }

  private request(request: RootRequest): void {
    if (this.stopped) return;
    this.pending.set(rootKey(request.root), request);
    this.oldestRequestAt ??= Date.now();
    this.schedule();
  }

  /** A pass 5 s after the latest request, at most 30 s after the oldest; never while a pass runs (it schedules after). */
  private schedule(): void {
    if (this.stopped || !this.taskTitles || this.pass || this.oldestRequestAt === null) return;
    const now = Date.now();
    const due = Math.min(now + this.quietMs, this.oldestRequestAt + this.maxWaitMs);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      const requests = [...this.pending.values()];
      this.pending.clear();
      this.oldestRequestAt = null;
      this.runPass(() => this.refreshPass(requests));
    }, Math.max(0, due - now));
  }

  private runPass(work: () => Promise<void>): void {
    this.pass = work()
      .catch((error) => console.warn("EPISODIC_CATALOG_PASS_FAILED", { error: message(error) }))
      .finally(() => {
        this.pass = null;
        this.schedule();
      });
  }

  /** DS-003: one full discovery, every catalog folder already on disk, then every catalog and the overview. */
  private async startPass(): Promise<void> {
    const runs = await this.discovery.findRuns();
    const existing = await this.store.listCatalogDefinitionIds();
    const entries = await this.buildEntries(runs);
    if (this.stopped) return;
    this.catalogs.clear();
    for (const id of existing) this.catalogs.set(id, new Map());
    for (const { agentDefinitionId, entry } of entries) this.catalogOf(agentDefinitionId).set(entry.memoryDir, entry);
    await this.write(new Set(this.catalogs.keys()));
  }

  /** DS-004 and DS-002: each requested root's entries are replaced by its runs now, or dropped; changed files written. */
  private async refreshPass(requests: readonly RootRequest[]): Promise<void> {
    const affected = new Set<string>();
    for (const { root, action } of requests) {
      try {
        const runs = action === "refresh" ? await this.discovery.findRunsOfRoot(root) : [];
        const entries = await this.buildEntries(runs);
        for (const [id, catalog] of this.catalogs) {
          for (const [memoryDir, entry] of catalog) {
            if (sameRoot(entry.root, root)) { catalog.delete(memoryDir); affected.add(id); }
          }
        }
        for (const { agentDefinitionId, entry } of entries) {
          this.catalogOf(agentDefinitionId).set(entry.memoryDir, entry);
          affected.add(agentDefinitionId);
        }
      } catch (error) {
        console.warn("EPISODIC_CATALOG_REFRESH_FAILED", { root: rootKey(root), error: message(error) });
      }
    }
    if (!this.stopped) await this.write(affected);
  }

  /**
   * Entries of the attributed runs (DESIGN.md rule 7 for the rest). Discovery has already logged a run whose records
   * cannot be read; a run whose journal manifest cannot be read is left out here with a warning, once per reason.
   */
  private async buildEntries(runs: readonly DiscoveredRun[]): Promise<Array<{ agentDefinitionId: string; entry: CatalogEntry }>> {
    const titles = new Map<string, Promise<string | null>>();
    const built: Array<{ agentDefinitionId: string; entry: CatalogEntry }> = [];
    for (const run of runs) {
      if (this.stopped) break;
      switch (run.attribution.kind) {
        case "unattributed":
        case "unreadable":
          continue;
        case "attributed":
          break;
      }
      const { agentDefinitionId } = run.attribution;
      try {
        const journal = await this.journals.readJournalSpans(run.memoryDir);
        if (journal.kind === "unreadable") {
          this.runLeftOut(run, journal.reason);
          continue;
        }
        const taskTitle = await this.taskTitleOf(run.root, titles);
        const spans = journal.kind === "spans" ? journal.spans : null;
        built.push({ agentDefinitionId, entry: buildCatalogEntry({ run, spans, taskTitle }) });
      } catch (error) {
        console.warn("EPISODIC_CATALOG_REFRESH_FAILED", { root: rootKey(run.root), run: run.runKey, error: message(error) });
      }
    }
    return built;
  }

  /** EPISODIC_CATALOG_RUN_LEFT_OUT, once per run and reason for this instance (a refresh does not repeat it). */
  private runLeftOut(run: DiscoveredRun, reason: string): void {
    const key = JSON.stringify([run.runKey, reason]);
    if (this.loggedLeftOut.has(key)) return;
    this.loggedLeftOut.add(key);
    console.warn("EPISODIC_CATALOG_RUN_LEFT_OUT", { root: rootKey(run.root), run: run.runKey, reason });
  }

  /** The title of the root's current Project Task (any role); org roots are not Task executions. Once per Task per pass. */
  private taskTitleOf(root: RootExecutionIdentity, titles: Map<string, Promise<string | null>>): Promise<string | null> {
    if (root.rootSubjectKind === "agent_org") return Promise.resolve(null);
    const entry = this.tasks.currentTaskOf(root.rootSubjectKind === "agent" ? { agentRunId: root.rootRunId } : { teamRunId: root.rootRunId });
    if (!entry) return Promise.resolve(null);
    let title = titles.get(entry.taskId);
    if (!title) {
      title = this.taskTitles!.taskTitleOf(entry.taskId);
      titles.set(entry.taskId, title);
    }
    return title;
  }

  private catalogOf(agentDefinitionId: string): Map<string, CatalogEntry> {
    let catalog = this.catalogs.get(agentDefinitionId);
    if (!catalog) {
      catalog = new Map();
      this.catalogs.set(agentDefinitionId, catalog);
    }
    return catalog;
  }

  /** Renders the affected catalogs and the overview, and writes those whose content changed. */
  private async write(affected: ReadonlySet<string>): Promise<void> {
    for (const agentDefinitionId of affected) {
      await this.guardedWrite(agentDefinitionId, () => this.store.writeCatalog(agentDefinitionId, renderCatalog(this.agentCatalog(agentDefinitionId))));
    }
    const all = [...this.catalogs.keys()].map((id) => this.agentCatalog(id));
    await this.guardedWrite("index", () => this.store.writeIndex(renderIndex(all)));
  }

  private agentCatalog(agentDefinitionId: string): AgentCatalog {
    return {
      agentDefinitionId,
      folderName: this.store.folderNameOf(agentDefinitionId),
      entries: [...(this.catalogs.get(agentDefinitionId)?.values() ?? [])],
    };
  }

  private async guardedWrite(file: string, write: () => Promise<boolean>): Promise<void> {
    try {
      await write();
    } catch (error) {
      console.warn("EPISODIC_CATALOG_WRITE_FAILED", { file, error: message(error) });
    }
  }
}

/**
 * The episodic catalogs of one memory folder, as a composition root creates them: its layout and run-folder discovery
 * over that folder, the process journal service and the Task side's run entries passed in.
 */
export const createEpisodicCatalog = (input: Readonly<{ memoryDir: string; journals: Journals; tasks: RunTasks }>): EpisodicCatalog =>
  new EpisodicCatalog({ layout: new AgentMemoryLayout(input.memoryDir), discovery: new RunFolderDiscovery(input.memoryDir), journals: input.journals, tasks: input.tasks });

let processCatalog: EpisodicCatalog | null = null;

/**
 * The process's catalog, for readers built per request (the Memory page's explorer service). The composition root sets
 * it right after creating the catalog, before the HTTP server serves, and releases it at close.
 */
export const setProcessEpisodicCatalog = (catalog: EpisodicCatalog): void => {
  processCatalog = catalog;
};

/** Clears the binding when it still holds this catalog (close). */
export const releaseProcessEpisodicCatalog = (catalog: EpisodicCatalog): void => {
  if (processCatalog === catalog) processCatalog = null;
};

/** The process's catalog; throws `EPISODIC_CATALOG_NOT_COMPOSED` when no composition root has set it (no fallback). */
export const getProcessEpisodicCatalog = (): EpisodicCatalog => {
  if (!processCatalog) {
    throw new Error("EPISODIC_CATALOG_NOT_COMPOSED: no composition root has set the process episodic catalog.");
  }
  return processCatalog;
};
