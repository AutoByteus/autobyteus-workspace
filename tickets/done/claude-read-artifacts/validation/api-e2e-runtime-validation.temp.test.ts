import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeSessionEventConverter } from "../../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { RunFileChangeProjectionStore } from "../../../../src/services/run-file-changes/run-file-change-projection-store.js";
import { RunFileChangeService } from "../../../../src/services/run-file-changes/run-file-change-service.js";

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const flushServiceQueue = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("API/E2E runtime validation for Claude read artifact classification", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  const createTempDir = async (): Promise<string> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "api-e2e-claude-artifacts-"));
    tempDirs.push(tempDir);
    return tempDir;
  };

  const createHarness = async (runId: string) => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const listeners = new Set<(event: unknown) => void>();
    const fileChangeEvents: AgentRunEvent[] = [];

    const run = {
      runId,
      config: {
        memoryDir,
        workspaceId: `${runId}-workspace`,
      },
      subscribeToEvents(listener: (event: unknown) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      emitLocalEvent(event: AgentRunEvent) {
        fileChangeEvents.push(event);
      },
    } as any;

    const projectionStore = new RunFileChangeProjectionStore();
    const service = new RunFileChangeService({
      projectionStore,
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
    });
    service.attachToRun(run);

    const emit = async (event: AgentRunEvent) => {
      for (const listener of listeners) {
        listener(event);
      }
      await flushServiceQueue();
    };

    return { run, emit, fileChangeEvents, workspaceRoot, memoryDir, service, projectionStore };
  };

  const convertClaudeLifecycle = (
    runId: string,
    invocationId: string,
    toolName: string,
    toolArgs: Record<string, unknown>,
    result: unknown,
  ): AgentRunEvent[] => {
    const converter = new ClaudeSessionEventConverter(runId);
    return [
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
        params: {
          invocation_id: invocationId,
          tool_name: toolName,
          arguments: toolArgs,
        },
      }),
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
        params: {
          invocation_id: invocationId,
          tool_name: toolName,
          arguments: toolArgs,
          result,
        },
      }),
    ];
  };

  const emitEvents = async (
    emit: (event: AgentRunEvent) => Promise<void>,
    events: AgentRunEvent[],
  ): Promise<void> => {
    for (const event of events) {
      await emit(event);
    }
  };

  it("keeps Claude Read activity-only while preserving mutations and explicit generated outputs", async () => {
    const evidence: Record<string, unknown> = {};

    // Scenario V-001: Realistic Claude SDK Read lifecycle is still visible as activity/tool events
    // but emits no live FILE_CHANGE_UPDATED event and does not persist a projection file.
    {
      const { run, emit, fileChangeEvents, workspaceRoot, memoryDir, service, projectionStore } = await createHarness("validation-read-run");
      const readPath = path.join(workspaceRoot, "src", "server.py");
      await fs.mkdir(path.dirname(readPath), { recursive: true });
      await fs.writeFile(readPath, "print('read-only')\n", "utf-8");

      const activityEvents = convertClaudeLifecycle(run.runId, "read-1", "Read", { file_path: readPath }, "print('read-only')\n");
      await emitEvents(emit, activityEvents);

      const liveProjection = await service.getProjectionForRun(run);
      const persistedProjection = await projectionStore.readProjection(memoryDir);
      const persistedFilePath = path.join(memoryDir, "file_changes.json");

      evidence.readOnly = {
        activityEventTypes: activityEvents.map((event) => event.eventType),
        activityPayloads: activityEvents.map((event) => event.payload),
        emittedFileChangeCount: fileChangeEvents.length,
        liveProjectionEntries: liveProjection.entries,
        persistedProjectionEntries: persistedProjection.entries,
        persistedFileExists: await fileExists(persistedFilePath),
      };

      expect(activityEvents.map((event) => event.eventType)).toEqual([
        AgentRunEventType.TOOL_EXECUTION_STARTED,
        AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      ]);
      expect(activityEvents[0]?.payload).toMatchObject({
        tool_name: "Read",
        arguments: { file_path: readPath },
      });
      expect(fileChangeEvents).toHaveLength(0);
      expect(liveProjection.entries).toEqual([]);
      expect(persistedProjection.entries).toEqual([]);
      expect(await fileExists(persistedFilePath)).toBe(false);
    }

    // Scenario V-002: Claude mutation tool names canonicalize to write_file/edit_file rows.
    {
      const mutationResults: Record<string, unknown> = {};
      for (const spec of [
        {
          toolName: "Write",
          relativePath: "src/claude-write.txt",
          args: (targetPath: string) => ({ file_path: targetPath, content: "hello\n" }),
          result: (targetPath: string) => ({ type: "create", filePath: targetPath }),
          expectedSourceTool: "write_file",
        },
        {
          toolName: "Edit",
          relativePath: "src/claude-edit.txt",
          args: (targetPath: string) => ({ file_path: targetPath, old_string: "before", new_string: "after" }),
          result: (targetPath: string) => ({ filePath: targetPath }),
          expectedSourceTool: "edit_file",
        },
        {
          toolName: "MultiEdit",
          relativePath: "src/claude-multiedit.txt",
          args: (targetPath: string) => ({ file_path: targetPath, edits: [{ old_string: "before", new_string: "after" }] }),
          result: (targetPath: string) => ({ filePath: targetPath }),
          expectedSourceTool: "edit_file",
        },
        {
          toolName: "NotebookEdit",
          relativePath: "notebooks/example.ipynb",
          args: (targetPath: string) => ({ notebook_path: targetPath, new_source: "print('after')", edit_mode: "replace" }),
          result: (targetPath: string) => ({ notebook_path: targetPath }),
          expectedSourceTool: "edit_file",
        },
      ]) {
        const { run, emit, fileChangeEvents, workspaceRoot, service } = await createHarness(`validation-${spec.toolName.toLowerCase()}-run`);
        const targetPath = path.join(workspaceRoot, spec.relativePath);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, "after\n", "utf-8");

        const activityEvents = convertClaudeLifecycle(
          run.runId,
          `invoke-${spec.toolName}`,
          spec.toolName,
          spec.args(targetPath),
          spec.result(targetPath),
        );
        await emitEvents(emit, activityEvents);
        const projection = await service.getProjectionForRun(run);

        mutationResults[spec.toolName] = {
          activityEventTypes: activityEvents.map((event) => event.eventType),
          emittedFileChangePayloads: fileChangeEvents.map((event) => event.payload),
          projectionEntries: projection.entries,
        };

        expect(projection.entries).toHaveLength(1);
        expect(projection.entries[0]).toMatchObject({
          path: spec.relativePath,
          status: "available",
          sourceTool: spec.expectedSourceTool,
          sourceInvocationId: `invoke-${spec.toolName}`,
        });
        expect(fileChangeEvents.at(-1)?.payload).toMatchObject({
          path: spec.relativePath,
          status: "available",
          sourceTool: spec.expectedSourceTool,
        });
      }
      evidence.mutations = mutationResults;
    }

    // Scenario V-003: Explicit generated-output path contracts still create generated_output rows.
    {
      const { run, emit, fileChangeEvents, workspaceRoot, service } = await createHarness("validation-generated-output-run");
      const writeFixture = async (relativePath: string, content: string | Buffer) => {
        const fullPath = path.join(workspaceRoot, relativePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content);
        return fullPath;
      };

      await writeFixture("assets/from-output-file-path.png", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      await writeFixture("reports/from-output-path.pdf", "%PDF-1.7\n");
      await writeFixture("exports/from-destination.csv", "a,b\n1,2\n");
      const localFilePath = await writeFixture("media/from-url-local-path.mp3", Buffer.from([0xff, 0xfb]));

      const events: AgentRunEvent[] = [
        {
          eventType: AgentRunEventType.TOOL_EXECUTION_STARTED,
          runId: run.runId,
          statusHint: null,
          payload: {
            invocation_id: "image-1:0",
            tool_name: "generate_image",
            arguments: { output_file_path: "assets/from-output-file-path.png" },
          },
        },
        {
          eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          runId: run.runId,
          statusHint: null,
          payload: {
            invocation_id: "image-1",
            tool_name: "generate_image",
            result: { ok: true },
          },
        },
        {
          eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          runId: run.runId,
          statusHint: null,
          payload: {
            invocation_id: "pdf-1",
            tool_name: "render_report",
            arguments: { output_path: "reports/from-output-path.pdf" },
            result: { ok: true },
          },
        },
        {
          eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          runId: run.runId,
          statusHint: null,
          payload: {
            invocation_id: "csv-1",
            tool_name: "export_csv",
            arguments: { destination: "exports/from-destination.csv" },
            result: { ok: true },
          },
        },
        {
          eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          runId: run.runId,
          statusHint: null,
          payload: {
            invocation_id: "audio-1",
            tool_name: "generate_audio",
            result: {
              output_file_url: "http://localhost/files/from-url-local-path.mp3",
              local_file_path: localFilePath,
            },
          },
        },
      ];
      await emitEvents(emit, events);
      const projection = await service.getProjectionForRun(run);
      const byPath = new Map(projection.entries.map((entry) => [entry.path, entry]));

      evidence.generatedOutputs = {
        emittedFileChangePayloads: fileChangeEvents.map((event) => event.payload),
        projectionEntries: projection.entries,
      };

      expect(projection.entries).toHaveLength(4);
      for (const expectedPath of [
        "assets/from-output-file-path.png",
        "reports/from-output-path.pdf",
        "exports/from-destination.csv",
        "media/from-url-local-path.mp3",
      ]) {
        expect(byPath.get(expectedPath)).toMatchObject({
          path: expectedPath,
          status: "available",
          sourceTool: "generated_output",
        });
      }
    }

    // Scenario V-004: Generic file_path/filePath-only non-mutation tools remain non-artifacts.
    {
      const { run, emit, fileChangeEvents, service } = await createHarness("validation-generic-input-run");
      await emitEvents(emit, [
        {
          eventType: AgentRunEventType.TOOL_EXECUTION_STARTED,
          runId: run.runId,
          statusHint: null,
          payload: {
            invocation_id: "inspect-1",
            tool_name: "inspect_file",
            arguments: { file_path: "src/input-only.txt", filePath: "src/also-input.txt" },
          },
        },
        {
          eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          runId: run.runId,
          statusHint: null,
          payload: {
            invocation_id: "inspect-1",
            tool_name: "inspect_file",
            arguments: { file_path: "src/input-only.txt", filePath: "src/also-input.txt" },
            result: { file_path: "src/result-input.txt", filePath: "src/result-also-input.txt" },
          },
        },
      ]);
      const projection = await service.getProjectionForRun(run);

      evidence.genericFilePathOnly = {
        emittedFileChangeCount: fileChangeEvents.length,
        projectionEntries: projection.entries,
      };

      expect(fileChangeEvents).toHaveLength(0);
      expect(projection.entries).toEqual([]);
    }

    if (process.env.API_E2E_EVIDENCE_PATH) {
      await fs.mkdir(path.dirname(process.env.API_E2E_EVIDENCE_PATH), { recursive: true });
      await fs.writeFile(process.env.API_E2E_EVIDENCE_PATH, JSON.stringify(evidence, null, 2), "utf-8");
    }

    console.info("API_E2E_CLAUDE_ARTIFACT_VALIDATION", JSON.stringify(evidence, null, 2));
  });
});
