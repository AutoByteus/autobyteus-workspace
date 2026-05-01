import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { RunHistoryIndexRow } from "../../../../src/run-history/domain/agent-run-history-index-types.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

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

const buildAgentMetadata = (
  runId: string,
  memoryDir: string,
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: path.join(memoryDir, "agents", runId),
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  lastKnownStatus: "IDLE",
  archivedAt: null,
  applicationExecutionContext: null,
  ...overrides,
});

describe("AgentRunHistoryService", () => {
  let memoryDir: string;
  const createMetadataStore = (
    metadataByRunId: Record<string, Partial<AgentRunMetadata> | null>,
  ) => ({
    readMetadata: vi.fn(async (runId: string) => {
      const metadata = metadataByRunId[runId];
      return metadata ? buildAgentMetadata(runId, memoryDir, metadata) : null;
    }),
    writeMetadata: vi.fn(),
  });

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
      metadataStore: createMetadataStore(Object.fromEntries(rows.map((row) => [row.runId, {}]))) as any,
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

    const service = new AgentRunHistoryService(memoryDir, {
      indexService,
      metadataStore: createMetadataStore(Object.fromEntries(rebuildRows.map((row) => [row.runId, {}]))) as any,
    });
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

  it("archives a stored run by writing metadata without deleting memory or index rows", async () => {
    const { AgentRunHistoryService } = await import(
      "../../../../src/run-history/services/agent-run-history-service.js"
    );

    const metadataStore = new AgentRunMetadataStore(memoryDir);
    const runDir = path.join(memoryDir, "agents", "run-archive");
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(runDir, "raw_traces.jsonl"), "{}", "utf-8");
    await metadataStore.writeMetadata(
      "run-archive",
      buildAgentMetadata("run-archive", memoryDir, {
        applicationExecutionContext: {
          applicationId: "app-1",
          bindingId: "binding-1",
          producer: {
            runId: "run-archive",
            memberRouteKey: "agent",
            memberName: "Agent",
            displayName: "Agent",
            runtimeKind: "AGENT",
            teamPath: [],
          },
        },
      }),
    );

    const indexService = {
      listRows: vi.fn().mockResolvedValue([]),
      rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
      removeRow: vi.fn(),
    };
    const service = new AgentRunHistoryService(memoryDir, {
      indexService,
      metadataStore,
    });

    const result = await service.archiveStoredRun("run-archive");
    const archivedMetadata = await metadataStore.readMetadata("run-archive");

    expect(result.success).toBe(true);
    expect(result.message).toBe("Run 'run-archive' archived.");
    expect(archivedMetadata?.archivedAt).toEqual(expect.any(String));
    expect(archivedMetadata?.applicationExecutionContext?.applicationId).toBe("app-1");
    await expect(fs.stat(runDir)).resolves.toBeTruthy();
    await expect(fs.stat(path.join(runDir, "raw_traces.jsonl"))).resolves.toBeTruthy();
    expect(indexService.removeRow).not.toHaveBeenCalled();
  });

  it("refuses to archive a live active run without writing metadata", async () => {
    const { AgentRunHistoryService } = await import(
      "../../../../src/run-history/services/agent-run-history-service.js"
    );

    agentRunManagerMock.hasActiveRun.mockReturnValue(true);
    const metadataStore = createMetadataStore({ "run-active": {} });
    const service = new AgentRunHistoryService(memoryDir, {
      indexService: {
        listRows: vi.fn().mockResolvedValue([]),
        rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
        removeRow: vi.fn(),
      },
      metadataStore: metadataStore as any,
    });

    const result = await service.archiveStoredRun("run-active");

    expect(result).toEqual({
      success: false,
      message: "Run is active. Terminate it before archiving history.",
    });
    expect(metadataStore.readMetadata).not.toHaveBeenCalled();
    expect(metadataStore.writeMetadata).not.toHaveBeenCalled();
  });

  it("rejects unsafe archive run IDs before metadata access and creates no out-of-root file", async () => {
    const { AgentRunHistoryService } = await import(
      "../../../../src/run-history/services/agent-run-history-service.js"
    );

    const metadataStore = createMetadataStore({});
    const service = new AgentRunHistoryService(memoryDir, {
      indexService: {
        listRows: vi.fn().mockResolvedValue([]),
        rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
        removeRow: vi.fn(),
      },
      metadataStore: metadataStore as any,
    });

    for (const unsafeRunId of ["", "   ", "temp-1", "../outside", "/tmp/outside", "foo/bar", "foo\\bar", ".", ".."]) {
      const result = await service.archiveStoredRun(unsafeRunId);
      expect(result.success).toBe(false);
    }

    expect(metadataStore.readMetadata).not.toHaveBeenCalled();
    expect(metadataStore.writeMetadata).not.toHaveBeenCalled();
    await expect(fs.stat(path.join(memoryDir, "outside", "run_metadata.json"))).rejects.toThrow();
  });

  it("filters archived inactive runs from listing while keeping archived active runs visible", async () => {
    const { AgentRunHistoryService } = await import(
      "../../../../src/run-history/services/agent-run-history-service.js"
    );

    const rows: RunHistoryIndexRow[] = [
      {
        runId: "run-archived-inactive",
        agentDefinitionId: "agent-def-1",
        agentName: "Agent",
        workspaceRootPath: "/tmp/workspace",
        summary: "hidden",
        lastActivityAt: "2026-03-27T08:00:00.000Z",
        lastKnownStatus: "IDLE",
      },
      {
        runId: "run-archived-active",
        agentDefinitionId: "agent-def-1",
        agentName: "Agent",
        workspaceRootPath: "/tmp/workspace",
        summary: "visible active",
        lastActivityAt: "2026-03-26T08:00:00.000Z",
        lastKnownStatus: "IDLE",
      },
      {
        runId: "run-visible",
        agentDefinitionId: "agent-def-1",
        agentName: "Agent",
        workspaceRootPath: "/tmp/workspace",
        summary: "visible",
        lastActivityAt: "2026-03-25T08:00:00.000Z",
        lastKnownStatus: "IDLE",
      },
    ];
    agentRunManagerMock.listActiveRuns.mockReturnValue(["run-archived-active"]);

    const service = new AgentRunHistoryService(memoryDir, {
      indexService: {
        listRows: vi.fn().mockResolvedValue(rows),
        rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
        removeRow: vi.fn(),
      },
      metadataStore: createMetadataStore({
        "run-archived-inactive": { archivedAt: "2026-05-01T10:00:00.000Z" },
        "run-archived-active": { archivedAt: "2026-05-01T10:00:00.000Z" },
        "run-visible": {},
      }) as any,
    });

    const result = await service.listRunHistory(2);
    const runIds = result.flatMap((workspace) =>
      workspace.agents.flatMap((agent) => agent.runs.map((run) => run.runId)),
    );

    expect(runIds).toEqual(["run-archived-active", "run-visible"]);
    expect(result[0]?.agents[0]?.runs[0]).toEqual(expect.objectContaining({
      runId: "run-archived-active",
      isActive: true,
      lastKnownStatus: "ACTIVE",
    }));
  });
});
