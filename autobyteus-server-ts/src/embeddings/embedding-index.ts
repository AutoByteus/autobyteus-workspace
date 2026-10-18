import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";
import type { EmbeddingModelDefinition } from "./catalog/embedding-model-definition.js";
import { resolveActiveEmbeddingModel } from "./catalog/embedding-model-setting.js";
import { CollectionIndexingJob, type CollectionItem } from "./collection-indexing-job.js";
import { READY, unavailable, type EmbeddingReadiness } from "./embedding-readiness.js";
import { EmbeddingModelFiles } from "./models/embedding-model-files.js";
import { selectRelevant, type ScoredItem } from "./relevance.js";
import { EmbeddingModelRunner, type EmbeddingRunner, type EmbeddingRunnerFactory } from "./runtime/embedding-model-runner.js";
import { EmbeddingVectorStore } from "./store/embedding-vector-store.js";

export type { CollectionItem } from "./collection-indexing-job.js";
export type { EmbeddingReadiness } from "./embedding-readiness.js";

export type EmbeddingSearchOptions = {
  /** Most meaning matches returned (default 20). */
  limit?: number;
  /** Wait up to this long for the collection to be ready before answering (default 0: answer at once). */
  waitForReadyMs?: number;
  /** Ids whose similarity the caller wants even when they are not meaning matches (e.g. to order its own matches). */
  scoreIds?: readonly string[];
};
export type EmbeddingSearchResult = {
  /** Relevant items only (the active model's relevance rule), best-first. Items not indexed for their current text never appear. */
  matches: ScoredItem[];
  /** Similarity of each requested `scoreIds` item that is indexed for its current text. */
  scores: Record<string, number>;
  readiness: EmbeddingReadiness;
};
export type EmbeddingModelState = "idle" | "downloading" | "loading" | "ready" | "unavailable";
export type EmbeddingModelStatus = { activeModelId: string; state: EmbeddingModelState; reason?: string };

type ModelPhase =
  | { kind: "idle" } | { kind: "downloading"; done: number; total: number } | { kind: "loading" } | { kind: "ready" }
  | { kind: "unavailable"; reason: string };
type ActiveModel = { definition: EmbeddingModelDefinition; phase: ModelPhase; runner: EmbeddingRunner | null };
type Dependencies = {
  /** `<appData>/embeddings`: holds `embeddings.sqlite` and `models/<modelId>/`. */
  rootDir: string;
  resolveModel?: () => EmbeddingModelDefinition;
  createRunner?: EmbeddingRunnerFactory;
  files?: ModelFiles;
  store?: EmbeddingVectorStore;
};
type ModelFiles = Pick<EmbeddingModelFiles, "hasAllFiles" | "ensure" | "removeAllExcept">;

const DEFAULT_LIMIT = 20;
const reasonOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
const dot = (a: Float32Array, b: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
};

/**
 * The embedding layer's only public boundary. Consumers name a collection (a key they own), give its complete current
 * items and ask "most similar items to this text". The index owns the active model (resolved from the setting at every
 * operation; a change switches models without mixing vectors), the model's readiness (download, load, failure, retry),
 * each collection's fingerprints, vectors and background indexing, query embedding, scoring and the relevance rule.
 * Nothing heavy happens until the first operation that needs it.
 */
export class EmbeddingIndex {
  private model: ActiveModel | null = null;
  private readonly collections = new Map<string, CollectionIndexingJob>();
  private readonly waiters = new Set<() => void>();
  private readonly files: ModelFiles;
  private readonly store: EmbeddingVectorStore;
  private readonly resolveModel: () => EmbeddingModelDefinition;
  private readonly createRunner: EmbeddingRunnerFactory;

  constructor(deps: Dependencies) {
    this.files = deps.files ?? new EmbeddingModelFiles(path.join(deps.rootDir, "models"));
    this.store = deps.store ?? new EmbeddingVectorStore(path.join(deps.rootDir, "embeddings.sqlite"));
    this.resolveModel = deps.resolveModel ?? (() => resolveActiveEmbeddingModel());
    this.createRunner = deps.createRunner ?? ((definition, modelDir) => new EmbeddingModelRunner(definition, modelDir));
  }

