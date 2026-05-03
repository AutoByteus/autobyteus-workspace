import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeSessionEventConverter } from "../../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { CodexThreadEventConverter } from "../../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { AgentRunEventPipeline } from "../../../../src/agent-execution/events/agent-run-event-pipeline.js";
import { FileChangePayloadBuilder } from "../../../../src/agent-execution/events/processors/file-change/file-change-payload-builder.js";
import { FileChangeEventProcessor } from "../../../../src/agent-execution/events/processors/file-change/file-change-event-processor.js";

const createPipelineHarness = (workspaceRoot: string) => {
  const runContext = {
    runId: "run-file-change-pipeline",
    config: { workspaceId: "workspace-1" },
    runtimeContext: null,
  } as any;
  const workspaceManager = {
    getWorkspaceById: vi.fn().mockReturnValue({ getBasePath: () => workspaceRoot }),
  } as any;
  const pipeline = new AgentRunEventPipeline([
    new FileChangeEventProcessor(new FileChangePayloadBuilder(workspaceManager)),
  ]);

  const process = async (events: AgentRunEvent[]) => pipeline.process({ runContext, events });
  const fileChanges = (events: AgentRunEvent[]) => events.filter((event) => event.eventType === AgentRunEventType.FILE_CHANGE);
  return { process, fileChanges };
};

const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent => ({
  eventType,
  runId: "run-file-change-pipeline",
  statusHint: null,
  payload,
});

