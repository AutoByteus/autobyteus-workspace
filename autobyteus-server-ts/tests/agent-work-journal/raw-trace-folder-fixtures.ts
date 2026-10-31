import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Hand-built raw-trace run folders (snake_case records as the recorders write them, plus a
 * `raw_traces_manifest.json` listing closed segments). Never copied from real user data.
 */
export type RawRecord = Record<string, unknown>;

export const BASE_TS = 1790056800;

export const makeTempMemoryRoot = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "work-journal-"));

export const makeRunDir = (root: string, runId = "run_journal_1"): string => {
  const runDir = path.join(root, "agents", runId);
  fs.mkdirSync(runDir, { recursive: true });
  return runDir;
};

let counter = 0;

/** One user → tool call → result → assistant turn. */
export const turnRecords = (turnId: string, command: string, output: string): RawRecord[] => {
  const next = () => {
    counter += 1;
    return { id: `rt_${String(counter).padStart(5, "0")}`, seq: counter, ts: BASE_TS + counter, turn_id: turnId };
  };
  const callId = `call_${counter + 1}`;
  return [
    { ...next(), trace_type: "user", content: `Run ${command}` },
    { ...next(), trace_type: "tool_call", tool_name: "Bash", tool_call_id: callId, tool_args: { command } },
    { ...next(), trace_type: "tool_result", tool_name: "Bash", tool_call_id: callId, tool_result: output },
    { ...next(), trace_type: "assistant", content: `Ran ${command}.` },
  ];
};

const writeJsonl = (filePath: string, records: readonly RawRecord[]): void => {
  fs.writeFileSync(filePath, records.map((record) => `${JSON.stringify(record)}\n`).join(""), "utf-8");
};

export const writeActive = (runDir: string, records: readonly RawRecord[]): void =>
  writeJsonl(path.join(runDir, "raw_traces_active.jsonl"), records);

export const appendActive = (runDir: string, records: readonly RawRecord[]): void =>
  fs.appendFileSync(path.join(runDir, "raw_traces_active.jsonl"), records.map((record) => `${JSON.stringify(record)}\n`).join(""), "utf-8");

type SegmentEntry = Readonly<{ index: number; fileName: string; recordCount: number; status?: "complete" | "pending"; runtimeKind: string | null }>;

const writeRawManifest = (runDir: string, segments: readonly SegmentEntry[]): void => {
  fs.writeFileSync(path.join(runDir, "raw_traces_manifest.json"), JSON.stringify({
    schema_version: 1,
    next_segment_index: segments.length + 1,
    segments: segments.map((segment) => ({
      index: segment.index,
      file_name: segment.fileName,
      boundary_type: "provider_compaction_boundary",
      boundary_key: `boundary-${segment.index}`,
      boundary_trace_id: null,
      runtime_kind: segment.runtimeKind,
      source_event: null,
      archived_at: BASE_TS,
      first_trace_id: null,
      last_trace_id: null,
      first_ts: BASE_TS,
      last_ts: BASE_TS,
      record_count: segment.recordCount,
      status: segment.status ?? "complete",
    })),
  }), "utf-8");
};

const readSegments = (runDir: string): SegmentEntry[] => {
  const manifestPath = path.join(runDir, "raw_traces_manifest.json");
  if (!fs.existsSync(manifestPath)) return [];
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as { segments: Array<Record<string, unknown>> };
  return manifest.segments.map((segment) => ({
    index: segment.index as number,
    fileName: segment.file_name as string,
    recordCount: segment.record_count as number,
    status: segment.status as "complete" | "pending",
    runtimeKind: (segment.runtime_kind as string | null | undefined) ?? null,
  }));
};

/**
 * What a compaction does to the raw folder: the active records become the next closed segment, which records the agent
 * runtime that wrote it (the manifest's `runtime_kind`; Claude Agent SDK unless the test says otherwise).
 */
export const rotateActive = (runDir: string, runtimeKind: string | null = "claude_agent_sdk"): string => {
  const activePath = path.join(runDir, "raw_traces_active.jsonl");
  const raw = fs.existsSync(activePath) ? fs.readFileSync(activePath, "utf-8") : "";
  const segments = readSegments(runDir);
  const index = segments.length + 1;
  const fileName = `raw_traces_${String(index).padStart(6, "0")}.jsonl`;
  fs.writeFileSync(path.join(runDir, fileName), raw, "utf-8");
  fs.writeFileSync(activePath, "", "utf-8");
  writeRawManifest(runDir, [...segments, { index, fileName, recordCount: raw.split("\n").filter(Boolean).length, runtimeKind }]);
  return fileName;
};

/** Rewrites the raw manifest's record count of one segment (e.g. a segment that grew). */
export const setSegmentRecordCount = (runDir: string, fileName: string, recordCount: number): void =>
  writeRawManifest(runDir, readSegments(runDir).map((segment) => segment.fileName === fileName ? { ...segment, recordCount } : segment));

/** Rewrites the agent runtime the raw manifest records for one segment. */
export const setSegmentRuntimeKind = (runDir: string, fileName: string, runtimeKind: string | null): void =>
  writeRawManifest(runDir, readSegments(runDir).map((segment) => segment.fileName === fileName ? { ...segment, runtimeKind } : segment));
