import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WORK_JOURNAL_RENDERER_REVISION } from "../../../src/agent-work-journal/domain/work-journal-models.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { BASE_TS, makeRunDir, makeTempMemoryRoot, rotateActive, writeActive, type RawRecord } from "../raw-trace-folder-fixtures.js";

/** autobyteus-377 AC-011: a closed journal written by renderer revision 4 is rendered again by revision 5; the raw file is untouched. */
const read = (filePath: string): string => fs.readFileSync(filePath, "utf-8");
const record = (n: number, extra: RawRecord): RawRecord => ({ id: `rt_${String(n).padStart(5, "0")}`, seq: n, ts: BASE_TS + n, turn_id: "t1", ...extra });
const HEADER = "Created At: 2026-01-02T03:04:05+00:00\nCompleted At: 2026-01-02T03:04:06+00:00\n";
const records: RawRecord[] = [
  record(1, { trace_type: "user", content: "read the file" }),
  record(2, { trace_type: "tool_call", tool_name: "read_file", tool_call_id: "c1", tool_args: { Path: "/w/a.txt", StartLine: 1, EndLine: 2 } }),
  record(3, { trace_type: "tool_result", tool_name: "read_file", tool_call_id: "c1", tool_result: { provider_state: "DONE",
    output: `${HEADER}Showing lines 1-2 of 2\n1: alpha\n2: beta` } }),
  record(4, { trace_type: "tool_call", tool_name: "read_file", tool_call_id: "c2", tool_args: { Path: "/w/b.txt" } }),
  record(5, { trace_type: "tool_result", tool_name: "read_file", tool_call_id: "c2", tool_result: { provider_state: "DONE", output: "7 lines, 90 bytes" } }),
];

describe("a closed journal of renderer revision 4 is rendered again (autobyteus-377)", () => {
  let root: string;
  let runDir: string;
  const target = () => ({ runId: "run_journal_1", memoryDir: runDir, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI });
  const journalDir = () => path.join(runDir, "work_journal");
  const manifestPath = () => path.join(journalDir(), "work_journal_manifest.json");
  beforeEach(() => { root = makeTempMemoryRoot(); runDir = makeRunDir(root); });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("shows the read's lines without the header; an older size-only record keeps its line; the raw file is byte-identical", async () => {
    expect(WORK_JOURNAL_RENDERER_REVISION).toBeGreaterThanOrEqual(5);
    writeActive(runDir, records);
    const segment = rotateActive(runDir, "antigravity_cli");
    const rawBefore = read(path.join(runDir, segment));
    const service = new WorkJournalService();
    await service.ensureCurrent(target());
    const closed = path.join(journalDir(), "work_journal_000001.md");
    const current = read(closed);
    expect(current).toContain("Command: sed -n '1,2p' /w/a.txt → ok");
    expect(current).toContain("     1\talpha");
    expect(current).toContain("     2\tbeta");
    expect(current).not.toContain("Created At:");
    expect(current).not.toContain("Showing lines");
    expect(current).toContain("Command: cat /w/b.txt → ok (content not recorded: 7 lines, 90 bytes)");
    // What revision 4 wrote: the header and the wrapper line as output.
    const previous = current.replace("     1\talpha\n", `Created At: 2026-01-02T03:04:05+00:00\n           Completed At: x\n           Showing lines 1-2 of 2\n           1: alpha\n`);
    expect(previous).not.toBe(current);
    fs.writeFileSync(closed, previous);
    fs.writeFileSync(manifestPath(), JSON.stringify({ ...JSON.parse(read(manifestPath())), renderer_revision: 4 }));

    await service.ensureCurrent(target());
    expect(read(closed)).toBe(current);
    expect(read(path.join(runDir, segment)), "the raw file is untouched").toBe(rawBefore);
    expect(JSON.parse(read(manifestPath())).renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
  });
});
