import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../../../src/config/app-config.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgFlatTeamFamiliesV1AppDataMigration } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { AgentOrgTokenAttributionTransition } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-transition.js";

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("CRR-004 representative missing-tree warning detail", () => {
  it("retains all eight missing-root identities in durable migration detail", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "crr004-warning-detail-"));
    tempDirs.push(root);
    const memoryDir = path.join(root, "memory");
    const layout = new AgentMemoryLayout(memoryDir);
    const runIds = Array.from({ length: 8 }, (_, index) => `missing-tree-${index + 1}`);
    await fs.mkdir(memoryDir, { recursive: true });
    await Promise.all(runIds.map((runId) => fs.mkdir(
      layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] }),
      { recursive: true },
    )));
    const config = {
      getAgentTeamsDir: () => path.join(root, "definitions", "agent-teams"),
      getAgentOrgsDir: () => path.join(root, "definitions", "agent-orgs"),
      getBaseUrl: () => "http://127.0.0.1:43151",
    } as AppConfig;
    const tokens = new AgentOrgTokenAttributionTransition(memoryDir, {
      async *listClaimedRoots() {},
      async convertRoot() { return 0; },
    });

    const result = await new AgentOrgFlatTeamFamiliesV1AppDataMigration(
      memoryDir,
      config,
      undefined,
      tokens,
    ).execute();
    const detail = result.summary.details.find((item) => item.itemId === "FAILED_MISSING_TEAM_EXECUTION_TREE");

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.failedCount).toBe(8);
    expect(detail).toBeDefined();
    for (const runId of runIds) expect(detail?.message).toContain(runId);
  });
});
