export type EmbeddingModelErrorCode =
  | "EMBEDDING_MODEL_UNKNOWN"
  | "EMBEDDING_MODEL_ACTIVE"
  | "EMBEDDING_MODEL_DOWNLOADING"
  | "EMBEDDING_DOWNLOAD_NOT_CANCELLABLE";

/** A model-management request the embedding layer refuses (unknown model, or not allowed in the model's state). */
export class EmbeddingModelError extends Error {
  constructor(readonly code: EmbeddingModelErrorCode, message: string) {
    super(message);
    this.name = "EmbeddingModelError";
  }
}
