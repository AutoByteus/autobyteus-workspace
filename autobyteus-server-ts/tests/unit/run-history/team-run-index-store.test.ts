import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamRunIndexStore } from "../../../src/run-history/store/team-run-index-store.js";

const createTempMemoryDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-run-index-"));

describe("TeamRunIndexStore", () => {
  let memoryDir: string;
  let store: TeamRunIndexStore;

  beforeEach(async () => {
    memoryDir = await createTempMemoryDir();
    store = new TeamRunIndexStore(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("returns empty index when file is absent", async () => {
    const index = await store.readIndex();
    expect(index.version).toBe(1);
    expect(index.rows).toEqual([]);
  });

  it("upserts and lists rows", async () => {
    await store.upsertRow({
      teamRunId: "team-1",
      teamDefinitionId: "def-1",
      teamDefinitionName: "Team One",
      summary: "First summary",
      lastActivityAt: "2026-02-15T00:00:00.000Z",
      lastKnownStatus: "ACTIVE",
      deleteLifecycle: "READY",
    });
    await store.upsertRow({
      teamRunId: "team-2",
      teamDefinitionId: "def-2",
      teamDefinitionName: "Team Two",
      summary: "Second summary",
      lastActivityAt: "2026-02-15T00:01:00.000Z",
      lastKnownStatus: "IDLE",
      deleteLifecycle: "CLEANUP_PENDING",
    });

    const rows = await store.listRows();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.teamRunId).sort()).toEqual(["team-1", "team-2"]);
  });

  it("updates an existing row", async () => {
    await store.upsertRow({
      teamRunId: "team-1",
      teamDefinitionId: "def-1",
      teamDefinitionName: "Team One",
      summary: "Old",
      lastActivityAt: "2026-02-15T00:00:00.000Z",
      lastKnownStatus: "ACTIVE",
      deleteLifecycle: "READY",
    });

    await store.updateRow("team-1", {
      summary: "New",
      lastKnownStatus: "ERROR",
    });

    const row = await store.getRow("team-1");
    expect(row).toMatchObject({
      teamRunId: "team-1",
      summary: "New",
      lastKnownStatus: "ERROR",
    });
  });

  it("removes rows by teamRunId", async () => {
    await store.upsertRow({
      teamRunId: "team-1",
      teamDefinitionId: "def-1",
      teamDefinitionName: "Team One",
      summary: "Old",
      lastActivityAt: "2026-02-15T00:00:00.000Z",
      lastKnownStatus: "ACTIVE",
      deleteLifecycle: "READY",
    });
    await store.removeRow("team-1");
    await store.removeRow("missing-team");

    const rows = await store.listRows();
    expect(rows).toEqual([]);
  });
});
