import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { EmbeddingModelDefinition } from "../catalog/embedding-model-definition.js";
import type { EmbeddingTextKind, EmbeddingWorkerData, EmbeddingWorkerMessage, EmbeddingWorkerRequest } from "./embedding-worker.js";

export type { EmbeddingTextKind } from "./embedding-worker.js";

/** What the index needs from a model runtime; tests supply a deterministic fake. */
export interface EmbeddingRunner {
  /** Loads the model; rejects with the reason it cannot be loaded. */
  start(): Promise<void>;
  /** Embeds texts as queries or documents (the model's prefix is applied); restarts a stopped worker. */
  embed(kind: EmbeddingTextKind, texts: readonly string[]): Promise<Float32Array[]>;
  /** Ends the runtime and fails what is still queued. */
  stop(): Promise<void>;
}
export type EmbeddingRunnerFactory = (definition: EmbeddingModelDefinition, modelDir: string) => EmbeddingRunner;

/** A stopped worker returns its WebAssembly memory (≈ 0.3–0.5 GB); the next request starts it again. */
export const EMBEDDING_WORKER_IDLE_STOP_MS = 10 * 60_000;
/** More than 4 WebAssembly threads is not faster (measured); half the cores leaves room for the server. */
export const embeddingWorkerThreads = (): number => Math.min(4, Math.max(1, Math.floor(os.availableParallelism() / 2)));

/** The worker is this module's sibling with the same extension: `.ts` from source (type stripping), `.js` in `dist`. */
const workerUrl = (): URL => new URL(`./embedding-worker${path.extname(new URL(import.meta.url).pathname)}`, import.meta.url);

type Job = {
  kind: EmbeddingTextKind; texts: string[]; vectors: Float32Array[];
  resolve: (vectors: Float32Array[]) => void; reject: (error: Error) => void;
};
type Inflight = { requestId: number; job: Job };

/**
 * Owns one model's worker: start and load, a request queue that serves queries before document batches, idle stop, and
 * failures mapped to rejected requests. The worker gets one text at a time, so a query waits for at most one document
 * inference, never for a whole batch (a batch of a heavy model takes tens of seconds).
 */
export class EmbeddingModelRunner implements EmbeddingRunner {
  private worker: Worker | null = null;
  private starting: Promise<Worker> | null = null;
  private readonly queue: Job[] = [];
  private inflight: Inflight | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private nextId = 1;

  constructor(
    private readonly definition: EmbeddingModelDefinition,
    private readonly modelDir: string,
    private readonly options: { idleStopMs?: number; threads?: number } = {},
  ) {}

  async start(): Promise<void> {
    await this.ensureWorker();
    this.armIdleStop();
  }

  embed(kind: EmbeddingTextKind, texts: readonly string[]): Promise<Float32Array[]> {
    return new Promise((resolve, reject) => {
      if (!texts.length) return resolve([]);
      const job: Job = { kind, texts: [...texts], vectors: [], resolve, reject };
      const firstDocument = this.queue.findIndex((queued) => queued.kind === "document");
      if (kind === "query" && firstDocument >= 0) this.queue.splice(firstDocument, 0, job);
      else this.queue.push(job);
      this.clearIdleStop();
      void this.pump();
    });
  }

  async stop(): Promise<void> {
    this.clearIdleStop();
    const worker = this.worker;
    this.worker = null;
    this.failAll(new Error("The embedding model was stopped."));
    if (worker) await worker.terminate();
  }

  private ensureWorker(): Promise<Worker> {
    if (this.worker) return Promise.resolve(this.worker);
    this.starting ??= new Promise<Worker>((resolve, reject) => {
      const definition = this.definition;
      const onnxDir = path.posix.dirname(definition.onnxFile);
      const workerData: EmbeddingWorkerData = {
        modelDir: this.modelDir,
        onnxFile: definition.onnxFile,
        externalDataFiles: definition.files.map((file) => file.path)
          .filter((file) => file !== definition.onnxFile && path.posix.dirname(file) === onnxDir),
        tokenizerFile: definition.tokenizerFiles.tokenizer,
        tokenizerConfigFile: definition.tokenizerFiles.config,
        maxTokens: definition.maxTokens,
        queryPrefix: definition.queryPrefix,
        documentPrefix: definition.documentPrefix,
        output: definition.output,
        threads: this.options.threads ?? embeddingWorkerThreads(),
      };
      const worker = new Worker(workerUrl(), { workerData });
      // A loaded model never keeps the server process alive.
      worker.unref();
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.starting = null;
        void worker.terminate();
        reject(error);
      };
      worker.on("message", (message: EmbeddingWorkerMessage) => {
        if (!settled) {
          if (message.type === "ready") {
            settled = true;
            this.starting = null;
            this.worker = worker;
            resolve(worker);
          } else if (message.type === "load-failed") fail(new Error(`The embedding model could not be loaded: ${message.error}`));
          return;
        }
        this.onResult(message);
      });
      worker.on("error", (error: Error) => settled ? this.onWorkerGone(worker, error) : fail(error));
      worker.on("exit", (code) => settled
        ? this.onWorkerGone(worker, new Error(`The embedding worker exited (code ${code}).`))
        : fail(new Error(`The embedding worker exited while loading (code ${code}).`)));
    });
    return this.starting;
  }

  private async pump(): Promise<void> {
    const job = this.queue[0];
    if (this.inflight || !job) return;
    const inflight: Inflight = { requestId: this.nextId++, job };
    this.inflight = inflight;
    let worker: Worker;
    try {
      worker = await this.ensureWorker();
    } catch (error) {
      // The model cannot be loaded now: every waiting request fails with the same reason.
      this.failAll(error as Error);
      return;
    }
    if (this.inflight !== inflight) return;
    const text = job.texts[job.vectors.length] as string;
    worker.postMessage({ id: inflight.requestId, kind: job.kind, texts: [text] } satisfies EmbeddingWorkerRequest);
  }

  private onResult(message: EmbeddingWorkerMessage): void {
    const inflight = this.inflight;
    if (!inflight || !("id" in message) || message.id !== inflight.requestId) return;
    this.inflight = null;
    const { job } = inflight;
    if (message.type === "failed") {
      this.queue.splice(this.queue.indexOf(job), 1);
      job.reject(new Error(`The embedding model failed: ${message.error}`));
    } else if (message.type === "vectors") {
      job.vectors.push(...message.vectors);
      if (job.vectors.length === job.texts.length) {
        this.queue.splice(this.queue.indexOf(job), 1);
        job.resolve(job.vectors);
      }
    }
    if (this.queue.length) void this.pump();
    else this.armIdleStop();
  }

  private onWorkerGone(worker: Worker, error: Error): void {
    if (this.worker !== worker) return;
    this.worker = null;
    this.clearIdleStop();
    this.failAll(error);
  }

  private failAll(error: Error): void {
    this.inflight = null;
    for (const job of this.queue.splice(0)) job.reject(error);
  }

  private armIdleStop(): void {
    this.clearIdleStop();
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.inflight || this.queue.length || !this.worker) return;
      const worker = this.worker;
      this.worker = null;
      void worker.terminate();
    }, this.options.idleStopMs ?? EMBEDDING_WORKER_IDLE_STOP_MS);
    this.idleTimer.unref();
  }

  private clearIdleStop(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}
