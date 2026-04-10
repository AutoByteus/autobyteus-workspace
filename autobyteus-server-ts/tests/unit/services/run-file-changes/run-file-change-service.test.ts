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

  it("builds one path-keyed projection entry and captures committed write_file content", async () => {
    const { run, emit, localEvents, workspaceRoot, memoryDir } = await createRunHarness();
    const outputPath = path.join(workspaceRoot, "src", "hello.txt");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, "hello from disk", "utf-8");

    const service = new RunFileChangeService({
      projectionStore: new RunFileChangeProjectionStore(),
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
    });

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

    const projection = await new RunFileChangeProjectionStore().readProjection(memoryDir);
    expect(projection.entries).toHaveLength(1);
    expect(projection.entries[0]).toMatchObject({
      id: "run-1:src/hello.txt",
      path: "src/hello.txt",
      status: "available",
      sourceTool: "write_file",
      sourceInvocationId: "write-1",
      content: "hello from disk",
    });

    expect(localEvents.map((event) => event.eventType)).toContain(AgentRunEventType.FILE_CHANGE_UPDATED);
    expect(localEvents.at(-1)?.payload).toMatchObject({
      path: "src/hello.txt",
      status: "available",
      content: "hello from disk",
    });
  });

  it("reuses one visible row when the same path is touched again", async () => {
    const { run, emit, memoryDir, workspaceRoot } = await createRunHarness();
    const outputPath = path.join(workspaceRoot, "src", "same.txt");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const service = new RunFileChangeService({
      projectionStore: new RunFileChangeProjectionStore(),
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
    });

    service.attachToRun(run);

    await fs.writeFile(outputPath, "first version", "utf-8");
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

    await fs.writeFile(outputPath, "second version", "utf-8");
    await emit({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: run.runId,
      statusHint: null,
      payload: {
        id: "write-2",
        segment_type: "write_file",
        metadata: { path: "src/same.txt" },
      },
    });
    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "write-2",
        tool_name: "write_file",
        arguments: { path: "src/same.txt" },
      },
    });

    const projection = await new RunFileChangeProjectionStore().readProjection(memoryDir);
    expect(projection.entries).toHaveLength(1);
    expect(projection.entries[0]).toMatchObject({
      id: "run-1:src/same.txt",
      sourceInvocationId: "write-2",
      content: "second version",
    });
  });

  it("marks non-text file changes available without storing a text snapshot", async () => {
    const { run, emit, memoryDir, workspaceRoot } = await createRunHarness();
    const outputPath = path.join(workspaceRoot, "assets", "image.png");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const service = new RunFileChangeService({
      projectionStore: new RunFileChangeProjectionStore(),
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
    });

    service.attachToRun(run);

    await emit({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: run.runId,
      statusHint: null,
      payload: {
        invocation_id: "edit-image-1",
        tool_name: "edit_file",
        arguments: { path: "assets/image.png" },
      },
    });

    const projection = await new RunFileChangeProjectionStore().readProjection(memoryDir);
    expect(projection.entries).toHaveLength(1);
    expect(projection.entries[0]).toMatchObject({
      id: "run-1:assets/image.png",
      status: "available",
      content: null,
    });
  });

  it("clears buffered write_file content when the write fails", async () => {
    const { run, emit, localEvents, memoryDir } = await createRunHarness();

    const service = new RunFileChangeService({
      projectionStore: new RunFileChangeProjectionStore(),
      workspaceManager: {
        getWorkspaceById: vi.fn(),
      } as any,
    });

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

    const projection = await new RunFileChangeProjectionStore().readProjection(memoryDir);
    expect(projection.entries).toHaveLength(1);
    expect(projection.entries[0]).toMatchObject({
      id: "run-1:src/broken.txt",
      status: "failed",
      content: null,
    });
    expect(localEvents.at(-1)?.payload).toMatchObject({
      path: "src/broken.txt",
      status: "failed",
      content: null,
    });
  });
});
