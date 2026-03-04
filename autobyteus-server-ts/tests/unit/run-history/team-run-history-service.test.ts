import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import type { TeamRunManifest } from "../../../src/run-history/domain/team-models.js";

describe("TeamRunHistoryService", () => {
  let memoryDir: string;
  let service: TeamRunHistoryService;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-run-history-service-"));
    service = new TeamRunHistoryService(memoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
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
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "member-professor",
          threadId: "thread-old",
          metadata: null,
        },
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

  it("persists refreshed team manifest runtime references without resetting summary/status", async () => {
    const teamRunId = "team-3";
    await service.upsertTeamRunHistoryRow({
      teamRunId,
      manifest: buildManifest(teamRunId),
      summary: "kept-summary",
      lastKnownStatus: "IDLE",
    });

    const refreshedManifest: TeamRunManifest = {
      ...buildManifest(teamRunId),
      memberBindings: [
        {
          ...buildManifest(teamRunId).memberBindings[0]!,
          runtimeReference: {
            runtimeKind: "codex_app_server",
            sessionId: "member-professor",
            threadId: "thread-new",
            metadata: { refreshed: true },
          },
        },
      ],
    };

    await service.persistTeamRunManifest(teamRunId, refreshedManifest);

    const persistedManifest = JSON.parse(
      await fs.readFile(
        path.join(memoryDir, "agent_teams", teamRunId, "team_run_manifest.json"),
        "utf-8",
      ),
    ) as TeamRunManifest;
    expect(
      persistedManifest.memberBindings[0]?.runtimeReference?.threadId,
    ).toBe("thread-new");

    const memberManifest = JSON.parse(
      await fs.readFile(
        path.join(memoryDir, "agent_teams", teamRunId, "member-professor", "run_manifest.json"),
        "utf-8",
      ),
    ) as { runtimeReference?: { threadId?: string | null }; lastKnownStatus?: string };
    expect(memberManifest.runtimeReference?.threadId).toBe("thread-new");
    expect(memberManifest.lastKnownStatus).toBe("IDLE");

    const rows = await service.listTeamRunHistory();
    const row = rows.find((item) => item.teamRunId === teamRunId);
    expect(row?.summary).toBe("kept-summary");
    expect(row?.lastKnownStatus).toBe("IDLE");
  });
});
