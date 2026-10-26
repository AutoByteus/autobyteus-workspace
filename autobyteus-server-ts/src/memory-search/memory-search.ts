import path from "node:path";
import { getWorkJournalService, type WorkJournalService } from "../agent-work-journal/services/work-journal-service.js";
import { appConfigProvider } from "../config/app-config-provider.js";
import { resolveActiveEmbeddingModel } from "../embeddings/catalog/embedding-model-setting.js";
import { getEmbeddingIndex, type EmbeddingIndex } from "../embeddings/embedding-index.js";
import type { MemoryIndexStatus, MemorySearchResult } from "./domain/memory-search-models.js";
import { MemoryIndexPipeline } from "./pipeline/memory-index-pipeline.js";
import { MemoryRunDiscovery } from "./runs/memory-run-discovery.js";
import { MemorySearchService, type MemorySearchOutcome } from "./search/memory-search-service.js";
import { MEMORY_SEARCH_MAX_LIMIT, resolveMemorySearchDefaultLimit } from "./settings/memory-search-settings.js";
import { MemorySearchStore } from "./store/memory-search-store.js";

export const MEMORY_INDEX_NOT_BUILT = "Memory index not built yet: ask the user to start it on the Memory page.";
const WEAK_ONLY = "Only weak matches; try other words.";
const NO_MATCHES = "No matches; try other words.";

export type MemorySearchDependencies = Readonly<{
  appDataDir: string;
  memoryDir: string;
  journals?: WorkJournalService;
  embeddings?: () => EmbeddingIndex;
  activeModelId?: () => string;
  discovery?: MemoryRunDiscovery;
  quietMs?: number;
}>;

/** A search request: the cue, and optionally how many runs and which run asks (left out of its results). */
export type MemorySearchOptions = Readonly<{ limit?: number | null; askingRunId?: string | null }>;

/**
 * The memory-search subsystem's one public boundary (tools, GraphQL, startup): search, the index status and
 * the indexing commands. It resolves the default-limit setting, turns the tiers' states into the coverage and
 * weak-match notes, asks the pipeline for the meaning sync when nothing synced the cards since the start, and
 * owns the process lifetime. Searching only reads the indexes.
 */
export class MemorySearch {
  private readonly store: MemorySearchStore;
  private readonly pipeline: MemoryIndexPipeline;
  private readonly searchService: MemorySearchService;
  private readonly memoryDir: string;

  constructor(deps: MemorySearchDependencies) {
    this.memoryDir = path.resolve(deps.memoryDir);
    const journals = deps.journals ?? getWorkJournalService();
    const embeddings = deps.embeddings ?? getEmbeddingIndex;
    const activeModelId = deps.activeModelId ?? (() => resolveActiveEmbeddingModel().id);
    this.store = new MemorySearchStore(path.join(deps.appDataDir, "memory-search", "memory-search.sqlite"));
    this.pipeline = new MemoryIndexPipeline({
      store: this.store, journals, embeddings,
      discovery: deps.discovery ?? new MemoryRunDiscovery(deps.memoryDir),
      activeModelId,
      quietMs: deps.quietMs,
    });
    this.searchService = new MemorySearchService({ store: this.store, journals, embeddings, activeModelId });
  }

  /** Server start (step 9): follow journal changes; catch up when the index was built before. Loads no model. */
  start(): void {
    this.pipeline.start();
  }

  async search(query: string, options: MemorySearchOptions = {}): Promise<MemorySearchResult> {
    if (!query.trim()) throw new Error("Search text is required.");
    const limit = Math.min(MEMORY_SEARCH_MAX_LIMIT, Math.max(1, Math.floor(options.limit ?? resolveMemorySearchDefaultLimit())));
    const status = this.pipeline.status();
    if (!status.textIndexHasContent) {
      return { results: [], coverage: status.state === "building" ? this.buildingCoverage(status) ?? MEMORY_INDEX_NOT_BUILT : MEMORY_INDEX_NOT_BUILT, note: null };
    }
    const outcome = await this.searchService.search(query, { limit, askingRunId: options.askingRunId ?? null });
    // Only when the Meaning step would embed: with another model or no model files it would skip (CR-002).
    if (outcome.meaning.collection === "notSynced" && this.pipeline.isBuilt() && !this.pipeline.isRunning() && this.pipeline.canSyncMeaning()) {
      void this.pipeline.request({ kind: "meaningSync" }).catch(() => undefined);
    }
    const matches = outcome.results.flatMap((result) => result.matches);
    const coverage = this.coverage(status, outcome);
    // While the index is incomplete, weak may only mean missing cards: the coverage note says so instead (R-10).
    const weakOnly = !coverage && matches.every((match) => match.strength === "weak");
    return {
      results: outcome.results,
      coverage,
      note: !outcome.results.length ? NO_MATCHES : weakOnly ? WEAK_ONLY : null,
    };
  }

