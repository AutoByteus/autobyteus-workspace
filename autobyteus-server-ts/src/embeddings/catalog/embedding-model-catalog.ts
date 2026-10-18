import type { EmbeddingModelDefinition } from "./embedding-model-definition.js";

/*
 * The supported embedding models (approved catalog, DEC-002). Every file is pinned to a repository commit and checked
 * by size and SHA-256 after download. All three are Apache-2.0 and are downloaded by the server on first use, never
 * shipped with the app.
 *
 * Relevance calibration (`clearMatchFloor`, `nearBestMargin`) follows model-evaluation-report.md §4: the margin covers
 * about the p95 of "best score minus the target's score" over paraphrased queries, and the floor separates the best
 * score of on-topic queries from that of unrelated ones. Each entry was verified on this production stack with the
 * synthetic fixture (tests/fixtures/project-task-search: 60 Tasks, 63 paraphrases, 24 unrelated queries; gated test
 * tests/integration/embeddings/embedding-model-quality.integration.test.ts) and cross-checked with the design probes on
 * real Tasks (69 paraphrases, 8 unrelated queries). The default model is also verified on two 1,000-Task backlogs (the
 * fixture plus 940 generated Tasks, and plus 940 Task-like texts from this repository's finished tickets; same gated
 * test, `TEST_EMBEDDING_SCALE=1`): AC-001 (target shown among the first 5 matches) and AC-004 (unrelated query shows no
 * match) must hold for at least 90% there too (DEC-011). Per entry below: synthetic on-topic best-score minimum /
 * unrelated maximum; real on-topic minimum / unrelated maximum; then the 1,000-Task results (shown in first 5 /
 * unrelated with no match) for the generated and the repository backlogs (FO-001 evidence).
 */

const LEAF_IR: EmbeddingModelDefinition = {
  id: "mdbr-leaf-ir",
  displayName: "MongoDB LEAF-IR",
  description: "English; for small Projects. About 23 MB to download and the fastest to index (about 0.1 s per Task on a fast laptop CPU), but its relevance degrades on large Projects (hundreds of Tasks): unrelated searches start to show matches.",
  licence: "Apache-2.0",
  languages: ["en"],
  source: { repo: "MongoDB/mdbr-leaf-ir", revision: "4262131b32c3182bd06e67e92ae69d7bd66e0c5c" },
  files: [
    { path: "onnx/model_quantized.onnx", sha256: "8c08cb4ecc00bad721b117a85738c537ceb9b85b3eedc52d9c6906fddaa55718", bytes: 220_597 },
    { path: "onnx/model_quantized.onnx_data", sha256: "e77ea96a124230e23e5bac8e26c3ffe5410154973d8635673fa0220b06c13f8b", bytes: 22_954_752 },
    { path: "tokenizer.json", sha256: "da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0", bytes: 711_661 },
    { path: "tokenizer_config.json", sha256: "46ac231e9b955a8af80fc7f23a0ecc65b524f1df84a02c2c82cbca354fb207b4", bytes: 1_529 },
  ],
  onnxFile: "onnx/model_quantized.onnx",
  tokenizerFiles: { tokenizer: "tokenizer.json", config: "tokenizer_config.json" },
  maxTokens: 512,
  queryPrefix: "Represent this sentence for searching relevant passages: ",
  documentPrefix: "",
  output: "sentence_embedding",
  dimensions: 768,
  // Synthetic 0.208 / 0.273, real 0.210 / 0.177; gap p95 0.031 synthetic, 0.043 real. No floor/margin passes both AC-001
  // and AC-004 at 1,000 Tasks (FO-001); 0.30 is the best compromise: fixture 95.2% / 95.8%, generated 87.3% / 91.7%,
  // repository 90.5% / 83.3%. Hence not the default.
  relevance: { clearMatchFloor: 0.3, nearBestMargin: 0.045 },
};