  /** Syncs the collection with `items`, then answers with its relevant meaning matches and its readiness. */
  async search(collection: string, items: readonly CollectionItem[], queryText: string, options: EmbeddingSearchOptions = {}): Promise<EmbeddingSearchResult> {
    const deadline = Date.now() + (options.waitForReadyMs ?? 0);
    for (;;) {
      const job = this.syncCollection(collection, items);
      const readiness = this.readinessOf(job);
      const remaining = deadline - Date.now();
      if (readiness.state !== "preparing" || remaining <= 0) return this.query(job, queryText, readiness, options);
      await this.waitForChange(remaining);
    }
  }

  /** Brings the collection in step with `items` (removes absent items, schedules missing or changed ones). */
  sync(collection: string, items: readonly CollectionItem[]): EmbeddingReadiness {
    return this.readinessOf(this.syncCollection(collection, items));
  }

  /** Removes items now; an in-flight batch that contains them is discarded. Never waits for indexing. */
  removeItems(collection: string, ids: readonly string[]): void {
    const job = this.collections.get(collection);
    if (job) job.remove(ids);
    else this.store.remove(collection, ids);
  }

  /** Removes the whole collection now; its job is cancelled and an in-flight batch is discarded. */
  dropCollection(collection: string): void {
    this.collections.get(collection)?.cancel();
    this.collections.delete(collection);
    this.store.dropCollection(collection);
  }

  modelStatus(): EmbeddingModelStatus {
    const activeModelId = this.resolveModel().id;
    const phase = this.model?.definition.id === activeModelId ? this.model.phase : { kind: "idle" as const };
    return { activeModelId, state: phase.kind, ...(phase.kind === "unavailable" ? { reason: phase.reason } : {}) };
  }

  /** Clears an `unavailable` model so the next operation that needs it tries again. True when there was one to retry. */
  retryModel(): boolean {
    const model = this.model;
    if (!model || model.phase.kind !== "unavailable") return false;
    model.phase = { kind: "idle" };
    model.runner = null;
    return true;
  }

  /** Stops the model worker and closes the store (host shutdown). */
  async shutdown(): Promise<void> {
    for (const job of this.collections.values()) job.cancel();
    this.collections.clear();
    const runner = this.model?.runner;
    this.model = null;
    await runner?.stop();
    this.store.close();
  }

  private activeModel(): ActiveModel {
    const definition = this.resolveModel();
    if (this.model?.definition.id === definition.id) return this.model;
    // A model switch: nothing of the previous model is used again; collections re-sync against the new model's rows.
    for (const job of this.collections.values()) job.cancel();
    this.collections.clear();
    void this.model?.runner?.stop();
    this.model = { definition, phase: { kind: "idle" }, runner: null };
    this.notify();
    return this.model;
  }

  private syncCollection(collection: string, items: readonly CollectionItem[]): CollectionIndexingJob {
    const model = this.activeModel();
    let job = this.collections.get(collection);
    if (!job) {
      const { id, documentPrefix } = model.definition;
      job = new CollectionIndexingJob(collection, { id, documentPrefix }, this.store, this.store.read(collection, id), () => this.notify());
      this.collections.set(collection, job);
    }
    job.sync(items);
    if (model.phase.kind === "idle") this.prepareModel(model);
    else this.startJob(model, job);
    return job;
  }

  /**
   * DS-004: download and verify the files, then load the worker. Any failure leaves the model unavailable until a retry.
   * Files already on disk are only verified, which reports `loading`; `downloading` is reported while bytes arrive.
   */
  private prepareModel(model: ActiveModel): void {
    const { definition } = model;
    model.phase = this.files.hasAllFiles(definition)
      ? { kind: "loading" }
      : { kind: "downloading", done: 0, total: definition.files.reduce((sum, file) => sum + file.bytes, 0) };
    void (async () => {
      try {
        const modelDir = await this.files.ensure(definition, (done, total) => {
          if (model.phase.kind === "downloading" || model.phase.kind === "loading") model.phase = { kind: "downloading", done, total };
        });
        if (this.model !== model) return;
        model.phase = { kind: "loading" };
        this.notify();
        const runner = this.createRunner(definition, modelDir);
        await runner.start();
        if (this.model !== model || model.phase.kind !== "loading") return void runner.stop();
        model.runner = runner;
        model.phase = { kind: "ready" };
        this.removeOtherModels(definition.id);
        for (const job of this.collections.values()) this.startJob(model, job);
      } catch (error) {
        if (this.model === model) this.failModel(model, error);
      } finally {
        this.notify();
      }
    })();
  }

