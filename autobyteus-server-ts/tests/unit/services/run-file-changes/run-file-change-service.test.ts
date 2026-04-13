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

  it("builds one path-keyed projection entry, keeps live write content transient, and persists metadata only", async () => {
    const { run, emit, localEvents, workspaceRoot, memoryDir } = await createRunHarness();
    const outputPath = path.join(workspaceRoot, "src", "hello.txt");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, "hello from stream", "utf-8");

    const projectionStore = new RunFileChangeProjectionStore();
    const service = createService(workspaceRoot, projectionStore);
    service.attachToRun(run);

    await emit({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "write-1",
        segment_type: "write_file",
        metadata: { path: "src/hello.txt" },
      },
    });
    await emit({
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "write-1",
        segment_type: "write_file",
        delta: "hello from stream",
      },
    });
    await emit({
      eventType: AgentRunEventType.SEGMENT_END,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "write-1",
        segment_type: "write_file",
      },
    });
    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "write-1",
        tool_name: "write_file",
        arguments: { path: "src/hello.txt" },
      },
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

    expect(localEvents.map((event) => event.eventType)).toContain(AgentRunEventType.FILE_CHANGE_UPDATED);
    expect(localEvents.at(-1)?.payload).toMatchObject({
      path: "src/hello.txt",
      status: "available",
      content: "hello from stream",
    });
  });

  it("canonicalizes absolute and relative references to the same workspace file into one row", async () => {
    const { run, emit, workspaceRoot } = await createRunHarness();
    const outputPath = path.join(workspaceRoot, "src", "same.txt");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, "second version", "utf-8");

    const service = createService(workspaceRoot);
    service.attachToRun(run);

    await emit({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "write-1",
        segment_type: "write_file",
        metadata: { path: "src/same.txt" },
      },
    });
    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "write-1",
        tool_name: "write_file",
        arguments: { path: "src/same.txt" },
      },
    });

    await emit({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "write-2",
        segment_type: "write_file",
        metadata: { path: outputPath },
      },
    });
    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "write-2",
        tool_name: "write_file",
        arguments: { path: outputPath },
      },
    });

    const liveProjection = await service.getProjectionForRun(run);
    expect(liveProjection.entries).toHaveLength(1);
    expect(liveProjection.entries[0]).toMatchObject({
      id: "run-1:src/same.txt",
      path: "src/same.txt",
      sourceInvocationId: "write-2",
    });
  });

  it("captures generated outputs from cached invocation context when the success payload omits arguments", async () => {
    const { run, emit, localEvents, workspaceRoot } = await createRunHarness();
    const outputPath = path.join(workspaceRoot, "assets", "image.png");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const service = createService(workspaceRoot);
    service.attachToRun(run);

    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_STARTED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "image-1:0",
        tool_name: "generate_image",
        arguments: { output_file_path: "assets/image.png" },
      },
    });
    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "image-1",
        tool_name: "generate_image",
        result: { ok: true },
      },
    });

    const liveProjection = await service.getProjectionForRun(run);
    expect(liveProjection.entries).toHaveLength(1);
    expect(liveProjection.entries[0]).toMatchObject({
      id: "run-1:assets/image.png",
      path: "assets/image.png",
      type: "image",
      status: "available",
      sourceTool: "generated_output",
      sourceInvocationId: "image-1",
    });
    expect(liveProjection.entries[0]?.content).toBeUndefined();

    expect(localEvents.at(-1)?.payload).toMatchObject({
      path: "assets/image.png",
      sourceTool: "generated_output",
      status: "available",
    });
  });

  it("clears buffered write_file content when the write fails", async () => {
    const { run, emit, localEvents, workspaceRoot, memoryDir } = await createRunHarness();
    const projectionStore = new RunFileChangeProjectionStore();
    const service = createService(workspaceRoot, projectionStore);
    service.attachToRun(run);

    await emit({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "write-fail-1",
        segment_type: "write_file",
        metadata: { path: "src/broken.txt" },
      },
    });
    await emit({
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "write-fail-1",
        segment_type: "write_file",
        delta: "draft that never committed",
      },
    });
    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_FAILED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "write-fail-1",
        tool_name: "write_file",
        arguments: { path: "src/broken.txt" },
        error: "permission denied",
      },
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

    expect(localEvents.at(-1)?.payload).toMatchObject({
      path: "src/broken.txt",
      status: "failed",
      content: null,
    });
  });
});
