import { createHash } from "node:crypto";
import type { EmbeddingRunner } from "./runtime/embedding-model-runner.js";
import type { EmbeddingVectorStore, StoredVector, VectorRow } from "./store/embedding-vector-store.js";

/** An item of a collection, supplied by its consumer; the layer never reads product data itself. */
export type CollectionItem = { id: string; text: string };

const BATCH_SIZE = 8;
type CurrentItem = { text: string; fingerprint: string };

/**
 * One collection's index for the active model (owned by `EmbeddingIndex`): the consumer's current item set with each
 * item's fingerprint, the cached vectors, the items still to embed (in the consumer's order) and the background job that
 * embeds them in batches (single flight).
 *
 * Cancellation: `cancel()` (collection drop, model switch) bumps the generation. Before every store write and cache
 * update the job checks that its generation is current and that each item is still pending with the fingerprint it
 * embedded. A batch that finishes after a cancel, a removal or an edit is discarded, never written.
 */
export class CollectionIndexingJob {
  private generation = 0;
  private items = new Map<string, CurrentItem>();
  private pending = new Map<string, CurrentItem>();
  private job: Promise<void> | null = null;

  constructor(
    readonly key: string,
    private readonly model: { id: string; documentPrefix: string },
    private readonly store: EmbeddingVectorStore,
    private readonly vectors: Map<string, StoredVector>,
    private readonly onProgress: () => void,
  ) {}

  /** The fingerprint of the text exactly as embedded (document prefix + text). */
  fingerprint(text: string): string {
    return createHash("sha256").update(this.model.documentPrefix + text).digest("hex");
  }

  /** Takes the complete current item set: removes vectors of absent items and marks missing or changed items pending. */
  sync(items: readonly CollectionItem[]): void {
    const next = new Map(items.map((item) => [item.id, { text: item.text, fingerprint: this.fingerprint(item.text) }]));
    const removed = [...new Set([...this.vectors.keys(), ...this.items.keys()])].filter((id) => !next.has(id));
    if (removed.length) this.remove(removed);
    this.items = next;
    this.pending = new Map([...next].filter(([id, item]) => this.vectors.get(id)?.fingerprint !== item.fingerprint));
  }

  remove(ids: readonly string[]): void {
    this.store.remove(this.key, ids);
    for (const id of ids) {
      this.vectors.delete(id);
      this.items.delete(id);
      this.pending.delete(id);
    }
  }

  /** Vectors made from each current item's current text; stale or missing items are left out. */
  freshVectors(): Array<{ id: string; vector: Float32Array }> {
    return [...this.items].flatMap(([id, item]) => {
      const stored = this.vectors.get(id);
      return stored && stored.fingerprint === item.fingerprint ? [{ id, vector: stored.vector }] : [];
    });
  }

  hasPending(): boolean {
    return this.pending.size > 0;
  }

  progress(): { done: number; total: number } {
    return { done: this.items.size - this.pending.size, total: this.items.size };
  }

  /**
   * Starts embedding the pending items unless a job is running (a running job picks up items added meanwhile).
   * `isCurrent` says whether the runner still belongs to the active, ready model; `onModelFailure` gets runner errors.
   */
  start(runner: EmbeddingRunner, isCurrent: () => boolean, onModelFailure: (error: unknown) => void): void {
    if (this.job || !this.pending.size) return;
    const generation = this.generation;
    const job = this.run(runner, generation, isCurrent, onModelFailure).then((finished) => {
      if (this.job !== job) return;
      this.job = null;
      // Items that became pending after the last batch was taken.
      if (finished) this.start(runner, isCurrent, onModelFailure);
    }).finally(() => this.onProgress());
    this.job = job;
  }

  /** Stops the job: its in-flight batch is discarded when it returns. */
  cancel(): void {
    this.generation++;
    this.job = null;
    this.pending.clear();
  }

  /** Resolves `true` when every pending item was embedded, `false` when it stopped (cancel, model change, failure). */
  private async run(runner: EmbeddingRunner, generation: number, isCurrent: () => boolean, onModelFailure: (error: unknown) => void): Promise<boolean> {
    while (this.generation === generation && isCurrent()) {
      const batch = [...this.pending].slice(0, BATCH_SIZE);
      if (!batch.length) return true;
      let vectors: Float32Array[];
      try {
        vectors = await runner.embed("document", batch.map(([, item]) => item.text));
      } catch (error) {
        if (this.generation === generation && isCurrent()) onModelFailure(error);
        return false;
      }
      if (this.generation !== generation || !isCurrent()) return false;
      const rows: VectorRow[] = batch.flatMap(([id, item], i) => this.pending.get(id)?.fingerprint === item.fingerprint
        ? [{ id, fingerprint: item.fingerprint, vector: vectors[i] as Float32Array }] : []);
      try {
        this.store.upsert(this.key, this.model.id, rows);
      } catch (error) {
        console.warn("EMBEDDING_INDEX_WRITE_FAILED", { collection: this.key, error: error instanceof Error ? error.message : String(error) });
        return false;
      }
      for (const row of rows) {
        this.vectors.set(row.id, { fingerprint: row.fingerprint, vector: row.vector });
        this.pending.delete(row.id);
      }
      this.onProgress();
    }
    return false;
  }
}
