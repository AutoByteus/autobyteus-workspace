import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import type { TeamRunManifest } from "../../../src/run-history/domain/team-models.js";

describe("TeamRunHistoryService", () => {
  let memoryDir: string;
  let service: TeamRunHistoryService;
  let hasActiveMemberBinding: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-run-history-service-"));
    hasActiveMemberBinding = vi.fn().mockReturnValue(false);
    service = new TeamRunHistoryService(memoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
      teamMemberRuntimeOrchestrator: {
        hasActiveMemberBinding,
      } as any,
    });
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  const buildManifest = (teamRunId: string): TeamRunManifest => ({
    teamRunId,
    teamDefinitionId: "team-def-1",
    teamDefinitionName: "Team One",
    workspaceRootPath: null,
    coordinatorMemberRouteKey: "professor",
    runVersion: 1,
    createdAt: "2026-02-25T00:00:00.000Z",
    updatedAt: "2026-02-25T00:00:00.000Z",
    memberBindings: [
      {
        memberRouteKey: "professor",
        memberName: "Professor",
        memberRunId: "member-professor",
        runtimeKind: "codex_app_server",
        runtimeReference: null,
        agentDefinitionId: "agent-professor",
        llmModelIdentifier: "model-a",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
      },
    ],
  });

  it("persists member subtree and member run manifest on upsert", async () => {
    const teamRunId = "team-1";
    await service.upsertTeamRunHistoryRow({
      teamRunId,
      manifest: buildManifest(teamRunId),
      summary: "hello",
      lastKnownStatus: "IDLE",
    });

    const memberDir = path.join(memoryDir, "agent_teams", teamRunId, "member-professor");
    await expect(fs.stat(memberDir)).resolves.toBeTruthy();

    const memberManifest = JSON.parse(
      await fs.readFile(path.join(memberDir, "run_manifest.json"), "utf-8"),
    ) as { memberRunId?: string; teamRunId?: string; lastKnownStatus?: string };
    expect(memberManifest.memberRunId).toBe("member-professor");
    expect(memberManifest.teamRunId).toBe(teamRunId);
    expect(memberManifest.lastKnownStatus).toBe("IDLE");
  });

  it("updates member run manifest status on terminate", async () => {
    const teamRunId = "team-2";
    await service.upsertTeamRunHistoryRow({
      teamRunId,
      manifest: buildManifest(teamRunId),
      summary: "",
      lastKnownStatus: "ACTIVE",
    });

    await service.onTeamTerminated(teamRunId);

    const memberManifest = JSON.parse(
      await fs.readFile(
        path.join(memoryDir, "agent_teams", teamRunId, "member-professor", "run_manifest.json"),
        "utf-8",
      ),
    ) as { lastKnownStatus?: string };
    expect(memberManifest.lastKnownStatus).toBe("IDLE");
  });

  it("treats external-member runtime bindings as active for resume and delete guards", async () => {
    const teamRunId = "team-3";
    await service.upsertTeamRunHistoryRow({
      teamRunId,
      manifest: buildManifest(teamRunId),
      summary: "",
      lastKnownStatus: "IDLE",
    });
    hasActiveMemberBinding.mockReturnValue(true);

    const resumeConfig = await service.getTeamRunResumeConfig(teamRunId);
    expect(resumeConfig.isActive).toBe(true);

    const deleteResult = await service.deleteTeamRunHistory(teamRunId);
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.message).toContain("active");
  });
});