  private startJob(model: ActiveModel, job: CollectionIndexingJob): void {
    const runner = model.runner;
    if (model.phase.kind !== "ready" || !runner) return;
    job.start(runner, () => this.model === model && model.phase.kind === "ready", (error) => this.failModel(model, error));
  }

  private failModel(model: ActiveModel, error: unknown): void {
    console.warn("EMBEDDING_MODEL_UNAVAILABLE", { model: model.definition.id, reason: reasonOf(error) });
    model.phase = { kind: "unavailable", reason: reasonOf(error) };
    void model.runner?.stop();
    model.runner = null;
    this.notify();
  }

  /** After a switch completes: only the active model's vectors and files are kept. */
  private removeOtherModels(modelId: string): void {
    try {
      this.store.deleteOtherModels(modelId);
    } catch (error) {
      console.warn("EMBEDDING_OLD_VECTORS_REMOVE_FAILED", { error: reasonOf(error) });
    }
    this.files.removeAllExcept(modelId).catch((error: unknown) => console.warn("EMBEDDING_OLD_MODELS_REMOVE_FAILED", { error: reasonOf(error) }));
  }

  private readinessOf(job: CollectionIndexingJob): EmbeddingReadiness {
    const phase = this.model?.phase ?? { kind: "idle" };
    if (phase.kind === "unavailable") return unavailable(phase.reason);
    if (phase.kind === "downloading") return { state: "preparing", phase: "downloading", done: phase.done, total: phase.total };
    if (phase.kind !== "ready") return { state: "preparing", phase: "loading", done: 0, total: 0 };
    return job.hasPending() ? { state: "preparing", phase: "indexing", ...job.progress() } : READY;
  }

  private async query(job: CollectionIndexingJob, text: string, readiness: EmbeddingReadiness, options: EmbeddingSearchOptions): Promise<EmbeddingSearchResult> {
    const model = this.model;
    const fresh = job.freshVectors();
    if (!model?.runner || model.phase.kind !== "ready" || !fresh.length) return { matches: [], scores: {}, readiness };
    let queryVector: Float32Array;
    try {
      [queryVector] = await model.runner.embed("query", [text]) as [Float32Array];
    } catch (error) {
      if (this.model === model && model.phase.kind === "ready") this.failModel(model, error);
      return { matches: [], scores: {}, readiness: unavailable(reasonOf(error)) };
    }
    const scored = fresh.map(({ id, vector }) => ({ id, score: dot(queryVector, vector) }));
    const wanted = new Set(options.scoreIds ?? []);
    return {
      matches: selectRelevant(scored, model.definition.relevance, options.limit ?? DEFAULT_LIMIT),
      scores: Object.fromEntries(scored.filter((item) => wanted.has(item.id)).map((item) => [item.id, item.score])),
      readiness,
    };
  }

  private notify(): void {
    for (const wake of [...this.waiters]) wake();
  }

  private waitForChange(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const wake = () => {
        clearTimeout(timer);
        this.waiters.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, ms);
      this.waiters.add(wake);
    });
  }
}

let instance: EmbeddingIndex | null = null;
/** The process index over `<appData>/embeddings`; constructing it does no I/O. */
export const getEmbeddingIndex = (): EmbeddingIndex =>
  instance ??= new EmbeddingIndex({ rootDir: path.join(appConfigProvider.config.getAppDataDir(), "embeddings") });
/** Tests: install a process index (e.g. over a deterministic model) or clear it. */
export const resetEmbeddingIndexForTests = (index: EmbeddingIndex | null = null): void => { instance = index; };
/** Host shutdown: stops the worker and closes the store. */
export const shutdownEmbeddingIndex = async (): Promise<void> => {
  const current = instance;
  instance = null;
  await current?.shutdown();
};
