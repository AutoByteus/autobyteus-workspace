/**
 * A deterministic stand-in for an embedding model, for tests of the embedding layer and its consumers.
 * A text's vector counts words from a few concept groups (synonyms share a group), so a paraphrase matches without
 * sharing words, the way a real model behaves, while every result stays predictable. Download and loading are
 * instant; tests can hold document batches (`holdDocuments`) and make loading or embedding fail.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { EmbeddingModelDefinition } from "../../src/embeddings/catalog/embedding-model-definition.js";
import { EmbeddingIndex } from "../../src/embeddings/embedding-index.js";
import type { EmbeddingRunner, EmbeddingTextKind } from "../../src/embeddings/runtime/embedding-model-runner.js";

export const CONCEPTS: readonly string[][] = [
  ["sidebar", "panel", "navigation", "menu"],
  ["collapse", "collapsed", "fold", "folded", "hide", "hidden"],
  ["docker", "container", "image"],
  ["arm", "arm64", "raspberry"],
  ["cost", "price", "money", "spend", "spent"],
  ["token", "tokens", "usage"],
  ["licence", "license", "copyleft", "agpl"],
  ["sell", "selling", "commercial", "companies"],
  ["slow", "sluggish", "speed", "faster"],
  ["startup", "launch", "opens", "start"],
];

export const fakeModel = (id = "fake-model-a", overrides: Partial<EmbeddingModelDefinition> = {}): EmbeddingModelDefinition => ({
  id, displayName: `Fake ${id}`, description: "Test model.", licence: "Apache-2.0", languages: ["en"],
  source: { repo: "test/fake", revision: "0" }, files: [], onnxFile: "model.onnx",
  tokenizerFiles: { tokenizer: "tokenizer.json", config: "tokenizer_config.json" }, maxTokens: 512,
  queryPrefix: "", documentPrefix: "", output: "sentence_embedding", dimensions: CONCEPTS.length,
  relevance: { clearMatchFloor: 0.5, nearBestMargin: 0.15 }, ...overrides,
});

/** The concept vector of a text (L2-normalized; a text with no concept word gets the zero vector). */
export const conceptVector = (text: string): Float32Array => {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const vector = Float32Array.from(CONCEPTS, (group) => words.filter((word) => group.includes(word)).length);
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
};

export class FakeEmbeddingRunner implements EmbeddingRunner {
  readonly documents: string[] = [];
  readonly queries: string[] = [];
  started = 0;
  stopped = 0;
  failStart: Error | null = null;
  failEmbed: Error | null = null;
  private held: Array<() => void> | null = null;

  constructor(readonly definition: EmbeddingModelDefinition) {}

  async start(): Promise<void> {
    this.started++;
    if (this.failStart) throw this.failStart;
  }
  async embed(kind: EmbeddingTextKind, texts: readonly string[]): Promise<Float32Array[]> {
    if (this.failEmbed) throw this.failEmbed;
    if (kind === "document") {
      if (this.held) await new Promise<void>((resolve) => this.held!.push(resolve));
      this.documents.push(...texts);
    } else this.queries.push(...texts);
    return texts.map((text) => conceptVector(text));
  }
  async stop(): Promise<void> {
    this.stopped++;
  }
  /** Document batches wait until `release()`; queries are never held. */
  holdDocuments(): void {
    this.held ??= [];
  }
  release(): void {
    const held = this.held ?? [];
    this.held = null;
    for (const resolve of held) resolve();
  }
}

/** An index over a temp folder whose model files "download" instantly; `runners` lists every runner it created. */
export const createFakeEmbeddingIndex = async (options: { model?: () => EmbeddingModelDefinition; rootDir?: string; failDownload?: () => Error | null } = {}) => {
  const rootDir = options.rootDir ?? await fs.mkdtemp(path.join(os.tmpdir(), "embedding-index-"));
  const runners: FakeEmbeddingRunner[] = [];
  const downloads: string[] = [];
  const removedExcept: string[] = [];
  const definition = fakeModel();
  const index = new EmbeddingIndex({
    rootDir,
    resolveModel: options.model ?? (() => definition),
    files: {
      ensure: async (model) => {
        downloads.push(model.id);
        const failure = options.failDownload?.();
        if (failure) throw failure;
        return path.join(rootDir, "models", model.id);
      },
      removeAllExcept: async (modelId) => { removedExcept.push(modelId); },
    },
    createRunner: (model) => {
      const runner = new FakeEmbeddingRunner(model);
      runners.push(runner);
      return runner;
    },
  });
  return { index, rootDir, runners, downloads, removedExcept, runner: () => runners[runners.length - 1]! };
};

/** Resolves after pending microtasks and timers of the fake model (instant) have run. */
export const settle = async (index: EmbeddingIndex, collection: string, items: Array<{ id: string; text: string }>, timeoutMs = 2_000) => {
  const deadline = Date.now() + timeoutMs;
  while (index.sync(collection, items).state !== "ready") {
    if (Date.now() > deadline) throw new Error(`Collection ${collection} did not become ready: ${JSON.stringify(index.sync(collection, items))}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};
