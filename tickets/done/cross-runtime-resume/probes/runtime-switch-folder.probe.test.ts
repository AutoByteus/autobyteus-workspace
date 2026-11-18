// PROBE (not part of any suite): the "folder test" of autobyteus-316. Synthetic data only, isolated temp folder.
// Copy to autobyteus-server-ts/tests/ in a worktree with dependencies and run with vitest; delete afterwards.
// Question: what does a runtime switch do to a run folder that already has raw traces, when the switch is done with the
// existing primitives (append a marker record, rotate the active file before it, append the new runtime's records)?
import fs from "node:fs";
import path from "node:path";
import { it, expect } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { RuntimeKind } from "../src/runtime-management/runtime-kind-enum.js";
import { WorkJournalService } from "../src/agent-work-journal/services/work-journal-service.js";
import { makeTempMemoryRoot, makeRunDir, turnRecords, BASE_TS } from "./agent-work-journal/raw-trace-folder-fixtures.js";

const lines = (p: string) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, any>);

it("switch at a run folder with old records", async () => {
  const root = makeTempMemoryRoot();
  const runDir = makeRunDir(root, "run_switch_1");
  // Old colleague (Claude-shaped records), already in the active file.
  fs.writeFileSync(path.join(runDir, "raw_traces_active.jsonl"),
    [...turnRecords("t1", "git status", "clean"), ...turnRecords("t2", "pytest -q", "1 passed")].map((r) => JSON.stringify(r)).join("\n") + "\n");
  const store = new RunMemoryFileStore(runDir);
  const out: string[] = [];

  // Step 1: marker record (the first record of the new file), deterministic id from the boundary key.
  const key = "runtime_switch:run_switch_1:2026-10-30T12:00:00.000Z";
  const markerId = "rt_switch_0001";
  const addMarker = () => store.add([new RawTraceItem({ id: markerId, ts: BASE_TS + 100, turnId: "switch", seq: 0, traceType: "system_task_notification",
    content: "Runtime switched from Claude to Codex.", sourceEvent: "runtime_switch", senderId: "system.runtime_handover" })]);
  addMarker();
  // Step 2: rotate before the marker (the primitive compaction uses), typed as a new boundary.
  const rotate = () => store.rotateActiveRawTracesBeforeBoundary({ boundaryType: "runtime_switch" as any, boundaryKey: key, boundaryTraceId: markerId, runtimeKind: "CLAUDE", sourceEvent: "runtime_switch" });
  const first = rotate();
  out.push(`rotate #1 -> segment ${first?.file_name} runtime_kind=${first?.runtime_kind} boundary_type=${first?.boundary_type} records=${first?.record_count}`);
  const again = rotate();
  out.push(`rotate #2 (same key, retry) -> ${again === null ? "null (nothing moved)" : again.file_name}`);

  // Step 3: the new colleague (Codex) records continue in the same active file.
  store.add([
    new RawTraceItem({ id: "rt_new_1", ts: BASE_TS + 200, turnId: "t3", seq: 1, traceType: "user", content: "continue", sourceEvent: "AgentRun.postUserMessage" }),
    new RawTraceItem({ id: "rt_new_2", ts: BASE_TS + 201, turnId: "t3", seq: 2, traceType: "tool_call", content: "", sourceEvent: "TOOL_EXECUTION_STARTED", toolName: "run_bash", toolCallId: "c9", toolArgs: { command: "ls" } }),
    new RawTraceItem({ id: "rt_new_3", ts: BASE_TS + 202, turnId: "t3", seq: 3, traceType: "tool_result", content: "", sourceEvent: "TOOL_EXECUTION_SUCCEEDED", toolName: "run_bash", toolCallId: "c9", toolResult: "a\nb" }),
  ]);
  const files = fs.readdirSync(runDir).sort();
  out.push("files: " + files.join(", "));
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "raw_traces_manifest.json"), "utf8"));
  out.push("manifest: " + JSON.stringify({ next: manifest.next_segment_index, segments: manifest.segments.map((s: any) => [s.file_name, s.boundary_type, s.runtime_kind, s.record_count, s.status]) }));
  const active = lines(path.join(runDir, "raw_traces_active.jsonl"));
  out.push("active file types: " + active.map((r) => r.trace_type + ":" + r.id).join(" | "));
  out.push("segment 1 ids: " + lines(path.join(runDir, "raw_traces_000001.jsonl")).map((r) => r.id).join(","));
  expect(active[0]!.id).toBe(markerId);
  expect(lines(path.join(runDir, "raw_traces_000001.jsonl")).length).toBe(8);

  // Crash case: marker appended again with the same id would duplicate; the design checks the active file for the marker id first.
  const dupBefore = active.filter((r) => r.id === markerId).length;
  out.push("marker records after retry: " + dupBefore);

  // Journal with today's code: one runtime for every file.
  const svc = new WorkJournalService();
  const pkg = await svc.ensureCurrent({ runId: "run_switch_1", memoryDir: runDir, runtimeKind: RuntimeKind.CODEX_APP_SERVER });
  for (const f of pkg.files) out.push(`--- journal ${path.basename(f.path)} (${f.state}), rendered with the CURRENT runtime (Codex) for every file:\n` + fs.readFileSync(f.path, "utf8").split("\n").slice(1, 8).join("\n"));
  fs.writeFileSync("/tmp/xrr316-folder-test.txt", out.join("\n"));
});
