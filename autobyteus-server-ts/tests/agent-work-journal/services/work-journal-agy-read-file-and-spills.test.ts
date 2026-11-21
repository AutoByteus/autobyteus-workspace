import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WORK_JOURNAL_RENDERER_REVISION } from "../../../src/agent-work-journal/domain/work-journal-models.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { BASE_TS, makeRunDir, makeTempMemoryRoot, rotateActive, writeActive, type RawRecord } from "../raw-trace-folder-fixtures.js";

/** autobyteus-561 AC-006: a closed journal written by renderer revision 3 is rendered again by revision 4; the raw file is untouched. */
const SPILL = "/home/user/.gemini/antigravity-cli/brain/abc/.system_generated/steps/12/output.txt";
const read = (filePath: string): string => fs.readFileSync(filePath, "utf-8");
const record = (n: number, extra: RawRecord): RawRecord => ({ id: `rt_${String(n).padStart(5, "0")}`, seq: n, ts: BASE_TS + n, turn_id: "t1", ...extra });
const records: RawRecord[] = [
  record(1, { trace_type: "user", content: "list and read" }),
  record(2, { trace_type: "tool_call", tool_name: "run_command", tool_call_id: "c1", tool_args: { CommandLine: "ls -la /w" } }),
  record(3, { trace_type: "tool_result", tool_name: "run_command", tool_call_id: "c1", tool_result: { provider_state: "DONE",
    output: `The tool's output was truncated due to being too long. You can find the full output in a file at file://${SPILL}\n\nHere is a preview with the middle of the output truncated:\ntotal 3\nREADME.md` } }),
  record(4, { trace_type: "tool_call", tool_name: "read_file", tool_call_id: "c2", tool_args: { Path: SPILL, StartLine: 1, EndLine: 50 } }),
  record(5, { trace_type: "tool_result", tool_name: "read_file", tool_call_id: "c2", tool_result: { provider_state: "DONE", output: "50 lines, 900 bytes" } }),
];

describe("a closed journal of renderer revision 3 is rendered again (autobyteus-561)", () => {
  let root: string;
  let runDir: string;
  const target = () => ({ runId: "run_journal_1", memoryDir: runDir, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI });
  const journalDir = () => path.join(runDir, "work_journal");
  const manifestPath = () => path.join(journalDir(), "work_journal_manifest.json");
  beforeEach(() => { root = makeTempMemoryRoot(); runDir = makeRunDir(root); });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("loses the runtime sentence and the generic read_file line; the raw file is byte-identical", async () => {
    expect(WORK_JOURNAL_RENDERER_REVISION).toBeGreaterThanOrEqual(4);
    writeActive(runDir, records);
    const segment = rotateActive(runDir, "antigravity_cli");
    const rawBefore = read(path.join(runDir, segment));
    const service = new WorkJournalService();
    await service.ensureCurrent(target());
    const closed = path.join(journalDir(), "work_journal_000001.md");
    const current = read(closed);
    expect(current).toContain(`…[full output was saved outside the raw trace: ${SPILL}]`);
    expect(current).toContain(`Command: sed -n '1,50p' ${SPILL} → ok (content not recorded: 50 lines, 900 bytes)`);
    // What revision 3 wrote: the runtime sentence and the generic line.
    const previous = current
      .replace(`…[full output was saved outside the raw trace: ${SPILL}]`, `The tool's output was truncated due to being too long. You can find the full output in a file at file://${SPILL}`)
      .replace(`Command: sed -n '1,50p' ${SPILL} → ok (content not recorded: 50 lines, 900 bytes)`, `Tool: read_file Path="${SPILL}" StartLine=1 EndLine=50 → ok`);
    expect(previous).toContain("Tool: read_file");
    fs.writeFileSync(closed, previous);
    fs.writeFileSync(manifestPath(), JSON.stringify({ ...JSON.parse(read(manifestPath())), renderer_revision: 3 }));

    await service.ensureCurrent(target());
    expect(read(closed)).toBe(current);
    expect(read(closed)).not.toContain("Tool: read_file");
    expect(read(closed)).not.toContain("truncated due to being too long");
    expect(read(path.join(runDir, segment)), "the raw file is untouched").toBe(rawBefore);
    expect(JSON.parse(read(manifestPath())).renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
  });
});
