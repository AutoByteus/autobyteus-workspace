import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { TeamRunMetadata } from "../../../../src/run-history/store/team-run-metadata-types.js";

const teamRunManagerMock = {
  getActiveRun: vi.fn<(teamRunId: string) => unknown>(),
};

vi.mock("../../../../src/agent-team-execution/services/agent-team-run-manager.js", () => ({
  AgentTeamRunManager: {
    getInstance: () => teamRunManagerMock,
  },
}));

describe("TeamRunHistoryService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-service-"));
    teamRunManagerMock.getActiveRun.mockReset();
    teamRunManagerMock.getActiveRun.mockReturnValue(null);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("backfills blank historical summaries from the coordinator trace before returning history", async () => {
    const metadata: TeamRunMetadata = {
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Team Alpha",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-04-11T20:00:00.000Z",
      updatedAt: "2026-04-11T20:05:00.000Z",
      memberMetadata: [
        {
          memberRouteKey: "coordinator",
          memberName: "Coordinator",
          memberRunId: "member-run-1",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          platformAgentRunId: null,
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "model-1",
          autoExecuteTools: true,
          skillAccessMode: SkillAccessMode.NONE,
          llmConfig: null,
          workspaceRootPath: "/ws/a",
        },
      ],
    };

    const memberDir = path.join(memoryDir, "agent_teams", "team-1", "member-run-1");
    await fs.mkdir(memberDir, { recursive: true });
    await fs.writeFile(
      path.join(memberDir, "raw_traces.jsonl"),
      [
        JSON.stringify({ trace_type: "user", content: "Could you rebuild the electron app?", ts: 10 }),
        JSON.stringify({ trace_type: "assistant", content: "Sure.", ts: 11 }),
      ].join("\n"),
      "utf-8",
    );

    const indexService = {
      listRows: vi.fn().mockResolvedValue([
        {
          teamRunId: "team-1",
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team Alpha",
          workspaceRootPath: "/ws/a",
          summary: "",
          lastActivityAt: "2026-04-11T20:05:00.000Z",
          lastKnownStatus: "IDLE",
          deleteLifecycle: "READY",
        },
      ]),
      rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
      removeRow: vi.fn().mockResolvedValue(undefined),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
    };

    const { TeamRunHistoryService } = await import(
      "../../../../src/run-history/services/team-run-history-service.js"
    );

    const service = new TeamRunHistoryService(memoryDir, {
      metadataStore: {
        readMetadata: vi.fn().mockResolvedValue(metadata),
      } as any,
      indexService: indexService as any,
      teamRunManager: teamRunManagerMock as any,
    });

    const result = await service.listTeamRunHistory();

    expect(result).toEqual([
      expect.objectContaining({
        teamRunId: "team-1",
        coordinatorMemberRouteKey: "coordinator",
        summary: "Could you rebuild the electron app?",
      }),
    ]);
    expect(indexService.recordRunActivity).toHaveBeenCalledWith({
      teamRunId: "team-1",
      metadata,
      summary: "Could you rebuild the electron app?",
      lastKnownStatus: "IDLE",
      lastActivityAt: "2026-04-11T20:05:00.000Z",
    });
  });
});
