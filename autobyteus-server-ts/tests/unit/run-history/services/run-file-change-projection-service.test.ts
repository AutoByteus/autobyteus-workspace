import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { RunFileChangeProjectionService } from "../../../../src/run-history/services/run-file-change-projection-service.js";
import { RunFileChangeService } from "../../../../src/services/run-file-changes/run-file-change-service.js";

describe("RunFileChangeProjectionService", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-change-projection-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("reads active runs from the authoritative run-file-change owner instead of projection storage", async () => {
    const activeRun = {
      runId: "run-1",
      config: {
        memoryDir: "/tmp/run-1-memory",
      },
    };
    const runFileChangeService = {
      getProjectionForRun: vi.fn().mockResolvedValue({
        version: 1,
        entries: [
          {
            id: "run-1:src/demo.txt",
            runId: "run-1",
            path: "src/demo.txt",
            type: "file",
            status: "available",
            sourceTool: "edit_file",
            sourceInvocationId: "edit-1",
            backendArtifactId: null,
            content: "fresh in-memory content",
            createdAt: "2026-04-10T04:00:00.000Z",
            updatedAt: "2026-04-10T04:00:01.000Z",
          },
        ],
      }),
    };
    const projectionStore = {
      readProjection: vi.fn().mockResolvedValue({
        version: 1,
        entries: [
          {
            id: "run-1:src/demo.txt",
            runId: "run-1",
            path: "src/demo.txt",
            type: "file",
            status: "available",
            sourceTool: "edit_file",
            sourceInvocationId: "edit-1",
            backendArtifactId: null,
            content: "stale disk content",
            createdAt: "2026-04-10T04:00:00.000Z",
            updatedAt: "2026-04-10T04:00:00.500Z",
          },
        ],
      }),
    };

    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(activeRun),
      } as any,
      metadataService: {
        readMetadata: vi.fn(),
      } as any,
      projectionStore: projectionStore as any,
      runFileChangeService: runFileChangeService as any,
    });

    const entry = await service.getEntry("run-1", "src/demo.txt");

    expect(runFileChangeService.getProjectionForRun).toHaveBeenCalledWith(activeRun);
    expect(projectionStore.readProjection).not.toHaveBeenCalled();
    expect(entry?.content).toBe("fresh in-memory content");
  });

  it("falls back to persisted projection storage for inactive historical runs", async () => {
    const projectionStore = {
      readProjection: vi.fn().mockResolvedValue({
        version: 1,
        entries: [
          {
            id: "run-2:/Users/normy/Downloads/demo.txt",
            runId: "run-2",
            path: "/Users/normy/Downloads/demo.txt",
            type: "file",
            status: "available",
            sourceTool: "edit_file",
            sourceInvocationId: "edit-2",
            backendArtifactId: null,
            content: "persisted historical content",
            createdAt: "2026-04-10T04:10:00.000Z",
            updatedAt: "2026-04-10T04:10:01.000Z",
          },
        ],
      }),
    };

    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as any,
      metadataService: {
        readMetadata: vi.fn().mockResolvedValue({
          memoryDir: "/tmp/run-2-memory",
        }),
      } as any,
      projectionStore: projectionStore as any,
      runFileChangeService: {
        getProjectionForRun: vi.fn(),
      } as any,
    });

    const projection = await service.getProjection("run-2");

    expect(projectionStore.readProjection).toHaveBeenCalledWith("/tmp/run-2-memory");
    expect(projection).toHaveLength(1);
    expect(projection[0]?.path).toBe("/Users/normy/Downloads/demo.txt");
  });

  it("serves the fresh active-run entry before projection persistence completes", async () => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const outputPath = path.join(workspaceRoot, "src", "fresh.txt");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, "fresh content from disk", "utf-8");

    const listeners = new Set<(event: unknown) => void>();
    const run = {
      runId: "run-live",
      config: {
        memoryDir,
        workspaceId: "workspace-1",
      },
      subscribeToEvents(listener: (event: unknown) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      emitLocalEvent(_event: AgentRunEvent) {},
    } as any;

    let persistedProjection = {
      version: 1 as const,
      entries: [] as Array<Record<string, unknown>>,
    };
    let notifyAvailablePersistBlocked: (() => void) | null = null;
    const availablePersistStarted = new Promise<void>((resolve) => {
      notifyAvailablePersistBlocked = resolve;
    });
    let releaseAvailablePersist: (() => void) | null = null;
    const availablePersistBlocked = new Promise<void>((resolve) => {
      releaseAvailablePersist = resolve;
    });
    const projectionStore = {
      readProjection: vi.fn(async () => persistedProjection),
      writeProjection: vi.fn(async (_memoryDir: string, projection: { entries: Array<Record<string, unknown>> }) => {
        const cloned = {
          version: 1 as const,
          entries: projection.entries.map((entry) => ({ ...entry })),
        };
        const latestStatus = cloned.entries[0]?.status;
        if (latestStatus === "available") {
          notifyAvailablePersistBlocked?.();
          await availablePersistBlocked;
        }
        persistedProjection = cloned;
      }),
    };

    const runFileChangeService = new RunFileChangeService({
      projectionStore: projectionStore as any,
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
    });
    runFileChangeService.attachToRun(run);

    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockImplementation((runId: string) => (runId === "run-live" ? run : null)),
      } as any,
      metadataService: {
        readMetadata: vi.fn(),
      } as any,
      projectionStore: projectionStore as any,
      runFileChangeService,
    });

    const emit = (event: AgentRunEvent) => {
      for (const listener of listeners) {
        listener(event);
      }
    };

    emit({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "edit-1",
        segment_type: "edit_file",
        metadata: { path: "src/fresh.txt" },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "edit-1",
        tool_name: "edit_file",
        arguments: { path: "src/fresh.txt" },
      },
    });

    await availablePersistStarted;

    const entryWhilePersistBlocked = await service.getEntry("run-live", "src/fresh.txt");

    expect(entryWhilePersistBlocked?.status).toBe("available");
    expect(entryWhilePersistBlocked?.content).toBe("fresh content from disk");
    expect(persistedProjection.entries[0]?.status).toBe("pending");

    releaseAvailablePersist?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(persistedProjection.entries[0]?.status).toBe("available");
  });
});
