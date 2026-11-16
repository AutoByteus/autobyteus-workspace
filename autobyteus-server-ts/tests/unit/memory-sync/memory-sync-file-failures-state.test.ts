import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalFileMemorySyncStateStore } from "../../../src/memory-sync/source/local-file-memory-sync-state-store.js";
import { configureMemorySyncCapability } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import type { MemorySyncFileFailure } from "../../../src/memory-sync/shared/memory-sync-types.js";

const HUB = "http://hub.local";
const failure: MemorySyncFileFailure = {
  kind: "agents", relativePath: "r/v.mp4", size: 5, mtimeMs: 7, reason: "boom", attempts: 2,
  lastFailedAt: "2026-11-15T12:00:00.000Z", nextAttemptAt: "2026-11-15T12:02:00.000Z",
};

describe("source state fileFailures", () => {
  let root: string;
  let store: LocalFileMemorySyncStateStore;

  beforeEach(async () => {
    configureMemorySyncCapability(true);
    root = await fs.mkdtemp(path.join(os.tmpdir(), "memory-state-failures-"));
    store = new LocalFileMemorySyncStateStore({ getAppDataDir: () => root });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("reads a state file written before file failures existed as having none", async () => {
    const filePath = store.getFilePath(HUB, "src");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({
      schemaVersion: 1, hubKey: "k", hubBaseUrl: HUB, memorySyncSourceId: "src",
      lastSuccessfulSyncAt: null, lastError: null, lastJobState: "success", files: {},
    }));

    expect((await store.readState(HUB, "src")).fileFailures).toEqual({});
  });

  it("writes the exact record shape and reads it back, dropping invalid records and unknown fields", async () => {
    await store.updateState(HUB, "src", (state) => ({ ...state, fileFailures: { "agents/r/v.mp4": failure } }));
    const filePath = store.getFilePath(HUB, "src");
    const written = JSON.parse(await fs.readFile(filePath, "utf-8"));
    expect(Object.keys(written.fileFailures["agents/r/v.mp4"]).sort()).toEqual(
      ["attempts", "kind", "lastFailedAt", "mtimeMs", "nextAttemptAt", "reason", "relativePath", "size"],
    );

    written.fileFailures["agents/bad"] = { kind: "agents", relativePath: "bad" };
    written.fileFailures["agents/r/v.mp4"].extra = "ignored";
    await fs.writeFile(filePath, JSON.stringify(written));

    expect((await store.readState(HUB, "src")).fileFailures).toEqual({ "agents/r/v.mp4": failure });
  });
});
