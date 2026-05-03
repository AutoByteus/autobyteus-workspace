import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { StreamEventType } from "autobyteus-ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeSessionEventConverter } from "../../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { CodexThreadEventConverter } from "../../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { AutoByteusStreamEventConverter } from "../../../../src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.js";
import { AgentRunEventPipeline } from "../../../../src/agent-execution/events/agent-run-event-pipeline.js";
import { dispatchProcessedAgentRunEvents } from "../../../../src/agent-execution/events/dispatch-processed-agent-run-events.js";
import { FileChangeEventProcessor } from "../../../../src/agent-execution/events/processors/file-change/file-change-event-processor.js";
import { FileChangePayloadBuilder } from "../../../../src/agent-execution/events/processors/file-change/file-change-payload-builder.js";
import { RunFileChangeProjectionStore } from "../../../../src/services/run-file-changes/run-file-change-projection-store.js";
import { RunFileChangeService } from "../../../../src/services/run-file-changes/run-file-change-service.js";
import { AgentRunEventMessageMapper } from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";

const flush = async (): Promise<void> => {
  for (let index = 0; index < 25; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

describe("Round 2 API/E2E runtime validation for FILE_CHANGE architecture", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  const createTempDir = async (): Promise<string> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "round2-file-change-validation-"));
    tempDirs.push(tempDir);
    return tempDir;
  };

  const createHarness = async (runId: string) => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const listeners = new Set<(event: unknown) => void>();
    const finalEvents: AgentRunEvent[] = [];
    const listenerErrors: unknown[] = [];

    const runContext = {
      runId,
      config: {
        workspaceId: `${runId}-workspace`,
        memoryDir,
      },
      runtimeContext: null,
    } as any;

    const workspaceManager = {
      getWorkspaceById: vi.fn().mockReturnValue({ getBasePath: () => workspaceRoot }),
    } as any;
    const projectionStore = new RunFileChangeProjectionStore();
    const runFileChangeService = new RunFileChangeService({
      projectionStore,
      workspaceManager,
    });
    const run = {
      runId,
      config: runContext.config,
      subscribeToEvents(listener: (event: unknown) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } as any;
    const unsubscribe = runFileChangeService.attachToRun(run);
    listeners.add((event: unknown) => {
      finalEvents.push(event as AgentRunEvent);
    });

    const pipeline = new AgentRunEventPipeline([
      new FileChangeEventProcessor(new FileChangePayloadBuilder(workspaceManager)),
    ]);
    const dispatch = async (events: AgentRunEvent[]): Promise<AgentRunEvent[]> => {
      const start = finalEvents.length;
      await dispatchProcessedAgentRunEvents({
        runContext,
        listeners,
        events,
        pipeline,
        onListenerError: (error) => listenerErrors.push(error),
      });
      await flush();
      expect(listenerErrors).toEqual([]);
      return finalEvents.slice(start);
    };
    const fileChanges = (events = finalEvents) => events.filter((event) => event.eventType === AgentRunEventType.FILE_CHANGE);
    const projection = () => runFileChangeService.getProjectionForRun(run);

    return {
      runContext,
      workspaceRoot,
      memoryDir,
      projectionStore,
      dispatch,
      fileChanges,
      projection,
      finalEvents,
      cleanup: unsubscribe,
    };
  };

  const claudeLifecycle = (
    runId: string,
    invocationId: string,
    toolName: string,
    args: Record<string, unknown>,
    result: unknown,
  ): AgentRunEvent[] => {
    const converter = new ClaudeSessionEventConverter(runId);
    return [
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
        params: { invocation_id: invocationId, tool_name: toolName, arguments: args },
      }),
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
        params: { invocation_id: invocationId, tool_name: toolName, arguments: args, result },
      }),
    ];
  };

  const autoEvent = (event_type: StreamEventType, data: Record<string, unknown>): any => ({ event_type, data });

  it("validates cross-runtime FILE_CHANGE derivation and projection behavior", async () => {
    const evidence: Record<string, unknown> = {};
    const mapper = new AgentRunEventMessageMapper();

    // V2-001: Claude Read(file_path) remains activity-only.
    {
      const h = await createHarness("round2-claude-read");
      const readPath = path.join(h.workspaceRoot, "src", "server.py");
      await fs.mkdir(path.dirname(readPath), { recursive: true });
      await fs.writeFile(readPath, "print('read-only')\n", "utf-8");
      const baseEvents = claudeLifecycle(h.runContext.runId, "read-1", "Read", { file_path: readPath }, "print('read-only')\n");
      const finalBatch = await h.dispatch(baseEvents);
      const projection = await h.projection();
      const persistedPath = path.join(h.memoryDir, "file_changes.json");

      evidence.claudeRead = {
        baseEventTypes: baseEvents.map((event) => event.eventType),
        finalEventTypes: finalBatch.map((event) => event.eventType),
        toolPayloads: finalBatch.map((event) => event.payload),
        fileChangeCount: h.fileChanges(finalBatch).length,
        projectionEntries: projection.entries,
        persistedFileExists: await fileExists(persistedPath),
      };

      expect(baseEvents.map((event) => event.eventType)).toEqual([
        AgentRunEventType.TOOL_EXECUTION_STARTED,
        AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      ]);
      expect(finalBatch.map((event) => event.eventType)).toEqual(baseEvents.map((event) => event.eventType));
      expect(finalBatch[0]?.payload).toMatchObject({ tool_name: "Read", arguments: { file_path: readPath } });
      expect(h.fileChanges(finalBatch)).toEqual([]);
      expect(projection.entries).toEqual([]);
      expect(await fileExists(persistedPath)).toBe(false);
      h.cleanup();
    }

    // V2-002: Claude mutation tools produce canonical terminal FILE_CHANGE rows.
    {
      const mutationEvidence: Record<string, unknown> = {};
      for (const spec of [
        { toolName: "Write", relativePath: "src/claude-write.txt", sourceTool: "write_file", args: (p: string) => ({ file_path: p, content: "hello\n" }), result: (p: string) => ({ filePath: p }) },
        { toolName: "Edit", relativePath: "src/claude-edit.txt", sourceTool: "edit_file", args: (p: string) => ({ file_path: p, old_string: "before", new_string: "after" }), result: (p: string) => ({ filePath: p }) },
        { toolName: "MultiEdit", relativePath: "src/claude-multiedit.txt", sourceTool: "edit_file", args: (p: string) => ({ file_path: p, edits: [{ old_string: "before", new_string: "after" }] }), result: (p: string) => ({ filePath: p }) },
        { toolName: "NotebookEdit", relativePath: "notebooks/example.ipynb", sourceTool: "edit_file", args: (p: string) => ({ notebook_path: p, new_source: "print('after')" }), result: (p: string) => ({ notebook_path: p }) },
      ]) {
        const h = await createHarness(`round2-claude-${spec.toolName.toLowerCase()}`);
        const targetPath = path.join(h.workspaceRoot, spec.relativePath);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, "after\n", "utf-8");
        const finalBatch = await h.dispatch(claudeLifecycle(
          h.runContext.runId,
          `invoke-${spec.toolName}`,
          spec.toolName,
          spec.args(targetPath),
          spec.result(targetPath),
        ));
        const changes = h.fileChanges(finalBatch);
        const projection = await h.projection();
        const protocolMessages = changes.map((event) => mapper.map(event));

        mutationEvidence[spec.toolName] = {
          finalEventTypes: finalBatch.map((event) => event.eventType),
          fileChangePayloads: changes.map((event) => event.payload),
          protocolMessageTypes: protocolMessages.map((message) => message.type),
          projectionEntries: projection.entries,
        };

        expect(changes.at(-1)?.payload).toMatchObject({
          path: spec.relativePath,
          status: "available",
          sourceTool: spec.sourceTool,
          sourceInvocationId: `invoke-${spec.toolName}`,
        });
        expect(protocolMessages.every((message) => message.type === "FILE_CHANGE")).toBe(true);
        expect(projection.entries).toHaveLength(1);
        expect(projection.entries[0]).toMatchObject({
          path: spec.relativePath,
          status: "available",
          sourceTool: spec.sourceTool,
        });
        h.cleanup();
      }
      evidence.claudeMutations = mutationEvidence;
    }

    // V2-003: Codex fileChange start/completion emits idempotent pending updates and one final available row.
    {
      const h = await createHarness("round2-codex-file-change");
      const converter = new CodexThreadEventConverter(h.runContext.runId, h.workspaceRoot);
      const targetPath = path.join(h.workspaceRoot, "codex/demo.py");
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, "print('codex')\n", "utf-8");
      const startBaseEvents = converter.convert({
        method: CodexThreadEventName.ITEM_STARTED,
        params: { item: { type: "fileChange", id: "codex-change-1", status: "inProgress", changes: [{ path: targetPath, diff: "+print('codex')\n" }] } },
      });
      const startFinal = await h.dispatch(startBaseEvents);
      const completeBaseEvents = converter.convert({
        method: CodexThreadEventName.ITEM_COMPLETED,
        params: { item: { type: "fileChange", id: "codex-change-1", status: "completed", changes: [{ path: targetPath, diff: "+print('codex')\n" }] } },
      });
      const completeFinal = await h.dispatch(completeBaseEvents);
      const startChanges = h.fileChanges(startFinal);
      const completeChanges = h.fileChanges(completeFinal);
      const projection = await h.projection();

      evidence.codexFileChange = {
        startBaseEventTypes: startBaseEvents.map((event) => event.eventType),
        startFileChangePayloads: startChanges.map((event) => event.payload),
        completeBaseEventTypes: completeBaseEvents.map((event) => event.eventType),
        completeFileChangePayloads: completeChanges.map((event) => event.payload),
        projectionEntries: projection.entries,
        duplicatePendingCount: startChanges.length,
        duplicatePendingIdempotent: startChanges.every((event) => event.payload.path === "codex/demo.py" && event.payload.status === "pending"),
      };

      expect(startBaseEvents.map((event) => event.eventType)).toEqual([
        AgentRunEventType.SEGMENT_START,
        AgentRunEventType.TOOL_EXECUTION_STARTED,
      ]);
      expect(startChanges).toHaveLength(2);
      expect(startChanges.every((event) => event.payload.path === "codex/demo.py" && event.payload.status === "pending")).toBe(true);
      expect(completeChanges).toHaveLength(1);
      expect(completeChanges[0]?.payload).toMatchObject({ path: "codex/demo.py", status: "available", sourceTool: "edit_file" });
      expect(projection.entries).toHaveLength(1);
      expect(projection.entries[0]).toMatchObject({ path: "codex/demo.py", status: "available", sourceTool: "edit_file" });
      h.cleanup();
    }

    // V2-004: AutoByteus write/edit and streaming write preview through converter + pipeline.
    {
      const h = await createHarness("round2-autobyteus-files");
      const converter = new AutoByteusStreamEventConverter(h.runContext.runId);
      const streamPath = path.join(h.workspaceRoot, "auto/stream.txt");
      const editPath = path.join(h.workspaceRoot, "auto/edit.txt");
      await fs.mkdir(path.dirname(streamPath), { recursive: true });
      await fs.writeFile(streamPath, "hello stream", "utf-8");
      await fs.writeFile(editPath, "edited", "utf-8");
      const converted = [
        converter.convert(autoEvent(StreamEventType.SEGMENT_EVENT, { event_type: "SEGMENT_START", turn_id: "turn-1", segment_id: "auto-write-1", segment_type: "write_file", payload: { metadata: { path: streamPath } } })),
        converter.convert(autoEvent(StreamEventType.SEGMENT_EVENT, { event_type: "SEGMENT_CONTENT", turn_id: "turn-1", segment_id: "auto-write-1", segment_type: "write_file", payload: { delta: "hello " } })),
        converter.convert(autoEvent(StreamEventType.SEGMENT_EVENT, { event_type: "SEGMENT_CONTENT", turn_id: "turn-1", segment_id: "auto-write-1", segment_type: "write_file", payload: { delta: "stream" } })),
        converter.convert(autoEvent(StreamEventType.SEGMENT_EVENT, { event_type: "SEGMENT_END", turn_id: "turn-1", segment_id: "auto-write-1", segment_type: "write_file", payload: {} })),
        converter.convert(autoEvent(StreamEventType.TOOL_EXECUTION_SUCCEEDED, { invocation_id: "auto-write-1", tool_name: "write_file", arguments: { path: streamPath }, result: { path: streamPath } })),
        converter.convert(autoEvent(StreamEventType.TOOL_EXECUTION_STARTED, { invocation_id: "auto-edit-1", tool_name: "edit_file", arguments: { path: editPath, old_string: "before", new_string: "after" } })),
        converter.convert(autoEvent(StreamEventType.TOOL_EXECUTION_SUCCEEDED, { invocation_id: "auto-edit-1", tool_name: "edit_file", arguments: { path: editPath }, result: { path: editPath } })),
      ].filter(Boolean) as AgentRunEvent[];
      const final = await h.dispatch(converted);
      const changes = h.fileChanges(final);
      const projection = await h.projection();

      evidence.autobyteusFiles = {
        baseEventTypes: converted.map((event) => event.eventType),
        fileChangePayloads: changes.map((event) => event.payload),
        projectionEntries: projection.entries,
      };

      expect(changes.map((event) => ({ path: event.payload.path, status: event.payload.status, content: event.payload.content }))).toEqual(expect.arrayContaining([
        { path: "auto/stream.txt", status: "streaming", content: "" },
        { path: "auto/stream.txt", status: "streaming", content: "hello " },
        { path: "auto/stream.txt", status: "streaming", content: "hello stream" },
        { path: "auto/stream.txt", status: "pending", content: "hello stream" },
        { path: "auto/stream.txt", status: "available", content: "hello stream" },
        { path: "auto/edit.txt", status: "pending", content: undefined },
        { path: "auto/edit.txt", status: "available", content: undefined },
      ]));
      expect(projection.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "auto/stream.txt", status: "available", sourceTool: "write_file", content: "hello stream" }),
        expect.objectContaining({ path: "auto/edit.txt", status: "available", sourceTool: "edit_file" }),
      ]));
      h.cleanup();
    }

    // V2-005: AutoByteus generated media/audio tools use known-tool output semantics.
    {
      const h = await createHarness("round2-autobyteus-generated");
      const converter = new AutoByteusStreamEventConverter(h.runContext.runId);
      const generatedSpecs = [
        { toolName: "generate_image", relativePath: "generated/image.png", type: "image" },
        { toolName: "edit_image", relativePath: "generated/edited.webp", type: "image" },
        { toolName: "generate_speech", relativePath: "generated/speech.mp3", type: "audio" },
      ];
      const converted: AgentRunEvent[] = [];
      for (const spec of generatedSpecs) {
        const resolvedPath = path.join(h.workspaceRoot, spec.relativePath);
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
        await fs.writeFile(resolvedPath, spec.type === "audio" ? Buffer.from([0xff, 0xfb]) : Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        converted.push(
          converter.convert(autoEvent(StreamEventType.TOOL_EXECUTION_STARTED, { invocation_id: `${spec.toolName}-1:0`, tool_name: spec.toolName, arguments: { output_file_path: spec.relativePath } }))!,
          converter.convert(autoEvent(StreamEventType.TOOL_EXECUTION_SUCCEEDED, { invocation_id: `${spec.toolName}-1`, tool_name: spec.toolName, result: { file_path: resolvedPath } }))!,
        );
      }
      const final = await h.dispatch(converted);
      const changes = h.fileChanges(final);
      const projection = await h.projection();

      evidence.autobyteusGenerated = {
        fileChangePayloads: changes.map((event) => event.payload),
        projectionEntries: projection.entries,
      };

      expect(changes).toHaveLength(3);
      for (const spec of generatedSpecs) {
        expect(projection.entries).toEqual(expect.arrayContaining([
          expect.objectContaining({ path: spec.relativePath, type: spec.type, status: "available", sourceTool: "generated_output" }),
        ]));
      }
      h.cleanup();
    }

    // V2-006: Unknown non-file tools carrying only file_path/filePath do not produce FILE_CHANGE.
    {
      const h = await createHarness("round2-unknown-file-path");
      const final = await h.dispatch([
        { eventType: AgentRunEventType.TOOL_EXECUTION_STARTED, runId: h.runContext.runId, statusHint: null, payload: { invocation_id: "inspect-1", tool_name: "inspect_file", arguments: { file_path: path.join(h.workspaceRoot, "input.py") } } },
        { eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, runId: h.runContext.runId, statusHint: null, payload: { invocation_id: "inspect-1", tool_name: "inspect_file", arguments: { file_path: path.join(h.workspaceRoot, "input.py") }, result: { filePath: path.join(h.workspaceRoot, "input.py") } } },
      ]);
      const projection = await h.projection();

      evidence.unknownFilePathOnly = {
        finalEventTypes: final.map((event) => event.eventType),
        fileChangeCount: h.fileChanges(final).length,
        projectionEntries: projection.entries,
      };

      expect(h.fileChanges(final)).toEqual([]);
      expect(projection.entries).toEqual([]);
      h.cleanup();
    }

    // V2-007: Projection service ignores unrelated normalized events if they arrive directly.
    {
      const h = await createHarness("round2-rfs-ignore");
      await h.dispatch([
        { eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, runId: h.runContext.runId, statusHint: null, payload: { invocation_id: "unrelated", tool_name: "Read", arguments: { file_path: path.join(h.workspaceRoot, "read.txt") } } },
      ]);
      const projection = await h.projection();
      evidence.runFileChangeServiceProjectionOnly = { projectionEntries: projection.entries };
      expect(projection.entries).toEqual([]);
      h.cleanup();
    }

    if (process.env.API_E2E_EVIDENCE_PATH) {
      await fs.mkdir(path.dirname(process.env.API_E2E_EVIDENCE_PATH), { recursive: true });
      await fs.writeFile(process.env.API_E2E_EVIDENCE_PATH, JSON.stringify(evidence, null, 2), "utf-8");
    }

    console.info("ROUND2_FILE_CHANGE_VALIDATION_EVIDENCE", JSON.stringify(evidence, null, 2));
  });
});
