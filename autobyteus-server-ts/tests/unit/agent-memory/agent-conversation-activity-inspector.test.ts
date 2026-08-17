import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentConversationActivityInspector } from "../../../src/agent-memory/services/agent-conversation-activity-inspector.js";

const tempDirs: string[] = [];

const createRunDir = async (): Promise<string> => {
  const runDir = await fsp.mkdtemp(path.join(os.tmpdir(), "agent-activity-inspector-"));
  tempDirs.push(runDir);
  return runDir;
};

const writeJsonl = async (filePath: string, rows: unknown[]): Promise<void> => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
};

describe("AgentConversationActivityInspector", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fsp.rm(dir, { recursive: true, force: true })));
  });

  it("classifies user or assistant records in the active trace as present without mutating files", async () => {
    const runDir = await createRunDir();
    const store = new RunMemoryFileStore(runDir);
    await writeJsonl(store.getRawTracesPath(), [
      { id: "system-1", ts: 1, trace_type: "system" },
      { id: "user-1", ts: 2, trace_type: "user", content: "remember" },
    ]);
    const before = await fsp.readFile(store.getRawTracesPath(), "utf8");

    expect(new AgentConversationActivityInspector().inspect({ agentRunId: "run-1", memoryDir: runDir }))
      .toEqual({ kind: "present" });
    expect(await fsp.readFile(store.getRawTracesPath(), "utf8")).toBe(before);
  });

  it("finds conversation activity in a complete archived segment when the active trace is empty", async () => {
    const runDir = await createRunDir();
    const store = new RunMemoryFileStore(runDir);
    await writeJsonl(store.getRawTracesPath(), [
      { id: "assistant-1", ts: 1, trace_type: "assistant", content: "retained" },
      { id: "boundary-1", ts: 2, trace_type: "system" },
    ]);
    expect(store.rotateActiveRawTracesBeforeBoundary({
      boundaryType: "provider_compaction_boundary",
      boundaryKey: "test-boundary",
      boundaryTraceId: "boundary-1",
      runtimeKind: "AUTOBYTEUS",
      sourceEvent: "unit-test",
    })).not.toBeNull();

    expect(new AgentConversationActivityInspector().inspect({ agentRunId: "run-1", memoryDir: runDir }))
      .toEqual({ kind: "present" });
  });

  it("returns none for an absent trace corpus and for non-conversation records", async () => {
    const runDir = await createRunDir();
    const inspector = new AgentConversationActivityInspector();
    expect(inspector.inspect({ agentRunId: "run-1", memoryDir: runDir })).toEqual({ kind: "none" });

    const store = new RunMemoryFileStore(runDir);
    await writeJsonl(store.getRawTracesPath(), [{ id: "tool-1", ts: 1, trace_type: "tool" }]);
    expect(inspector.inspect({ agentRunId: "run-1", memoryDir: runDir })).toEqual({ kind: "none" });
  });

  it.each([
    ["malformed active JSONL", async (runDir: string) => {
      const store = new RunMemoryFileStore(runDir);
      await fsp.writeFile(store.getRawTracesPath(), "{not-json}\n", "utf8");
    }],
    ["malformed manifest", async (runDir: string) => {
      const store = new RunMemoryFileStore(runDir);
      await fsp.writeFile(store.getRawTracesArchiveManifestPath(), JSON.stringify({ segments: "bad" }), "utf8");
    }],
    ["unreadable complete segment", async (runDir: string) => {
      const store = new RunMemoryFileStore(runDir);
      await fsp.writeFile(store.getRawTracesArchiveManifestPath(), JSON.stringify({
        segments: [{ status: "complete", file_name: "raw_traces_000001.jsonl" }],
      }), "utf8");
      fs.mkdirSync(path.join(runDir, "raw_traces_000001.jsonl"));
    }],
  ])("fails closed as indeterminate for %s", async (_label, arrange) => {
    const runDir = await createRunDir();
    await arrange(runDir);

    const result = new AgentConversationActivityInspector().inspect({
      agentRunId: "run-1",
      memoryDir: runDir,
    });

    expect(result.kind).toBe("indeterminate");
    if (result.kind === "indeterminate") expect(result.error).toBeInstanceOf(Error);
  });

  it("treats missing required identity or memory path as indeterminate", () => {
    const result = new AgentConversationActivityInspector().inspect({ agentRunId: " ", memoryDir: " " });
    expect(result.kind).toBe("indeterminate");
  });
});
