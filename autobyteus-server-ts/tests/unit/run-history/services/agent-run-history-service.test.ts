import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RunHistoryIndexRow } from "../../../../src/run-history/domain/agent-run-history-index-types.js";

const agentRunManagerMock = {
  hasActiveRun: vi.fn<(runId: string) => boolean>(),
  listActiveRuns: vi.fn<() => string[]>(),
};

vi.mock("../../../../src/agent-execution/services/agent-run-manager.js", () => ({
  AgentRunManager: {
    getInstance: () => agentRunManagerMock,
  },
}));

vi.mock("../../../../src/agent-definition/services/agent-definition-service.js", () => ({
  AgentDefinitionService: {
    getInstance: () => ({
      getAgentDefinitionById: vi.fn(),
    }),
  },
}));

describe("AgentRunHistoryService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-history-service-"));
    agentRunManagerMock.hasActiveRun.mockReset();
    agentRunManagerMock.listActiveRuns.mockReset();
    agentRunManagerMock.hasActiveRun.mockReturnValue(false);
    agentRunManagerMock.listActiveRuns.mockReturnValue([]);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("lists grouped history from index rows and overlays live active state", async () => {
    const { AgentRunHistoryService } = await import(
      "../../../../src/run-history/services/agent-run-history-service.js"
    );

    const rows: RunHistoryIndexRow[] = [
      {
        runId: "run-active",
        agentDefinitionId: "agent-b",
        agentName: "Builder",
        workspaceRootPath: "/tmp/workspace-a/",
        summary: "older active row",
        lastActivityAt: "2026-03-25T08:00:00.000Z",
        lastKnownStatus: "IDLE",
      },
      {
        runId: "run-idle-newer",
        agentDefinitionId: "agent-b",
        agentName: "Builder",
        workspaceRootPath: "/tmp/workspace-a",
        summary: "newer idle row",
        lastActivityAt: "2026-03-26T08:00:00.000Z",
        lastKnownStatus: "IDLE",
      },
      {
        runId: "run-terminated",
        agentDefinitionId: "agent-a",
        agentName: "Analyst",
        workspaceRootPath: "/tmp/workspace-b",
        summary: "terminated row",
        lastActivityAt: "2026-03-24T08:00:00.000Z",
        lastKnownStatus: "TERMINATED",
      },
    ];

    agentRunManagerMock.listActiveRuns.mockReturnValue(["run-active"]);

    const service = new AgentRunHistoryService(memoryDir, {
      indexService: {
        listRows: vi.fn().mockResolvedValue(rows),
        rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
        removeRow: vi.fn(),
      },
    });

    const result = await service.listRunHistory(1);

    expect(result).toEqual([
      {
        workspaceRootPath: "/tmp/workspace-a",
        workspaceName: "workspace-a",
        agents: [
          {
            agentDefinitionId: "agent-b",
            agentName: "Builder",
            runs: [
              {
                runId: "run-idle-newer",
                summary: "newer idle row",
                lastActivityAt: "2026-03-26T08:00:00.000Z",
                lastKnownStatus: "IDLE",
                isActive: false,
              },
            ],
          },
        ],
      },
      {
        workspaceRootPath: "/tmp/workspace-b",
        workspaceName: "workspace-b",
        agents: [
          {
            agentDefinitionId: "agent-a",
            agentName: "Analyst",
            runs: [
              {
                runId: "run-terminated",
                summary: "terminated row",
                lastActivityAt: "2026-03-24T08:00:00.000Z",
                lastKnownStatus: "TERMINATED",
                isActive: false,
              },
            ],
          },
        ],
      },
    ]);
  });

  it("rebuilds the index from disk when the index is empty", async () => {
    const { AgentRunHistoryService } = await import(
      "../../../../src/run-history/services/agent-run-history-service.js"
    );

    const rebuildRows: RunHistoryIndexRow[] = [
      {
        runId: "run-1",
        agentDefinitionId: "agent-1",
        agentName: "Agent One",
        workspaceRootPath: "/tmp/workspace",
        summary: "rebuilt",
        lastActivityAt: "2026-03-26T08:00:00.000Z",
        lastKnownStatus: "IDLE",
      },
    ];

    const indexService = {
      listRows: vi.fn().mockResolvedValue([]),
      rebuildIndexFromDisk: vi.fn().mockResolvedValue(rebuildRows),
      removeRow: vi.fn(),
    };

    const service = new AgentRunHistoryService(memoryDir, { indexService });
    const result = await service.listRunHistory();

    expect(indexService.rebuildIndexFromDisk).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]?.agents[0]?.runs[0]?.runId).toBe("run-1");
  });

  it("deletes the stored run directory and removes the index row", async () => {
    const { AgentRunHistoryService } = await import(
      "../../../../src/run-history/services/agent-run-history-service.js"
    );

    const runDir = path.join(memoryDir, "agents", "run-delete");
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(runDir, "run_metadata.json"), "{}", "utf-8");

    const indexService = {
      listRows: vi.fn().mockResolvedValue([]),
      rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
      removeRow: vi.fn().mockResolvedValue(undefined),
    };

    const service = new AgentRunHistoryService(memoryDir, { indexService });
    const result = await service.deleteStoredRun("run-delete");

    expect(result).toEqual({
      success: true,
      message: "Run 'run-delete' deleted permanently.",
    });
    expect(indexService.removeRow).toHaveBeenCalledWith("run-delete");
    await expect(fs.stat(runDir)).rejects.toThrow();
  });

  it("refuses to delete a live active run", async () => {
    const { AgentRunHistoryService } = await import(
      "../../../../src/run-history/services/agent-run-history-service.js"
    );

    agentRunManagerMock.hasActiveRun.mockReturnValue(true);

    const indexService = {
      listRows: vi.fn().mockResolvedValue([]),
      rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
      removeRow: vi.fn(),
    };

    const service = new AgentRunHistoryService(memoryDir, { indexService });
    const result = await service.deleteStoredRun("run-active");

    expect(result).toEqual({
      success: false,
      message: "Run is active. Terminate it before deleting history.",
    });
    expect(indexService.removeRow).not.toHaveBeenCalled();
  });
});
