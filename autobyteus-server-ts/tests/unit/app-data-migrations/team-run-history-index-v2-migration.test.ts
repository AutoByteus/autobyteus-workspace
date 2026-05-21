import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunHistoryIndexV2AppDataMigration } from "../../../src/app-data-migrations/migrations/team-run-history-index-v2-migration.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";

let memoryDir: string;

const buildMetadata = (teamRunId: string, overrides: Partial<TeamRunMetadata> = {}): TeamRunMetadata => ({
  teamRunId,
  teamDefinitionId: "software-engineering-team",
  teamDefinitionName: "Software Engineering Team",
  coordinatorMemberRouteKey: "lead",
  createdAt: "2026-03-27T10:00:00.000Z",
  archivedAt: null,
  memberTree: [
    {
      memberKind: "agent",
      memberRouteKey: "lead",
      memberPath: ["Lead"],
      memberName: "Lead",
      memberRunId: `${teamRunId}-lead`,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: null,
      agentDefinitionId: "agent-lead",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
      workspaceRootPath: "/workspace/team",
      applicationExecutionContext: null,
    },
  ],
  ...overrides,
});

const writeMetadata = async (teamRunId: string, metadata: TeamRunMetadata | Record<string, unknown>): Promise<void> => {
  const dir = path.join(memoryDir, "agent_teams", teamRunId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "team_run_metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf-8");
};

const readIndex = async (): Promise<Array<Record<string, unknown>>> =>
  JSON.parse(await fs.readFile(path.join(memoryDir, "team_run_history_index.json"), "utf-8"));

describe("TeamRunHistoryIndexV2AppDataMigration", () => {
  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-index-v2-migration-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("writes a plain V2 team row array and repairs metadata-backed rows missing from the legacy index", async () => {
    await writeMetadata("team-existing", buildMetadata("team-existing"));
    await writeMetadata("team-missing", buildMetadata("team-missing", {
      teamDefinitionName: "Renamed Team",
    }));
    await fs.writeFile(
      path.join(memoryDir, "team_run_history_index.json"),
      `${JSON.stringify({
        version: 1,
        rows: [
          {
            teamRunId: "team-existing",
            teamDefinitionId: "legacy-def",
            teamDefinitionName: "Legacy Display Name",
            workspaceRootPath: "/legacy/workspace",
            summary: "legacy summary",
            lastActivityAt: "2026-03-26T10:00:00.000Z",
            lastKnownStatus: "IDLE",
            deleteLifecycle: "READY",
          },
          {
            teamRunId: "team-stale",
            teamDefinitionId: "stale-def",
            teamDefinitionName: "Stale Team",
            workspaceRootPath: null,
            summary: "stale",
            lastActivityAt: "2026-03-25T10:00:00.000Z",
            lastKnownStatus: "IDLE",
            deleteLifecycle: "READY",
          },
        ],
      }, null, 2)}\n`,
      "utf-8",
    );

    const result = await new TeamRunHistoryIndexV2AppDataMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.migratedCount).toBe(2);
    expect(result.summary.skippedCount).toBe(1);
    const rows = await readIndex();
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        teamRunId: "team-existing",
        teamDefinitionName: "Legacy Display Name",
        workspaceRootPath: "/legacy/workspace",
        summary: "legacy summary",
        archivedAt: null,
        terminatedAt: null,
      }),
      expect.objectContaining({
        teamRunId: "team-missing",
        teamDefinitionId: "software-engineering-team",
        teamDefinitionName: "Renamed Team",
        workspaceRootPath: "/workspace/team",
      }),
    ]));
    expect(rows).not.toHaveProperty("version");
    for (const row of rows) {
      expect(row).not.toHaveProperty("lastKnownStatus");
      expect(row).not.toHaveProperty("lastActivityAt");
      expect(row).not.toHaveProperty("deleteLifecycle");
    }
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "team-missing", message: expect.stringContaining("missing from legacy index") }),
      expect.objectContaining({ itemId: "team-stale", status: "SKIPPED" }),
    ]));
  });

  it("fails metadata/directory identity mismatches and still writes migratable rows", async () => {
    await writeMetadata("team-good", buildMetadata("team-good"));
    await writeMetadata("team-dir", buildMetadata("metadata-team-id"));

    const result = await new TeamRunHistoryIndexV2AppDataMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.failedCount).toBe(1);
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: "team-dir",
        status: "FAILED",
        message: expect.stringContaining("does not match directory"),
      }),
    ]));
    await expect(readIndex()).resolves.toEqual([
      expect.objectContaining({ teamRunId: "team-good" }),
    ]);
  });
});
