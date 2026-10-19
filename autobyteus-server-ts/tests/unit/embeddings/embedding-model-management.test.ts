import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EmbeddingIndex } from "../../../src/embeddings/embedding-index.js";
import { createFakeEmbeddingIndex, fakeModel, settle } from "../../helpers/fake-embedding-model.js";

const ITEMS = [
  { id: "a", text: "Sidebar collapse state is lost after restart" },
  { id: "b", text: "Docker image fails on ARM servers" },
  { id: "c", text: "Show token usage and cost per conversation" },
];
const MODEL_A = fakeModel("fake-model-a", { files: [{ path: "model.onnx", sha256: "x", bytes: 2 }] });
const MODEL_B = fakeModel("fake-model-b", { displayName: "Fake B", languages: ["multilingual"], files: [{ path: "model.onnx", sha256: "y", bytes: 2 }] });

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const make = async (options: Parameters<typeof createFakeEmbeddingIndex>[0] = {}) => {
  let active = MODEL_A;
  const fake = await createFakeEmbeddingIndex({ catalog: [MODEL_A, MODEL_B], model: () => active, ...options });
  roots.push(fake.rootDir);
  return { ...fake, use: (model: typeof MODEL_A) => { active = model; } };
};
/** The status the search service would serve: the current items' fingerprints, compared fresh. */
const statusOf = (index: EmbeddingIndex, collection: string, items: Array<{ id: string; text: string }>) =>
  index.collectionStatus(collection, index.fingerprintItems(items));
