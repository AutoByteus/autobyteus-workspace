import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import { RunFileChangeProjectionStore } from "../../../../src/services/run-file-changes/run-file-change-projection-store.js";
import {
  RunFileChangeService,
  bindProcessRunFileChangeService,
  getRunFileChangeService,
  releaseProcessRunFileChangeService,
} from "../../../../src/services/run-file-changes/run-file-change-service.js";
import type { RunFileChangeEntry } from "../../../../src/services/run-file-changes/run-file-change-types.js";

describe("RunFileChangeService", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-changes-"));
    tempDirs.push(tempDir);
    return tempDir;
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  const waitForCondition = async (
    predicate: () => boolean | Promise<boolean>,
    failureMessage: string,
    timeoutMs = 2000,
  ): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await predicate()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(failureMessage);
  };

  const createRunHarness = async () => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const listeners = new Set<(event: unknown) => void>();
    const localEvents: AgentRunEvent[] = [];

    const run = {
      runId: "run-1",
      config: {
        memoryDir,
        workspaceId: "workspace-1",
      },
      subscribeToEvents(listener: (event: unknown) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      emitLocalEvent(event: AgentRunEvent) {
        localEvents.push(event);
      },
    } as any;

    const emit = async (event: AgentRunEvent) => {
      for (const listener of listeners) {
        listener(event);
      }
    };

    return { run, emit, localEvents, workspaceRoot, memoryDir };
  };

  const createService = (
    workspaceRoot: string,
    projectionStore = new RunFileChangeProjectionStore(),
  ): RunFileChangeService => new RunFileChangeService({
    projectionStore,
    workspaceManager: {
      getWorkspaceById: vi.fn().mockReturnValue({
        getBasePath: () => workspaceRoot,
      }),
    } as any,
  });

  const fileChangeEvent = (
    runId: string,
    input: {
      id?: string;
      path: string;
      status?: "streaming" | "pending" | "available" | "failed";
      sourceTool?: "write_file" | "edit_file" | "generated_output";
      sourceInvocationId?: string | null;
      content?: string | null;
      type?: "file" | "image" | "audio" | "video" | "pdf" | "csv" | "excel" | "other";
      createdAt?: string;
      updatedAt?: string;
    },
  ): AgentRunEvent => {
    const timestamp = input.updatedAt ?? "2026-05-03T10:00:00.000Z";
    return {
      eventType: AgentRunEventType.FILE_CHANGE,
      runId,
      statusHint: null,
      payload: {
        id: input.id ?? `${runId}:${input.path}`,
        runId,
        path: input.path,
        type: input.type ?? "file",
        status: input.status ?? "available",
        sourceTool: input.sourceTool ?? "write_file",
        sourceInvocationId: input.sourceInvocationId ?? "write-1",
        createdAt: input.createdAt ?? timestamp,
        updatedAt: timestamp,
        ...(Object.prototype.hasOwnProperty.call(input, "content") ? { content: input.content } : {}),
      },
    };
  };

  const waitForLiveProjectionStatus = async (
    service: RunFileChangeService,
    run: any,
    status: "streaming" | "pending" | "available" | "failed",
  ) => {
    await waitForCondition(
      async () =>
        (await service.getProjectionForRun(run)).entries.some(
          (entry) => entry.path === "src/hello.txt" && entry.status === status,
        ),
      `Timed out waiting for live projection status '${status}'.`,
    );
  };

  const waitForLiveProjectionEntry = async (
    service: RunFileChangeService,
    run: any,
    predicate: (entry: RunFileChangeEntry) => boolean,
    failureMessage: string,
  ) => {
    await waitForCondition(
      async () => (await service.getProjectionForRun(run)).entries.some(predicate),
      failureMessage,
    );
  };

  const waitForPersistedProjectionStatus = async (
    projectionStore: RunFileChangeProjectionStore,
    memoryDir: string,
    input: {
      path: string;
      status: "streaming" | "pending" | "available" | "failed";
    },
  ) => {
    await waitForCondition(
      async () =>
        (await projectionStore.readProjection(memoryDir)).entries.some(
          (entry) => entry.path === input.path && entry.status === input.status,
        ),
      `Timed out waiting for persisted projection '${input.path}' status '${input.status}'.`,
    );
  };

  it("projects FILE_CHANGE events, keeps live content transient, and persists metadata only", async () => {
    const { run, emit, localEvents, workspaceRoot, memoryDir } = await createRunHarness();
    const projectionStore = new RunFileChangeProjectionStore();
    const service = createService(workspaceRoot, projectionStore);
    service.attachToRun(run);

    await emit(fileChangeEvent(run.runId, {
      path: "src/hello.txt",
      status: "streaming",
      sourceTool: "write_file",
      sourceInvocationId: "write-1",
      content: "hello from stream",
    }));
    await waitForLiveProjectionStatus(service, run, "streaming");
    await emit(fileChangeEvent(run.runId, {
      path: "src/hello.txt",
      status: "available",
      sourceTool: "write_file",
      sourceInvocationId: "write-1",
      content: "hello from stream",
      updatedAt: "2026-05-03T10:00:01.000Z",
    }));
    await waitForLiveProjectionStatus(service, run, "available");
    await waitForPersistedProjectionStatus(projectionStore, memoryDir, {
      path: "src/hello.txt",
      status: "available",
    });

    const liveProjection = await service.getProjectionForRun(run);
    expect(liveProjection.entries).toHaveLength(1);
    expect(liveProjection.entries[0]).toMatchObject({
      id: "run-1:src/hello.txt",
      path: "src/hello.txt",
      status: "available",
      sourceTool: "write_file",
      sourceInvocationId: "write-1",
      content: "hello from stream",
    });

    const persistedProjection = await projectionStore.readProjection(memoryDir);
    expect(persistedProjection.entries).toHaveLength(1);
    expect(persistedProjection.entries[0]).toMatchObject({
      id: "run-1:src/hello.txt",
      path: "src/hello.txt",
      status: "available",
      sourceTool: "write_file",
      sourceInvocationId: "write-1",
    });
    expect(persistedProjection.entries[0]?.content).toBeUndefined();
    expect(localEvents).toEqual([]);
  });

  it("canonicalizes absolute and relative FILE_CHANGE references to one workspace row", async () => {
    const { run, emit, workspaceRoot } = await createRunHarness();
    const outputPath = path.join(workspaceRoot, "src", "same.txt");

    const service = createService(workspaceRoot);
    service.attachToRun(run);

    await emit(fileChangeEvent(run.runId, {
      path: "src/same.txt",
      sourceInvocationId: "write-1",
    }));
    await emit(fileChangeEvent(run.runId, {
      path: outputPath,
      sourceInvocationId: "write-2",
      updatedAt: "2026-05-03T10:00:01.000Z",
    }));
    await waitForLiveProjectionEntry(
      service,
      run,
      (entry) => entry.path === "src/same.txt" && entry.sourceInvocationId === "write-2",
      "Timed out waiting for canonicalized live projection update.",
    );

    const liveProjection = await service.getProjectionForRun(run);
    expect(liveProjection.entries).toHaveLength(1);
    expect(liveProjection.entries[0]).toMatchObject({
      id: "run-1:src/same.txt",
      path: "src/same.txt",
      sourceInvocationId: "write-2",
    });
  });

  it("ignores unrelated activity events and only consumes FILE_CHANGE", async () => {
    const { run, emit, localEvents, workspaceRoot } = await createRunHarness();
    const service = createService(workspaceRoot);
    service.attachToRun(run);

    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "read-1",
        tool_name: "Read",
        arguments: { file_path: "src/server.py" },
        result: "print('hello')\n",
      },
    });

    const projection = await service.getProjectionForRun(run);
    expect(projection.entries).toEqual([]);
    expect(localEvents).toEqual([]);
  });

  it("records failed FILE_CHANGE status", async () => {
    const { run, emit, workspaceRoot, memoryDir } = await createRunHarness();
    const projectionStore = new RunFileChangeProjectionStore();
    const service = createService(workspaceRoot, projectionStore);
    service.attachToRun(run);

    await emit(fileChangeEvent(run.runId, {
      path: "src/broken.txt",
      status: "failed",
      sourceTool: "write_file",
      sourceInvocationId: "write-fail-1",
      content: null,
    }));
    await waitForPersistedProjectionStatus(projectionStore, memoryDir, {
      path: "src/broken.txt",
      status: "failed",
    });

    const liveProjection = await service.getProjectionForRun(run);
    expect(liveProjection.entries).toHaveLength(1);
    expect(liveProjection.entries[0]).toMatchObject({
      id: "run-1:src/broken.txt",
      status: "failed",
      content: null,
    });

    const persistedProjection = await projectionStore.readProjection(memoryDir);
    expect(persistedProjection.entries).toHaveLength(1);
    expect(persistedProjection.entries[0]).toMatchObject({
      id: "run-1:src/broken.txt",
      status: "failed",
    });
    expect(persistedProjection.entries[0]?.content).toBeUndefined();
  });

  describe("attached-run projection cache", () => {
    const storedEntry = (runId: string, filePath: string) => ({
      id: `${runId}:${filePath}`, runId, path: filePath, type: "file" as const, status: "available" as const,
      sourceTool: "write_file" as const, sourceInvocationId: null,
      createdAt: "2026-05-03T10:00:00.000Z", updatedAt: "2026-05-03T10:00:00.000Z",
    });
    const storedPaths = async (service: RunFileChangeService, run: any): Promise<string[]> =>
      (await service.getProjectionForRun(run)).entries.map((entry) => entry.path).sort();

    it("reads an unattached run fresh from disk on every request", async () => {
      const { run, workspaceRoot, memoryDir } = await createRunHarness();
      const projectionStore = new RunFileChangeProjectionStore();
      const service = createService(workspaceRoot, projectionStore);

      await projectionStore.writeProjection(memoryDir, { version: 2, entries: [storedEntry(run.runId, "src/a.txt")] });
      expect(await storedPaths(service, run)).toEqual(["src/a.txt"]);

      await projectionStore.writeProjection(memoryDir, {
        version: 2,
        entries: [storedEntry(run.runId, "src/a.txt"), storedEntry(run.runId, "src/b.txt")],
      });
      expect(await storedPaths(service, run)).toEqual(["src/a.txt", "src/b.txt"]);
      await expect(service.getProjectionForCollaborationMember({
        agentRunId: run.runId, memoryDir, workspaceRootPath: workspaceRoot,
      })).resolves.toMatchObject({ entries: [{ path: "src/a.txt" }, { path: "src/b.txt" }] });
    });

    it("drops the live projection when the run is detached", async () => {
      const { run, emit, workspaceRoot, memoryDir } = await createRunHarness();
      const projectionStore = new RunFileChangeProjectionStore();
      const service = createService(workspaceRoot, projectionStore);
      const detach = service.attachToRun(run);
      await emit(fileChangeEvent(run.runId, { path: "src/a.txt" }));
      await waitForPersistedProjectionStatus(projectionStore, memoryDir, { path: "src/a.txt", status: "available" });
      expect(await storedPaths(service, run)).toEqual(["src/a.txt"]);

      detach();
      await projectionStore.writeProjection(memoryDir, {
        version: 2,
        entries: [storedEntry(run.runId, "src/a.txt"), storedEntry(run.runId, "src/later.txt")],
      });
      expect(await storedPaths(service, run)).toEqual(["src/a.txt", "src/later.txt"]);
    });

    it("does not re-cache a run whose FILE_CHANGE handling finishes after detach", async () => {
      const { run, emit, workspaceRoot, memoryDir } = await createRunHarness();
      const projectionStore = new RunFileChangeProjectionStore();
      const read = projectionStore.readProjection.bind(projectionStore);
      let releaseRead!: () => void;
      const readGate = new Promise<void>((resolve) => { releaseRead = resolve; });
      vi.spyOn(projectionStore, "readProjection").mockImplementationOnce(async (dir: string) => {
        await readGate;
        return read(dir);
      });
      const service = createService(workspaceRoot, projectionStore);
      const detach = service.attachToRun(run);

      await emit(fileChangeEvent(run.runId, { path: "src/a.txt" }));
      detach();
      releaseRead();
      await waitForPersistedProjectionStatus(projectionStore, memoryDir, { path: "src/a.txt", status: "available" });

      await projectionStore.writeProjection(memoryDir, {
        version: 2,
        entries: [storedEntry(run.runId, "src/a.txt"), storedEntry(run.runId, "src/later.txt")],
      });
      // A restored run attaches again: it must start from the stored record, not a projection left by the late handler.
      service.attachToRun(run);
      expect(await storedPaths(service, run)).toEqual(["src/a.txt", "src/later.txt"]);
    });
  });

  describe("process authority binding", () => {
    it("requires an explicitly bound process instance and releases only that instance", () => {
      expect(() => getRunFileChangeService()).toThrow("The process RunFileChangeService is not initialized.");
      const service = new RunFileChangeService({ workspaceManager: {} as never });
      const other = new RunFileChangeService({ workspaceManager: {} as never });
      bindProcessRunFileChangeService(service);
      try {
        expect(getRunFileChangeService()).toBe(service);
        expect(() => bindProcessRunFileChangeService(other)).toThrow("already initialized");
        releaseProcessRunFileChangeService(other);
        expect(getRunFileChangeService()).toBe(service);
      } finally {
        releaseProcessRunFileChangeService(service);
      }
      expect(() => getRunFileChangeService()).toThrow("not initialized");
      expect(() => bindProcessRunFileChangeService(null as never)).toThrow("instance is required");
    });
  });
});
