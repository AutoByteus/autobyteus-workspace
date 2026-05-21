import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamRunHistoryIndexService } from "../../../../src/run-history/services/team-run-history-index-service.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";

describe("TeamRunHistoryIndexService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-index-service-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("is a read-only V2 team catalog adapter", async () => {
    const indexStore = new TeamRunHistoryIndexStore(memoryDir);
    await indexStore.writeIndex([
      {
        teamRunId: "team-1",
        teamDefinitionId: "team-def-1",
        teamDefinitionName: "Team One",
        workspaceRootPath: "/tmp/workspace",
        summary: "summary",
        createdAt: "2026-03-26T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: null,
      },
    ]);
    const service = new TeamRunHistoryIndexService(memoryDir, { indexStore });

    await expect(service.listRows()).resolves.toMatchObject([
      { teamRunId: "team-1", createdAt: "2026-03-26T10:00:00.000Z" },
    ]);
    await expect(service.getRow("team-1")).resolves.toMatchObject({
      teamRunId: "team-1",
      summary: "summary",
    });
  });
});
