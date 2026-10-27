import path from "node:path";
import type { WorkJournalChange } from "../../agent-work-journal/domain/work-journal-models.js";
import type { WorkJournalService } from "../../agent-work-journal/services/work-journal-service.js";
import type { EmbeddingIndex, ItemFingerprints } from "../../embeddings/embedding-index.js";
import type {
  MemoryIndexState,
  MemoryIndexStatus,
  MemoryIndexStep,
  MemoryIndexStepName,
  MemoryRun,
} from "../domain/memory-search-models.js";
import type { MemoryRunDiscovery } from "../runs/memory-run-discovery.js";
import type { MemorySearchStore } from "../store/memory-search-store.js";
import { makeJournalsCurrent } from "./journals-step.js";
import { indexRunJournals } from "./run-journal-indexer.js";

/** The meaning index's collection of journal cards. */
export const MEMORY_CARD_COLLECTION = "memory-journal-cards";
/** Quiet time after a journal change before its run is indexed (DS-003). */
export const LIVE_UPDATE_QUIET_MS = 20_000;

const BUILT_KEY = "built";
const MEANING_MODEL_KEY = "meaningIndexModelId";
const UPDATED_AT_KEY = "updatedAt";

/**
 * What a pass does. `full` (Index now, Try again) and `rebuild` are the user's; `catchUp` follows a restart;
 * `runs` follows journal changes; `meaningSync` creates the meaning job after a restart (first search).
 */
export type PassRequest =
  | Readonly<{ kind: "full" | "rebuild" | "catchUp" | "meaningSync" }>
  | Readonly<{ kind: "runs"; memoryDirs: ReadonlySet<string> }>;

type Embeddings = Pick<EmbeddingIndex, "sync" | "dropCollection" | "activeModelOnDisk" | "fingerprintItems" | "collectionStatus">;
type Journals = Pick<WorkJournalService, "ensureCurrent" | "journalFileVersions" | "readJournalFile" | "onJournalChanged">;

export type MemoryIndexPipelineDependencies = Readonly<{
  store: MemorySearchStore;
  discovery: Pick<MemoryRunDiscovery, "findRuns" | "folderRun">;
  journals: Journals;
  embeddings: () => Embeddings;
  /** The active embedding model, resolved from the setting (no model work). */
  activeModelId: () => string;
  quietMs?: number;
  now?: () => Date;
}>;

/** The pipeline's own, updated record of a step (the status hands out copies). */
type StepRecord = { -readonly [K in keyof MemoryIndexStep]: MemoryIndexStep[K] };

const STEP_ORDER: readonly MemoryIndexStepName[] = ["findRuns", "journals", "textIndex", "meaningIndex"];
const RANK: Record<PassRequest["kind"], number> = { meaningSync: 0, runs: 1, catchUp: 2, full: 3, rebuild: 4 };
/**
 * Passes the status shows as building, with their own step progress: the user's builds and the catch-up after
 * a start. Live updates and the meaning sync only keep the index current; while they run, the settled index is
 * reported (CR-002).
 */
const SHOWN: ReadonlySet<PassRequest["kind"]> = new Set(["full", "rebuild", "catchUp"]);

const freshSteps = (): StepRecord[] => STEP_ORDER.map((step) => ({
  step, state: "waiting", done: 0, total: 0, unit: step === "findRuns" || step === "journals" ? "runs" : "journalFiles", failureMessage: null,
}));

/** Two requests as one: the broader kind wins; live runs are merged. */
const merge = (a: PassRequest | null, b: PassRequest): PassRequest => {
  if (!a) return b;
  if (a.kind === "runs" && b.kind === "runs") return { kind: "runs", memoryDirs: new Set([...a.memoryDirs, ...b.memoryDirs]) };
  return RANK[a.kind] >= RANK[b.kind] ? a : b;
};

/**
 * The indexing pipeline (DS-001, DS-003, DS-005, DS-006): Find runs → Journals → Text index → Meaning index,
 * in order, one pass at a time; a request during a pass is merged into one more. It owns the step states and
 * progress, the built marker, the live-update queue (journal changes, debounced), the catch-up after a start
 * and the Meaning step's rules: the complete card set always; outside the user's click only with the model the
 * Meaning index was built with, on disk; never a download then.
 */
