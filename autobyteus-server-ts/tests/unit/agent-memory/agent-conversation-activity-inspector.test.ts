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
    await writeJsonl(store.getRawTracesPath(), [
      { id: "system-1", ts: 1, trace_type: "system_instruction", content: "Retained instructions" },
      { id: "tool-1", ts: 2, trace_type: "tool" },
    ]);
    expect(inspector.inspect({ agentRunId: "run-1", memoryDir: runDir })).toEqual({ kind: "none" });
  });

  const manifestWith = (runDir: string, manifest: unknown) => fsp.writeFile(
    new RunMemoryFileStore(runDir).getRawTracesArchiveManifestPath(),
    typeof manifest === "string" ? manifest : JSON.stringify(manifest), "utf8");

  it.each([
    ["malformed active JSONL", "line 1 of raw_traces_active.jsonl is damaged", async (runDir: string) => {
      const store = new RunMemoryFileStore(runDir);
      await fsp.writeFile(store.getRawTracesPath(), "{not-json}\n{\"id\":\"tool-1\"}\n", "utf8");
    }],
    ["a manifest that is not JSON", "its conversation index raw_traces_manifest.json is damaged", async (runDir: string) => {
      await manifestWith(runDir, "{");
    }],
    ["malformed manifest", "its conversation index raw_traces_manifest.json is damaged", async (runDir: string) => {
      await manifestWith(runDir, { segments: "bad" });
    }],
    ["a manifest segment with an invalid status", "its conversation index raw_traces_manifest.json is damaged", async (runDir: string) => {
      await manifestWith(runDir, { segments: [{ status: "done", file_name: "raw_traces_000001.jsonl" }] });
    }],
    ["a complete segment without file name", "its conversation index points to a missing or invalid archive file", async (runDir: string) => {
      await manifestWith(runDir, { segments: [{ status: "complete" }] });
    }],
    ["a complete segment outside the run folder", "its conversation index points to a missing or invalid archive file", async (runDir: string) => {
      await manifestWith(runDir, { segments: [{ status: "complete", file_name: "../elsewhere/raw.jsonl" }] });
    }],
    ["unreadable complete segment", "raw_traces_000001.jsonl could not be read (EISDIR)", async (runDir: string) => {
      await manifestWith(runDir, { segments: [{ status: "complete", file_name: "raw_traces_000001.jsonl" }] });
      fs.mkdirSync(path.join(runDir, "raw_traces_000001.jsonl"));
    }],
  ])("fails closed as indeterminate for %s with a plain-words reason", async (_label, reason, arrange) => {
    const runDir = await createRunDir();
    await arrange(runDir);

    const result = new AgentConversationActivityInspector().inspect({
      agentRunId: "run-1",
      memoryDir: runDir,
    });

    expect(result.kind).toBe("indeterminate");
    if (result.kind === "indeterminate") expect(result.error.message).toBe(reason);
  });

  it("treats missing required identity or memory path as indeterminate", () => {
    const result = new AgentConversationActivityInspector().inspect({ agentRunId: " ", memoryDir: " " });
    expect(result).toEqual({ kind: "indeterminate", error: new Error("its memory folder is unknown") });
  });

  describe("after an unclean shutdown (synthesized logs)", () => {
    const conversation = [
      { id: "user-1", ts: 1, trace_type: "user", content: "Bitte die Größe prüfen – 日本語" },
      { id: "assistant-1", ts: 2, trace_type: "assistant", content: "Erledigt ✓" },
      { id: "tool-1", ts: 3, trace_type: "tool_call", content: "write_file" },
    ];
    const bytesOf = (rows: unknown[]) => Buffer.from(rows.map((row) => `${JSON.stringify(row)}\n`).join(""), "utf8");

    it.each([
      ["1,241 zero bytes", Buffer.alloc(1241, 0)],
      ["a torn final record", Buffer.from('{"id":"tool-2","trace_type":"tool_result","content":"Grö', "utf8")],
    ])("classifies a log ending in %s as present and leaves it byte for byte unchanged (AC-001)", async (_label, damage) => {
      const runDir = await createRunDir();
      const filePath = new RunMemoryFileStore(runDir).getRawTracesPath();
      const before = Buffer.concat([bytesOf(conversation), damage]);
      await fsp.writeFile(filePath, before);

      expect(new AgentConversationActivityInspector().inspect({ agentRunId: "run-1", memoryDir: runDir }))
        .toEqual({ kind: "present" });
      expect((await fsp.readFile(filePath)).equals(before)).toBe(true);
    });

    it("classifies a log without conversation records and with a damaged end as none (AC-002)", async () => {
      const runDir = await createRunDir();
      await fsp.writeFile(new RunMemoryFileStore(runDir).getRawTracesPath(),
        Buffer.concat([bytesOf([{ id: "tool-1", ts: 1, trace_type: "tool_call" }]), Buffer.alloc(64, 0)]));

      expect(new AgentConversationActivityInspector().inspect({ agentRunId: "run-1", memoryDir: runDir }))
        .toEqual({ kind: "none" });
    });

    it.each([
      ["a zero run inside a record", Buffer.concat([Buffer.from('{"id":"user-0","trace_type":"user","content":"ab'), Buffer.alloc(8, 0), Buffer.from('cd"}\n')])],
      ["a zero run joining two records", Buffer.concat([Buffer.from('{"id":"tool-0","c":"x'), Buffer.alloc(8, 0), Buffer.from('y","ts":2}\n')])],
    ])("reports %s before the last record as indeterminate with the file and line (AC-002)", async (_label, damagedLine) => {
      const runDir = await createRunDir();
      await fsp.writeFile(new RunMemoryFileStore(runDir).getRawTracesPath(),
        Buffer.concat([bytesOf([{ id: "tool-a", ts: 1, trace_type: "tool_call" }]), damagedLine, bytesOf(conversation)]));

      const result = new AgentConversationActivityInspector().inspect({ agentRunId: "run-1", memoryDir: runDir });
      expect(result).toMatchObject({ kind: "indeterminate", error: { message: "line 2 of raw_traces_active.jsonl is damaged" } });
    });

    it("reads a complete archive segment with a damaged end tolerantly without cutting it", async () => {
      const runDir = await createRunDir();
      const store = new RunMemoryFileStore(runDir);
      await fsp.writeFile(store.getRawTracesArchiveManifestPath(), JSON.stringify({
        schema_version: 1, next_segment_index: 2, segments: [{ index: 1, status: "complete", file_name: "raw_traces_000001.jsonl" }],
      }), "utf8");
      const segmentPath = store.getCompleteRawTraceArchiveSegmentPathByFileName("raw_traces_000001.jsonl")!;
      await fsp.mkdir(path.dirname(segmentPath), { recursive: true });
      const segment = Buffer.concat([bytesOf(conversation), Buffer.alloc(32, 0)]);
      await fsp.writeFile(segmentPath, segment);

      expect(new AgentConversationActivityInspector().inspect({ agentRunId: "run-1", memoryDir: runDir }))
        .toEqual({ kind: "present" });
      expect((await fsp.readFile(segmentPath)).equals(segment)).toBe(true);
    });
  });
});
