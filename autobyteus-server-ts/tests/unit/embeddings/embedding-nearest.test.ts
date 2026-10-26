import fs from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeEmbeddingIndex, settle } from "../../helpers/fake-embedding-model.js";

// The fake model's vectors count words of concept groups; its relevance: floor 0.5, near-best margin 0.15.
const CARDS = [
  { id: "ddns", text: "docker container image on arm raspberry" },
  { id: "near", text: "docker container image, sidebar panel" },
  { id: "weak", text: "docker sidebar panel menu navigation token usage cost" },
  { id: "none", text: "licence agpl copyleft" },
];
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const make = async (options: Parameters<typeof createFakeEmbeddingIndex>[0] = {}) => {
  const fake = await createFakeEmbeddingIndex(options);
  roots.push(fake.rootDir);
  return fake;
};
const jobs = (index: object) => (index as unknown as { collections: Map<string, unknown> }).collections.size;

describe("EmbeddingIndex.nearest", () => {
  it("answers notSynced without creating a job, preparing a model or downloading when nothing synced the collection", async () => {
    const { index, downloads, runners } = await make({ filesPresent: true });
    expect(await index.nearest("memory-journal-cards", "docker on arm", { limit: 3 })).toEqual({
      matches: [], collection: "notSynced", readiness: { state: "preparing", phase: "loading", done: 0, total: 0 },
    });
    expect(jobs(index)).toBe(0);
    expect(downloads).toEqual([]);
    expect(runners).toEqual([]);
  });

  it("ranks every fresh vector by similarity with its relevance, without the relevance cut", async () => {
    const { index } = await make();
    await settle(index, "cards", CARDS);
    const result = await index.nearest("cards", "docker container on arm raspberry", { limit: 3 });
    expect(result.collection).toBe("synced");
    expect(result.readiness).toEqual({ state: "ready" });
    expect(result.matches.map((match) => [match.id, match.relevance])).toEqual([["ddns", "relevant"], ["near", "aboveFloor"], ["weak", "below"]]);
    expect(result.matches[0]!.score).toBeGreaterThan(result.matches[1]!.score);
    expect((await index.nearest("cards", "docker container on arm raspberry", { limit: 10 })).matches).toHaveLength(4);
  });

  it("answers the model's readiness with no matches while it downloads, and says when its files are not on disk", async () => {
    const held = await make();
    held.holdDownloads();
    held.index.sync("cards", CARDS);
    expect(await held.index.nearest("cards", "docker", { limit: 3 })).toEqual({
      matches: [], collection: "synced", readiness: { state: "preparing", phase: "downloading", done: 1, total: 2 },
    });
    held.releaseDownloads();

    let failure: Error | null = new Error("Could not reach huggingface.co");
    const failed = await make({ failDownload: () => failure });
    failed.index.sync("cards", CARDS);
    for (let i = 0; i < 100 && (await failed.index.nearest("cards", "docker", { limit: 1 })).readiness.state !== "unavailable"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect((await failed.index.nearest("cards", "docker", { limit: 1 })).readiness).toEqual({ state: "unavailable", reason: "Could not reach huggingface.co" });
    // Retried (idle again) but still without files: nearest says so and starts nothing.
    failure = null;
    failed.index.retryModel();
    const downloadsBefore = failed.downloads.length;
    expect(await failed.index.nearest("cards", "docker", { limit: 1 })).toEqual({
      matches: [], collection: "synced", readiness: { state: "unavailable", reason: "The embedding model is not downloaded." },
    });
    expect(failed.downloads).toHaveLength(downloadsBefore);
  });
});
