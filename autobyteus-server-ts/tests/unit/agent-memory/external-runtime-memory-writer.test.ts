import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import {
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "external-runtime-memory-writer-"));
  tempDirs.add(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe("ExternalRuntimeMemoryWriter", () => {
  it("writes exact normalized raw fields without creating a WorkingContext snapshot", async () => {
    const memoryDir = await mkTempDir();
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });

    const user = writer.appendRawTrace({
      traceType: "user",
      turnId: "turn-1",
      content: "hello",
      sourceEvent: "test-user",
      ts: 1_720_000_000_123,
      media: { images: ["file:///tmp/example.png"] },
      correlationId: "user-correlation",
    });
    const assistant = writer.appendRawTrace({
      traceType: "assistant",
      turnId: "turn-1",
      content: "hi",
      sourceEvent: "test-assistant",
      ts: 1_720_000_001,
    });

    expect(user).toMatchObject({
      traceType: "user",
      turnId: "turn-1",
      seq: 1,
      content: "hello",
      sourceEvent: "test-user",
      ts: 1_720_000_000.123,
      media: { images: ["file:///tmp/example.png"] },
      correlationId: "user-correlation",
    });
    expect(user.id).toMatch(/^rt_\d+_/);
    expect(assistant).toMatchObject({
      traceType: "assistant",
      turnId: "turn-1",
      seq: 2,
      content: "hi",
      sourceEvent: "test-assistant",
      ts: 1_720_000_001,
    });

    await expect(fs.access(path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).resolves.toBeUndefined();
    await expect(fs.access(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).rejects.toThrow();

    const service = new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }));
    const view = service.getRunMemoryView(path.basename(memoryDir), {
      includeRawTraces: true,
      includeEpisodic: false,
      includeSemantic: false,
    });

    expect(view.rawTraces?.map((trace) => [trace.traceType, trace.content, trace.sourceEvent])).toEqual([
      ["user", "hello", "test-user"],
      ["assistant", "hi", "test-assistant"],
    ]);
    expect(view.workingContext).toBeNull();
    const persistedRawTraceKeys = new RunMemoryFileStore(memoryDir)
      .listRawTraceDicts()
      .flatMap((trace) => Object.keys(trace));
    expect(persistedRawTraceKeys).not.toContain("tags");
    expect(persistedRawTraceKeys).not.toContain("tool_result_ref");
    expect(persistedRawTraceKeys).not.toContain("working_context");
  });

  it("continues sequence numbers from active and complete archived traces after recreation", async () => {
    const memoryDir = await mkTempDir();
    const store = new RunMemoryFileStore(memoryDir);
    await fs.writeFile(
      path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME),
      `${JSON.stringify({ id: "rt-1", ts: 1, turn_id: "turn-1", seq: 2, trace_type: "user", content: "old", source_event: "old" })}\n`,
      "utf-8",
    );
    store.appendRawTrace(new RawTraceItem({
      id: "rt-0",
      ts: 1,
      turnId: "turn-2",
      seq: 5,
      traceType: "user",
      content: "archived",
      sourceEvent: "old",
    }));
    store.pruneRawTracesById(["rt-0"]);

    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    const turn1 = writer.appendRawTrace({
      traceType: "assistant",
      turnId: "turn-1",
      content: "new",
      sourceEvent: "test",
    });
    const turn2 = writer.appendRawTrace({
      traceType: "assistant",
      turnId: "turn-2",
      content: "new",
      sourceEvent: "test",
    });

    expect(turn1.seq).toBe(3);
    expect(turn2.seq).toBe(6);
    await expect(fs.access(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).rejects.toThrow();
  });

  it("writes strict call/result rows and hydrates archived calls with active null results", async () => {
    const memoryDir = await mkTempDir();
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    const callTrace = writer.appendRawTrace({
      traceType: "tool_call",
      turnId: "turn-1",
      content: "",
      sourceEvent: "TOOL_EXECUTION_SUCCEEDED",
      toolName: "no_output_tool",
      toolCallId: "call-1",
      toolArgs: {},
    });
    const store = new RunMemoryFileStore(memoryDir);
    store.pruneRawTracesById([callTrace.id]);
    writer.appendRawTrace({
      traceType: "tool_result",
      turnId: "turn-1",
      content: "",
      sourceEvent: "TOOL_EXECUTION_SUCCEEDED",
      toolName: "no_output_tool",
      toolCallId: "call-1",
      toolResult: null,
      toolError: null,
    });
    expect(store.listRawTraceDicts()[0]).toMatchObject({
      trace_type: "tool_result",
      tool_call_id: "call-1",
      tool_name: "no_output_tool",
      tool_result: null,
      tool_error: null,
    });
    expect(store.listRawTraceDicts()[0]).not.toHaveProperty("tool_args");

    const groups = new ExternalRuntimeMemoryWriter({ memoryDir }).readToolTraceLifecycleGroups();
    expect([...groups.values()]).toEqual([
      expect.objectContaining({
        identity: { turnId: "turn-1", toolCallId: "call-1" },
        call: expect.objectContaining({ id: callTrace.id, toolName: "no_output_tool", toolArgs: {} }),
        result: expect.objectContaining({ toolResult: null, toolError: null }),
      }),
    ]);
    await expect(fs.access(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).rejects.toThrow();
  });
});