export class MemoryIndexPipeline {
  /** The steps the status reports: the last shown pass's. */
  private steps: StepRecord[] = freshSteps();
  /** The running pass's steps (the reported ones for a shown pass, its own for a quiet one). */
  private passSteps: StepRecord[] = this.steps;
  private shownRunning = false;
  private running: Promise<void> | null = null;
  private next: PassRequest | null = null;
  private lastFailure: string | null = null;
  private meaningNote: string | null = null;
  private cardFingerprints: ItemFingerprints | null = null;
  private cardCount = 0;
  /** True while the build's own meaning embedding runs (shown in the status); a live update's few cards are not. */
  private buildEmbedding = false;
  /** Run folders whose journal the Journals step is making current now: their notifications are its own. */
  private readonly ownJournalCalls = new Set<string>();
  private readonly liveQueue = new Set<string>();
  private liveTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private disposed = false;

  constructor(private readonly deps: MemoryIndexPipelineDependencies) {}

  /** Server start (step 9): follows journal changes, and catches up when the index was built before. */
  start(): void {
    this.unsubscribe ??= this.deps.journals.onJournalChanged((change) => this.onJournalChanged(change));
    if (this.isBuilt()) this.request({ kind: "catchUp" });
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe?.();
    if (this.liveTimer) clearTimeout(this.liveTimer);
    this.liveTimer = null;
  }

  isBuilt(): boolean {
    return this.deps.store.getState(BUILT_KEY) === "1";
  }

  isRunning(): boolean {
    return this.running !== null;
  }

  /** Starts a pass, or merges the request into the next one while a pass runs. Resolves when the pass ends. */
  request(request: PassRequest): Promise<void> {
    this.next = merge(this.next, request);
    this.running ??= this.drain();
    return this.running;
  }

  status(): MemoryIndexStatus {
    const { store } = this.deps;
    const counts = store.counts();
    const activeModelId = this.deps.activeModelId();
    const meaningIndexModelId = store.getState(MEANING_MODEL_KEY);
    const built = this.isBuilt();
    const steps = this.shownRunning || !built ? this.steps : this.settledSteps(counts.runs, counts.journalFiles);
    let state: MemoryIndexState;
    if (this.shownRunning) state = "building";
    else if (this.lastFailure) state = "failed";
    else if (!built) state = "notIndexed";
    else state = meaningIndexModelId && meaningIndexModelId !== activeModelId ? "modelChanged" : "ready";
    return {
      state, steps: steps.map((step): MemoryIndexStep => step.step === "meaningIndex" && !this.shownRunning && built ? this.meaningProgress(step) : { ...step }),
      runCount: counts.runs, journalFileCount: counts.journalFiles, updatedAt: store.getState(UPDATED_AT_KEY),
      textIndexHasContent: counts.chunks > 0, activeModelId, meaningIndexModelId,
      meaningNote: meaningIndexModelId && meaningIndexModelId !== activeModelId
        ? `The Meaning index was built with ${meaningIndexModelId}; the active model is ${activeModelId}. Rebuild to use it.`
        : this.meaningNote,
    };
  }

  /**
   * The build's meaning embedding, from the card fingerprints of the last Meaning step (unchanged before it ran in
   * this process, and once that embedding is done: a live update's few cards are upkeep, not progress).
   */
  meaningProgress(step: MemoryIndexStep): MemoryIndexStep {
    if (!this.cardFingerprints || !this.buildEmbedding) return step;
    const status = this.deps.embeddings().collectionStatus(MEMORY_CARD_COLLECTION, this.cardFingerprints);
    const total = this.cardCount;
    const pending = status.state === "indexing" ? status.total - status.done
      : status.state === "waiting" ? status.total
        : status.state === "needsUpdate" ? status.changed
          : status.state === "notIndexed" ? total : 0;
    if (pending === 0 && status.state !== "unavailable") this.buildEmbedding = false;
    return { ...step, state: status.state === "unavailable" ? "failed" : step.state, done: Math.max(0, total - pending), total,
      failureMessage: status.state === "unavailable" ? "The embedding model is unavailable." : step.failureMessage };
  }

