import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RunHistoryIndexStore } from "../../../src/run-history/store/run-history-index-store.js";

const createTempMemoryDir = async (): Promise<string> => {
  return fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-run-history-index-"));
};

describe("RunHistoryIndexStore", () => {
  let memoryDir: string;
  let store: RunHistoryIndexStore;

  beforeEach(async () => {
    memoryDir = await createTempMemoryDir();
    store = new RunHistoryIndexStore(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("returns empty index when index file does not exist", async () => {
    const index = await store.readIndex();
    expect(index.rows).toEqual([]);
    expect(index.version).toBe(1);
  });

  it("upserts and reads rows", async () => {
    await store.upsertRow({
      runId: "run-1",
      agentDefinitionId: "agent-1",
      agentName: "SuperAgent",
      workspaceRootPath: "/ws/a",
      summary: "Describe messaging bindings",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
      lastKnownStatus: "ACTIVE",
    });

    await store.upsertRow({
      runId: "run-2",
      agentDefinitionId: "agent-2",
      agentName: "DB Agent",
      workspaceRootPath: "/ws/b",
      summary: "Assess schema migration",
      lastActivityAt: "2026-01-01T01:00:00.000Z",
      lastKnownStatus: "IDLE",
    });

    const rows = await store.listRows();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.runId).sort()).toEqual(["run-1", "run-2"]);
  });

  it("updates an existing row without changing runId", async () => {
    await store.upsertRow({
      runId: "run-1",
      agentDefinitionId: "agent-1",
      agentName: "SuperAgent",
      workspaceRootPath: "/ws/a",
      summary: "old",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
      lastKnownStatus: "ACTIVE",
    });

    await store.updateRow("run-1", {
      summary: "new",
      lastKnownStatus: "ERROR",
    });

    const row = await store.getRow("run-1");
    expect(row).toMatchObject({
      runId: "run-1",
      summary: "new",
      lastKnownStatus: "ERROR",
    });
  });

  it("removes a row by runId and ignores non-existent rows", async () => {
    await store.upsertRow({
      runId: "run-1",
      agentDefinitionId: "agent-1",
      agentName: "SuperAgent",
      workspaceRootPath: "/ws/a",
      summary: "old",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
      lastKnownStatus: "ACTIVE",
    });
    await store.upsertRow({
      runId: "run-2",
      agentDefinitionId: "agent-2",
      agentName: "DB Agent",
      workspaceRootPath: "/ws/b",
      summary: "old",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
      lastKnownStatus: "IDLE",
    });

    await store.removeRow("run-1");
    await store.removeRow("missing-run");

    const rows = await store.listRows();
    expect(rows.map((row) => row.runId)).toEqual(["run-2"]);
  });
});
