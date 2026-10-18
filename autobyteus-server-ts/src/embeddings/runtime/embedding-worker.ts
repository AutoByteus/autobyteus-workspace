/**
 * The embedding worker entry (a `worker_thread`). It loads one model with onnxruntime-web (WebAssembly, CPU) and its
 * tokenizer from local files, then answers embed requests one at a time: prefix, tokenize, truncate, run, take the
 * configured output, L2-normalize.
 *
 * It must run as a standalone entry from `src` (Node type stripping) and from `dist`, so it imports only `node:*`,
 * `onnxruntime-web` and `@huggingface/tokenizers`, uses erasable TypeScript only, and has no per-model branches:
 * everything model-specific arrives in `workerData`.
 */
import fs from "node:fs";
import path from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import * as ort from "onnxruntime-web";
import { Tokenizer } from "@huggingface/tokenizers";

export type EmbeddingWorkerOutput = "sentence_embedding" | { pool: "cls" | "mean" | "last" };
export type EmbeddingWorkerData = {
  modelDir: string;
  onnxFile: string;
  /** Files beside the graph that it references as external data (relative to `modelDir`). */
  externalDataFiles: string[];
  tokenizerFile: string;
  tokenizerConfigFile: string;
  maxTokens: number;
  queryPrefix: string;
  documentPrefix: string;
  output: EmbeddingWorkerOutput;
  threads: number;
};
export type EmbeddingTextKind = "query" | "document";
export type EmbeddingWorkerRequest = { id: number; kind: EmbeddingTextKind; texts: string[] };
export type EmbeddingWorkerMessage =
  | { type: "ready" }
  | { type: "load-failed"; error: string }
  | { type: "vectors"; id: number; vectors: Float32Array[] }
  | { type: "failed"; id: number; error: string };

const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);

const normalize = (vector: Float32Array): Float32Array => {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < vector.length; i++) vector[i] = (vector[i] ?? 0) / norm;
  return vector;
};

/** Pools `[1, tokens, dims]` hidden states into one vector. */
const pool = (hidden: ort.Tensor, mode: "cls" | "mean" | "last"): Float32Array => {
  const tokens = Number(hidden.dims[1]);
  const dims = Number(hidden.dims[2]);
  const data = hidden.data as Float32Array;
  if (mode === "cls") return Float32Array.from(data.subarray(0, dims));
  if (mode === "last") return Float32Array.from(data.subarray((tokens - 1) * dims, tokens * dims));
  const vector = new Float32Array(dims);
  for (let t = 0; t < tokens; t++) for (let d = 0; d < dims; d++) vector[d] = (vector[d] ?? 0) + (data[t * dims + d] ?? 0);
  for (let d = 0; d < dims; d++) vector[d] = (vector[d] ?? 0) / tokens;
  return vector;
};

const load = async (config: EmbeddingWorkerData) => {
  ort.env.wasm.numThreads = config.threads;
  const read = (file: string) => fs.readFileSync(path.join(config.modelDir, file));
  const tokenizer = new Tokenizer(JSON.parse(read(config.tokenizerFile).toString("utf8")), JSON.parse(read(config.tokenizerConfigFile).toString("utf8")));
  const session = await ort.InferenceSession.create(read(config.onnxFile), {
    executionProviders: ["wasm"],
    externalData: config.externalDataFiles.map((file) => ({ path: path.basename(file), data: read(file) })),
  });
  return { tokenizer, session };
};

const embedOne = async (loaded: Awaited<ReturnType<typeof load>>, config: EmbeddingWorkerData, text: string): Promise<Float32Array> => {
  const { tokenizer, session } = loaded;
  let ids = tokenizer.encode(text).ids;
  if (ids.length > config.maxTokens) ids = [...ids.slice(0, config.maxTokens - 1), ids[ids.length - 1] as number];
  const n = ids.length;
  const int64 = (values: number[]) => new ort.Tensor("int64", BigInt64Array.from(values, (v) => BigInt(v)), [1, n]);
  const feeds: Record<string, ort.Tensor> = {};
  for (const name of session.inputNames) {
    if (name === "input_ids") feeds[name] = int64(ids);
    else if (name === "attention_mask") feeds[name] = int64(new Array<number>(n).fill(1));
    else if (name === "token_type_ids") feeds[name] = int64(new Array<number>(n).fill(0));
    else if (name === "position_ids") feeds[name] = int64(Array.from({ length: n }, (_, i) => i));
    else {
      // Inputs a text-only embedding does not use (e.g. image/audio features `[items, dim]`) are fed empty.
      const meta = session.inputMetadata.find((m) => m.name === name);
      const dim = meta?.isTensor ? Number(meta.shape[1] ?? 0) || 0 : 0;
      feeds[name] = new ort.Tensor("float32", new Float32Array(0), [0, dim]);
    }
  }
  const outputs = await session.run(feeds);
  const vector = config.output === "sentence_embedding"
    ? Float32Array.from(outputs.sentence_embedding?.data as Float32Array)
    : pool((outputs.last_hidden_state ?? outputs[session.outputNames[0] as string]) as ort.Tensor, config.output.pool);
  return normalize(vector);
};

const run = async () => {
  const port = parentPort;
  if (!port) return;
  const config = workerData as EmbeddingWorkerData;
  let loaded: Awaited<ReturnType<typeof load>>;
  try {
    loaded = await load(config);
  } catch (error) {
    port.postMessage({ type: "load-failed", error: errorText(error) } satisfies EmbeddingWorkerMessage);
    return;
  }
  // Requests are handled one at a time, in arrival order; the runner keeps the queue and its priorities.
  let chain = Promise.resolve();
  port.on("message", (request: EmbeddingWorkerRequest) => {
    chain = chain.then(async () => {
      try {
        const prefix = request.kind === "query" ? config.queryPrefix : config.documentPrefix;
        const vectors: Float32Array[] = [];
        for (const text of request.texts) vectors.push(await embedOne(loaded, config, prefix + text));
        port.postMessage({ type: "vectors", id: request.id, vectors } satisfies EmbeddingWorkerMessage, vectors.map((v) => v.buffer as ArrayBuffer));
      } catch (error) {
        port.postMessage({ type: "failed", id: request.id, error: errorText(error) } satisfies EmbeddingWorkerMessage);
      }
    });
  });
  port.postMessage({ type: "ready" } satisfies EmbeddingWorkerMessage);
};

void run();