  private settledSteps(runs: number, journalFiles: number): StepRecord[] {
    return this.steps.map((step) => step.state === "failed" ? step : {
      ...step, state: "done", done: step.unit === "runs" ? runs : journalFiles, total: step.unit === "runs" ? runs : journalFiles,
    });
  }

  /**
   * A journal change. Only the Journals step's own calls are dropped (its pass indexes that run next, rule 5);
   * every other change is queued, also while a pass or the first build runs (CR-001): a run indexed twice costs
   * nothing, its content hashes are unchanged.
   */
  private onJournalChanged(change: WorkJournalChange): void {
    if (this.disposed) return;
    const memoryDir = path.resolve(change.memoryDir);
    if (this.ownJournalCalls.has(memoryDir)) return;
    this.liveQueue.add(memoryDir);
    if (this.liveTimer) clearTimeout(this.liveTimer);
    this.liveTimer = setTimeout(() => {
      this.liveTimer = null;
      // Before the first build only the build indexes; while it runs, the changes follow it.
      if (!this.isBuilt() && !this.isRunning()) return;
      const memoryDirs = new Set(this.liveQueue);
      this.liveQueue.clear();
      void this.request({ kind: "runs", memoryDirs }).catch(() => undefined);
    }, this.deps.quietMs ?? LIVE_UPDATE_QUIET_MS);
    this.liveTimer.unref?.();
  }

  private async drain(): Promise<void> {
    try {
      while (this.next && !this.disposed) {
        const request = this.next;
        this.next = null;
        await this.pass(request);
      }
    } finally {
      this.running = null;
      this.shownRunning = false;
    }
  }

