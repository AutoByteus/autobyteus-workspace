import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunMetadataMemberTreeMigration } from "../../../src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.js";

let tempDir: string;

const writeMetadata = async (teamRunId: string, payload: unknown): Promise<string> => {
  const metadataDir = path.join(tempDir, "agent_teams", teamRunId);
  await fs.mkdir(metadataDir, { recursive: true });
  const metadataPath = path.join(metadataDir, "team_run_metadata.json");
  await fs.writeFile(metadataPath, JSON.stringify(payload, null, 2), "utf-8");
  return metadataPath;
};

const legacyMetadata = (teamRunId: string) => ({
  teamRunId,
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Legacy Team",
  coordinatorMemberRouteKey: "lead",
  runVersion: 1,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:01.000Z",
  archivedAt: null,
  memberMetadata: [
    {
      memberRouteKey: "lead",
      memberName: "Lead",
      memberRunId: "lead-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: null,
      agentDefinitionId: "agent-lead",
      llmModelIdentifier: "codex:model",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: { temperature: 0 },
      workspaceRootPath: "/workspace",
      applicationExecutionContext: null,
    },
  ],
});

const currentMetadata = (teamRunId: string) => ({
  teamRunId,
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Current Team",
  coordinatorMemberRouteKey: "lead",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:01.000Z",
  archivedAt: null,
  memberTree: [
    {
      memberKind: "agent",
      memberRouteKey: "lead",
      memberPath: ["lead"],
      memberName: "Lead",
      memberRunId: "lead-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: null,
      agentDefinitionId: "agent-lead",
      llmModelIdentifier: "codex:model",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
      workspaceRootPath: "/workspace",
      applicationExecutionContext: null,
      role: null,
      description: null,
    },
  ],
});

describe("TeamRunMetadataMemberTreeMigration", () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-migration-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("converts legacy flat memberMetadata to canonical memberTree and creates a backup", async () => {
    const metadataPath = await writeMetadata("team-legacy", legacyMetadata("team-legacy"));

    const result = await new TeamRunMetadataMemberTreeMigration(tempDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.migratedCount).toBe(1);
    const converted = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    expect(converted.runVersion).toBeUndefined();
    expect(converted.memberMetadata).toBeUndefined();
    expect(converted.memberTree[0]).toMatchObject({
      memberKind: "agent",
      memberRouteKey: "lead",
      memberPath: ["lead"],
      memberRunId: "lead-run",
    });
    const backups = (await fs.readdir(path.dirname(metadataPath))).filter((name) => name.includes("backup"));
    expect(backups).toHaveLength(1);
  });

  it("skips current memberTree metadata idempotently", async () => {
    await writeMetadata("team-current", currentMetadata("team-current"));

    const result = await new TeamRunMetadataMemberTreeMigration(tempDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.scannedCount).toBe(1);
    expect(result.summary.skippedCount).toBe(1);
    expect(result.summary.migratedCount).toBe(0);
  });

  it("records partial failures without blocking other files", async () => {
    await writeMetadata("team-good", legacyMetadata("team-good"));
    await writeMetadata("team-bad", {
      teamRunId: "team-bad",
      runVersion: 1,
      memberMetadata: [],
    });

    const result = await new TeamRunMetadataMemberTreeMigration(tempDir).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.migratedCount).toBe(1);
    expect(result.summary.failedCount).toBe(1);
    expect(result.errorMessage).toContain("1 team metadata file");
  });

  it("fails legacy flat metadata with nested route/path instead of guessing topology", async () => {
    const nestedLegacy = legacyMetadata("team-nested-legacy");
    nestedLegacy.memberMetadata[0].memberRouteKey = "BuildSquad/review_lead";
    await writeMetadata("team-nested-legacy", nestedLegacy);

    const failedResult = await new TeamRunMetadataMemberTreeMigration(tempDir).execute();
    expect(failedResult.status).toBe("FAILED");
    expect(failedResult.summary.failedCount).toBe(1);
    expect(failedResult.summary.details[0]?.message).toContain("topology cannot be reconstructed safely");
  });
});
