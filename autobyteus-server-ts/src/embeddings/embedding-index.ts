import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";
import { DEFAULT_EMBEDDING_MODEL_ID, EMBEDDING_MODEL_CATALOG } from "./catalog/embedding-model-catalog.js";
import type { EmbeddingModelDefinition } from "./catalog/embedding-model-definition.js";
import { resolveActiveEmbeddingModel } from "./catalog/embedding-model-setting.js";
import { CollectionIndexingJob, fingerprintOf, statusFromFingerprints, type CollectionItem } from "./collection-indexing-job.js";
import { EmbeddingModelError } from "./embedding-model-error.js";
import { READY, unavailable, type CollectionIndexStatus, type EmbeddingActiveDisplay, type EmbeddingReadiness } from "./embedding-readiness.js";
import { EmbeddingModelDownloads, type EmbeddingModelFileState } from "./models/embedding-model-downloads.js";
import { EmbeddingModelFiles } from "./models/embedding-model-files.js";
import { selectRelevant, type ScoredItem } from "./relevance.js";
import { EmbeddingModelRunner, type EmbeddingRunner, type EmbeddingRunnerFactory } from "./runtime/embedding-model-runner.js";
import { EmbeddingVectorStore } from "./store/embedding-vector-store.js";

export type { CollectionItem } from "./collection-indexing-job.js";
export type { CollectionIndexStatus, EmbeddingActiveDisplay, EmbeddingReadiness } from "./embedding-readiness.js";
export type { EmbeddingModelFileState } from "./models/embedding-model-downloads.js";
export { EmbeddingModelError, type EmbeddingModelErrorCode } from "./embedding-model-error.js";

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
/** One catalog model for Settings: its facts, its files and, for the active model, what to display. */
export type EmbeddingModelEntry = {
  id: string; displayName: string; languages: readonly string[]; downloadBytes: number;
  file: EmbeddingModelFileState; activeDisplay: EmbeddingActiveDisplay | null;
};
declare const OPAQUE: unique symbol;
/**
 * A collection's current items as fingerprints for one model (`fingerprintItems`): what `collectionStatus` compares
 * with the indexed state. Opaque to consumers, who keep it and pass it back (no item text is kept).
 */
export type ItemFingerprints = { readonly [OPAQUE]: "ItemFingerprints" };
type FingerprintSet = { modelId: string; entries: ReadonlyMap<string, string> };
const fingerprintSet = (fingerprints: ItemFingerprints): FingerprintSet => fingerprints as unknown as FingerprintSet;

/** A nearest item and its similarity to the query; the caller judges what a score means for its collection. */
export type NearestMatch = { id: string; score: number };

/**
 * `nearest`'s answer. `collection` is `notSynced` when the collection has no job in this process (nothing
 * synced it since the start, so there is nothing to ask); the caller decides whether to sync it.
 */
export type EmbeddingNearestResult = { matches: NearestMatch[]; collection: "notSynced" | "synced"; readiness: EmbeddingReadiness };

