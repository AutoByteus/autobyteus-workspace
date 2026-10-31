// PROBE (not part of any suite): validates the data model of run-runtime-switch-contract.md v2 end to end on SYNTHETIC data in a temp folder.
// Claude work -> switch to Codex -> Codex work -> switch back to Claude -> Claude work. Real RunMemoryFileStore, real raw-trace readers,
// real journal renderer and real chat projection. Copy to autobyteus-server-ts/tests/, run with vitest, delete afterwards.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { it, expect } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { RuntimeKind } from "../src/runtime-management/runtime-kind-enum.js";
import { WorkJournalFileRenderer } from "../src/agent-work-journal/rendering/work-journal-file-renderer.js";
import { WorkJournalService } from "../src/agent-work-journal/services/work-journal-service.js";
import { RawTraceFileSourceService } from "../src/agent-memory/services/raw-trace-file-source-service.js";
import { MemoryFileStore } from "../src/agent-memory/store/memory-file-store.js";
import { buildHistoricalReplayEvents } from "../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { makeTempMemoryRoot, makeRunDir, BASE_TS } from "./agent-work-journal/raw-trace-folder-fixtures.js";

const LABEL: Record<string, RuntimeKind> = { CLAUDE: RuntimeKind.CLAUDE_AGENT_SDK, CODEX: RuntimeKind.CODEX_APP_SERVER };
const sha = (p: string) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
let ts = BASE_TS;
let n = 0;
const rec = (turnId: string, seq: number, traceType: string, extra: Record<string, unknown>) =>
  new RawTraceItem({ id: `rt_${++n}`, ts: ++ts, turnId, seq, traceType: traceType as any, content: "", sourceEvent: "synthetic", ...extra } as any);
const turn = (store: RunMemoryFileStore, turnId: string, tool: string, command: string, out: string, user: string, assistant: string) => {
  const call = `c_${++n}`;
  store.add([
    rec(turnId, 1, "user", { content: user }),
    rec(turnId, 2, "tool_call", { toolName: tool, toolCallId: call, toolArgs: { command } }),
    rec(turnId, 3, "tool_result", { toolName: tool, toolCallId: call, toolResult: out }),
    rec(turnId, 4, "assistant", { content: assistant }),
  ]);
};
const switchRuntime = (store: RunMemoryFileStore, runId: string, requestedAt: string, fromLabel: string, text: string) => {
  const key = `runtime_switch:${runId}:${requestedAt}`;
  const existing = store.findActiveRawTraceByCorrelationId?.(key);
  let markerId = existing?.id ?? null;
  if (!markerId) {
    const marker = rec("runtime-switch", 0, "system_task_notification", { content: text, senderId: "system.runtime_handover", correlationId: key, sourceEvent: "runtime_switch" });
    store.add([marker]);
    markerId = marker.id;
  }
  return store.rotateActiveRawTracesBeforeBoundary({ boundaryType: "runtime_switch" as any, boundaryKey: key, boundaryTraceId: markerId, runtimeKind: fromLabel, sourceEvent: "runtime_switch" });
};