const GRANITE_SMALL_ENGLISH_R2: EmbeddingModelDefinition = {
  id: "granite-embedding-small-english-r2",
  displayName: "IBM Granite Embedding Small English R2",
  description: "Default. English; reads up to 1,024 tokens of a Task and keeps its relevance on large Projects. About 55 MB to download; about 0.5 s per Task to index on a fast laptop CPU.",
  licence: "Apache-2.0",
  languages: ["en"],
  source: { repo: "onnx-community/granite-embedding-small-english-r2-ONNX", revision: "1dc7835ba0cb9c76a3618d0bf0c427c97671b3c8" },
  files: [
    { path: "onnx/model_quantized.onnx", sha256: "a3fad524afc3f060216a8ddbb1ac89c9b6498fba8995b5718bde879076a2e9ba", bytes: 598_902 },
    { path: "onnx/model_quantized.onnx_data", sha256: "1f4cf47e4adec7f7ae09db03d071ba8667e07f9a4203142c7efa8d37fe453597", bytes: 51_885_568 },
    { path: "tokenizer.json", sha256: "feeb83348dcb033bc6b9d2e1f7906ca9eb2d122845000c9416d894d7c2927149", bytes: 2_128_614 },
    { path: "tokenizer_config.json", sha256: "ce06781b38bb393db68c9e0709bddd31ef5d88f2c6fbb3fd9f369778fb85e451", bytes: 20_839 },
  ],
  onnxFile: "onnx/model_quantized.onnx",
  tokenizerFiles: { tokenizer: "tokenizer.json", config: "tokenizer_config.json" },
  maxTokens: 1024,
  queryPrefix: "",
  documentPrefix: "",
  output: { pool: "cls" },
  dimensions: 384,
  // Synthetic 0.741 / 0.754, real 0.786 / 0.773; gap max 0.018 synthetic, p95 0.017 real.
  // 1,000 Tasks (FO-001): generated 93.7% / 95.8%, repository 92.1% / 95.8% (fixture 96.8% / 95.8%).
  relevance: { clearMatchFloor: 0.78, nearBestMargin: 0.02 },
};

const EMBEDDINGGEMMA_2: EmbeddingModelDefinition = {
  id: "embeddinggemma-2",
  displayName: "Google EmbeddingGemma 2",
  description: "Multilingual (100+ languages). Heavy: about 346 MB to download, about 4 s per Task to index and up to 1.5 GB of memory while indexing.",
  licence: "Apache-2.0",
  languages: ["multilingual"],
  source: { repo: "onnx-community/embeddinggemma-2-ONNX", revision: "daa72c51243991dfcaf9f9137d2c573d8f7790c0" },
  files: [
    { path: "onnx/model_quantized.onnx", sha256: "d06edd601f851c633a2519304cbeb8dc6170d7ceb61b436625c17fb9b6e74953", bytes: 495_165 },
    { path: "onnx/model_quantized.onnx_data", sha256: "278a7ff1248c3618e4bd11a607fc54f7bdc7778854230f3956d3f86bd9db4f3b", bytes: 313_724_928 },
    { path: "tokenizer.json", sha256: "4d777ef5bdc1aa36227abdfb77c3e49e7b9c892d16e1b6bda41c393504828be4", bytes: 32_170_510 },
    { path: "tokenizer_config.json", sha256: "17bd5d6e9364ca49a534e1502076593317c298d4a663623091ed45388f004874", bytes: 1_599 },
  ],
  onnxFile: "onnx/model_quantized.onnx",
  tokenizerFiles: { tokenizer: "tokenizer.json", config: "tokenizer_config.json" },
  maxTokens: 1024,
  queryPrefix: "task: search result | query: ",
  documentPrefix: "title: none | text: ",
  output: "sentence_embedding",
  dimensions: 768,
  // Synthetic 0.670 / 0.642, real 0.673 / 0.693 (the real sets overlap: 98.7% separable); gap p95 0 synthetic, 0.018 real.
  relevance: { clearMatchFloor: 0.68, nearBestMargin: 0.02 },
};

/** The default first: the setting description and error messages list the models in this order. */
export const EMBEDDING_MODEL_CATALOG: readonly EmbeddingModelDefinition[] = [GRANITE_SMALL_ENGLISH_R2, LEAF_IR, EMBEDDINGGEMMA_2];
export const DEFAULT_EMBEDDING_MODEL_ID = GRANITE_SMALL_ENGLISH_R2.id;
export const EMBEDDING_MODEL_IDS: readonly string[] = EMBEDDING_MODEL_CATALOG.map((model) => model.id);

export const getEmbeddingModelDefinition = (id: string): EmbeddingModelDefinition | null =>
  EMBEDDING_MODEL_CATALOG.find((model) => model.id === id) ?? null;
