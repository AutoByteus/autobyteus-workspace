import { describe, expect, it } from "vitest";
import { EmbeddingModelDownloads } from "../../../src/embeddings/models/embedding-model-downloads.js";
import { EmbeddingDownloadCancelled } from "../../../src/embeddings/models/embedding-model-files.js";
import { fakeModel } from "../../helpers/fake-embedding-model.js";

const model = fakeModel("model-b", { files: [{ path: "model.onnx", sha256: "x", bytes: 100 }] });

/** Model files whose downloads wait until `finish(id)` / `fail(id, error)`; an abort rejects them as cancelled. */
const controllableFiles = () => {
  const present = new Set<string>();
  const removed: string[] = [];
  const pending = new Map<string, { resolve: () => void; reject: (error: Error) => void; progress: (done: number, total: number) => void }>();
  let calls = 0;
  return {
    present, removed, pending,
    calls: () => calls,
    files: {
      hasAllFiles: (definition: { id: string }) => present.has(definition.id),
      ensure: (definition: { id: string }, onProgress: (done: number, total: number) => void = () => undefined, signal?: AbortSignal) => {
        calls++;
        return new Promise<string>((resolve, reject) => {
          signal?.addEventListener("abort", () => reject(new EmbeddingDownloadCancelled()), { once: true });
          pending.set(definition.id, {
            resolve: () => { present.add(definition.id); resolve(`/models/${definition.id}`); },
            reject, progress: onProgress,
          });
        });
      },
      remove: async (definition: { id: string }) => { removed.push(definition.id); present.delete(definition.id); },
    },
  };
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("EmbeddingModelDownloads", () => {
  it("reports a download's byte progress while it runs and downloaded once its files are present", async () => {
    const fake = controllableFiles();
    const downloads = new EmbeddingModelDownloads(fake.files);
    expect(downloads.fileState(model)).toEqual({ state: "notDownloaded" });
    downloads.start(model);
    expect(downloads.fileState(model)).toEqual({ state: "downloading", done: 0, total: 100 });
    fake.pending.get("model-b")!.progress(40, 100);
    expect(downloads.fileState(model)).toEqual({ state: "downloading", done: 40, total: 100 });
    expect(downloads.isRunning("model-b")).toBe(true);
    fake.pending.get("model-b")!.resolve();
    await flush();
    expect(downloads.fileState(model)).toEqual({ state: "downloaded" });
    expect(downloads.isRunning("model-b")).toBe(false);
  });

  it("cancels a download ahead: the folder is deleted and the model is not downloaded again", async () => {
    const fake = controllableFiles();
    const downloads = new EmbeddingModelDownloads(fake.files);
    downloads.start(model);
    expect(downloads.cancel("model-b")).toBe(true);
    expect(downloads.cancel("model-b")).toBe(false);
    await flush();
    expect(fake.removed).toEqual(["model-b"]);
    expect(downloads.fileState(model)).toEqual({ state: "notDownloaded" });
    expect(downloads.cancel("model-b")).toBe(false);
  });

  it("records a failed download's reason until the next attempt", async () => {
    const fake = controllableFiles();
    const downloads = new EmbeddingModelDownloads(fake.files);
    downloads.start(model);
    fake.pending.get("model-b")!.reject(new Error("Could not reach huggingface.co"));
    await flush();
    expect(downloads.fileState(model)).toEqual({ state: "failed", reason: "Could not reach huggingface.co" });
    downloads.start(model);
    expect(downloads.fileState(model)).toMatchObject({ state: "downloading" });
  });

  it("shares one flight: the active model's preparation joins a download ahead (hearing its progress so far) and pins it until released", async () => {
    const fake = controllableFiles();
    const downloads = new EmbeddingModelDownloads(fake.files);
    downloads.start(model);
    fake.pending.get("model-b")!.progress(30, 100);
    const progress: number[] = [];
    const joined = downloads.ensure(model, { cancellable: false, onProgress: (done) => progress.push(done) });
    expect(fake.calls()).toBe(1);
    fake.pending.get("model-b")!.progress(70, 100);
    // The joining listener first hears the bytes that already arrived.
    expect(progress).toEqual([30, 70]);
    expect(downloads.cancel("model-b")).toBe(false);
    downloads.release("model-b");
    expect(downloads.cancel("model-b")).toBe(true);
    await expect(joined).rejects.toBeInstanceOf(EmbeddingDownloadCancelled);
  });

  it("refuses to remove a model while it downloads, and removes it (clearing a failure) otherwise", async () => {
    const fake = controllableFiles();
    const downloads = new EmbeddingModelDownloads(fake.files);
    downloads.start(model);
    expect(await downloads.remove(model)).toBe(false);
    expect(fake.removed).toEqual([]);
    fake.pending.get("model-b")!.reject(new Error("disk full"));
    await flush();
    expect(await downloads.remove(model)).toBe(true);
    expect(fake.removed).toEqual(["model-b"]);
    expect(downloads.fileState(model)).toEqual({ state: "notDownloaded" });
  });

  it("starts afresh after a cancelled flight has cleaned up", async () => {
    const fake = controllableFiles();
    const downloads = new EmbeddingModelDownloads(fake.files);
    downloads.start(model);
    downloads.cancel("model-b");
    const again = downloads.ensure(model, { cancellable: true });
    await flush();
    expect(fake.removed).toEqual(["model-b"]);
    expect(fake.calls()).toBe(2);
    fake.pending.get("model-b")!.resolve();
    await expect(again).resolves.toBe("/models/model-b");
  });
});
