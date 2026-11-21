import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WORK_JOURNAL_RENDERER_REVISION } from "../../../src/agent-work-journal/domain/work-journal-models.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { BASE_TS, makeRunDir, makeTempMemoryRoot, rotateActive, turnRecords, writeActive, type RawRecord } from "../raw-trace-folder-fixtures.js";

/**
 * autobyteus-560 through the journal service, on a synthetic Antigravity raw-trace folder (synthetic paths only): the raw file keeps
 * both records of a schema read and the manifest counts them (REQ-004); a closed journal written by the previous renderer revision is
 * rendered again and loses the schema lines, while a file the rule does not touch is byte-identical (REQ-005).
 */
const SCHEMA = "/home/user/.gemini/antigravity-cli/mcp/example_server/example_tool.json";
const read = (filePath: string): string => fs.readFileSync(filePath, "utf-8");

let counter = 0;
const next = (turn: string) => { counter += 1; return { id: `rt_${String(counter).padStart(5, "0")}`, seq: counter, ts: BASE_TS + counter, turn_id: turn }; };
const schemaTurn = (turn: string): RawRecord[] => [
  { ...next(turn), trace_type: "user", content: "use the tool" },
  { ...next(turn), trace_type: "tool_call", tool_name: "read_file", tool_call_id: `read_${turn}`, tool_args: { Path: SCHEMA } },
  { ...next(turn), trace_type: "tool_result", tool_name: "read_file", tool_call_id: `read_${turn}`, tool_result: { provider_state: "DONE", output: "1 lines, 617 bytes" } },
  { ...next(turn), trace_type: "tool_call", tool_name: "mcp__example_server__example_tool", tool_call_id: `mcp_${turn}`, tool_args: { sku: "S" } },
  { ...next(turn), trace_type: "tool_result", tool_name: "mcp__example_server__example_tool", tool_call_id: `mcp_${turn}`, tool_result: { provider_state: "DONE", output: "10" } },
];

describe("Antigravity MCP schema reads in the journal service (autobyteus-560)", () => {
  let root: string;
  let runDir: string;
  const target = () => ({ runId: "run_journal_1", memoryDir: runDir, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI });
  const journalDir = () => path.join(runDir, "work_journal");
  const manifest = () => JSON.parse(read(path.join(journalDir(), "work_journal_manifest.json")));
  beforeEach(() => { counter = 0; root = makeTempMemoryRoot(); runDir = makeRunDir(root); });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("AC-005: the journal omits the read; the raw file still holds both records and the manifest counts the raw records", async () => {
    writeActive(runDir, schemaTurn("t1"));
    const rawBefore = read(path.join(runDir, "raw_traces_active.jsonl"));
    const pkg = await new WorkJournalService().ensureCurrent(target());
    const journal = read(pkg.files[0]!.path);
    expect(journal).not.toContain("read_file");
    expect(journal).not.toContain(".gemini");
    expect(journal).toContain("example_tool");
    expect(read(path.join(runDir, "raw_traces_active.jsonl")), "the raw traces are untouched").toBe(rawBefore);
    expect(rawBefore.split("\n").filter(Boolean).filter((line) => line.includes("read_file"))).toHaveLength(2);
    expect(manifest().files[0]).toMatchObject({ source_file: "raw_traces_active.jsonl", source_record_count: 5, runtime_kind: "antigravity_cli" });
  });

  it("AC-006: a closed journal of the previous renderer revision is rendered again and loses the schema lines; a file the rule does not touch is identical", async () => {
    const service = new WorkJournalService();
    writeActive(runDir, schemaTurn("t1"));
    rotateActive(runDir, "antigravity_cli");
    writeActive(runDir, turnRecords("t2", "ls", "a.ts"));
    rotateActive(runDir, "antigravity_cli");
    await service.ensureCurrent(target());
    const schemaFile = path.join(journalDir(), "work_journal_000001.md");
    const plainFile = path.join(journalDir(), "work_journal_000002.md");
    const plainBefore = read(plainFile);
    // What the previous revision wrote: the read as a line, from the same raw file, with its recorded revision.
    const previous = read(schemaFile).replace("\n", `\n[06:00:02] Tool: read_file Path="${SCHEMA}" → ok\n`);
    fs.writeFileSync(schemaFile, previous);
    fs.writeFileSync(path.join(journalDir(), "work_journal_manifest.json"), JSON.stringify({ ...manifest(), renderer_revision: WORK_JOURNAL_RENDERER_REVISION - 1 }));
    expect(read(schemaFile)).toContain("read_file");

    await service.ensureCurrent(target());
    expect(read(schemaFile)).not.toContain("read_file");
    expect(read(schemaFile)).toContain("example_tool");
    expect(read(plainFile), "an unaffected file is byte-identical").toBe(plainBefore);
    expect(manifest().renderer_revision).toBe(WORK_JOURNAL_RENDERER_REVISION);
  });
});
