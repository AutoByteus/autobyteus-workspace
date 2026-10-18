import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddingVectorStore } from "../../../src/embeddings/store/embedding-vector-store.js";

describe("EmbeddingVectorStore", () => {
  let root: string, file: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "embedding-store-"));
    file = path.join(root, "embeddings", "embeddings.sqlite");
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("stores vectors per collection and model, replaces them on upsert and removes items and collections", () => {
    const store = new EmbeddingVectorStore(file);
    store.upsert("c1", "m1", [{ id: "a", fingerprint: "f1", vector: Float32Array.from([0.5, -0.25]) }, { id: "b", fingerprint: "f2", vector: Float32Array.from([1, 0]) }]);
    store.upsert("c1", "m1", [{ id: "a", fingerprint: "f3", vector: Float32Array.from([0, 1]) }]);
    store.upsert("c2", "m2", [{ id: "x", fingerprint: "f4", vector: Float32Array.from([1, 1]) }]);
    expect([...store.read("c1", "m1")].map(([id, row]) => [id, row.fingerprint, [...row.vector]]))
      .toEqual([["a", "f3", [0, 1]], ["b", "f2", [1, 0]]]);
    expect(store.read("c1", "m2").size).toBe(0);
    store.remove("c1", ["a"]);
    expect([...store.read("c1", "m1").keys()]).toEqual(["b"]);
    store.deleteOtherModels("m2");
    expect(store.read("c1", "m1").size).toBe(0);
    store.dropCollection("c2");
    expect(store.read("c2", "m2").size).toBe(0);
    store.close();
  });

  it("keeps vectors across reopening", () => {
    const first = new EmbeddingVectorStore(file);
    first.upsert("c1", "m1", [{ id: "a", fingerprint: "f1", vector: Float32Array.from([0.125, 0.5, 0.75]) }]);
    first.close();
    expect([...new EmbeddingVectorStore(file).read("c1", "m1").get("a")!.vector]).toEqual([0.125, 0.5, 0.75]);
  });

  it("sets an unreadable file aside, logs it and starts empty", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "this is not a database");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const store = new EmbeddingVectorStore(file);
    expect(store.read("c1", "m1").size).toBe(0);
    store.close();
    const names = await fs.readdir(path.dirname(file));
    const aside = names.find((name) => name.startsWith("embeddings.sqlite.unreadable-"));
    expect(aside).toBeDefined();
    expect(await fs.readFile(path.join(path.dirname(file), aside!), "utf8")).toBe("this is not a database");
    expect(warn).toHaveBeenCalledWith("EMBEDDING_STORE_UNREADABLE", expect.objectContaining({ file }));
  });

  it("sets a file with another table shape aside", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("CREATE TABLE embedding_vectors (collection TEXT, item_id TEXT, vector BLOB)");
    db.close();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const store = new EmbeddingVectorStore(file);
    store.upsert("c1", "m1", [{ id: "a", fingerprint: "f", vector: Float32Array.from([1]) }]);
    expect(store.read("c1", "m1").size).toBe(1);
    store.close();
    expect((await fs.readdir(path.dirname(file))).some((name) => name.startsWith("embeddings.sqlite.unreadable-"))).toBe(true);
  });

  it("never creates the file for removals", async () => {
    const store = new EmbeddingVectorStore(file);
    store.remove("c1", ["a"]);
    store.dropCollection("c1");
    store.deleteOtherModels("m1");
    await expect(fs.stat(file)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
