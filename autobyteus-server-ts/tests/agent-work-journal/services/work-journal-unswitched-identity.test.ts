import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { RawTraceFileSourceService } from "../../../src/agent-memory/services/raw-trace-file-source-service.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { WorkJournalFileRenderer } from "../../../src/agent-work-journal/rendering/work-journal-file-renderer.js";
import { RUNTIME_OF, SYNTHETIC_TRACES, type TraceCase } from "../synthetic-run-traces.js";

/**
 * autobyteus-316, REQ-012 / AC-006: a run that never switched keeps its journals. The service now renders each file with the
 * runtime recorded for its own raw file; for a run whose archived segments record the run's own `RuntimeKind` value (what every
 * writer stores and autobyteus-343 converted the existing manifests to) that must give exactly what the one-runtime rule gave
 * before: every journal file equals the renderer's output for the run's runtime. Checked for the five runtimes on the contract's
 * synthetic traces split into two archived segments and the open file. (Also verified once against the base commit's service,
 * byte for byte: ticket evidence API-05.) A segment that records no runtime is deliberately read with the no-runtime rules.
 */
const BASE_TS = 1790056800;
const rawRecords = (cases: readonly TraceCase[]): Array<Record<string, unknown>> => {
  const out: Array<Record<string, unknown>> = [];
  let n = 0;
  const base = () => { n += 1; return { id: `rt_${String(n).padStart(4, "0")}`, seq: n, ts: BASE_TS + n, turn_id: "turn_0001" }; };
  for (const item of cases) {
    if (item.kind === "record") out.push({ ...base(), trace_type: item.type, content: item.text });
    else if (item.kind === "result_only") out.push({ ...base(), trace_type: "tool_result", tool_name: item.tool, tool_call_id: "orphan_call", tool_result: item.result, tool_error: null });
    else {
      const callId = `call_${n + 1}`;
      out.push({ ...base(), trace_type: "tool_call", tool_name: item.tool, tool_call_id: callId, tool_args: item.args });
      if (item.kind === "tool") out.push({ ...base(), trace_type: "tool_result", tool_name: item.tool, tool_call_id: callId, tool_result: item.result, tool_error: item.error });
    }
  }
  return out;
};

/** A never-switched run: two archived segments that record the run's own runtime, and the open file. */
const writeRun = (root: string, name: string): string => {
  const runtimeKind = RUNTIME_OF[name]!;
  const all = rawRecords(SYNTHETIC_TRACES[name]!);
  const third = Math.floor(all.length / 3);
  const parts = [all.slice(0, third), all.slice(third, 2 * third), all.slice(2 * third)];
  const runDir = path.join(root, "agents", "run_identity");
  fs.mkdirSync(runDir, { recursive: true });
  const write = (file: string, records: unknown[]) => fs.writeFileSync(path.join(runDir, file), records.map((record) => `${JSON.stringify(record)}\n`).join(""));
  write("raw_traces_000001.jsonl", parts[0]!);
  write("raw_traces_000002.jsonl", parts[1]!);
  write("raw_traces_active.jsonl", parts[2]!);
  fs.writeFileSync(path.join(runDir, "raw_traces_manifest.json"), JSON.stringify({ schema_version: 1, next_segment_index: 3,
    segments: [1, 2].map((index) => ({ index, file_name: `raw_traces_00000${index}.jsonl`, boundary_type: "provider_compaction_boundary", boundary_key: `boundary-${index}`,
      boundary_trace_id: null, runtime_kind: runtimeKind, source_event: "synthetic", archived_at: BASE_TS, first_trace_id: null, last_trace_id: null, first_ts: BASE_TS, last_ts: BASE_TS,
      record_count: parts[index - 1]!.length, status: "complete" })) }));
  return runDir;
};

describe("journals of a run that never switched (REQ-012)", () => {
  let root = "";
  afterEach(() => { if (root) fs.rmSync(root, { recursive: true, force: true }); root = ""; });

  it("a journal manifest written by the previous release (one runtime for the run, none per file) is read once and rewritten without changing any journal text", async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "journal-unswitched-"));
    const runDir = writeRun(root, "claude");
    const runtimeKind = RUNTIME_OF["claude"]!;
    const service = new WorkJournalService();
    const first = await service.ensureCurrent({ runId: "run_identity", memoryDir: runDir, runtimeKind });
    const texts = first.files.map((file) => fs.readFileSync(file.path, "utf8"));
    // The previous release's shape: a run-level runtime and file entries without a runtime.
    const manifestPath = path.join(runDir, "work_journal", "work_journal_manifest.json");
    const current = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { files: Array<Record<string, unknown>> };
    fs.writeFileSync(manifestPath, JSON.stringify({ ...current, runtime_kind: runtimeKind, files: current.files.map(({ runtime_kind: _runtime, ...rest }) => rest) }));
    const second = await new WorkJournalService().ensureCurrent({ runId: "run_identity", memoryDir: runDir, runtimeKind });
    expect(second.files.map((file) => fs.readFileSync(file.path, "utf8")), "no journal text changed").toEqual(texts);
    const rewritten = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { files: Array<{ runtime_kind: string | null }> };
    expect(Object.hasOwn(rewritten, "runtime_kind"), "the run-level runtime is gone").toBe(false);
    expect(rewritten.files.map((file) => file.runtime_kind)).toEqual([runtimeKind, runtimeKind, runtimeKind]);
    expect(second.evidenceHash, "memory search sees the same evidence: nothing is re-indexed").toBe(first.evidenceHash);
  });

  for (const name of Object.keys(SYNTHETIC_TRACES)) {
    it(`${name}: archived segments and the open file render exactly as the run's one runtime renders them`, async () => {
      const runtimeKind = RUNTIME_OF[name]!;
      root = fs.mkdtempSync(path.join(os.tmpdir(), "journal-unswitched-"));
      const runDir = writeRun(root, name);

      const pkg = await new WorkJournalService().ensureCurrent({ runId: "run_identity", memoryDir: runDir, runtimeKind });
      expect(pkg.files.map((file) => file.sourceFile)).toEqual(["raw_traces_000001.jsonl", "raw_traces_000002.jsonl", "raw_traces_active.jsonl"]);

      // The one-runtime rule: the renderer with the run's runtime on every file, fed by the same raw-trace reader.
      const source = new RawTraceFileSourceService(new MemoryFileStore(path.dirname(runDir), { runRootSubdir: "", warnOnMissingFiles: false }));
      const renderer = new WorkJournalFileRenderer();
      for (const rawFile of source.listFiles("run_identity", "chronological")) {
        const closed = rawFile.kind === "segment";
        const expected = renderer.render({ runId: "run_identity", runtimeKind,
          source: { fileName: rawFile.fileName, state: closed ? "closed" : "open", index: closed ? rawFile.segmentIndex ?? 0 : null },
          records: source.readSource("run_identity", rawFile).records }).markdown;
        const journal = pkg.files.find((file) => file.sourceFile === rawFile.fileName)!;
        expect(fs.readFileSync(journal.path, "utf8"), `${name}: ${rawFile.fileName}`).toBe(expected);
      }
    });
  }
});