const activeDisplayOf = async (index: EmbeddingIndex) => (await index.modelsStatus()).models.find((model) => model.activeDisplay)!.activeDisplay;
const waitFor = async (check: () => Promise<boolean> | boolean) => {
  for (let tries = 0; tries < 200; tries++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("condition not reached");
};
const codeOf = async (operation: () => unknown) => {
  try {
    await operation();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return null;
};

describe("EmbeddingIndex model management", () => {
  it("reads status without starting anything: no download, load, indexing, job or store (G3, AC-011)", async () => {
    const { index, files, runners, rootDir } = await make();
    const sync = vi.spyOn(index, "sync");
    const search = vi.spyOn(index, "search");
    const prepare = vi.spyOn(index, "prepareActiveModel");
    const activeModel = vi.spyOn(index as unknown as { activeModel: () => unknown }, "activeModel");
    const status = await index.modelsStatus();
    expect(status).toEqual({
      activeModelId: "fake-model-a", defaultModelId: "fake-model-a", onDiskBytes: 0,
      models: [
        { id: "fake-model-a", displayName: "Fake fake-model-a", languages: ["en"], downloadBytes: 2, file: { state: "notDownloaded" }, activeDisplay: { state: "notDownloaded" } },
        { id: "fake-model-b", displayName: "Fake B", languages: ["multilingual"], downloadBytes: 2, file: { state: "notDownloaded" }, activeDisplay: null },
      ],
    });
    expect(statusOf(index, "tasks/p1", ITEMS)).toEqual({ state: "notIndexed", total: 3 });
    expect(statusOf(index, "tasks/empty", [])).toEqual({ state: "ready", total: 0 });
    expect(index.activeModelOnDisk()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 10));
    for (const spy of [sync, search, prepare, activeModel]) expect(spy).not.toHaveBeenCalled();
    expect(files.ensure).not.toHaveBeenCalled();
    expect(runners).toEqual([]);
    expect((index as unknown as { collections: Map<string, unknown> }).collections.size).toBe(0);
    await expect(fs.stat(path.join(rootDir, "embeddings.sqlite"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await activeDisplayOf(index)).toEqual({ state: "notDownloaded" });
  });

  it("downloads the active model on request: Preparing while it downloads, then Ready (AC-011)", async () => {
    const { index, holdDownloads, releaseDownloads, runners } = await make();
    holdDownloads();
    index.downloadModel("fake-model-a");
    expect(await activeDisplayOf(index)).toEqual({ state: "preparing", phase: "downloading", done: 1, total: 2 });
    expect(await codeOf(() => index.cancelDownload("fake-model-a"))).toBe("EMBEDDING_DOWNLOAD_NOT_CANCELLABLE");
    releaseDownloads();
    await waitFor(async () => (await activeDisplayOf(index))?.state === "ready");
    expect(runners).toHaveLength(1);
    expect((await index.modelsStatus()).models[0]!.file).toEqual({ state: "downloaded" });
  });

  it("shows an unavailable model with its reason, and Retry prepares it again at once (AC-012)", async () => {
    let failure: Error | null = new Error("Could not reach huggingface.co");
    const { index, downloads } = await make({ failDownload: () => failure });
    index.prepareActiveModel();
    await waitFor(async () => (await activeDisplayOf(index))?.state === "unavailable");
    expect(await activeDisplayOf(index)).toEqual({ state: "unavailable", reason: "Could not reach huggingface.co" });
    expect(statusOf(index, "tasks/p1", ITEMS)).toEqual({ state: "unavailable" });
    failure = null;
    expect(index.retryModel()).toBe(true);
    index.prepareActiveModel();
    await waitFor(async () => (await activeDisplayOf(index))?.state === "ready");
    expect(downloads).toEqual(["fake-model-a", "fake-model-a"]);
  });

  it("shows Ready after a restart when the active model's files are present, without loading it (AC-013)", async () => {
    const { index, runners, files } = await make({ filesPresent: ["fake-model-a"] });
    expect(await activeDisplayOf(index)).toEqual({ state: "ready" });
    expect((await index.modelsStatus()).onDiskBytes).toBe(1_000_000);
    expect(runners).toEqual([]);
    expect(files.ensure).not.toHaveBeenCalled();
  });

  it("downloads another model ahead, cancels it (deleting its folder), and refuses unknown models", async () => {
    const { index, holdDownloads, removed } = await make();
    holdDownloads();
    index.downloadModel("fake-model-b");
    expect((await index.modelsStatus()).models[1]!.file).toEqual({ state: "downloading", done: 1, total: 2 });
    index.cancelDownload("fake-model-b");
    await waitFor(() => removed.includes("fake-model-b"));
    expect((await index.modelsStatus()).models[1]!.file).toEqual({ state: "notDownloaded" });
    expect(await codeOf(() => index.cancelDownload("fake-model-b"))).toBe("EMBEDDING_DOWNLOAD_NOT_CANCELLABLE");
    expect(await codeOf(() => index.downloadModel("nope"))).toBe("EMBEDDING_MODEL_UNKNOWN");
    expect(await codeOf(() => index.removeModel("nope"))).toBe("EMBEDDING_MODEL_UNKNOWN");
  });

  it("shows a running download of a newly active model as Preparing and no longer lets it be cancelled (R-9)", async () => {
    const { index, holdDownloads, releaseDownloads, use, files } = await make();
    holdDownloads();
    index.downloadModel("fake-model-b");
    use(MODEL_B);
    expect(await activeDisplayOf(index)).toEqual({ state: "preparing", phase: "downloading", done: 1, total: 2 });
    expect(await codeOf(() => index.cancelDownload("fake-model-b"))).toBe("EMBEDDING_DOWNLOAD_NOT_CANCELLABLE");
    index.prepareActiveModel();
    expect(files.ensure).toHaveBeenCalledTimes(1);
    releaseDownloads();
    await waitFor(async () => (await activeDisplayOf(index))?.state === "ready");
  });

  it("refuses to remove the active model or a downloading one, and removes a downloaded one", async () => {
    const { index, holdDownloads, releaseDownloads, removed } = await make({ filesPresent: ["fake-model-a"] });
    expect(await codeOf(() => index.removeModel("fake-model-a"))).toBe("EMBEDDING_MODEL_ACTIVE");
    holdDownloads();
    index.downloadModel("fake-model-b");
    expect(await codeOf(() => index.removeModel("fake-model-b"))).toBe("EMBEDDING_MODEL_DOWNLOADING");
    releaseDownloads();
    await waitFor(async () => (await index.modelsStatus()).models[1]!.file.state === "downloaded");
    await index.removeModel("fake-model-b");
    expect(removed).toEqual(["fake-model-b"]);
    expect((await index.modelsStatus()).models[1]!.file).toEqual({ state: "notDownloaded" });
  });

  it("reports a collection waiting, indexing, ready and needing an update", async () => {
    const { index, holdDownloads, releaseDownloads, runner } = await make();
    holdDownloads();
    index.sync("tasks/p1", ITEMS);
    expect(statusOf(index, "tasks/p1", ITEMS)).toEqual({ state: "waiting", total: 3 });
    releaseDownloads();
    await settle(index, "tasks/p1", ITEMS);
    expect(statusOf(index, "tasks/p1", ITEMS)).toEqual({ state: "ready", total: 3 });
    const edited = [{ id: "a", text: "Docker container crashes on arm64" }, ITEMS[1]!, ITEMS[2]!];
    expect(statusOf(index, "tasks/p1", edited)).toEqual({ state: "needsUpdate", changed: 1, total: 3 });
    expect(statusOf(index, "tasks/p1", [...ITEMS, { id: "d", text: "new" }])).toEqual({ state: "needsUpdate", changed: 1, total: 4 });
    runner().holdDocuments();
    index.sync("tasks/p1", edited);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(statusOf(index, "tasks/p1", edited)).toEqual({ state: "indexing", done: 0, total: 1 });
    runner().release();
    await settle(index, "tasks/p1", edited);
    expect(statusOf(index, "tasks/p1", edited)).toEqual({ state: "ready", total: 3 });
  });

  it("reads a collection's state from the stored fingerprints after a restart", async () => {
    const first = await make({ filesPresent: ["fake-model-a"] });
    await settle(first.index, "tasks/p1", ITEMS);
    await first.index.shutdown();
    const second = await make({ rootDir: first.rootDir, filesPresent: ["fake-model-a"] });
    expect(statusOf(second.index, "tasks/p1", ITEMS)).toEqual({ state: "ready", total: 3 });
    expect(statusOf(second.index, "tasks/p1", ITEMS.slice(0, 2))).toEqual({ state: "ready", total: 2 });
    expect(statusOf(second.index, "tasks/p2", ITEMS)).toEqual({ state: "notIndexed", total: 3 });
    second.use(MODEL_B);
    expect(statusOf(second.index, "tasks/p1", ITEMS)).toEqual({ state: "notIndexed", total: 3 });
    expect(second.runners).toEqual([]);
  });

  it("tells whether the active model is on disk without loading it, and not while it is unavailable", async () => {
    const { index, runners, use } = await make({ filesPresent: ["fake-model-a"] });
    expect(index.activeModelOnDisk()).toBe(true);
    use(MODEL_B);
    expect(index.activeModelOnDisk()).toBe(false);
    expect(runners).toEqual([]);

    const failed = await make({ failDownload: () => new Error("damaged") });
    failed.index.prepareActiveModel();
    await waitFor(async () => (await activeDisplayOf(failed.index))?.state === "unavailable");
    failed.present.add("fake-model-a");
    expect(failed.index.activeModelOnDisk()).toBe(false);
  });

  it("counts fingerprints made for another model as not indexed for the active one, and says they are stale", async () => {
    const { index, use } = await make({ filesPresent: ["fake-model-a"] });
    await settle(index, "tasks/p1", ITEMS);
    const madeForA = index.fingerprintItems(ITEMS);
    expect(index.fingerprintsAreCurrent(madeForA)).toBe(true);
    expect(index.collectionStatus("tasks/p1", madeForA)).toEqual({ state: "ready", total: 3 });
    use(MODEL_B);
    expect(index.fingerprintsAreCurrent(madeForA)).toBe(false);
    expect(index.collectionStatus("tasks/p1", madeForA)).toEqual({ state: "notIndexed", total: 3 });
  });
});
