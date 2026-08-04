import { describe, expect, it, vi } from "vitest";
import {
  AgentRunStatusProjectionService,
  type AgentRunStatusProjection,
} from "../../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { AgentRunHistoryService } from "../../../../src/run-history/services/agent-run-history-service.js";
import type { RunHistoryIndexRow } from "../../../../src/run-history/domain/agent-run-history-index-types.js";

const buildRow = (overrides: Partial<RunHistoryIndexRow> = {}): RunHistoryIndexRow => ({
  runId: "run-1",
  agentDefinitionId: "agent-def-1",
  agentName: "Agent One",
  workspaceRootPath: "/tmp/workspace",
  summary: "summary",
  createdAt: "2026-03-26T10:00:00.000Z",
  archivedAt: null,
  terminatedAt: null,
  ...overrides,
});

const buildProjection = (
  overrides: Partial<AgentRunStatusProjection> = {},
): AgentRunStatusProjection => ({
  runId: overrides.runId ?? "run-1",
  status: "offline",
  isActive: false,
  shouldConnectStream: false,
  lastKnownStatus: "IDLE",
  statusSource: "HISTORICAL_METADATA",
  statusPayload: {
    status: "offline",
    agent_id: overrides.runId ?? "run-1",
  },
  command: null,
  ...overrides,
});

const buildService = (options: {
  rows?: RunHistoryIndexRow[];
  projectionByRunId?: Record<string, Partial<AgentRunStatusProjection>>;
  archiveResult?: { success: boolean; message: string };
  deleteResult?: { success: boolean; message: string };
} = {}) => {
  const rows = options.rows ?? [];
  const projectionByRunId = options.projectionByRunId ?? {};
  const catalogService = {
    listCatalogRows: vi.fn().mockResolvedValue(rows),
    archiveRun: vi.fn().mockResolvedValue(options.archiveResult ?? {
      success: true,
      message: "archived",
    }),
    deleteRun: vi.fn().mockResolvedValue(options.deleteResult ?? {
      success: true,
      message: "deleted",
    }),
  };
  const statusProjectionService = {
    getCatalogListStatusProjection: vi.fn((runId: string) =>
      buildProjection({ runId, ...(projectionByRunId[runId] ?? {}) }),
    ),
  };
  const service = new AgentRunHistoryService("/tmp/memory", {
    catalogService: catalogService as never,
    statusProjectionService: statusProjectionService as never,
    agentRunManager: {} as never,
    metadataStore: {} as never,
  });
  return { service, catalogService, statusProjectionService };
};

