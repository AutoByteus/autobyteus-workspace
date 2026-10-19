/**
 * Meaning-search readiness of the active model for one collection. While downloading, `done`/`total` count bytes;
 * while indexing they count the collection's items that are indexed for their current text.
 */
export type EmbeddingReadiness =
  | { state: "ready" }
  | { state: "preparing"; phase: "downloading" | "loading" | "indexing"; done: number; total: number }
  | { state: "unavailable"; reason: string };

export const READY: EmbeddingReadiness = { state: "ready" };

export const unavailable = (reason: string): EmbeddingReadiness => ({ state: "unavailable", reason });

/**
 * What Settings shows for the active model, derived without starting anything: Preparing only while a download or a
 * load actually runs; Ready when its files are on disk and nothing failed (loaded or not); Not downloaded otherwise.
 */
export type EmbeddingActiveDisplay =
  | { state: "ready" }
  | { state: "preparing"; phase: "downloading" | "loading"; done: number; total: number }
  | { state: "notDownloaded" }
  | { state: "unavailable"; reason: string };

/**
 * A collection's index for the active model, read without scheduling anything. `waiting`: items to embed but no batch
 * running (the model is not ready yet). `indexing`: `done` of `total` items of the current run (all items, or the
 * changed ones). `needsUpdate`: `changed` items missing or embedded from older text. A collection with no items is
 * `ready` with `total` 0.
 */
export type CollectionIndexStatus =
  | { state: "notIndexed"; total: number }
  | { state: "waiting"; total: number }
  | { state: "indexing"; done: number; total: number }
  | { state: "ready"; total: number }
  | { state: "needsUpdate"; changed: number; total: number }
  | { state: "unavailable" };
