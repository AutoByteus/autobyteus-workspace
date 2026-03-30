import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";

describe("TeamRunHistoryIndexStore", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-index-store-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("normalizes persisted rows on write", async () => {
    const store = new TeamRunHistoryIndexStore(memoryDir);
    await store.upsertRow({
      teamRunId: " team-1 ",
      teamDefinitionId: " team-def-1 ",
      teamDefinitionName: " Team One ",
      workspaceRootPath: "/tmp/workspace/",
      summary: "  summary  ",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "ACTIVE",
      deleteLifecycle: "READY",
    });

    await expect(store.getRow("team-1")).resolves.toEqual({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Team One",
      workspaceRootPath: "/tmp/workspace",
      summary: "summary",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "ACTIVE",
      deleteLifecycle: "READY",
    });
  });

  it("removes rows by teamRunId", async () => {
    const store = new TeamRunHistoryIndexStore(memoryDir);
    await store.upsertRow({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Team One",
      workspaceRootPath: null,
      summary: "",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "IDLE",
      deleteLifecycle: "READY",
    });

    await store.removeRow("team-1");

    await expect(store.getRow("team-1")).resolves.toBeNull();
  });
});
