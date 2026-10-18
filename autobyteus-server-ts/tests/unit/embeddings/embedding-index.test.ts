import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeEmbeddingIndex, fakeModel, settle } from "../../helpers/fake-embedding-model.js";

const ITEMS = [
  { id: "a", text: "Sidebar collapse state is lost after restart" },
  { id: "b", text: "Docker image fails on ARM servers" },
  { id: "c", text: "Show token usage and cost per conversation" },
];
const rowsOf = (rootDir: string) => {
  const db = new DatabaseSync(path.join(rootDir, "embeddings.sqlite"));
  try {
    return db.prepare("SELECT collection, item_id, model_id FROM embedding_vectors ORDER BY collection, item_id").all() as Array<Record<string, string>>;
  } finally { db.close(); }
};
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const make = async (options: Parameters<typeof createFakeEmbeddingIndex>[0] = {}) => {
  const fake = await createFakeEmbeddingIndex(options);
  roots.push(fake.rootDir);
  return fake;
};

describe("EmbeddingIndex", () => {
  it("prepares the model on first use, indexes in the background and then answers meaning matches best-first", async () => {
    const { index, runner, downloads } = await make();
    const first = await index.search("tasks/p1", ITEMS, "the folded panel is forgotten");
    expect(first.matches).toEqual([]);
    expect(first.readiness).toMatchObject({ state: "preparing" });
    await settle(index, "tasks/p1", ITEMS);
    const result = await index.search("tasks/p1", ITEMS, "the folded panel is forgotten", { scoreIds: ["b", "a"] });
    expect(result.readiness).toEqual({ state: "ready" });
    expect(result.matches.map((match) => match.id)).toEqual(["a"]);
    expect(Object.keys(result.scores).sort()).toEqual(["a", "b"]);
    expect(result.scores.a).toBeGreaterThan(result.scores.b!);
    expect(downloads).toEqual(["fake-model-a"]);
    expect(runner().documents).toHaveLength(3);
  });

  it("shows no meaning match when even the best score is below the model's floor", async () => {
    const { index } = await make();
    await settle(index, "tasks/p1", ITEMS);
    expect((await index.search("tasks/p1", ITEMS, "recipe for banana bread")).matches).toEqual([]);
  });

  it("never ranks an edited item by its old text, re-indexes it, and removes absent items", async () => {
    const { index, runner, rootDir } = await make();
    await settle(index, "tasks/p1", ITEMS);
    const edited = [{ id: "a", text: "Docker container crashes on arm64" }, ITEMS[1]!, ITEMS[2]!];
    runner().holdDocuments();
    const during = await index.search("tasks/p1", edited, "folded sidebar panel");
    expect(during.matches.map((match) => match.id)).not.toContain("a");
    expect(during.readiness).toEqual({ state: "preparing", phase: "indexing", done: 2, total: 3 });
    runner().release();
    await settle(index, "tasks/p1", edited);
    expect((await index.search("tasks/p1", edited, "container on raspberry")).matches[0]?.id).toBe("a");
    await index.search("tasks/p1", edited.slice(1), "container");
    expect(rowsOf(rootDir).map((row) => row.item_id)).toEqual(["b", "c"]);
  });

  it("discards a batch that finishes after its items or collection were removed (never writes late)", async () => {
    const { index, runner, rootDir } = await make();
    await index.search("tasks/p1", ITEMS, "x");
    await settle(index, "tasks/other", [{ id: "z", text: "docker" }]);
    runner().holdDocuments();
    await index.search("tasks/p2", ITEMS, "x");
    index.removeItems("tasks/p2", ["a"]);
    index.dropCollection("tasks/p1");
    runner().release();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(rowsOf(rootDir).filter((row) => row.collection !== "tasks/other").map((row) => `${row.collection}:${row.item_id}`))
      .toEqual(["tasks/p2:b", "tasks/p2:c"]);
    index.dropCollection("tasks/p2");
    expect(rowsOf(rootDir).map((row) => row.collection)).toEqual(["tasks/other"]);
  });

  it("keeps vectors across a restart: unchanged items are not embedded again, changed ones are", async () => {
    const first = await make();
    await settle(first.index, "tasks/p1", ITEMS);
    await first.index.shutdown();
    const second = await make({ rootDir: first.rootDir });
    const changed = [ITEMS[0]!, ITEMS[1]!, { id: "c", text: "What did this chat cost in tokens" }];
    await settle(second.index, "tasks/p1", changed);
    expect(second.runner().documents).toEqual(["What did this chat cost in tokens"]);
  });

  it("switches models without mixing vectors, rebuilds, and keeps only the active model's rows and files", async () => {
    let active = fakeModel("fake-model-a");
    const { index, rootDir, runners, removedExcept } = await make({ model: () => active });
    await settle(index, "tasks/p1", ITEMS);
    active = fakeModel("fake-model-b");
    const switched = await index.search("tasks/p1", ITEMS, "docker");
    expect(switched.matches).toEqual([]);
    expect(switched.readiness.state).toBe("preparing");
    expect(runners[0]!.stopped).toBe(1);
    await settle(index, "tasks/p1", ITEMS);
    expect(runners[1]!.documents).toHaveLength(3);
    expect(new Set(rowsOf(rootDir).map((row) => row.model_id))).toEqual(new Set(["fake-model-b"]));
    expect(removedExcept).toEqual(["fake-model-a", "fake-model-b"]);
    expect(index.modelStatus()).toEqual({ activeModelId: "fake-model-b", state: "ready" });
  });

  it("reports an unavailable model with its reason, does not retry by itself, and retries after retryModel()", async () => {
    let failure: Error | null = new Error("Could not reach huggingface.co");
    const { index, downloads } = await make({ failDownload: () => failure });
    await index.search("tasks/p1", ITEMS, "docker");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const result = await index.search("tasks/p1", ITEMS, "docker");
    expect(result.readiness).toEqual({ state: "unavailable", reason: "Could not reach huggingface.co" });
    expect(downloads).toHaveLength(1);
    failure = null;
    expect(index.retryModel()).toBe(true);
    expect(index.retryModel()).toBe(false);
    await settle(index, "tasks/p1", ITEMS);
    expect(downloads).toHaveLength(2);
  });

  it("marks the model unavailable when embedding fails", async () => {
    const { index, runner } = await make();
    await settle(index, "tasks/p1", ITEMS);
    runner().failEmbed = new Error("wasm out of memory");
    const result = await index.search("tasks/p1", ITEMS, "docker");
    expect(result).toEqual({ matches: [], scores: {}, readiness: { state: "unavailable", reason: "wasm out of memory" } });
    expect(index.modelStatus()).toMatchObject({ state: "unavailable", reason: "wasm out of memory" });
  });

  it("waits up to waitForReadyMs for the collection, then answers with meaning matches", async () => {
    const { index } = await make();
    const result = await index.search("tasks/p1", ITEMS, "container on raspberry", { waitForReadyMs: 2_000 });
    expect(result.readiness).toEqual({ state: "ready" });
    expect(result.matches[0]?.id).toBe("b");
  });

  it("serves a second, unrelated collection through the same layer (AC-013)", async () => {
    const { index } = await make();
    const notes = [{ id: "n1", text: "Price of the cloud plan" }, { id: "n2", text: "Launch checklist" }];
    await settle(index, "test-notes/all", notes);
    await settle(index, "tasks/p1", ITEMS);
    expect((await index.search("test-notes/all", notes, "cost of tokens")).matches.map((match) => match.id)).toEqual(["n1"]);
    expect((await index.search("tasks/p1", ITEMS, "cost of tokens")).matches.map((match) => match.id)).toEqual(["c"]);
  });

  it("does not create the store for removals when nothing was ever indexed", async () => {
    const { index, rootDir } = await make();
    index.removeItems("tasks/p1", ["a"]);
    index.dropCollection("tasks/p1");
    await expect(fs.stat(path.join(rootDir, "embeddings.sqlite"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
