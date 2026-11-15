import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryHubStagedFileStore,
  MemoryStagedFileOffsetMismatchError,
  MemoryStagedFileVerificationError,
} from "../../../src/memory-sync/hub/memory-hub-staged-file-store.js";
import { configureMemorySyncCapability, MemorySyncNotMigratedError } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import { withFilePathLock } from "../../../src/persistence/file/store-utils.js";

const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");
const exists = (target: string): Promise<boolean> => fs.stat(target).then(() => true, () => false);

describe("MemoryHubStagedFileStore", () => {
  let memoryDir: string;
  let store: MemoryHubStagedFileStore;

  beforeEach(async () => {
    configureMemorySyncCapability(true);
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-staged-store-"));
    store = new MemoryHubStagedFileStore({ getMemoryDir: () => memoryDir });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  const stagedPath = (source: string, content: string) => path.join(memoryDir, "memory-sync-staging", source, `${sha256(content)}.partial`);

  it("appends pieces only at the current length and reports the length on a conflict", async () => {
    const sha = sha256("hello world");

    expect(await store.receivedBytes("src", sha)).toBe(0);
    expect(await store.appendPiece("src", sha, 0, Buffer.from("hello "))).toBe(6);
    await expect(store.appendPiece("src", sha, 0, Buffer.from("again"))).rejects.toMatchObject({
      name: MemoryStagedFileOffsetMismatchError.name,
      receivedBytes: 6,
    });
    expect(await store.appendPiece("src", sha, 6, Buffer.from("world"))).toBe(11);
    expect(await store.receivedBytes("src", sha)).toBe(11);
  });

  it("keeps staged content outside imports/ (AC-009) and refuses a malformed SHA-256", async () => {
    await store.appendPiece("src", sha256("x"), 0, Buffer.from("x"));

    expect(await exists(stagedPath("src", "x"))).toBe(true);
    expect(await exists(path.join(memoryDir, "imports"))).toBe(false);
    await expect(store.receivedBytes("src", "../escape")).rejects.toThrow("sha256 must be 64 lowercase hex characters.");
  });

  it("verifies size and SHA-256 and removes a staged file that fails", async () => {
    await store.appendPiece("src", sha256("content"), 0, Buffer.from("content"));
    await expect(store.verifyStagedFile("src", sha256("content"), 7)).resolves.toBeUndefined();

    await expect(store.verifyStagedFile("src", sha256("content"), 8)).rejects.toThrow("Uploaded file size mismatch");
    expect(await exists(stagedPath("src", "content"))).toBe(false);

    await store.appendPiece("src", sha256("expected"), 0, Buffer.from("tampered"));
    await expect(store.verifyStagedFile("src", sha256("expected"), 8)).rejects.toThrow(MemoryStagedFileVerificationError);
    expect(await exists(stagedPath("src", "expected"))).toBe(false);
    await expect(store.verifyStagedFile("src", sha256("expected"), 8)).rejects.toThrow("Uploaded file is missing");
  });

  it("places one content at several targets; no target is visible before its complete content is renamed in (AR-007)", async () => {
    await store.appendPiece("src", sha256("video"), 0, Buffer.from("video"));
    const first = path.join(memoryDir, "imports", "src", "agents", "r1", "v.mp4");
    const second = path.join(memoryDir, "imports", "src", "agents", "r2", "v.mp4");
    const seenDuringCopy: { target: boolean; temp: string[] } = { target: true, temp: [] };
    const realCopy = fs.copyFile.bind(fs);
    vi.spyOn(fs, "copyFile").mockImplementation(async (from, to, mode) => {
      await realCopy(from, to, mode);
      seenDuringCopy.target = await exists(first);
      seenDuringCopy.temp = (await fs.readdir(path.dirname(first))).filter((name) => name.endsWith(".tmp"));
    });

    await store.placeStagedFile("src", sha256("video"), [first, second]);

    expect(seenDuringCopy.target).toBe(false);
    expect(seenDuringCopy.temp).toHaveLength(1);
    expect(await fs.readFile(first, "utf-8")).toBe("video");
    expect(await fs.readFile(second, "utf-8")).toBe("video");
    expect(await exists(stagedPath("src", "video"))).toBe(false);
    expect((await fs.readdir(path.dirname(first))).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("sweeps partials of every source untouched for 24 h, keeps fresh ones, and removes an emptied folder", async () => {
    await store.appendPiece("quiet", sha256("old"), 0, Buffer.from("old"));
    await store.appendPiece("busy", sha256("old2"), 0, Buffer.from("old2"));
    await store.appendPiece("busy", sha256("fresh"), 0, Buffer.from("fresh"));
    const longAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await fs.utimes(stagedPath("quiet", "old"), longAgo, longAgo);
    await fs.utimes(stagedPath("busy", "old2"), longAgo, longAgo);

    await store.sweepStale();

    expect(await exists(path.join(memoryDir, "memory-sync-staging", "quiet"))).toBe(false);
    expect(await exists(stagedPath("busy", "old2"))).toBe(false);
    expect(await exists(stagedPath("busy", "fresh"))).toBe(true);
    expect(await exists(path.join(memoryDir, "imports"))).toBe(false);
  });

  it("does not sweep a source folder while a commit holds that source's manifest lock (AR-003)", async () => {
    await store.appendPiece("locked", sha256("old"), 0, Buffer.from("old"));
    const longAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await fs.utimes(stagedPath("locked", "old"), longAgo, longAgo);
    const importRoot = path.join(memoryDir, "imports", "locked");
    await fs.mkdir(importRoot, { recursive: true });
    let releaseLock!: () => void;
    const lockHeld = withFilePathLock(path.join(importRoot, "sync-manifest.json"), () => new Promise<void>((resolve) => { releaseLock = resolve; }));
    await vi.waitFor(() => expect(releaseLock).toBeTypeOf("function"));

    let swept = false;
    const sweep = store.sweepStale().then(() => { swept = true; });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(swept).toBe(false);
    expect(await exists(stagedPath("locked", "old"))).toBe(true);

    releaseLock();
    await lockHeld;
    await sweep;
    expect(await exists(stagedPath("locked", "old"))).toBe(false);
  });

  it("refuses every path while Memory Sync is held back", async () => {
    configureMemorySyncCapability(false);

    await expect(store.receivedBytes("src", sha256("x"))).rejects.toBeInstanceOf(MemorySyncNotMigratedError);
    await expect(store.appendPiece("src", sha256("x"), 0, Buffer.from("x"))).rejects.toBeInstanceOf(MemorySyncNotMigratedError);
    await expect(store.verifyStagedFile("src", sha256("x"), 1)).rejects.toBeInstanceOf(MemorySyncNotMigratedError);
    await expect(store.placeStagedFile("src", sha256("x"), [path.join(memoryDir, "t")])).rejects.toBeInstanceOf(MemorySyncNotMigratedError);
    await expect(store.sweepStale()).rejects.toBeInstanceOf(MemorySyncNotMigratedError);
  });
});
