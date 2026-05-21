import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RunHistoryIndexV2AppDataMigration } from "../../../src/app-data-migrations/migrations/run-history-index-v2-migration.js";

let memoryDir: string;

const writeMetadata = async (
  runId: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  const runDir = path.join(memoryDir, "agents", runId);
  await fs.mkdir(runDir, { recursive: true });
  const metadataPath = path.join(runDir, "run_metadata.json");
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify({ runId, ...payload }, null, 2)}\n`,
    "utf-8",
  );
  return metadataPath;
};

const readIndex = async (): Promise<Array<Record<string, unknown>>> =>
  JSON.parse(
    await fs.readFile(path.join(memoryDir, "run_history_index.json"), "utf-8"),
  ) as Array<Record<string, unknown>>;

const agentDefinitionService = {
  getAgentDefinitionById: async (agentDefinitionId: string) => ({
    name: `Name ${agentDefinitionId}`,
  }),
};

describe("RunHistoryIndexV2AppDataMigration", () => {
  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-history-index-v2-migration-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("writes a plain V2 row array from legacy index rows and metadata directories", async () => {
    await writeMetadata("run-existing", {
      agentDefinitionId: "agent-existing",
      workspaceRootPath: "/workspace/existing",
    });
    await writeMetadata("run-new", {
      agentDefinitionId: "agent-new",
      workspaceRootPath: "/workspace/new",
      preparedAt: "2026-03-27T10:00:00.000Z",
      summary: "metadata summary",
    });
    const indexPath = path.join(memoryDir, "run_history_index.json");
    await fs.writeFile(
      indexPath,
      `${JSON.stringify({
        version: 2,
        rows: [
          {
            runId: "run-existing",
            agentDefinitionId: "legacy-agent",
            agentName: "Legacy Agent",
            workspaceRootPath: "/legacy/workspace",
            summary: "legacy summary",
            lastActivityAt: "2026-03-25T10:00:00.000Z",
            lastKnownStatus: "ACTIVE",
          },
          {
            runId: "run-stale",
            agentDefinitionId: "stale-agent",
            agentName: "Stale Agent",
            workspaceRootPath: "/stale",
            summary: "stale",
            lastActivityAt: "2026-03-24T10:00:00.000Z",
            lastKnownStatus: "IDLE",
          },
        ],
      }, null, 2)}\n`,
      "utf-8",
    );

    const result = await new RunHistoryIndexV2AppDataMigration(
      memoryDir,
      agentDefinitionService,
    ).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.migratedCount).toBe(2);
    expect(result.summary.skippedCount).toBe(1);
    const rows = await readIndex();
    expect(rows).toEqual([
      {
        runId: "run-new",
        agentDefinitionId: "agent-new",
        agentName: "Name agent-new",
        workspaceRootPath: "/workspace/new",
        summary: "metadata summary",
        createdAt: "2026-03-27T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: null,
      },
      {
        runId: "run-existing",
        agentDefinitionId: "agent-existing",
        agentName: "Legacy Agent",
        workspaceRootPath: "/workspace/existing",
        summary: "legacy summary",
        createdAt: "2026-03-25T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: null,
      },
    ]);
    expect(rows).not.toHaveProperty("version");
    expect(rows[0]).not.toHaveProperty("lastKnownStatus");
    expect(rows[0]).not.toHaveProperty("lastActivityAt");
    expect(
      (await fs.readdir(memoryDir)).some((name) =>
        name.startsWith("run_history_index.json.backup-"),
      ),
    ).toBe(true);
    expect(result.summary.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: "run-existing",
          message: expect.stringContaining("legacy index lastActivityAt"),
          backupPath: expect.stringContaining("run_history_index.json.backup-"),
        }),
        expect.objectContaining({
          itemId: "run-stale",
          status: "SKIPPED",
          message: expect.stringContaining("Removed stale existing index row"),
        }),
      ]),
    );
  });

  it("records partial failures while writing migratable rows", async () => {
    await writeMetadata("run-good", {
      agentDefinitionId: "agent-good",
      workspaceRootPath: "/workspace/good",
      preparedAt: "2026-03-27T10:00:00.000Z",
    });
    const badDir = path.join(memoryDir, "agents", "run-bad");
    await fs.mkdir(badDir, { recursive: true });
    await fs.writeFile(path.join(badDir, "run_metadata.json"), "{", "utf-8");

    const result = await new RunHistoryIndexV2AppDataMigration(
      memoryDir,
      agentDefinitionService,
    ).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.errorMessage).toContain("1 standalone run metadata");
    expect(result.summary.failedCount).toBe(1);
    await expect(readIndex()).resolves.toMatchObject([
      {
        runId: "run-good",
        agentDefinitionId: "agent-good",
      },
    ]);
  });

  it("fails rows with missing workspace paths instead of writing catalog-unloadable output", async () => {
    await writeMetadata("run-good", {
      agentDefinitionId: "agent-good",
      workspaceRootPath: "/workspace/good",
      preparedAt: "2026-03-27T10:00:00.000Z",
    });
    await writeMetadata("run-missing-workspace", {
      agentDefinitionId: "agent-bad",
      preparedAt: "2026-03-27T11:00:00.000Z",
    });

    const result = await new RunHistoryIndexV2AppDataMigration(
      memoryDir,
      agentDefinitionService,
    ).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.failedCount).toBe(1);
    expect(result.summary.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: "run-missing-workspace",
          status: "FAILED",
          message: expect.stringContaining("workspaceRootPath cannot be empty"),
        }),
      ]),
    );
    await expect(readIndex()).resolves.toMatchObject([
      {
        runId: "run-good",
        workspaceRootPath: "/workspace/good",
      },
    ]);
  });
});
