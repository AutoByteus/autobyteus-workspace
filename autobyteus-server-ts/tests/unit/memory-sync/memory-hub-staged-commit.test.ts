import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalFileMemoryImportStore } from "../../../src/memory-sync/hub/local-file-memory-import-store.js";
import { MemoryHubStagedFileStore } from "../../../src/memory-sync/hub/memory-hub-staged-file-store.js";
import { digestMemorySyncOperations } from "../../../src/memory-sync/hub/memory-sync-batch-identity.js";
import { configureMemorySyncCapability } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import type { MemoryFileOperation, MemorySyncBatch } from "../../../src/memory-sync/shared/memory-sync-types.js";

const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");
const exists = (target: string): Promise<boolean> => fs.stat(target).then(() => true, () => false);

const stagedOp = (relativePath: string, content: string, size = Buffer.byteLength(content)): MemoryFileOperation => ({
  opId: `agents:${relativePath}`, operation: "replace", kind: "agents", relativePath, size, sha256: sha256(content), mtimeMs: 1, contentEncoding: "staged",
});
const inlineOp = (relativePath: string, content: string): MemoryFileOperation => ({
  ...stagedOp(relativePath, content), contentEncoding: "base64", contentBase64: Buffer.from(content).toString("base64"),
});
const batchOf = (batchId: string, operations: MemoryFileOperation[]): MemorySyncBatch => ({
  protocolVersion: 1, batchId, memorySyncSourceId: "src", sourceDisplayName: "Src", sourceEndpoint: null, generatedAt: new Date(0).toISOString(), operations,
});

describe("LocalFileMemoryImportStore with staged operations", () => {
  let memoryDir: string;
  let staged: MemoryHubStagedFileStore;
  let store: LocalFileMemoryImportStore;
  const imported = (relativePath: string) => path.join(memoryDir, "imports", "src", "agents", relativePath);

  beforeEach(async () => {
    configureMemorySyncCapability(true);
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-staged-commit-"));
    const config = { getMemoryDir: () => memoryDir };
    staged = new MemoryHubStagedFileStore(config);
    store = new LocalFileMemoryImportStore(config, staged);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  const stage = (content: string) => staged.appendPiece("src", sha256(content), 0, Buffer.from(content));

  it("commits a staged file next to an inline file and records both", async () => {
    await stage("large content");

    await store.commitBatch(batchOf("b1", [stagedOp("r/large.bin", "large content"), inlineOp("r/small.txt", "small")]));

    expect(await fs.readFile(imported("r/large.bin"), "utf-8")).toBe("large content");
    expect(await fs.readFile(imported("r/small.txt"), "utf-8")).toBe("small");
    const manifest = await store.readManifest("src");
    expect(Object.keys(manifest.files).sort()).toEqual(["agents/r/large.bin", "agents/r/small.txt"]);
    expect(await exists(path.join(memoryDir, "memory-sync-staging", "src", `${sha256("large content")}.partial`))).toBe(false);
  });

  it("places the same content under two runs and records both (AR-001)", async () => {
    await stage("video bytes");

    await store.commitBatch(batchOf("b1", [stagedOp("r1/context_files/v.mp4", "video bytes"), stagedOp("r2/context_files/v.mp4", "video bytes")]));

    expect(await fs.readFile(imported("r1/context_files/v.mp4"), "utf-8")).toBe("video bytes");
    expect(await fs.readFile(imported("r2/context_files/v.mp4"), "utf-8")).toBe("video bytes");
    expect(Object.keys((await store.readManifest("src")).files).sort()).toEqual([
      "agents/r1/context_files/v.mp4", "agents/r2/context_files/v.mp4",
    ]);
  });

  it("refuses the whole batch before any write when one operation cannot be written (AR-001)", async () => {
    await stage("good");
    await stage("short");

    await expect(store.commitBatch(batchOf("b1", [
      inlineOp("r/first.txt", "first"),
      stagedOp("r/good.bin", "good"),
      stagedOp("r/bad.bin", "short", 99),
    ]))).rejects.toThrow("Uploaded file size mismatch for agents/r/bad.bin.");

    expect(await exists(imported("r/first.txt"))).toBe(false);
    expect(await exists(imported("r/good.bin"))).toBe(false);
    expect((await store.readManifest("src")).batchDigests).toEqual({});
  });

  it("names a missing staged file and a corrupted one, and keeps the other staged content for the retry", async () => {
    await stage("kept");
    await staged.appendPiece("src", sha256("expected"), 0, Buffer.from("tampered"));

    await expect(store.commitBatch(batchOf("b1", [stagedOp("r/never.bin", "never uploaded")])))
      .rejects.toThrow("Uploaded file is missing for agents/r/never.bin.");
    await expect(store.commitBatch(batchOf("b2", [stagedOp("r/kept.bin", "kept"), stagedOp("r/tampered.bin", "expected")])))
      .rejects.toThrow("Uploaded file hash mismatch for agents/r/tampered.bin.");

    await store.commitBatch(batchOf("b3", [stagedOp("r/kept.bin", "kept")]));
    expect(await fs.readFile(imported("r/kept.bin"), "utf-8")).toBe("kept");
  });

  it("digests a staged and an inline operation of the same file alike, so batch idempotency is unchanged", () => {
    expect(digestMemorySyncOperations([stagedOp("r/a.txt", "same")])).toBe(digestMemorySyncOperations([inlineOp("r/a.txt", "same")]));
  });
});
