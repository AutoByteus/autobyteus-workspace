import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { RunMemoryWriter } from "../../../src/agent-memory/store/run-memory-writer.js";
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

describe("Codex MCP tool arguments memory/projection integration", () => {
  it("persists MCP lifecycle args into tool call/result traces and projects both UI surfaces", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId: "run-1",
      writer: new RunMemoryWriter({ memoryDir }),
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

    const traces = readRawTraces(memoryDir);
    expect(traces.map((trace) => trace.traceType)).toEqual(["tool_call", "tool_result"]);
    expect(traces[0]).toMatchObject({
      toolCallId: "call_generate_image",
      toolName: "generate_image",
      toolArgs,
    });
    expect(traces[1]).toMatchObject({
      toolCallId: "call_generate_image",
      toolName: "generate_image",
      toolArgs,
      toolResult,
    });

    const replayEvents = buildHistoricalReplayEvents(traces);
    const projection = buildRunProjectionBundleFromEvents("run-1", replayEvents);
    const projectedTool = projection.conversation.find(
      (entry) => entry.kind === "tool_call" && entry.invocationId === "call_generate_image",
    );
    const projectedActivity = projection.activities.find(
      (entry) => entry.invocationId === "call_generate_image",
    );

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
