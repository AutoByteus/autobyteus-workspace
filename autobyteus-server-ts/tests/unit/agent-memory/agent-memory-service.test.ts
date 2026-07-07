import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
};

const writeJsonl = (filePath: string, payloads: unknown[]) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, payloads.map((p) => JSON.stringify(p)).join("\n"), "utf-8");
};

describe("AgentMemoryService", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("returns working context, episodic, semantic, and raw traces", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-123";
    const agentDir = path.join(tempDir, "agents", runId);

    writeJson(path.join(agentDir, "working_context_snapshot.json"), {
      messages: [
        {
          role: "user",
          content: "hello",
          reasoning_content: "why",
          tool_payload: { value: 1 },
        },
      ],
    });
    writeJsonl(path.join(agentDir, "episodic.jsonl"), [{ episode: "a" }]);
    writeJsonl(path.join(agentDir, "semantic.jsonl"), [{ fact: "b" }]);
    writeJsonl(path.join(agentDir, "raw_traces_active.jsonl"), [
      { trace_type: "user", content: "hello", ts: 1, turn_id: "t1", seq: 1 },
      {
        trace_type: "tool_call",
        tool_call_id: "1",
        tool_name: "search",
        tool_args: { q: "x" },
        ts: 2,
        turn_id: "t1",
        seq: 2,
      },
      {
        trace_type: "tool_result",
        tool_call_id: "1",
        tool_result: { ok: true },
        ts: 3,
        turn_id: "t1",
        seq: 3,
      },
    ]);

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeWorkingContext: true,
      includeEpisodic: true,
      includeSemantic: true,
      includeRawTraces: true,
    });

    expect(view.workingContext?.[0]?.role).toBe("user");
    expect(view.episodic?.[0]?.episode).toBe("a");
    expect(view.semantic?.[0]?.fact).toBe("b");
    expect(view.rawTraces?.length).toBe(3);
    expect(view.rawTraces?.[1]?.toolCallId).toBe("1");
  });

  it("applies raw trace limits", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-456";
    const agentDir = path.join(tempDir, "agents", runId);

    writeJsonl(path.join(agentDir, "raw_traces_active.jsonl"), [
      { trace_type: "user", content: "one", ts: 1, turn_id: "t1", seq: 1 },
      { trace_type: "assistant", content: "two", ts: 2, turn_id: "t1", seq: 2 },
    ]);

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeRawTraces: true,
      rawTraceLimit: 1,
    });

    expect(view.rawTraces?.length).toBe(1);
    expect(view.rawTraces?.[0]?.content).toBe("two");
  });

  it("reads archive segments plus active traces as the complete corpus", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-archive";
    const agentDir = path.join(tempDir, "agents", runId);
    const store = new RunMemoryFileStore(agentDir);
    store.appendRawTrace(new RawTraceItem({
      id: "rt-archive",
      ts: 1,
      turnId: "t1",
      seq: 1,
      traceType: "user",
      content: "archived",
      sourceEvent: "test",
    }));
    store.appendRawTrace(new RawTraceItem({
      id: "rt-boundary",
      ts: 2,
      turnId: "t1",
      seq: 2,
      traceType: "provider_compaction_boundary",
      content: "boundary",
      sourceEvent: "COMPACTION_STATUS",
    }));
    store.rotateActiveRawTracesBeforeBoundary({
      boundaryType: "provider_compaction_boundary",
      boundaryKey: "codex:thread:boundary",
      boundaryTraceId: "rt-boundary",
    });

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeRawTraces: true,
      includeArchive: true,
    });

    expect(view.rawTraces?.map((trace) => trace.id)).toEqual(["rt-archive", "rt-boundary"]);
  });

  it("lists raw trace files active first and reads only the selected segment filename", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-segments";
    const agentDir = path.join(tempDir, "agents", runId);

    writeJsonl(path.join(agentDir, "raw_traces_active.jsonl"), [
      { id: "active-1", trace_type: "assistant", content: "active", ts: 30, turn_id: "t1", seq: 3 },
    ]);
    writeJsonl(path.join(agentDir, "raw_traces_000001.jsonl"), [
      { id: "segment-1", trace_type: "user", content: "segment one", ts: 10, turn_id: "t1", seq: 1 },
    ]);
    writeJsonl(path.join(agentDir, "raw_traces_000002.jsonl"), [
      { id: "segment-2", trace_type: "assistant", content: "segment two", ts: 20, turn_id: "t1", seq: 2 },
    ]);
    writeJson(path.join(agentDir, "raw_traces_manifest.json"), {
      schema_version: 1,
      next_segment_index: 4,
      segments: [
        segmentEntry(1, "raw_traces_000001.jsonl", 10, "complete"),
        segmentEntry(2, "raw_traces_000002.jsonl", 20, "complete"),
        segmentEntry(3, "raw_traces_000003.jsonl", 25, "pending"),
      ],
    });

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeRawTraces: true,
      includeRawTraceFiles: true,
      rawTraceFileName: "raw_traces_000001.jsonl",
    });

    expect(view.rawTraceFiles?.map((file) => file.fileName)).toEqual([
      "raw_traces_active.jsonl",
      "raw_traces_000002.jsonl",
      "raw_traces_000001.jsonl",
    ]);
    expect(view.rawTraceFiles?.map((file) => file.recordCount)).toEqual([1, 1, 1]);
    expect(view.selectedRawTraceFileName).toBe("raw_traces_000001.jsonl");
    expect(view.rawTraces?.map((trace) => trace.content)).toEqual(["segment one"]);
  });

  it("falls back to the default raw trace file for invalid selected filenames", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-invalid-file";
    const agentDir = path.join(tempDir, "agents", runId);

    writeJsonl(path.join(agentDir, "raw_traces_active.jsonl"), [
      { id: "active-1", trace_type: "assistant", content: "active", ts: 30, turn_id: "t1", seq: 3 },
    ]);
    writeJsonl(path.join(agentDir, "raw_traces_000001.jsonl"), [
      { id: "segment-1", trace_type: "user", content: "segment one", ts: 10, turn_id: "t1", seq: 1 },
    ]);
    writeJson(path.join(agentDir, "raw_traces_manifest.json"), {
      schema_version: 1,
      next_segment_index: 2,
      segments: [segmentEntry(1, "raw_traces_000001.jsonl", 10, "complete")],
    });

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeRawTraces: true,
      includeRawTraceFiles: true,
      rawTraceFileName: "/tmp/raw_traces_000001.jsonl",
    });

    expect(view.selectedRawTraceFileName).toBe("raw_traces_active.jsonl");
    expect(view.rawTraces?.map((trace) => trace.content)).toEqual(["active"]);
  });

  it("does not create a missing run directory for includeArchive raw-trace reads", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "missing-run";
    const runDir = path.join(tempDir, "agents", runId);

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeRawTraces: true,
      includeArchive: true,
    });

    expect(view.rawTraces).toEqual([]);
    expect(fs.existsSync(runDir)).toBe(false);
  });

  it("respects include flags", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-789";
    const agentDir = path.join(tempDir, "agents", runId);

    writeJsonl(path.join(agentDir, "raw_traces_active.jsonl"), [
      { trace_type: "user", content: "hello", ts: 1, turn_id: "t1", seq: 1 },
    ]);

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeRawTraces: true,
    });

    expect(view.workingContext).toBeNull();
    expect(view.episodic).toBeNull();
    expect(view.semantic).toBeNull();
    expect(view.rawTraces?.length).toBe(1);
  });
});

const segmentEntry = (
  index: number,
  fileName: string,
  ts: number,
  status: "complete" | "pending",
) => ({
  index,
  file_name: fileName,
  boundary_type: "provider_compaction_boundary",
  boundary_key: `boundary-${index}`,
  boundary_trace_id: null,
  runtime_kind: null,
  source_event: null,
  archived_at: ts,
  first_trace_id: `first-${index}`,
  last_trace_id: `last-${index}`,
  first_ts: ts,
  last_ts: ts,
  record_count: 1,
  status,
});