export type EmbeddingModelsStatus = { activeModelId: string; defaultModelId: string; onDiskBytes: number; models: EmbeddingModelEntry[] };

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
  /** The models Settings lists and downloads (default: the catalog) and the default among them. */
  catalog?: readonly EmbeddingModelDefinition[];
  defaultModelId?: string;
};
type ModelFiles = Pick<EmbeddingModelFiles, "hasAllFiles" | "ensure" | "remove" | "removeIfEmpty" | "diskUsage">;

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
  private readonly downloads: EmbeddingModelDownloads;
  private readonly store: EmbeddingVectorStore;
  private readonly catalog: readonly EmbeddingModelDefinition[];
  private readonly defaultModelId: string;
  private readonly resolveModel: () => EmbeddingModelDefinition;
  private readonly createRunner: EmbeddingRunnerFactory;

  constructor(deps: Dependencies) {
    this.files = deps.files ?? new EmbeddingModelFiles(path.join(deps.rootDir, "models"));
    this.downloads = new EmbeddingModelDownloads(this.files);
    this.catalog = deps.catalog ?? EMBEDDING_MODEL_CATALOG;
    this.defaultModelId = deps.defaultModelId ?? DEFAULT_EMBEDDING_MODEL_ID;
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

  /**
   * The `limit` items nearest to the query among the collection's vectors for their current text, best first, each
   * with its score. It never creates a job, never prepares or downloads a model, and never syncs: with no job it answers
   * `notSynced`; while the model is not ready it answers its readiness with no matches. A worker stopped while idle
   * restarts from disk to embed the query.
   */
  async nearest(collection: string, queryText: string, options: { limit: number }): Promise<EmbeddingNearestResult> {
    const active = this.resolveModel();
    const model = this.model?.definition.id === active.id ? this.model : null;
    const job = model ? this.collections.get(collection) : undefined;
    if (!model || !job) return { matches: [], collection: "notSynced", readiness: { state: "preparing", phase: "loading", done: 0, total: 0 } };
    if (model.phase.kind === "idle" && !this.files.hasAllFiles(active)) {
      return { matches: [], collection: "synced", readiness: unavailable("The embedding model is not downloaded.") };
    }
    const readiness = this.readinessOf(job);
    const fresh = job.freshVectors();
    if (!model.runner || model.phase.kind !== "ready" || !fresh.length) return { matches: [], collection: "synced", readiness };
    let queryVector: Float32Array;
    try {
      [queryVector] = await model.runner.embed("query", [queryText]) as [Float32Array];
    } catch (error) {
      if (this.model === model && model.phase.kind === "ready") this.failModel(model, error);
      return { matches: [], collection: "synced", readiness: unavailable(reasonOf(error)) };
    }
    const matches: NearestMatch[] = fresh.map(({ id, vector }) => ({ id, score: dot(queryVector, vector) }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, Math.max(0, options.limit));
    return { matches, collection: "synced", readiness };
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

  /**
   * Settings' model list, read-only: resolves the active model from the setting without switching to it, and starts
   * no download, load or indexing. Only the file sizes on disk are read.
   */
  async modelsStatus(): Promise<EmbeddingModelsStatus> {
    const active = this.resolveModel();
    return {
      activeModelId: active.id,
      defaultModelId: this.defaultModelId,
      onDiskBytes: await this.files.diskUsage(),
      models: this.catalog.map((definition) => ({
        id: definition.id, displayName: definition.displayName, languages: definition.languages,
        downloadBytes: definition.files.reduce((sum, file) => sum + file.bytes, 0),
        file: this.downloads.fileState(definition),
        activeDisplay: definition.id === active.id ? this.activeDisplay(active) : null,
      })),
    };
  }

  /** The items' fingerprints for the active model (resolved from the setting; no switch, no model work). */
  fingerprintItems(items: readonly CollectionItem[]): ItemFingerprints {
    const active = this.resolveModel();
    const set: FingerprintSet = { modelId: active.id, entries: new Map(items.map((item) => [item.id, fingerprintOf(active.documentPrefix, item.text)])) };
    return set as unknown as ItemFingerprints;
  }

  /** Whether fingerprints were made for the current active model (false after a model switch: read the items again). */
  fingerprintsAreCurrent(fingerprints: ItemFingerprints): boolean {
    return fingerprintSet(fingerprints).modelId === this.resolveModel().id;
  }

  /** Read-only: every file of the active model is on disk and the model is not unavailable (so work needs no download). */
  activeModelOnDisk(): boolean {
    const active = this.resolveModel();
    if (this.model?.definition.id === active.id && this.model.phase.kind === "unavailable") return false;
    return this.files.hasAllFiles(active);
  }

  /**
   * A collection's index state for the active model, computed fresh from the current items' fingerprints. Read-only: no
   * job is created, no model work starts. A job with pending work gives indexing or waiting; otherwise the fingerprints
   * are compared with the job's vectors, or with the stored fingerprints when there is no job (no vectors are read).
   */
  collectionStatus(collection: string, fingerprints: ItemFingerprints): CollectionIndexStatus {
    const active = this.resolveModel();
    const current = this.model?.definition.id === active.id ? this.model : null;
    if (current?.phase.kind === "unavailable") return { state: "unavailable" };
    const { modelId, entries } = fingerprintSet(fingerprints);
    // Made for another model (a switch since they were read): nothing of it is indexed for the active model yet.
    if (modelId !== active.id) return { state: "notIndexed", total: entries.size };
    const job = current ? this.collections.get(collection) : undefined;
    if (job) return job.status(entries);
    const stored = this.store.readFingerprints(collection, active.id);
    return statusFromFingerprints(entries, (id) => stored.get(id));
  }

  /** Prepares the active model now (download if needed, then load), without touching any collection. */
  prepareActiveModel(): void {
    const model = this.activeModel();
    if (model.phase.kind === "idle") this.prepareModel(model);
  }

  /** Downloads a catalog model ahead of time; for the active model this is its (not cancellable) preparation. */
  downloadModel(modelId: string): void {
    const definition = this.catalogModel(modelId);
    if (definition.id === this.resolveModel().id) return this.prepareActiveModel();
    this.downloads.start(definition);
  }

  /** Cancels a download ahead; refused for the active model's preparation. */
  cancelDownload(modelId: string): void {
    const definition = this.catalogModel(modelId);
    if (definition.id === this.resolveModel().id || !this.downloads.cancel(definition.id)) {
      throw new EmbeddingModelError("EMBEDDING_DOWNLOAD_NOT_CANCELLABLE", `There is no download of ${definition.displayName} that can be cancelled.`);
    }
  }

  /** Deletes a downloaded model's files; refused for the active model and while it downloads. */
  async removeModel(modelId: string): Promise<void> {
    const definition = this.catalogModel(modelId);
    if (definition.id === this.resolveModel().id) {
      throw new EmbeddingModelError("EMBEDDING_MODEL_ACTIVE", `${definition.displayName} is the active model and cannot be removed.`);
    }
    if (!(await this.downloads.remove(definition))) {
      throw new EmbeddingModelError("EMBEDDING_MODEL_DOWNLOADING", `${definition.displayName} is downloading; cancel the download first.`);
    }
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
    // A download the previous model's preparation pinned becomes an ordinary (cancellable) download ahead.
    if (this.model) this.downloads.release(this.model.definition.id);
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
    const running = this.downloads.progress(definition.id);
    model.phase = running ? { kind: "downloading", ...running }
      : this.files.hasAllFiles(definition) ? { kind: "loading" }
        : { kind: "downloading", done: 0, total: definition.files.reduce((sum, file) => sum + file.bytes, 0) };
    void (async () => {
      try {
        // The shared download: a download ahead of this model is joined (and can no longer be cancelled).
        const modelDir = await this.downloads.ensure(definition, { cancellable: false, onProgress: (done, total) => {
          if (model.phase.kind === "downloading" || model.phase.kind === "loading") model.phase = { kind: "downloading", done, total };
        } });
        if (this.model !== model) return;
        model.phase = { kind: "loading" };
        this.notify();
        const runner = this.createRunner(definition, modelDir);
        await runner.start();
        if (this.model !== model || model.phase.kind !== "loading") return void runner.stop();
        model.runner = runner;
        model.phase = { kind: "ready" };
        this.removeOtherModelsVectors(definition.id);
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

  /** After a switch completes, only the active model's vectors are kept. Downloaded model files stay until removed. */
  private removeOtherModelsVectors(modelId: string): void {
    try {
      this.store.deleteOtherModels(modelId);
    } catch (error) {
      console.warn("EMBEDDING_OLD_VECTORS_REMOVE_FAILED", { error: reasonOf(error) });
    }
  }

  /** The active model's display state (Terminology table): Preparing only while a download or load runs. */
  private activeDisplay(active: EmbeddingModelDefinition): EmbeddingActiveDisplay {
    const phase = this.model?.definition.id === active.id ? this.model.phase : { kind: "idle" as const };
    if (phase.kind === "unavailable") return { state: "unavailable", reason: phase.reason };
    if (phase.kind === "downloading") return { state: "preparing", phase: "downloading", done: phase.done, total: phase.total };
    if (phase.kind === "loading") return { state: "preparing", phase: "loading", done: 0, total: 0 };
    // A download of this model running outside the index's preparation (e.g. ahead, then made active in Advanced).
    const flight = this.downloads.progress(active.id);
    if (flight) return { state: "preparing", phase: "downloading", ...flight };
    return this.files.hasAllFiles(active) ? { state: "ready" } : { state: "notDownloaded" };
  }

  private catalogModel(modelId: string): EmbeddingModelDefinition {
    const definition = this.catalog.find((model) => model.id === modelId);
    if (!definition) throw new EmbeddingModelError("EMBEDDING_MODEL_UNKNOWN", `Unknown embedding model '${modelId}'.`);
    return definition;
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
