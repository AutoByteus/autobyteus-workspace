import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamRunManifestStore } from "../../../src/run-history/store/team-run-manifest-store.js";
import { TeamMemberMemoryLayoutStore } from "../../../src/run-history/store/team-member-memory-layout-store.js";
import { TeamMemberRunManifestStore } from "../../../src/run-history/store/team-member-run-manifest-store.js";
import type { TeamRunManifest } from "../../../src/run-history/domain/team-models.js";

const createTempMemoryDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-layout-create-"));

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const buildManifest = (teamRunId: string, memberBindings: TeamRunManifest["memberBindings"]): TeamRunManifest => {
  const nowIso = "2026-02-22T00:00:00.000Z";
  return {
    teamRunId,
    teamDefinitionId: "def-layout",
    teamDefinitionName: "Layout Team",
    coordinatorMemberRouteKey: memberBindings[0]?.memberRouteKey ?? "coordinator",
    runVersion: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    memberBindings,
  };
};

describe("Team run history create layout integration", () => {
  const tempDirs: string[] = [];
  const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;

  afterEach(async () => {
    if (typeof originalNodeId === "string") {
      process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
    } else {
      delete process.env.AUTOBYTEUS_NODE_ID;
    }
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("stores local nested member folders under teamRunId with flattened memberAgentId directories", async () => {
    process.env.AUTOBYTEUS_NODE_ID = "node-host";
    const memoryDir = await createTempMemoryDir();
    tempDirs.push(memoryDir);

    const teamRunId = "team_layout_nested_local";
    const manifest = buildManifest(teamRunId, [
      {
        memberRouteKey: "planning/reviewer",
        memberName: "reviewer",
        memberAgentId: "member-plan-reviewer",
        agentDefinitionId: "agent-reviewer",
        llmModelIdentifier: "model-reviewer",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
        hostNodeId: "node-host",
      },
      {
        memberRouteKey: "qa/reviewer",
        memberName: "reviewer",
        memberAgentId: "member-qa-reviewer",
        agentDefinitionId: "agent-reviewer",
        llmModelIdentifier: "model-reviewer",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
        hostNodeId: "node-host",
      },
    ]);

    const service = new TeamRunHistoryService(memoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
    });
    const layoutStore = new TeamMemberMemoryLayoutStore(memoryDir);
    const memberManifestStore = new TeamMemberRunManifestStore(memoryDir);
    const manifestStore = new TeamRunManifestStore(memoryDir);

    await service.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "nested local",
      lastKnownStatus: "IDLE",
    });

    expect(await exists(layoutStore.getMemberDirPath(teamRunId, "member-plan-reviewer"))).toBe(true);
    expect(await exists(layoutStore.getMemberDirPath(teamRunId, "member-qa-reviewer"))).toBe(true);
    expect(await exists(memberManifestStore.getManifestPath(teamRunId, "member-plan-reviewer"))).toBe(true);
    expect(await exists(memberManifestStore.getManifestPath(teamRunId, "member-qa-reviewer"))).toBe(true);
    expect(await exists(path.join(memoryDir, "agents", "member-plan-reviewer"))).toBe(false);
    expect(await exists(path.join(memoryDir, "agents", "member-qa-reviewer"))).toBe(false);
    const memberManifest = await memberManifestStore.readManifest(teamRunId, "member-plan-reviewer");
    expect(memberManifest).toMatchObject({
      memberRouteKey: "planning/reviewer",
      memberAgentId: "member-plan-reviewer",
      lastKnownStatus: "IDLE",
    });

    const persistedManifest = await manifestStore.readManifest(teamRunId);
    expect(persistedManifest?.memberBindings.map((binding) => binding.memberRouteKey)).toEqual([
      "planning/reviewer",
      "qa/reviewer",
    ]);
  });

  it("creates only host-local member folders for distributed mixed placement", async () => {
    process.env.AUTOBYTEUS_NODE_ID = "node-host";
    const memoryDir = await createTempMemoryDir();
    tempDirs.push(memoryDir);

    const teamRunId = "team_layout_dist_mixed";
    const manifest = buildManifest(teamRunId, [
      {
        memberRouteKey: "professor",
        memberName: "professor",
        memberAgentId: "member-professor-a",
        agentDefinitionId: "agent-professor",
        llmModelIdentifier: "model-professor",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
        hostNodeId: "node-host",
      },
      {
        memberRouteKey: "scribe",
        memberName: "scribe",
        memberAgentId: "member-scribe-b",
        agentDefinitionId: "agent-scribe",
        llmModelIdentifier: "model-scribe",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
        hostNodeId: "node-host-b",
      },
    ]);

    const service = new TeamRunHistoryService(memoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
    });
    const layoutStore = new TeamMemberMemoryLayoutStore(memoryDir);
    const memberManifestStore = new TeamMemberRunManifestStore(memoryDir);
    await service.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "distributed mixed",
      lastKnownStatus: "IDLE",
    });

    expect(await exists(layoutStore.getMemberDirPath(teamRunId, "member-professor-a"))).toBe(true);
    expect(await exists(layoutStore.getMemberDirPath(teamRunId, "member-scribe-b"))).toBe(false);
    expect(await exists(memberManifestStore.getManifestPath(teamRunId, "member-professor-a"))).toBe(true);
    expect(await exists(memberManifestStore.getManifestPath(teamRunId, "member-scribe-b"))).toBe(false);
  });

  it("keeps host as manifest-only when all members belong to remote nodes", async () => {
    process.env.AUTOBYTEUS_NODE_ID = "node-host";
    const memoryDir = await createTempMemoryDir();
    tempDirs.push(memoryDir);

    const teamRunId = "team_layout_manifest_only";
    const manifest = buildManifest(teamRunId, [
      {
        memberRouteKey: "student",
        memberName: "student",
        memberAgentId: "member-student-b",
        agentDefinitionId: "agent-student",
        llmModelIdentifier: "model-student",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
        hostNodeId: "node-host-b",
      },
      {
        memberRouteKey: "scribe",
        memberName: "scribe",
        memberAgentId: "member-scribe-c",
        agentDefinitionId: "agent-scribe",
        llmModelIdentifier: "model-scribe",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
        hostNodeId: "node-host-c",
      },
    ]);

    const service = new TeamRunHistoryService(memoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
    });
    const layoutStore = new TeamMemberMemoryLayoutStore(memoryDir);
    await service.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "manifest only",
      lastKnownStatus: "IDLE",
    });

    const teamDir = layoutStore.getTeamDirPath(teamRunId);
    const teamEntries = await fs.readdir(teamDir);
    expect(teamEntries).toContain("team_run_manifest.json");
    expect(teamEntries).not.toContain("member-student-b");
    expect(teamEntries).not.toContain("member-scribe-c");
  });
});