  indexStatus(): MemoryIndexStatus {
    return this.pipeline.status();
  }

  /**
   * The memory folder of a run the index knows only by its folder (`RUN_FOLDER`); null for any other key, and for
   * a key that does not resolve inside this node's memory folder.
   */
  runFolderMemoryDir(runKey: string): string | null {
    const run = this.store.listRuns().find((entry) => entry.run.subject.kind === "RUN_FOLDER" && entry.run.runKey === runKey)?.run;
    if (!run) return null;
    const memoryDir = path.resolve(this.memoryDir, run.runKey);
    return memoryDir.startsWith(`${this.memoryDir}${path.sep}`) ? memoryDir : null;
  }

  /** Index now / Try again: a pass that resumes (finished work is skipped by fingerprints). Ignored while one runs. */
  startIndexing(): boolean {
    if (this.pipeline.isRunning()) return false;
    void this.pipeline.request({ kind: "full" }).catch(() => undefined);
    return true;
  }

  /** Drops the index, then a full pass. Ignored while a pass runs. */
  rebuild(): boolean {
    if (this.pipeline.isRunning()) return false;
    void this.pipeline.request({ kind: "rebuild" }).catch(() => undefined);
    return true;
  }

  shutdown(): void {
    this.pipeline.dispose();
    this.store.close();
  }

  private buildingCoverage(status: MemoryIndexStatus): string | null {
    const text = status.steps.find((step) => step.step === "textIndex");
    return text && text.state !== "done" && text.total ? `Indexing in progress: the text index covers ${text.done} of ${text.total} journal files.` : null;
  }

  private coverage(status: MemoryIndexStatus, outcome: MemorySearchOutcome): string | null {
    const notes: string[] = [];
    if (status.state === "building") notes.push(this.buildingCoverage(status) ?? "Indexing in progress.");
    const { collection, readiness } = outcome.meaning;
    if (status.state === "modelChanged") {
      notes.push(`The meaning index was built with ${status.meaningIndexModelId}; results are by words only until the user rebuilds the index on the Memory page.`);
    } else if (status.meaningNote) {
      notes.push(`${status.meaningNote} Results are by words only.`);
    } else if (collection === "notSynced" || (readiness.state === "preparing" && readiness.phase !== "indexing")) {
      notes.push("The meaning index is loading: these results are by words only.");
    } else if (readiness.state === "unavailable") {
      notes.push(`Meaning search is unavailable (${readiness.reason}): results are by words only.`);
    } else if (readiness.state === "preparing") {
      // The build's embedding is progress; a live update's few cards are upkeep and say nothing.
      const meaning = status.steps.find((step) => step.step === "meaningIndex");
      if (meaning?.total && meaning.done < meaning.total) notes.push(`The meaning index covers ${meaning.done} of ${meaning.total} journal files.`);
      else if (!meaning?.total) notes.push("The meaning index is being built.");
    }
    return notes.length ? notes.join(" ") : null;
  }
}

let instance: MemorySearch | null = null;

/** The process instance over `<appData>/memory-search` and this node's memory folder; constructing it does no I/O. */
export const getMemorySearch = (): MemorySearch => {
  instance ??= new MemorySearch({ appDataDir: appConfigProvider.config.getAppDataDir(), memoryDir: appConfigProvider.config.getMemoryDir() });
  return instance;
};

/** Host shutdown: stops following journals and closes the store. */
export const shutdownMemorySearch = (): void => {
  instance?.shutdown();
  instance = null;
};

/** Tests: install a process instance, or clear it. */
export const resetMemorySearchForTests = (next: MemorySearch | null = null): void => {
  instance = next;
};