it("data model of the runtime switch contract holds end to end", async () => {
  const out: string[] = [];
  const root = makeTempMemoryRoot();
  const runId = "run_dm_1";
  const runDir = makeRunDir(root, runId);
  const store = new RunMemoryFileStore(runDir);

  // Stretch 1: Claude.
  turn(store, "t1", "Bash", "git status", "clean", "Check the repo", "Repo is clean.");
  turn(store, "t2", "Bash", "pytest -q", "1 passed", "Run the tests", "Tests pass.");
  // Switch 1: Claude -> Codex.
  const s1 = switchRuntime(store, runId, "2026-10-30T10:00:00.000Z", "CLAUDE", "Runtime switched from Claude to Codex.");
  const retry1 = switchRuntime(store, runId, "2026-10-30T10:00:00.000Z", "CLAUDE", "Runtime switched from Claude to Codex.");
  // Stretch 2: Codex.
  turn(store, "t1", "run_bash", "ls src", "a.ts\nb.ts", "Now list the sources", "Two files.");
  // Switch 2: Codex -> Claude (A -> B -> A).
  const snap1 = sha(path.join(runDir, "raw_traces_000001.jsonl"));
  const s2 = switchRuntime(store, runId, "2026-10-30T11:00:00.000Z", "CODEX", "Runtime switched from Codex to Claude.");
  // Stretch 3: Claude again.
  turn(store, "t1", "Bash", "git log -1", "abc123 init", "What was the last commit?", "abc123.");

  out.push("files: " + fs.readdirSync(runDir).sort().join(", "));
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "raw_traces_manifest.json"), "utf8"));
  out.push("raw manifest: " + JSON.stringify(manifest.segments.map((s: any) => [s.file_name, s.boundary_type, s.boundary_key, s.runtime_kind, s.record_count, s.status])));
  out.push(`switch1 -> ${s1?.file_name}; retry -> ${retry1 === null ? "null" : retry1.file_name}; switch2 -> ${s2?.file_name}`);

  // ---- invariants ----
  const segs = manifest.segments as any[];
  const readLines = (f: string) => fs.readFileSync(path.join(runDir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as any);
  const checks: Record<string, boolean> = {};
  checks["I-2 every manifest segment has runtime_kind and its file; no orphan file"] =
    segs.every((s) => s.runtime_kind && fs.existsSync(path.join(runDir, s.file_name))) &&
    fs.readdirSync(runDir).filter((f) => /^raw_traces_\d{6}\.jsonl$/.test(f)).every((f) => segs.some((s) => s.file_name === f));
  checks["I-3 first record of each file after a segment is the marker (id = boundary_trace_id, correlation = key)"] =
    segs.every((s, i) => {
      const next = readLines(i + 1 < segs.length ? segs[i + 1].file_name : "raw_traces_active.jsonl")[0];
      return next.id === s.boundary_trace_id && next.correlation_id === s.boundary_key && next.sender_id === "system.runtime_handover";
    });
  checks["I-4 segment label = runtime that wrote it (CLAUDE, CODEX)"] = segs[0].runtime_kind === "CLAUDE" && segs[1].runtime_kind === "CODEX";
  checks["I-5 unique boundary keys; one marker per key"] = new Set(segs.map((s) => s.boundary_key)).size === segs.length &&
    segs.every((s) => [...segs.map((x) => x.file_name), "raw_traces_active.jsonl"].flatMap(readLines).filter((r) => r.correlation_id === s.boundary_key).length === 1);
  checks["I-7 no segment mixes runtimes: seg1 only Bash, seg2 only run_bash"] =
    readLines(segs[0].file_name).filter((r) => r.tool_name).every((r) => r.tool_name === "Bash") &&
    readLines(segs[1].file_name).filter((r) => r.tool_name).every((r) => r.tool_name === "run_bash");
  checks["I-8 earlier segment byte-unchanged by the later switch"] = snap1 === sha(path.join(runDir, "raw_traces_000001.jsonl"));
  checks["retry of switch 1 moved nothing"] = retry1 === null;
  for (const [k, v] of Object.entries(checks)) { out.push(`${v ? "PASS" : "FAIL"} ${k}`); expect(v, k).toBe(true); }

  // ---- journal: today vs lookup rule ----
  const source = new RawTraceFileSourceService(new MemoryFileStore(path.dirname(runDir), { runRootSubdir: "", warnOnMissingFiles: false }));
  const files = source.listFiles(runId, "chronological");
  const renderer = new WorkJournalFileRenderer();
  const labelOf = (fileName: string) => segs.find((s) => s.file_name === fileName)?.runtime_kind as string | undefined;
  const current = RuntimeKind.CLAUDE_AGENT_SDK; // the run ended on Claude
  const render = (f: (typeof files)[number], runtime: RuntimeKind | null) =>
    renderer.render({ runId, runtimeKind: runtime, source: { fileName: f.fileName, state: f.kind === "segment" ? "closed" : "open", index: f.kind === "segment" ? f.segmentIndex ?? 0 : null }, records: source.readSource(runId, f).records }).markdown;
  const body = (md: string) => md.split("\n").filter((l) => /^\[\d\d:\d\d:\d\d\]/.test(l)).map((l) => l.replace(/\s*\[↗\].*$/, "")).slice(0, 7);
  const rules: Record<string, string[]> = {};
  for (const f of files) {
    const rule = f.kind === "segment" ? LABEL[labelOf(f.fileName)!] : current;
    const withRule = render(f, rule);
    const today = render(f, current);
    rules[f.fileName] = body(withRule);
    out.push(`--- ${f.fileName}: lookup rule -> ${rule}; entries:\n  ${body(withRule).join("\n  ")}`);
    if (rule !== current) out.push(`    (today's single-runtime output differs: ${withRule !== today})`);
  }
  expect(rules["raw_traces_000001.jsonl"]!.join("\n")).toContain("Command: git status");
  expect(rules["raw_traces_000002.jsonl"]!.join("\n")).toContain("Command: ls src");
  expect(rules["raw_traces_active.jsonl"]!.join("\n")).toContain("Command: git log -1");
  expect(rules["raw_traces_000001.jsonl"]!.join("\n")).not.toContain("Runtime switched");
  const activeEntries = rules["raw_traces_active.jsonl"]!.join("\n");
  const seg2Entries = rules["raw_traces_000002.jsonl"]!.join("\n");
  out.push("marker as first journal entry of seg2: " + /Notice:.*Runtime switched from Claude to Codex/.test(seg2Entries));
  out.push("marker as first journal entry of active: " + /Notice:.*Runtime switched from Codex to Claude/.test(activeEntries));
  expect(/Notice:.*Runtime switched from Claude to Codex/.test(seg2Entries)).toBe(true);
  expect(/Notice:.*Runtime switched from Codex to Claude/.test(activeEntries)).toBe(true);

  // today's real service for comparison (what the shipped code would print for the old Claude file when the run is Claude now): same label, fine; and for Codex file:
  const svc = new WorkJournalService();
  const pkg = await svc.ensureCurrent({ runId, memoryDir: runDir, runtimeKind: current });
  const codexFileToday = fs.readFileSync(pkg.files.find((f) => f.sourceFile === "raw_traces_000002.jsonl")!.path, "utf8");
  out.push("today's service, Codex file rendered with the run's current runtime (Claude): " + (codexFileToday.includes("Command: ls src") ? "correct" : "WRONG: " + body(codexFileToday)[1]));

  // ---- chat: history projection over all files in order ----
  const all = files.flatMap((f) => source.readSelectedFile(runId, f.fileName).records);
  const events = buildHistoricalReplayEvents(all as any);
  const kinds = events.map((e: any) => `${e.kind}${e.senderId ? ":" + e.senderId : ""}`);
  out.push("chat replay kinds in order: " + kinds.join(" | "));
  expect(kinds.filter((k) => k.includes("system.runtime_handover")).length).toBe(2);
  fs.writeFileSync("/tmp/xrr316-data-model-validation.txt", out.join("\n"));
});
