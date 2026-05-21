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

  it("persists and reads plain V2 team catalog rows", async () => {
    const store = new TeamRunHistoryIndexStore(memoryDir);
    await store.writeIndex([
      {
        teamRunId: " team-1 ",
        teamDefinitionId: " team-def-1 ",
        teamDefinitionName: " Team One ",
        workspaceRootPath: "/tmp/workspace/",
        summary: "  summary  ",
        createdAt: "2026-03-26T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: "2026-03-26T11:00:00.000Z",
      },
    ]);

    await expect(store.getRow("team-1")).resolves.toEqual({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Team One",
      workspaceRootPath: "/tmp/workspace",
      summary: "summary",
      createdAt: "2026-03-26T10:00:00.000Z",
      archivedAt: null,
      terminatedAt: "2026-03-26T11:00:00.000Z",
    });
    const payload = JSON.parse(await fs.readFile(path.join(memoryDir, "team_run_history_index.json"), "utf-8"));
    expect(Array.isArray(payload)).toBe(true);
  });

  it("rejects wrappers and legacy live-status rows as the normal source catalog", async () => {
    await fs.writeFile(
      path.join(memoryDir, "team_run_history_index.json"),
      JSON.stringify({
        version: 1,
        rows: [
          {
            teamRunId: "team-1",
            teamDefinitionId: "team-def-1",
            teamDefinitionName: "Team One",
            workspaceRootPath: "/tmp/workspace",
            summary: "legacy",
            lastActivityAt: "2026-03-26T10:00:00.000Z",
            lastKnownStatus: "IDLE",
            deleteLifecycle: "READY",
          },
        ],
      }),
      "utf-8",
    );

    await expect(new TeamRunHistoryIndexStore(memoryDir).listRows()).resolves.toEqual([]);
  });

  it("rejects plain rows with invalid team run identities", async () => {
    await fs.writeFile(
      path.join(memoryDir, "team_run_history_index.json"),
      JSON.stringify([
        {
          teamRunId: "../team-1",
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team One",
          workspaceRootPath: null,
          summary: "bad id",
          createdAt: "2026-03-26T10:00:00.000Z",
          archivedAt: null,
          terminatedAt: null,
        },
      ]),
      "utf-8",
    );

    await expect(new TeamRunHistoryIndexStore(memoryDir).listRows()).resolves.toEqual([]);
  });
});
