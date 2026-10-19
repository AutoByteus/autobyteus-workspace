import fs from "node:fs";
import path from "node:path";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { afterAll, describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { makeRunDir, makeTempMemoryRoot, type RawRecord } from "../raw-trace-folder-fixtures.js";

/**
 * N2 (design review): main-thread cost of one journal update on a large open raw file.
 * Gated: RUN_WORK_JOURNAL_PERF=1. Results go to WORK_JOURNAL_PERF_OUT (JSON) when set.
 *
 * Escalation threshold, fixed before measuring: the longest main-thread block of one update must
 * stay ≤ 100 ms for a p90-size open file (5.2 MB) and ≤ 1,000 ms for the largest one seen
 * (28 MB). Above either, rendering "measurably delays later turns" (design escalation trigger):
 * return a Design Impact and take Follow-up 4 (incremental append).
 */
const RUN = process.env.RUN_WORK_JOURNAL_PERF === "1";
const THRESHOLDS_MS = { p90: 100, max: 1_000 } as const;
const SIZES = { p90: 5.2 * 1024 * 1024, max: 28 * 1024 * 1024 } as const;
const BASE_TS = 1790056800;

/** A deterministic text of about `bytes` bytes in `lineLength`-character lines. */
const text = (bytes: number, seed: number, lineLength = 80): string => {
  const lines: string[] = [];
  let size = 0;
  for (let index = 0; size < bytes; index += 1) {
    const line = `${seed}:${index} ${"lorem ipsum dolor sit amet ".repeat(4)}`.slice(0, lineLength);
    lines.push(line);
    size += line.length + 1;
  }
  return lines.join("\n");
};

/**
 * One synthetic turn shaped after the recorded mix (probes): a message, reasoning, commands with
 * short and long output, a numbered file read, an edit, a write, a generic tool, an answer.
 */
const turn = (turnNumber: number, next: () => number): RawRecord[] => {
  const turnId = `turn_${turnNumber}`;
  const record = (fields: RawRecord): RawRecord => {
    const seq = next();
    return { id: `rt_${seq}`, seq, ts: BASE_TS + seq, turn_id: turnId, ...fields };
  };
  const tool = (name: string, args: RawRecord, result: unknown): RawRecord[] => {
    const callId = `call_${turnNumber}_${name}_${next()}`;
    return [
      record({ trace_type: "tool_call", tool_name: name, tool_call_id: callId, tool_args: args }),
      record({ trace_type: "tool_result", tool_name: name, tool_call_id: callId, tool_result: result }),
    ];
  };
  const numbered = text(12_000, turnNumber).split("\n").map((line, index) => `${index + 1}\t${line}`).join("\n");
  return [
    record({ trace_type: "user", content: text(300, turnNumber, 120) }),
    record({ trace_type: "reasoning", content: text(1_500, turnNumber) }),
    ...tool("Bash", { command: `git status --short && ls src/${turnNumber}` }, text(400, turnNumber)),
    ...tool("Bash", { command: `pnpm test -- run ${turnNumber}` }, text(16_000, turnNumber + 1)),
    ...tool("Read", { file_path: `/w/src/file_${turnNumber}.ts` }, numbered),
    ...tool("Edit", { file_path: `/w/src/file_${turnNumber}.ts`, old_string: text(600, turnNumber), new_string: text(700, turnNumber + 2) }, "The file was updated successfully."),
    ...tool("Write", { file_path: `/w/notes/${turnNumber}.md`, content: text(2_000, turnNumber) }, "File created successfully."),
    ...tool("mcp__notes__save", { title: `note ${turnNumber}`, body: text(800, turnNumber) }, { content: [{ type: "text", text: "saved" }] }),
    record({ trace_type: "assistant", content: text(800, turnNumber, 120) }),
  ];
};

const writeOpenFile = (runDir: string, targetBytes: number): { bytes: number; records: number; turns: number } => {
  let seq = 0;
  const next = () => (seq += 1);
  const filePath = path.join(runDir, "raw_traces_active.jsonl");
  const fd = fs.openSync(filePath, "w");
  let bytes = 0;
  let records = 0;
  let turns = 0;
  while (bytes < targetBytes) {
    turns += 1;
    const chunk = turn(turns, next).map((item) => `${JSON.stringify(item)}\n`).join("");
    fs.writeSync(fd, chunk);
    bytes += Buffer.byteLength(chunk);
    records += chunk.split("\n").length - 1;
  }
  fs.closeSync(fd);
  return { bytes, records, turns };
};

/** Wall time of one update and the longest event-loop block observed while it ran. */
const measureUpdate = async (service: WorkJournalService, runDir: string) => {
  const histogram = monitorEventLoopDelay({ resolution: 1 });
  histogram.enable();
  // A ticker keeps the loop sampled so a long synchronous block shows up as one long delay.
  let longestGapMs = 0;
  let last = performance.now();
  const ticker = setInterval(() => {
    const now = performance.now();
    longestGapMs = Math.max(longestGapMs, now - last);
    last = now;
  }, 1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  last = performance.now();
  const started = performance.now();
  const pkg = await service.ensureCurrent({ runId: path.basename(runDir), memoryDir: runDir, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });
  const wallMs = performance.now() - started;
  await new Promise((resolve) => setTimeout(resolve, 20));
  clearInterval(ticker);
  histogram.disable();
  const journalBytes = fs.statSync(pkg.files.at(-1)!.path).size;
  return { wallMs, longestBlockMs: longestGapMs, eventLoopMaxDelayMs: histogram.max / 1e6, journalBytes };
};

/** The synchronous steps of one update, timed separately (same order as WorkJournalService). */
const breakdown = async (runDir: string) => {
  const { MemoryFileStore } = await import("../../../src/agent-memory/store/memory-file-store.js");
  const { RawTraceFileSourceService } = await import("../../../src/agent-memory/services/raw-trace-file-source-service.js");
  const { WorkJournalFileRenderer } = await import("../../../src/agent-work-journal/rendering/work-journal-file-renderer.js");
  const { createHash } = await import("node:crypto");
  const source = new RawTraceFileSourceService(new MemoryFileStore(path.dirname(runDir), { runRootSubdir: "", warnOnMissingFiles: false }));
  const runId = path.basename(runDir);
  let at = performance.now();
  const lap = () => { const now = performance.now(); const ms = now - at; at = now; return Math.round(ms); };
  const files = source.listFiles(runId, "chronological");
  const listFilesMs = lap();
  const { records } = source.readSource(runId, files.at(-1)!);
  const readAndNormalizeMs = lap();
  const { markdown } = new WorkJournalFileRenderer().render({
    runId, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, source: { fileName: files.at(-1)!.fileName, state: "open", index: null }, records,
  });
  const renderMs = lap();
  createHash("sha256").update(markdown).digest("hex");
  const hashMs = lap();
  return { listFilesMs, readAndNormalizeMs, renderMs, hashMs };
};

describe.runIf(RUN)("N2: main-thread cost of one journal update on a large open file", () => {
  const roots: string[] = [];
  const results: Record<string, unknown> = {
    thresholdsMs: THRESHOLDS_MS,
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
  };
  afterAll(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    if (process.env.WORK_JOURNAL_PERF_OUT) fs.writeFileSync(process.env.WORK_JOURNAL_PERF_OUT, `${JSON.stringify(results, null, 2)}\n`);
    console.log(JSON.stringify(results, null, 2));
  });

  for (const sizeName of ["p90", "max"] as const) {
    it(`${sizeName} open file (${(SIZES[sizeName] / 1024 / 1024).toFixed(1)} MB)`, async () => {
      const root = makeTempMemoryRoot();
      roots.push(root);
      const runDir = makeRunDir(root, `run_perf_${sizeName}`);
      const fixture = writeOpenFile(runDir, SIZES[sizeName]);
      const service = new WorkJournalService();
      // Cold: no journal yet (first need). Warm: the next turn end, one turn appended.
      const cold = await measureUpdate(service, runDir);
      fs.appendFileSync(path.join(runDir, "raw_traces_active.jsonl"),
        turn(fixture.turns + 1, (() => { let seq = fixture.records + 10_000; return () => (seq += 1); })())
          .map((item) => `${JSON.stringify(item)}\n`).join(""));
      const warm = [await measureUpdate(service, runDir), await measureUpdate(service, runDir), await measureUpdate(service, runDir)];
      const steps = await breakdown(runDir);
      const worstBlockMs = Math.max(cold.longestBlockMs, ...warm.map((sample) => sample.longestBlockMs));
      results[sizeName] = {
        fixture: { mb: +(fixture.bytes / 1024 / 1024).toFixed(1), records: fixture.records, turns: fixture.turns },
        cold: round(cold),
        warm: warm.map(round),
        warmBreakdownMs: steps,
        worstBlockMs: Math.round(worstBlockMs),
        thresholdMs: THRESHOLDS_MS[sizeName],
        withinThreshold: worstBlockMs <= THRESHOLDS_MS[sizeName],
      };
      expect(cold.journalBytes).toBeGreaterThan(0);
    }, 600_000);
  }
});

const round = (sample: Record<string, number>) =>
  Object.fromEntries(Object.entries(sample).map(([key, value]) => [key, Math.round(value)]));