describe("AgentRunHistoryService", () => {
  it("lists grouped standalone history from V2 catalog rows and overlays live status", async () => {
    const rows = [
      buildRow({
        runId: "run-active-older",
        agentDefinitionId: "agent-b",
        agentName: "Builder",
        workspaceRootPath: "/tmp/workspace-a/",
        summary: "older active row",
        createdAt: "2026-03-25T08:00:00.000Z",
      }),
      buildRow({
        runId: "run-idle-newer",
        agentDefinitionId: "agent-b",
        agentName: "Builder",
        workspaceRootPath: "/tmp/workspace-a",
        summary: "newer idle row",
        createdAt: "2026-03-26T08:00:00.000Z",
      }),
      buildRow({
        runId: "run-terminated",
        agentDefinitionId: "agent-a",
        agentName: "Analyst",
        workspaceRootPath: "/tmp/workspace-b",
        summary: "terminated row",
        createdAt: "2026-03-24T08:00:00.000Z",
        terminatedAt: "2026-03-24T09:00:00.000Z",
      }),
    ];
    const { service, catalogService, statusProjectionService } = buildService({
      rows,
      projectionByRunId: {
        "run-active-older": {
          status: "running",
          isActive: true,
          shouldConnectStream: true,
          lastKnownStatus: "ACTIVE",
          statusSource: "ACTIVE_RUNTIME",
        },
      },
    });

    const result = await service.listRunHistory(1);

    expect(catalogService.listCatalogRows).toHaveBeenCalledTimes(1);
    expect(statusProjectionService.getCatalogListStatusProjection).toHaveBeenCalledTimes(2);
    expect(statusProjectionService.getCatalogListStatusProjection).not.toHaveBeenCalledWith("run-active-older");
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
                status: "offline",
                isActive: false,
                shouldConnectStream: false,
                statusSource: "HISTORICAL_METADATA",
                createdAt: "2026-03-26T08:00:00.000Z",
                archivedAt: null,
                terminatedAt: null,
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
                status: "offline",
                isActive: false,
                shouldConnectStream: false,
                statusSource: "TERMINATED_METADATA",
                createdAt: "2026-03-24T08:00:00.000Z",
                archivedAt: null,
                terminatedAt: "2026-03-24T09:00:00.000Z",
              },
            ],
          },
        ],
      },
    ]);
  });

  it("filters archived rows from normal listing without status projection work", async () => {
    const { service, statusProjectionService } = buildService({
      rows: [
        buildRow({
          runId: "run-archived-inactive",
          summary: "hidden",
          createdAt: "2026-03-27T08:00:00.000Z",
          archivedAt: "2026-03-28T08:00:00.000Z",
        }),
        buildRow({
          runId: "run-visible",
          summary: "visible",
          createdAt: "2026-03-25T08:00:00.000Z",
        }),
      ],
    });

    const result = await service.listRunHistory(3);
    const runs = result.flatMap((workspace) =>
      workspace.agents.flatMap((agent) => agent.runs),
    );

    expect(runs.map((run) => run.runId)).toEqual(["run-visible"]);
    expect(statusProjectionService.getCatalogListStatusProjection).toHaveBeenCalledTimes(1);
    expect(statusProjectionService.getCatalogListStatusProjection).toHaveBeenCalledWith("run-visible");
  });

  it("does not read metadata or project rows beyond the per-agent limit for catalog listing", async () => {
    const rows = [
      buildRow({ runId: "run-newest", createdAt: "2026-03-27T08:00:00.000Z" }),
      buildRow({ runId: "run-middle", createdAt: "2026-03-26T08:00:00.000Z" }),
      buildRow({ runId: "run-oldest", createdAt: "2026-03-25T08:00:00.000Z" }),
    ];
    const readMetadata = vi.fn().mockResolvedValue(null);
    const statusProjectionService = new AgentRunStatusProjectionService({
      agentRunManager: { getActiveRun: vi.fn().mockReturnValue(null) } as never,
      metadataService: { readMetadata } as never,
    });
    const projectionSpy = vi.spyOn(statusProjectionService, "getCatalogListStatusProjection");
    const service = new AgentRunHistoryService("/tmp/memory", {
      catalogService: {
        listCatalogRows: vi.fn().mockResolvedValue(rows),
        archiveRun: vi.fn(),
        deleteRun: vi.fn(),
      } as never,
      statusProjectionService,
      agentRunManager: {} as never,
      metadataStore: {} as never,
    });

    const result = await service.listRunHistory(1);

    expect(result[0]?.agents[0]?.runs.map((run) => run.runId)).toEqual(["run-newest"]);
    expect(projectionSpy).toHaveBeenCalledTimes(1);
    expect(projectionSpy).toHaveBeenCalledWith("run-newest");
    expect(readMetadata).not.toHaveBeenCalled();
  });

  it("uses catalog-list live overlays without metadata reads", async () => {
    const { service } = buildService({
      rows: [
        buildRow({
          runId: "run-visible",
          summary: "visible",
          createdAt: "2026-03-25T08:00:00.000Z",
        }),
      ],
      projectionByRunId: {
        "run-visible": {
          status: "running",
          isActive: true,
          shouldConnectStream: true,
          lastKnownStatus: "ACTIVE",
          statusSource: "ACTIVE_RUNTIME",
        },
      },
    });

    const result = await service.listRunHistory(3);
    const runs = result.flatMap((workspace) =>
      workspace.agents.flatMap((agent) => agent.runs),
    );

    expect(runs.map((run) => run.runId)).toEqual(["run-visible"]);
    expect(runs[0]).toEqual(expect.objectContaining({
      runId: "run-visible",
      status: "running",
      isActive: true,
    }));
  });

  it("delegates archive and delete mutations to the catalog boundary", async () => {
    const { service, catalogService } = buildService({
      archiveResult: { success: true, message: "Run 'run-1' archived." },
      deleteResult: { success: true, message: "Run 'run-1' deleted permanently." },
    });

    await expect(service.archiveStoredRun("run-1")).resolves.toEqual({
      success: true,
      message: "Run 'run-1' archived.",
    });
    await expect(service.deleteStoredRun("run-1")).resolves.toEqual({
      success: true,
      message: "Run 'run-1' deleted permanently.",
    });
    expect(catalogService.archiveRun).toHaveBeenCalledWith("run-1");
    expect(catalogService.deleteRun).toHaveBeenCalledWith("run-1");
  });
});
