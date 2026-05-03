import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import { RunFileChangeProjectionStore } from "../../../../src/services/run-file-changes/run-file-change-projection-store.js";
import { RunFileChangeService } from "../../../../src/services/run-file-changes/run-file-change-service.js";

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
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
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
    await emit(fileChangeEvent(run.runId, {
      path: "src/hello.txt",
      status: "available",
      sourceTool: "write_file",
      sourceInvocationId: "write-1",
      content: "hello from stream",
      updatedAt: "2026-05-03T10:00:01.000Z",
    }));

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
});
