import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunMetadataStore } from "../../../../src/run-history/store/team-run-metadata-store.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";
import type { TeamRunMetadata } from "../../../../src/run-history/store/team-run-metadata-types.js";

vi.mock("../../../../src/agent-team-execution/services/agent-team-run-manager.js", () => ({
  AgentTeamRunManager: {
    getInstance: () => ({
      getTeamRun: vi.fn().mockReturnValue(null),
      listActiveRuns: vi.fn().mockReturnValue([]),
    }),
  },
}));

const buildMetadata = (
  overrides: Partial<TeamRunMetadata> = {},
): TeamRunMetadata => ({
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorMemberRouteKey: "planner",
  runVersion: 1,
  createdAt: "2026-03-26T10:00:00.000Z",
  updatedAt: "2026-03-26T10:00:00.000Z",
  memberMetadata: [
    {
      memberRouteKey: "planner",
      memberName: "Planner",
      memberRunId: "planner-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-1",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
      workspaceRootPath: "/tmp/workspace",
    },
  ],
  ...overrides,
});

describe("TeamRunHistoryIndexService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-index-service-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("records created team runs from metadata", async () => {
    const { TeamRunHistoryIndexService } = await import(
      "../../../../src/run-history/services/team-run-history-index-service.js"
    );
    const indexStore = new TeamRunHistoryIndexStore(memoryDir);
    const service = new TeamRunHistoryIndexService(memoryDir, {
      indexStore,
      teamRunManager: {
        getTeamRun: vi.fn().mockReturnValue(null),
        listActiveRuns: vi.fn().mockReturnValue([]),
      },
    });

    await service.recordRunCreated({
      teamRunId: "team-1",
      metadata: buildMetadata(),
      summary: "  team summary  ",
      lastKnownStatus: "ACTIVE",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
    });

    expect(await indexStore.getRow("team-1")).toEqual({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Team One",
      workspaceRootPath: "/tmp/workspace",
      summary: "team summary",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "ACTIVE",
      deleteLifecycle: "READY",
    });
  });

  it("updates summary-only activity without metadata", async () => {
    const { TeamRunHistoryIndexService } = await import(
      "../../../../src/run-history/services/team-run-history-index-service.js"
    );
    const indexStore = new TeamRunHistoryIndexStore(memoryDir);
    await indexStore.upsertRow({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Team One",
      workspaceRootPath: null,
      summary: "old",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "IDLE",
      deleteLifecycle: "READY",
    });
    const service = new TeamRunHistoryIndexService(memoryDir, {
      indexStore,
      teamRunManager: {
        getTeamRun: vi.fn().mockReturnValue(null),
        listActiveRuns: vi.fn().mockReturnValue([]),
      },
    });

    await service.recordRunActivity({
      teamRunId: "team-1",
      summary: "new summary",
      lastKnownStatus: "ACTIVE",
      lastActivityAt: "2026-03-26T11:00:00.000Z",
    });

    expect((await indexStore.getRow("team-1"))?.summary).toBe("new summary");
    expect((await indexStore.getRow("team-1"))?.lastKnownStatus).toBe("ACTIVE");
  });

  it("rebuilds ACTIVE state from live managers", async () => {
    const { TeamRunHistoryIndexService } = await import(
      "../../../../src/run-history/services/team-run-history-index-service.js"
    );
    const metadataStore = new TeamRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata("team-1", buildMetadata());
    const service = new TeamRunHistoryIndexService(memoryDir, {
      metadataStore,
      teamRunManager: {
        getTeamRun: vi.fn().mockReturnValue({}),
        listActiveRuns: vi.fn().mockReturnValue(["team-1"]),
      },
    });

    const rows = await service.rebuildIndexFromDisk();

    expect(rows[0]?.lastKnownStatus).toBe("ACTIVE");
    expect(rows[0]?.workspaceRootPath).toBe("/tmp/workspace");
  });
});