  private async pass(request: PassRequest): Promise<void> {
    const { store } = this.deps;
    // A live update after a failed or never finished first build waits for the user's build.
    if (request.kind === "runs" && !this.isBuilt()) return;
    const userClick = request.kind === "full" || request.kind === "rebuild";
    const shown = SHOWN.has(request.kind);
    this.passSteps = freshSteps();
    if (shown) {
      this.lastFailure = null;
      this.steps = this.passSteps;
    }
    this.shownRunning = shown;
    try {
      if (request.kind === "rebuild") {
        store.clear();
        this.deps.embeddings().dropCollection(MEMORY_CARD_COLLECTION);
        this.cardFingerprints = null;
      }
      if (request.kind !== "meaningSync") {
        const runs = await this.findRunsStep(request);
        await this.journalsStep(request, runs);
        await this.textIndexStep(runs);
      } else {
        for (const step of this.passSteps.slice(0, 3)) Object.assign(step, { state: "done" });
      }
      // After a restart the Meaning step waits for the first search or live update (rule 3): no model at start.
      if (request.kind === "catchUp") Object.assign(this.step("meaningIndex"), { state: "done" });
      else if (await this.meaningStep(userClick) && request.kind !== "runs") this.buildEmbedding = true;
      if (request.kind === "full" || request.kind === "rebuild") store.setState(BUILT_KEY, "1");
      // The meaning sync changes no index content.
      if (request.kind !== "meaningSync") store.setState(UPDATED_AT_KEY, (this.deps.now?.() ?? new Date()).toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failing = this.passSteps.find((step) => step.state === "running");
      if (failing) Object.assign(failing, { state: "failed", failureMessage: message });
      // A live update or meaning sync that fails changes nothing reported; the next change or start tries again.
      if (shown) this.lastFailure = message;
      console.warn("MEMORY_SEARCH_PASS_FAILED", { kind: request.kind, error: message });
    }
  }

  /** Whether a meaning sync would embed now (the recorded model is active and on disk); else asking for one is a no-op. */
  canSyncMeaning(): boolean {
    return this.deps.store.getState(MEANING_MODEL_KEY) === this.deps.activeModelId() && this.deps.embeddings().activeModelOnDisk();
  }

  private step(name: MemoryIndexStepName): StepRecord {
    return this.passSteps.find((step) => step.step === name)!;
  }

  /** Find runs: every run folder for a full pass; for live changes the known runs, plus a full find when one is new. */
  private async findRunsStep(request: PassRequest): Promise<MemoryRun[]> {
    const step = this.step("findRuns");
    Object.assign(step, { state: "running" });
    const { store } = this.deps;
    let runs: MemoryRun[];
    const known = new Map(store.listRuns().map(({ run }) => [path.resolve(run.memoryDir), run]));
    if (request.kind === "runs" && [...request.memoryDirs].every((dir) => known.has(dir))) {
      runs = [...request.memoryDirs].map((dir) => known.get(dir)!);
    } else {
      const found = await this.deps.discovery.findRuns();
      const foundDirs = new Set(found.map((run) => path.resolve(run.memoryDir)));
      for (const run of found) store.upsertRun(run);
      if (request.kind !== "runs") {
        for (const [dir, run] of known) if (!foundDirs.has(dir)) store.removeRun(run.runKey);
      }
      runs = request.kind === "runs" ? found.filter((run) => request.memoryDirs.has(path.resolve(run.memoryDir))) : found;
    }
    Object.assign(step, { state: "done", done: runs.length, total: runs.length });
    return runs;
  }

  /** Journals: each run whose raw traces changed (live changes already made their journal current). */
  private async journalsStep(request: PassRequest, runs: readonly MemoryRun[]): Promise<void> {
    const step = this.step("journals");
    Object.assign(step, { state: "running", total: runs.length, done: 0 });
    if (request.kind !== "runs") {
      const stored = new Map(this.deps.store.listRuns().map(({ run, rawFingerprint }) => [run.runKey, rawFingerprint]));
      const ownCalls = {
        ensureCurrent: async (target: Parameters<Journals["ensureCurrent"]>[0]) => {
          const memoryDir = path.resolve(target.memoryDir);
          this.ownJournalCalls.add(memoryDir);
          try {
            return await this.deps.journals.ensureCurrent(target);
          } finally {
            this.ownJournalCalls.delete(memoryDir);
          }
        },
      };
      const kept = await makeJournalsCurrent(ownCalls,
        runs.map((run) => ({ run, storedFingerprint: stored.get(run.runKey) ?? null })),
        (done) => { step.done = done; }, () => this.disposed);
      for (const [runKey, fingerprint] of kept) this.deps.store.setRawFingerprint(runKey, fingerprint);
    }
    Object.assign(step, { state: "done", done: runs.length });
  }

  /** Text index: re-chunks (and re-cards) each journal file whose content hash changed. */
  private async textIndexStep(runs: readonly MemoryRun[]): Promise<void> {
    const step = this.step("textIndex");
    Object.assign(step, { state: "running", done: 0, total: 0 });
    const listed: Array<{ run: MemoryRun; versions: Awaited<ReturnType<Journals["journalFileVersions"]>> }> = [];
    for (const run of runs) listed.push({ run, versions: await this.deps.journals.journalFileVersions(run.memoryDir) });
    step.total = listed.reduce((sum, item) => sum + item.versions.length, 0);
    for (const { run, versions } of listed) {
      if (this.disposed) return;
      if (await indexRunJournals(run, versions, this.deps.journals, this.deps.store, () => { step.done++; })) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
    step.state = "done";
  }

  /**
   * Meaning index: the complete card set to the embedding index, which embeds what changed in the background.
   * On the user's click always (recording the model); otherwise only with the recorded model, on disk.
   * Returns whether it synced.
   */
  private async meaningStep(userClick: boolean): Promise<boolean> {
    const step = this.step("meaningIndex");
    const embeddings = this.deps.embeddings();
    const activeModelId = this.deps.activeModelId();
    if (!userClick) {
      const recorded = this.deps.store.getState(MEANING_MODEL_KEY);
      if (recorded !== activeModelId) {
        this.meaningNote = null;
        Object.assign(step, { state: "done" });
        return false;
      }
      if (!embeddings.activeModelOnDisk()) {
        this.meaningNote = "The embedding model is not downloaded: download it on Server Settings → Embedding.";
        Object.assign(step, { state: "done" });
        return false;
      }
    }
    Object.assign(step, { state: "running" });
    const cards = this.deps.store.allCards().map((card) => ({ id: card.id, text: card.text }));
    embeddings.sync(MEMORY_CARD_COLLECTION, cards);
    this.cardFingerprints = embeddings.fingerprintItems(cards);
    this.cardCount = cards.length;
    this.meaningNote = null;
    if (userClick) this.deps.store.setState(MEANING_MODEL_KEY, activeModelId);
    Object.assign(step, { state: "done", done: cards.length, total: cards.length });
    return true;
  }
}