describe("FileChangeEventProcessor", () => {
  it("keeps Claude Read lifecycle events activity-only and emits no FILE_CHANGE", async () => {
    const workspaceRoot = "/tmp/workspace";
    const readPath = path.join(workspaceRoot, "src", "server.py");
    const converter = new ClaudeSessionEventConverter("run-file-change-pipeline");
    const { process, fileChanges } = createPipelineHarness(workspaceRoot);

    const convertedEvents = [
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
        params: {
          invocation_id: "read-1",
          tool_name: "Read",
          arguments: { file_path: readPath },
        },
      }),
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
        params: {
          invocation_id: "read-1",
          tool_name: "Read",
          arguments: { file_path: readPath },
          result: "print('hello')\n",
        },
      }),
    ];

    const processed = await process(convertedEvents);
    expect(convertedEvents.map((row) => row.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_STARTED,
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    ]);
    expect(fileChanges(processed)).toEqual([]);
  });

  it.each([
    ["Write", "write_file", "src/claude-write.txt"],
    ["Edit", "edit_file", "src/claude-edit.txt"],
    ["MultiEdit", "edit_file", "src/claude-multi-edit.txt"],
    ["NotebookEdit", "edit_file", "notebooks/example.ipynb"],
  ] as const)("emits FILE_CHANGE for Claude %s", async (toolName, expectedSourceTool, expectedPath) => {
    const workspaceRoot = "/tmp/workspace";
    const targetPath = path.join(workspaceRoot, expectedPath);
    const converter = new ClaudeSessionEventConverter("run-file-change-pipeline");
    const { process, fileChanges } = createPipelineHarness(workspaceRoot);
    const args = toolName === "NotebookEdit"
      ? { notebook_path: targetPath, new_source: "print('after')" }
      : { file_path: targetPath, content: "hello" };

    const processed = await process([
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
        params: {
          invocation_id: `invoke-${toolName}`,
          tool_name: toolName,
          arguments: args,
        },
      }),
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
        params: {
          invocation_id: `invoke-${toolName}`,
          tool_name: toolName,
          arguments: args,
          result: toolName === "NotebookEdit" ? { notebook_path: targetPath } : { filePath: targetPath },
        },
      }),
    ]);

    const changes = fileChanges(processed);
    expect(changes.at(-1)?.payload).toMatchObject({
      path: expectedPath,
      status: "available",
      sourceTool: expectedSourceTool,
      sourceInvocationId: `invoke-${toolName}`,
    });
  });

  it("emits streaming, pending, and available FILE_CHANGE updates for write_file preview", async () => {
    const { process, fileChanges } = createPipelineHarness("/tmp/workspace");

    const processed = await process([
      event(AgentRunEventType.SEGMENT_START, {
        id: "write-1",
        segment_type: "write_file",
        metadata: { path: "/tmp/workspace/src/hello.txt" },
      }),
      event(AgentRunEventType.SEGMENT_CONTENT, {
        id: "write-1",
        segment_type: "write_file",
        delta: "hello",
      }),
      event(AgentRunEventType.SEGMENT_END, {
        id: "write-1",
        segment_type: "write_file",
      }),
      event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        invocation_id: "write-1",
        tool_name: "write_file",
        arguments: { path: "/tmp/workspace/src/hello.txt" },
      }),
    ]);

    expect(fileChanges(processed).map((change) => ({
      status: change.payload.status,
      content: change.payload.content,
    }))).toEqual([
      { status: "streaming", content: "" },
      { status: "streaming", content: "hello" },
      { status: "pending", content: "hello" },
      { status: "available", content: "hello" },
    ]);
  });

  it("emits FILE_CHANGE for Codex edit_file lifecycle", async () => {
    const workspaceRoot = "/tmp/workspace";
    const converter = new CodexThreadEventConverter("run-file-change-pipeline", workspaceRoot);
    const { process, fileChanges } = createPipelineHarness(workspaceRoot);

    const processed = await process([
      ...converter.convert({
        method: CodexThreadEventName.ITEM_STARTED,
        params: {
          item: {
            type: "fileChange",
            id: "call_1",
            status: "inProgress",
            changes: [{ path: "/tmp/workspace/demo.py", diff: "print('hi')\n" }],
          },
        },
      }),
      ...converter.convert({
        method: CodexThreadEventName.ITEM_COMPLETED,
        params: {
          item: {
            type: "fileChange",
            id: "call_1",
            status: "completed",
            changes: [{ path: "/tmp/workspace/demo.py", diff: "print('hi')\n" }],
          },
        },
      }),
    ]);

    const changes = fileChanges(processed);
    expect(changes.at(-1)?.payload).toMatchObject({
      path: "demo.py",
      status: "available",
      sourceTool: "edit_file",
      sourceInvocationId: "call_1",
    });
  });

  it.each([
    ["generate_image", "assets/image.png", "image"],
    ["edit_image", "assets/edited.png", "image"],
    ["generate_speech", "audio/speech.wav", "audio"],
  ] as const)("emits generated-output FILE_CHANGE for %s", async (toolName, outputPath, artifactType) => {
    const workspaceRoot = "/tmp/workspace";
    const resolvedPath = path.join(workspaceRoot, outputPath);
    const { process, fileChanges } = createPipelineHarness(workspaceRoot);

    const processed = await process([
      event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: `${toolName}-1:0`,
        tool_name: toolName,
        arguments: { output_file_path: outputPath },
      }),
      event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        invocation_id: `${toolName}-1`,
        tool_name: toolName,
        result: { file_path: resolvedPath },
      }),
    ]);

    expect(fileChanges(processed).at(-1)?.payload).toMatchObject({
      path: outputPath,
      type: artifactType,
      status: "available",
      sourceTool: "generated_output",
      sourceInvocationId: `${toolName}-1`,
    });
  });

  it("rejects unknown non-mutation tools whose only path-like field is file_path", async () => {
    const { process, fileChanges } = createPipelineHarness("/tmp/workspace");

    const processed = await process([
      event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: "inspect-1",
        tool_name: "inspect_file",
        arguments: { file_path: "/tmp/workspace/src/input.py" },
      }),
      event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        invocation_id: "inspect-1",
        tool_name: "inspect_file",
        arguments: { file_path: "/tmp/workspace/src/input.py" },
        result: { filePath: "/tmp/workspace/src/input.py" },
      }),
    ]);

    expect(fileChanges(processed)).toEqual([]);
  });
});
