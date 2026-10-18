/** One file of a model at its pinned revision: the single download and verification list. */
export type EmbeddingModelFile = {
  /** Path inside the repository at the pinned revision, e.g. `onnx/model_quantized.onnx`. */
  path: string;
  sha256: string;
  bytes: number;
};

/** How a vector is taken from the graph: its `sentence_embedding` output, or pooled from its first output. */
export type EmbeddingModelOutput = "sentence_embedding" | { pool: "cls" | "mean" | "last" };

/**
 * Everything model-specific, as data: where the files come from, how text is prepared, which output is used and
 * how relevant a score is for this model. The worker and the index have no per-model branches.
 */
export type EmbeddingModelDefinition = {
  /** Product name, used as the setting value and the `model_id` of stored vectors. */
  id: string;
  displayName: string;
  /** Operator-facing summary: language, download size and indexing cost. */
  description: string;
  licence: string;
  languages: readonly string[];
  /** Hugging Face repository and pinned commit; files are downloaded from `<repo>/resolve/<revision>/<path>`. */
  source: { repo: string; revision: string };
  files: readonly EmbeddingModelFile[];
  /** The ONNX graph among `files`; the other files in its folder are its external data. */
  onnxFile: string;
  tokenizerFiles: { tokenizer: string; config: string };
  /** Longer inputs keep their first `maxTokens - 1` tokens and their final token. */
  maxTokens: number;
  queryPrefix: string;
  documentPrefix: string;
  output: EmbeddingModelOutput;
  dimensions: number;
  /**
   * Model-specific score scale: a query has meaning matches only when its best score reaches `clearMatchFloor`;
   * then every item within `nearBestMargin` of the best one matches.
   */
  relevance: EmbeddingRelevanceCalibration;
};

export type EmbeddingRelevanceCalibration = { clearMatchFloor: number; nearBestMargin: number };
