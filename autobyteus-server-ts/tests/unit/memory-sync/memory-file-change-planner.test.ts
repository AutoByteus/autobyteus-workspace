import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileChangePlanner } from "../../../src/memory-sync/source/memory-file-change-planner.js";
import { buildFileFailure } from "../../../src/memory-sync/source/memory-sync-file-failure-policy.js";
import type { MemoryFileEntry, MemorySyncSourceFileState } from "../../../src/memory-sync/shared/memory-sync-types.js";

const now = new Date("2026-11-15T12:00:00.000Z");
let root: string | null = null;

afterEach(async () => {
  if (root) await fs.rm(root, { recursive: true, force: true });
  root = null;
});

const writeEntry = async (name: string, content: string): Promise<MemoryFileEntry> => {
  root ??= await fs.mkdtemp(path.join(os.tmpdir(), "memory-change-planner-"));
  const absolutePath = path.join(root, name);
  await fs.writeFile(absolutePath, content);
  const stat = await fs.stat(absolutePath);
  return { kind: "agents", relativePath: name, absolutePath, size: stat.size, mtimeMs: stat.mtimeMs };
};

const synced = (entry: MemoryFileEntry): MemorySyncSourceFileState => ({
  kind: entry.kind, relativePath: entry.relativePath, size: entry.size, sha256: "old", mtimeMs: entry.mtimeMs,
  lastSyncedAt: "2026-11-15T11:00:00.000Z", lastBatchId: "b",
});

describe("MemoryFileChangePlanner", () => {
  it("does not read a file whose size and mtime equal its synced record (AC-011)", async () => {
    const entry = await writeEntry("same.txt", "content");
    // The listed path no longer exists: reading it would fail, so only the fast path can report it unchanged.
    const unreadable = { ...entry, absolutePath: path.join(root as string, "missing-dir", "same.txt") };

    const plan = await new MemoryFileChangePlanner().planChangedFiles(
      [unreadable], { files: { "agents/same.txt": synced(entry) }, fileFailures: {} }, "background", now,
    );

    expect(plan).toMatchObject({ unchangedCount: 1, changed: [], failed: [], deferred: [] });
  });

  it("hashes a changed file by streaming and returns it with its SHA-256", async () => {
    const entry = await writeEntry("changed.txt", "hello");

    const plan = await new MemoryFileChangePlanner().planChangedFiles(
      [entry], { files: { "agents/changed.txt": { ...synced(entry), size: 1 } }, fileFailures: {} }, "background", now,
    );

    expect(plan.changed).toEqual([{ ...entry, sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" }]);
  });

  it("makes a failing file wait for its delay, and retries it on Sync now or when it changed", async () => {
    const entry = await writeEntry("failing.txt", "x");
    const failure = buildFileFailure(entry, "boom", undefined, now);
    const state = { files: {}, fileFailures: { "agents/failing.txt": failure } };
    const planner = new MemoryFileChangePlanner();

    expect((await planner.planChangedFiles([entry], state, "background", now)).waitingCount).toBe(1);
    expect((await planner.planChangedFiles([entry], state, "manual", now)).changed).toHaveLength(1);
    expect((await planner.planChangedFiles([{ ...entry, mtimeMs: entry.mtimeMs + 5000 }], state, "background", now)).waitingCount).toBe(0);
  });

  it("defers a file that changed since it was listed, or vanished, and reports an unreadable one as failed", async () => {
    const entry = await writeEntry("moving.txt", "abc");
    const planner = new MemoryFileChangePlanner();
    const state = { files: {}, fileFailures: {} };

    const staleListing = await planner.planChangedFiles([{ ...entry, size: entry.size + 1 }], state, "background", now);
    const vanished = await planner.planChangedFiles([{ ...entry, absolutePath: path.join(root as string, "gone.txt") }], state, "background", now);
    const folder = await fs.stat(root as string);
    const notAFile = await planner.planChangedFiles(
      [{ ...entry, absolutePath: root as string, size: folder.size, mtimeMs: folder.mtimeMs }], state, "background", now,
    );

    expect(staleListing.deferred).toEqual([{ key: "agents/moving.txt", reason: "file changed while being read" }]);
    expect(vanished.deferred).toEqual([{ key: "agents/moving.txt", reason: "file disappeared while being read" }]);
    expect(notAFile.failed).toHaveLength(1);
    expect(notAFile.failed[0]?.reason).toContain("Could not read file");
  });
});
