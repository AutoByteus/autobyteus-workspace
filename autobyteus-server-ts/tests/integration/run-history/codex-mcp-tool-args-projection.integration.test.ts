import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { buildRunProjectionBundleFromEvents } from "../../../src/run-history/projection/run-projection-utils.js";
import { buildHistoricalReplayEvents } from "../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-mcp-projection-"));
  tempDirs.add(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent => ({
  eventType,
  runId: "run-1",
  payload,
  statusHint: null,
});

const readRawTraces = (memoryDir: string) =>
  new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
    .getRunMemoryView(path.basename(memoryDir), {
      includeRawTraces: true,
      includeArchive: false,
      includeEpisodic: false,
      includeSemantic: false,
    }).rawTraces ?? [];

const readPhysicalRawTraces = async (memoryDir: string): Promise<Record<string, unknown>[]> =>
  (await fs.readFile(path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), "utf-8"))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

describe("Codex MCP tool arguments memory/projection integration", () => {
  it("persists an early MCP call plus minimal result and projects both UI surfaces", async () => {
    const memoryDir = await mkTempDir();
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId: "run-1",
      writer,
      toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
    });
    const toolArgs = {
      output_file_path: "/tmp/autobyteus-generated.png",
      prompt: "draw a small robot",
    };
    const toolResult = {
      output_file_path: "/tmp/autobyteus-generated.png",
      status: "created",
    };

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-mcp" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-mcp-tool",
      turn_id: "turn-mcp",
      segment_type: "reasoning",
      delta: "I should generate the image via MCP.",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_START, {
      id: "call_generate_image",
      turn_id: "turn-mcp",
      segment_type: "tool_call",
      metadata: {
        tool_name: "generate_image",
        arguments: toolArgs,
      },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "call_generate_image",
      turn_id: "turn-mcp",
      tool_name: "generate_image",
      arguments: toolArgs,
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "call_generate_image",
      turn_id: "turn-mcp",
      tool_name: "generate_image",
      arguments: toolArgs,
      result: toolResult,
    }));

    const physicalTraces = await readPhysicalRawTraces(memoryDir);
    const physicalCall = physicalTraces.find(
      (trace) => trace.trace_type === "tool_call" && trace.tool_call_id === "call_generate_image",
    );
    const physicalResult = physicalTraces.find(
      (trace) => trace.trace_type === "tool_result" && trace.tool_call_id === "call_generate_image",
    );
    expect(physicalCall).toMatchObject({
      tool_name: "generate_image",
      tool_args: toolArgs,
    });
    expect(physicalCall).not.toHaveProperty("tool_result");
    expect(physicalCall).not.toHaveProperty("tool_error");
    expect(physicalResult).toMatchObject({
      tool_name: "generate_image",
      tool_result: toolResult,
      tool_error: null,
    });
    expect(physicalResult).not.toHaveProperty("tool_args");

    const traces = readRawTraces(memoryDir);
    expect(traces.map((trace) => trace.traceType)).toEqual(["reasoning", "tool_call", "tool_result"]);
    expect(traces[0]).toMatchObject({
      traceType: "reasoning",
      content: "I should generate the image via MCP.",
    });
    expect(traces[1]).toMatchObject({
      toolCallId: "call_generate_image",
      toolName: "generate_image",
      toolArgs,
    });
    expect(traces[2]).toMatchObject({
      toolCallId: "call_generate_image",
      toolName: "generate_image",
      toolResult,
      toolError: null,
    });
    expect(traces[2]?.toolArgs).toBeNull();

    const replayEvents = buildHistoricalReplayEvents(traces);
    const projection = buildRunProjectionBundleFromEvents("run-1", replayEvents);
    const projectedTool = projection.conversation.find(
      (entry) => entry.kind === "tool_call" && entry.invocationId === "call_generate_image",
    );
    const projectedActivity = projection.activities.find(
      (entry) => entry.invocationId === "call_generate_image",
    );

    expect(projection.conversation.map((entry) => entry.kind)).toEqual([
      "reasoning",
      "tool_call",
    ]);
    expect(projection.conversation[0]).toMatchObject({
      kind: "reasoning",
      content: "I should generate the image via MCP.",
    });
    expect(projectedTool).toMatchObject({
      toolName: "generate_image",
      toolArgs,
      toolResult,
    });
    expect(projectedActivity).toMatchObject({
      toolName: "generate_image",
      arguments: toolArgs,
      result: toolResult,
      status: "success",
    });
  });
});
