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
