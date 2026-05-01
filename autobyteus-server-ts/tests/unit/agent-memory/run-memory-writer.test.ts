import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunMemoryWriter } from "../../../src/agent-memory/store/run-memory-writer.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import {
  RAW_TRACES_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "run-memory-writer-"));
  tempDirs.add(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe("RunMemoryWriter", () => {
  it("writes raw traces and AgentMemoryService-compatible snapshots through shared store primitives", async () => {
    const memoryDir = await mkTempDir();
    const writer = new RunMemoryWriter({ memoryDir });

    writer.write({
      trace: {
        traceType: "user",
        turnId: "turn-1",
        content: "hello",
        sourceEvent: "test-user",
      },
      snapshotUpdate: { kind: "user", content: "hello" },
    });
    writer.write({
      trace: {
        traceType: "assistant",
        turnId: "turn-1",
        content: "hi",
        sourceEvent: "test-assistant",
      },
      snapshotUpdate: { kind: "assistant", content: "hi", reasoning: "thinking" },
    });

    await expect(fs.access(path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME))).resolves.toBeUndefined();
    await expect(fs.access(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).resolves.toBeUndefined();

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
    expect(view.workingContext).toEqual([
      expect.objectContaining({ role: "user", content: "hello" }),
      expect.objectContaining({ role: "assistant", content: "hi", reasoning: "thinking" }),
    ]);
  });

  it("continues sequence numbers from active and archived traces", async () => {
    const memoryDir = await mkTempDir();
    const store = new RunMemoryFileStore(memoryDir);
    await fs.writeFile(
      path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME),
      JSON.stringify({ id: "rt-1", ts: 1, turn_id: "turn-1", seq: 2, trace_type: "user", content: "old", source_event: "old" }) + "\n",
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
    const writer = new RunMemoryWriter({ memoryDir });

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
  });
});
